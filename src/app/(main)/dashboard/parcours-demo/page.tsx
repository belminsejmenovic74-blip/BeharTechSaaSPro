import { DemoWorkflow } from "@/components/behar/demo-workflow";
import { PageShell } from "@/components/behar/page-shell";

export default function DemoWorkflowPage() {
  return (
    <PageShell searchPlaceholder="Rechercher dans le parcours..." title="Parcours guidé">
      <DemoWorkflow />
    </PageShell>
  );
}
