import { PublicDocumentView } from "@/components/behar/public-document-view";

export function generateStaticParams() {
  return [{ token: "_" }];
}

export default async function FacturePublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicDocumentView kind="invoice" token={token} />;
}
