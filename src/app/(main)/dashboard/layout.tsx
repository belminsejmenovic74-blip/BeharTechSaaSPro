import type { ReactNode } from "react";

import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { DashboardSidebar } from "@/components/behar/dashboard-sidebar";
import { InstallationGate } from "@/components/behar/installation-gate";
import { MobileTopbar } from "@/components/behar/mobile-topbar";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";
import { Topbar } from "@/components/behar/topbar";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PrintProvider>
      <InstallationGate>
        <PinLoginGate>
          <AutoSyncProvider />
          <div className="behar-app min-h-svh bg-[#FFFFFF] text-[#1A1916]">
            <DashboardSidebar />
            <div className="flex min-h-svh flex-col md:pl-[230px]">
              <div className="hidden md:block">
                <Topbar />
              </div>
              <MobileTopbar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </PinLoginGate>
      </InstallationGate>
    </PrintProvider>
  );
}
