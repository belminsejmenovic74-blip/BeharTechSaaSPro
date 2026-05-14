import { AppointmentsWorkspace } from "@/components/behar/appointments-workspace";
import { PageShell } from "@/components/behar/page-shell";

export default function AppointmentsPage() {
  return (
    <PageShell
      searchPlaceholder="Rechercher un rendez-vous..."
      title="Rendez-vous"
      subtitle="Planifiez et confirmez les rendez-vous atelier."
    >
      <AppointmentsWorkspace />
    </PageShell>
  );
}
