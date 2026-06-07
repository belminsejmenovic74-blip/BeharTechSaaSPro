import { PublicDocumentView } from "@/components/behar/public-document-view";

export function generateStaticParams() {
  return [{ token: "_" }];
}

export default async function DevisPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicDocumentView kind="quote" token={token} />;
}
