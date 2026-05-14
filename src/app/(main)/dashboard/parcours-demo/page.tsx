import { DemoWorkflow } from "@/components/behar/demo-workflow";
import { PageShell } from "@/components/behar/page-shell";

export default function DemoWorkflowPage() {
  return (
    <PageShell searchPlaceholder="Rechercher dans la démo..." title="Parcours démo">
      <DemoWorkflow />
    </PageShell>
  );
}
