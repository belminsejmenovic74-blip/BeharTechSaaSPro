"use client";

import { type StoreState, useBeharStore } from "@/lib/behar-store";
import { useConditionneStore } from "@/lib/conditionne-store";
import { useRecondSettings } from "@/lib/recond-settings";
import { useReconditioningRules } from "@/lib/reconditioning-pricing";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { sanitizePaymentDataForPersistence } from "@/lib/payment-data-boundary";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const WORKSHOP_STORAGE_KEY = "behar-tech-local-demo-v3";
export const WORKSHOP_SCHEMA_VERSION = 1;
const CLOUD_REQUEST_TIMEOUT_MS = 12_000;

// Stores annexes (Zustand persist) embarqués dans le même snapshot cloud :
// règles de reprise, appareils reconditionnés, réglages recond. Sans eux,
// la configuration Reconditionnement resterait uniquement sur le poste local.
const AUX_STORE_KEYS = [
  "behar-recond-rules",
  "behar-reconditioning",
  "behar-recond-settings",
  "behar-conditionne",
] as const;
const AUX_STORES_FIELD = "__auxStores";

const AUX_STORE_REHYDRATE: Record<(typeof AUX_STORE_KEYS)[number], () => void> = {
  "behar-recond-rules": () => void useReconditioningRules.persist.rehydrate(),
  "behar-reconditioning": () => void useReconditioningStore.persist.rehydrate(),
  "behar-recond-settings": () => void useRecondSettings.persist.rehydrate(),
  "behar-conditionne": () => void useConditionneStore.persist.rehydrate(),
};

/** Lit les stores annexes (enveloppe persist complète) pour le snapshot cloud. */
function readAuxStores(): Record<string, unknown> {
  const aux: Record<string, unknown> = {};
  if (typeof window === "undefined") return aux;
  for (const key of AUX_STORE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) aux[key] = JSON.parse(raw);
    } catch {
      // store illisible — on l'ignore, le reste du snapshot part quand même
    }
  }
  return aux;
}

/** Vide TOUS les stores annexes (dossiers reconditionnement, règles, réglages…).
 *  Anti-fuite entre comptes : on repart d'un état vierge avant de charger/créer
 *  l'atelier d'une autre licence. */
export function clearAuxStores() {
  if (typeof window === "undefined") return;
  try {
    useReconditioningStore.getState().reset();
  } catch {
    // ignore
  }
  for (const key of AUX_STORE_KEYS) {
    try {
      window.localStorage.removeItem(key);
      AUX_STORE_REHYDRATE[key]();
    } catch {
      // storage bloqué — best effort
    }
  }
}

/** Restaure les stores annexes d'un snapshot cloud, puis réhydrate les stores en mémoire. */
function applyAuxStores(aux: unknown) {
  if (typeof window === "undefined") return;
  const auxObject = aux && typeof aux === "object" ? (aux as Record<string, unknown>) : {};
  for (const key of AUX_STORE_KEYS) {
    const value = auxObject[key];
    try {
      if (value === undefined) {
        // Le snapshot de CE compte n'a pas ce store → on efface l'éventuel
        // reliquat local d'un autre compte (dossiers recond qui « restaient »).
        window.localStorage.removeItem(key);
        if (key === "behar-reconditioning") useReconditioningStore.getState().reset();
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
      AUX_STORE_REHYDRATE[key]();
    } catch {
      // quota / storage bloqué — la restauration du store principal continue
    }
  }
}

/** Abonnement aux mutations des stores annexes (pour déclencher une sauvegarde cloud). */
export function subscribeAuxStoreChanges(listener: () => void): () => void {
  const unsubscribers = [
    useReconditioningRules.subscribe(listener),
    useReconditioningStore.subscribe(listener),
    useRecondSettings.subscribe(listener),
    useConditionneStore.subscribe(listener),
  ];
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}

export type WorkshopSyncStatus = "idle" | "loading" | "saving" | "synced" | "offline" | "error";

export type WorkshopSnapshot = {
  id: string;
  workshopId: string;
  licenseKey: string;
  workshopName?: string;
  state: Partial<StoreState> & Record<string, unknown>;
  stateSizeBytes: number;
  updatedAt: string;
};

export type WorkshopSyncState = {
  status: WorkshopSyncStatus;
  lastSyncedAt?: string;
  lastError?: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

let syncState: WorkshopSyncState = { status: "idle" };
const listeners = new Set<(state: WorkshopSyncState) => void>();

export function normalizeLicenseKey(key: string | null | undefined): string {
  return String(key ?? "")
    .trim()
    .toUpperCase();
}

export function getStateSizeBytes(state: unknown): number {
  return new Blob([JSON.stringify(state)]).size;
}

export function markSyncStatus(status: WorkshopSyncStatus, patch: Omit<Partial<WorkshopSyncState>, "status"> = {}) {
  syncState = { ...syncState, ...patch, status };
  listeners.forEach((listener) => {
    listener(syncState);
  });
}

export function getWorkshopSyncState(): WorkshopSyncState {
  return syncState;
}

export function subscribeWorkshopSyncState(listener: (state: WorkshopSyncState) => void): () => void {
  listeners.add(listener);
  listener(syncState);
  return () => {
    listeners.delete(listener);
  };
}

export function readCachedWorkshopState(): (Partial<StoreState> & Record<string, unknown>) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSHOP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? parsed;
  } catch {
    return null;
  }
}

