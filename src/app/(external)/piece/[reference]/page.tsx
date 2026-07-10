import { AutoSyncProvider } from "@/components/behar/auto-sync-provider";
import { InstallationGate } from "@/components/behar/installation-gate";
import { PinLoginGate } from "@/components/behar/pin-login-gate";
import { ScannedPartPage } from "@/components/behar/scanned-part-page";

export function generateStaticParams() {
  return [{ reference: "_" }];
}

export default async function PieceScannedPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const scanToken = decodeURIComponent(reference);
  return (
    <InstallationGate>
      <PinLoginGate>
        <AutoSyncProvider />
        <ScannedPartPage scanToken={scanToken} />
      </PinLoginGate>
    </InstallationGate>
  );
}
