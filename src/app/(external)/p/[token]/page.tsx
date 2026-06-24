import { Suspense } from "react";

import { PrintProvider } from "@/components/behar/print-provider";
import { PublicTrackingView } from "@/components/behar/public-tracking-view";

export function generateStaticParams() {
  return [{ token: "_" }];
}

export default async function PublicClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense fallback={null}>
      <PrintProvider>
        <PublicTrackingView token={token} />
      </PrintProvider>
    </Suspense>
  );
}
