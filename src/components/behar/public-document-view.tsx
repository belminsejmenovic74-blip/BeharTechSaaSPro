"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Download, FileText, Phone, Printer, ShieldCheck, X } from "lucide-react";

import { generatePdfFromElement } from "@/lib/pdf-generator";
import type { PublicCommercialDocumentDto } from "@/lib/public-dtos";
import { formatMoney, getDocumentFilename } from "@/lib/workshop-country";

const COLORS = { bg: "#FFFFFF", text: "#1A1916", sub: "#6B6B6B", accent: "#2A9D8F", border: "#E8E8E5" };

function endpoint(kind: PublicCommercialDocumentDto["kind"], token: string) {
  const resource = kind === "quote" ? "quotes" : kind === "invoice" ? "invoices" : kind === "receipt" ? "receipts" : "sales";
  return `/api/public/${resource}/${encodeURIComponent(token)}`;
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
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(endpoint(kind, token), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((dto) => {
        setData(dto);
        setMissing(!dto);
      })
      .catch(() => setMissing(true));
  }, [kind, token]);

  const respond = async (decision: "accept" | "refuse") => {
    setBusy(true);
    const response = await fetch(`/api/public/quotes/${encodeURIComponent(token)}/${decision}`, { method: "POST" }).catch(() => null);
    if (response?.ok) {
      const fresh = await fetch(endpoint(kind, token), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
      if (fresh) setData(fresh);
    }
    setBusy(false);
  };

  if (missing) {
    return (
      <div className="grid min-h-screen place-items-center px-6" style={{ background: COLORS.bg, color: COLORS.text }}>
        <div className="w-full max-w-md rounded-[18px] border bg-white p-8 text-center shadow-[0_1px_3px_rgba(26,25,22,0.04)]" style={{ borderColor: COLORS.border }}>
          <p className="font-bold text-lg">Lien introuvable</p>
          <p className="mt-2 text-sm" style={{ color: COLORS.sub }}>Ce lien n'est plus valide ou le document n'est pas public.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="grid min-h-screen place-items-center" style={{ background: COLORS.bg, color: COLORS.sub }}>Chargement...</div>;
  }

  const canRespond = kind === "quote" && !["accepted", "refused", "invoiced"].includes(data.document.status);
  const downloadPdf = async () => {
    if (!documentRef.current) return;
    const type = kind === "receipt" ? "payment" : kind === "sale" ? "sale-receipt" : kind;
    setDownloading(true);
    try {
      await generatePdfFromElement(
        documentRef.current,
        getDocumentFilename(type, data.document.number),
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div className="print-document mx-auto w-full max-w-[680px] px-4 py-6">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border bg-white p-3 shadow-[0_1px_3px_rgba(26,25,22,0.04)]" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-2">
            <FileText className="size-5" style={{ color: COLORS.accent }} />
            <div>
              <p className="font-bold text-[14px]">{title(kind)}</p>
              <p className="text-[12px]" style={{ color: COLORS.sub }}>{data.document.number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 font-semibold text-white" style={{ background: COLORS.accent }}>
              <Printer className="size-4" /> Imprimer
            </button>
            <button type="button" disabled={downloading} onClick={() => void downloadPdf()} className="inline-flex h-10 items-center gap-2 rounded-[12px] border bg-white px-3 font-semibold text-[13px] disabled:opacity-50" style={{ borderColor: COLORS.border }}>
              <Download className="size-4" /> {downloading ? "PDF..." : "Télécharger PDF"}
            </button>
          </div>
        </div>

        <div ref={documentRef} className="print-document">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {data.workshop.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.workshop.logoUrl} alt={data.workshop.name} className="h-9 w-auto max-w-[150px] rounded-md object-contain" />
            ) : (
              <span className="grid size-9 place-items-center rounded-[10px] text-white" style={{ background: COLORS.accent }}><ShieldCheck className="size-5" /></span>
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
          {data.workshop.phone ? <a href={`tel:${data.workshop.phone}`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border bg-white px-4 font-medium text-[14px]" style={{ borderColor: COLORS.border }}><Phone className="size-4" style={{ color: COLORS.accent }} /> Appeler</a> : null}
        </header>

        <section className="print-document rounded-[16px] border bg-white p-5 shadow-[0_1px_3px_rgba(26,25,22,0.04)] print:rounded-none print:border-0 print:shadow-none" style={{ borderColor: COLORS.border }}>
          <p className="text-[13px] font-semibold" style={{ color: COLORS.accent }}>{title(kind)}</p>
          <div className="mt-1 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-bold text-[28px] leading-tight tracking-tight">{data.document.number}</h1>
              <p className="mt-1 text-[14px]" style={{ color: COLORS.sub }}>{data.client.displayName}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[24px]">{formatMoney(data.document.totalTtc, data.workshop.currency)}</p>
              <p className="text-[12px]" style={{ color: COLORS.sub }}>{data.document.status}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-[16px] border bg-white shadow-[0_1px_3px_rgba(26,25,22,0.04)]" style={{ borderColor: COLORS.border }}>
          <div className="grid grid-cols-[1fr_72px_100px_100px] gap-3 border-b px-5 py-3 font-semibold text-[12px]" style={{ borderColor: COLORS.border, color: COLORS.sub }}>
            <span>Ligne</span><span>Qté</span><span>PU TTC</span><span className="text-right">Total</span>
          </div>
          {data.lines.map((line, index) => (
            <div key={`${line.label}-${index}`} className="grid grid-cols-[1fr_72px_100px_100px] gap-3 px-5 py-3 text-[14px]">
              <span className="min-w-0 truncate font-medium">{line.label}</span>
              <span>{line.quantity}</span>
              <span>{formatMoney(line.unitPriceTtc, data.workshop.currency)}</span>
              <span className="text-right font-semibold">{formatMoney(line.totalTtc, data.workshop.currency)}</span>
            </div>
          ))}
        </section>

        {canRespond ? (
          <section className="mt-4 grid grid-cols-2 gap-3">
            <button disabled={busy} type="button" onClick={() => void respond("refuse")} className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border bg-white font-semibold" style={{ borderColor: COLORS.border }}>
              <X className="size-4" /> Refuser
            </button>
            <button disabled={busy} type="button" onClick={() => void respond("accept")} className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] font-semibold text-white" style={{ background: COLORS.accent }}>
              <Check className="size-4" /> Accepter le devis
            </button>
          </section>
        ) : null}

        {data.documents.length ? (
          <section className="mt-4 rounded-[16px] border bg-white p-5 shadow-[0_1px_3px_rgba(26,25,22,0.04)]" style={{ borderColor: COLORS.border }}>
            <h2 className="font-bold">Documents</h2>
            <ul className="mt-3 space-y-2">
              {data.documents.map((document) => (
                <li key={document.title} className="flex items-center gap-3 text-[14px]"><FileText className="size-4" style={{ color: COLORS.accent }} /><span className="flex-1">{document.title}</span>{document.previewUrl ? <a href={document.previewUrl} className="font-semibold" style={{ color: COLORS.accent }}>Ouvrir</a> : null}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.workshop.vatMention ? (
          <p className="mt-4 rounded-[12px] border bg-white p-3 text-[11px]" style={{ borderColor: COLORS.border, color: COLORS.sub }}>
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
