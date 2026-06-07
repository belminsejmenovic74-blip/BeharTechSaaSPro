import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "repair-documents";
const MAX_BYTES = 15 * 1024 * 1024; // 15 Mo

function safeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "document.pdf"
  );
}

/** Décode une data URL `data:application/pdf;base64,<...>` en buffer. */
function decodePdfDataUrl(dataUrl: string): Buffer | null {
  const match = /^data:application\/pdf(?:;[^,]*)?;base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

/**
 * Upload d'un PDF de document atelier vers Supabase Storage (bucket `repair-documents`).
 * Permet au client de télécharger le document depuis n'importe quel appareil (URL publique).
 * Best-effort : si Supabase n'est pas configuré, renvoie 503 et l'app garde le document en local.
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
    const documentId = String(body.documentId ?? "").trim();
    const fileName = safeName(String(body.fileName ?? "document.pdf"));
    const dataUrl = String(body.dataUrl ?? "");

    if (!documentId) return NextResponse.json({ error: "documentId manquant." }, { status: 400 });

    const buffer = decodePdfDataUrl(dataUrl);
    if (!buffer) return NextResponse.json({ error: "PDF invalide." }, { status: 400 });
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Document trop volumineux (max 15 Mo)." }, { status: 413 });
    }

    const folder = repairId || "divers";
    const path = `${folder}/${documentId}-${fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true, // un document peut être régénéré → on écrase
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
