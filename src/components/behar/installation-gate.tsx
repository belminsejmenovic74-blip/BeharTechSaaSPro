"use client";

import { useEffect, useState } from "react";
import { OnboardingWizard } from "@/components/behar/onboarding-wizard";
import { LicenseActivation } from "@/components/behar/license-activation";
import { useBeharStore } from "@/lib/behar-store";

export function InstallationGate({ children }: { children: React.ReactNode }) {
  const hasHydrated = useBeharStore((s) => s._hasHydrated);
  const setHasHydrated = useBeharStore((s) => s.setHasHydrated);
  const licenseActivated = useBeharStore((s) => s.licenseActivated);
  const onboardingCompleted = useBeharStore((s) => s.onboardingCompleted);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  useEffect(() => {
    if (hasHydrated) return;

    const timer = window.setTimeout(() => {
      setHydrationTimedOut(true);
      setHasHydrated(true);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [hasHydrated, setHasHydrated]);

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

  if (onboardingCompleted) {
    return <>{children}</>;
  }

  return <OnboardingWizard />;
}
