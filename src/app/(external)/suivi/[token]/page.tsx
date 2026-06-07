import { Suspense } from "react";

import { PrintProvider } from "@/components/behar/print-provider";
import { PublicTrackingView } from "@/components/behar/public-tracking-view";

export function generateStaticParams() {
  return [{ token: "_" }];
}

export default async function SuiviTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense fallback={null}>
      {/* PrintProvider : sur le poste atelier (store local), ouvrir le suivi auto-publie les PDF documents. */}
      <PrintProvider>
        <PublicTrackingView token={token} />
      </PrintProvider>
    </Suspense>
  );
}
