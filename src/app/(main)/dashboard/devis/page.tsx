import { PageShell } from "@/components/behar/page-shell";
import { QuotesWorkspace } from "@/components/behar/quotes-workspace";

export default function QuotePage() {
  return (
    <PageShell searchPlaceholder="Rechercher..." title="Devis" subtitle="Des devis toujours liés à un dossier atelier.">
      <QuotesWorkspace />
    </PageShell>
  );
}
