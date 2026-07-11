import type { ReactNode } from "react";

import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { WidgetAppointmentsProvider } from "@/components/behar/widget-appointments-provider";
import { InstallationGate } from "@/components/behar/installation-gate";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";

export default function ComptoirLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PrintProvider>
      <InstallationGate>
        <PinLoginGate>
          <AutoSyncProvider />
          <WidgetAppointmentsProvider />
          {children}
        </PinLoginGate>
      </InstallationGate>
    </PrintProvider>
  );
}
