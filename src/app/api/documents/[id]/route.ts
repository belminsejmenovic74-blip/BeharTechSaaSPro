import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function stableToken(prefix: string, seed: unknown): string {
  const bytes = createHash("sha256").update(`${prefix}:${String(seed)}`).digest();
  let out = "";
  for (let index = 0; index < 16; index += 1) out += TOKEN_ALPHABET[bytes[index] % TOKEN_ALPHABET.length];
  return `${prefix}_${out}`;
}

function pdfMode(request: Request): "download" | "inline" {
  const mode = new URL(request.url).searchParams.get("mode");
  return mode === "download" ? "download" : "inline";
}

function cleanFilename(value: string): string {
  const filename =
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "document";
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}

function contentDisposition(mode: "download" | "inline", filename: string): string {
  const disposition = mode === "download" ? "attachment" : "inline";
  return `${disposition}; filename="${filename}"`;
}

function filenameForDocument(document: { id: string; title?: string; document_number?: string; document_type?: string }) {
  const type = document.document_type;
  const number = document.document_number || document.title || document.id;
  if (type === "invoice") return cleanFilename(`facture-${number}`);
  if (type === "payment" || type === "payment_confirmation" || type === "payment_receipt") {
    return cleanFilename(`confirmation-reglement-${number}`);
  }
  if (type === "quote") return cleanFilename(`devis-${number}`);
  if (type === "repair_intake" || type === "intake") return cleanFilename(`bon-prise-en-charge-${number}`);
  return cleanFilename(number);
}

async function findDocument(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { document: null, error: "Supabase server non configuré." };

  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (uuidLike) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, document_number, document_type, file_url")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (data) return { document: data, error: null };
  }

  const tokenCandidates = [id, stableToken("dc", id)].filter((value, index, values) => values.indexOf(value) === index);
  for (const token of tokenCandidates) {
    if (!/^[a-z]{2}_[A-Z2-9]{8,}$/i.test(token)) continue;
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, document_number, document_type, file_url")
      .eq("public_token", token)
      .maybeSingle();
    if (error) throw error;
    if (data) return { document: data, error: null };
  }

  return { document: null, error: null };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId || "").replace(/\.pdf$/i, "").trim();
    if (!id) return NextResponse.json({ error: "document id manquant." }, { status: 400 });

    const { document, error } = await findDocument(id);
    if (error) return NextResponse.json({ error }, { status: 503 });
    if (!document?.file_url) {
      return NextResponse.json({ error: "PDF non publié pour ce document." }, { status: 404 });
    }

    const pdfResponse = await fetch(document.file_url, { cache: "no-store" });
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: "PDF source indisponible." }, { status: 502 });
    }
    const sourceContentType = pdfResponse.headers.get("content-type")?.toLowerCase() ?? "";
    if (sourceContentType && !sourceContentType.includes("application/pdf")) {
      return NextResponse.json({ error: "La source du document ne renvoie pas un PDF." }, { status: 502 });
    }

    const buffer = await pdfResponse.arrayBuffer();
    const filename = filenameForDocument(document);
    const mode = pdfMode(request);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(mode, filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
