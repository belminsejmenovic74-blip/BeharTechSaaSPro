import type { Metadata } from "next";

import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { AtelierModeWorkspace } from "@/components/behar/atelier-mode-workspace";
import { ModeAccessGuard } from "@/components/behar/mode-access-guard";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";
import { WidgetAppointmentsProvider } from "@/components/behar/widget-appointments-provider";
import { WidgetLeadNotificationsProvider } from "@/components/behar/widget-lead-notifications-provider";

export const metadata: Metadata = {
  title: "Behar Tech Pro - Atelier",
};

export default function AtelierPage() {
  return (
    <div className="behar-app min-h-svh bg-white text-[#101828]">
      <PinLoginGate>
        <PrintProvider>
          <ModeAccessGuard permission="canAccessWorkshopMode" label="mode Atelier">
            <AutoSyncProvider />
            <WidgetAppointmentsProvider />
            <WidgetLeadNotificationsProvider />
            <AtelierModeWorkspace />
          </ModeAccessGuard>
        </PrintProvider>
      </PinLoginGate>
    </div>
  );
}
