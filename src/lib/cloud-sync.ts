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
// Marge pour considérer le cloud comme « réellement plus récent » que le local.
const FRESHER_MARGIN_MS = 10_000;

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

/** Renvoie le timestamp de la dernière modification locale connue. */
function getLocalUpdatedAt(state: any): string | undefined {
  return state?.cloudSync?.localUpdatedAt;
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

  const rowBase = {
    workshop_id: workshopId,
    license_key: licenseKey,
    workshop_name: state.workshopSettings?.name || state.workshopInfo?.name || null,
    device_label: detectDeviceLabel(),
    state,
    state_size_bytes: sizeBytes,
    schema_version: 1,
  };

  try {
    // Stratégie sans ON CONFLICT (pas de migration obligatoire) :
    // 1) on cherche la ligne par license_key
    // 2) si elle existe → update
    // 3) sinon → insert
    const { data: existing, error: selectError } = await supabase
      .from("workshop_snapshots")
      .select("workshop_id")
      .eq("license_key", licenseKey)
      .maybeSingle();

    if (selectError) {
      const isNetwork = selectError.message?.includes("fetch") || selectError.message?.includes("Network");
      setSyncState({ status: isNetwork ? "offline" : "error", lastError: selectError.message });
      return { ok: false, error: selectError.message || "Erreur Supabase." };
    }

    let updatedAt: string | undefined;
    if (existing?.workshop_id) {
      const { error, data } = await supabase
        .from("workshop_snapshots")
        .update({ ...rowBase, workshop_id: existing.workshop_id })
        .eq("license_key", licenseKey)
        .select("updated_at")
        .single();
      if (error) {
        const isNetwork = error.message?.includes("fetch") || error.message?.includes("Network");
        setSyncState({ status: isNetwork ? "offline" : "error", lastError: error.message });
        return { ok: false, error: error.message || "Erreur Supabase." };
      }
      updatedAt = data?.updated_at;
      // Synchronise l'id local si Supabase a son propre id
      if (existing.workshop_id !== workshopId) {
        workshopId = existing.workshop_id;
      }
    } else {
      const { error, data } = await supabase
        .from("workshop_snapshots")
        .insert(rowBase)
        .select("updated_at")
        .single();
      if (error) {
        // Course : un autre poste a inséré la ligne entre notre SELECT et notre INSERT.
        // Code 23505 = unique_violation (si la contrainte UNIQUE existe).
        const isDuplicate =
          (error as any).code === "23505" ||
          /duplicate key|unique constraint/i.test(error.message || "");
        if (isDuplicate) {
          const retry = await supabase
            .from("workshop_snapshots")
            .update(rowBase)
            .eq("license_key", licenseKey)
            .select("updated_at")
            .single();
          if (retry.error) {
            const isNetwork = retry.error.message?.includes("fetch") || retry.error.message?.includes("Network");
            setSyncState({ status: isNetwork ? "offline" : "error", lastError: retry.error.message });
            return { ok: false, error: retry.error.message || "Erreur Supabase." };
          }
          updatedAt = retry.data?.updated_at;
        } else {
          const isNetwork = error.message?.includes("fetch") || error.message?.includes("Network");
          setSyncState({ status: isNetwork ? "offline" : "error", lastError: error.message });
          return { ok: false, error: error.message || "Erreur Supabase." };
        }
      } else {
        updatedAt = data?.updated_at;
      }
    }

    const finalUpdatedAt = updatedAt || new Date().toISOString();
    // Met à jour le timestamp local
    const fresh = readLocalState() || state;
    fresh.cloudSync = { ...(fresh.cloudSync || {}), workshopId, lastSyncedAt: finalUpdatedAt };
    writeLocalState(fresh);
    setSyncState({ status: "synced", lastSyncedAt: finalUpdatedAt, lastError: undefined });
    return { ok: true, updatedAt: finalUpdatedAt, sizeBytes };
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

/**
 * Restaure depuis Supabase et fait un reload.
 * Protections :
 *  - Sauvegarde un backup local avant écrasement.
 *  - Refuse si le cloud est vide.
 *  - Refuse si le cloud n'est pas plus récent que le local (évite la régression).
 */
export async function restoreFromLicense(rawKey: string): Promise<DownloadResult> {
  const result = await downloadSnapshotByLicense(rawKey);
  if (!result.ok) return result;

  if (!result.state || typeof result.state !== "object") {
    return { ok: false, error: "not_found", details: "Snapshot cloud vide." };
  }

  const localState = readLocalState();
  const cloudTs = new Date(result.updatedAt || 0).getTime();
  const localTs = Math.max(
    new Date(localState?.cloudSync?.lastSyncedAt || 0).getTime(),
    new Date(getLocalUpdatedAt(localState) || 0).getTime(),
  );

  if (cloudTs && localTs && cloudTs <= localTs) {
    // Cloud plus ancien ou égal → on ne touche pas au local.
    return { ok: false, error: "not_found", details: "Le cloud n'est pas plus récent que le local." };
  }

  // Backup horodaté avant tout écrasement (+ rotation : on garde les 5 derniers).
  if (typeof window !== "undefined" && localState) {
    try {
      const stamp = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..*/, "");
      const backupKey = `behar-backup-before-cloud-restore-${stamp}`;
      window.localStorage.setItem(backupKey, JSON.stringify({ state: localState, version: 1 }));
      // Rotation : ne conserve que les 5 backups les plus récents
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("behar-backup-before-cloud-restore-")) keys.push(k);
      }
      keys.sort();
      while (keys.length > 5) {
        const old = keys.shift();
        if (old) window.localStorage.removeItem(old);
      }
    } catch {
      // ignore quota errors — restoration continues
    }
  }

  // Conserve workshopId local si présent, et marque le sync.
  const merged = {
    ...result.state,
    cloudSync: {
      ...(result.state.cloudSync || {}),
      workshopId: result.state.cloudSync?.workshopId || localState?.cloudSync?.workshopId,
      lastSyncedAt: result.updatedAt,
      localUpdatedAt: result.updatedAt,
    },
  };
  writeLocalState(merged);
  if (typeof window !== "undefined") window.location.reload();
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
//  Auto-sync — debounce sur les mutations du state local
// ────────────────────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let autoSyncEnabled = true;
let setupDone = false;

