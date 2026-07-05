import { Suspense } from "react";

import { PublicCertificateScreen } from "@/components/behar/public-certificate-view";

export function generateStaticParams() {
  return [{ token: "_" }];
}

export default function PublicReconditionedDevicePage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#FAFAF8]" />}>
      <PublicCertificateScreen />
    </Suspense>
  );
}
