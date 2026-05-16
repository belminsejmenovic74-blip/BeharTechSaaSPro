"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { checkCloudFresher, restoreFromLicense, setupAutoSync } from "@/lib/cloud-sync";

const DISMISSED_KEY = "behar-cloud-fresher-dismissed-at";

/**
 * Démarre l'auto-sync Supabase au montage + check si le cloud a des données
 * plus récentes (cas où un autre poste a modifié pendant que celui-ci était hors-ligne).
 *
 * Protection anti-boucle : on mémorise le timestamp cloud déjà notifié pour ne
 * pas réafficher le même toast à chaque check / refresh.
 */
export function AutoSyncProvider() {
  useEffect(() => {
    setupAutoSync();

    let cancelled = false;

    // Check après 2 sec (laisse l'app se charger d'abord)
    const t = setTimeout(async () => {
      const fresher = await checkCloudFresher();
      if (cancelled || !fresher) return;

      // Anti-boucle : si on a déjà notifié ce timestamp, on ne réaffiche pas.
      let dismissedAt: string | null = null;
      try {
        dismissedAt = window.sessionStorage.getItem(DISMISSED_KEY);
      } catch {
        dismissedAt = null;
      }
      if (dismissedAt === fresher.cloudUpdatedAt) return;

      const dateStr = new Date(fresher.cloudUpdatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      toast(
        "Données plus récentes disponibles",
        {
          description: `Un autre poste a modifié les données (${dateStr}). Actualiser ?`,
          duration: 12_000,
          onDismiss: () => {
            try { window.sessionStorage.setItem(DISMISSED_KEY, fresher.cloudUpdatedAt); } catch {}
          },
          onAutoClose: () => {
            try { window.sessionStorage.setItem(DISMISSED_KEY, fresher.cloudUpdatedAt); } catch {}
          },
          action: {
            label: "Actualiser",
            onClick: async () => {
              try { window.sessionStorage.setItem(DISMISSED_KEY, fresher.cloudUpdatedAt); } catch {}
              const raw = window.localStorage.getItem("behar-tech-local-demo-v3");
              const license = raw ? JSON.parse(raw)?.state?.licenseKey : undefined;
              if (!license) return;
              const result = await restoreFromLicense(license);
              if (!result.ok) {
                toast.error(
                  result.error === "not_found"
                    ? (result.details || "Aucun snapshot cloud à restaurer.")
                    : "Restauration cloud impossible.",
                );
              }
            },
          },
        },
      );
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return null;
}