export function cacheWorkshopState(state: Partial<StoreState> & Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizePaymentDataForPersistence(state);
  window.localStorage.setItem(
    WORKSHOP_STORAGE_KEY,
    JSON.stringify({ state: sanitized, version: WORKSHOP_SCHEMA_VERSION }),
  );
}

function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Inconnu";
  const ua = navigator.userAgent || "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "PC Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Navigateur";
}

function createWorkshopId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Code de récupération déterministe dérivé du workshop_id (colonne NOT NULL de
 * workshop_snapshots sur la base live). Déterministe => un ré-upsert ne l'écrase
 * jamais par du vide.
 */
export function getWorkshopStateVersion(
  state: (Partial<StoreState> & Record<string, unknown>) | null | undefined,
): number {
  const raw = (state?.cloudSync as StoreState["cloudSync"] | undefined)?.stateVersion;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function getSharedRecordCount(state: (Partial<StoreState> & Record<string, unknown>) | null | undefined): number {
  if (!state || typeof state !== "object") return 0;
  return [
    "sales",
    "customers",
    "repairs",
    "quotes",
    "invoices",
    "payments",
    "appointments",
    "stockItems",
    "documents",
    "messageLogs",
    "teamMembers",
    "users",
  ].reduce((total, key) => {
    const value = state[key];
    return total + (Array.isArray(value) ? value.length : 0);
  }, 0);
}

function withLicenseState(
  key: string,
  state: Partial<StoreState> & Record<string, unknown>,
  patch: { workshopId?: string; lastSyncedAt?: string; stateVersion?: number; lastDeviceId?: string } = {},
) {
  const normalizedKey = normalizeLicenseKey(key);
  const currentCloudSync = state.cloudSync as StoreState["cloudSync"] | undefined;
  const stateVersion =
    typeof patch.stateVersion === "number" && Number.isFinite(patch.stateVersion)
      ? patch.stateVersion
      : getWorkshopStateVersion(state);
  return {
    ...state,
    _hasHydrated: true,
    licenseActivated: true,
    licenseKey: normalizedKey,
    licensePlan: state.licensePlan ?? "Pilote",
    licenseActivatedAt: state.licenseActivatedAt ?? new Date().toISOString(),
    cloudSync: {
      ...((state.cloudSync as Record<string, unknown> | undefined) ?? {}),
      workshopId: patch.workshopId ?? currentCloudSync?.workshopId,
      lastSyncedAt: patch.lastSyncedAt ?? currentCloudSync?.lastSyncedAt,
      localUpdatedAt: patch.lastSyncedAt ?? currentCloudSync?.localUpdatedAt ?? new Date().toISOString(),
      stateVersion,
      lastSyncedStateVersion: patch.lastSyncedAt
        ? stateVersion
        : (currentCloudSync?.lastSyncedStateVersion ?? stateVersion),
      lastDeviceId: patch.lastDeviceId ?? currentCloudSync?.lastDeviceId,
    },
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;
}

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return Boolean(error && typeof error === "object");
}

export async function loadSnapshotByLicenseKey(key: string): Promise<WorkshopSnapshot | null> {
  const normalizedKey = normalizeLicenseKey(key);
  if (!normalizedKey) return null;
  if (!isSupabaseConfigured()) {
    markSyncStatus("error", { lastError: "Supabase non configuré sur ce déploiement." });
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLOUD_REQUEST_TIMEOUT_MS);

  markSyncStatus("loading");
  try {
    const response = await fetch("/api/behar/snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "load", licenseKey: normalizedKey }),
      cache: "no-store",
      signal: controller.signal,
    });
    const result = (await response.json().catch(() => ({}))) as {
      snapshot?: WorkshopSnapshot | null;
      error?: string;
    };
    if (!response.ok) throw new Error(result.error || "Lecture cloud impossible.");
    const snapshot = result.snapshot
      ? {
          ...result.snapshot,
          licenseKey: normalizeLicenseKey(result.snapshot.licenseKey || normalizedKey),
          state: sanitizePaymentDataForPersistence(result.snapshot.state),
        }
      : null;
    if (snapshot) {
      markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
    } else {
      markSyncStatus("idle", { lastError: undefined });
    }
    return snapshot;
  } catch (error: unknown) {
    const message = controller.signal.aborted
      ? "Délai de connexion cloud dépassé."
      : getErrorMessage(error, "Lecture Supabase impossible.");
    markSyncStatus(isNetworkError(message) ? "offline" : "error", {
      lastError: message,
    });
    throw controller.signal.aborted ? new Error(message) : error;
  } finally {
    clearTimeout(timeout);
  }
}

