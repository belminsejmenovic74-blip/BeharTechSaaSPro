import type { ReactNode } from "react";

import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { CapabilityOfflineBanner } from "@/components/behar/capability-offline-banner";
import { DashboardSidebar } from "@/components/behar/dashboard-sidebar";
import { InstallationGate } from "@/components/behar/installation-gate";
import { MobileTopbar } from "@/components/behar/mobile-topbar";
import { ModeAccessGuard } from "@/components/behar/mode-access-guard";
import { PermissionRouteGuard } from "@/components/behar/permission-route-guard";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";
import { Topbar } from "@/components/behar/topbar";
import { WidgetLeadNotificationsProvider } from "@/components/behar/widget-lead-notifications-provider";
import { WidgetAppointmentsProvider } from "@/components/behar/widget-appointments-provider";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="behar-app min-h-svh bg-white text-[#101828]">
      <PrintProvider>
        <InstallationGate>
          <PinLoginGate>
            <AutoSyncProvider />
            <WidgetAppointmentsProvider />
            <WidgetLeadNotificationsProvider />
            <ModeAccessGuard permission="canViewDashboard" label="Dashboard">
              <DashboardSidebar />
              <div className="flex min-h-svh flex-col md:pl-[var(--behar-sidebar-width,232px)]">
                <div className="hidden md:block">
                  <Topbar />
                </div>
                <MobileTopbar />
                <CapabilityOfflineBanner />
                <main className="flex-1">
                  <PermissionRouteGuard>{children}</PermissionRouteGuard>
                </main>
              </div>
            </ModeAccessGuard>
          </PinLoginGate>
        </InstallationGate>
      </PrintProvider>
    </div>
  );
}
