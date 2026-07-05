import { ReconditioningModule, type ReconditioningTab } from "@/components/behar/reconditioning-module";

const TABS: ReconditioningTab[] = ["overview", "devices", "workshop", "intake", "settings"];

export default async function ReconditionnementPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ tab?: string; device?: string }> }>) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as ReconditioningTab) ? (params.tab as ReconditioningTab) : "overview";
  return <ReconditioningModule initialDeviceId={params.device ?? null} initialTab={params.device ? "devices" : tab} />;
}
