"use client";

import { type ReactNode, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useBeharStore } from "@/lib/behar-store";
import {
  clearHandoffCodeFromUrl,
  readHandoffCode,
  readHandoffReturnTo,
  redeemWorkshopHandoff,
} from "@/lib/auth/session-bridge";

/**
 * Pont de session sur /accueil.
 *
 * Si l'utilisateur arrive depuis le site public avec un code de transfert
 * (?bthk=…) et qu'aucune licence n'est encore active localement, on échange le
 * code contre la clé de licence et on active la licence — l'utilisateur voit
 * alors le portail directement, sans ressaisir sa clé.
 *
 * En cas d'échec (code absent/expiré, RPC non déployée, licence non provisionnée),
 * on rend simplement les enfants : la garde d'installation existante reprend la
 * main et demande la clé, exactement comme aujourd'hui. Zéro régression.
 */
export function AccueilLicenseBridge({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const activateTrustedLicense = useBeharStore((s) => s.activateTrustedLicense);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    const code = readHandoffCode();
    const returnTo = readHandoffReturnTo();
    if (!code) return;

    let cancelled = false;
    setRedeeming(true);
    redeemWorkshopHandoff(code)
      .then((handoff) => {
        if (cancelled) return;
        if (handoff?.licenseKey) {
          activateTrustedLicense(handoff.licenseKey, handoff.plan, handoff.role);
          if (returnTo) router.replace(returnTo);
        }
      })
      .finally(() => {
        if (cancelled) return;
        clearHandoffCodeFromUrl();
        setRedeeming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activateTrustedLicense, router]);

  if (redeeming) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-2 border-[#E8E8E5] border-t-[#2A9D8F]" />
          <p className="text-[#6B6B6B] text-sm">Connexion à votre atelier…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
