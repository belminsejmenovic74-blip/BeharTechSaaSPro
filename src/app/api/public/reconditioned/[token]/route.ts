import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase server non configuré." }, { status: 500 });

    const { data, error } = await supabase
      .from("reconditioning_public_certificates")
      .select("display_payload")
      .eq("public_token", token)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.display_payload) return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });

    return NextResponse.json(data.display_payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
