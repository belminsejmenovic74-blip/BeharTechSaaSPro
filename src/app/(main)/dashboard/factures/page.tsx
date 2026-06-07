import { InvoicesWorkspace } from "@/components/behar/invoices-workspace";
import { PageShell } from "@/components/behar/page-shell";

export default function InvoicesPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher facture ou client..."
      title="Factures"
      subtitle="Statut de facture, règlements indiqués et liens dossiers."
    >
      <InvoicesWorkspace />
    </PageShell>
  );
}
