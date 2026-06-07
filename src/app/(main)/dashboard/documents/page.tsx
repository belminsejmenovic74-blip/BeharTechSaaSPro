import { DocumentPreview } from "@/components/behar/document-preview";
import { PageShell } from "@/components/behar/page-shell";

export default function DocumentsPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher un document..."
      title="Documents"
      subtitle="Tous les bons, devis, factures et justificatifs liés aux dossiers."
    >
      <DocumentPreview />
    </PageShell>
  );
}
