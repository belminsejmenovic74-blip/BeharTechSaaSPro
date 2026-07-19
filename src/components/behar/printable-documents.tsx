import { type ReactNode, useEffect, useState } from "react";

import {
  type Customer,
  workshopInfo as defaultWorkshopInfo,
  formatCurrency,
  getInvoiceTotal,
  getQuoteDevices,
  getQuoteTotal,
  getVatSummary,
  getWorkshopCountryLabel,
  type Invoice,
  type Payment,
  type Quote,
  type QuoteLine,
  type Repair,
  type RepairPart,
  type Sale,
  type WorkshopCurrency,
  type WorkshopInfo,
} from "@/lib/behar-store";
import { formatBrandModel, formatDeviceLabel } from "@/lib/format-device";
import { generateQrDataUrl, publicAbsoluteUrl } from "@/lib/public-link";
import { formatIntakeBonNumber } from "@/lib/utils";

const COLORS = {
  ink: "#1A1916",
  muted: "#6B6B6B",
  accent: "#2A9D8F",
  line: "#E8E8E8",
  soft: "#FFFFFF",
  accentSoft: "#FFFFFF",
};

export type PrintableDocType = "devis" | "facture" | "recu" | "recu-vente" | "bon-prise-en-charge";

const DOC_THEME: Record<
  PrintableDocType,
  { label: string; accent: string; soft: string; ink: string; chipText: string }
> = {
  devis: {
    label: "DEVIS",
    accent: "#2A9D8F",
    soft: "#FFFFFF",
    ink: "#1A1916",
    chipText: "#1A1916",
  },
  facture: {
    label: "FACTURE",
    accent: "#2A9D8F",
    soft: "#FFFFFF",
    ink: "#1A1916",
    chipText: "#1A1916",
  },
  recu: {
    label: "CONFIRMATION DE RÈGLEMENT",
    accent: "#2A9D8F",
    soft: "#FFFFFF",
    ink: "#1A1916",
    chipText: "#1A1916",
  },
  "recu-vente": {
    label: "REÇU DE VENTE",
    accent: "#2A9D8F",
    soft: "#FFFFFF",
    ink: "#1A1916",
    chipText: "#1A1916",
  },
  "bon-prise-en-charge": {
    label: "BON DE PRISE EN CHARGE",
    accent: "#2A9D8F",
    soft: "#FFFFFF",
    ink: "#1A1916",
    chipText: "#1A1916",
  },
};

function text(value: unknown, fallback = "Non renseigné"): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).replace(/\s+/g, " ").trim();
  if (!str || /^(undefined|null|nan)$/i.test(str)) return fallback;
  return str;
}

function dash(value: unknown): string {
  return text(value, "—");
}

function paymentMethodLabel(value: unknown): string {
  const method = dash(value);
  if (method === "TPE externe") return "CB";
  if (method === "Espèces hors Behar Tech") return "Espèces";
  if (method === "Carte externe") return "CB";
  if (method === "Virement") return "Virement";
  if (method === "Lien externe") return "Lien de paiement externe";
  return method;
}

function money(value: unknown, currency?: WorkshopCurrency): string {
  const parsed = typeof value === "number" ? value : Number(value);
  return formatCurrency(Number.isFinite(parsed) ? parsed : 0, currency ?? defaultWorkshopInfo.currency);
}

