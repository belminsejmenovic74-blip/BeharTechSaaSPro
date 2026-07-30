"use client";

import { WifiOff } from "lucide-react";

import { refreshCapabilities, useCapabilities } from "@/lib/use-capabilities";

/**
 * Signale une vérification de capacités impossible.
 *
 * L'application est local-first : une boutique hors ligne est un cas quotidien.
 * Le repli est volontairement fail-closed, mais il était muet — un atelier
 * légitimement immatriculé voyait sa facturation disparaître sans explication.
 * Le bandeau n'apparaît jamais pour un compte réellement sans facturation :
 * dans ce cas, rien n'est temporairement indisponible.
 */
export function CapabilityOfflineBanner() {
  const capabilities = useCapabilities();
  if (!capabilities.unverified) return null;

  return (
    <div className="mx-4 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] border border-[#E4E7EC] bg-white px-4 py-3 md:mx-6">
      <WifiOff className="size-4 shrink-0 text-[#667085]" />
      <p className="text-[#101828] text-sm">
        Connexion indisponible. La facturation et les documents commerciaux sont temporairement inaccessibles.
      </p>
      <button
        className="ml-auto font-semibold text-[#2A9D8F] text-sm underline-offset-2 hover:underline"
        onClick={() => void refreshCapabilities()}
        type="button"
      >
        Réessayer
      </button>
    </div>
  );
}
