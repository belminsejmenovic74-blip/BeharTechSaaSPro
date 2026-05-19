import { Suspense } from "react";

import { PageShell } from "@/components/behar/page-shell";
import { RepairsWorkspace } from "@/components/behar/repairs-workspace";

export default function RepairsPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher une réparation, client, appareil..."
      title="Réparations"
      subtitle="Priorisez les dossiers à faire avancer."
    >
      <Suspense fallback={null}>
        <RepairsWorkspace />
      </Suspense>
    </PageShell>
  );
}