function scheduleSync() {
  if (!autoSyncEnabled) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void uploadSnapshot({ silent: false });
  }, DEBOUNCE_MS);
}

/** Met à jour le marqueur de dernière mutation locale (sans déclencher d'écriture supplémentaire). */
function bumpLocalUpdatedAt() {
  // Note : on évite de relire+réécrire localStorage ici pour ne pas boucler avec l'intercepteur setItem.
  // À la place, la fonction est appelée par l'intercepteur et stocke la valeur sur le state du dernier write.
}

/**
 * Active l'auto-sync : surveille les changements du localStorage et déclenche
 * un upload en debounce. À appeler une seule fois au démarrage de l'app.
 *
 * Implémentation : on N'intercepte PAS `localStorage.setItem` — certaines
 * extensions (MetaMask via SES) figent les globaux et empêchent le monkey-
 * patch, ce qui faisait crasher l'init. À la place, on écoute :
 *  - l'événement natif `storage` (déclenché par les autres onglets)
 *  - un polling léger toutes les 2 sec pour détecter les writes du tab courant
 *  - le retour du réseau
 */
export function setupAutoSync() {
  if (typeof window === "undefined") return;
  if (!isSupabaseConfigured()) return;
  if (setupDone) return;
  setupDone = true;

  let lastSeenPayload: string | null = null;
  try {
    lastSeenPayload = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage indisponible (mode privé strict) — on abandonne en silence
    return;
  }

  const tick = () => {
    let current: string | null = null;
    try {
      current = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (current !== lastSeenPayload) {
      lastSeenPayload = current;
      // Marque la dernière mutation locale (sans casser le payload Zustand)
      try {
        const parsed = current ? JSON.parse(current) : null;
        const state = parsed?.state ?? parsed;
        if (state && typeof state === "object") {
          state.cloudSync = { ...(state.cloudSync || {}), localUpdatedAt: new Date().toISOString() };
          const next = JSON.stringify(parsed?.state ? { ...parsed, state } : state);
          window.localStorage.setItem(STORAGE_KEY, next);
          lastSeenPayload = next;
        }
      } catch {
        // payload non-JSON ou setItem bloqué — pas grave
      }
      scheduleSync();
    }
  };

  // Polling tab-courant (changements via Zustand persist ne déclenchent pas l'event "storage")
  const interval = window.setInterval(tick, 2000);

  // Cross-tab : event "storage" (déclenché par les AUTRES onglets/postes)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      lastSeenPayload = e.newValue;
      scheduleSync();
    }
  };
  window.addEventListener("storage", onStorage);

  // Reprise quand le réseau revient
  const onOnline = () => {
    if (syncState.status === "offline") scheduleSync();
  };
  window.addEventListener("online", onOnline);

  // Sync immédiat au démarrage (si licence présente)
  const state = readLocalState();
  if (state?.licenseKey) {
    scheduleSync();
  }

  // Nettoyage théorique (pas appelé en pratique car setup global, mais propre)
  (setupAutoSync as any)._cleanup = () => {
    window.clearInterval(interval);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("online", onOnline);
    setupDone = false;
  };
}

