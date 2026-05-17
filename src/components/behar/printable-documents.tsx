import type { ReactNode } from "react";

import {
  type Customer,
  formatEuro,
  getInvoiceTotal,
  getQuoteTotal,
  getVatSummary,
  type Invoice,
  type Payment,
  type Quote,
  type QuoteLine,
  type Repair,
  type RepairPart,
  type Sale,
  type StockItem,
  type WorkshopInfo,
  workshopInfo as defaultWorkshopInfo,
} from "@/lib/behar-store";
import { formatDeviceLabel } from "@/lib/format-device";

const COLORS = {
  ink: "#1A1916",
  muted: "#6B6B6B",
  accent: "#2A9D8F",
  line: "#E8E8E5",
  soft: "#FAFAF8",
  accentSoft: "#EAF6F2",
};

/**
 * Code couleur par type de document.
 * Le strip en haut + le chip du titre permettent d'identifier le type au
 * premier coup d'œil même si le destinataire reçoit plusieurs PDF.
 */
export type PrintableDocType = "devis" | "facture" | "recu" | "bon-prise-en-charge";

const DOC_THEME: Record<
  PrintableDocType,
  { label: string; accent: string; soft: string; ink: string; chipText: string }
> = {
  devis: {
    label: "DEVIS",
    accent: "#2F6FD0",
    soft: "#E6EFFB",
    ink: "#1E4FA0",
    chipText: "#1E4FA0",
  },
  facture: {
    label: "FACTURE",
    accent: "#2A9D8F",
    soft: "#EAF6F2",
    ink: "#167B70",
    chipText: "#167B70",
  },
  recu: {
    label: "REÇU DE PAIEMENT",
    accent: "#10B981",
    soft: "#E7F8F0",
    ink: "#0B7A56",
    chipText: "#0B7A56",
  },
  "bon-prise-en-charge": {
    label: "BON DE PRISE EN CHARGE",
    accent: "#C2841C",
    soft: "#FCF1DF",
    ink: "#8C5B0E",
    chipText: "#8C5B0E",
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

function money(value: unknown): string {
  const parsed = typeof value === "number" ? value : Number(value);
  return formatEuro(Number.isFinite(parsed) ? parsed : 0);
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
  const alreadyDetailed = normalizedBase.includes(device.toLowerCase()) || (issue && normalizedBase.includes(issue.toLowerCase()));
  return alreadyDetailed ? base : `${device} — ${issue || base}`;
}

function Badge({ children, tone = "accent" }: Readonly<{ children: ReactNode; tone?: "accent" | "neutral" }>) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 font-semibold text-[11px] ${
        tone === "accent" ? "bg-[#EAF6F2] text-[#167B70]" : "bg-[#FAFAF8] text-[#6B6B6B]"
      }`}
    >
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

function PremiumCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="print-avoid-break rounded-[14px] border border-[#E8E8E5] bg-white p-4 shadow-[0_12px_30px_rgba(26,25,22,0.035)] print:rounded-none print:shadow-none">
      <h3 className="mb-3 font-semibold text-[#1A1916] text-[13px] uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ClientCard({ customer }: Readonly<{ customer?: Customer | null }>) {
  return (
    <PremiumCard title="Client">
      <KeyValue label="Nom" value={customerName(customer)} />
      <KeyValue label="Téléphone" value={dash(customer?.phone)} />
      <KeyValue label="Email" value={dash(customer?.email)} />
      <KeyValue label="Adresse" value={dash(customer?.address)} />
    </PremiumCard>
  );
}

function RepairCard({ repair, invoice, quote }: Readonly<{ repair?: Repair | null; invoice?: Invoice; quote?: Quote }>) {
  return (
    <PremiumCard title="Dossier / Appareil">
      <KeyValue label="Dossier" value={dash(repair?.number ?? invoice?.sourceNumber ?? quote?.number)} />
      <KeyValue label="Appareil" value={deviceName(repair)} />
      <KeyValue label="Intervention" value={dash(repair?.issue)} />
      <KeyValue label="Statut" value={dash(repair?.status ?? invoice?.status ?? quote?.status)} />
      <KeyValue label="Prise en charge" value={repair?.droppedAt ? dateLabel(repair.droppedAt) : "Non renseigné"} />
    </PremiumCard>
  );
}

function DocumentHeader({
  type,
  number,
  date,
  badge,
  workshop,
}: Readonly<{
  type: PrintableDocType;
  number?: string;
  date?: string;
  badge?: string;
  workshop: WorkshopInfo;
}>) {
  const atelierName = text(workshop.name, "BEHAR • TECH PRO");
  const theme = DOC_THEME[type];
  return (
    <header className="flex items-start justify-between gap-8 border-b border-[#E8E8E5] pb-6">
      <div className="max-w-[470px]">
        <div className="text-[12px] leading-relaxed text-[#6B6B6B]">
          <p className="font-semibold text-[#1A1916] text-[15px] tracking-tight">{atelierName}</p>
          {workshop.commercialName ? <p>{text(workshop.commercialName)}</p> : null}
          <p>{text(workshop.address)}</p>
          <p>
            {text(workshop.postalCity, `${dash(workshop.postalCode)} ${dash(workshop.city)}`)}, {text(workshop.country, "France")}
          </p>
          <p>SIRET : {text(workshop.siret)}</p>
          {workshop.tvaNumber ? <p>TVA intracom. : {text(workshop.tvaNumber)}</p> : null}
          <p>{text(workshop.email)} · {text(workshop.phone)}</p>
        </div>
      </div>

      <div className="min-w-[245px] text-right">
        <span
          className="inline-flex rounded-full px-3.5 py-1.5 font-bold text-[11px] uppercase tracking-[0.16em]"
          style={{ backgroundColor: theme.soft, color: theme.chipText }}
        >
          {theme.label}
        </span>
        <p className="mt-4 font-mono font-semibold text-[#1A1916] text-[20px] tracking-tight">{dash(number)}</p>
        <p className="mt-1 text-[#6B6B6B] text-[12px]">Émis le {date ? dateLabel(date) : "Non renseigné"}</p>
        {badge ? <div className="mt-3"><Badge>{badge}</Badge></div> : null}
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
  return (
    <footer className="mt-auto border-t border-[#E8E8E5] pt-6 text-[#8A8984] text-[10px] leading-relaxed">
      {methods.length ? <p>Moyens de paiement acceptés : {methods.join(" · ")}</p> : null}
      {workshop.documentFooter ? <p>{text(workshop.documentFooter)}</p> : null}
      <p>
        {text(workshop.name, "BEHAR • TECH PRO")} · SIRET {text(workshop.siret)} · {text(workshop.email)} ·{" "}
        {text(workshop.phone)} · Page {page}/{pageCount}
      </p>
    </footer>
  );
}

function DocumentLayout({
  type,
  number,
  date,
  badge,
  workshop = defaultWorkshopInfo,
  children,
  page = 1,
  pageCount = 1,
}: Readonly<{
  type: PrintableDocType;
  number?: string;
  date?: string;
  badge?: string;
  workshop?: WorkshopInfo;
  children: ReactNode;
  page?: number;
  pageCount?: number;
}>) {
  const ws = workshop ?? defaultWorkshopInfo;
  const theme = DOC_THEME[type];
  return (
    <article
      className="print-document pdf-page relative mx-auto flex min-h-[1123px] w-full max-w-[860px] flex-col overflow-hidden rounded-[18px] border border-[#E8E8E5] bg-white p-8 text-[#1A1916] shadow-[0_18px_60px_rgba(26,25,22,0.06)] print:min-h-screen print:rounded-none print:border-0 print:p-6 print:shadow-none"
      style={{ color: COLORS.ink }}
    >
      {/* Bande de couleur en haut du doc, code visuel par type */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: theme.accent }}
      />
      <DocumentHeader badge={badge} date={date} number={number} type={type} workshop={ws} />
      <main className="flex-1 space-y-5 py-6">{children}</main>
      <DocumentFooter workshop={ws} page={page} pageCount={pageCount} />
    </article>
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

function PremiumTable({ rows, repair }: Readonly<{ rows: QuoteLine[]; repair?: Repair }>) {
  const safeRows = rows.length ? rows : [{ id: "empty", description: "Prestation atelier", quantity: 1, unitPrice: 0, total: 0 }];
  return (
    <section className="print-avoid-break overflow-hidden rounded-[14px] border border-[#E8E8E5] bg-white print:rounded-none">
      <div className="grid grid-cols-[1fr_70px_112px_112px] bg-[#FAFAF8] px-4 py-3 font-semibold text-[#6B6B6B] text-[11px] uppercase tracking-wide">
        <span>Désignation</span>
        <span className="text-center">Qté</span>
        <span className="text-right">Prix unitaire</span>
        <span className="text-right">Total</span>
      </div>
      <div className="divide-y divide-[#E8E8E5]">
        {safeRows.map((line) => (
          <div className="grid grid-cols-[1fr_70px_112px_112px] items-center px-4 py-4 text-[13px]" key={line.id}>
            <span className="font-medium text-[#1A1916]">{serviceDescription(line, repair)}</span>
            <span className="text-center text-[#6B6B6B]">{text(line.quantity, "1")}</span>
            <span className="text-right text-[#6B6B6B]">{money(line.unitPrice)}</span>
            <span className="text-right font-semibold">{money(line.total ?? (line.quantity ?? 0) * (line.unitPrice ?? 0))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TotalsCard({
  lines,
  total,
  workshop,
  paid = 0,
  showBalance = false,
}: Readonly<{ lines: QuoteLine[]; total: number; workshop?: WorkshopInfo; paid?: number; showBalance?: boolean }>) {
  const ws = workshop ?? defaultWorkshopInfo;
  const vat = getVatSummary(lines, ws);
  const finalTotal = ws.vatApplicable ? vat.ttc : total;
  const balance = Math.max(finalTotal - paid, 0);
  return (
    <section className="ml-auto w-full max-w-[360px] rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] p-4">
      {ws.vatApplicable ? (
        <>
          <TotalLine label="Sous-total HT" value={money(vat.ht)} />
          <TotalLine label={`TVA ${Math.round(vat.rate * 100)}%`} value={money(vat.tva)} />
        </>
      ) : (
        <p className="mb-3 text-right text-[#6B6B6B] text-[11px]">
          {text(ws.tvaMention, "TVA non applicable, art. 293 B du CGI")}
        </p>
      )}
      <TotalLine emphasize label={showBalance ? "Total facture" : "Total à payer"} value={money(finalTotal)} />
      {showBalance ? (
        <>
          <TotalLine label="Montant payé" value={money(paid)} />
          <TotalLine emphasize label="Reste à payer" value={money(balance)} />
        </>
      ) : null}
    </section>
  );
}

function TotalLine({ label, value, emphasize }: Readonly<{ label: string; value: string; emphasize?: boolean }>) {
  return (
    <div className={`flex justify-between gap-5 border-b border-[#E8E8E5] py-2 last:border-b-0 ${emphasize ? "font-semibold text-[#1A1916]" : "text-[#6B6B6B]"}`}>
      <span>{label}</span>
      <span className={emphasize ? "text-[#1A1916] text-[18px] font-semibold" : "text-[#1A1916]"}>{value}</span>
    </div>
  );
}

function SignatureGrid({ accord = false }: Readonly<{ accord?: boolean }>) {
  return (
    <section className="grid gap-5 md:grid-cols-2">
      <SignatureBox title={accord ? "Bon pour accord" : "Signature client"} />
      <SignatureBox title="Responsable atelier" />
    </section>
  );
}

function SignatureBox({ title }: Readonly<{ title: string }>) {
  return (
    <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-5">
      <p className="font-semibold text-[#6B6B6B] text-[11px] uppercase tracking-wide">{title}</p>
      <div className="mt-14 border-t border-[#E8E8E5] pt-2 text-[#6B6B6B] text-[10px]">Date et signature</div>
    </div>
  );
}

function NoticeCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] p-5">
      <h3 className="mb-2 font-semibold text-[#1A1916] text-[13px]">{title}</h3>
      <div className="text-[#6B6B6B] text-[12px] leading-relaxed">{children}</div>
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

