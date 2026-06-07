import { PageShell } from "@/components/behar/page-shell";
import { PaymentsWorkspace } from "@/components/behar/payments-workspace";

export default function PaymentsPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher un paiement..."
      title="Paiements"
      subtitle="Consultez les règlements indiqués sur les factures."
    >
      <PaymentsWorkspace />
    </PageShell>
  );
}
