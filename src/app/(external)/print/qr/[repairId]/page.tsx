import { LocalRepairQrPrintPage } from "@/components/behar/local-repair-qr-print-page";

export function generateStaticParams() {
  return [{ repairId: "_" }];
}

export default async function PrintRepairQrPage({ params }: { params: Promise<{ repairId: string }> }) {
  const { repairId } = await params;
  return <LocalRepairQrPrintPage repairId={repairId} />;
}
