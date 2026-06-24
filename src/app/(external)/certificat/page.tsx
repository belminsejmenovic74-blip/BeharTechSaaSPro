import { Suspense } from "react";

import { PublicCertificateScreen } from "@/components/behar/public-certificate-view";

export default function CertificatPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#FAFAF8]" />}>
      <PublicCertificateScreen />
    </Suspense>
  );
}
