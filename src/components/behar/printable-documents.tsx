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

const COLORS = {
  ink: "#1A1916",
  muted: "#6B6B6B",
  accent: "#2A9D8F",
  line: "#E8E8E5",
  soft: "#FAFAF8",
  accentSoft: "#EAF6F2",
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
  if (!repair) return "Appareil non renseigné";
  const brand = text(repair.brandName, "").trim();
  const model = text(repair.deviceModel ?? repair.model, "").trim();
  const combined = `${brand} ${model}`.replace(/\s+/g, " ").trim();
  return combined || text(repair.device, "Appareil non renseigné");
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

function initials(workshop: WorkshopInfo): string {
  return text(workshop.name, defaultWorkshopInfo.name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
    <div className="grid grid-cols-[112px_1fr] gap-3 text-[12px] leading-relaxed">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}

function PremiumCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="print-avoid-break rounded-[14px] border border-[#E8E8E5] bg-white p-5 shadow-[0_12px_30px_rgba(26,25,22,0.035)] print:rounded-none print:shadow-none">
      <h3 className="mb-4 font-semibold text-[#1A1916] text-[13px] uppercase tracking-wide">{title}</h3>
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
  title,
  number,
  date,
  badge,
  workshop,
}: Readonly<{ title: string; number?: string; date?: string; badge?: string; workshop: WorkshopInfo }>) {
  const logo = workshop.showLogo !== false ? workshop.logoUrl?.trim() : "";
  const atelierName = text(workshop.name, defaultWorkshopInfo.name);
  return (
    <header className="flex items-start justify-between gap-10 border-b border-[#E8E8E5] pb-8">
      <div className="flex max-w-[390px] gap-4">
        {logo ? (
          <img src={logo} alt={atelierName} className="h-14 w-14 rounded-[14px] object-contain" />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] font-semibold text-[#2A9D8F] text-lg">
            {initials(workshop) || "BT"}
          </div>
        )}
        <div className="text-[12px] leading-relaxed text-[#6B6B6B]">
          <p className="font-semibold text-[#1A1916] text-[16px] tracking-tight">{atelierName}</p>
          {workshop.commercialName ? <p>{text(workshop.commercialName)}</p> : null}
          <p>{text(workshop.address)}</p>
          <p>
            {text(workshop.postalCity, `${dash(workshop.postalCode)} ${dash(workshop.city)}`)}, {text(workshop.country, "France")}
          </p>
          <p>SIRET : {text(workshop.siret)}</p>
          {workshop.tvaNumber ? <p>TVA : {text(workshop.tvaNumber)}</p> : null}
          <p>{text(workshop.email)} · {text(workshop.phone)}</p>
        </div>
      </div>

      <div className="min-w-[220px] text-right">
        <p className="mb-2 text-[#6B6B6B] text-[11px] uppercase tracking-[0.18em]">Document atelier</p>
        <h2 className="font-semibold text-[#1A1916] text-[30px] leading-tight">{title}</h2>
        <p className="mt-2 font-semibold text-[#1A1916] text-base">{dash(number)}</p>
        <p className="mt-1 text-[#6B6B6B] text-[12px]">{date ? dateLabel(date) : "Non renseigné"}</p>
        {badge ? <div className="mt-4"><Badge>{badge}</Badge></div> : null}
      </div>
    </header>
  );
}

function DocumentFooter({ workshop }: Readonly<{ workshop: WorkshopInfo }>) {
  const methods = workshop.acceptedPaymentMethods?.filter(Boolean) ?? [];
  return (
    <footer className="mt-auto border-t border-[#E8E8E5] pt-6 text-[#8A8984] text-[10px] leading-relaxed">
      {methods.length ? <p>Moyens de paiement acceptés : {methods.join(" · ")}</p> : null}
      {workshop.documentFooter ? <p>{text(workshop.documentFooter)}</p> : null}
      <p>
        {text(workshop.name, defaultWorkshopInfo.name)} · SIRET {text(workshop.siret)} · {text(workshop.email)} ·{" "}
        {text(workshop.phone)} · Page 1/1
      </p>
    </footer>
  );
}

