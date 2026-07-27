import { NextResponse } from "next/server";

import { isValidPublicRepairToken, PublicMessageError } from "@/lib/public-repair-message";
import { addPublicRepairMessage, getPublicRepair, publicError } from "@/lib/server/public-api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!isValidPublicRepairToken(token)) return publicError();
    const repair = await getPublicRepair(token);
    return repair ? NextResponse.json(repair) : publicError();
  } catch {
    return publicError("Service temporairement indisponible.", 503);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await addPublicRepairMessage(token, {
      body: String(body.body ?? ""),
      authorName: String(body.authorName ?? "Client"),
      clientMessageId: String(body.clientMessageId ?? ""),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicMessageError) return publicError(error.message, error.status);
    return publicError("Service temporairement indisponible.", 503);
  }
}
