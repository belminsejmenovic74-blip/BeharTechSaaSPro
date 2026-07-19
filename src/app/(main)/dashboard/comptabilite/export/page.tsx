import { AccountingExportWorkspace } from "@/components/behar/accounting-export-workspace";
import { PageShell } from "@/components/behar/page-shell";

export default function AccountingExportPage() {
  return (
    <PageShell title="Export des factures pour votre comptable">
      <AccountingExportWorkspace />
    </PageShell>
  );
}
