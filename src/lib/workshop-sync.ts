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
    const byNormalized = await supabase
      .from("workshop_snapshots")
      .select(selectColumns)
      .eq("license_key_normalized", normalizedKey)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const shouldFallback = byNormalized.error && /license_key_normalized|column/i.test(byNormalized.error.message || "");
    const { data, error } = shouldFallback
      ? await supabase
          .from("workshop_snapshots")
          .select(selectColumns)
          .ilike("license_key", normalizedKey)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : byNormalized;

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
  const supabase = getSupabase();
  if (!supabase) throw new Error("Client Supabase indisponible.");

  const existing = await loadSnapshotByLicenseKey(normalizedKey);
  if (existing) return existing;

  const workshopId = (initialState.cloudSync as StoreState["cloudSync"] | undefined)?.workshopId || createWorkshopId();
  const state = withLicenseState(normalizedKey, initialState, { workshopId });
  const sizeBytes = getStateSizeBytes(state);

  if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
    throw new Error("Snapshot trop volumineux (>10 Mo).");
  }

  markSyncStatus("saving");
  try {
    const { data, error } = await supabase
      .from("workshop_snapshots")
      .insert({
        workshop_id: workshopId,
        recovery_code: createRecoveryCode(),
        license_key: normalizedKey,
        workshop_name: state.workshopSettings?.name || state.workshopInfo?.name || null,
        device_label: detectDeviceLabel(),
        state,
        state_size_bytes: sizeBytes,
        schema_version: WORKSHOP_SCHEMA_VERSION,
      })
      .select("id, workshop_id, license_key, workshop_name, state, state_size_bytes, updated_at")
      .single();

    if (error) {
      if (isDuplicateError(error)) {
        const raced = await loadSnapshotByLicenseKey(normalizedKey);
        if (raced) return raced;
      }
      markSyncStatus(isNetworkError(error.message) ? "offline" : "error", { lastError: error.message });
      throw error;
    }

    const snapshot = rowToSnapshot(data, normalizedKey);
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
    return snapshot;
  } catch (error: any) {
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
  const supabase = getSupabase();
  if (!supabase) throw new Error("Client Supabase indisponible.");

  const existing = await loadSnapshotByLicenseKey(normalizedKey);
  if (!existing) return createSnapshotForLicenseKey(normalizedKey, state);

  const mergedState = withLicenseState(normalizedKey, state, {
    workshopId: existing.workshopId,
    lastSyncedAt: existing.updatedAt,
  });
  const sizeBytes = getStateSizeBytes(mergedState);
  if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
    throw new Error("Snapshot trop volumineux (>10 Mo).");
  }

  markSyncStatus("saving");
  try {
    const { data, error } = await supabase
      .from("workshop_snapshots")
      .update({
        workshop_id: existing.workshopId,
        license_key: normalizedKey,
        workshop_name: mergedState.workshopSettings?.name || mergedState.workshopInfo?.name || null,
        device_label: detectDeviceLabel(),
        state: mergedState,
        state_size_bytes: sizeBytes,
        schema_version: WORKSHOP_SCHEMA_VERSION,
      })
      .eq("id", existing.id)
      .select("id, workshop_id, license_key, workshop_name, state, state_size_bytes, updated_at")
      .single();

    if (error) {
      markSyncStatus(isNetworkError(error.message) ? "offline" : "error", { lastError: error.message });
      throw error;
    }

    const snapshot = rowToSnapshot(data, normalizedKey);
    markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
    return snapshot;
  } catch (error: any) {
    markSyncStatus(isNetworkError(error?.message) ? "offline" : "error", {
      lastError: error?.message || "Sauvegarde Supabase impossible.",
    });
    throw error;
  }
}

export function hydrateStoreFromCloud(snapshotOrState: WorkshopSnapshot | (Partial<StoreState> & Record<string, unknown>)) {
  const snapshot = "state" in snapshotOrState && "updatedAt" in snapshotOrState ? snapshotOrState as WorkshopSnapshot : null;
  const state = snapshot ? snapshot.state : snapshotOrState as Partial<StoreState> & Record<string, unknown>;
  const licenseKey = normalizeLicenseKey(snapshot?.licenseKey || state.licenseKey as string | undefined);
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
    hydrateStoreFromCloud(remote);
    return "loaded";
  }

  const created = await createSnapshotForLicenseKey(normalizedKey, localState);
  hydrateStoreFromCloud(created);
  return "created";
}

function isNetworkError(message?: string) {
  return /fetch|network|réseau|timeout|failed to fetch/i.test(message || "");
}

function isDuplicateError(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key|unique constraint/i.test(error.message || "");
}
