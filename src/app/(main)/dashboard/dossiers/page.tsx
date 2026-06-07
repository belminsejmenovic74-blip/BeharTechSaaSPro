import { DossiersWorkspace } from "@/components/behar/dossiers-workspace";
import { PageShell } from "@/components/behar/page-shell";

export default function DossiersPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher un dossier, client, appareil..."
      title="Réparations"
      subtitle="Suivi des réparations en cours."
    >
      <DossiersWorkspace />
    </PageShell>
  );
}
