import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "repair-photos";
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);

function safeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "photo"
  );
}

/** Décode une data URL `data:<mime>;base64,<...>` en buffer + mime. */
function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  try {
    return { buffer: Buffer.from(base64, "base64"), contentType };
  } catch {
    return null;
  }
}

/**
 * Upload d'une photo atelier vers Supabase Storage (bucket `repair-photos`).
 * Best-effort : si Supabase n'est pas configuré, on renvoie 503 et le client garde
 * la photo en local (data URL persistée dans le dossier). Aucune perte de données.
 */
export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Supabase Storage non configuré (mode local uniquement)." },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const repairId = String(body.repairId ?? "").trim();
    const fileName = safeName(String(body.fileName ?? "photo"));
    const dataUrl = String(body.dataUrl ?? "");

    if (!repairId) return NextResponse.json({ error: "repairId manquant." }, { status: 400 });

    const decoded = decodeDataUrl(dataUrl);
    if (!decoded) return NextResponse.json({ error: "Image invalide." }, { status: 400 });
    if (!ALLOWED_MIME.has(decoded.contentType)) {
      return NextResponse.json({ error: "Type d'image non autorisé." }, { status: 415 });
    }
    if (decoded.buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image trop volumineuse (max 10 Mo)." }, { status: 413 });
    }

    const path = `${repairId}/${Date.now()}-${fileName}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, decoded.buffer, {
      contentType: decoded.contentType,
      upsert: false,
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 502 });
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ storagePath: path, url: data.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
