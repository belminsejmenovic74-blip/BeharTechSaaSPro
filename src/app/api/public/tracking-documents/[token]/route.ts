import { NextResponse } from "next/server";

import type { PublicCommercialDocumentDto } from "@/lib/public-dtos";
import { getPublishedTrackingDocument, publicError } from "@/lib/server/public-api";

export const dynamic = "force-dynamic";

const allowedKinds = new Set<PublicCommercialDocumentDto["kind"]>(["quote", "invoice", "receipt", "sale", "intake"]);

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const kind = new URL(request.url).searchParams.get("kind") as PublicCommercialDocumentDto["kind"] | null;
    if (!kind || !allowedKinds.has(kind)) return publicError("Type de document invalide.", 400);
    const document = await getPublishedTrackingDocument(kind, token);
    return document
      ? NextResponse.json(document, { headers: { "cache-control": "public, max-age=0, must-revalidate" } })
      : publicError();
  } catch {
    return publicError("Service temporairement indisponible.", 503);
  }
}
