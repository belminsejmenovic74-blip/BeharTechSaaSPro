import { Suspense } from "react";

import { PageShell } from "@/components/behar/page-shell";
import { RepairsWorkspace } from "@/components/behar/repairs-workspace";

export default function RepairsPage() {
  return (
    <PageShell
      fitScreen
      searchPlaceholder="Rechercher une réparation, client, appareil..."
      title="Réparations"
      subtitle="Atelier Kanban · priorisez ce qui doit avancer ensuite."
    >
      <Suspense fallback={null}>
        <RepairsWorkspace />
      </Suspense>
    </PageShell>
  );
}
