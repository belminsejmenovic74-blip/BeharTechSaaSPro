"use client";

import { Key, CheckCircle2, ShieldOff, RefreshCw } from "lucide-react";
import { Panel, SecondaryButton } from "./primitives";
import { useBeharStore } from "@/lib/behar-store";

export function LicenseCard() {
  const store = useBeharStore();
  const { licenseKey, licensePlan, licenseActivatedAt, deactivateLicense } = store;

  // Action directe + reload complet. On évite tous les pièges :
  // - pas de confirm() natif (bloqué en WebView)
  // - pas de toast à action (peut être manqué)
  // - pas de dépendance au re-render React qui peut être bloqué par un effet
  //   de cloud-bootstrap encore en vol
  // Le reload garantit un état complètement propre.
  const handleDeactivate = () => {
    // eslint-disable-next-line no-console
    console.log("[license-card] désactivation demandée");
    deactivateLicense();
    if (typeof window !== "undefined") {
      // Petit délai pour que le set du store soit persisté en localStorage
      // avant le reload.
      setTimeout(() => window.location.reload(), 50);
    }
  };

  const handleChangeKey = () => {
    // eslint-disable-next-line no-console
    console.log("[license-card] changement de clé demandé");
    deactivateLicense();
    if (typeof window !== "undefined") {
      setTimeout(() => window.location.reload(), 50);
    }
  };

  const maskedKey = licenseKey 
    ? `${licenseKey.slice(0, 8)}${"•".repeat(licenseKey.length - 8)}`
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

          <div className="mt-6 flex flex-wrap gap-2">
            <SecondaryButton 
              className="h-9 px-3 text-xs gap-1.5"
              onClick={handleChangeKey}
            >
              <RefreshCw className="size-3" />
              Changer de clé
            </SecondaryButton>
            <SecondaryButton 
              className="h-9 px-3 text-xs gap-1.5 text-[#E63946] border-[#F3D1CC] hover:bg-[#FFF7F6]"
              onClick={handleDeactivate}
            >
              <ShieldOff className="size-3" />
              Désactiver
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
