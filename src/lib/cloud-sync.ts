/**
 * Cloud sync — Netflix-style auto-sync.
 *
 * - La licence = identifiant unique (= « mot de passe »).
 * - À l'activation de la licence, on tente de retrouver l'atelier dans Supabase.
 * - Pendant l'utilisation, chaque modification du state déclenche un upload
 *   en debounce 3 sec.
 * - Si offline : on continue en local et on reprend le sync à la reconnexion.
 */

"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const STORAGE_KEY = "behar-tech-local-demo-v3";
const DEBOUNCE_MS = 3000;

// ────────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────────

export type SyncStatus =
  | "idle"        // app vient de démarrer, aucun sync tenté
  | "syncing"     // upload en cours
  | "synced"      // dernier upload OK
  | "offline"     // pas de réseau ou Supabase injoignable
  | "error";      // erreur côté serveur

export type SyncState = {
  status: SyncStatus;
  lastSyncedAt?: string;
  lastError?: string;
};

export type DownloadResult =
  | { ok: true; state: any; updatedAt: string; sizeBytes: number; workshopName?: string }
  | { ok: false; error: "not_found" | "network" | "no_license"; details?: string };

export type UploadResult =
  | { ok: true; updatedAt: string; sizeBytes: number }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Normalise une licence : trim + uppercase. */
export function normalizeLicense(key: string | null | undefined): string {
  return (key || "").trim().toUpperCase();
}

/** Renvoie l'état Zustand complet depuis localStorage. */
function readLocalState(): any | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.state ?? parsed;
  } catch {
    return null;
  }
}

/** Écrit l'état dans localStorage (sans reload). */
function writeLocalState(state: any) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 1 }));
}

function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Inconnu";
  const ua = navigator.userAgent || "";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "PC Windows";
  if (/Linux/i.test(ua)) return "Linux";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  return "Navigateur";
}

// ────────────────────────────────────────────────────────────────────────────
//  Sync state (réactif via callbacks)
// ────────────────────────────────────────────────────────────────────────────

let syncState: SyncState = { status: "idle" };
const listeners = new Set<(s: SyncState) => void>();

function setSyncState(patch: Partial<SyncState>) {
  syncState = { ...syncState, ...patch };
  listeners.forEach((l) => l(syncState));
}

export function getSyncState(): SyncState {
  return syncState;
}

export function subscribeSyncState(cb: (s: SyncState) => void): () => void {
  listeners.add(cb);
  cb(syncState);
  return () => { listeners.delete(cb); };
}

// ────────────────────────────────────────────────────────────────────────────
//  Upload — push complet du state vers Supabase
// ────────────────────────────────────────────────────────────────────────────