function DocumentLayout({
  title,
  number,
  date,
  badge,
  workshop = defaultWorkshopInfo,
  children,
}: Readonly<{
  title: string;
  number?: string;
  date?: string;
  badge?: string;
  workshop?: WorkshopInfo;
  children: ReactNode;
}>) {
  const ws = workshop ?? defaultWorkshopInfo;
  return (
    <article
      className="print-document mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col rounded-[18px] border border-[#E8E8E5] bg-white p-10 text-[#1A1916] shadow-[0_18px_60px_rgba(26,25,22,0.06)] print:min-h-screen print:rounded-none print:border-0 print:p-8 print:shadow-none"
      style={{ color: COLORS.ink }}
    >
      <DocumentHeader badge={badge} date={date} number={number} title={title} workshop={ws} />
      <main className="flex-1 space-y-6 py-7">{children}</main>
      <DocumentFooter workshop={ws} />
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
    <div className="grid gap-5 md:grid-cols-2">
      <ClientCard customer={customer} />
      <RepairCard invoice={invoice} quote={quote} repair={repair} />
    </div>
  );
}

function PremiumTable({ rows, repair }: Readonly<{ rows: QuoteLine[]; repair?: Repair }>) {
  const safeRows = rows.length ? rows : [{ id: "empty", description: "Prestation atelier", quantity: 1, unitPrice: 0, total: 0 }];
  return (
    <section className="print-avoid-break overflow-hidden rounded-[14px] border border-[#E8E8E5] bg-white print:rounded-none">
      <div className="grid grid-cols-[1fr_82px_118px_118px] bg-[#FAFAF8] px-5 py-3 font-semibold text-[#6B6B6B] text-[11px] uppercase tracking-wide">
        <span>Désignation</span>
        <span className="text-center">Qté</span>
        <span className="text-right">Prix unitaire</span>
        <span className="text-right">Total</span>
      </div>
      <div className="divide-y divide-[#E8E8E5]">
        {safeRows.map((line) => (
          <div className="grid grid-cols-[1fr_82px_118px_118px] items-center px-5 py-5 text-[13px]" key={line.id}>
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
    <section className="ml-auto w-full max-w-[330px] rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] p-5">
      {ws.vatApplicable ? (
        <>
          <TotalLine label="Sous-total HT" value={money(vat.ht)} />
          <TotalLine label={`TVA ${Math.round(vat.rate * 100)}%`} value={money(vat.tva)} />
        </>
      ) : (
        <p className="mb-3 text-right text-[#6B6B6B] text-[11px]">TVA non applicable — article 293 B du CGI</p>
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

function intakeAccessories(repair: Repair) {
  const intake = repair.intakeCondition;
  const values = (intake?.accessories ?? []).filter(Boolean);
  const withoutNone = values.filter((entry) => entry !== "Aucun");
  if (intake?.accessoriesOther?.trim() && values.includes("Autre")) {
    return [...withoutNone.filter((entry) => entry !== "Autre"), `Autre : ${intake.accessoriesOther}`];
  }
  return withoutNone;
}

function IntakePdfHeader({ repair, workshop }: Readonly<{ repair: Repair; workshop?: WorkshopInfo }>) {
  const ws = workshop ?? ({} as WorkshopInfo);
  const logo = ws.showLogo !== false ? ws.logoUrl?.trim() : "";
  return (
    <header className="flex items-start justify-between gap-8">
      <div className="flex gap-5">
        {logo ? (
          <img alt={text(ws.name, "Logo atelier")} className="h-[96px] w-[96px] rounded-[12px] border border-[#E8E8E5] object-contain p-2" src={logo} />
        ) : (
          <div className="grid h-[96px] w-[96px] place-items-center rounded-[12px] border border-dashed border-[#CFCFCA] bg-[#FAFAF8] text-center font-semibold text-[#1A1916] text-[11px] leading-tight">
            VOTRE LOGO ICI
          </div>
        )}
        <div className="text-[12px] leading-relaxed text-[#1A1916]">
          <p className="font-bold text-[15px] uppercase">{text(ws.name, "Nom de votre atelier")}</p>
          <p>{text(ws.address)}</p>
          <p>{text(ws.postalCity, `${text(ws.postalCode)} ${text(ws.city)}`)}</p>
          <p>tél. : {text(ws.phone)}</p>
          <p>{text(ws.email)}</p>
          <p>SIRET/SIREN : {text(ws.siret)}</p>
          <p>{ws.tvaNumber ? `TVA : ${text(ws.tvaNumber)}` : text(ws.tvaMention)}</p>
        </div>
      </div>
      <div className="min-w-[150px] rounded-[10px] border border-[#D8D8D2] bg-white px-4 py-4 text-right">
        <p className="font-bold text-[#1A1916] text-[17px]">N° {text(repair.number)}</p>
        <p className="mt-2 text-[#6B6B6B] text-[11px]">Date dépôt</p>
        <p className="font-medium text-[12px]">{dateLabel(repair.droppedAt)}</p>
        <p className="mt-2 text-[#6B6B6B] text-[11px]">Statut</p>
        <p className="font-medium text-[12px]">{text(repair.status)}</p>
      </div>
    </header>
  );
}

function IntakeBox({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="rounded-[10px] border border-[#E8E8E5] bg-white p-4">
      <h3 className="mb-3 font-bold text-[#167B70] text-[13px] uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  );
}

function IntakeKeyValue({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="grid grid-cols-[108px_1fr] gap-2 text-[12px] leading-relaxed">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}

function IntakeFooter({ page }: Readonly<{ page: 1 | 2 }>) {
  return (
    <footer className="mt-auto flex items-center justify-between border-[#E8E8E5] border-t pt-4 text-[#6B6B6B] text-[11px]">
      <span>{page === 1 ? "Merci de conserver ce document. Il pourra être demandé pour tout suivi de réparation." : "Merci de conserver ce document."}</span>
      <span>Page {page} sur 2</span>
    </footer>
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
  const photos = (repair.intakeCondition?.photos ?? []).filter((photo) => photo.dataUrl);
  const accessories = intakeAccessories(repair);
  const isValidated = Boolean(
    repair.intakeCondition?.customerConfirmed &&
      repair.intakeCondition?.diagnosticAuthorized &&
      repair.intakeCondition?.nonTestableAccepted &&
      text(repair.intakeCondition?.signerName, "") &&
      text(repair.intakeCondition?.signedAt, ""),
  );

  return (
    <div className="print-document mx-auto flex w-full max-w-[794px] flex-col gap-6 text-[#1A1916]" data-pdf-paginate="true">
      <article className="pdf-page flex min-h-[1123px] flex-col rounded-[4px] border border-[#E8E8E5] bg-white p-8 shadow-[0_14px_40px_rgba(26,25,22,0.06)]">
        <IntakePdfHeader repair={repair} workshop={workshop} />
        <main className="flex-1 py-6">
          <h1 className="font-bold text-[#1A1916] text-[28px] tracking-tight">BON DE PRISE EN CHARGE</h1>
          <p className="mt-1 font-medium text-[#1A1916] text-[13px]">Document remis au client</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <IntakeBox title="Client">
              <IntakeKeyValue label="Nom" value={customerName(customer)} />
              <IntakeKeyValue label="Téléphone" value={text(customer.phone)} />
              <IntakeKeyValue label="Email" value={text(customer.email)} />
              <IntakeKeyValue label="Adresse" value={text(customer.address)} />
            </IntakeBox>
            <IntakeBox title="Appareil">
              <IntakeKeyValue label="Type" value={text(repair.deviceType)} />
              <IntakeKeyValue label="Marque" value={text(repair.brandName)} />
              <IntakeKeyValue label="Modèle" value={text(repair.deviceModel ?? repair.model)} />
              <IntakeKeyValue label="Couleur" value="Non renseigné" />
              <IntakeKeyValue label="IMEI / série" value={text(repair.imei)} />
              <IntakeKeyValue label="Code appareil" value={intakeValue(repair, "passcodeState")} />
            </IntakeBox>
          </div>

          <div className="mt-2">
            <IntakeBox title="Intervention">
              <div className="grid grid-cols-3 gap-3">
                <IntakeKeyValue label="Demande" value={text(repair.issue)} />
                <IntakeKeyValue label="Statut" value={text(repair.status)} />
                <IntakeKeyValue label="Date dépôt" value={dateLabel(repair.droppedAt)} />
              </div>
            </IntakeBox>
          </div>

          <section className="mt-4 overflow-hidden rounded-[10px] border border-[#E8E8E5] bg-white">
            <h3 className="border-[#E8E8E5] border-b px-4 py-3 font-bold text-[#167B70] text-[13px] uppercase tracking-wide">
              État d'entrée appareil
            </h3>
            <div className="grid grid-cols-2">
              {intakeRows.map(([label, key]) => (
                <div className="grid grid-cols-[136px_1fr] gap-2 border-[#E8E8E5] border-b px-3 py-2 text-[12px]" key={key}>
                  <span className="text-[#6B6B6B]">{label}</span>
                  <span className="font-medium">{intakeValue(repair, key)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-2">
            <IntakeBox title="Accessoires fournis">
              <p className="text-[12px]">{accessories.length ? accessories.join(" · ") : "Aucun accessoire fourni."}</p>
            </IntakeBox>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <IntakeBox title="Défauts visibles">
              <p className="min-h-[54px] whitespace-pre-wrap text-[12px] leading-relaxed">{text(repair.intakeCondition?.visibleDefects)}</p>
            </IntakeBox>
            <IntakeBox title="Déclaration client">
              <p className="min-h-[54px] whitespace-pre-wrap text-[12px] leading-relaxed">{text(repair.intakeCondition?.customerStatement)}</p>
            </IntakeBox>
          </div>
        </main>
        <IntakeFooter page={1} />
      </article>

      <article className="pdf-page flex min-h-[1123px] flex-col rounded-[4px] border border-[#E8E8E5] bg-white p-8 shadow-[0_14px_40px_rgba(26,25,22,0.06)]">
        <IntakePdfHeader repair={repair} workshop={workshop} />
        <main className="flex-1 py-6">
          <h2 className="font-bold text-[#167B70] text-[16px] uppercase tracking-wide">PHOTOS DE L'APPAREIL (facultatives)</h2>
          <p className="mt-2 text-[#6B6B6B] text-[12px] leading-relaxed">
            Les photos sont facultatives et servent uniquement à compléter l'état visuel du dépôt lorsqu'elles sont ajoutées.
          </p>
          {photos.length ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {photos.slice(0, 6).map((photo) => (
                <div className="overflow-hidden rounded-[10px] border border-[#E8E8E5] bg-[#FAFAF8]" key={photo.id}>
                  <img alt={photo.name} className="h-[128px] w-full object-cover" src={photo.dataUrl} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[10px] border border-dashed border-[#CFCFCA] bg-[#FAFAF8] px-4 py-8 text-center text-[#6B6B6B] text-[13px]">
              Aucune photo ajoutée
            </div>
          )}

          <div className="mt-5">
            <IntakeBox title="Validation client">
              {isValidated ? (
                <div className="space-y-2">
                  {customerValidationRows.map(([label, key]) => (
                    <p className="text-[12px]" key={key}>✓ {repair.intakeCondition?.[key] ? label : `${label} Non renseigné`}</p>
                  ))}
                </div>
              ) : (
                <p className="text-[12px]">Validation client non enregistrée.</p>
              )}
            </IntakeBox>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <IntakeBox title="Signature / validation">
              <IntakeKeyValue label="Signataire" value={text(repair.intakeCondition?.signerName)} />
              <IntakeKeyValue label="Date et heure" value={repair.intakeCondition?.signedAt ? dateTimeLabel(repair.intakeCondition.signedAt) : "Non signé."} />
              <div className="mt-3 rounded-[8px] border border-[#D8D8D2] bg-[#FAFAF8] px-3 py-5 text-center font-medium text-[#1A1916]">
                {isValidated ? "Validation enregistrée" : "Non signé."}
              </div>
            </IntakeBox>
            <IntakeBox title="Informations importantes">
              <div className="space-y-3 text-[12px] leading-relaxed">
                <p>Le client reconnaît que l'état d'entrée ci-dessus correspond à l'état visible de l'appareil au moment du dépôt.</p>
                <p>Certains défauts peuvent ne pas être testables avant diagnostic ou ouverture de l'appareil.</p>
                <p>Les photos sont facultatives et servent uniquement à compléter l'état visuel du dépôt lorsqu'elles sont ajoutées.</p>
              </div>
            </IntakeBox>
          </div>

        </main>
        <IntakeFooter page={2} />
      </article>
    </div>
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
    <DocumentLayout badge={quote.status} date={quote.date} number={quote.number} title="Devis" workshop={ws}>
      <DocumentIntro customer={customer} quote={quote} repair={repair} />
      <PremiumTable repair={repair} rows={quote.lines ?? []} />
      <TotalsCard lines={quote.lines ?? []} total={getQuoteTotal(quote)} workshop={ws} />
      <NoticeCard title="Validité et accord">
        Devis valable jusqu'au {dateLabel(quote.expiryDate)}. {text(ws.quoteTerms, "Prix valables sous réserve de disponibilité des pièces.")}
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
      title="Facture"
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
      <NoticeCard title="Mentions légales">
        {text(ws.invoiceTerms, "Facture émise conformément aux informations communiquées par le client. Paiement à réception sauf accord contraire.")}
      </NoticeCard>
    </DocumentLayout>
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
  return (
    <DocumentLayout
      badge="Paiement reçu"
      date={payment.date}
      number={payment.paymentNumber}
      title="Reçu de paiement"
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
      <NoticeCard title="Merci pour votre confiance">
        Ce reçu confirme l'encaissement du montant indiqué pour la facture et le dossier associés.
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
      title="Fiche intervention interne"
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
      badge={sale.status === "Payée" ? "Facture acquittée" : "Facture de vente"}
      date={sale.paidAt || sale.createdAt}
      number={sale.number}
      title="Facture de vente"
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
