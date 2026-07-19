import type { ReactNode } from "react";

import { AccueilLicenseBridge } from "@/components/behar/accueil-license-bridge";
import { AccueilShell } from "@/components/behar/accueil-shell";
import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { InstallationGate } from "@/components/behar/installation-gate";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";
import { WidgetAppointmentsProvider } from "@/components/behar/widget-appointments-provider";
import { WidgetLeadNotificationsProvider } from "@/components/behar/widget-lead-notifications-provider";

export default function ClientLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="behar-app min-h-svh bg-white text-[#101828]">
      <PrintProvider>
        <AccueilLicenseBridge>
          <InstallationGate deferOnboarding>
            <PinLoginGate>
              <AutoSyncProvider />
              <WidgetAppointmentsProvider />
              <WidgetLeadNotificationsProvider />
              <AccueilShell>{children}</AccueilShell>
            </PinLoginGate>
          </InstallationGate>
        </AccueilLicenseBridge>
      </PrintProvider>
    </div>
  );
}
