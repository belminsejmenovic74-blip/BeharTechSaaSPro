import { Suspense } from "react";

import { PageShell } from "@/components/behar/page-shell";
import { RepairsWorkspace } from "@/components/behar/repairs-workspace";

export default function RepairsPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher un dossier, client, appareil..."
      title="Réparations"
      subtitle="Suivi des réparations en cours."
    >
      <Suspense fallback={null}>
        <RepairsWorkspace />
      </Suspense>
    </PageShell>
  );
}
