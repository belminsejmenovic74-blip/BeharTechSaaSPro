"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/**
 * UpdateChecker — bouton "Vérifier les mises à jour" pour l'app desktop.
 *
 * Comportement :
 * - Sur web (Vercel / mobile / Mac+Safari), le composant détecte qu'il
 *   n'est pas dans Tauri et affiche un message neutre : la version web
 *   est toujours à jour (servie par Vercel/IONOS).
 * - Dans l'app Tauri (Mac/Windows installée), il utilise
 *   @tauri-apps/plugin-updater pour interroger le manifeste
 *   latest.json sur GitHub Releases, télécharger la nouvelle version,
 *   l'appliquer et relancer automatiquement l'app.
 *
 * Sécurité : l'updater vérifie la signature du payload contre la clé
 * publique configurée dans tauri.conf.json. Une mise à jour non signée
 * (ou signée par une clé étrangère) est refusée.
 */
export function UpdateChecker() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "downloading" | "up-to-date" | "available" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Detect si on tourne dans Tauri : window.__TAURI_INTERNALS__ existe.
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      setIsDesktop(true);
    }
  }, []);

  const check = async () => {
    setErrorMsg(null);
    setStatus("checking");
    try {
      // Import dynamique pour ne PAS embarquer le SDK Tauri dans le bundle web
      const updaterMod = await import("@tauri-apps/plugin-updater");
      const update = await updaterMod.check();
      if (!update) {
        setStatus("up-to-date");
        toast.success("Vous utilisez la dernière version.");
        return;
      }
      setLatestVersion(update.version);
      setStatus("available");
      toast.info(`Nouvelle version disponible : ${update.version}`);
    } catch (err: any) {
      console.error("[updater] check failed", err);
      setStatus("error");
      setErrorMsg(err?.message ?? String(err));
      toast.error("Vérification des mises à jour échouée.");
    }
  };

  const install = async () => {
    setStatus("downloading");
    setProgress(0);
    try {
      const updaterMod = await import("@tauri-apps/plugin-updater");
      const processMod = await import("@tauri-apps/plugin-process");
      const update = await updaterMod.check();
      if (!update) {
        setStatus("up-to-date");
        toast.success("Aucune mise à jour à appliquer.");
        return;
      }
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength ?? 0;
            if (total > 0) setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
            break;
          case "Finished":
            setProgress(100);
            break;
        }
      });
      toast.success("Mise à jour appliquée. Redémarrage…");
      // Petite pause pour que l'utilisateur voie le toast.
      setTimeout(() => {
        processMod.relaunch();
      }, 700);
    } catch (err: any) {
      console.error("[updater] install failed", err);
      setStatus("error");
      setErrorMsg(err?.message ?? String(err));
      toast.error("Installation de la mise à jour échouée.");
    }
  };

  // Cas web : pas d'updater, juste un message rassurant.
  if (!isDesktop) {
    return (
      <div className="rounded-[14px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-[#2A9D8F]">
            <CheckCircle2 className="size-[18px]" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#101828] text-[14px]">Version web à jour</p>
            <p className="mt-0.5 text-[#667085] text-[12.5px] leading-5">
              La version web (navigateur) se met à jour automatiquement à chaque ouverture. Aucune action manuelle
              requise.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Cas desktop (Tauri) : UI complète check / install.
  return (
    <div className="rounded-[14px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center text-[#2A9D8F]">
          <ShieldCheck className="size-[18px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#101828] text-[14px]">Mises à jour de l'application</p>
          <p className="mt-0.5 text-[#667085] text-[12.5px] leading-5">
            Vérifie si une nouvelle version de Behar Tech Pro est disponible. La mise à jour est téléchargée, signée et
            vérifiée avant d'être appliquée.
          </p>

          {status === "downloading" && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#FFFFFF]">
                <div className="h-full rounded-full bg-[#2A9D8F] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1.5 text-[#667085] text-[11.5px]">Téléchargement {progress}%…</p>
            </div>
          )}

          {status === "available" && latestVersion && (
            <p className="mt-2 text-[#167B70] text-[12.5px] font-medium">
              Nouvelle version {latestVersion} disponible.
            </p>
          )}

          {status === "up-to-date" && (
            <p className="mt-2 text-[#667085] text-[12.5px]">Vous êtes sur la dernière version.</p>
          )}

          {status === "error" && errorMsg && <p className="mt-2 text-[#B42318] text-[11.5px]">Erreur : {errorMsg}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={check}
              disabled={status === "checking" || status === "downloading"}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white px-3.5 text-[#101828] text-[13px] font-semibold transition active:scale-95 disabled:opacity-50"
            >
              {status === "checking" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" strokeWidth={2.2} />
              )}
              Vérifier les mises à jour
            </button>

            {status === "available" && (
              <button
                type="button"
                onClick={install}
                disabled={(status as string) === "downloading"}
                className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#2A9D8F] px-3.5 text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(42,157,143,0.18)] transition active:scale-95 disabled:opacity-50"
              >
                <Download className="size-4" strokeWidth={2.2} />
                Télécharger et installer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