/** Désactive temporairement l'auto-sync (utile pendant un restore). */
export function pauseAutoSync() { autoSyncEnabled = false; }
export function resumeAutoSync() { autoSyncEnabled = true; }

/**
 * Au démarrage : si le cloud a un snapshot plus récent que la dernière modif
 * locale (= un autre poste a modifié), retourne les infos pour proposer un refresh.
 * Renvoie null si rien à faire / pas plus récent / pas de licence.
 *
 * On compare contre MAX(lastSyncedAt, localUpdatedAt) pour éviter que des
 * modifications locales non encore sync (ou un upload en échec) déclenchent
 * un toast trompeur proposant de restaurer un cloud plus ancien.
 */
export async function checkCloudFresher(): Promise<{
  cloudUpdatedAt: string;
  localSyncedAt?: string;
  workshopName?: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const state = readLocalState();
  const license = normalizeLicense(state?.licenseKey);
  if (!license) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("workshop_snapshots")
      .select("updated_at, workshop_name")
      .eq("license_key", license)
      .maybeSingle();
    if (error || !data) return null;

    const localSyncedAt = state.cloudSync?.lastSyncedAt;
    const localUpdatedAt = getLocalUpdatedAt(state);
    const cloudTs = new Date(data.updated_at || 0).getTime();
    const localRefTs = Math.max(
      new Date(localSyncedAt || 0).getTime(),
      new Date(localUpdatedAt || 0).getTime(),
    );

    if (!localRefTs) {
      // Aucun repère local fiable → on ne propose une restauration que si le local est vide.
      const hasAnyLocalData =
        (state?.repairs?.length ?? 0) > 0 ||
        (state?.invoices?.length ?? 0) > 0 ||
        (state?.customers?.length ?? 0) > 0;
      if (hasAnyLocalData) return null;
      return { cloudUpdatedAt: data.updated_at, workshopName: data.workshop_name || undefined };
    }

    if (cloudTs - localRefTs > FRESHER_MARGIN_MS) {
      return { cloudUpdatedAt: data.updated_at, localSyncedAt, workshopName: data.workshop_name || undefined };
    }
    return null;
  } catch {
    return null;
  }
}

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
