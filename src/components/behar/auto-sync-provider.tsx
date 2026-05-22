"use client";

import { useEffect } from "react";

import { type StoreState, useBeharStore } from "@/lib/behar-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getWorkshopStateVersion,
  hydrateStoreFromCloud,
  loadSnapshotByLicenseKey,
  markSyncStatus,
  normalizeLicenseKey,
  saveSnapshotState,
  type WorkshopSnapshot,
} from "@/lib/workshop-sync";

type RealtimeSnapshotRow = {
  id?: unknown;
  workshop_id?: unknown;
  license_key?: unknown;
  workshop_name?: unknown;
  state?: unknown;
  state_size_bytes?: unknown;
  updated_at?: unknown;
};

const DEVICE_KEY = "behar-device-id";
const SAVE_DEBOUNCE_MS = 800;
const POLLING_FALLBACK_MS = 4000;

const SHARED_STATE_KEYS = [
  "workshopInfo",
  "workshopSettings",
  "onboardingCompleted",
  "configuredAt",
  "updatedAt",
  "sales",
  "deviceBrands",
  "deviceModels",
  "partCategories",
  "customers",
  "repairs",
  "quotes",
  "invoices",
  "payments",
  "appointments",
  "stockItems",
  "documents",
  "messageLogs",
  "priceBookItems",
  "teamMembers",
  "users",
  "auditLogs",
  "notifications",
  "roleGreetings",
] as const;

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function hasSharedStateChanged(state: StoreState, previous: StoreState): boolean {
  return SHARED_STATE_KEYS.some((key) => state[key] !== previous[key]);
}

function remoteDeviceId(snapshot: WorkshopSnapshot): string | undefined {
  return (snapshot.state.cloudSync as StoreState["cloudSync"] | undefined)?.lastDeviceId;
}

/**
 * Synchronisation atelier backend-first.
 *
 * - Au chargement/licence : on hydrate depuis Supabase avant de considérer le
 *   cache local comme utilisable.
 * - En sortie : chaque vraie mutation métier est sauvegardée avec une version
 *   monotone et une base connue, pour éviter qu'un vieux localStorage écrase le
 *   backend.
 * - En entrée : Supabase Realtime pousse les updates des autres appareils.
 *   Si Realtime n'est pas reçu, un polling discret compare la version distante.
 */
