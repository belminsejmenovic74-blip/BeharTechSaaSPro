import { Suspense } from "react";

import { PrintProvider } from "@/components/behar/print-provider";
import { PublicTrackingView } from "@/components/behar/public-tracking-view";

export function generateStaticParams() {
  return [{ slug: ["_"] }];
}

export default async function SuiviCatchAllPage() {
  return (
    <Suspense fallback={null}>
      <PrintProvider>
        <PublicTrackingView />
      </PrintProvider>
    </Suspense>
  );
}
