"use client";

import { CheckCircle2, Key, RefreshCw, ShieldOff } from "lucide-react";

import { useBeharStore } from "@/lib/behar-store";

import { Panel, SecondaryButton } from "./primitives";

export function LicenseCard() {
  const store = useBeharStore();
  const { licenseKey, licensePlan, licenseActivatedAt, deactivateLicense } = store;

  /**
   * Désactiver la licence : désactive simplement la licence (licenseActivated = false),
   * et conserve l'atelier associé à la licence.
   */
  const handleDeactivate = () => {
    // eslint-disable-next-line no-console
    console.log("[license-card] désactivation de la licence demandée");
    deactivateLicense();
    if (typeof window !== "undefined") {
      setTimeout(() => window.location.reload(), 50);
    }
  };

  /**
   * Changer de clé : effectue un reset complet local (supprime localStorage behar-tech-local-demo-v3, etc.)
   * et recharge pour éviter toute pollution lors de l'activation d'une autre clé de licence.
   */
  const handleChangeKey = () => {
    // eslint-disable-next-line no-console
    console.log("[license-card] changement de clé demandé (reset local complet)");
    if (typeof window !== "undefined") {
      try {
        // Toutes les clés liées au workshop / aux préférences locales.
        window.localStorage.removeItem("behar-tech-local-demo-v3");
        window.localStorage.removeItem("behar-device-id");
        window.localStorage.removeItem("behar-cloud-fresher-dismissed-at");
        window.sessionStorage.clear();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[license-card] localStorage clear failed", error);
      }
      window.location.reload();
    }
  };

  const maskedKey = licenseKey
    ? `${licenseKey.slice(0, 8)}${"•".repeat(Math.max(0, licenseKey.length - 8))}`
    : "••••-••••-••••-••••";

  const formattedDate = licenseActivatedAt
    ? new Date(licenseActivatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "N/A";

  return (
    <Panel className="p-5">
      <div className="flex items-start gap-4">
        <div className="size-10 flex items-center justify-center text-[#2A9D8F] shrink-0">
          <Key className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#101828] text-lg">Licence</h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFFFFF] text-[#167B70] text-[11px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="size-3" />
              Active
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <InfoRow label="Statut" value="Active" />
            <InfoRow label="Plan" value={licensePlan || "Pilote"} />
            <InfoRow label="Clé" value={maskedKey} />
            <InfoRow label="Activée le" value={formattedDate} />
          </div>

          {/* Options de gestion de licence */}
          <div className="mt-6 pt-5 border-t border-[#FFFFFF] space-y-4">
            <div className="flex flex-wrap gap-2.5">
              <SecondaryButton
                className="h-10 px-4 text-xs font-semibold gap-2 border-[#E4E7EC] hover:border-[#2A9D8F] hover:text-[#2A9D8F] active:scale-[0.98] transition-all duration-200"
                onClick={handleChangeKey}
              >
                <RefreshCw className="size-3.5" />
                Changer de clé
              </SecondaryButton>
              <SecondaryButton
                className="h-10 px-4 text-xs font-semibold gap-2 text-[#E63946] border-[#F3D1CC] hover:bg-[#FFFFFF] active:scale-[0.98] transition-all duration-200"
                onClick={handleDeactivate}
              >
                <ShieldOff className="size-3.5" />
                Désactiver la licence
              </SecondaryButton>
            </div>

            <p className="text-[11px] text-[#667085] leading-relaxed">
              <strong>Changer de clé :</strong> Déconnecte complètement cet appareil pour pouvoir connecter un autre
              atelier sans risque de mélange.
              <br />
              <strong>Désactiver la licence :</strong> Déconnecte temporairement l'appareil. L'atelier reste associé à
              la licence pour une réactivation ultérieure.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-[#667085]">{label}</span>
      <span className="font-medium text-[#101828]">{value}</span>
    </div>
  );
}
