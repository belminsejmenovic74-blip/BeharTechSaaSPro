"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Lock, Shield, Zap, Layers, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useBeharStore } from "@/lib/behar-store";
import { ensureCloudStateForLicense, normalizeLicenseKey } from "@/lib/workshop-sync";
import { cn } from "@/lib/utils";

export function LicenseActivation() {
  const activateLicense = useBeharStore((s) => s.activateLicense);
  const [key, setKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    setError("");
    if (!key.trim()) {
      setError("Veuillez saisir votre clé de licence.");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    const normalizedKey = normalizeLicenseKey(key);
    const result = activateLicense(normalizedKey);

    if (!result) {
      setError("Clé invalide. Vérifiez votre licence.");
      toast.error("Clé invalide.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await ensureCloudStateForLicense(normalizedKey);
      if (result === "loaded") {
        toast.success("Atelier cloud chargé.");
      } else if (result === "created") {
        toast.success("Licence activée. Atelier cloud créé.");
      } else {
        toast.warning("Licence activée hors ligne. Les données seront sauvegardées au retour du réseau.");
      }
    } catch (error: any) {
      setError(error?.message || "Impossible de charger l'atelier cloud.");
      toast.error("Chargement cloud impossible.");
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#F3F2EE] p-4 md:p-8">
      <div className="flex w-full max-w-[1060px] overflow-hidden rounded-[28px] bg-white shadow-[0_1px_3px_rgba(26,25,22,0.04),0_20px_60px_rgba(26,25,22,0.08)] animate-in fade-in zoom-in-95 duration-700">
        
        {/* Left Panel — Marketing / Welcome */}
        <div className="hidden md:flex md:w-[480px] flex-col justify-between bg-[#FAFAF8] p-10 lg:p-12 border-r border-[#F1F1EF]">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-1.5 mb-10">
              <span className="text-[18px] font-bold tracking-[-0.02em] text-[#1A1916]">BEHAR</span>
              <span className="text-[8px] text-[#1A1916]">●</span>
              <span className="text-[18px] font-bold tracking-[-0.02em] text-[#1A1916]">TECH</span>
            </div>

            <h1 className="text-[32px] font-semibold text-[#1A1916] leading-[1.15] tracking-tight">
              Bienvenue sur{" "}
              <br />
              Behar Tech <span className="text-[#2A9D8F]">Pro</span>
            </h1>
            <p className="mt-4 text-[#8A8984] text-[15px] leading-relaxed max-w-[340px]">
              Le logiciel tout-en-un pour réparateurs.
              Réparations, devis, factures, stock, rendez-vous
              et bien plus encore.
            </p>
          </div>

          {/* Dashboard preview placeholder */}
          <div className="my-8 relative">
            <div className="rounded-[20px] bg-white border border-[#E7E4DC] shadow-[0_8px_32px_rgba(26,25,22,0.06)] p-5 space-y-4">
              {/* Mini dashboard mockup */}
              <div className="flex items-center gap-2 mb-3">
                <div className="size-6 rounded-[8px] bg-[#1A1916] flex items-center justify-center">
                  <span className="text-white text-[7px] font-bold">BT</span>
                </div>
                <span className="text-[11px] font-semibold text-[#1A1916]">Tableau de bord</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[12px] bg-[#FAFAF8] border border-[#F1F1EF] p-3">
                  <p className="text-[9px] text-[#8A8984]">Réparations</p>
                  <p className="text-[18px] font-semibold text-[#1A1916] mt-0.5">12</p>
                </div>
                <div className="rounded-[12px] bg-[#FAFAF8] border border-[#F1F1EF] p-3">
                  <p className="text-[9px] text-[#8A8984]">Devis en attente</p>
                  <p className="text-[18px] font-semibold text-[#1A1916] mt-0.5">7</p>
                </div>
                <div className="rounded-[12px] bg-[#FAFAF8] border border-[#F1F1EF] p-3">
                  <p className="text-[9px] text-[#8A8984]">Factures</p>
                  <p className="text-[18px] font-semibold text-[#1A1916] mt-0.5">3</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[9px] text-[#8A8984]">Chiffre d'affaires</p>
                  <p className="text-[15px] font-semibold text-[#1A1916]">12 540,00 €</p>
                </div>
                <span className="text-[11px] font-medium text-[#2A9D8F]">+15%</span>
              </div>
            </div>
          </div>

          {/* Trust features */}
          <div className="flex items-start gap-6">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-[#E7F5F1] flex items-center justify-center">
                <Shield className="size-3.5 text-[#2A9D8F]" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#1A1916]">Sécurisé</p>
                <p className="text-[10px] text-[#B0AEA8] leading-tight">Données locales</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-[#E7F5F1] flex items-center justify-center">
                <Zap className="size-3.5 text-[#2A9D8F]" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#1A1916]">Rapide</p>
                <p className="text-[10px] text-[#B0AEA8] leading-tight">Conçu pour vous</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-[#E7F5F1] flex items-center justify-center">
                <Layers className="size-3.5 text-[#2A9D8F]" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#1A1916]">Complet</p>
                <p className="text-[10px] text-[#B0AEA8] leading-tight">Tout-en-un</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Activation Form */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 md:px-12 lg:px-16">
          {/* Lock icon */}
          <div className="size-16 rounded-full bg-[#E7F5F1] flex items-center justify-center mb-8">
            <Lock className="size-7 text-[#2A9D8F]" />
          </div>

          <h2 className="text-[24px] font-semibold text-[#1A1916] tracking-tight text-center">
            Activer Behar Tech <span className="text-[#2A9D8F]">Pro</span>
          </h2>
          <p className="mt-2.5 text-[#8A8984] text-[14px] text-center leading-relaxed max-w-[320px]">
            Entrez la clé de licence fournie avec votre accès pilote pour activer votre application.
          </p>

          <div className="mt-10 w-full max-w-[380px] space-y-5">
            {/* License key field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1916] px-0.5">Clé de licence</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex : BT-PILOT-001"
                  className={cn(
                    "h-[50px] w-full rounded-[14px] border bg-white px-4 pr-12 text-[#1A1916] text-[15px] outline-none transition-all duration-200",
                    "placeholder:text-[#CDCBC5]",
                    "focus:ring-4 focus:ring-[#2A9D8F]/8",
                    error 
                      ? "border-[#DC3545]/40 focus:border-[#DC3545]" 
                      : success 
                        ? "border-[#2A9D8F]/40 bg-[#F8FCFA]" 
                        : "border-[#E7E4DC] hover:border-[#D1CFCA] focus:border-[#2A9D8F]"
                  )}
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                  disabled={isLoading || success}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#CDCBC5]">
                  <Lock className="size-4" />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertCircle className="size-3.5 text-[#DC3545]" />
                  <p className="text-[#DC3545] text-[13px]">{error}</p>
                </div>
              )}
              {/* Success */}
              {success && (
                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <CheckCircle2 className="size-3.5 text-[#2A9D8F]" />
                  <p className="text-[#2A9D8F] text-[13px] font-medium">Licence activée avec succès</p>
                </div>
              )}
            </div>

            {/* Primary button */}
            <button
              className={cn(
                "w-full h-[50px] rounded-[14px] text-[15px] font-semibold transition-all duration-300 outline-none flex items-center justify-center gap-2.5",
                "focus-visible:ring-4 focus-visible:ring-[#2A9D8F]/15",
                success 
                  ? "bg-[#2A9D8F] text-white cursor-default" 
                  : "bg-[#2A9D8F] text-white hover:bg-[#238579] active:scale-[0.99] shadow-[0_1px_2px_rgba(42,157,143,0.15),0_6px_16px_rgba(42,157,143,0.18)]",
                (isLoading || success) && "pointer-events-none"
              )}
              onClick={handleActivate}
              disabled={isLoading || success}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="size-[18px] animate-spin" /> Activation en cours…
                </>
              ) : success ? (
                <>
                  Continuer <ArrowRight className="size-[18px]" />
                </>
              ) : (
                <>
                  <Lock className="size-[16px]" /> Activer
                </>
              )}
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#F1F1EF]" />
              <span className="text-[#CDCBC5] text-[12px]">ou</span>
              <div className="flex-1 h-px bg-[#F1F1EF]" />
            </div>

            {/* Help box */}
            <div className="flex items-start gap-3 rounded-[14px] border border-[#F1F1EF] bg-[#FAFAF8] px-4 py-4">
              <div className="size-6 rounded-full bg-[#E7F5F1] flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="size-3.5 text-[#2A9D8F]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#1A1916]">Vous n'avez pas encore de clé ?</p>
                <p className="mt-0.5 text-[12px] text-[#8A8984] leading-relaxed">
                  Contactez Behar Tech pour obtenir votre accès pilote.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-[#CDCBC5] text-[11px]">
              Behar Tech Pro – Tous droits réservés.
            </p>
            <p className="text-[#CDCBC5] text-[11px]">
              Version pilote
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
