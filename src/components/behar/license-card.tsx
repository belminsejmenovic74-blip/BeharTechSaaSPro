"use client";

import { Key, CheckCircle2, Trash2 } from "lucide-react";
import { Panel, SecondaryButton } from "./primitives";
import { useBeharStore } from "@/lib/behar-store";

export function LicenseCard() {
  const store = useBeharStore();
  const { licenseKey, licensePlan, licenseActivatedAt } = store;

  /**
   * Bouton nucléaire : on efface TOUT (licence + données locales) et on
   * recharge l'app. Garantit un retour propre à l'écran d'activation,
   * peu importe l'état React ou les effets en cours.
   *
   * Les données restent dans Supabase sous la clé actuelle — si tu
   * réactives la même clé après reset, tu récupères tout depuis le cloud.
   */
  const handleResetAll = () => {
    // eslint-disable-next-line no-console
    console.log("[license-card] reset complet demandé");

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
      // Reload complet — au prochain mount, plus aucune licence → écran
      // d'activation forcé par InstallationGate.
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
        <div className="size-10 rounded-xl bg-[#EAF6F2] flex items-center justify-center text-[#2A9D8F] shrink-0">
          <Key className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1916] text-lg">Licence</h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF6F2] text-[#167B70] text-[11px] font-bold uppercase tracking-wider">
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

          {/* Zone de remise à zéro — un seul bouton, action directe, reload garanti. */}
          <div className="mt-6 rounded-xl border border-[#F3D1CC] bg-[#FFF7F6] p-4">
            <h3 className="text-sm font-semibold text-[#1A1916]">Réinitialiser l'application</h3>
            <p className="mt-1 text-xs text-[#6B6B6B] leading-relaxed">
              Efface toutes les données locales (licence, réparations, clients, paramètres) et
              revient à l'écran d'activation. Tes données restent stockées en cloud sous la clé
              actuelle — réactive la même clé pour tout récupérer, ou entre une autre clé pour
              repartir de zéro.
            </p>
            <SecondaryButton
              className="mt-3 h-9 px-3 text-xs gap-1.5 text-[#E63946] border-[#F3D1CC] hover:bg-white"
              onClick={handleResetAll}
            >
              <Trash2 className="size-3" />
              Tout réinitialiser
            </SecondaryButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}
