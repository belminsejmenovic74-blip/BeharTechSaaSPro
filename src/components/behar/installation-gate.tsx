"use client";

import { useEffect, useRef, useState } from "react";

import { LicenseActivation } from "@/components/behar/license-activation";
import { OnboardingWizard } from "@/components/behar/onboarding-wizard";
import { useBeharStore } from "@/lib/behar-store";
import { ensureCloudStateForLicense, normalizeLicenseKey } from "@/lib/workshop-sync";

type AppEntryState = "loading_local" | "license" | "loading_cloud" | "dashboard" | "onboarding";

function getAppEntryState({
  hasHydrated,
  hydrationTimedOut,
  licenseActivated,
  isAutomatedBrowser,
  cloudLoading,
  normalizedActiveKey,
  cloudCheckedKey,
  onboardingCompleted,
}: {
  hasHydrated: boolean;
  hydrationTimedOut: boolean;
  licenseActivated: boolean;
  isAutomatedBrowser: boolean;
  cloudLoading: boolean;
  normalizedActiveKey: string;
  cloudCheckedKey: string;
  onboardingCompleted: boolean;
}): AppEntryState {
  if (!hasHydrated && !hydrationTimedOut) return "loading_local";
  if (!licenseActivated) return "license";
  if (!isAutomatedBrowser && (cloudLoading || (normalizedActiveKey && cloudCheckedKey !== normalizedActiveKey))) {
    return "loading_cloud";
  }
  if (onboardingCompleted) return "dashboard";
  return "onboarding";
}

export function InstallationGate({ children }: { children: React.ReactNode }) {
  const hasHydrated = useBeharStore((s) => s._hasHydrated);
  const setHasHydrated = useBeharStore((s) => s.setHasHydrated);
  const licenseActivated = useBeharStore((s) => s.licenseActivated);
  const licenseKey = useBeharStore((s) => s.licenseKey);
  const onboardingCompleted = useBeharStore((s) => s.onboardingCompleted);
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
  });

  switch (entryState) {
    case "loading_local":
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#FAFAF8]">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 rounded-full border-2 border-[#E7E4DC] border-t-[#2A9D8F] animate-spin" />
            <p className="text-[#6B6B6B] text-sm">Chargement…</p>
          </div>
        </div>
      );
    case "license":
      return <LicenseActivation />;
    case "loading_cloud":
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#FAFAF8]">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 rounded-full border-2 border-[#E7E4DC] border-t-[#2A9D8F] animate-spin" />
            <p className="text-[#6B6B6B] text-sm">Chargement de l’atelier cloud…</p>
          </div>
        </div>
      );
    case "dashboard":
      return <>{children}</>;
    case "onboarding":
      return <OnboardingWizard />;
  }
}
