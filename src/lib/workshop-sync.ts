"use client";

import { useBeharStore, type StoreState } from "@/lib/behar-store";
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

let syncState: WorkshopSyncState = { status: "idle" };
const listeners = new Set<(state: WorkshopSyncState) => void>();

export function normalizeLicenseKey(key: string | null | undefined): string {
  return String(key ?? "").trim().toUpperCase();
}

export function getStateSizeBytes(state: unknown): number {
  return new Blob([JSON.stringify(state)]).size;
}

export function markSyncStatus(status: WorkshopSyncStatus, patch: Omit<Partial<WorkshopSyncState>, "status"> = {}) {
  syncState = { ...syncState, ...patch, status };
  listeners.forEach((listener) => listener(syncState));
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

function createRecoveryCode(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function withLicenseState(
  key: string,
  state: Partial<StoreState> & Record<string, unknown>,
  patch: { workshopId?: string; lastSyncedAt?: string } = {},
) {
  const normalizedKey = normalizeLicenseKey(key);
  return {
    ...state,
    _hasHydrated: true,
    licenseActivated: true,
    licenseKey: normalizedKey,
    licensePlan: state.licensePlan || "Pilote",
    licenseActivatedAt: state.licenseActivatedAt || new Date().toISOString(),
    cloudSync: {
      ...((state.cloudSync as Record<string, unknown> | undefined) ?? {}),
      workshopId: patch.workshopId || (state.cloudSync as StoreState["cloudSync"] | undefined)?.workshopId,
      lastSyncedAt: patch.lastSyncedAt || (state.cloudSync as StoreState["cloudSync"] | undefined)?.lastSyncedAt,
      localUpdatedAt: patch.lastSyncedAt || new Date().toISOString(),
    },
  };
}

function rowToSnapshot(row: any, fallbackLicense: string): WorkshopSnapshot {
  return {
    id: row.id,
    workshopId: row.workshop_id,
    licenseKey: normalizeLicenseKey(row.license_key || fallbackLicense),
    workshopName: row.workshop_name || undefined,
    state: row.state ?? {},
    stateSizeBytes: row.state_size_bytes ?? getStateSizeBytes(row.state ?? {}),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
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
  } catch (error: any) {
    markSyncStatus(isNetworkError(error?.message) ? "offline" : "error", {
      lastError: error?.message || "Lecture Supabase impossible.",
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
  recoveryCode: string | undefined,
): Promise<WorkshopSnapshot> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Client Supabase indisponible.");

  const mergedState = withLicenseState(normalizedKey, state, { workshopId });
  const sizeBytes = getStateSizeBytes(mergedState);
  if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
    throw new Error("Snapshot trop volumineux (>10 Mo).");
  }

  const repairsCount = Array.isArray((mergedState as any).repairs) ? (mergedState as any).repairs.length : 0;
  const clientsCount = Array.isArray((mergedState as any).clients) ? (mergedState as any).clients.length : 0;
  devLog("upsert →", {
    workshopId,
    licenseKey: normalizedKey,
    repairs: repairsCount,
    clients: clientsCount,
    sizeBytes,
  });

  const payload: Record<string, unknown> = {
    workshop_id: workshopId,
    license_key: normalizedKey,
    workshop_name: mergedState.workshopSettings?.name || mergedState.workshopInfo?.name || null,
    device_label: detectDeviceLabel(),
    state: mergedState,
    state_size_bytes: sizeBytes,
    schema_version: WORKSHOP_SCHEMA_VERSION,
  };
  if (recoveryCode) payload.recovery_code = recoveryCode;

  const { data, error } = await supabase
    .from("workshop_snapshots")
    .upsert(payload, { onConflict: "workshop_id" })
    .select("id, workshop_id, license_key, workshop_name, state, state_size_bytes, updated_at")
    .single();

  if (error) {
    devLog("upsert ✗ erreur Supabase", {
      code: (error as any).code,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
    });
    throw error;
  }

  const snapshot = rowToSnapshot(data, normalizedKey);
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

  const workshopId =
    (initialState.cloudSync as StoreState["cloudSync"] | undefined)?.workshopId || createWorkshopId();

  markSyncStatus("saving");
  try {
    const snapshot = await upsertSnapshot(normalizedKey, initialState, workshopId, createRecoveryCode());
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
    return snapshot;
  } catch (error: any) {
    // Si conflit duplicate key (race entre deux devices), on relit la ligne
    // existante et on la renvoie : c'est la bonne, on ne perd rien.
    if (isDuplicateError(error)) {
      const raced = await loadSnapshotByLicenseKey(normalizedKey).catch(() => null);
      if (raced) {
        markSyncStatus("synced", { lastSyncedAt: raced.updatedAt, lastError: undefined });
        return raced;
      }
    }
    markSyncStatus(isNetworkError(error?.message) ? "offline" : "error", {
      lastError: error?.message || "Création Supabase impossible.",
    });
    throw error;
  }
}

export async function saveSnapshotState(
  key: string,
  state: Partial<StoreState> & Record<string, unknown>,
): Promise<WorkshopSnapshot> {
  const normalizedKey = normalizeLicenseKey(key);
  if (!normalizedKey) throw new Error("Licence requise.");
  if (!isSupabaseConfigured()) {
    markSyncStatus("error", { lastError: "Supabase non configuré sur ce déploiement." });
    throw new Error("Supabase non configuré sur ce déploiement.");
  }

  // workshop_id : on prend, dans l'ordre :
  //   1. celui du state local (cloudSync.workshopId)
  //   2. celui d'une ligne cloud existante pour cette licence
  //   3. un nouvel UUID (création initiale)
  // Avec UPSERT(onConflict: workshop_id), si la ligne existe déjà → UPDATE,
  // sinon → INSERT. Plus jamais d'erreur duplicate key.
  let workshopId = (state.cloudSync as StoreState["cloudSync"] | undefined)?.workshopId;

  if (!workshopId) {
    const existing = await loadSnapshotByLicenseKey(normalizedKey).catch(() => null);
    workshopId = existing?.workshopId || createWorkshopId();
  }

  markSyncStatus("saving");
  try {
    const snapshot = await upsertSnapshot(normalizedKey, state, workshopId, undefined);
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
    return snapshot;
  } catch (error: any) {
    // Si on perd la course (autre device a créé la même licence avec un autre
    // workshop_id), on relit et on retente avec le workshop_id cloud.
    if (isDuplicateError(error)) {
      const raced = await loadSnapshotByLicenseKey(normalizedKey).catch(() => null);
      if (raced && raced.workshopId !== workshopId) {
        try {
          const retried = await upsertSnapshot(normalizedKey, state, raced.workshopId, undefined);
          markSyncStatus("synced", { lastSyncedAt: retried.updatedAt, lastError: undefined });
          return retried;
        } catch (retryError: any) {
          markSyncStatus("error", { lastError: retryError?.message || "Sauvegarde Supabase impossible." });
          throw retryError;
        }
      }
    }
    markSyncStatus(isNetworkError(error?.message) ? "offline" : "error", {
      lastError: error?.message || "Sauvegarde Supabase impossible.",
    });
    throw error;
  }
}

export function hydrateStoreFromCloud(
  snapshotOrState: WorkshopSnapshot | (Partial<StoreState> & Record<string, unknown>),
  options: { force?: boolean } = {},
) {
  const snapshot = "state" in snapshotOrState && "updatedAt" in snapshotOrState ? snapshotOrState as WorkshopSnapshot : null;
  const state = snapshot ? snapshot.state : snapshotOrState as Partial<StoreState> & Record<string, unknown>;
  const licenseKey = normalizeLicenseKey(snapshot?.licenseKey || state.licenseKey as string | undefined);

  // Garde-fou : si une version locale plus récente existe (modifs faites hors
  // ligne ou non encore poussées), on n'écrase pas. Sauf `force = true` (action
  // explicite de l'utilisateur via le toast "Actualiser").
  if (!options.force && snapshot?.updatedAt) {
    const current = useBeharStore.getState();
    const localTs = Math.max(
      new Date(current.cloudSync?.localUpdatedAt || 0).getTime(),
      new Date(current.cloudSync?.lastSyncedAt || 0).getTime(),
    );
    const cloudTs = new Date(snapshot.updatedAt).getTime();
    if (localTs && localTs > cloudTs + 1000) {
      devLog("hydrate ✗ local plus récent → on garde le local", { localTs, cloudTs });
      markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
      return;
    }
  }

  const hydrated = withLicenseState(licenseKey, state, {
    workshopId: snapshot?.workshopId,
    lastSyncedAt: snapshot?.updatedAt,
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
  return /fetch|network|réseau|timeout|failed to fetch/i.test(message || "");
}

function isDuplicateError(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key|unique constraint/i.test(error.message || "");
}
