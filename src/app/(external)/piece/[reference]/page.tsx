import { ScannedPartPage } from "@/components/behar/scanned-part-page";

export function generateStaticParams() {
  return [{ reference: "_" }];
}

export default async function PieceScannedPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <ScannedPartPage reference={decodeURIComponent(reference)} />;
}
