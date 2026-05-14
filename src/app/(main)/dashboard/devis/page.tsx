import { PageShell } from "@/components/behar/page-shell";
import { QuotesWorkspace } from "@/components/behar/quotes-workspace";

export default function QuotePage() {
  return (
    <PageShell searchPlaceholder="Rechercher..." title="Devis" subtitle="Créez, envoyez et acceptez vos devis client.">
      <QuotesWorkspace />
    </PageShell>
  );
}