export async function uploadSnapshot(opts?: { silent?: boolean }): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configuré." };
  }
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Client Supabase indisponible." };

  const state = readLocalState();
  if (!state) return { ok: false, error: "Aucun état local à sauvegarder." };

  const licenseKey = normalizeLicense(state.licenseKey);
  if (!licenseKey) return { ok: false, error: "Licence requise pour sauvegarder." };

  if (!opts?.silent) setSyncState({ status: "syncing" });

  // workshop_id stable (généré une fois par licence)
  let workshopId: string = state.cloudSync?.workshopId;
  if (!workshopId) {
    workshopId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    state.cloudSync = { ...(state.cloudSync || {}), workshopId };
    writeLocalState(state);
  }

  const payload = JSON.stringify(state);
  const sizeBytes = new Blob([payload]).size;
  if (sizeBytes > 10 * 1024 * 1024) {
    setSyncState({ status: "error", lastError: "Données trop volumineuses (>10 Mo)." });
    return { ok: false, error: "Snapshot trop volumineux (>10 Mo)." };
  }

  const row = {
    workshop_id: workshopId,
    license_key: licenseKey,
    workshop_name: state.workshopSettings?.name || state.workshopInfo?.name || null,
    device_label: detectDeviceLabel(),
    state,
    state_size_bytes: sizeBytes,
    schema_version: 1,
  };

  try {
    const { error, data } = await supabase
      .from("workshop_snapshots")
      .upsert(row, { onConflict: "license_key" })
      .select("updated_at")
      .single();

    if (error) {
      const isNetwork = error.message?.includes("fetch") || error.message?.includes("Network");
      setSyncState({ status: isNetwork ? "offline" : "error", lastError: error.message });
      return { ok: false, error: error.message || "Erreur Supabase." };
    }

    const updatedAt = data?.updated_at || new Date().toISOString();
    // Met à jour le timestamp local
    state.cloudSync = { ...(state.cloudSync || {}), workshopId, lastSyncedAt: updatedAt };
    writeLocalState(state);
    setSyncState({ status: "synced", lastSyncedAt: updatedAt, lastError: undefined });
    return { ok: true, updatedAt, sizeBytes };
  } catch (e: any) {
    setSyncState({ status: "offline", lastError: e?.message || "Réseau indisponible." });
    return { ok: false, error: e?.message || "Réseau indisponible." };
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Download — récupère l'état depuis Supabase par licence
// ────────────────────────────────────────────────────────────────────────────

export async function downloadSnapshotByLicense(rawKey: string): Promise<DownloadResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "network", details: "Supabase non configuré." };
  const license = normalizeLicense(rawKey);
  if (!license) return { ok: false, error: "no_license" };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "network" };

  try {
    const { data, error } = await supabase
      .from("workshop_snapshots")
      .select("state, state_size_bytes, workshop_name, updated_at")
      .eq("license_key", license)
      .maybeSingle();

    if (error) return { ok: false, error: "network", details: error.message };
    if (!data) return { ok: false, error: "not_found" };

    return {
      ok: true,
      state: data.state,
      updatedAt: data.updated_at,
      sizeBytes: data.state_size_bytes,
      workshopName: data.workshop_name || undefined,
    };
  } catch (e: any) {
    return { ok: false, error: "network", details: e?.message || "Réseau indisponible." };
  }
}

/** Restaure depuis Supabase et fait un reload. */
export async function restoreFromLicense(rawKey: string): Promise<DownloadResult> {
  const result = await downloadSnapshotByLicense(rawKey);
  if (!result.ok) return result;
  writeLocalState(result.state);
  if (typeof window !== "undefined") window.location.reload();
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
//  Auto-sync — debounce sur les mutations du state local
// ────────────────────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let autoSyncEnabled = true;

function scheduleSync() {
  if (!autoSyncEnabled) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void uploadSnapshot({ silent: false });
  }, DEBOUNCE_MS);
}

/**
 * Active l'auto-sync : surveille les changements du localStorage et déclenche
 * un upload en debounce. À appeler une seule fois au démarrage de l'app.
 */
export function setupAutoSync() {
  if (typeof window === "undefined") return;
  if (!isSupabaseConfigured()) return;

  // Surveille les changements via un MutationObserver-like sur localStorage.
  // Comme Zustand persist écrit dans localStorage, on intercepte setItem.
  const original = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = function (key: string, value: string) {
    original(key, value);
    if (key === STORAGE_KEY) {
      scheduleSync();
    }
  };

  // Reprise quand le réseau revient
  window.addEventListener("online", () => {
    if (syncState.status === "offline") {
      scheduleSync();
    }
  });

  // Sync immédiat au démarrage (si licence présente)
  const state = readLocalState();
  if (state?.licenseKey) {
    scheduleSync();
  }
}

/** Désactive temporairement l'auto-sync (utile pendant un restore). */
export function pauseAutoSync() { autoSyncEnabled = false; }
export function resumeAutoSync() { autoSyncEnabled = true; }

// ────────────────────────────────────────────────────────────────────────────
//  Compatibilité avec l'ancienne API (Paramètres button)
// ────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated utilisé par l'ancien bloc Paramètres ; conservé pour compat.
 * Lit le timestamp du dernier sync depuis le state local.
 */
export function getLocalSyncInfo(): { workshopId?: string; lastSyncedAt?: string } {
  const state = readLocalState();
  return state?.cloudSync || {};
}