const DEV_LOG = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
function devLog(...args: unknown[]) {
  if (DEV_LOG && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[workshop-sync]", ...args);
  }
}

/**
 * Sauvegarde unique et idempotente du snapshot atelier dans Supabase.
 *
 * - UPSERT sur `workshop_id` (jamais d'erreur duplicate key)
 * - Réutilise `workshop_id` existant si présent (local OU cloud) — ne génère un
 *   nouvel UUID que pour une toute première activation sur un appareil vierge.
 * - Le state envoyé contient TOUT l'état atelier (clients, réparations, RDV,
 *   devis, factures, paiements, stock, paramètres, équipe…) — c'est le store
 *   Zustand complet, donc tout est sauvegardé en bloc.
 */
async function upsertSnapshot(
  normalizedKey: string,
  state: Partial<StoreState> & Record<string, unknown>,
  workshopId: string,
  options: { stateVersion: number; lastDeviceId?: string },
): Promise<WorkshopSnapshot> {
  const safeState = sanitizePaymentDataForPersistence(state);
  const mergedState = withLicenseState(normalizedKey, safeState, {
    workshopId,
    stateVersion: options.stateVersion,
    lastDeviceId: options.lastDeviceId,
  });
  // Les stores annexes (reconditionnement…) voyagent dans le même snapshot —
  // réutilise la table workshop_snapshots, aucune migration.
  const stateForUpload = { ...mergedState, [AUX_STORES_FIELD]: readAuxStores() };
  const sizeBytes = getStateSizeBytes(stateForUpload);
  if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
    throw new Error("Snapshot trop volumineux (>10 Mo).");
  }

  const repairsCount = Array.isArray(mergedState.repairs) ? mergedState.repairs.length : 0;
  const customersCount = Array.isArray(mergedState.customers) ? mergedState.customers.length : 0;
  devLog("upsert →", {
    workshopId,
    licenseKey: normalizedKey,
    repairs: repairsCount,
    customers: customersCount,
    sizeBytes,
  });

  const response = await fetch("/api/behar/snapshot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "upsert",
      licenseKey: normalizedKey,
      workshopId,
      workshopName: mergedState.workshopSettings?.name || mergedState.workshopInfo?.name || null,
      deviceLabel: detectDeviceLabel(),
      state: stateForUpload,
      stateSizeBytes: sizeBytes,
      schemaVersion: WORKSHOP_SCHEMA_VERSION,
    }),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as { snapshot?: WorkshopSnapshot; error?: string };
  if (!response.ok || !result.snapshot) throw new Error(result.error || "Sauvegarde cloud impossible.");
  const snapshot = {
    ...result.snapshot,
    licenseKey: normalizeLicenseKey(result.snapshot.licenseKey || normalizedKey),
    state: sanitizePaymentDataForPersistence(result.snapshot.state),
  };
  snapshot.state = withLicenseState(normalizedKey, snapshot.state, {
    workshopId: snapshot.workshopId,
    lastSyncedAt: snapshot.updatedAt,
    stateVersion: options.stateVersion,
    lastDeviceId: options.lastDeviceId,
  });
  devLog("upsert ✓", { id: snapshot.id, updatedAt: snapshot.updatedAt });
  return snapshot;
}

