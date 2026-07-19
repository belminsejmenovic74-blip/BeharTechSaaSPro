import type { ReactNode } from "react";

import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { WidgetAppointmentsProvider } from "@/components/behar/widget-appointments-provider";
import { WidgetLeadNotificationsProvider } from "@/components/behar/widget-lead-notifications-provider";
import { InstallationGate } from "@/components/behar/installation-gate";
import { ModeAccessGuard } from "@/components/behar/mode-access-guard";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";

export default function ComptoirLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="behar-app min-h-svh bg-white text-[#1A1916]">
      <PrintProvider>
        <InstallationGate>
          <PinLoginGate>
            <ModeAccessGuard permission="canAccessCounter" label="Comptoir">
              <AutoSyncProvider />
              <WidgetAppointmentsProvider />
              <WidgetLeadNotificationsProvider />
              {children}
            </ModeAccessGuard>
          </PinLoginGate>
        </InstallationGate>
      </PrintProvider>
    </div>
  );
}
