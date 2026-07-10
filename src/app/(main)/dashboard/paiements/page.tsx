import { PageShell } from "@/components/behar/page-shell";
import { PaymentsWorkspace } from "@/components/behar/payments-workspace";

export default function PaymentsPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher un paiement..."
      title="Paiements"
      subtitle="Règlements encaissés et restes à payer."
    >
      <PaymentsWorkspace />
    </PageShell>
  );
}