export async function createSnapshotForLicenseKey(
  key: string,
  initialState: Partial<StoreState> & Record<string, unknown>,
): Promise<WorkshopSnapshot> {
  const normalizedKey = normalizeLicenseKey(key);
  if (!normalizedKey) throw new Error("Licence requise.");
  if (!isSupabaseConfigured()) {
    markSyncStatus("error", { lastError: "Supabase non configuré sur ce déploiement." });
    throw new Error("Supabase non configuré sur ce déploiement.");
  }

  // Réutiliser le snapshot existant pour cette licence (autre appareil) au lieu
  // d'en créer un nouveau — c'est le bon comportement multi-device.
  const existing = await loadSnapshotByLicenseKey(normalizedKey).catch(() => null);
  if (existing) return existing;

  const workshopId = (initialState.cloudSync as StoreState["cloudSync"] | undefined)?.workshopId || createWorkshopId();

  markSyncStatus("saving");
  try {
    const snapshot = await upsertSnapshot(normalizedKey, initialState, workshopId, {
      stateVersion: Math.max(1, getWorkshopStateVersion(initialState)),
    });
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
    return snapshot;
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Création Supabase impossible.");
    // Si conflit duplicate key (race entre deux devices), on relit la ligne
    // existante et on la renvoie : c'est la bonne, on ne perd rien.
    if (isSupabaseLikeError(error) && isDuplicateError(error)) {
      const raced = await loadSnapshotByLicenseKey(normalizedKey).catch(() => null);
      if (raced) {
        markSyncStatus("synced", { lastSyncedAt: raced.updatedAt, lastError: undefined });
        return raced;
      }
    }
    markSyncStatus(isNetworkError(message) ? "offline" : "error", {
      lastError: message,
    });
    throw error;
  }
}

