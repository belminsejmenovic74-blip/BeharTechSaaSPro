"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { useBeharStore } from "@/lib/behar-store";
import {
  hydrateStoreFromCloud,
  loadSnapshotByLicenseKey,
  normalizeLicenseKey,
  saveSnapshotState,
} from "@/lib/workshop-sync";

const DISMISSED_KEY = "behar-cloud-fresher-dismissed-at";
const SAVE_DEBOUNCE_MS = 900;

/**
 * Démarre l'auto-sync Supabase au montage + check si le cloud a des données
 * plus récentes (cas où un autre poste a modifié pendant que celui-ci était hors-ligne).
 *
 * Protection anti-boucle : on mémorise le timestamp cloud déjà notifié pour ne
 * pas réafficher le même toast à chaque check / refresh.
 */
export function AutoSyncProvider() {
  useEffect(() => {
    let cancelled = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleSave = (state = useBeharStore.getState()) => {
      const license = normalizeLicenseKey(state.licenseKey);
      if (!state.licenseActivated || !license) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void saveSnapshotState(license, useBeharStore.getState() as any).catch(() => {
          // Le statut global est déjà mis à jour par workshop-sync.
        });
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubscribe = useBeharStore.subscribe((state, previous) => {
      if (!state._hasHydrated) return;
      if (!state.licenseActivated || !state.licenseKey) return;
      if (state === previous) return;
      scheduleSave(state);
    });

    const runCheck = async () => {
      const state = useBeharStore.getState();
      const license = normalizeLicenseKey(state.licenseKey);
      if (!license) return;
      const remote = await loadSnapshotByLicenseKey(license).catch(() => null);
      if (cancelled || !remote) return;

      const localRefTs = Math.max(
        new Date(state.cloudSync?.lastSyncedAt || 0).getTime(),
        new Date(state.cloudSync?.localUpdatedAt || 0).getTime(),
      );
      const cloudTs = new Date(remote.updatedAt || 0).getTime();
      if (!cloudTs || cloudTs - localRefTs <= 10_000) return;

      // Anti-boucle : si on a déjà notifié ce timestamp, on ne réaffiche pas.
      let dismissedAt: string | null = null;
      try {
        dismissedAt = window.sessionStorage.getItem(DISMISSED_KEY);
      } catch {
        dismissedAt = null;
      }
      if (dismissedAt === remote.updatedAt) return;

      const dateStr = new Date(remote.updatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      toast(
        "Données plus récentes disponibles",
        {
          id: "cloud-newer-available",
          description: `Un autre poste a modifié les données (${dateStr}). Actualiser ?`,
          duration: 12_000,
          onDismiss: () => {
            try { window.sessionStorage.setItem(DISMISSED_KEY, remote.updatedAt); } catch {}
          },
          onAutoClose: () => {
            try { window.sessionStorage.setItem(DISMISSED_KEY, remote.updatedAt); } catch {}
          },
          action: {
            label: "Actualiser",
            onClick: () => {
              try { window.sessionStorage.setItem(DISMISSED_KEY, remote.updatedAt); } catch {}
              hydrateStoreFromCloud(remote);
              toast.success("Données cloud actualisées.");
            },
          },
        },
      );
    };

    // 1er check après 2 sec (laisse l'app se charger).
    const initial = setTimeout(runCheck, 2000);
    // Polling périodique pour détecter les modifs faites depuis un autre device.
    const interval = window.setInterval(runCheck, 60_000);
    // Re-check immédiat au retour du réseau.
    const onOnline = () => { void runCheck(); };
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      unsubscribe();
      if (saveTimer) clearTimeout(saveTimer);
      clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
