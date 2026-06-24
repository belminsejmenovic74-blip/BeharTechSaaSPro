import { Suspense } from "react";

import { PhoneCaptureScreen } from "@/components/behar/phone-capture-view";

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#FAFAF8]" />}>
      <PhoneCaptureScreen />
    </Suspense>
  );
}