export function AutoSyncProvider() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const deviceId = getOrCreateDeviceId();
    const supabase = getSupabase();

    let disposed = false;
    let applyingRemote = false;
    let activeLicense = "";
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: number | null = null;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
    let lastKnownVersion = getWorkshopStateVersion(useBeharStore.getState());

    const stopRealtime = () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (channel && supabase) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const applyRemoteSnapshot = (snapshot: WorkshopSnapshot, force = false) => {
      if (disposed) return;
      const current = useBeharStore.getState();
      const localVersion = getWorkshopStateVersion(current);
      const incomingVersion = getWorkshopStateVersion(snapshot.state);
      const sameDevice = remoteDeviceId(snapshot) === deviceId;

      if (!force && sameDevice && incomingVersion <= localVersion) {
        markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
        return;
      }

      if (!force && incomingVersion < localVersion) {
        return;
      }

      if (!force && incomingVersion === localVersion) {
        const localSyncedAt = new Date(current.cloudSync?.lastSyncedAt || 0).getTime();
        const remoteUpdatedAt = new Date(snapshot.updatedAt || 0).getTime();
        if (localSyncedAt >= remoteUpdatedAt) return;
      }

      applyingRemote = true;
      hydrateStoreFromCloud(snapshot, { force: true });
      lastKnownVersion = Math.max(lastKnownVersion, incomingVersion);
      window.setTimeout(() => {
        applyingRemote = false;
      }, 0);
    };

    const fetchAndApplyRemote = async (license: string, force = false) => {
      const snapshot = await loadSnapshotByLicenseKey(license).catch(() => null);
      if (!snapshot || disposed) return;
      applyRemoteSnapshot(snapshot, force);
    };

    const startRealtime = (license: string) => {
      stopRealtime();
      if (!supabase) return;

      channel = supabase
        .channel(`workshop-sync:${license}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workshop_snapshots",
            filter: `license_key=eq.${license}`,
          },
          (payload) => {
            const row = payload.new as RealtimeSnapshotRow;
            if (!row.state || typeof row.state !== "object") return;
            applyRemoteSnapshot({
              id: String(row.id ?? ""),
              workshopId: String(row.workshop_id ?? ""),
              licenseKey: normalizeLicenseKey(String(row.license_key ?? license)),
              workshopName: typeof row.workshop_name === "string" ? row.workshop_name : undefined,
              state: row.state as Partial<StoreState> & Record<string, unknown>,
              stateSizeBytes: typeof row.state_size_bytes === "number" ? row.state_size_bytes : 0,
              updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
            });
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            markSyncStatus("synced", {
              lastSyncedAt: useBeharStore.getState().cloudSync?.lastSyncedAt,
              lastError: undefined,
            });
          }
        });

      pollTimer = window.setInterval(() => {
        void fetchAndApplyRemote(license);
      }, POLLING_FALLBACK_MS);
    };

    const bootstrapLicense = async (license: string) => {
      if (!license || license === activeLicense) return;
      activeLicense = license;
      markSyncStatus("loading");
      await fetchAndApplyRemote(license, false);
      if (disposed || activeLicense !== license) return;
      lastKnownVersion = getWorkshopStateVersion(useBeharStore.getState());
      startRealtime(license);
    };

    const scheduleSave = (state: StoreState) => {
      const license = normalizeLicenseKey(state.licenseKey);
      if (!state.licenseActivated || !license || license !== activeLicense) return;
      if (saveTimer) clearTimeout(saveTimer);

      const baseStateVersion = getWorkshopStateVersion(state);
      const nextStateVersion = Math.max(baseStateVersion, lastKnownVersion) + 1;

      saveTimer = setTimeout(() => {
        const current = useBeharStore.getState();
        const saveState = {
          ...current,
          cloudSync: {
            ...(current.cloudSync ?? {}),
            lastDeviceId: deviceId,
            localUpdatedAt: new Date().toISOString(),
            stateVersion: nextStateVersion,
          },
        } as Partial<StoreState> & Record<string, unknown>;

        void saveSnapshotState(license, saveState, { deviceId, baseStateVersion })
          .then((snapshot) => {
            if (disposed) return;
            const snapshotVersion = getWorkshopStateVersion(snapshot.state);
            const snapshotDeviceId = remoteDeviceId(snapshot);

            if (snapshotDeviceId && snapshotDeviceId !== deviceId && snapshotVersion >= nextStateVersion) {
              applyRemoteSnapshot(snapshot, true);
              return;
            }

            lastKnownVersion = Math.max(lastKnownVersion, snapshotVersion);
            applyingRemote = true;
            useBeharStore.setState(
              {
                cloudSync: {
                  ...(useBeharStore.getState().cloudSync ?? {}),
                  workshopId: snapshot.workshopId,
                  lastSyncedAt: snapshot.updatedAt,
                  localUpdatedAt: (saveState.cloudSync as StoreState["cloudSync"] | undefined)?.localUpdatedAt,
                  stateVersion: snapshotVersion,
                  lastSyncedStateVersion: snapshotVersion,
                  lastDeviceId: deviceId,
                },
              },
              false,
            );
            window.setTimeout(() => {
              applyingRemote = false;
            }, 0);
          })
          .catch(() => {
            // Le statut détaillé est déjà maintenu par workshop-sync.
          });
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubscribe = useBeharStore.subscribe((state, previous) => {
      if (!state._hasHydrated) return;
      const license = normalizeLicenseKey(state.licenseKey);

      if (state.licenseActivated && license && license !== activeLicense) {
        void bootstrapLicense(license);
      }

      if (applyingRemote) return;
      if (!hasSharedStateChanged(state, previous)) return;

      scheduleSave(state);
    });

    const initialState = useBeharStore.getState();
    const initialLicense = normalizeLicenseKey(initialState.licenseKey);
    if (initialState._hasHydrated && initialState.licenseActivated && initialLicense) {
      void bootstrapLicense(initialLicense);
    }

    const onOnline = () => {
      const license = normalizeLicenseKey(useBeharStore.getState().licenseKey);
      if (license) void fetchAndApplyRemote(license);
    };
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      unsubscribe();
      if (saveTimer) clearTimeout(saveTimer);
      stopRealtime();
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
