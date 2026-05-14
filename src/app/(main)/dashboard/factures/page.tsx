import { InvoicesWorkspace } from "@/components/behar/invoices-workspace";
import { PageShell } from "@/components/behar/page-shell";

export default function InvoicesPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher facture ou client..."
      title="Factures"
      subtitle="Non payée / payée, reste à encaisser, liens réparations."
    >
      <InvoicesWorkspace />
    </PageShell>
  );
}
