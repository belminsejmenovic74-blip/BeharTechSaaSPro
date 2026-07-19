import type { ReactNode } from "react";

import { AccueilLicenseBridge } from "@/components/behar/accueil-license-bridge";
import { AccueilShell } from "@/components/behar/accueil-shell";
import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { InstallationGate } from "@/components/behar/installation-gate";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";
import { WidgetLeadNotificationsProvider } from "@/components/behar/widget-lead-notifications-provider";
import { WidgetAppointmentsProvider } from "@/components/behar/widget-appointments-provider";

// Espace Accueil = le pont site → SaaS. Espace À PART, avec sa propre sidebar
// réduite (4 modules), distinct du SaaS. Mêmes gardes d'auth (pont licence +
// installation + PIN) et providers de sync.
export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="behar-app min-h-svh bg-white text-[#1A1916]">
      <PrintProvider>
        <AccueilLicenseBridge>
          <InstallationGate>
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