function IntakeBox({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="rounded-[10px] border border-[#E8E8E5] bg-white p-3">
      <h3 className="mb-2 font-bold text-[#8C5B0E] text-[11px] uppercase tracking-wide">{title}</h3>
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
            className={`grid size-5 place-items-center rounded-full border text-[8px] font-bold ${
              order ? "border-[#8C5B0E] bg-[#FCF1DF] text-[#8C5B0E]" : "border-[#D8D8D2] bg-white text-transparent"
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
    <IntakeBox title="Signature">
      <div className="min-h-[92px] rounded-[8px] border border-dashed border-[#D8D8D2] bg-[#FAFAF8] p-2">
        {hasSignature ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Signature client" className="h-[64px] w-full object-contain" src={intake?.signatureDataUrl} />
        ) : (
          <div className="grid h-[64px] place-items-center text-[#8A8984] text-[11px]">À signer</div>
        )}
      </div>
      <div className="mt-2 grid gap-1">
        <IntakeKeyValue label="Signataire" value={hasSignature ? text(intake?.signedBy ?? intake?.signerName, "Client") : "Client"} />
        <IntakeKeyValue label="Date" value={hasSignature && signedAt ? dateTimeLabel(signedAt) : "À signer"} />
      </div>
    </IntakeBox>
  );
}

function PaymentHero({ amount, method, date }: Readonly<{ amount: number; method?: string; date?: string }>) {
  return (
    <section className="rounded-[18px] border border-[#DDEFEA] bg-[#EAF6F2] p-7 text-center">
      <p className="text-[#167B70] text-[12px] uppercase tracking-[0.18em]">Montant reçu</p>
      <p className="mt-2 font-semibold text-[#1A1916] text-[36px] leading-none">{money(amount)}</p>
      <p className="mt-3 text-[#6B6B6B] text-[13px]">
        {dash(method)} · {date ? dateLabel(date) : "Non renseigné"}
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
  const photos = (repair.intakeCondition?.photos ?? []).filter((photo) => photo.dataUrl);
  const hasPhotos = photos.length > 0;
  const pageCount = hasPhotos ? 2 : 1;
  const accessories = intakeAccessories(repair);
  const isValidated = Boolean(
    repair.intakeCondition?.customerConfirmed &&
      repair.intakeCondition?.diagnosticAuthorized &&
      repair.intakeCondition?.nonTestableAccepted &&
      text(repair.intakeCondition?.signatureDataUrl, "") &&
      text(repair.intakeCondition?.signatureSignedAt ?? repair.intakeCondition?.signedAt, ""),
  );

  return (
    <div className="print-document mx-auto flex w-full max-w-[794px] flex-col gap-6 text-[#1A1916]" data-pdf-paginate="true">
      <DocumentLayout
        type="bon-prise-en-charge"
        number={repair.number}
        date={repair.droppedAt}
        badge={isValidated ? "Signé" : "À signer"}
        workshop={ws}
        page={1}
        pageCount={pageCount}
      >
        {/* Client + Appareil */}
        <div className="grid grid-cols-2 gap-3">
          <IntakeBox title="Client">
            <IntakeKeyValue label="Nom" value={customerName(customer)} />
            <IntakeKeyValue label="Téléphone" value={text(customer.phone)} />
            <IntakeKeyValue label="Email" value={text(customer.email)} />
            {customer.address ? <IntakeKeyValue label="Adresse" value={text(customer.address)} /> : null}
          </IntakeBox>
          <IntakeBox title="Appareil">
            <IntakeKeyValue label="Type · Marque" value={`${text(repair.deviceType)} · ${text(repair.brandName)}`} />
            <IntakeKeyValue label="Modèle" value={text(repair.deviceModel ?? repair.model)} />
            <IntakeKeyValue label="IMEI / série" value={text(repair.imei)} />
            <IntakeKeyValue label="Accès appareil" value={accessSummary(repair)} />
            {repair.intakeCondition?.accessMethod === "Schéma" ? <PatternMini points={repair.intakeCondition.patternData?.points} /> : null}
          </IntakeBox>
        </div>

        {/* Intervention */}
        <IntakeBox title="Intervention">
          <div className="grid grid-cols-3 gap-3">
            <IntakeKeyValue label="Demande" value={text(repair.issue)} />
            <IntakeKeyValue label="Statut" value={text(repair.status)} />
            <IntakeKeyValue label="Date dépôt" value={dateLabel(repair.droppedAt)} />
          </div>
        </IntakeBox>

        {/* État d'entrée — compact 2 col */}
        <section className="overflow-hidden rounded-[10px] border border-[#E8E8E5] bg-white">
          <h3 className="border-[#E8E8E5] border-b px-4 py-2.5 font-bold text-[#8C5B0E] text-[12px] uppercase tracking-wide">
            État d'entrée appareil
          </h3>
          <div className="grid grid-cols-2">
            {intakeRows.map(([label, key]) => (
              <div className="grid grid-cols-[130px_1fr] gap-2 border-[#E8E8E5] border-b px-3 py-1.5 text-[11.5px]" key={key}>
                <span className="text-[#6B6B6B]">{label}</span>
                <span className="font-medium">{intakeValue(repair, key)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Accessoires + Défauts + Déclaration */}
        <div className="grid grid-cols-3 gap-3">
          <IntakeBox title="Accessoires">
            <p className="text-[11.5px]">{accessories.length ? accessories.join(" · ") : "Aucun."}</p>
          </IntakeBox>
          <IntakeBox title="Défauts visibles">
            <p className="min-h-[42px] whitespace-pre-wrap text-[11.5px] leading-relaxed">
              {text(repair.intakeCondition?.visibleDefects)}
            </p>
          </IntakeBox>
          <IntakeBox title="Déclaration client">
            <p className="min-h-[42px] whitespace-pre-wrap text-[11.5px] leading-relaxed">
              {text(repair.intakeCondition?.customerStatement)}
            </p>
          </IntakeBox>
        </div>

        {/* Validation + Signature */}
        <div className="grid grid-cols-[1.35fr_1fr] gap-3">
          <IntakeBox title="Validation client">
            <div className="space-y-1.5 text-[11.5px] leading-relaxed">
              {customerValidationRows.map(([label, key]) => {
                const checked = Boolean(repair.intakeCondition?.[key]);
                return (
                  <p key={key} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] font-bold leading-none"
                      style={{
                        borderColor: checked ? "#8C5B0E" : "#CFCFCA",
                        backgroundColor: checked ? "#FCF1DF" : "white",
                        color: "#8C5B0E",
                      }}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    {label}
                  </p>
                );
              })}
            </div>
          </IntakeBox>
          <IntakeSignatureBlock repair={repair} />
        </div>

        {/* Mentions légales obligatoires */}
        <IntakeLegalMentions workshop={ws} />
      </DocumentLayout>

      {hasPhotos && (
        <DocumentLayout
          type="bon-prise-en-charge"
          number={repair.number}
          date={repair.droppedAt}
          badge="Annexe photos"
          workshop={ws}
          page={2}
          pageCount={2}
        >
          <h2 className="font-bold text-[#8C5B0E] text-[14px] uppercase tracking-wide">Photos de l'appareil (facultatives)</h2>
          <p className="mt-2 text-[#6B6B6B] text-[12px] leading-relaxed">
            Photos prises au moment du dépôt. Elles servent uniquement à compléter l'état visuel
            documenté en page 1.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {photos.slice(0, 6).map((photo) => (
              <div className="overflow-hidden rounded-[10px] border border-[#E8E8E5] bg-[#FAFAF8]" key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={photo.name} className="h-[220px] w-full object-cover" src={photo.dataUrl} />
              </div>
            ))}
          </div>
        </DocumentLayout>
      )}
    </div>
  );
}

/**
 * Mentions légales / informations obligatoires pour un bon de prise en charge
 * en France : RGPD (art. 13 du règlement UE 2016/679), sauvegarde des données
 * (responsabilité du client), conditions personnalisées de l'atelier,
 * appareils non récupérés et information RGPD.
 */
function IntakeLegalMentions({ workshop }: Readonly<{ workshop: WorkshopInfo }>) {
  const customTerms = String(workshop.intakeTerms ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  return (
    <section className="rounded-[10px] border border-[#E8E8E5] bg-[#FAFAF8] p-4">
      <h3 className="mb-2 font-bold text-[#8C5B0E] text-[11px] uppercase tracking-wide">
        Conditions de prise en charge et mentions légales
      </h3>
      <ul className="space-y-1.5 text-[10.5px] text-[#1A1916] leading-relaxed">
        <li>
          <strong>Sauvegarde des données.</strong> Le client est responsable de la sauvegarde préalable des
          données présentes sur l'appareil. L'atelier ne pourra être tenu responsable d'une éventuelle perte
          de données pendant ou après l'intervention.
        </li>
        {customTerms ? <li className="whitespace-pre-line">{customTerms}</li> : null}
        <li>
          <strong>Appareils non récupérés.</strong> Passé un délai de 3 mois après notification de fin de
          réparation, l'appareil pourra être considéré comme abandonné conformément à l'article 1947 du
          Code civil.
        </li>
        <li>
          <strong>RGPD (art. 13 du règlement UE 2016/679).</strong> Les données collectées (identité,
          coordonnées, informations appareil) sont utilisées uniquement pour la gestion de la prise en
          charge, conservées pendant la durée légale de garantie puis 5 ans à titre comptable. Le client
          dispose d'un droit d'accès, de rectification, d'effacement et d'opposition exerçable auprès de
          l'atelier.
        </li>
      </ul>
    </section>
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
    <DocumentLayout badge={quote.status} date={quote.date} number={quote.number} type="devis" workshop={ws}>
      <DocumentIntro customer={customer} quote={quote} repair={repair} />
      <PremiumTable repair={repair} rows={quote.lines ?? []} />
      <TotalsCard lines={quote.lines ?? []} total={getQuoteTotal(quote)} workshop={ws} />
      <NoticeCard title="Validité et accord">
        Devis <strong>gratuit</strong>, valable jusqu'au {dateLabel(quote.expiryDate)}.{" "}
        {text(ws.quoteTerms, "Prix valables sous réserve de disponibilité des pièces.")} Le présent devis n'engage le
        client qu'après acceptation écrite (mention « Bon pour accord » suivie de la date et de la signature).
      </NoticeCard>
      <SignatureGrid accord />
    </DocumentLayout>
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
  const paidAmount = Math.max(invoice.paidAmount ?? 0, invoice.status === "Payée" ? total : 0);
  return (
    <DocumentLayout
      badge={invoice.status === "Payée" ? "Payée" : "À régler"}
      date={invoice.date}
      number={invoice.number}
      type="facture"
      workshop={ws}
    >
      <DocumentIntro customer={customer} invoice={invoice} repair={repair} />
      {quote ? (
        <PremiumCard title="Références commerciales">
          <KeyValue label="Devis lié" value={quote.number} />
          <KeyValue label="Source" value={dash(invoice.sourceType)} />
        </PremiumCard>
      ) : null}
      <PremiumTable repair={repair} rows={invoice.lines ?? []} />
      <TotalsCard lines={invoice.lines ?? []} paid={paidAmount} showBalance total={total} workshop={ws} />
      <InvoiceLegalMentions invoice={invoice} repair={repair} workshop={ws} />
    </DocumentLayout>
  );
}

/**
 * Mentions obligatoires sur une facture française (art. 242 nonies A CGI,
 * art. L441-9 Code de commerce, art. L441-10 pour les pénalités, art. L612-1
 * du Code de la consommation pour la médiation B2C).
 */
function InvoiceLegalMentions({
  invoice,
  repair,
  workshop,
}: Readonly<{ invoice: Invoice; repair?: Repair; workshop: WorkshopInfo }>) {
  const ws = workshop;
  const issuedAt = invoice.date ? dateLabel(invoice.date) : "Non renseignée";
  const paid = invoice.status === "Payée";
  const dueLabel = paid ? "Réglée" : "Paiement à réception de facture";
  // Date de prestation : date à laquelle le service a été rendu.
  // Pour une répa, on prend la date de paiement (souvent égale à la remise),
  // sinon la date de la facture.
  const serviceDateRaw = invoice.paidAt ?? invoice.date;
  const serviceDate = serviceDateRaw ? dateLabel(serviceDateRaw) : issuedAt;
  void repair;
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-5 print:rounded-none">
        <h3 className="mb-3 font-semibold text-[#1A1916] text-[13px] uppercase tracking-wide">Conditions de règlement</h3>
        <dl className="grid gap-1 text-[12px] text-[#1A1916]">
          <KeyValue label="Date d'émission" value={issuedAt} />
          <KeyValue label="Date de prestation" value={serviceDate} />
          <KeyValue label="Date d'échéance" value={dueLabel} />
          <KeyValue label="Mode de règlement" value={dash(invoice.paymentMethod)} />
          {invoice.paidAt ? <KeyValue label="Date de paiement" value={dateLabel(invoice.paidAt)} /> : null}
        </dl>
        <p className="mt-3 text-[10px] leading-relaxed text-[#6B6B6B]">
          Pas d'escompte pour règlement anticipé. En cas de retard de paiement, application de pénalités au taux de trois
          fois le taux d'intérêt légal en vigueur (art. L441-10 Code de commerce), exigibles sans rappel préalable, ainsi
          qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (art. D441-5 Code de commerce).
        </p>
      </div>

      <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-5 print:rounded-none">
        <h3 className="mb-3 font-semibold text-[#1A1916] text-[13px] uppercase tracking-wide">Émetteur</h3>
        <dl className="grid gap-1 text-[12px] text-[#1A1916]">
          <KeyValue label="Raison sociale" value={text(ws.name, "BEHAR • TECH PRO")} />
          {ws.commercialName ? <KeyValue label="Nom commercial" value={text(ws.commercialName)} /> : null}
          <KeyValue
            label="Adresse"
            value={[
              text(ws.address),
              text(ws.postalCity, `${dash(ws.postalCode)} ${dash(ws.city)}`),
              text(ws.country, "France"),
            ]
              .filter(Boolean)
              .join(" — ")}
          />
          <KeyValue label="SIRET / SIREN" value={text(ws.siret)} />
          {ws.tvaNumber ? <KeyValue label="N° TVA intracom." value={text(ws.tvaNumber)} /> : null}
          <KeyValue label="Contact" value={`${text(ws.email)} · ${text(ws.phone)}`} />
        </dl>
        {!ws.vatApplicable ? (
          <p className="mt-3 text-[10px] leading-relaxed text-[#6B6B6B]">
            {text(ws.tvaMention, "TVA non applicable, art. 293 B du CGI")}
          </p>
        ) : null}
      </div>

      {/* Médiation de la consommation : obligatoire pour les pros qui vendent à des particuliers
          (art. L612-1 du Code de la consommation). */}
      <div className="md:col-span-2 rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] p-5 print:rounded-none">
        <h3 className="mb-2 font-semibold text-[#1A1916] text-[13px]">Médiation de la consommation</h3>
        <p className="text-[#6B6B6B] text-[11px] leading-relaxed">
          Conformément à l'article L612-1 du Code de la consommation, en cas de litige et après avoir contacté notre
          service client, le consommateur peut recourir gratuitement à un médiateur de la consommation en vue d'une
          résolution amiable du litige. Les coordonnées du médiateur compétent sont disponibles sur demande auprès
          de l'atelier.
        </p>
      </div>

      {ws.invoiceTerms ? (
        <div className="md:col-span-2 rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] p-5 print:rounded-none">
          <h3 className="mb-2 font-semibold text-[#1A1916] text-[13px]">Mentions complémentaires</h3>
          <p className="text-[#6B6B6B] text-[11px] leading-relaxed">{text(ws.invoiceTerms)}</p>
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
  const invoiceTotal = invoice ? getInvoiceTotal(invoice) : payment.amount;
  const isFullSettlement = invoice ? Math.abs(payment.amount - invoiceTotal) < 0.01 : true;
  return (
    <DocumentLayout
      badge={isFullSettlement ? "Acquit pour solde" : "Acompte"}
      date={payment.date}
      number={payment.paymentNumber}
      type="recu"
      workshop={workshop}
    >
      <DocumentIntro customer={customer} invoice={invoice} repair={repair} />
      <PaymentHero amount={payment.amount} date={payment.date} method={payment.method} />
      <PremiumCard title="Détails du règlement">
        <KeyValue label="Facture liée" value={dash(invoice?.number)} />
        <KeyValue label="Référence" value={dash(payment.reference ?? payment.paymentNumber)} />
        <KeyValue label="Mode" value={dash(payment.method ?? payment.mode)} />
        <KeyValue label="Statut" value={dash(payment.status)} />
      </PremiumCard>
      <NoticeCard title={isFullSettlement ? "Acquit pour solde de tout compte" : "Reçu d'acompte"}>
        {isFullSettlement
          ? `Le présent reçu vaut acquit pour solde de tout compte de la facture ${dash(invoice?.number)}. Aucune somme ne reste due au titre de la prestation associée.`
          : `Le présent reçu constate un acompte sur la facture ${dash(invoice?.number)}. Le solde restant à régler reste exigible selon les conditions de la facture.`}
      </NoticeCard>
    </DocumentLayout>
  );
}

function InternalPartsTable({ parts }: Readonly<{ parts: RepairPart[] }>) {
  const rows = parts.length ? parts : [];
  return (
    <section className="overflow-hidden rounded-[14px] border border-[#E8E8E5] bg-white print:rounded-none">
      <div className="grid grid-cols-[1fr_90px_90px_90px] bg-[#FAFAF8] px-5 py-3 font-semibold text-[#6B6B6B] text-[11px] uppercase tracking-wide">
        <span>Pièce / fournisseur</span>
        <span className="text-right">Achat</span>
        <span className="text-right">Vente</span>
        <span className="text-right">Marge</span>
      </div>
      {rows.length ? (
        <div className="divide-y divide-[#E8E8E5]">
          {rows.map((part, index) => {
            const purchase = Number.isFinite(part.purchasePrice) ? part.purchasePrice : 0;
            const sale = Number.isFinite(part.salePrice) ? part.salePrice : 0;
            return (
              <div className="grid grid-cols-[1fr_90px_90px_90px] px-5 py-4 text-[12px]" key={`${part.stockItemId}-${index}`}>
                <span>
                  <strong>{text(part.name, "Pièce")}</strong>
                  <br />
                  <span className="text-[#6B6B6B]">{dash(part.reference)} · Qté {text(part.quantity, "1")}</span>
                </span>
                <span className="text-right">{money(purchase)}</span>
                <span className="text-right">{money(sale)}</span>
                <span className="text-right font-semibold text-[#2A9D8F]">{money(sale - purchase)}</span>
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
    <DocumentLayout
      badge="Document interne"
      date={repair.droppedAt}
      number={repair.number}
      type="bon-prise-en-charge"
      workshop={workshop}
    >
      <DocumentIntro customer={customer} repair={repair} />
      <PremiumCard title="Diagnostic atelier">
        <KeyValue label="Technicien" value={dash(repair.technician || workshop?.managerSignature)} />
        <KeyValue label="Diagnostic" value={dash(repair.notes || repair.issue)} />
        <KeyValue label="Prix client" value={money(repair.total ?? repair.amount)} />
        <KeyValue label="Fournisseur" value={dash(repair.selectedPriceSnapshot?.fournisseur)} />
        <KeyValue label="Stock utilisé" value={dash(repair.selectedPriceSnapshot?.stockDisponible)} />
        <KeyValue label="Snapshot tarif" value={dash(repair.selectedPriceSnapshot?.sku ?? repair.selectedPriceSnapshot?.qualite)} />
      </PremiumCard>
      <InternalPartsTable parts={repair.parts ?? []} />
      <NoticeCard title="Checklist technique">
        Contrôle visuel, test fonctionnel, nettoyage zone intervention, validation client avant restitution.
      </NoticeCard>
    </DocumentLayout>
  );
}

export function SaleReceiptDocument({
  sale,
  customer,
  workshop,
}: Readonly<{ sale: Sale; customer: Customer; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? defaultWorkshopInfo;
  return (
    <DocumentLayout
      badge={sale.status === "Payée" ? "Acquittée" : "À régler"}
      date={sale.paidAt || sale.createdAt}
      number={sale.number}
      type="facture"
      workshop={ws}
    >
      <DocumentIntro customer={customer} />
      <div className="mt-8">
        <PremiumTable
          rows={sale.lines.map(l => ({
            id: l.id,
            description: [
              l.name,
              l.itemKind === "refurbished-phone" ? "Téléphone reconditionné" : "Accessoire",
              l.conditionLabel ? `État : ${l.conditionLabel}` : "",
              l.serialNumber ? `IMEI / série : ${l.serialNumber}` : "",
              `Garantie : ${l.warrantyMonths ? `${l.warrantyMonths} mois` : "Non renseignée"}`,
            ].filter(Boolean).join(" · "),
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.total
          }))}
        />
      </div>
      <div className="mt-8 flex justify-end">
        <div className="w-64">
          <TotalsCard
            lines={sale.lines.map(l => ({
              id: l.id,
              description: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.total
            }))}
            total={sale.total}
          />
        </div>
      </div>
      {sale.paymentMethod && (
        <NoticeCard title="Paiement">
          Règlement effectué par {sale.paymentMethod} le {sale.paidAt?.split("T")[0]}.
        </NoticeCard>
      )}
      <NoticeCard title="Garantie">
        {sale.lines.some((line) => line.itemKind === "refurbished-phone")
          ? "Les téléphones reconditionnés sont garantis selon la durée indiquée sur la ligne produit, hors casse, oxydation, mauvaise utilisation, perte, vol, accessoires consommables et intervention par un tiers."
          : `Les accessoires et pièces vendus sont garantis selon la durée indiquée sur la ligne produit. ${text(ws.defaultWarranty, "Garantie atelier selon conditions indiquées.")}`}
      </NoticeCard>
    </DocumentLayout>
  );
}

export function DocumentById({ id }: Readonly<{ id: string }>) {

  void id;
  return <p>Sélectionnez un document spécifique.</p>;
}
