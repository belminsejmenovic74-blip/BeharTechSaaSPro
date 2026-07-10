import { redirect } from "next/navigation";

export default async function StockItemShortcutPage({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  redirect(`/dashboard/stock/${encodeURIComponent(pieceId)}`);
}
