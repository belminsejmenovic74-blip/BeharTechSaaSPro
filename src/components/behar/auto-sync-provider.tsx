"use client";

import { useEffect } from "react";

import { type StoreState, useBeharStore } from "@/lib/behar-store";
import { getPlanLimits } from "@/lib/plan-limits";
import { syncNormalizedBusinessState } from "@/lib/data/normalized-sync";
import { syncPublicTrackingDocumentsToCloud } from "@/lib/public-tracking-documents-sync";
import { syncPublicTrackingRepairsToCloud } from "@/lib/public-tracking-sync";
import { installReconditioningSalesBridge } from "@/lib/reconditioning-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getWorkshopStateVersion,
  hydrateStoreFromCloud,
  loadSnapshotByLicenseKey,
  markSyncStatus,
  normalizeLicenseKey,
  saveSnapshotState,
  subscribeAuxStoreChanges,
  type WorkshopSnapshot,
} from "@/lib/workshop-sync";

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
  "appointments",
  "stockItems",
  "stockMovements",
  "purchases",
  "suppliers",
  "supplierInvoices",
  "supplierInvoiceLines",
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
    installReconditioningSalesBridge();
  }, []);

  // ── Publication du suivi public (page /suivi), DÉCOUPLÉE de la sauvegarde
  //    snapshot ─────────────────────────────────────────────────────────────
  // Les tables `public_tracking_repairs` / `public_tracking_documents` ont leur
  // propre RLS anonyme (lecture ET écriture) : elles ne dépendent ni de la
  // licence, ni du succès de `saveSnapshotState`. Historiquement le push suivi
  // était chaîné sur `saveSnapshotState(...).then()` ; dès que ce chemin
  // (verrouillé/licence) cesse de s'exécuter, plus AUCUN dossier neuf ne remonte
  // et la page publique affiche « Suivi introuvable ». On pousse donc le suivi
  // directement dès qu'un dossier / document change, indépendamment de la synchro
  // atelier. Upsert idempotent (onConflict: tracking_id) → doublon inoffensif.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pushTracking = () => {
      const state = useBeharStore.getState();
      if (!state._hasHydrated) return;
      const trackedRepairs = (state.repairs ?? []).filter((repair) => repair?.publicAccess?.active !== false);
      if (trackedRepairs.length > 0) {
        void syncPublicTrackingRepairsToCloud(trackedRepairs, state);
      }
      void syncPublicTrackingDocumentsToCloud(state);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!disposed) pushTracking();
      }, 500);
    };

    const unsubscribe = useBeharStore.subscribe((state, previous) => {
      if (disposed) return;
      // On ne réagit qu'aux données réellement exposées côté suivi public.
      if (
        state.repairs === previous.repairs &&
        state.documents === previous.documents &&
        state.quotes === previous.quotes &&
        state.invoices === previous.invoices
      ) {
        return;
      }
      schedule();
    });

    // Au montage : rattrape les dossiers déjà créés mais jamais remontés.
    schedule();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const deviceId = getOrCreateDeviceId();
    const supabase = getSupabase();

    let disposed = false;
    let applyingRemote = false;
    let activeLicense = "";
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: number | null = null;
    let lastKnownVersion = getWorkshopStateVersion(useBeharStore.getState());

    const stopRealtime = () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
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
        markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
        return;
      }

      if (!force && incomingVersion === localVersion) {
        const localSyncedAt = new Date(current.cloudSync?.lastSyncedAt || 0).getTime();
        const remoteUpdatedAt = new Date(snapshot.updatedAt || 0).getTime();
        if (localSyncedAt >= remoteUpdatedAt) {
          markSyncStatus("synced", { lastSyncedAt: snapshot.updatedAt, lastError: undefined });
          return;
        }
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

    // Les snapshots ne sont plus lisibles directement côté client (accès
    // verrouillé au profit d'un accès par licence). La reprise des modifications
    // faites sur un autre poste passe donc par une relève périodique.
    const startRealtime = (license: string) => {
      stopRealtime();
      if (!supabase) return;
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

        // Limite d'appareils connectés selon l'offre. Historiquement, un appareil
        // « hors quota » voyait TOUTE sa sauvegarde bloquée en silence
        // (markSyncStatus("error") + return). Résultat observé : une liste
        // d'appareils gonflée (sessions de test, cache vidé → nouvel id à chaque
        // fois) finissait par bloquer n'importe quel appareil dont l'id n'était
        // pas déjà enregistré — plus aucun dossier ne remontait au cloud.
        //
        // Nouvelle politique : on n'interrompt plus jamais la sauvegarde. On garde
        // la limite « N appareils actifs » via une éviction LRU — l'appareil
        // réellement utilisé conserve toujours sa place, les ids les plus anciens
        // tombent d'eux-mêmes. Auto-cicatrisant.
        const nowIso = new Date().toISOString();
        const knownDevices = (current.cloudSync?.devices ?? []).filter(
          (device) => Date.now() - new Date(device.lastSeenAt).getTime() < 30 * 24 * 60 * 60 * 1000,
        );
        const deviceLimit = getPlanLimits(current.licensePlan).devices;
        let devices: Array<{ id: string; label?: string; lastSeenAt: string }>;
        if (knownDevices.some((device) => device.id === deviceId)) {
          devices = knownDevices.map((device) => (device.id === deviceId ? { ...device, lastSeenAt: nowIso } : device));
        } else {
          const withCurrent = [
            ...knownDevices,
            { id: deviceId, label: navigator.userAgent.slice(0, 60), lastSeenAt: nowIso },
          ];
          devices =
            deviceLimit == null
              ? withCurrent
              : withCurrent
                  .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
                  .slice(0, Math.max(1, deviceLimit));
        }

        const saveState = {
          ...current,
          cloudSync: {
            ...(current.cloudSync ?? {}),
            lastDeviceId: deviceId,
            localUpdatedAt: nowIso,
            stateVersion: nextStateVersion,
            devices,
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

            // Alimente la table de suivi public (/suivi) : le système de sync
            // actif ne remplit que `workshop_snapshots`. Sans ce push, aucun
            // dossier ne remonte vers `public_tracking_repairs` et la page
            // publique affiche toujours « Suivi introuvable ».
            // Fire-and-forget : ne bloque jamais la sauvegarde principale.
            const trackingState = useBeharStore.getState();
            // Réplique aussi les paramètres et données dans les tables métier
            // (workshops, app_settings, widget shops, clients, dossiers…). Le
            // snapshot reste la sauvegarde exhaustive, les tables normalisées
            // restent la source serveur exploitable par le portail et le widget.
            void syncNormalizedBusinessState(trackingState).catch((error) => {
              console.error("[auto-sync] normalized business sync failed", error);
            });
            const trackedRepairs = (trackingState.repairs ?? []).filter(
              (repair) => repair?.publicAccess?.active !== false,
            );
            if (trackedRepairs.length > 0) {
              void syncPublicTrackingRepairsToCloud(trackedRepairs, trackingState);
            }
            // Idem pour les documents commerciaux (devis/facture) :
            // alimente `public_tracking_documents` lu par les pages publiques.
            void syncPublicTrackingDocumentsToCloud(trackingState);
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

    // Les stores annexes (règles de reprise, appareils recond…) déclenchent
    // aussi une sauvegarde : ils voyagent dans le même snapshot cloud.
    const unsubscribeAux = subscribeAuxStoreChanges(() => {
      if (applyingRemote) return;
      const state = useBeharStore.getState();
      if (!state._hasHydrated) return;
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
      unsubscribeAux();
      if (saveTimer) clearTimeout(saveTimer);
      stopRealtime();
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
