"use client";

import { useEffect, useRef, useState } from "react";

import { Download, FileText, Phone, Printer, ShieldCheck } from "lucide-react";

import { useBeharStore } from "@/lib/behar-store";
import { generatePdfFromElement } from "@/lib/pdf-generator";
import { buildPublicCommercialDtoFromLocalState } from "@/lib/public-commercial-dto";
import type { PublicCommercialDocumentDto } from "@/lib/public-dtos";
import { getSupabase } from "@/lib/supabase/client";
import { formatMoney, getDocumentFilename } from "@/lib/workshop-country";

const COLORS = { bg: "#FFFFFF", text: "#1A1916", sub: "#6B6B6B", accent: "#2A9D8F", border: "#E8E8E5" };

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

// Lecture publique du document commercial (devis/facture/reçu/vente) depuis la
// table dénormalisée `public_tracking_documents`, alimentée côté client par
// syncPublicTrackingDocumentsToCloud. Clé anon, aucune API serveur requise.
async function readPublicCommercialDocument(
  kind: PublicCommercialDocumentDto["kind"],
  token: string,
): Promise<PublicCommercialDocumentDto | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("[public-document] Supabase client non configuré.");
    return null;
  }
  // On conserve les underscores : les tokens sont des ids d'entité (quote_…, sale_…).
  const safeToken = token.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeToken) return null;

  const { data, error } = await supabase
    .from("public_tracking_documents")
    .select("public_data")
    .eq("token", safeToken)
    .eq("kind", kind)
    .limit(1);

  if (error) {
    console.error("[public-document] Error fetching document:", error.message);
    return null;
  }
  if (!data || data.length === 0 || !data[0].public_data) return null;
  return data[0].public_data as PublicCommercialDocumentDto;
}

function title(kind: PublicCommercialDocumentDto["kind"]) {
  if (kind === "quote") return "Devis";
  if (kind === "invoice") return "Facture";
  if (kind === "receipt") return "Confirmation de règlement";
  return "Justificatif de vente";
}

