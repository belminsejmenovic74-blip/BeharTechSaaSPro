"use client";

import { type StoreState, useBeharStore } from "@/lib/behar-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export const WORKSHOP_STORAGE_KEY = "behar-tech-local-demo-v3";
export const WORKSHOP_SCHEMA_VERSION = 1;

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

type WorkshopSnapshotRow = {
  id?: unknown;
  workshop_id?: unknown;
  license_key?: unknown;
  workshop_name?: unknown;
  state?: unknown;
  state_size_bytes?: unknown;
  updated_at?: unknown;
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
  window.localStorage.setItem(WORKSHOP_STORAGE_KEY, JSON.stringify({ state, version: WORKSHOP_SCHEMA_VERSION }));
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
 * Recovery code dérivé du workshop_id (UUID).
 * Même workshop_id → même recovery_code à vie. Comme ça l'UPSERT peut
 * toujours envoyer la valeur sans risquer d'écraser celle de la BDD,
 * et la colonne NOT NULL est toujours satisfaite à l'INSERT.
 */
function recoveryCodeFromWorkshopId(workshopId: string): string {
  const hex = workshopId.replace(/-/g, "").toUpperCase();
  const padded = (hex + "0".repeat(16)).slice(0, 16);
  return `${padded.slice(0, 4)}-${padded.slice(4, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}`;
}

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

function rowToSnapshot(row: WorkshopSnapshotRow, fallbackLicense: string): WorkshopSnapshot {
  const state =
    row.state && typeof row.state === "object" ? (row.state as Partial<StoreState> & Record<string, unknown>) : {};
  return {
    id: String(row.id ?? ""),
    workshopId: String(row.workshop_id ?? ""),
    licenseKey: normalizeLicenseKey(String(row.license_key ?? fallbackLicense)),
    workshopName: typeof row.workshop_name === "string" ? row.workshop_name : undefined,
    state,
    stateSizeBytes: typeof row.state_size_bytes === "number" ? row.state_size_bytes : getStateSizeBytes(state),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
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
  const supabase = getSupabase();
  if (!supabase) return null;

  markSyncStatus("loading");
  try {
    const selectColumns = "id, workshop_id, license_key, workshop_name, state, state_size_bytes, updated_at";
    const { data, error } = await supabase
      .from("workshop_snapshots")
      .select(selectColumns)
      .ilike("license_key", normalizedKey)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      markSyncStatus(isNetworkError(error.message) ? "offline" : "error", { lastError: error.message });
      throw error;
    }
    return data ? rowToSnapshot(data, normalizedKey) : null;
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Lecture Supabase impossible.");
    markSyncStatus(isNetworkError(message) ? "offline" : "error", {
      lastError: message,
    });
    throw error;
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
  const supabase = getSupabase();
  if (!supabase) throw new Error("Client Supabase indisponible.");

  const mergedState = withLicenseState(normalizedKey, state, {
    workshopId,
    stateVersion: options.stateVersion,
    lastDeviceId: options.lastDeviceId,
  });
  const sizeBytes = getStateSizeBytes(mergedState);
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

  const payload: Record<string, unknown> = {
    workshop_id: workshopId,
    // Toujours fourni — dérivé du workshop_id donc déterministe (pas d'écrasement).
    recovery_code: recoveryCodeFromWorkshopId(workshopId),
    license_key: normalizedKey,
    workshop_name: mergedState.workshopSettings?.name || mergedState.workshopInfo?.name || null,
    device_label: detectDeviceLabel(),
    state: mergedState,
    state_size_bytes: sizeBytes,
    schema_version: WORKSHOP_SCHEMA_VERSION,
  };

  const { data, error } = await supabase
    .from("workshop_snapshots")
    .upsert(payload, { onConflict: "workshop_id" })
    .select("id, workshop_id, license_key, workshop_name, state, state_size_bytes, updated_at")
    .single();

  if (error) {
    const pgError = error as { code?: string; message?: string; details?: string; hint?: string };
    devLog("upsert ✗ erreur Supabase", {
      code: pgError.code,
      message: pgError.message,
      details: pgError.details,
      hint: pgError.hint,
    });
    throw error;
  }

  const snapshot = rowToSnapshot(data, normalizedKey);
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

    if (remoteVersion > baseVersion && localVersion <= remoteVersion) {
      devLog("save ✗ snapshot local obsolète, backend conservé", { baseVersion, localVersion, remoteVersion });
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
  const state = snapshot ? snapshot.state : (snapshotOrState as Partial<StoreState> & Record<string, unknown>);
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
      markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
      return;
    }
  }

  const hydrated = withLicenseState(licenseKey, state, {
    workshopId: snapshot?.workshopId,
    lastSyncedAt: snapshot?.updatedAt,
    stateVersion: snapshot ? getWorkshopStateVersion(snapshot.state) : getWorkshopStateVersion(state),
  });

  useBeharStore.setState(hydrated as Partial<StoreState>, false);
  cacheWorkshopState({ ...useBeharStore.getState(), ...hydrated } as Partial<StoreState> & Record<string, unknown>);

  if (snapshot?.updatedAt) {
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
  }
}

export async function ensureCloudStateForLicense(key: string): Promise<"loaded" | "created" | "offline"> {
  const normalizedKey = normalizeLicenseKey(key);
  if (!normalizedKey) throw new Error("Licence requise.");

  const localState = {
    ...useBeharStore.getState(),
    licenseActivated: true,
    licenseKey: normalizedKey,
    licensePlan: useBeharStore.getState().licensePlan || "Pilote",
  } as Partial<StoreState> & Record<string, unknown>;

  if (!isSupabaseConfigured()) {
    cacheWorkshopState(localState);
    markSyncStatus("error", { lastError: "Supabase non configuré sur ce déploiement." });
    return "offline";
  }

  const remote = await loadSnapshotByLicenseKey(normalizedKey);
  if (remote) {
    // Activation d'une licence : on charge le cloud, même si un state local
    // existe — c'est une action explicite de l'utilisateur qui veut récupérer
    // ses données.
    hydrateStoreFromCloud(remote, { force: true });
    return "loaded";
  }

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
