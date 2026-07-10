import { PageShell } from "@/components/behar/page-shell";
import { StockItemDetailWorkspace } from "@/components/behar/stock-workspace";

export function generateStaticParams() {
  return [{ pieceId: "_" }];
}

export default async function StockItemPage({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  return (
    <PageShell title="Fiche pièce" subtitle="Détail complet de la pièce et de son stock.">
      <StockItemDetailWorkspace pieceId={pieceId} />
    </PageShell>
  );
}
