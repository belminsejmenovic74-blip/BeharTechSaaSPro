import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
    }

    const { fileName, contentType } = await request.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: "Nom de fichier ou type de contenu manquant" }, { status: 400 });
    }

    const path = `${Date.now()}-${fileName.replace(/[^a-z0-9.\-_]+/gi, "-")}`;
    
    // We create a signed upload URL that is valid for 1 hour
    // Wait, the correct method in Supabase-js is `createSignedUploadUrl(path)`
    const { data, error } = await admin.storage
      .from("help-center-media")
      .createSignedUploadUrl(path);

    if (error) {
      throw error;
    }

    // We also provide the public URL since the bucket is public
    const { data: publicUrlData } = admin.storage
      .from("help-center-media")
      .getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
