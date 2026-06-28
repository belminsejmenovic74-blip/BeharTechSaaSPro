import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-static";

export async function GET(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json([], { status: 200 });

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");
    const status = searchParams.get("status");
    const visibility = searchParams.get("visibility");

    let query = admin.from("help_contents").select("*").order("created_at", { ascending: false });

    if (audience) query = query.eq("audience", audience);
    if (status) query = query.eq("status", status);
    if (visibility) query = query.eq("visibility", visibility);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
    }

    const body = await request.json();
    const { data, error } = await admin
      .from("help_contents")
      .insert([body])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // unique violation
        return NextResponse.json({ error: "Ce slug est déjà utilisé." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
