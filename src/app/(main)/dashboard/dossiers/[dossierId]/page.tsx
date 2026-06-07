import { DossierDetailWorkspace } from "@/components/behar/dossier-detail-workspace";
import { PageShell } from "@/components/behar/page-shell";

export function generateStaticParams() {
  return [{ dossierId: "_" }];
}

export default async function DossierDetailPage({ params }: { params: Promise<{ dossierId: string }> }) {
  const { dossierId } = await params;
  return (
    <PageShell
      searchPlaceholder="Rechercher dans les dossiers..."
      title="Dossier atelier"
      subtitle="Tout le dossier en un seul endroit."
    >
      <DossierDetailWorkspace dossierId={dossierId} />
    </PageShell>
  );
}