export function PublicDocumentView({ kind, token }: { kind: PublicCommercialDocumentDto["kind"]; token: string }) {
  const [data, setData] = useState<PublicCommercialDocumentDto | null>(null);
  const [missing, setMissing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = (dto: PublicCommercialDocumentDto | null) => {
      if (cancelled) return;
      setData(dto);
      setMissing(!dto);
    };

    // En local (dev / démo sur le même appareil) on lit directement le store,
    // sans attendre la synchro cloud.
    if (isLocalhost()) {
      void (async () => {
        await (
          useBeharStore as typeof useBeharStore & { persist?: { rehydrate?: () => Promise<void> | void } }
        ).persist?.rehydrate?.();
        finish(buildPublicCommercialDtoFromLocalState(useBeharStore.getState(), kind, token));
      })();
      return () => {
        cancelled = true;
      };
    }

    readPublicCommercialDocument(kind, token)
      .then(finish)
      .catch(() => finish(null));

    return () => {
      cancelled = true;
    };
  }, [kind, token]);

  if (missing) {
    return (
      <div className="grid min-h-screen place-items-center px-6" style={{ background: COLORS.bg, color: COLORS.text }}>
        <div
          className="w-full max-w-md rounded-[18px] border bg-white p-8 text-center shadow-[0_1px_3px_rgba(26,25,22,0.04)]"
          style={{ borderColor: COLORS.border }}
        >
          <p className="font-bold text-lg">Lien introuvable</p>
          <p className="mt-2 text-sm" style={{ color: COLORS.sub }}>
            Ce lien n'est plus valide ou le document n'est pas public.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: COLORS.bg, color: COLORS.sub }}>
        Chargement...
      </div>
    );
  }

  const downloadPdf = async () => {
    if (!documentRef.current) return;
    const type = kind === "receipt" ? "payment" : kind === "sale" ? "sale-receipt" : kind;
    setDownloading(true);
    try {
      await generatePdfFromElement(documentRef.current, getDocumentFilename(type, data.document.number));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div className="print-document mx-auto w-full max-w-[680px] px-4 py-6">
        <div
          className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border bg-white p-3 shadow-[0_1px_3px_rgba(26,25,22,0.04)]"
          style={{ borderColor: COLORS.border }}
        >
          <div className="flex items-center gap-2">
            <FileText className="size-5" style={{ color: COLORS.accent }} />
            <div>
              <p className="font-bold text-[14px]">{title(kind)}</p>
              <p className="text-[12px]" style={{ color: COLORS.sub }}>
                {data.document.number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 font-semibold text-white"
              style={{ background: COLORS.accent }}
            >
              <Printer className="size-4" /> Imprimer
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void downloadPdf()}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border bg-white px-3 font-semibold text-[13px] disabled:opacity-50"
              style={{ borderColor: COLORS.border }}
            >
              <Download className="size-4" /> {downloading ? "PDF..." : "Télécharger PDF"}
            </button>
          </div>
        </div>

        <div ref={documentRef} className="print-document">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              {data.workshop.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                // biome-ignore lint/performance/noImgElement: standard image tag is fine for document logo
                <img
                  src={data.workshop.logoUrl}
                  alt={data.workshop.name}
                  className="h-9 w-auto max-w-[150px] rounded-md object-contain"
                />
              ) : (
                <span
                  className="grid size-9 place-items-center rounded-[10px] text-white"
                  style={{ background: COLORS.accent }}
                >
                  <ShieldCheck className="size-5" />
                </span>
              )}
              <div className="min-w-0">
                <span className="block truncate font-bold tracking-tight">{data.workshop.name}</span>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: COLORS.sub }}>
                  {[data.workshop.address, data.workshop.postalCode, data.workshop.city].filter(Boolean).join(" · ")}
                  {data.workshop.canton ? ` · Canton ${data.workshop.canton}` : ""}
                  {data.workshop.businessId
                    ? ` · ${data.workshop.country === "CH" ? "IDE / UID" : "SIRET"} ${data.workshop.businessId}`
                    : ""}
                </p>
              </div>
            </div>
            {data.workshop.phone ? (
              <a
                href={`tel:${data.workshop.phone}`}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border bg-white px-4 font-medium text-[14px]"
                style={{ borderColor: COLORS.border }}
              >
                <Phone className="size-4" style={{ color: COLORS.accent }} /> Appeler
              </a>
            ) : null}
          </header>

          <section
            className="print-document rounded-[16px] border bg-white p-5 shadow-[0_1px_3px_rgba(26,25,22,0.04)] print:rounded-none print:border-0 print:shadow-none"
            style={{ borderColor: COLORS.border }}
          >
            <p className="text-[13px] font-semibold" style={{ color: COLORS.accent }}>
              {title(kind)}
            </p>
            <div className="mt-1 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-bold text-[28px] leading-tight tracking-tight">{data.document.number}</h1>
                <p className="mt-1 text-[14px]" style={{ color: COLORS.sub }}>
                  {data.client.displayName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[24px]">{formatMoney(data.document.totalTtc, data.workshop.currency)}</p>
                <p className="text-[12px]" style={{ color: COLORS.sub }}>
                  {data.document.status}
                </p>
              </div>
            </div>
          </section>

          <section
            className="mt-4 overflow-hidden rounded-[16px] border bg-white shadow-[0_1px_3px_rgba(26,25,22,0.04)]"
            style={{ borderColor: COLORS.border }}
          >
            <div
              className="grid grid-cols-[1fr_72px_100px_100px] gap-3 border-b px-5 py-3 font-semibold text-[12px]"
              style={{ borderColor: COLORS.border, color: COLORS.sub }}
            >
              <span>Ligne</span>
              <span>Qté</span>
              <span>PU TTC</span>
              <span className="text-right">Total</span>
            </div>
            {data.lines.map((line, index) => (
              <div
                key={`${line.label}-${index}`}
                className="grid grid-cols-[1fr_72px_100px_100px] gap-3 px-5 py-3 text-[14px]"
              >
                <span className="min-w-0 truncate font-medium">{line.label}</span>
                <span>{line.quantity}</span>
                <span>{formatMoney(line.unitPriceTtc, data.workshop.currency)}</span>
                <span className="text-right font-semibold">{formatMoney(line.totalTtc, data.workshop.currency)}</span>
              </div>
            ))}
          </section>

          {data.relatedRepair ? (
            <section
              className="mt-4 rounded-[16px] border bg-white p-5 text-[14px] shadow-[0_1px_3px_rgba(26,25,22,0.04)]"
              style={{ borderColor: COLORS.border }}
            >
              <span style={{ color: COLORS.sub }}>Dossier lié : </span>
              {data.relatedRepair.url ? (
                <a href={data.relatedRepair.url} className="font-semibold" style={{ color: COLORS.accent }}>
                  {data.relatedRepair.number}
                </a>
              ) : (
                <span className="font-semibold">{data.relatedRepair.number}</span>
              )}
            </section>
          ) : null}

          {data.workshop.vatMention ? (
            <p
              className="mt-4 rounded-[12px] border bg-white p-3 text-[11px]"
              style={{ borderColor: COLORS.border, color: COLORS.sub }}
            >
              {data.workshop.vatMention}
            </p>
          ) : null}

          <footer className="mt-8 text-center text-[11px]" style={{ color: "#8A8A8A" }}>
            Document transmis par {data.workshop.name}
          </footer>
        </div>
      </div>
    </div>
  );
}