export async function saveSnapshotState(
  key: string,
  state: Partial<StoreState> & Record<string, unknown>,
  options: { deviceId?: string; baseStateVersion?: number } = {},
): Promise<WorkshopSnapshot> {
  const normalizedKey = normalizeLicenseKey(key);
  if (!normalizedKey) throw new Error("Licence requise.");
  if (!isSupabaseConfigured()) {
    markSyncStatus("error", { lastError: "Supabase non configuré sur ce déploiement." });
    throw new Error("Supabase non configuré sur ce déploiement.");
  }

  const existing = await loadSnapshotByLicenseKey(normalizedKey).catch(() => null);
  const localVersion = getWorkshopStateVersion(state);
  const remoteVersion = getWorkshopStateVersion(existing?.state);
  const baseVersion =
    typeof options.baseStateVersion === "number" && Number.isFinite(options.baseStateVersion)
      ? options.baseStateVersion
      : ((state.cloudSync as StoreState["cloudSync"] | undefined)?.lastSyncedStateVersion ?? localVersion);

  if (existing) {
    const localRecords = getSharedRecordCount(state);
    const remoteRecords = getSharedRecordCount(existing.state);
    const localHasMoreRecords = localRecords > remoteRecords;
    const remoteTs = new Date(existing.updatedAt || 0).getTime();
    const baseSyncedTs = new Date(
      (state.cloudSync as StoreState["cloudSync"] | undefined)?.lastSyncedAt || 0,
    ).getTime();

    if (remoteRecords > 0 && localRecords === 0) {
      devLog("save ✗ local vide, backend conservé", { remoteRecords });
      markSyncStatus("synced", { lastSyncedAt: existing.updatedAt, lastError: undefined });
      return existing;
    }

    if (remoteVersion === 0 && localVersion === 0 && remoteTs > baseSyncedTs + 1000) {
      devLog("save ✗ snapshot cloud legacy plus récent, backend conservé", { baseSyncedTs, remoteTs });
      markSyncStatus("synced", { lastSyncedAt: existing.updatedAt, lastError: undefined });
      return existing;
    }

    if (remoteVersion > baseVersion && localVersion <= remoteVersion && !localHasMoreRecords) {
      devLog("save ✗ snapshot local obsolète, backend conservé", {
        baseVersion,
        localVersion,
        remoteVersion,
      });
      markSyncStatus("synced", { lastSyncedAt: existing.updatedAt, lastError: undefined });
      return existing;
    }
  }

  // workshop_id : on réutilise toujours la ligne cloud si elle existe. La
  // licence est l'identité fonctionnelle de l'atelier multi-appareils.
  const workshopId =
    (state.cloudSync as StoreState["cloudSync"] | undefined)?.workshopId || existing?.workshopId || createWorkshopId();
  const nextStateVersion = Math.max(localVersion, remoteVersion + 1, 1);

  markSyncStatus("saving");
  try {
    const snapshot = await upsertSnapshot(normalizedKey, state, workshopId, {
      stateVersion: nextStateVersion,
      lastDeviceId: options.deviceId,
    });
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
    return snapshot;
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Sauvegarde Supabase impossible.");
    // Si on perd la course (autre device a créé la même licence avec un autre
    // workshop_id), on relit et on retente avec le workshop_id cloud.
    if (isSupabaseLikeError(error) && isDuplicateError(error)) {
      const raced = await loadSnapshotByLicenseKey(normalizedKey).catch(() => null);
      if (raced && raced.workshopId !== workshopId) {
        try {
          const retried = await upsertSnapshot(normalizedKey, state, raced.workshopId, {
            stateVersion: Math.max(nextStateVersion, getWorkshopStateVersion(raced.state) + 1),
            lastDeviceId: options.deviceId,
          });
          markSyncStatus("synced", { lastSyncedAt: retried.updatedAt, lastError: undefined });
          return retried;
        } catch (retryError: unknown) {
          markSyncStatus("error", { lastError: getErrorMessage(retryError, "Sauvegarde Supabase impossible.") });
          throw retryError;
        }
      }
    }
    markSyncStatus(isNetworkError(message) ? "offline" : "error", {
      lastError: message,
    });
    throw error;
  }
}

