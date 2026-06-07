import { PublicPrintableDocumentPage } from "@/components/behar/public-printable-document-page";

export function generateStaticParams() {
  return [{ token: "_" }];
}

export default async function DocumentPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicPrintableDocumentPage token={token} />;
}
