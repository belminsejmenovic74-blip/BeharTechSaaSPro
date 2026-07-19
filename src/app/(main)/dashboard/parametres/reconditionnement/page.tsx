"use client";

import { useEffect, useState } from "react";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/behar/page-shell";
import { ReconditioningSettings } from "@/components/behar/reconditioning-settings";

export default function ReconditioningSettingsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <PageShell
      subtitle="Mode de calcul, marges, grades et blocages — ces réglages pilotent le prix de reprise proposé au comptoir."
      title="Paramètres reconditionnement"
    >
      <div className="mb-4">
        <Link
          className="inline-flex items-center gap-2 text-[#667085] text-sm transition hover:text-[#101828]"
          href="/dashboard/reconditionnement"
        >
          <ArrowLeft className="size-4" />
          Retour au reconditionnement
        </Link>
      </div>
      {mounted ? (
        <ReconditioningSettings />
      ) : (
        <div className="h-[480px] animate-pulse rounded-[20px] border border-[#E4E7EC] bg-white" />
      )}
    </PageShell>
  );
}
