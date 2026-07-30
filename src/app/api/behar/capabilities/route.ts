import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth/app-session";
import { getSessionCapabilityContext, getWorkshopCapabilityContext } from "@/lib/server/capabilities";
import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentAppSession();
  if (!session) return NextResponse.json({ error: "Session entreprise requise." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service cloud indisponible." }, { status: 503 });

  try {
    const context = await getSessionCapabilityContext(admin, session);
    return NextResponse.json(context, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Capacités indisponibles." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: { workshopId?: unknown; licenseKey?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const workshopId = typeof payload.workshopId === "string" ? payload.workshopId : "";
  const licenseKey = typeof payload.licenseKey === "string" ? payload.licenseKey : "";
  if (!workshopId || !licenseKey) return NextResponse.json({ error: "Identité atelier requise." }, { status: 400 });

  const auth = await authorizeWorkshopLicense(workshopId, licenseKey);
  if (auth instanceof Response) return auth;
  try {
    const context = await getWorkshopCapabilityContext(auth.admin, workshopId, auth.session?.licenseId);
    return NextResponse.json(context, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Capacités indisponibles." }, { status: 503 });
  }
}