export function hydrateStoreFromCloud(
  snapshotOrState: WorkshopSnapshot | (Partial<StoreState> & Record<string, unknown>),
  options: { force?: boolean } = {},
) {
  const snapshot =
    "state" in snapshotOrState && "updatedAt" in snapshotOrState ? (snapshotOrState as WorkshopSnapshot) : null;
  const unsafeState = snapshot ? snapshot.state : (snapshotOrState as Partial<StoreState> & Record<string, unknown>);
  const rawState = sanitizePaymentDataForPersistence(unsafeState);
  // Le champ technique __auxStores ne doit jamais entrer dans le store principal.
  const { [AUX_STORES_FIELD]: auxStores, ...state } = rawState;
  const licenseKey = normalizeLicenseKey(snapshot?.licenseKey || (state.licenseKey as string | undefined));

  // Garde-fou : le backend est la vérité partagée, mais on n'applique jamais
  // un snapshot distant plus ancien que la version déjà présente localement.
  if (!options.force && snapshot?.updatedAt) {
    const current = useBeharStore.getState();
    const localVersion = getWorkshopStateVersion(current);
    const cloudVersion = getWorkshopStateVersion(snapshot.state);
    const cloudTs = new Date(snapshot.updatedAt).getTime();
    const localSyncedTs = new Date(current.cloudSync?.lastSyncedAt || 0).getTime();
    if (localVersion > cloudVersion || (localVersion === cloudVersion && localSyncedTs >= cloudTs)) {
      devLog("hydrate ✗ snapshot distant pas plus récent", { localVersion, cloudVersion, localSyncedTs, cloudTs });
      // Un cache local peut contenir la bonne version et le bon timestamp tout
      // en ayant perdu les métadonnées d'identité cloud (anciens snapshots,
      // migration de store interrompue, nettoyage partiel du localStorage).
      // Ne pas réhydrater les données métier dans ce cas, mais toujours
      // réconcilier l'identité de l'atelier : le widget et les API publiques
      // ont besoin du couple licence + workshopId.
      const currentLicense = normalizeLicenseKey(current.licenseKey);
      const identityNeedsRepair =
        current.cloudSync?.workshopId !== snapshot.workshopId || currentLicense !== licenseKey;
      if (identityNeedsRepair) {
        const repaired = withLicenseState(licenseKey, current, {
          workshopId: snapshot.workshopId,
          lastSyncedAt: snapshot.updatedAt,
          stateVersion: localVersion,
        });
        useBeharStore.setState(repaired as Partial<StoreState>, false);
        cacheWorkshopState(repaired);
      }
      markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
      return;
    }
  }

  const hydrated = withLicenseState(licenseKey, state, {
    workshopId: snapshot?.workshopId,
    lastSyncedAt: snapshot?.updatedAt,
    stateVersion: snapshot ? getWorkshopStateVersion(snapshot.state) : getWorkshopStateVersion(state),
  });

  // Stores annexes d'abord (règles de reprise, appareils recond…), puis le principal.
  applyAuxStores(auxStores);
  useBeharStore.setState(hydrated as Partial<StoreState>, false);
  cacheWorkshopState({ ...useBeharStore.getState(), ...hydrated } as Partial<StoreState> & Record<string, unknown>);

  if (snapshot?.updatedAt) {
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
  }
}

export async function ensureCloudStateForLicense(
  key: string,
  force = false,
): Promise<"loaded" | "created" | "offline"> {
  const normalizedKey = normalizeLicenseKey(key);
  if (!normalizedKey) throw new Error("Licence requise.");

  if (!isSupabaseConfigured()) {
    markSyncStatus("error", { lastError: "Supabase non configuré sur ce déploiement." });
    throw new Error("Connexion cloud requise. Configurez Supabase avant d'activer la licence.");
  }

  const remote = await loadSnapshotByLicenseKey(normalizedKey);
  if (remote) {
    hydrateStoreFromCloud(remote, { force });
    return "loaded";
  }

  // Nouveau compte (aucun snapshot cloud) : on ne doit JAMAIS initialiser son
  // atelier cloud avec les données d'un autre atelier encore présentes en local
  // (fuite « nouveau compte = données de l'ancien »). Si l'état local
  // n'appartient pas déjà à cette licence, on repart d'un état vierge.
  const store = useBeharStore.getState();
  const ownsLocalState =
    normalizeLicenseKey((store.licenseKey as string) ?? "") === normalizedKey ||
    normalizeLicenseKey((store.lastLicenseKey as string) ?? "") === normalizedKey;
  if (!ownsLocalState) {
    store.resetLocalStateForLicense(normalizedKey);
    // Les dossiers de reconditionnement (store annexe) doivent aussi être vidés,
    // sinon ceux d'un autre atelier « restent » à chaque nouvelle clé.
    clearAuxStores();
  }

  const localState = {
    ...useBeharStore.getState(),
    licenseActivated: true,
    licenseKey: normalizedKey,
    licensePlan: useBeharStore.getState().licensePlan || "Pilote",
  } as Partial<StoreState> & Record<string, unknown>;

  const created = await createSnapshotForLicenseKey(normalizedKey, localState);
  hydrateStoreFromCloud(created, { force: true });
  return "created";
}

function isNetworkError(message?: string) {
  return /fetch|network|réseau|timeout|failed to fetch/i.test(message ?? "");
}

function isDuplicateError(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key|unique constraint/i.test(error.message ?? "");
}
