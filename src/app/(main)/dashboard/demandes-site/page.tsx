import { PageShell } from "@/components/behar/page-shell";
import { WidgetLeadsWorkspace } from "@/components/behar/widget-leads-workspace";

export default function WebsiteRequestsPage() {
  return (
    <PageShell title="Demandes du site" subtitle="Prix, devis, rappels et demandes reçus depuis votre widget.">
      <WidgetLeadsWorkspace />
    </PageShell>
  );
}
