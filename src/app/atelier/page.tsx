import type { Metadata } from "next";

import { AtelierModeWorkspace } from "@/components/behar/atelier-mode-workspace";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { PrintProvider } from "@/components/behar/print-provider";

export const metadata: Metadata = {
  title: "Behar Tech Pro - Atelier",
};

export default function AtelierPage() {
  return (
    <PinLoginGate>
      <PrintProvider>
        <AtelierModeWorkspace />
      </PrintProvider>
    </PinLoginGate>
  );
}
