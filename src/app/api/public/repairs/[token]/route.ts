import { NextResponse } from "next/server";

import { getPublicRepair, publicError } from "@/lib/server/public-api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const dto = await getPublicRepair(token);
    return dto ? NextResponse.json(dto) : publicError();
  } catch (error) {
    return publicError(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}