function dateLabel(value: unknown): string {
  const raw = text(value, "");
  if (!raw) return "Non renseigné";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function dateTimeLabel(value: unknown): string {
  const raw = text(value, "");
  if (!raw) return "Non renseigné";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function customerName(customer?: Customer | null): string {
  if (!customer || customer.type === "counter") return "Client comptoir";
  return text(customer.name, "Client comptoir");
}

function deviceName(repair?: Repair | null): string {
  return formatDeviceLabel(repair, "Appareil non renseigné");
}

function serviceDescription(line: QuoteLine, repair?: Repair): string {
  const base = text(line.description, "Prestation atelier");
  if (!repair) return base;
  const device = deviceName(repair);
  const issue = text(repair.issue, "");
  const normalizedBase = base.toLowerCase();
  const alreadyDetailed =
    normalizedBase.includes(device.toLowerCase()) || (issue && normalizedBase.includes(issue.toLowerCase()));
  return alreadyDetailed ? base : `${device} — ${issue || base}`;
}

function _Badge({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex rounded-[3px] border border-[#E8E8E8] px-2 py-0.5 font-semibold text-[#1A1916] text-[10px] uppercase tracking-wider">
      {children}
    </span>
  );
}

function KeyValue({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="grid grid-cols-[128px_1fr] gap-3 text-[12px] leading-relaxed">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}

export function DocumentSection({
  title,
  children,
  className = "",
  borderColor = "border-[#E8E8E8]",
}: Readonly<{
  title: string;
  children: ReactNode;
  className?: string;
  borderColor?: string;
}>) {
  return (
    <section className={`print-avoid-break rounded-[6px] border ${borderColor} bg-white p-4 ${className}`}>
      <h3 className="mb-3 font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wider">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ClientCard({ customer }: Readonly<{ customer?: Customer | null }>) {
  return (
    <DocumentSection title="Client">
      <KeyValue label="Nom" value={customerName(customer)} />
      <KeyValue label="Téléphone" value={dash(customer?.phone)} />
      <KeyValue label="Email" value={dash(customer?.email)} />
      {customer?.address && customer.address !== "Non renseigné" && (
        <KeyValue label="Adresse" value={customer.address} />
      )}
    </DocumentSection>
  );
}

function RepairCard({
  repair,
  invoice,
  quote,
}: Readonly<{ repair?: Repair | null; invoice?: Invoice; quote?: Quote }>) {
  const deviceType = repair?.deviceType ?? quote?.deviceType;
  const brandName = repair?.brandName ?? quote?.brandName;
  const modelName = repair?.deviceModel ?? repair?.model ?? quote?.deviceModel;
  const device = repair
    ? deviceName(repair)
    : formatBrandModel(brandName, modelName, text(quote?.device, "Appareil non renseigné"));
  const issue = repair?.issue ?? quote?.issue;
  const statusLabel = quote ? "Statut du devis" : invoice ? "Statut de la facture" : "Statut du dossier";
  const statusValue = quote?.status ?? invoice?.status ?? repair?.status;
  return (
    <DocumentSection title="Dossier / Appareil">
      <KeyValue label="Dossier" value={dash(repair?.number ?? invoice?.sourceNumber ?? quote?.number)} />
      <KeyValue label="Type" value={dash(deviceType)} />
      <KeyValue label="Marque" value={dash(brandName)} />
      <KeyValue label="Modèle" value={dash(modelName)} />
      <KeyValue label="Appareil" value={device} />
      <KeyValue label="Intervention" value={dash(issue)} />
      <KeyValue label={statusLabel} value={dash(statusValue)} />
      <KeyValue label="Prise en charge" value={repair?.droppedAt ? dateLabel(repair.droppedAt) : "Non renseigné"} />
    </DocumentSection>
  );
}

import { getSyncState, subscribeSyncState } from "@/lib/cloud-sync";

function DocumentTrackingQr({ url }: Readonly<{ url?: string }>) {
  const [qr, setQr] = useState("");
  const [syncStatus, setSyncStatus] = useState(getSyncState().status);
  const absoluteUrl = url ? publicAbsoluteUrl(url) : "";

  useEffect(() => {
    return subscribeSyncState((s) => setSyncStatus(s.status));
  }, []);

  useEffect(() => {
    if (!absoluteUrl) return;
    let active = true;
    generateQrDataUrl(absoluteUrl)
      .then((data) => {
        if (active) setQr(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [absoluteUrl]);
  if (!absoluteUrl) return null;

  if (syncStatus === "syncing" || syncStatus === "error" || syncStatus === "offline") {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="flex size-[80px] items-center justify-center rounded-[6px] border border-[#E8E8E8] bg-[#FAFAF8] p-1 text-center">
          <span className="font-medium text-[#6B6B6B] text-[7px] leading-[1.1]">
            {syncStatus === "syncing" ? "Synchronisation du suivi en cours..." : "Suivi cloud non disponible"}
          </span>
        </div>
        <p className="max-w-[90px] text-center text-[#6B6B6B] text-[9px] leading-tight">Suivi client</p>
      </div>
    );
  }

  if (!qr) return null;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="QR code de suivi de la réparation"
        className="size-[80px] rounded-[6px] border border-[#E8E8E8] bg-white p-1"
        src={qr}
      />
      <p className="max-w-[90px] text-center text-[#6B6B6B] text-[9px] leading-tight">Suivi client</p>
    </div>
  );
}

function DocumentHeader({
  type,
  number,
  date,
  badge,
  workshop,
  qrSlot,
}: Readonly<{
  type: PrintableDocType;
  number?: string;
  date?: string;
  badge?: string;
  workshop: WorkshopInfo;
  qrSlot?: ReactNode;
}>) {
  const atelierName = text(workshop.name, "Votre atelier");
  const isSwiss = workshop.country === "CH";
  const theme = DOC_THEME[type];

  const isSet = (val: string | undefined | null) => {
    if (!val) return false;
    const trimmed = val.trim();
    return trimmed !== "" && trimmed !== "Non renseigné" && trimmed !== "—";
  };

  return (
    <header className="flex flex-col items-start justify-between gap-5 border-[#E8E8E8] border-b pb-5 sm:flex-row sm:gap-8">
      <div className="min-w-0 max-w-[470px] text-left">
        <div className="text-[#6B6B6B] text-[12px] leading-relaxed">
          <p className="mb-1 font-bold text-[#1A1916] text-[15px] tracking-tight">{atelierName}</p>
          {isSet(workshop.address) && <p>{workshop.address}</p>}
          {isSet(workshop.postalCity) ? (
            <p>
              {workshop.postalCity}
              {workshop.country ? `, ${getWorkshopCountryLabel(workshop.country)}` : ""}
            </p>
          ) : (
            <p>
              {[isSet(workshop.postalCode) ? workshop.postalCode : "", isSet(workshop.city) ? workshop.city : ""]
                .filter(Boolean)
                .join(" ")}
              {workshop.country ? `, ${getWorkshopCountryLabel(workshop.country)}` : ""}
            </p>
          )}
          {isSwiss ? (
            <>
              {isSet(workshop.swissCanton) && <p>Canton : {workshop.swissCanton}</p>}
              {isSet(workshop.swissUid) && <p>IDE / CHE : {workshop.swissUid}</p>}
              {workshop.vatApplicable && isSet(workshop.swissVatNumber) && (
                <p>N° TVA suisse : {workshop.swissVatNumber}</p>
              )}
            </>
          ) : (
            <>
              {isSet(workshop.siret) && <p>SIRET : {workshop.siret}</p>}
              {workshop.vatApplicable && isSet(workshop.tvaNumber) && <p>N° TVA : {workshop.tvaNumber}</p>}
            </>
          )}
          {isSet(workshop.email) && <p>{workshop.email}</p>}
          {isSet(workshop.phone) && <p>{workshop.phone}</p>}
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-start sm:justify-end">
        <div className="min-w-0 text-left sm:min-w-[200px] sm:text-right">
          <span className="mb-1 block font-bold text-[#1A1916] text-[15px] uppercase tracking-wide">{theme.label}</span>
          <p className="font-mono font-semibold text-[#1A1916] text-[16px] tracking-tight">{dash(number)}</p>
          <p className="mt-1 text-[#6B6B6B] text-[11px]">Émis le {date ? dateLabel(date) : "—"}</p>
          {badge ? (
            <p className="mt-1.5 font-semibold text-[#2A9D8F] text-[11px] uppercase tracking-wider">{badge}</p>
          ) : null}
        </div>
        {qrSlot ?? null}
      </div>
    </header>
  );
}

function DocumentFooter({
  workshop,
  page,
  pageCount,
}: Readonly<{ workshop: WorkshopInfo; page: number; pageCount: number }>) {
  const methods = workshop.acceptedPaymentMethods?.filter(Boolean) ?? [];
  const isSwiss = workshop.country === "CH";

  const legalIdentity = isSwiss
    ? [
        workshop.swissUid && workshop.swissUid !== "Non renseigné" ? `IDE / CHE ${workshop.swissUid}` : "",
        workshop.swissCanton && workshop.swissCanton !== "Non renseigné" ? workshop.swissCanton : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : workshop.siret && workshop.siret !== "Non renseigné"
      ? `SIRET ${workshop.siret}`
      : "";

  return (
    <footer className="mt-auto border-[#E8E8E8] border-t pt-4 text-[#6B6B6B] text-[9px] leading-relaxed">
      {methods.length ? <p>Moyens de paiement acceptés : {methods.join(" · ")}</p> : null}
      {workshop.documentFooter && workshop.documentFooter !== "Non renseigné" ? <p>{workshop.documentFooter}</p> : null}
      <p>
        {text(workshop.name, "Votre atelier")}
        {legalIdentity ? ` · ${legalIdentity}` : ""}
        {workshop.email ? ` · ${workshop.email}` : ""}
        {workshop.phone ? ` · ${workshop.phone}` : ""}
        {pageCount > 0 ? ` · Page ${page}/${pageCount}` : ""}
      </p>
    </footer>
  );
}

export function DocumentPage({
  type,
  number,
  date,
  badge,
  workshop = defaultWorkshopInfo,
  children,
  page = 1,
  pageCount = 1,
  qrSlot,
}: Readonly<{
  type: PrintableDocType;
  number?: string;
  date?: string;
  badge?: string;
  workshop?: WorkshopInfo;
  children: ReactNode;
  page?: number;
  pageCount?: number;
  qrSlot?: ReactNode;
}>) {
  const ws = workshop ?? defaultWorkshopInfo;
  return (
    <article
      className="print-document pdf-page relative mx-auto flex min-h-[1123px] w-full max-w-[860px] flex-col overflow-hidden rounded-[6px] border border-[#E8E8E8] bg-white p-8 text-[#1A1916] print:min-h-0 print:rounded-none print:border-0 print:p-0 print:shadow-none"
      style={{ color: COLORS.ink, fontFamily: "Inter, SF Pro, system-ui, sans-serif" }}
    >
      <DocumentHeader badge={badge} date={date} number={number} qrSlot={qrSlot} type={type} workshop={ws} />
      <main className="flex-1 space-y-5 py-5">{children}</main>
      <DocumentFooter workshop={ws} page={page} pageCount={pageCount} />
    </article>
  );
}

export function DocumentLegalBlock({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <section className="rounded-[6px] border border-[#E8E8E8] bg-white p-4">
      <h3 className="mb-2 font-bold text-[#2A9D8F] text-[10.5px] uppercase tracking-wider">{title}</h3>
      <div className="space-y-1 text-[#6B6B6B] text-[10px] leading-relaxed">{children}</div>
    </section>
  );
}

export function DocumentPhotoPage({
  type,
  number,
  date,
  workshop,
  photos,
  title = "Photos des défauts visibles",
  subtitle = "Photos prises au moment du dépôt.",
  page = 2,
  pageCount = 2,
}: Readonly<{
  type: PrintableDocType;
  number?: string;
  date?: string;
  workshop: WorkshopInfo;
  photos: { id: string; name?: string; dataUrl: string }[];
  title?: string;
  subtitle?: string;
  page?: number;
  pageCount?: number;
}>) {
  return (
    <DocumentPage
      type={type}
      number={number}
      date={date}
      badge="Annexe photos"
      workshop={workshop}
      page={page}
      pageCount={pageCount}
    >
      <div className="space-y-4">
        <div>
          <h2 className="font-bold text-[#2A9D8F] text-[13px] uppercase tracking-wider">{title}</h2>
          <p className="mt-1 text-[#6B6B6B] text-[11px] leading-relaxed">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {photos.slice(0, 6).map((photo, idx) => (
            <div className="overflow-hidden rounded-[6px] border border-[#E8E8E8] bg-white p-1" key={photo.id || idx}>
              <img
                alt={photo.name || `Photo ${idx + 1}`}
                className="h-[200px] w-full rounded-[4px] object-cover"
                src={photo.dataUrl}
              />
              {photo.name ? <p className="mt-1.5 truncate px-1 text-[#6B6B6B] text-[10px]">{photo.name}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </DocumentPage>
  );
}

function DocumentIntro({
  customer,
  repair,
  invoice,
  quote,
}: Readonly<{ customer?: Customer | null; repair?: Repair | null; invoice?: Invoice; quote?: Quote }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ClientCard customer={customer} />
      <RepairCard invoice={invoice} quote={quote} repair={repair} />
    </div>
  );
}

function PremiumTable({
  rows,
  repair,
  currency,
}: Readonly<{ rows: QuoteLine[]; repair?: Repair; currency?: WorkshopCurrency }>) {
  const safeRows = rows.length
    ? rows
    : [{ id: "empty", description: "Prestation atelier", quantity: 1, unitPrice: 0, total: 0 }];
  return (
    <section className="print-avoid-break overflow-hidden rounded-[6px] border border-[#E8E8E8] bg-white print:rounded-none">
      <div className="grid grid-cols-[minmax(0,1fr)_42px_90px] border-[#E8E8E8] border-b bg-white px-3 py-2.5 font-bold text-[#6B6B6B] text-[10px] uppercase tracking-wider sm:grid-cols-[1fr_70px_112px_112px] sm:px-4 print:grid-cols-[1fr_70px_112px_112px] print:px-4">
        <span>Désignation</span>
        <span className="text-center">Qté</span>
        <span className="hidden text-right sm:block print:block">Prix unitaire</span>
        <span className="text-right">Total</span>
      </div>
      <div className="divide-y divide-[#E8E8E8]">
        {safeRows.map((line) => (
          <div
            className="grid grid-cols-[minmax(0,1fr)_42px_90px] items-center px-3 py-3.5 text-[11.5px] sm:grid-cols-[1fr_70px_112px_112px] sm:px-4 print:grid-cols-[1fr_70px_112px_112px] print:px-4"
            key={line.id}
          >
            <span className="font-medium text-[#1A1916]">{serviceDescription(line, repair)}</span>
            <span className="text-center text-[#6B6B6B]">{text(line.quantity, "1")}</span>
            <span className="hidden text-right text-[#6B6B6B] sm:block print:block">
              {money(line.unitPrice, currency)}
            </span>
            <span className="text-right font-semibold text-[#1A1916]">
              {money(line.total ?? (line.quantity ?? 0) * (line.unitPrice ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteDevicesTable({ quote }: Readonly<{ quote: Quote }>) {
  const devices = getQuoteDevices(quote);
  if (!devices.length) return <PremiumTable currency={quote.currency} rows={quote.lines ?? []} />;
  return (
    <div className="space-y-4">
      {devices.map((device, index) => (
        <section
          className="print-avoid-break overflow-hidden rounded-[6px] border border-[#E8E8E8] bg-white print:rounded-none"
          key={device.id}
        >
          <h3 className="border-[#E8E8E8] border-b bg-white px-4 py-2.5 font-bold text-[#2A9D8F] text-[12px] uppercase tracking-wider">
            Appareil {index + 1} — {formatBrandModel(device.brand, device.model, `Appareil ${index + 1}`)}
          </h3>
          <div className="grid grid-cols-[minmax(0,1fr)_42px_90px] border-[#E8E8E8] border-b bg-white px-3 py-2 font-bold text-[#6B6B6B] text-[10px] uppercase tracking-wider sm:grid-cols-[1fr_70px_112px_112px] sm:px-4 print:grid-cols-[1fr_70px_112px_112px] print:px-4">
            <span>Désignation</span>
            <span className="text-center">Qté</span>
            <span className="hidden text-right sm:block print:block">Prix unitaire</span>
            <span className="text-right">Montant</span>
          </div>
          <div className="divide-y divide-[#E8E8E8]">
            {device.services.map((service) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_42px_90px] items-center px-3 py-3 text-[11.5px] sm:grid-cols-[1fr_70px_112px_112px] sm:px-4 print:grid-cols-[1fr_70px_112px_112px] print:px-4"
                key={service.id}
              >
                <span className="font-medium text-[#1A1916]">{service.label}</span>
                <span className="text-center text-[#6B6B6B]">{service.quantity}</span>
                <span className="hidden text-right text-[#6B6B6B] sm:block print:block">
                  {money(service.priceTtc, quote.currency)}
                </span>
                <span className="text-right font-semibold text-[#1A1916]">
                  {money(service.priceTtc * service.quantity, quote.currency)}
                </span>
              </div>
            ))}
            {device.accessories.map((accessory) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_42px_90px] items-center px-3 py-3 text-[11.5px] sm:grid-cols-[1fr_70px_112px_112px] sm:px-4 print:grid-cols-[1fr_70px_112px_112px] print:px-4"
                key={accessory.id}
              >
                <span className="font-medium text-[#1A1916]">{accessory.label}</span>
                <span className="text-center text-[#6B6B6B]">1</span>
                <span className="hidden text-right text-[#6B6B6B] sm:block print:block">
                  {accessory.included ? "inclus" : money(accessory.priceTtc ?? 0, quote.currency)}
                </span>
                <span className="text-right font-semibold text-[#1A1916]">
                  {accessory.included ? "inclus" : money(accessory.priceTtc ?? 0, quote.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TotalsCard({
  lines,
  total,
  workshop,
  currency,
}: Readonly<{
  lines: QuoteLine[];
  total: number;
  workshop?: WorkshopInfo;
  currency?: WorkshopCurrency;
}>) {
  const ws = workshop ?? defaultWorkshopInfo;
  const vat = getVatSummary(lines, ws);
  const finalTotal = ws.vatApplicable ? vat.ttc : total;
  return (
    <section className="ml-auto w-full max-w-[360px] rounded-[6px] border border-[#E8E8E8] bg-white p-4">
      {ws.vatApplicable ? (
        <>
          <TotalLine label="Sous-total HT" value={money(vat.ht, currency)} />
          <TotalLine label={`TVA ${String(vat.rate * 100).replace(".", ",")}%`} value={money(vat.tva, currency)} />
        </>
      ) : (
        <p className="mb-3 text-right text-[#6B6B6B] text-[11px]">
          {text(
            ws.tvaMention,
            ws.country === "CH" ? "Non assujetti à la TVA" : "TVA non applicable, art. 293 B du CGI",
          )}
        </p>
      )}
      <TotalLine emphasize label="Total TTC facturé" value={money(finalTotal, currency)} />
    </section>
  );
}

function TotalLine({ label, value, emphasize }: Readonly<{ label: string; value: string; emphasize?: boolean }>) {
  return (
    <div
      className={`flex justify-between gap-5 border-[#E8E8E8] border-b py-2 last:border-b-0 ${emphasize ? "font-semibold text-[#1A1916]" : "text-[#6B6B6B]"}`}
    >
      <span>{label}</span>
      <span className={emphasize ? "font-semibold text-[#1A1916] text-[16px]" : "text-[#1A1916]"}>{value}</span>
    </div>
  );
}

function SignatureGrid({ accord = false }: Readonly<{ accord?: boolean }>) {
  return (
    <section className="grid gap-5">
      <SignatureBox title={accord ? "Bon pour accord" : "Signature client"} />
    </section>
  );
}

function SignatureBox({ title }: Readonly<{ title: string }>) {
  return (
    <div className="rounded-[6px] border border-[#E8E8E8] bg-white p-4">
      <p className="font-semibold text-[#6B6B6B] text-[11px] uppercase tracking-wide">{title}</p>
      <div className="mt-14 border-[#E8E8E8] border-t pt-2 text-[#6B6B6B] text-[10px]">Date et signature</div>
    </div>
  );
}

function NoticeCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="print-avoid-break rounded-[6px] border border-[#E8E8E8] bg-white p-4">
      <h3 className="mb-2 font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wider">{title}</h3>
      <div className="text-[#6B6B6B] text-[11.5px] leading-relaxed">{children}</div>
    </section>
  );
}

const intakeRows = [
  ["État général", "generalCondition"],
  ["Appareil", "powerState"],
  ["Batterie / charge", "chargingState"],
  ["Écran", "screenState"],
  ["Châssis / dos", "frameState"],
  ["Caméras", "camerasState"],
  ["Micro / haut-parleur", "audioState"],
  ["Boutons", "buttonsState"],
  ["Connecteur de charge", "chargingPortState"],
  ["Face ID / Touch ID", "biometricState"],
  ["Réseau / SIM", "networkState"],
  ["Code appareil", "passcodeState"],
] as const;

const customerValidationRows = [
  ["Le client confirme l'état d'entrée déclaré.", "customerConfirmed"],
  ["Le client autorise l'ouverture / diagnostic de l'appareil.", "diagnosticAuthorized"],
  ["Le client comprend que certains défauts peuvent être non testables avant ouverture.", "nonTestableAccepted"],
] as const;

function intakeValue(repair: Repair, key: (typeof intakeRows)[number][1]) {
  return text(repair.intakeCondition?.[key], "Non renseigné");
}

function accessSummary(repair: Repair) {
  const intake = repair.intakeCondition;
  const method = text(intake?.accessMethod, "");
  if (!method || method === "Non renseigné") return "Non communiqué";
  if (method === "Code PIN" || method === "Mot de passe") {
    return intake?.accessCode ? `${method} confié au dossier` : method;
  }
  if (method === "Schéma") return intake?.patternData?.points?.length ? "Schéma enregistré" : "Schéma à compléter";
  return method;
}

function intakeAccessories(repair: Repair) {
  const intake = repair.intakeCondition;
  const values = (intake?.accessories ?? []).filter(Boolean);
  const withoutNone = values.filter((entry) => entry !== "Aucun");
  if (intake?.accessoriesOther?.trim() && values.includes("Autre")) {
    return [...withoutNone.filter((entry) => entry !== "Autre"), `Autre : ${intake.accessoriesOther}`];
  }
  return withoutNone;
}

function _IntakeBox({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="rounded-[10px] border border-[#E8E8E5] bg-white p-3">
      <h3 className="mb-2 font-bold text-[#167B70] text-[11px] uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  );
}

function IntakeKeyValue({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="grid grid-cols-[108px_1fr] gap-2 text-[11.5px] leading-relaxed">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}

function PatternMini({ points }: Readonly<{ points?: number[] }>) {
  if (!points?.length) return null;
  return (
    <div className="mt-2 grid w-[78px] grid-cols-3 gap-1">
      {Array.from({ length: 9 }, (_, index) => index + 1).map((point) => {
        const order = points.indexOf(point) + 1;
        return (
          <span
            className={`grid size-5 place-items-center rounded-full border font-bold text-[8px] ${
              order ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70]" : "border-[#DADADA] bg-white text-transparent"
            }`}
            key={point}
          >
            {order || ""}
          </span>
        );
      })}
    </div>
  );
}

function IntakeSignatureBlock({ repair }: Readonly<{ repair: Repair }>) {
  const intake = repair.intakeCondition;
  const signedAt = intake?.signatureSignedAt ?? intake?.signedAt;
  const hasSignature = Boolean(intake?.signatureDataUrl);
  return (
    <DocumentSection title="Signature">
      <div className="min-h-[70px] rounded-[6px] border border-[#E8E8E8] border-dashed bg-white p-2">
        {hasSignature ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Signature client" className="h-[54px] w-full object-contain" src={intake?.signatureDataUrl} />
        ) : (
          <div className="grid h-[54px] place-items-center text-[#6B6B6B] text-[11px]">À signer</div>
        )}
      </div>
      <div className="mt-2 grid gap-1">
        <IntakeKeyValue
          label="Signataire"
          value={hasSignature ? text(intake?.signedBy ?? intake?.signerName, "Client") : "Client"}
        />
        <IntakeKeyValue label="Date" value={hasSignature && signedAt ? dateTimeLabel(signedAt) : "À signer"} />
      </div>
    </DocumentSection>
  );
}

function PaymentHero({
  amount,
  method,
  date,
  currency,
}: Readonly<{ amount: number; method?: string; date?: string; currency?: WorkshopCurrency }>) {
  return (
    <section className="rounded-[6px] border border-[#2A9D8F] bg-white p-6 text-center">
      <p className="font-bold text-[#2A9D8F] text-[12px] uppercase tracking-wider">Montant réglé</p>
      <p className="mt-2 font-semibold text-[#1A1916] text-[32px] leading-none">{money(amount, currency)}</p>
      <p className="mt-3 text-[#6B6B6B] text-[12px]">
        {paymentMethodLabel(method)} · {date ? dateLabel(date) : "—"}
      </p>
    </section>
  );
}

export function RepairIntakeDocument({
  repair,
  customer,
  workshop,
}: Readonly<{ repair: Repair; customer: Customer; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? defaultWorkshopInfo;
  const photos = (repair.intakeCondition?.photos ?? []).filter((photo): photo is typeof photo & { dataUrl: string } =>
    Boolean(photo.dataUrl),
  );
  const hasPhotos = photos.length > 0;
  const pageCount = hasPhotos ? 2 : 1;
  const accessories = intakeAccessories(repair);
  const hasCustomerValidation = customerValidationRows.every(([, key]) => Boolean(repair.intakeCondition?.[key]));
  const isValidated = Boolean(
    repair.intakeCondition?.customerConfirmed &&
      repair.intakeCondition?.diagnosticAuthorized &&
      repair.intakeCondition?.nonTestableAccepted &&
      text(repair.intakeCondition?.signatureDataUrl, "") &&
      text(repair.intakeCondition?.signatureSignedAt ?? repair.intakeCondition?.signedAt, ""),
  );

  const leftRows = intakeRows.slice(0, 6);
  const rightRows = intakeRows.slice(6);

  return (
    <div
      className="print-document mx-auto flex w-full max-w-[794px] flex-col gap-6 text-[#1A1916]"
      data-pdf-paginate="true"
    >
      <DocumentPage
        type="bon-prise-en-charge"
        number={formatIntakeBonNumber(repair.number)}
        date={repair.droppedAt}
        badge={isValidated ? "Signé" : "À signer"}
        workshop={ws}
        page={1}
        pageCount={pageCount}
        qrSlot={<DocumentTrackingQr url={repair.publicAccess?.url} />}
      >
        {/* Client + Appareil */}
        <div className="grid grid-cols-2 gap-3">
          <DocumentSection title="Client">
            <IntakeKeyValue label="Nom" value={customerName(customer)} />
            <IntakeKeyValue label="Téléphone" value={text(customer.phone)} />
            <IntakeKeyValue label="Email" value={text(customer.email)} />
            {customer.address && customer.address !== "Non renseigné" ? (
              <IntakeKeyValue label="Adresse" value={text(customer.address)} />
            ) : null}
          </DocumentSection>
          <DocumentSection title="Appareil">
            <IntakeKeyValue label="Type · Marque" value={`${text(repair.deviceType)} · ${text(repair.brandName)}`} />
            <IntakeKeyValue label="Modèle" value={text(repair.deviceModel ?? repair.model)} />
            <IntakeKeyValue label="IMEI / série" value={text(repair.imei)} />
            <IntakeKeyValue label="Accès appareil" value={accessSummary(repair)} />
            {repair.intakeCondition?.accessMethod === "Schéma" ? (
              <PatternMini points={repair.intakeCondition.patternData?.points} />
            ) : null}
          </DocumentSection>
        </div>

        {/* Intervention */}
        <DocumentSection title="Intervention">
          <div className="grid grid-cols-3 gap-3">
            <IntakeKeyValue label="Demande" value={text(repair.issue)} />
            <IntakeKeyValue label="Statut" value={text(repair.status)} />
            <IntakeKeyValue label="Date dépôt" value={dateLabel(repair.droppedAt)} />
          </div>
        </DocumentSection>

        {/* Montant estimé — le client voit le prix convenu au dépôt. Mention
            « sous réserve » car le tarif peut évoluer après diagnostic. */}
        <section className="flex items-center justify-between gap-4 rounded-[6px] border border-[#2A9D8F] bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wide">Montant estimé</p>
            <p className="mt-0.5 text-[#6B6B6B] text-[10px] leading-tight">
              Estimation convenue au dépôt — susceptible d'évoluer après diagnostic.
            </p>
          </div>
          <p className="shrink-0 font-bold font-mono text-[#1A1916] text-[20px] tracking-tight">
            {money(repair.total ?? repair.amount ?? 0, repair.currency)}{" "}
            <span className="font-normal text-[#6B6B6B] text-[12px]">TTC</span>
          </p>
        </section>

        {/* État d'entrée — compact 2 col */}
        <section className="overflow-hidden rounded-[6px] border border-[#E8E8E8] bg-white">
          <h3 className="border-[#E8E8E8] border-b px-4 py-2 font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wide">
            État d'entrée appareil
          </h3>
          <div className="grid grid-cols-2 divide-x divide-[#E8E8E8]">
            <div className="divide-y divide-[#E8E8E8]">
              {leftRows.map(([label, key]) => (
                <div className="grid grid-cols-[130px_1fr] gap-2 px-3 py-1.5 text-[11px]" key={key}>
                  <span className="text-[#6B6B6B]">{label}</span>
                  <span className="font-medium text-[#1A1916]">{intakeValue(repair, key)}</span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-[#E8E8E8]">
              {rightRows.map(([label, key]) => (
                <div className="grid grid-cols-[130px_1fr] gap-2 px-3 py-1.5 text-[11px]" key={key}>
                  <span className="text-[#6B6B6B]">{label}</span>
                  <span className="font-medium text-[#1A1916]">{intakeValue(repair, key)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Accessoires + Défauts + Déclaration */}
        <div className="grid grid-cols-3 gap-3">
          <DocumentSection title="Accessoires">
            <p className="text-[#1A1916] text-[11px]">{accessories.length ? accessories.join(" · ") : "Aucun"}</p>
          </DocumentSection>
          <DocumentSection title="Défauts visibles">
            <p className="whitespace-pre-wrap text-[#1A1916] text-[11px] leading-relaxed">
              {text(repair.intakeCondition?.visibleDefects, "Aucun défaut signalé")}
            </p>
          </DocumentSection>
          <DocumentSection title="Déclaration client">
            <p className="whitespace-pre-wrap text-[#1A1916] text-[11px] leading-relaxed">
              {text(repair.intakeCondition?.customerStatement, "Aucune déclaration")}
            </p>
          </DocumentSection>
        </div>

        {/* Validation client : affichée uniquement si elle a réellement été
            collectée au moment de la prise en charge (sinon on n'affiche pas
            de cases vides — incohérentes avec le formulaire de création). */}
        <div className="grid grid-cols-[1.35fr_1fr] gap-3">
          {hasCustomerValidation ? (
            <DocumentSection title="Validation client">
              <div className="space-y-1 text-[11px] leading-relaxed">
                {customerValidationRows.map(([label, key]) => {
                  const checked = Boolean(repair.intakeCondition?.[key]);
                  return (
                    <p key={key} className="flex items-start gap-2 text-[#1A1916]">
                      <span
                        className="mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border font-bold text-[9px] leading-none"
                        style={{
                          borderColor: checked ? "#2A9D8F" : "#E8E8E8",
                          backgroundColor: "#FFFFFF",
                          color: "#2A9D8F",
                        }}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {label}
                    </p>
                  );
                })}
              </div>
            </DocumentSection>
          ) : (
            <DocumentSection title="Fait à">
              <p className="text-[#1A1916] text-[11.5px]">
                Fait à {text(ws.city, "Annemasse")}, le {dateLabel(repair.droppedAt)}
              </p>
            </DocumentSection>
          )}
          <IntakeSignatureBlock repair={repair} />
        </div>

        {/* Mentions légales obligatoires */}
        <IntakeLegalMentions workshop={ws} />
      </DocumentPage>

      {hasPhotos && (
        <DocumentPhotoPage
          type="bon-prise-en-charge"
          number={repair.number}
          date={repair.droppedAt}
          workshop={ws}
          photos={photos}
          title="Photos des défauts visibles"
          subtitle="Photos prises au moment du dépôt. Elles servent uniquement à compléter l'état visuel documenté en page 1."
        />
      )}
    </div>
  );
}

function IntakeLegalMentions({ workshop }: Readonly<{ workshop: WorkshopInfo }>) {
  const customTerms = String(workshop.intakeTerms ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  return (
    <DocumentLegalBlock title="Conditions de prise en charge et mentions légales">
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <strong>Sauvegarde des données.</strong> Le client est responsable de la sauvegarde préalable des données
          présentes sur l'appareil. L'atelier ne pourra être tenu responsable d'une éventuelle perte de données pendant
          ou après l'intervention.
        </li>
        {customTerms ? <li className="whitespace-pre-line">{customTerms}</li> : null}
        {workshop.country === "FR" ? (
          <>
            <li>
              <strong>Appareils non récupérés.</strong> Passé un délai de 3 mois après notification de fin de
              réparation, l'appareil pourra être considéré comme abandonné conformément à l'article 1947 du Code civil.
            </li>
            <li>
              <strong>RGPD (art. 13 du règlement UE 2016/679).</strong> Les données collectées sont utilisées uniquement
              pour la gestion de la prise en charge. Les droits d'accès, de rectification, d'effacement et d'opposition
              s'exercent auprès de l'atelier.
            </li>
          </>
        ) : (
          <>
            <li>
              <strong>Appareils non récupérés.</strong> Les modalités de conservation et de récupération sont celles
              communiquées par l'atelier.
            </li>
            <li>
              <strong>Protection des données.</strong> Les données collectées sont utilisées uniquement pour la prise en
              charge, le suivi et les obligations administratives liées au dossier.
            </li>
          </>
        )}
      </ul>
    </DocumentLegalBlock>
  );
}

export function QuoteDocument({
  quote,
  customer,
  repair,
  workshop,
}: Readonly<{ quote: Quote; customer: Customer; repair?: Repair; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? defaultWorkshopInfo;
  return (
    <DocumentPage
      badge={quote.status}
      date={quote.date}
      number={quote.number}
      type="devis"
      workshop={ws}
      qrSlot={repair ? <DocumentTrackingQr url={repair.publicAccess?.url} /> : undefined}
    >
      <DocumentIntro customer={customer} quote={quote} repair={repair} />
      {quote.notes ? (
        <DocumentSection title="Notes">
          <p className="whitespace-pre-wrap text-[#1A1916] text-[11.5px] leading-relaxed">{text(quote.notes)}</p>
        </DocumentSection>
      ) : null}
      <QuoteDevicesTable quote={quote} />
      <TotalsCard currency={quote.currency} lines={quote.lines ?? []} total={getQuoteTotal(quote)} workshop={ws} />
      <NoticeCard title="Validité et accord">
        Devis <strong>gratuit</strong>, valable jusqu'au {dateLabel(quote.expiryDate)}.{" "}
        {text(ws.quoteTerms, "Prix valables sous réserve de disponibilité des pièces.")} Le présent devis n'engage le
        client qu'après acceptation écrite (mention « Bon pour accord » suivie de la date et de la signature).
      </NoticeCard>
      <SignatureGrid accord />
    </DocumentPage>
  );
}

export function InvoiceDocument({
  invoice,
  customer,
  quote,
  repair,
  workshop,
}: Readonly<{ invoice: Invoice; customer: Customer; quote?: Quote; repair?: Repair; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? defaultWorkshopInfo;
  const total = getInvoiceTotal(invoice);
  return (
    <DocumentPage
      badge={invoice.status === "Annulée" ? "Annulée" : invoice.status === "Brouillon" ? "Brouillon" : "Émise"}
      date={invoice.date}
      number={invoice.number}
      type="facture"
      workshop={ws}
      qrSlot={repair ? <DocumentTrackingQr url={repair.publicAccess?.url} /> : undefined}
    >
      <DocumentIntro customer={customer} invoice={invoice} repair={repair} />
      {quote ? (
        <DocumentSection title="Références commerciales">
          <KeyValue label="Devis lié" value={quote.number} />
          <KeyValue label="Source" value={dash(invoice.sourceType)} />
        </DocumentSection>
      ) : null}
      <PremiumTable currency={invoice.currency} repair={repair} rows={invoice.lines ?? []} />
      <TotalsCard currency={invoice.currency} lines={invoice.lines ?? []} total={total} workshop={ws} />
      <InvoiceLegalMentions invoice={invoice} repair={repair} workshop={ws} />
    </DocumentPage>
  );
}

function InvoiceLegalMentions({
  invoice,
  repair,
  workshop,
}: Readonly<{ invoice: Invoice; repair?: Repair; workshop: WorkshopInfo }>) {
  const ws = workshop;
  const issuedAt = invoice.date ? dateLabel(invoice.date) : "Non renseignée";
  const dueLabel = "Paiement à réception de facture";
  const serviceDateRaw = invoice.date;
  const serviceDate = serviceDateRaw ? dateLabel(serviceDateRaw) : issuedAt;
  void repair;

  const isSet = (val: string | undefined | null) => {
    if (!val) return false;
    const trimmed = val.trim();
    return trimmed !== "" && trimmed !== "Non renseigné" && trimmed !== "—";
  };

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[6px] border border-[#E8E8E8] bg-white p-4">
        <h3 className="mb-3 font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wider">Informations facture</h3>
        <div className="space-y-1.5 text-[#1A1916] text-[11.5px]">
          <KeyValue label="Date d'émission" value={issuedAt} />
          <KeyValue label="Date de prestation" value={serviceDate} />
          <KeyValue label="Date d'échéance" value={dueLabel} />
        </div>
        <p className="mt-3 text-[#6B6B6B] text-[10px] leading-relaxed">
          Le règlement est géré en dehors de Behar Tech Pro par Stripe, SumUp ou le système de paiement du réparateur.
        </p>
        {ws.country === "FR" ? (
          <p className="mt-3 text-[#6B6B6B] text-[10px] leading-relaxed">
            Pas d'escompte pour règlement anticipé. En cas de retard de paiement, application des pénalités et frais
            prévus par le Code de commerce français.
          </p>
        ) : null}
      </div>

      <div className="rounded-[6px] border border-[#E8E8E8] bg-white p-4">
        <h3 className="mb-3 font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wider">Émetteur</h3>
        <div className="space-y-1.5 text-[#1A1916] text-[11.5px]">
          <KeyValue label="Raison sociale" value={text(ws.name, "BEHAR • TECH PRO")} />
          {isSet(ws.commercialName) ? <KeyValue label="Nom commercial" value={ws.commercialName} /> : null}
          <KeyValue
            label="Adresse"
            value={[
              text(ws.address),
              text(ws.postalCity, `${dash(ws.postalCode)} ${dash(ws.city)}`),
              getWorkshopCountryLabel(ws.country),
            ]
              .filter(Boolean)
              .join(" — ")}
          />
          {ws.country === "CH" ? (
            <>
              {isSet(ws.swissCanton) ? <KeyValue label="Canton" value={ws.swissCanton} /> : null}
              {isSet(ws.swissUid) ? <KeyValue label="IDE / CHE" value={ws.swissUid} /> : null}
              {ws.vatApplicable && isSet(ws.swissVatNumber) ? (
                <KeyValue label="N° TVA suisse" value={ws.swissVatNumber} />
              ) : null}
            </>
          ) : (
            <>
              {isSet(ws.siret) ? <KeyValue label="SIRET" value={ws.siret} /> : null}
              {ws.vatApplicable && isSet(ws.tvaNumber) ? <KeyValue label="N° TVA" value={ws.tvaNumber} /> : null}
            </>
          )}
          <KeyValue label="Contact" value={`${text(ws.email)} · ${text(ws.phone)}`} />
        </div>
        {!ws.vatApplicable ? (
          <p className="mt-3 text-[#6B6B6B] text-[10px] leading-relaxed">
            {text(
              ws.tvaMention,
              ws.country === "CH" ? "Non assujetti à la TVA" : "TVA non applicable, art. 293 B du CGI",
            )}
          </p>
        ) : null}
      </div>

      {ws.country === "FR" ? (
        <div className="rounded-[6px] border border-[#E8E8E8] bg-white p-4 md:col-span-2">
          <h3 className="mb-2 font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wider">
            Médiation de la consommation
          </h3>
          <p className="text-[#6B6B6B] text-[10px] leading-relaxed">
            Les coordonnées du médiateur de la consommation compétent sont disponibles sur demande auprès de l'atelier.
          </p>
        </div>
      ) : null}

      {isSet(ws.invoiceTerms) ? (
        <div className="rounded-[6px] border border-[#E8E8E8] bg-white p-4 md:col-span-2">
          <h3 className="mb-2 font-bold text-[#2A9D8F] text-[11px] uppercase tracking-wider">
            Mentions complémentaires
          </h3>
          <p className="text-[#6B6B6B] text-[10px] leading-relaxed">{ws.invoiceTerms}</p>
        </div>
      ) : null}
    </section>
  );
}

export function PaymentReceiptDocument({
  payment,
  customer,
  invoice,
  repair,
  workshop,
}: Readonly<{
  payment: Payment;
  customer: Customer;
  invoice?: Invoice;
  repair?: Repair;
  workshop?: WorkshopInfo;
}>) {
  void payment;
  return (
    <DocumentPage
      badge="Archive masquée"
      date={invoice?.date || ""}
      number={invoice?.number || "Document historique"}
      type="recu"
      workshop={workshop}
      qrSlot={repair ? <DocumentTrackingQr url={repair.publicAccess?.url} /> : undefined}
    >
      <DocumentIntro customer={customer} invoice={invoice} repair={repair} />
      <DocumentSection title="Document historique">
        <KeyValue label="Facture liée" value={dash(invoice?.number)} />
        <KeyValue label="Dossier lié" value={dash(repair?.number)} />
      </DocumentSection>
      <NoticeCard title="Données historiques masquées">
        Les informations financières de cet ancien document ne sont plus affichées. Le règlement est géré en dehors de
        Behar Tech Pro par Stripe, SumUp ou le système de paiement du réparateur.
      </NoticeCard>
    </DocumentPage>
  );
}

function InternalPartsTable({ parts, currency }: Readonly<{ parts: RepairPart[]; currency?: WorkshopCurrency }>) {
  const rows = parts.length ? parts : [];
  return (
    <section className="print-avoid-break overflow-hidden rounded-[6px] border border-[#E8E8E8] bg-white print:rounded-none">
      <div className="grid grid-cols-[1fr_90px_90px_90px] border-[#E8E8E8] border-b bg-white px-5 py-2.5 font-bold text-[#6B6B6B] text-[10px] uppercase tracking-wider">
        <span>Pièce / fournisseur</span>
        <span className="text-right">Achat</span>
        <span className="text-right">Vente</span>
        <span className="text-right">Marge</span>
      </div>
      {rows.length ? (
        <div className="divide-y divide-[#E8E8E8]">
          {rows.map((part, index) => {
            const purchase = Number.isFinite(part.purchasePrice) ? part.purchasePrice : 0;
            const sale = Number.isFinite(part.salePrice) ? part.salePrice : 0;
            return (
              <div
                className="grid grid-cols-[1fr_90px_90px_90px] px-5 py-3.5 text-[11.5px]"
                key={`${part.stockItemId}-${index}`}
              >
                <span>
                  <strong className="text-[#1A1916]">{text(part.name, "Pièce")}</strong>
                  <br />
                  <span className="text-[#6B6B6B]">
                    {dash(part.reference)} · Qté {text(part.quantity, "1")}
                  </span>
                </span>
                <span className="text-right text-[#1A1916]">{money(purchase, currency)}</span>
                <span className="text-right text-[#1A1916]">{money(sale, currency)}</span>
                <span className="text-right font-semibold text-[#2A9D8F]">{money(sale - purchase, currency)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-5 py-4 text-[#6B6B6B] text-[12px]">Aucune pièce stock rattachée.</p>
      )}
    </section>
  );
}

export function InternalRepairDocument({
  repair,
  customer,
  workshop,
}: Readonly<{ repair: Repair; customer: Customer; workshop?: WorkshopInfo }>) {
  return (
    <DocumentPage
      badge="Document interne"
      date={repair.droppedAt}
      number={repair.number}
      type="bon-prise-en-charge"
      workshop={workshop}
    >
      <DocumentIntro customer={customer} repair={repair} />
      <DocumentSection title="Diagnostic atelier">
        <KeyValue label="Technicien" value={dash(repair.technician || workshop?.managerSignature)} />
        <KeyValue label="Diagnostic" value={dash(repair.notes || repair.issue)} />
        <KeyValue label="Prix client" value={money(repair.total ?? repair.amount, repair.currency)} />
        <KeyValue label="Fournisseur" value={dash(repair.selectedPriceSnapshot?.fournisseur)} />
        <KeyValue label="Stock utilisé" value={dash(repair.selectedPriceSnapshot?.stockDisponible)} />
        <KeyValue
          label="Snapshot tarif"
          value={dash(repair.selectedPriceSnapshot?.sku ?? repair.selectedPriceSnapshot?.qualite)}
        />
      </DocumentSection>
      <InternalPartsTable currency={repair.currency} parts={repair.parts ?? []} />
      <NoticeCard title="Checklist technique">
        Contrôle visuel, test fonctionnel, nettoyage zone intervention, validation client avant restitution.
      </NoticeCard>
    </DocumentPage>
  );
}

/**
 * Rapport de réparation côté CLIENT : version propre et sûre du dossier.
 * N'expose jamais le prix d'achat, la marge, le fournisseur, le stock ou les notes internes.
 */
export function RepairSummaryDocument({
  repair,
  customer,
  workshop,
}: Readonly<{ repair: Repair; customer: Customer; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? defaultWorkshopInfo;
  const usedParts = (repair.parts ?? []).filter((part) => part.confirmed);
  const testValidated = Boolean(repair.finalTest?.validatedAt);
  return (
    <DocumentPage
      badge="Rapport de réparation"
      date={repair.updatedAt || repair.droppedAt}
      number={repair.number}
      type="bon-prise-en-charge"
      workshop={ws}
      qrSlot={repair ? <DocumentTrackingQr url={repair.publicAccess?.url} /> : undefined}
    >
      <DocumentIntro customer={customer} repair={repair} />
      <DocumentSection title="Intervention réalisée">
        <KeyValue label="Appareil" value={dash(repair.deviceModel || repair.device)} />
        <KeyValue label="Panne signalée" value={dash(repair.issue)} />
        <KeyValue label="Intervention" value={dash(repair.recommendedIntervention || repair.issueType)} />
        <KeyValue label="Technicien" value={dash(repair.technician)} />
        <KeyValue label="Contrôle final" value={testValidated ? "Validé" : "En cours"} />
      </DocumentSection>
      {usedParts.length > 0 && (
        <DocumentSection title="Pièces remplacées">
          {usedParts.map((part) => (
            <KeyValue key={part.stockItemId} label={dash(part.name)} value={`x${part.quantity}`} />
          ))}
        </DocumentSection>
      )}
      <DocumentSection title="Montant & garantie">
        <KeyValue label="Total" value={money(repair.total ?? repair.amount, repair.currency)} />
        <KeyValue label="Garantie" value={dash(repair.diagnosticWarranty || ws.defaultWarranty)} />
      </DocumentSection>
      <NoticeCard title="Garantie">
        {text(
          ws.defaultWarranty,
          "Réparation garantie selon les conditions de l'atelier, hors casse, oxydation et mauvaise utilisation.",
        )}
      </NoticeCard>
    </DocumentPage>
  );
}

export function SaleReceiptDocument({
  sale,
  customer,
  workshop,
}: Readonly<{ sale: Sale; customer: Customer; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? defaultWorkshopInfo;
  return (
    <DocumentPage
      badge={sale.status === "Payée" ? "Acquittée" : "À régler"}
      date={sale.paidAt || sale.createdAt}
      number={sale.number}
      type="recu-vente"
      workshop={ws}
    >
      <DocumentIntro customer={customer} />
      <div className="mt-4">
        <PremiumTable
          currency={sale.currency}
          rows={sale.lines.map((l) => ({
            id: l.id,
            description: [
              l.name,
              l.itemKind === "refurbished-phone" ? "Téléphone reconditionné" : "Accessoire",
              l.conditionLabel ? `État : ${l.conditionLabel}` : "",
              l.serialNumber ? `IMEI / série : ${l.serialNumber}` : "",
              `Garantie : ${l.warrantyMonths ? `${l.warrantyMonths} mois` : "Non renseignée"}`,
            ]
              .filter(Boolean)
              .join(" · "),
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.total,
          }))}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <div className="w-64">
          <TotalsCard
            currency={sale.currency}
            lines={sale.lines.map((l) => ({
              id: l.id,
              description: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.total,
            }))}
            total={sale.total}
          />
        </div>
      </div>
      {sale.paymentMethod && (
        <NoticeCard title="Paiement">
          Réglé — {paymentMethodLabel(sale.paymentMethod)} le {sale.paidAt ? dateLabel(sale.paidAt) : "Non renseigné"}.
          Ce reçu atteste du règlement de la vente comptoir indiquée ci-dessus.
        </NoticeCard>
      )}
      <NoticeCard title="Garantie">
        {sale.lines.some((line) => line.itemKind === "refurbished-phone")
          ? "Les téléphones reconditionnés sont garantis selon la durée indiquée sur la ligne produit, hors casse, oxydation, mauvaise utilisation, perte, vol, accessoires consommables et intervention par un tiers."
          : `Les accessoires et pièces vendus sont garantis selon la durée indiquée sur la ligne produit. ${text(ws.defaultWarranty, "Garantie atelier selon conditions indiquées.")}`}
      </NoticeCard>
    </DocumentPage>
  );
}

export function DiagnosticReportDocument({
  repair,
  customer,
  workshop,
}: Readonly<{ repair: Repair; customer: Customer; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? defaultWorkshopInfo;

  // Collect diagnostic checklist items
  const checklist =
    repair.diagnosisChecklist && repair.diagnosisChecklist.length > 0
      ? repair.diagnosisChecklist
      : (repair.finalTest?.items ?? []);

  // Check if any check has been marked as not fully validated.
  const hasIncompleteOrWarning = checklist.some(
    (item) =>
      item.result === "Non testable" ||
      item.result === "Test repoussé" ||
      item.result === "Non testé" ||
      item.result === "Non applicable",
  );

  return (
    <DocumentPage
      badge="Rapport diagnostic & tests"
      date={repair.updatedAt || repair.droppedAt}
      number={repair.number}
      type="bon-prise-en-charge"
      workshop={ws}
      qrSlot={repair ? <DocumentTrackingQr url={repair.publicAccess?.url} /> : undefined}
    >
      <DocumentIntro customer={customer} repair={repair} />

      <div className="grid grid-cols-2 gap-4">
        <DocumentSection title="Détails diagnostic">
          <KeyValue label="Panne déclarée" value={dash(repair.issue)} />
          <KeyValue label="État d'entrée" value={dash(repair.intakeCondition?.generalCondition ?? "Non renseigné")} />
          <KeyValue label="Accessoires" value={dash(repair.intakeCondition?.accessories?.join(", "))} />
          <KeyValue label="Technicien" value={dash(repair.technician || ws.managerSignature)} />
        </DocumentSection>

        <DocumentSection title="Conclusion technique">
          <KeyValue label="Statut de l'appareil" value={dash(repair.status)} />
          <KeyValue label="Statut test final" value={dash(repair.finalTest?.status)} />
          <KeyValue label="Garantie proposée" value={dash(repair.diagnosticWarranty || ws.defaultWarranty)} />
          <KeyValue
            label="Réf. Diagnostic"
            value={dash(repair.diagnosticNotes || repair.notes || "Aucune note technique")}
          />
        </DocumentSection>
      </div>

      {hasIncompleteOrWarning && (
        <section className="rounded-[6px] border border-[#B54708] bg-white p-4 text-[#B54708]">
          <p className="font-medium text-[12px] leading-relaxed">
            <strong>Notice importante :</strong> Certains tests sont non applicables ou non testés selon le contexte
            réel de l'intervention.
          </p>
        </section>
      )}

      {checklist.length > 0 && (
        <DocumentSection title="Tests réalisés & Résultats">
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2">
            {checklist.map((item) => {
              let textColor = "text-[#6B6B6B]"; // Neutral
              if (item.result === "OK") textColor = "text-[#2A9D8F]";
              if (item.result === "KO" || item.result === "Défaut constaté") textColor = "text-[#B42318]";
              if (item.result === "Test repoussé") textColor = "text-[#B54708]";
              if (item.result === "Non testable") textColor = "text-[#6B6B6B]";

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-[#E8E8E8] border-b pb-1.5 text-[11.5px]"
                >
                  <span className="font-medium text-[#1A1916]">{item.label}</span>
                  <span className={`font-bold text-[11px] ${textColor}`}>
                    {item.result}
                    {item.comment ? ` — ${item.comment}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </DocumentSection>
      )}

      {repair.workshopPhotos && repair.workshopPhotos.length > 0 && (
        <DocumentSection title="Photos associées">
          <div className="mt-1 grid grid-cols-4 gap-2">
            {repair.workshopPhotos
              .filter((p) => p.dataUrl)
              .map((photo, idx) => (
                <div
                  key={photo.id || idx}
                  className="h-20 w-full overflow-hidden rounded-[6px] border border-[#E8E8E8]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.dataUrl} alt={`Diagnostic photo ${idx + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
          </div>
        </DocumentSection>
      )}
    </DocumentPage>
  );
}

export function DocumentById({ id }: Readonly<{ id: string }>) {
  void id;
  return <p>Sélectionnez un document spécifique.</p>;
}
