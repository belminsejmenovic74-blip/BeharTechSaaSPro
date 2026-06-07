import { NextResponse } from "next/server";

import { addPublicRepairMessage, publicError } from "@/lib/server/public-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await addPublicRepairMessage(token, String(body.body ?? ""), String(body.authorName ?? "Client"));
    return result ? NextResponse.json(result) : publicError();
  } catch (error) {
    return publicError(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}
