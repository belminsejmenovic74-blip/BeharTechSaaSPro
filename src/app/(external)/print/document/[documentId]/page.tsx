import { LocalDocumentPrintPage } from "@/components/behar/local-document-print-page";

export function generateStaticParams() {
  return [{ documentId: "_" }];
}

export default async function PrintDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  // `public`/`print` sont lus côté client (useSearchParams) pour rester
  // compatible avec l'export statique (`output: export`).
  return <LocalDocumentPrintPage documentId={documentId} />;
}
