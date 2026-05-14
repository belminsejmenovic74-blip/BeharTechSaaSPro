import { PageShell } from "@/components/behar/page-shell";
import { SalesWorkspace } from "@/components/behar/sales-workspace";

export default function SalesPage() {
  return (
    <PageShell
      title="Ventes"
      subtitle="Encaissez accessoires, produits et ventes comptoir."
    >
      <SalesWorkspace />
    </PageShell>
  );
}
