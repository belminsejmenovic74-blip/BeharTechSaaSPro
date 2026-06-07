import { Suspense } from "react";

import { PrintProvider } from "@/components/behar/print-provider";
import { PublicTrackingView } from "@/components/behar/public-tracking-view";

// Compatibilité anciens QR : /suivi?t=rp_XXXX.
// Les nouveaux liens utilisent /suivi/[token].
export default function SuiviPage() {
  return (
    <Suspense fallback={null}>
      <PrintProvider>
        <PublicTrackingView />
      </PrintProvider>
    </Suspense>
  );
}
