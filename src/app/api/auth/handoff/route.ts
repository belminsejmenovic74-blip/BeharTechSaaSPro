import { NextResponse } from "next/server";
import { z } from "zod";

import { APP_SESSION_COOKIE, createAppSession } from "@/lib/auth/app-session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const bodySchema = z.object({ code: z.string().regex(/^[a-f0-9]{64}$/i) });

type Handoff = {
  user_id: string;
  workshop_id: string;
  license_id: string;
  license_key: string;
  plan: string;
  status: string;
};

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Code de connexion invalide." }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Authentification indisponible." }, { status: 503 });

  const { data, error } = await admin.rpc("redeem_workshop_handoff_v2", { p_code: body.data.code });
  const handoff = data as Handoff | null;
  if (error || !handoff?.user_id || !handoff.workshop_id || !handoff.license_key) {
    return NextResponse.json({ error: "Ce lien de connexion est expire ou deja utilise." }, { status: 401 });
  }

  const { data: member } = await admin
    .from("organization_members")
    .select("role, status")
    .eq("user_id", handoff.user_id)
    .eq("workshop_id", handoff.workshop_id)
    .maybeSingle();
  if (member?.status !== "active") return NextResponse.json({ error: "Acces entreprise refuse." }, { status: 403 });

  const response = NextResponse.json({
    licenseKey: handoff.license_key,
    plan: handoff.plan,
    status: handoff.status,
    workshopId: handoff.workshop_id,
    role: member.role,
  });
  response.cookies.set(
    APP_SESSION_COOKIE,
    createAppSession({
      userId: handoff.user_id,
      workshopId: handoff.workshop_id,
      licenseId: handoff.license_id,
      role: member.role,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  );
  response.headers.set("cache-control", "no-store");
  return response;
}
