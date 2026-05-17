"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { useBeharStore } from "@/lib/behar-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  hydrateStoreFromCloud,
  loadSnapshotByLicenseKey,
  normalizeLicenseKey,
  saveSnapshotState,
} from "@/lib/workshop-sync";

const DISMISSED_KEY = "behar-cloud-fresher-dismissed-at";
const DEVICE_KEY = "behar-device-id";
const SAVE_DEBOUNCE_MS = 900;
// Marge d'auto-update locale : si une sauvegarde locale a eu lieu dans les
// 90 dernières secondes, on suppose que la version distante = la nôtre.
const LOCAL_SAVE_GRACE_MS = 90_000;

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

/**
 * Démarre l'auto-sync Supabase au montage + check si le cloud a des données
 * plus récentes (cas où un autre poste a modifié pendant que celui-ci était hors-ligne).
 *
 * Garde-fous :
 *  - Pas de toast si Supabase n'est pas configuré (mode local/démo).
 *  - Pas de toast si la version distante a été écrite par ce même device.
 *  - Pas de toast si une sauvegarde locale vient juste d'avoir lieu.
 *  - Anti-boucle : on mémorise le timestamp cloud déjà notifié.
 */
export function AutoSyncProvider() {
  useEffect(() => {
    // Si pas de backend cloud configuré, on n'enregistre rien et on n'affiche
    // jamais le toast "données plus récentes" — l'utilisateur est en local pur.
    if (!isSupabaseConfigured()) {
      return;
    }

    const deviceId = getOrCreateDeviceId();
    let cancelled = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let lastLocalSaveAt = 0;

    const scheduleSave = (state = useBeharStore.getState()) => {
      const license = normalizeLicenseKey(state.licenseKey);
      if (!state.licenseActivated || !license) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        lastLocalSaveAt = Date.now();
        void saveSnapshotState(license, {
          ...(useBeharStore.getState() as any),
          cloudSync: {
            ...((useBeharStore.getState() as any).cloudSync ?? {}),
            lastDeviceId: deviceId,
            localUpdatedAt: new Date().toISOString(),
          },
        } as any).catch(() => {
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

      // Si on vient de pousser une sauvegarde locale, la version cloud est
      // probablement la nôtre — on s'épargne le toast.
      if (Date.now() - lastLocalSaveAt < LOCAL_SAVE_GRACE_MS) return;

      const localRefTs = Math.max(
        new Date(state.cloudSync?.lastSyncedAt || 0).getTime(),
        new Date(state.cloudSync?.localUpdatedAt || 0).getTime(),
      );
      const cloudTs = new Date(remote.updatedAt || 0).getTime();
      if (!cloudTs || cloudTs - localRefTs <= 10_000) return;

      // Si la version distante a été écrite par ce même device, on ne
      // notifie pas (cas typique : multi-onglets, retour réseau, etc.).
      const remoteState = (remote.state ?? {}) as { cloudSync?: { lastDeviceId?: string } };
      const remoteDeviceId = remoteState?.cloudSync?.lastDeviceId;
      if (remoteDeviceId && deviceId && remoteDeviceId === deviceId) return;

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
