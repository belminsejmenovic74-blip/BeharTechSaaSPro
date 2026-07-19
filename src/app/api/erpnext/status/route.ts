import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getErpNextClient, getErpNextSafeStatus } from "@/lib/server/erpnext";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.ADMIN_ACCESS_TOKEN?.trim();
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Accès refusé." }, { status: 401 });

  const status = getErpNextSafeStatus();
  const client = getErpNextClient();
  if (!client) return NextResponse.json({ ok: false, ...status }, { status: 503 });

  try {
    const user = await client.ping();
    return NextResponse.json({ ok: true, ...status, user });
  } catch {
    return NextResponse.json({ ok: false, ...status, error: "Connexion ERPNext impossible." }, { status: 502 });
  }
}
