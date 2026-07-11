"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Copy, Download, FileText, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { generatePdfFromElement } from "@/lib/pdf-generator";
import type { PublicPrintableDocumentDto } from "@/lib/public-dtos";
import { publicAbsoluteUrl } from "@/lib/public-link";
import { formatMoney, getDocumentFilename } from "@/lib/workshop-country";

const COLORS = {
  bg: "#FFFFFF",
  soft: "#FFFFFF",
  text: "#1A1916",
  sub: "#6B6B6B",
  accent: "#2A9D8F",
  border: "#E8E8E5",
};

function label(type: PublicPrintableDocumentDto["documentType"]) {
  switch (type) {
    case "repair_intake":
      return "Bon de prise en charge";
    case "quote":
      return "Devis";
    case "invoice":
      return "Facture";
    case "payment_confirmation":
      return "Confirmation de règlement";
    case "payment_receipt":
      return "Confirmation de règlement";
    case "sale_receipt":
      return "Justificatif de vente";
  }
}

function dateLabel(value?: string) {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export function PublicPrintableDocumentPage({ token }: { token: string }) {
  const [data, setData] = useState<PublicPrintableDocumentDto | null>(null);
  const [missing, setMissing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const documentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch(`/api/public/documents/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((dto) => {
        setData(dto);
        setMissing(!dto);
      })
      .catch(() => setMissing(true));
  }, [token]);

  const publicUrl = useMemo(() => (data?.document.publicUrl ? publicAbsoluteUrl(data.document.publicUrl) : ""), [data]);

  if (missing) {
    return (
      <div className="grid min-h-screen place-items-center px-6" style={{ background: COLORS.bg, color: COLORS.text }}>
        <div
          className="w-full max-w-md rounded-[18px] border bg-white p-8 text-center shadow-[0_1px_3px_rgba(26,25,22,0.04)]"
          style={{ borderColor: COLORS.border }}
        >
          <p className="font-bold text-lg">Document introuvable</p>
          <p className="mt-2 text-sm" style={{ color: COLORS.sub }}>
            Ce document n'est plus public ou le lien a expiré.
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
    const type =
      data.documentType === "repair_intake"
        ? "intake"
        : data.documentType === "payment_confirmation" || data.documentType === "payment_receipt"
          ? "payment"
          : data.documentType === "sale_receipt"
            ? "sale-receipt"
            : data.documentType;
    setDownloading(true);
    try {
      await generatePdfFromElement(
        documentRef.current,
        getDocumentFilename(type, data.document.number || data.repair?.number || "document"),
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div
        className="no-print mx-auto mb-4 flex w-full max-w-[860px] flex-wrap items-center justify-between gap-3 rounded-[16px] border bg-white p-3 shadow-[0_1px_3px_rgba(26,25,22,0.04)]"
        style={{ borderColor: COLORS.border }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-5" style={{ color: COLORS.accent }} />
          <div className="min-w-0">
            <p className="truncate font-bold text-[14px]">{label(data.documentType)}</p>
            <p className="truncate text-[12px]" style={{ color: COLORS.sub }}>
              {data.document.title}
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
          {publicUrl ? (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(publicUrl);
                toast.success("Lien copié");
              }}
              className="grid size-10 place-items-center rounded-[12px] border bg-white"
              style={{ borderColor: COLORS.border }}
              aria-label="Copier le lien"
            >
              <Copy className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <article
        ref={documentRef}
        className="print-document print-page mx-auto flex min-h-[1123px] w-full max-w-[860px] flex-col rounded-[16px] border bg-white p-8 shadow-[0_1px_3px_rgba(26,25,22,0.04)] print:min-h-screen print:rounded-none print:border-0 print:p-6 print:shadow-none"
        style={{ borderColor: COLORS.border }}
      >
        <header className="border-b pb-6" style={{ borderColor: COLORS.border }}>
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                {data.workshop.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.workshop.logoUrl}
                    alt={data.workshop.name}
                    className="h-10 max-w-[160px] object-contain"
                  />
                ) : (
                  <span
                    className="grid size-10 place-items-center rounded-[10px] text-white"
                    style={{ background: COLORS.accent }}
                  >
                    <ShieldCheck className="size-5" />
                  </span>
                )}
                <p className="font-bold text-[18px]">{data.workshop.name}</p>
              </div>
              <div className="mt-3 text-[12px] leading-relaxed" style={{ color: COLORS.sub }}>
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
                {data.workshop.vatApplicable && data.workshop.vatNumber ? (
                  <p>
                    {data.workshop.country === "CH" ? "N° TVA suisse" : "TVA intracommunautaire"} :{" "}
                    {data.workshop.vatNumber}
                  </p>
                ) : null}
                {data.workshop.email ? <p>{data.workshop.email}</p> : null}
                {data.workshop.phone ? <p>{data.workshop.phone}</p> : null}
              </div>
            </div>
            <div className="text-right">
              <p
                className="inline-flex rounded-[8px] border px-3 py-1 font-bold text-[11px] uppercase tracking-[0.12em]"
                style={{ borderColor: "#D7EFEA", background: "#FFFFFF", color: "#167B70" }}
              >
                {label(data.documentType)}
              </p>
              <p className="mt-4 font-mono font-bold text-[22px]">
                {data.document.number || data.repair?.number || "Document"}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: COLORS.sub }}>
                Émis le {dateLabel(data.document.createdAt)}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-5 py-6">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[14px] border p-4" style={{ borderColor: COLORS.border }}>
              <h2 className="font-bold text-[13px] uppercase tracking-wide">Client</h2>
              <dl className="mt-3 space-y-2 text-[12px]">
                <Row label="Nom" value={data.client.displayName} />
                <Row label="Téléphone" value={data.client.phone || "-"} />
                <Row label="Email" value={data.client.email || "-"} />
                <Row label="Adresse" value={data.client.address || "-"} />
              </dl>
            </div>
            <div className="rounded-[14px] border p-4" style={{ borderColor: COLORS.border }}>
              <h2 className="font-bold text-[13px] uppercase tracking-wide">Dossier</h2>
              <dl className="mt-3 space-y-2 text-[12px]">
                <Row label="Réparation" value={data.repair?.number || "-"} />
                <Row label="Statut" value={data.repair?.statusLabel || data.document.status} />
                <Row
                  label="Appareil"
                  value={[data.repair?.deviceBrand, data.repair?.deviceModel].filter(Boolean).join(" ") || "-"}
                />
                <Row
                  label="Intervention"
                  value={data.repair?.interventionLabel || data.repair?.issueDescription || "-"}
                />
                <Row label="IMEI / série" value={data.repair?.imei || "-"} />
              </dl>
            </div>
          </section>

          <section className="overflow-hidden rounded-[14px] border" style={{ borderColor: COLORS.border }}>
            <div
              className="grid grid-cols-[1fr_70px_112px_112px] px-4 py-3 font-semibold text-[11px] uppercase tracking-wide"
              style={{ background: COLORS.soft, color: COLORS.sub }}
            >
              <span>Désignation</span>
              <span className="text-center">Qté</span>
              <span className="text-right">Prix unitaire</span>
              <span className="text-right">Total</span>
            </div>
            {data.lines.map((line, index) => (
              <div
                key={`${line.label}-${index}`}
                className="grid grid-cols-[1fr_70px_112px_112px] border-t px-4 py-4 text-[13px]"
                style={{ borderColor: COLORS.border }}
              >
                <span className="font-medium">{line.label}</span>
                <span className="text-center" style={{ color: COLORS.sub }}>
                  {line.quantity}
                </span>
                <span className="text-right" style={{ color: COLORS.sub }}>
                  {formatMoney(line.unitPriceTtc, data.workshop.currency)}
                </span>
                <span className="text-right font-semibold">{formatMoney(line.totalTtc, data.workshop.currency)}</span>
              </div>
            ))}
          </section>

          <section
            className="ml-auto w-full max-w-[340px] rounded-[14px] border p-4"
            style={{ borderColor: COLORS.border, background: COLORS.soft }}
          >
            <div className="flex items-center justify-between gap-4 font-bold">
              <span>Total TTC</span>
              <span className="text-[22px]">{formatMoney(data.totalTtc, data.workshop.currency)}</span>
            </div>
          </section>

          {data.workshop.vatMention ? (
            <section
              className="rounded-[14px] border p-4 text-[11px] leading-relaxed"
              style={{ borderColor: COLORS.border, background: COLORS.soft }}
            >
              {data.workshop.vatMention}
            </section>
          ) : null}

          {data.documentType === "repair_intake" ? (
            <section
              className="rounded-[14px] border p-4 text-[11px] leading-relaxed"
              style={{ borderColor: COLORS.border, background: COLORS.soft }}
            >
              <p>
                <strong>Prise en charge.</strong> Le client confie l'appareil à l'atelier pour diagnostic ou
                intervention. Le client reste responsable de la sauvegarde préalable de ses données.
              </p>
            </section>
          ) : null}
        </main>

        <footer
          className="mt-auto border-t pt-5 text-[10px] leading-relaxed"
          style={{ borderColor: COLORS.border, color: "#6B6B6B" }}
        >
          <p>{data.workshop.name} · Document client imprimable</p>
          <p>Document transmis par {data.workshop.name}</p>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt style={{ color: COLORS.sub }}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
