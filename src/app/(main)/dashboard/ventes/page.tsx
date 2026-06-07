import { PageShell } from "@/components/behar/page-shell";
import { SalesWorkspace } from "@/components/behar/sales-workspace";

export default function SalesPage() {
  return (
    <PageShell title="Ventes accessoires" subtitle="Ventes hors flux dossier, conservées en gestion stock." fitScreen>
      <SalesWorkspace />
    </PageShell>
  );
}
