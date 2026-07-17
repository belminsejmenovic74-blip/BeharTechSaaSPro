"use client";

import { useEffect, useRef, useState } from "react";

import { LicenseActivation } from "@/components/behar/license-activation";
import { OnboardingWizard } from "@/components/behar/onboarding-wizard";
import { type WorkshopSettings, useBeharStore } from "@/lib/behar-store";
import { ensureCloudStateForLicense, normalizeLicenseKey } from "@/lib/workshop-sync";

type AppEntryState = "loading_local" | "license" | "loading_cloud" | "dashboard" | "onboarding";

export function isWorkshopConfigurationComplete(settings: WorkshopSettings): boolean {
  const phone = String(settings.phone || "").replace(/[\s().-]/g, "");
  const email = String(settings.email || "").trim();
  const postalCode = String(settings.postalCode || "").trim();
  const siret = String(settings.siret || "").replace(/\D/g, "");
  const identityIsComplete =
    String(settings.name || "").trim().length >= 3 &&
    /^\+\d{7,15}$/.test(phone) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) &&
    String(settings.address || "").trim().length >= 6 &&
    String(settings.city || "").trim().length >= 2;
  if (!identityIsComplete) return false;
  if (settings.country === "CH") return /^\d{4}$/.test(postalCode);
  return /^\d{5}$/.test(postalCode) && /^\d{14}$/.test(siret) && !/^0+$/.test(siret);
}

function getAppEntryState({
  hasHydrated,
  hydrationTimedOut,
  licenseActivated,
  isAutomatedBrowser,
  cloudLoading,
  normalizedActiveKey,
  cloudCheckedKey,
  onboardingCompleted,
  workshopConfigurationComplete,
}: {
  hasHydrated: boolean;
  hydrationTimedOut: boolean;
  licenseActivated: boolean;
  isAutomatedBrowser: boolean;
  cloudLoading: boolean;
  normalizedActiveKey: string;
  cloudCheckedKey: string;
  onboardingCompleted: boolean;
  workshopConfigurationComplete: boolean;
}): AppEntryState {
  if (!hasHydrated && !hydrationTimedOut) return "loading_local";
  if (!licenseActivated) return "license";
  // Atelier déjà configuré : on entre tout de suite et on laisse
  // AutoSyncProvider rafraîchir le cloud en arrière-plan. Sans ça, chaque
  // navigation entre le dashboard et le comptoir (layouts séparés → remount du
  // gate) ré-affichait le plein écran "Chargement de l'atelier cloud…" le temps
  // d'un nouvel aller-retour Supabase — d'où l'impression que le comptoir
  // "tourne en rond" juste après une modification.
  if (onboardingCompleted && workshopConfigurationComplete) return "dashboard";
  // Pas encore onboardé sur cet appareil : on attend le cloud pour savoir si la
  // licence possède déjà un atelier (évite de relancer l'onboarding à tort).
  if (!isAutomatedBrowser && (cloudLoading || (normalizedActiveKey && cloudCheckedKey !== normalizedActiveKey))) {
    return "loading_cloud";
  }
  return "onboarding";
}

export function InstallationGate({
  children,
  deferOnboarding = false,
}: {
  children: React.ReactNode;
  deferOnboarding?: boolean;
}) {
  const hasHydrated = useBeharStore((s) => s._hasHydrated);
  const setHasHydrated = useBeharStore((s) => s.setHasHydrated);
  const licenseActivated = useBeharStore((s) => s.licenseActivated);
  const licenseKey = useBeharStore((s) => s.licenseKey);
  const onboardingCompleted = useBeharStore((s) => s.onboardingCompleted);
  const workshopSettings = useBeharStore((s) => s.workshopSettings);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);
  const [cloudCheckedKey, setCloudCheckedKey] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);
  const cloudCheckInFlightKey = useRef("");
  const normalizedActiveKey = normalizeLicenseKey(licenseKey);
  const isAutomatedBrowser = typeof navigator !== "undefined" && navigator.webdriver;

  useEffect(() => {
    if (hasHydrated) return;

    const timer = window.setTimeout(() => {
      setHydrationTimedOut(true);
      setHasHydrated(true);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [hasHydrated, setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !licenseActivated || isAutomatedBrowser) return;
    const normalizedKey = normalizeLicenseKey(licenseKey);
    if (!normalizedKey || cloudCheckedKey === normalizedKey || cloudCheckInFlightKey.current === normalizedKey) return;

    let cancelled = false;
    cloudCheckInFlightKey.current = normalizedKey;
    setCloudLoading(true);
    ensureCloudStateForLicense(normalizedKey, false)
      .catch((error) => {
        console.error("[installation-gate] cloud bootstrap failed", error);
      })
      .finally(() => {
        if (cloudCheckInFlightKey.current === normalizedKey) {
          cloudCheckInFlightKey.current = "";
        }
        if (cancelled) return;
        setCloudCheckedKey(normalizedKey);
        setCloudLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cloudCheckedKey, hasHydrated, isAutomatedBrowser, licenseActivated, licenseKey]);

  const entryState = getAppEntryState({
    hasHydrated,
    hydrationTimedOut,
    licenseActivated,
    isAutomatedBrowser,
    cloudLoading,
    normalizedActiveKey,
    cloudCheckedKey,
    onboardingCompleted,
    workshopConfigurationComplete: isWorkshopConfigurationComplete(workshopSettings),
  });

  switch (entryState) {
    case "loading_local":
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 rounded-full border-2 border-[#E8E8E5] border-t-[#2A9D8F] animate-spin" />
            <p className="text-[#6B6B6B] text-sm">Chargement…</p>
          </div>
        </div>
      );
    case "license":
      return <LicenseActivation />;
    case "loading_cloud":
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 rounded-full border-2 border-[#E8E8E5] border-t-[#2A9D8F] animate-spin" />
            <p className="text-[#6B6B6B] text-sm">Chargement de l’atelier cloud…</p>
          </div>
        </div>
      );
    case "dashboard":
      return children;
    case "onboarding":
      return deferOnboarding ? children : <OnboardingWizard />;
  }
}
