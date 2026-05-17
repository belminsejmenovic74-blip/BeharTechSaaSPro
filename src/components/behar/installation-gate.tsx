"use client";

import { useEffect, useRef, useState } from "react";
import { OnboardingWizard } from "@/components/behar/onboarding-wizard";
import { LicenseActivation } from "@/components/behar/license-activation";
import { useBeharStore } from "@/lib/behar-store";
import { ensureCloudStateForLicense, normalizeLicenseKey } from "@/lib/workshop-sync";

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
    ensureCloudStateForLicense(normalizedKey)
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

  // Wait for the store to rehydrate from localStorage before making any routing decision.
  // Without this, the initial state (licenseActivated: false) would flash the license screen
  // for every user that already has a valid license saved.
  if (!hasHydrated && !hydrationTimedOut) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-full border-2 border-[#E7E4DC] border-t-[#2A9D8F] animate-spin" />
          <p className="text-[#6B6B6B] text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!licenseActivated) {
    return <LicenseActivation />;
  }

  if (!isAutomatedBrowser && (cloudLoading || (normalizedActiveKey && cloudCheckedKey !== normalizedActiveKey))) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-full border-2 border-[#E7E4DC] border-t-[#2A9D8F] animate-spin" />
          <p className="text-[#6B6B6B] text-sm">Chargement de l’atelier cloud…</p>
        </div>
      </div>
    );
  }

  if (onboardingCompleted) {
    return <>{children}</>;
  }

  return <OnboardingWizard />;
}
