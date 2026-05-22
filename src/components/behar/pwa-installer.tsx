"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Panel, PrimaryButton } from "./primitives";

export function PwaInstaller() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if prompt was already captured globally
    if ((window as any).deferredInstallPrompt) {
      setInstallPrompt((window as any).deferredInstallPrompt);
    }

    const handlePromptAvailable = () => {
      setInstallPrompt((window as any).deferredInstallPrompt);
    };

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("pwa-prompt-available", handlePromptAvailable);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("Application installée.");
      setIsInstalled(true);
      setInstallPrompt(null);
    } else {
      toast.error("Installation annulée.");
    }
  };

  return (
    <Panel className="p-5 overflow-hidden relative">
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-xl bg-[#EAF6F2] flex items-center justify-center text-[#2A9D8F] shrink-0">
          {isInstalled ? <CheckCircle2 className="size-5" /> : <Monitor className="size-5" />}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-[#1A1916] text-lg">Installer l’application</h2>
          <p className="mt-1 text-[#6B6B6B] text-sm leading-relaxed">
            {isInstalled
              ? "Behar Tech est déjà installé sur ce PC."
              : "Installez Behar Tech sur ce PC pour l’ouvrir comme un logiciel."}
          </p>

          {!isInstalled && (
            <div className="mt-5 space-y-4">
              {installPrompt ? (
                <PrimaryButton onClick={handleInstall} className="w-full sm:w-auto">
                  Installer sur ce PC
                </PrimaryButton>
              ) : (
                <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#E7E4DC]">
                  <p className="text-[#1A1916] text-sm font-medium">Si le bouton n’apparaît pas :</p>
                  <p className="mt-1 text-[#6B6B6B] text-xs leading-relaxed">
                    Ouvrez Chrome ou Edge puis cliquez sur l’icône <strong>Installer</strong> dans la barre d’adresse.
                  </p>
                </div>
              )}

              <p className="text-[#B0AEA8] text-[11px] flex items-center gap-1.5">
                <Smartphone className="size-3" />
                Fonctionne avec Chrome ou Edge. Vos données restent sur cet ordinateur.
              </p>
            </div>
          )}

          {isInstalled && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF6F2] text-[#167B70] text-xs font-semibold">
              <CheckCircle2 className="size-3" />
              Application active
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
