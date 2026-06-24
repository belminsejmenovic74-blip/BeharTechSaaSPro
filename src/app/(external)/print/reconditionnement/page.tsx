import { Suspense } from "react";

import { ReconditioningPrintPage } from "@/components/behar/reconditioning-print-page";

export default function PrintReconditionnementPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#FAFAF8]" />}>
      <ReconditioningPrintPage />
    </Suspense>
  );
}
