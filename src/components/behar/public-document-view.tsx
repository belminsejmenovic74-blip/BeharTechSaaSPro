"use client";

import { useEffect, useRef, useState } from "react";

import { Download, FileText, Printer, ShieldCheck } from "lucide-react";

import { useBeharStore } from "@/lib/behar-store";
import { generatePdfFromElement } from "@/lib/pdf-generator";
import { buildPublicCommercialDtoFromLocalState } from "@/lib/public-commercial-dto";
import type { PublicCommercialDocumentDto } from "@/lib/public-dtos";
import { getCapabilitiesSnapshot } from "@/lib/use-capabilities";
import { formatMoney, getDocumentFilename } from "@/lib/workshop-country";

const COLORS = { bg: "#FFFFFF", text: "#101828", sub: "#667085", accent: "#2A9D8F", border: "#E4E7EC" };

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

async function readPublicCommercialDocument(
  kind: PublicCommercialDocumentDto["kind"],
  token: string,
): Promise<PublicCommercialDocumentDto | null> {
  const safeToken = token.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeToken) return null;
  const response = await fetch(
    `/api/public/tracking-documents/${encodeURIComponent(safeToken)}?kind=${encodeURIComponent(kind)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  return (await response.json()) as PublicCommercialDocumentDto;
}

function title(kind: PublicCommercialDocumentDto["kind"]) {
  if (kind === "quote") return "Devis";
  if (kind === "invoice") return "Facture";
  if (kind === "receipt") return "Confirmation de règlement";
  if (kind === "intake") return "Bon de prise en charge";
  return "Justificatif de vente";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR").format(date);
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
        finish(
          buildPublicCommercialDtoFromLocalState(useBeharStore.getState(), kind, token, {
            canInvoice: getCapabilitiesSnapshot().canInvoice,
          }),
        );
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
          className="w-full max-w-md rounded-[18px] border bg-white p-8 text-center shadow-[0_1px_3px_rgba(16,24,40,0.04)]"
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
  const showAmounts =
    typeof data.document.totalTtc === "number" ||
    data.lines.some((line) => typeof line.unitPriceTtc === "number" || typeof line.totalTtc === "number");

  return (
    <div className="min-h-screen bg-[#F5F7FA] px-4 py-6 print:bg-white print:p-0" style={{ color: COLORS.text }}>
      <div className="no-print mx-auto mb-4 flex w-full max-w-[794px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#667085] text-sm">
          <FileText className="size-4" style={{ color: COLORS.accent }} />
          {title(kind)}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3.5 font-semibold text-[13px] text-white"
            onClick={() => window.print()}
            style={{ background: COLORS.accent }}
            type="button"
          >
            <Printer className="size-4" /> Imprimer
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border bg-white px-3.5 font-semibold text-[13px] disabled:opacity-50"
            disabled={downloading}
            onClick={() => void downloadPdf()}
            style={{ borderColor: COLORS.border }}
            type="button"
          >
            <Download className="size-4" /> {downloading ? "PDF..." : "Télécharger PDF"}
          </button>
        </div>
      </div>

      <article
        className="print-document pdf-page mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col border border-[#E4E7EC] bg-white p-8 print:min-h-0 print:border-0 print:p-0"
        data-pdf-paginate="true"
        ref={documentRef}
      >
        <header className="flex flex-col items-start justify-between gap-5 border-[#E4E7EC] border-b pb-5 sm:flex-row sm:gap-8">
          <div className="min-w-0 text-[#667085] text-[12px] leading-relaxed">
            <div className="mb-3 flex items-center gap-2.5">
              {data.workshop.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                // biome-ignore lint/performance/noImgElement: logo document externe
                <img
                  alt={data.workshop.name}
                  className="h-10 max-w-[160px] object-contain"
                  src={data.workshop.logoUrl}
                />
              ) : (
                <span
                  className="grid size-10 place-items-center rounded-[10px] text-white"
                  style={{ background: COLORS.accent }}
                >
                  <ShieldCheck className="size-5" />
                </span>
              )}
              <p className="font-bold text-[#101828] text-[16px] tracking-tight">{data.workshop.name}</p>
            </div>
            {data.workshop.address ? <p>{data.workshop.address}</p> : null}
            {data.workshop.city ? (
              <p>{[data.workshop.postalCode, data.workshop.city].filter(Boolean).join(" ")}</p>
            ) : null}
            {data.workshop.canton ? <p>Canton : {data.workshop.canton}</p> : null}
            {data.workshop.businessId ? (
              <p>
                {data.workshop.country === "CH" ? "IDE / UID" : "SIRET"} : {data.workshop.businessId}
              </p>
            ) : null}
            {data.workshop.email ? <p>{data.workshop.email}</p> : null}
            {data.workshop.phone ? <p>{data.workshop.phone}</p> : null}
          </div>
          <div className="min-w-0 text-left sm:min-w-[200px] sm:text-right">
            <p className="font-bold text-[#101828] text-[15px] uppercase tracking-wide">{title(kind)}</p>
            <p className="mt-1 font-mono font-semibold text-[#101828] text-[16px] tracking-tight">
              {data.document.number}
            </p>
            <p className="mt-1 text-[#667085] text-[11px]">Émis le {dateLabel(data.document.createdAt)}</p>
            <p className="mt-1.5 font-semibold text-[#2A9D8F] text-[11px] uppercase tracking-wider">
              {data.document.status}
            </p>
          </div>
        </header>

        <main className="flex-1 space-y-5 py-5">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[6px] border border-[#E4E7EC] p-4">
              <h2 className="font-bold text-[#2A9D8F] text-[10.5px] uppercase tracking-wider">Client</h2>
              <p className="mt-3 font-semibold text-[#101828] text-[13px]">{data.client.displayName}</p>
            </div>
            <div className="rounded-[6px] border border-[#E4E7EC] p-4">
              <h2 className="font-bold text-[#2A9D8F] text-[10.5px] uppercase tracking-wider">Dossier</h2>
              <p className="mt-3 text-[#667085] text-[12px]">
                Référence :{" "}
                <span className="font-semibold text-[#101828]">
                  {data.relatedRepair?.number ?? data.document.number}
                </span>
              </p>
              <p className="mt-1 text-[#667085] text-[12px]">Statut : {data.document.status}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-[6px] border border-[#E4E7EC]">
            <div
              className={
                showAmounts
                  ? "grid grid-cols-[minmax(0,1fr)_42px_90px] border-[#E4E7EC] border-b px-3 py-2.5 font-bold text-[#667085] text-[10px] uppercase tracking-wider sm:grid-cols-[1fr_70px_112px_112px] sm:px-4 print:grid-cols-[1fr_70px_112px_112px] print:px-4"
                  : "grid grid-cols-[minmax(0,1fr)_70px] border-[#E4E7EC] border-b px-4 py-2.5 font-bold text-[#667085] text-[10px] uppercase tracking-wider"
              }
            >
              <span>Désignation</span>
              <span className="text-center">Qté</span>
              {showAmounts ? (
                <>
                  <span className="hidden text-right sm:block print:block">Prix unitaire</span>
                  <span className="text-right">Total</span>
                </>
              ) : null}
            </div>
            <div className="divide-y divide-[#E4E7EC]">
              {data.lines.map((line) => (
                <div
                  className={
                    showAmounts
                      ? "grid grid-cols-[minmax(0,1fr)_42px_90px] items-center px-3 py-3.5 text-[11.5px] sm:grid-cols-[1fr_70px_112px_112px] sm:px-4 print:grid-cols-[1fr_70px_112px_112px] print:px-4"
                      : "grid grid-cols-[minmax(0,1fr)_70px] items-center px-4 py-3.5 text-[11.5px]"
                  }
                  key={`${line.label}-${line.quantity}-${line.totalTtc}`}
                >
                  <span className="font-medium">{line.label}</span>
                  <span className="text-center text-[#667085]">{line.quantity}</span>
                  {showAmounts ? (
                    <>
                      <span className="hidden text-right text-[#667085] sm:block print:block">
                        {formatMoney(line.unitPriceTtc ?? 0, data.workshop.currency)}
                      </span>
                      <span className="text-right font-semibold">
                        {formatMoney(line.totalTtc ?? 0, data.workshop.currency)}
                      </span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {showAmounts ? (
            <section className="ml-auto w-full max-w-[360px] rounded-[6px] border border-[#E4E7EC] p-4">
              <div className="flex items-center justify-between gap-4 font-bold text-[#101828]">
                <span>Total TTC</span>
                <span className="text-[22px]">{formatMoney(data.document.totalTtc ?? 0, data.workshop.currency)}</span>
              </div>
            </section>
          ) : null}

          {kind === "intake" ? (
            <section className="rounded-[6px] border border-[#E4E7EC] p-4 text-[#667085] text-[10px] leading-relaxed">
              <p>
                <strong className="text-[#101828]">Prise en charge.</strong> Le client confie l'appareil à l'atelier
                pour diagnostic ou intervention. Une sauvegarde préalable des données est recommandée.
              </p>
            </section>
          ) : null}
          {data.workshop.vatMention ? <p className="text-[#667085] text-[10px]">{data.workshop.vatMention}</p> : null}
        </main>

        <footer className="mt-auto border-[#E4E7EC] border-t pt-4 text-[#667085] text-[9px] leading-relaxed">
          <p>{data.workshop.name} · Document client imprimable</p>
          <p>Document transmis par {data.workshop.name}</p>
        </footer>
      </article>
    </div>
  );
}
