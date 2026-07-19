"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Download, Share, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/**
 * Bouton Installer universel.
 * - Chrome / Edge / Android : déclenche `beforeinstallprompt`.
 * - iOS Safari : affiche un mini-tutoriel (Partager → Sur l'écran d'accueil).
 * - Si déjà installé (display-mode standalone), le bouton se cache.
 */
export function InstallButton({ className }: Readonly<{ className?: string }>) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Détection installation
    const checkInstalled = () => {
      if (typeof window === "undefined") return;
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(Boolean(standalone));
    };
    checkInstalled();

    // Détection iOS (Safari)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const iOsDevice = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    setIsIos(iOsDevice);

    // Récupère un prompt déjà capté globalement (cf. layout.tsx)
    const globalPrompt = (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent })
      .deferredInstallPrompt;
    if (globalPrompt) setInstallPrompt(globalPrompt);

    const onPromptAvailable = () => {
      const p = (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt;
      if (p) setInstallPrompt(p);
    };
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success("Application installée.");
    };
    const onDisplayChange = () => checkInstalled();

    window.addEventListener("pwa-prompt-available", onPromptAvailable);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("pwa-prompt-available", onPromptAvailable);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mq?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          toast.success("Application installée.");
          setIsInstalled(true);
        }
      } catch {
        toast.error("Installation impossible.");
      } finally {
        setInstallPrompt(null);
        (window as unknown as { deferredInstallPrompt?: unknown }).deferredInstallPrompt = null;
      }
      return;
    }
    if (isIos) {
      setIosOpen(true);
      return;
    }
    // Fallback : explication brève
    toast.message("Ouvrez ce site dans Chrome / Edge puis cliquez sur l'icône Installer dans la barre d'adresse.");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#2A9D8F]/30 bg-[#FFFFFF] px-3 font-semibold text-[#147065] text-[12.5px] transition active:scale-95 hover:bg-[#FFFFFF]",
          className,
        )}
        aria-label="Installer l'application"
      >
        <Download className="size-3.5" strokeWidth={2.2} />
        <span className="hidden sm:inline">Installer</span>
      </button>

      {iosOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-[#101828]/40"
            onClick={() => setIosOpen(false)}
            aria-label="Fermer"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(16,24,40,0.18)]">
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1 w-9 rounded-full bg-[#FFFFFF]" aria-hidden />
            </div>
            <div className="flex items-start justify-between gap-3 px-6 pt-3 pb-4">
              <div>
                <p className="font-semibold text-[#101828] text-[22px] leading-tight tracking-tight">
                  Installer sur iPhone / iPad
                </p>
                <p className="mt-1.5 text-[#667085] text-[13px]">
                  Suivez ces étapes pour ajouter Behar Tech Pro à votre écran d'accueil.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIosOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-[#FFFFFF] text-[#667085] active:scale-90"
                aria-label="Fermer"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>
            <ol className="space-y-3 px-5 pb-6">
              <li className="flex items-start gap-3 rounded-[16px] bg-[#FFFFFF] p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2A9D8F] font-semibold text-white text-[14px]">
                  1
                </span>
                <div className="text-[#101828] text-[14px] leading-snug">
                  Ouvrez ce site dans <strong>Safari</strong> (pas dans une autre app).
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-[16px] bg-[#FFFFFF] p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2A9D8F] font-semibold text-white text-[14px]">
                  2
                </span>
                <div className="text-[#101828] text-[14px] leading-snug">
                  Touchez l'icône{" "}
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5">
                    <Share className="size-3.5 text-[#2A9D8F]" /> Partager
                  </span>{" "}
                  en bas de l'écran.
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-[16px] bg-[#FFFFFF] p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2A9D8F] font-semibold text-white text-[14px]">
                  3
                </span>
                <div className="text-[#101828] text-[14px] leading-snug">
                  Faites défiler puis touchez <strong>« Sur l'écran d'accueil »</strong>.
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-[16px] bg-[#FFFFFF] p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2A9D8F] font-semibold text-white text-[14px]">
                  4
                </span>
                <div className="text-[#101828] text-[14px] leading-snug">
                  Validez. L'icône <strong>Behar Tech</strong> apparaît sur votre écran d'accueil comme une vraie
                  application.
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-[16px] border border-[#FFFFFF] bg-[#FFFFFF] p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#2A9D8F]" />
                <div className="text-[#101828] text-[13px] leading-snug">
                  L'application fonctionne ensuite en plein écran avec sauvegarde cloud.
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
