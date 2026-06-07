import { NextResponse } from "next/server";

import { publicError, respondToPublicQuote } from "@/lib/server/public-api";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const result = await respondToPublicQuote(token, "refused");
    return result ? NextResponse.json(result) : publicError();
  } catch (error) {
    return publicError(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}
