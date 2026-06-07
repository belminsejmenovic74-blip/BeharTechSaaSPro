"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Lock,
  MessageSquare,
  Pencil,
  Printer,
  QrCode,
  Receipt,
  ShoppingCart,
  Smartphone,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { getPrintableTarget } from "@/components/behar/local-printable-document";
import { RealDeviceVisual } from "@/components/behar/real-product-visual";
import {
  buildInvoiceLinesFromRepair,
  formatEuro,
  formatIsoToDisplay,
  getInvoiceTotal,
  getQuoteTotal,
  isTerminalRepairStatus,
  paymentMethods,
  type Customer,
  type PaymentMethod,
  type Repair,
  type RepairStatus,
  useBeharStore,
} from "@/lib/behar-store";
import { displayCustomerName } from "@/lib/customer-display";
import { formatDeviceLabel } from "@/lib/format-device";
import { generateQrDataUrl, publicAbsoluteUrl } from "@/lib/public-link";
import { cn } from "@/lib/utils";

import { useDocument } from "./print-provider";
import { PrimaryButton, SecondaryButton, StatusBadge } from "./primitives";

const progression: RepairStatus[] = [
  "Reçu",
  "Diagnostic",
  "En attente",
  "Devis envoyé",
  "Devis accepté",
  "En réparation",
  "Test final",
  "Prêt",
  "Rendu",
  "Clôturé",
];

const stepShortLabel: Record<RepairStatus, string> = {
  Reçu: "Reçu",
  Diagnostic: "Diagnostic",
  "En attente": "En attente",
  "Devis envoyé": "Devis envoyé",
  "Devis accepté": "Devis accepté",
  "En réparation": "En réparation",
  "Test final": "Test final",
  Prêt: "Prêt",
  Rendu: "Rendu",
  Irréparable: "Irréparable",
  SAV: "SAV",
  Clôturé: "Clôturé",
  Annulé: "Annulé",
};

const tabs = [
  "Vue d'ensemble",
  "Fiche d'entrée",
  "Diagnostic",
  "Réparation",
  "Devis",
  "Facture",
  "Documents",
  "Notes",
  "Historique",
] as const;
type DossierTab = (typeof tabs)[number];

const nextStatus: Partial<Record<RepairStatus, RepairStatus>> = {
  Reçu: "Diagnostic",
  Diagnostic: "En attente",
  "Devis envoyé": "Devis accepté",
  "En attente": "En réparation",
  "Devis accepté": "En réparation",
  "En réparation": "Test final",
  "Test final": "Prêt",
  Prêt: "Rendu",
  SAV: "Diagnostic",
};

// Un devis ne peut être créé que depuis un statut compatible : jamais sur un dossier prêt/rendu/clôturé.
const canQuoteFromStatus = (status: RepairStatus): boolean =>
  ["Reçu", "Diagnostic", "En attente"].includes(status);

// Ordre d'affichage des documents liés : la fiche d'entrée toujours en premier.
const docTypeOrder: Record<string, number> = {
  intake: 0,
  quote: 1,
  invoice: 2,
  payment: 3,
  "sale-receipt": 4,
  "sale-invoice": 5,
  summary: 6,
  internal: 7,
};

const docLabel: Record<string, string> = {
  intake: "Fiche d'entrée",
  quote: "Devis",
  invoice: "Facture",
  payment: "Reçu / justificatif",
  internal: "Fiche intervention interne",
  summary: "Fiche interne",
  "sale-receipt": "Reçu",
  "sale-invoice": "Reçu",
};

function cleanDossierId(value?: string | null) {
  const id = (value ?? "").trim();
  return id && id !== "_" ? id : "";
}

function dossierIdFromBrowserUrl() {
  if (typeof window === "undefined") return "";
  const [, rawId] = window.location.pathname.match(/\/dashboard\/dossiers\/([^/?#]+)/) ?? [];
  return cleanDossierId(rawId ? decodeURIComponent(rawId) : "");
}

export function DossierDetailWorkspace({ dossierId }: Readonly<{ dossierId: string }>) {
  const router = useRouter();
  const store = useBeharStore();
  const { print, download } = useDocument();
  const [browserDossierId, setBrowserDossierId] = useState("");
  const [tab, setTab] = useState<DossierTab>("Vue d'ensemble");
  const [notesFocus, setNotesFocus] = useState<"internal" | "client" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TPE externe");
  const resolvedDossierId = cleanDossierId(dossierId) || browserDossierId;

  useEffect(() => {
    setBrowserDossierId(dossierIdFromBrowserUrl());
  }, []);

  // Ouvre l'onglet Notes en ciblant la bonne colonne (interne vs client).
  const openNotes = (target?: "internal" | "client") => {
    setTab("Notes");
    setNotesFocus(target ?? null);
  };

  const repair = store.repairs.find((entry) => entry.id === resolvedDossierId || entry.number === resolvedDossierId);
  const customer = repair ? store.customers.find((entry) => entry.id === repair.customerId) : undefined;
  const quotes = repair ? store.quotes.filter((entry) => entry.repairId === repair.id) : [];
  const invoices = repair ? store.invoices.filter((entry) => entry.repairId === repair.id) : [];
  const documents = repair
    ? store.documents
        .filter((entry) => entry.repairId === repair.id)
        .sort((a, b) => (docTypeOrder[a.type] ?? 9) - (docTypeOrder[b.type] ?? 9))
    : [];
  const payments = repair ? store.payments.filter((entry) => entry.repairId === repair.id) : [];
  const quote = quotes[0];
  const acceptedQuote = quotes.find((entry) => entry.status === "Accepté" || entry.status === "Facturé");
  const invoice = invoices[0];
  const invoiceTotal = invoice ? getInvoiceTotal(invoice) : 0;
  const quoteTotal = quote ? getQuoteTotal(quote) : 0;
  const dossierTotal = invoiceTotal || quoteTotal || repair?.total || repair?.amount || 0;
  const paidAmount = payments.filter((entry) => entry.status === "Payé").reduce((sum, entry) => sum + entry.amount, 0);

  const activity = useMemo(() => {
    if (!repair) return [];
    return [...(repair.history ?? [])].reverse();
  }, [repair]);

  if (!repair) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#E8E8E5] bg-white p-10 text-center">
        <FolderOpen className="mx-auto size-10 text-[#6B6B6B]" />
        <h2 className="mt-4 font-semibold text-[#1A1916] text-xl">Dossier introuvable</h2>
        <p className="mt-2 text-[#6B6B6B] text-sm">Le dossier demandé n'existe pas dans l'atelier.</p>
        <SecondaryButton className="mt-5" onClick={() => router.push("/dashboard/reparations")}>
          Retour aux réparations
        </SecondaryButton>
      </div>
    );
  }

  const createQuote = () => {
    if (quote) {
      store.setSelected("quote", quote.id);
      router.push("/dashboard/devis");
      return;
    }
    if (!canQuoteFromStatus(repair.status)) {
      return toast.error("Création de devis impossible à ce stade du dossier.");
    }
    const built = buildInvoiceLinesFromRepair(repair);
    const id = store.addQuote({
      customerId: repair.customerId,
      repairId: repair.id,
      status: built.ok ? "Envoyé" : "Brouillon",
      deviceType: repair.deviceType,
      brandId: repair.brandId,
      brandName: repair.brandName,
      modelId: repair.modelId,
      deviceModel: repair.deviceModel,
      device: repair.device,
      imei: repair.imei,
      issueType: repair.issueType,
      issue: repair.issue,
      lines: built.ok ? built.lines : undefined,
      notes: `Devis lié au dossier ${repair.number}`,
    });
    if (!id) return toast.error("Création du devis impossible.");
    store.setSelected("quote", id);
    toast.success("Devis lié au dossier.");
  };

  const createInvoice = () => {
    if (invoice) {
      store.setSelected("invoice", invoice.id);
      router.push("/dashboard/factures");
      return;
    }
    const id = acceptedQuote ? store.convertQuoteToInvoice(acceptedQuote.id) : store.createInvoiceFromRepair(repair.id);
    if (!id) return toast.error("Création de facture impossible : vérifiez le devis accepté ou le total du dossier.");
    store.setSelected("invoice", id);
    toast.success("Facture liée au dossier.");
  };

  const indicatePayment = () => {
    const targetInvoice = invoice ?? store.invoices.find((entry) => entry.repairId === repair.id);
    if (!targetInvoice) return toast.info("Créez d'abord une facture.");
    if (targetInvoice.status === "Payée") return toast.info("La facture est déjà réglée.");
    const id = store.markInvoicePaid(targetInvoice.id, paymentMethod, `Règlement indiqué depuis le dossier ${repair.number}`);
    if (!id) return toast.error("Règlement impossible à indiquer.");
    toast.success("Règlement indiqué.");
  };

  const advance = () => {
    const target = nextStatus[repair.status];
    if (!target) return toast.info("Aucune étape suivante disponible.");
    store.changeRepairStatus(repair.id, target);
    toast.success(`Dossier passé en ${target}.`);
  };

  const closeDossier = () => {
    store.changeRepairStatus(repair.id, "Rendu");
    toast.success("Dossier marqué comme rendu.");
  };

  const activeIndex = Math.max(0, progression.indexOf(repair.status));

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-[#6B6B6B] text-sm hover:text-[#1A1916]"
        href="/dashboard/reparations"
      >
        <ArrowLeft className="size-4" />
        Retour aux réparations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-[#1A1916] text-[28px] tracking-tight">Dossier #{repair.number}</h1>
          <p className="mt-0.5 text-[#6B6B6B] text-sm">Suivi complet du dossier</p>
        </div>
        <StatusPill status={repair.status} />
      </div>

      {/* En-tête : client / appareil / problème / intervention / montant */}
      <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
        <div className="flex flex-col gap-5 divide-y divide-[#F7F7F7] lg:flex-row lg:items-center lg:divide-x lg:divide-y-0">
          <div className="flex min-w-0 items-center gap-3 lg:pr-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#EAF6F2] font-semibold text-[#167B70]">
              {(displayCustomerName(customer) || "C").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#1A1916]">{displayCustomerName(customer) || "Client"}</p>
              <p className="truncate text-[#6B6B6B] text-sm">{customer?.phone || "Téléphone non renseigné"}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 pt-5 lg:px-6 lg:pt-0">
            <RealDeviceVisual
              brand={repair.brandName}
              className="size-20 rounded-[18px] border border-[#E8E8E5] bg-[#FAFAF8] p-2 shadow-[0_10px_24px_rgba(26,25,22,0.045)]"
              model={repair.deviceModel || repair.model || repair.device}
              type={repair.deviceType}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#1A1916]">{formatDeviceLabel(repair, repair.device)}</p>
              <p className="truncate text-[#6B6B6B] text-xs">{repair.imei ? `IMEI : ${repair.imei}` : "IMEI / S/N non renseigné"}</p>
            </div>
          </div>
          <HeaderCol className="lg:px-6" label="Problème" value={repair.issue || "À préciser"} />
          <HeaderCol
            className="lg:px-6"
            label="Intervention prévue"
            value={repair.recommendedIntervention || repair.issueType || "À définir"}
          />
          <div className="pt-5 lg:pl-6 lg:pt-0">
            <p className="text-[#6B6B6B] text-xs">Montant dossier</p>
            <p className="mt-1 font-semibold text-[#167B70] text-2xl tracking-tight">{formatEuro(dossierTotal)}</p>
          </div>
        </div>
      </section>

      {/* Stepper horizontal */}
      <Stepper activeIndex={activeIndex} />

      {/* Onglets */}
      <div className="flex gap-1 overflow-x-auto border-[#E8E8E5] border-b pb-px">
        {tabs.map((entry) => (
          <button
            className={cn(
              "shrink-0 border-b-2 px-3.5 pb-2.5 text-sm font-semibold transition",
              tab === entry
                ? "border-[#2A9D8F] text-[#1A1916]"
                : "border-transparent text-[#6B6B6B] hover:text-[#1A1916]",
            )}
            key={entry}
            onClick={() => setTab(entry)}
            type="button"
          >
            {entry}
          </button>
        ))}
      </div>

      {tab === "Vue d'ensemble" ? (
        <OverviewTab
          customer={customer}
          documents={documents}
          invoices={invoices}
          onAdvance={advance}
          onClose={closeDossier}
          onCreateInvoice={createInvoice}
          onCreateQuote={createQuote}
          onNotes={openNotes}
          onPrint={() => setTab("Documents")}
          quotes={quotes}
          repair={repair}
          total={dossierTotal}
        />
      ) : (
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
          {tab === "Fiche d'entrée" && <FicheEntreeTab customer={customer} documents={documents} repair={repair} />}
          {tab === "Diagnostic" && <DiagnosticTab repair={repair} />}
          {tab === "Réparation" && <RepairTab onAdvance={advance} repair={repair} />}
          {tab === "Devis" && <QuoteTab onCreate={createQuote} quote={quote} quotes={quotes} repair={repair} />}
          {tab === "Facture" && (
            <InvoiceTab
              invoice={invoice}
              invoices={invoices}
              onCreate={createInvoice}
              onPayment={indicatePayment}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
            />
          )}
          {tab === "Documents" && <DocumentsTab documents={documents} download={download} print={print} />}
          {tab === "Notes" && <NotesTab focus={notesFocus} onFocusHandled={() => setNotesFocus(null)} repair={repair} />}
          {tab === "Historique" && <HistoryTab items={activity} />}
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── En-tête ───────────────────────── */

function HeaderCol({ className, label, value }: Readonly<{ label: string; value: string; className?: string }>) {
  return (
    <div className={cn("min-w-0 pt-5 lg:pt-0", className)}>
      <p className="text-[#6B6B6B] text-xs">{label}</p>
      <p className="mt-1 truncate font-medium text-[#1A1916] text-sm">{value}</p>
    </div>
  );
}

function StatusPill({ status }: Readonly<{ status: RepairStatus }>) {
  const tone =
    status === "Rendu" || status === "Clôturé"
      ? "bg-[#F7F7F7] text-[#6B6B6B]"
      : status === "Prêt"
        ? "bg-[#E7F8F0] text-[#0B7A56]"
        : status === "Annulé" || status === "Irréparable"
          ? "bg-[#FDECEC] text-[#B42318]"
          : status === "Devis envoyé" || status === "SAV"
            ? "bg-[#FFF9EF] text-[#936100]"
          : "bg-[#EAF6F2] text-[#167B70]";
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold text-sm", tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/* ───────────────────────── Stepper ───────────────────────── */

function Stepper({ activeIndex }: Readonly<{ activeIndex: number }>) {
  return (
    <section className="rounded-[20px] border border-[#E8E8E5] bg-white px-4 py-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <div className="flex items-start">
        {progression.map((entry, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          const reached = done || current;
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center" key={entry}>
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    index === 0 ? "opacity-0" : index <= activeIndex ? "bg-[#2A9D8F]" : "bg-[#E8E8E5]",
                  )}
                />
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold transition",
                    done
                      ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                      : current
                        ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                        : "border-[#E8E8E5] bg-white text-[#6B6B6B]",
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    index === progression.length - 1 ? "opacity-0" : index < activeIndex ? "bg-[#2A9D8F]" : "bg-[#E8E8E5]",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 text-center text-[11px] font-medium leading-tight",
                  reached ? "text-[#1A1916]" : "text-[#6B6B6B]",
                )}
              >
                {stepShortLabel[entry]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── Vue d'ensemble (3 colonnes) ───────────────────────── */

function OverviewTab({
  customer,
  documents,
  invoices,
  onAdvance,
  onClose,
  onCreateInvoice,
  onCreateQuote,
  onNotes,
  onPrint,
  quotes,
  repair,
  total,
}: Readonly<{
  repair: Repair;
  customer?: Pick<Customer, "name" | "phone" | "email" | "address" | "type">;
  documents: Array<{ id: string; title: string; type: string }>;
  quotes: any[];
  invoices: any[];
  total: number;
  onAdvance: () => void;
  onCreateQuote: () => void;
  onCreateInvoice: () => void;
  onPrint: () => void;
  onClose: () => void;
  onNotes: (target?: "internal" | "client") => void;
}>) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_300px]">
      <ActivityCard repair={repair} />
      <div className="space-y-4">
        <DiagnosticNotesCard repair={repair} />
        <DocumentsLiesCard documents={documents} invoices={invoices} quotes={quotes} />
        <SuiviClientCard repair={repair} />
      </div>
      <div className="space-y-4">
        <ActionsCard
          onAdvance={onAdvance}
          onClose={onClose}
          onCreateInvoice={onCreateInvoice}
          onCreateQuote={onCreateQuote}
          onNotes={onNotes}
          onPrint={onPrint}
          repair={repair}
        />
        <InfosDossierCard customer={customer} repair={repair} total={total} />
      </div>
    </div>
  );
}

const ACTIVITY_STEPS: Array<{ status: RepairStatus; title: string; desc: string }> = [
  { status: "Reçu", title: "Dossier reçu", desc: "Appareil déposé par le client" },
  { status: "Diagnostic", title: "Diagnostic réalisé", desc: "Constat technique établi" },
  { status: "Devis envoyé", title: "Devis envoyé", desc: "Validation client en attente" },
  { status: "Devis accepté", title: "Devis accepté", desc: "Validé par le client" },
  { status: "En réparation", title: "En réparation", desc: "Intervention en cours" },
  { status: "Test final", title: "Test final", desc: "Contrôle qualité" },
  { status: "Prêt", title: "Prêt à récupérer", desc: "Client à notifier" },
  { status: "Rendu", title: "Rendu au client", desc: "Dossier terminé" },
  { status: "Clôturé", title: "Clôturé", desc: "Dossier archivé" },
];

function ActivityCard({ repair }: Readonly<{ repair: Repair }>) {
  const activeIndex = Math.max(0, progression.indexOf(repair.status));
  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <h3 className="font-semibold text-[#1A1916]">Activité du dossier</h3>
      <ol className="mt-4 space-y-1">
        {ACTIVITY_STEPS.map((step, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          const pending = index > activeIndex;
          const isLast = index === ACTIVITY_STEPS.length - 1;
          return (
            <li className="flex gap-3" key={step.status}>
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    done
                      ? "bg-[#EAF6F2] text-[#2A9D8F]"
                      : current
                        ? "bg-[#2A9D8F] text-white"
                        : "bg-[#F7F7F7] text-[#8A8A8A]",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : current ? <Clock className="size-3.5" /> : index + 1}
                </span>
                {!isLast ? <span className={cn("my-0.5 w-0.5 flex-1", done ? "bg-[#CDEAE3]" : "bg-[#F7F7F7]")} /> : null}
              </div>
              <div className={cn("pb-3", pending && "opacity-60")}>
                <p className="font-semibold text-[#1A1916] text-sm leading-tight">{step.title}</p>
                <p className="mt-0.5 text-[#6B6B6B] text-xs">{pending ? "En attente" : step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DiagnosticNotesCard({ repair }: Readonly<{ repair: Repair }>) {
  const store = useBeharStore();
  const [editing, setEditing] = useState(false);
  const [constat, setConstat] = useState(repair.diagnosticNotes ?? "");
  const [intervention, setIntervention] = useState(repair.recommendedIntervention ?? "");
  const save = () => {
    store.updateRepair(repair.id, {
      diagnosticNotes: constat,
      recommendedIntervention: intervention,
      history: [...repair.history, "Diagnostic mis à jour"],
    });
    setEditing(false);
    toast.success("Diagnostic enregistré.");
  };
  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#1A1916]">Diagnostic / Notes</h3>
        <button
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E8E8E5] px-2.5 py-1 text-[#6B6B6B] text-xs font-medium hover:bg-[#FAFAFA]"
          onClick={() => (editing ? save() : setEditing(true))}
          type="button"
        >
          <Pencil className="size-3.5" />
          {editing ? "Enregistrer" : "Modifier"}
        </button>
      </div>
      {editing ? (
        <div className="mt-4 space-y-3">
          <textarea
            className="min-h-[80px] w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 text-sm outline-none focus:border-[#2A9D8F]"
            onChange={(event) => setConstat(event.target.value)}
            placeholder="Constat technique…"
            value={constat}
          />
          <textarea
            className="min-h-[60px] w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 text-sm outline-none focus:border-[#2A9D8F]"
            onChange={(event) => setIntervention(event.target.value)}
            placeholder="Intervention prévue…"
            value={intervention}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <FactBlock label="Constat" value={repair.diagnosticNotes || repair.intakeCondition?.visibleDefects} />
          <FactBlock label="Intervention prévue" value={repair.recommendedIntervention || repair.issueType} />
          <div className="grid grid-cols-2 gap-4">
            <FactBlock label="Technicien" value={repair.technician || "Atelier"} />
            <FactBlock label="Temps estimé" value={repair.estimatedDoneAt ? formatIsoToDisplay(repair.estimatedDoneAt) : "—"} />
          </div>
          <FactBlock
            label="Pièces utilisées"
            value={repair.parts.length ? repair.parts.map((part) => `${part.name} ×${part.quantity}`).join(", ") : "Aucune pièce"}
          />
        </div>
      )}
    </section>
  );
}

function FactBlock({ label, value }: Readonly<{ label: string; value?: string }>) {
  return (
    <div>
      <p className="text-[#6B6B6B] text-xs">{label}</p>
      <p className="mt-0.5 whitespace-pre-line font-medium text-[#1A1916] text-sm">{value || "Non renseigné"}</p>
    </div>
  );
}

function DocumentsLiesCard({
  documents,
  invoices,
  quotes,
}: Readonly<{
  documents: Array<{ id: string; title: string; type: string }>;
  quotes: any[];
  invoices: any[];
}>) {
  const rows = documents.map((doc) => {
    const quote = doc.type === "quote" ? quotes.find((q) => q.id === (doc as any).quoteId) ?? quotes[0] : undefined;
    const invoice = doc.type === "invoice" ? invoices.find((i) => i.id === (doc as any).invoiceId) ?? invoices[0] : undefined;
    const amount = quote ? getQuoteTotal(quote) : invoice ? getInvoiceTotal(invoice) : 0;
    const number = quote?.number || invoice?.number || "";
    const statusLabel = invoice
      ? invoice.status === "Payée"
        ? "Réglée"
        : "À régler"
      : quote
        ? quote.status
        : doc.type === "intake"
          ? "Émise"
          : "";
    return { doc, amount, number, statusLabel };
  });
  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <h3 className="font-semibold text-[#1A1916]">Documents liés</h3>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <li className="rounded-[12px] border border-dashed border-[#E8E8E5] bg-[#FAFAFA] px-3 py-4 text-center text-[#6B6B6B] text-xs">
            Aucun document lié.
          </li>
        ) : (
          rows.map(({ doc, amount, number, statusLabel }) => (
            <li
              className="flex items-center gap-3 rounded-[12px] border border-[#F7F7F7] bg-[#FAFAFA] px-3 py-2.5"
              key={doc.id}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-white text-[#2A9D8F]">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#1A1916] text-sm">
                  {docLabel[doc.type] ?? doc.title}
                  {number ? ` · ${number}` : ""}
                </p>
                <p className="truncate text-[#6B6B6B] text-xs">{doc.title}</p>
              </div>
              {amount ? <span className="shrink-0 font-semibold text-[#1A1916] text-sm">{formatEuro(amount)}</span> : null}
              {statusLabel ? (
                <span className="shrink-0 rounded-full bg-[#EAF6F2] px-2 py-0.5 font-semibold text-[#167B70] text-[11px]">
                  {statusLabel}
                </span>
              ) : null}
              <Link
                className="grid size-7 shrink-0 place-items-center rounded-[8px] text-[#6B6B6B] hover:bg-white"
                href={`/print/document/${doc.id}`}
              >
                <ExternalLink className="size-4" />
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function SuiviClientCard({ repair }: Readonly<{ repair: Repair }>) {
  const ensureRepairPublicAccess = useBeharStore((s) => s.ensureRepairPublicAccess);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const trackingUrl = repair.publicAccess?.url ? publicAbsoluteUrl(repair.publicAccess.url) : "";

  useEffect(() => {
    if (!repair.publicAccess) ensureRepairPublicAccess(repair.id);
  }, [repair.id, repair.publicAccess, ensureRepairPublicAccess]);

  useEffect(() => {
    if (trackingUrl) generateQrDataUrl(trackingUrl).then(setQr).catch(() => setQr(""));
  }, [trackingUrl]);

  const copyLink = async () => {
    if (!trackingUrl) return;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Lien de suivi copié.");
    } catch {
      toast.error("Copie impossible.");
    }
  };

  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <h3 className="font-semibold text-[#1A1916]">Suivi client</h3>
      <div className="mt-3 flex items-center gap-4">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="QR de suivi" className="size-24 shrink-0 rounded-[12px] border border-[#F7F7F7] bg-white p-1.5" src={qr} />
        ) : (
          <div className="grid size-24 shrink-0 place-items-center rounded-[12px] bg-[#F7F7F7] text-[#9A9AA0] text-xs">QR…</div>
        )}
        <div className="min-w-0">
          <p className="text-[#6B6B6B] text-xs">Le client peut suivre l'avancement de son dossier en ligne.</p>
          <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-[#FAFAFA] px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-[#167B70] text-xs">{trackingUrl || "Lien en cours…"}</span>
            <button
              className="grid size-6 shrink-0 place-items-center rounded-[7px] text-[#6B6B6B] hover:bg-white"
              onClick={copyLink}
              type="button"
            >
              {copied ? <Check className="size-3.5 text-[#2A9D8F]" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionsCard({
  onAdvance,
  onClose,
  onCreateInvoice,
  onCreateQuote,
  onNotes,
  onPrint,
  repair,
}: Readonly<{
  repair: Repair;
  onAdvance: () => void;
  onCreateQuote: () => void;
  onCreateInvoice: () => void;
  onPrint: () => void;
  onClose: () => void;
  onNotes: (target?: "internal" | "client") => void;
}>) {
  const target = nextStatus[repair.status];
  const canAdvance = Boolean(target) && !isTerminalRepairStatus(repair.status);
  const canMarkReturned = repair.status === "Prêt";
  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <h3 className="font-semibold text-[#1A1916]">Actions</h3>
      <div className="mt-4 space-y-2">
        <PrimaryButton className="w-full justify-between" disabled={!canAdvance} onClick={onAdvance}>
          <span className="inline-flex items-center gap-2">
            <Wrench className="size-4" />
            {target ? `Passer en ${target}` : "Passer à l'étape suivante"}
          </span>
        </PrimaryButton>
        {canQuoteFromStatus(repair.status) && (
          <ActionRow icon={<FileText className="size-4" />} label="Créer le devis" onClick={onCreateQuote} />
        )}
        <ActionRow icon={<Receipt className="size-4" />} label="Créer la facture" onClick={onCreateInvoice} />
        <ActionRow icon={<Printer className="size-4" />} label="Imprimer documents" onClick={onPrint} />
        <Link
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[#1A1916] text-sm hover:bg-[#FAFAFA]"
          href="/dashboard/ventes"
        >
          <ShoppingCart className="size-4" />
          Vente comptoir
        </Link>
        <ActionRow icon={<Lock className="size-4" />} label="Ajouter une note interne" onClick={() => onNotes("internal")} />
        <ActionRow icon={<MessageSquare className="size-4" />} label="Ajouter une note client" onClick={() => onNotes("client")} />
        {(canMarkReturned || !isTerminalRepairStatus(repair.status)) && (
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#F3D0CC] bg-white font-semibold text-[#B42318] text-sm hover:bg-[#FDF3F2]"
            onClick={onClose}
            type="button"
          >
            <ClipboardList className="size-4" />
            {canMarkReturned ? "Marquer comme rendu" : "Marquer rendu / archiver"}
          </button>
        )}
      </div>
    </section>
  );
}

function ActionRow({ icon, label, onClick }: Readonly<{ icon: React.ReactNode; label: string; onClick: () => void }>) {
  return (
    <button
      className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[#1A1916] text-sm hover:bg-[#FAFAFA]"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function InfosDossierCard({
  customer,
  repair,
  total,
}: Readonly<{ repair: Repair; customer?: Pick<Customer, "name" | "phone">; total: number }>) {
  const workshop = useBeharStore((s) => s.workshopInfo);
  const rows: Array<[string, string]> = [
    ["Référence", repair.number],
    ["Statut", repair.status],
    ["Montant", formatEuro(total)],
    ["Date de création", formatIsoToDisplay(repair.droppedAt || repair.createdAt || "")],
    ["Dernière mise à jour", formatIsoToDisplay(repair.updatedAt || repair.droppedAt || "")],
    ["Technicien", repair.technician || "Atelier"],
    ["Lieu", workshop?.name || workshop?.brand || "Atelier"],
    ["Garantie", workshop?.defaultWarranty || "3 mois sur la pièce"],
  ];
  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <h3 className="font-semibold text-[#1A1916]">Informations dossier</h3>
      <dl className="mt-3 divide-y divide-[#F7F7F7]">
        {rows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 py-2" key={label}>
            <dt className="text-[#6B6B6B] text-xs">{label}</dt>
            <dd className="truncate text-right font-medium text-[#1A1916] text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────────────────── Onglets secondaires ───────────────────────── */

function FicheEntreeTab({
  customer,
  documents,
  repair,
}: Readonly<{
  repair: Repair;
  customer?: Pick<Customer, "name" | "phone" | "email" | "type">;
  documents: Array<{ id: string; title: string; type: string }>;
}>) {
  const intakeDoc = documents.find((doc) => doc.type === "intake");
  const condition = repair.intakeCondition;
  const accessories = [
    ...(condition?.accessories ?? []),
    ...(condition?.accessoriesOther ? [condition.accessoriesOther] : []),
  ]
    .filter(Boolean)
    .join(", ");
  const accessLabel = [condition?.accessMethod, condition?.accessCode].filter(Boolean).join(" · ");
  const visualState = [
    condition?.generalCondition ? `État général : ${condition.generalCondition}` : "",
    condition?.screenState ? `Écran : ${condition.screenState}` : "",
    condition?.frameState ? `Châssis : ${condition.frameState}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const accord = [
    condition?.customerConfirmed ? "Conditions acceptées par le client" : "",
    condition?.diagnosticAuthorized ? "Diagnostic autorisé" : "",
    condition?.nonTestableAccepted ? "Éléments non testables acceptés" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const signature =
    condition?.signatureDataUrl || condition?.signedAt || condition?.signerName
      ? `Signé${condition?.signerName ? ` par ${condition.signerName}` : ""}${condition?.signatureSignedAt || condition?.signedAt ? ` le ${formatIsoToDisplay(condition.signatureSignedAt || condition.signedAt || "")}` : ""}`
      : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[16px] border border-[#2A9D8F]/25 bg-[#EAF6F2] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-[#167B70]">Fiche d'entrée · Bon de prise en charge</p>
          <p className="text-[#167B70]/80 text-sm">
            Dossier {repair.number} · Créée le {formatIsoToDisplay(repair.droppedAt || repair.createdAt || "")}
          </p>
        </div>
        {intakeDoc ? (
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#2A9D8F] px-4 text-sm font-semibold text-white"
            href={`/print/document/${intakeDoc.id}`}
          >
            <ExternalLink className="size-4" />
            Ouvrir / Imprimer
          </Link>
        ) : null}
      </div>

      <InfoGrid
        items={[
          ["N° dossier", repair.number],
          ["Date de prise en charge", formatIsoToDisplay(repair.droppedAt || repair.createdAt || "")],
          ["Client", displayCustomerName(customer) || "Non renseigné"],
          ["Téléphone", customer?.phone || "Non renseigné"],
          ["Appareil", formatDeviceLabel(repair, repair.device)],
          ["Marque / modèle", [repair.brandName, repair.deviceModel || repair.model].filter(Boolean).join(" ") || "Non renseigné"],
          ["IMEI / série", repair.imei || "Non renseigné"],
          ["Code / verrouillage", accessLabel || "Non renseigné"],
        ]}
      />
      <TextBlock label="Problème déclaré" value={repair.issue} />
      <TextBlock label="État d'entrée" value={visualState} />
      <TextBlock label="Défauts visibles" value={condition?.visibleDefects} />
      <TextBlock label="Accessoires reçus" value={accessories} />
      <TextBlock label="Déclaration client" value={condition?.customerStatement} />
      {accord ? <TextBlock label="Conditions / accord client" value={accord} /> : null}
      {signature ? <TextBlock label="Signature" value={signature} /> : null}
    </div>
  );
}

function DiagnosticTab({ repair }: Readonly<{ repair: Repair }>) {
  const store = useBeharStore();
  const [diagnosticNotes, setDiagnosticNotes] = useState(repair.diagnosticNotes ?? "");
  const [recommended, setRecommended] = useState(repair.recommendedIntervention ?? "");
  const save = () => {
    store.updateRepair(repair.id, {
      diagnosticNotes,
      recommendedIntervention: recommended,
      history: [...repair.history, "Diagnostic ajouté"],
    });
    toast.success("Diagnostic enregistré.");
  };
  return (
    <EditorGrid
      actionLabel="Enregistrer le diagnostic"
      fields={[
        { label: "Diagnostic interne", value: diagnosticNotes, onChange: setDiagnosticNotes },
        { label: "Intervention recommandée", value: recommended, onChange: setRecommended },
        { label: "Observations", value: repair.intakeCondition?.internalIntakeNotes || "", readOnly: true },
        {
          label: "Pièces nécessaires",
          value: repair.parts.map((part) => `${part.name} x${part.quantity}`).join("\n") || "Aucune pièce réservée.",
          readOnly: true,
        },
      ]}
      onSave={save}
    />
  );
}

function RepairTab({ onAdvance, repair }: Readonly<{ repair: Repair; onAdvance: () => void }>) {
  const store = useBeharStore();
  const [notes, setNotes] = useState(repair.repairNotes ?? repair.notes ?? "");
  const save = () => {
    store.updateRepair(repair.id, { repairNotes: notes, notes, history: [...repair.history, "Notes réparation mises à jour"] });
    toast.success("Réparation mise à jour.");
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <EditorGrid
        actionLabel="Enregistrer la réparation"
        fields={[
          { label: "Intervention en cours", value: repair.issue },
          { label: "Technicien assigné", value: repair.technician || "Atelier principal" },
          { label: "Notes réparation", value: notes, onChange: setNotes },
        ]}
        onSave={save}
      />
      <aside className="space-y-3">
        <TextBlock label="Pièces utilisées / réservées" value={repair.parts.map((part) => `${part.name} x${part.quantity}`).join("\n")} />
        <TextBlock
          label="Statut pièce"
          value={
            repair.parts.length
              ? repair.parts.map((part) => `${part.name} : ${part.confirmed ? "utilisée" : "réservée"}`).join("\n")
              : "Aucune pièce réservée."
          }
        />
        <PrimaryButton className="w-full" onClick={onAdvance}>
          Passer à l'étape suivante
        </PrimaryButton>
      </aside>
    </div>
  );
}

function QuoteTab({
  onCreate,
  quote,
  quotes,
  repair,
}: Readonly<{
  quote?: { id: string; number: string; status: string; lines: any[] };
  quotes: any[];
  repair: Repair;
  onCreate: () => void;
}>) {
  const store = useBeharStore();
  if (!quote) {
    return <EmptyLinked action="Créer un devis" onClick={onCreate} title="Aucun devis lié" />;
  }
  return (
    <div className="space-y-4">
      {quotes.map((entry) => (
        <LinkedRow
          href="/dashboard/devis"
          key={entry.id}
          onOpen={() => store.setSelected("quote", entry.id)}
          status={entry.status}
          subtitle={`Dossier ${repair.number} · ${formatEuro(getQuoteTotal(entry))}`}
          title={`Devis ${entry.number}`}
        />
      ))}
      {quote.status !== "Accepté" && quote.status !== "Facturé" ? (
        <PrimaryButton onClick={() => store.updateQuote(quote.id, { status: "Accepté" })}>Accepter le devis</PrimaryButton>
      ) : null}
    </div>
  );
}

function InvoiceTab({
  invoice,
  invoices,
  onCreate,
  onPayment,
  paymentMethod,
  setPaymentMethod,
}: Readonly<{
  invoice?: { id: string; number: string; status: string; lines: any[] };
  invoices: any[];
  onCreate: () => void;
  onPayment: () => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
}>) {
  const store = useBeharStore();
  if (!invoice) {
    return <EmptyLinked action="Créer une facture" onClick={onCreate} title="Aucune facture liée" />;
  }
  return (
    <div className="space-y-4">
      {invoices.map((entry) => (
        <LinkedRow
          href="/dashboard/factures"
          key={entry.id}
          onOpen={() => store.setSelected("invoice", entry.id)}
          status={entry.status === "Payée" ? "Réglée" : entry.status === "Envoyée" ? "À régler" : entry.status}
          subtitle={formatEuro(getInvoiceTotal(entry))}
          title={`Facture ${entry.number}`}
        />
      ))}
      <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FAFAFA] p-4">
        <p className="font-semibold text-[#1A1916]">Moyen de règlement indiqué</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {paymentMethods.map((method) => (
            <button
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                paymentMethod === method ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-[#1A1916]",
              )}
              key={method}
              onClick={() => setPaymentMethod(method)}
              type="button"
            >
              {method}
            </button>
          ))}
        </div>
      </div>
      <PrimaryButton onClick={onPayment}>Indiquer règlement</PrimaryButton>
    </div>
  );
}

function DocumentsTab({
  documents,
  download,
  print,
}: Readonly<{
  documents: Array<{ id: string; title: string; type: string }>;
  print: (type: any, id: string) => void;
  download: (type: any, id: string) => void;
}>) {
  if (!documents.length) return <EmptyLinked action="Retour au dossier" onClick={() => undefined} title="Aucun document lié" />;
  return (
    <div className="space-y-3">
      {documents.map((document) => {
        const target = getPrintableTarget(document as any);
        return (
          <div
            className="flex flex-col gap-3 rounded-[16px] border border-[#E8E8E5] bg-[#FAFAFA] p-4 md:flex-row md:items-center md:justify-between"
            key={document.id}
          >
            <div>
              <p className="font-semibold text-[#1A1916]">{docLabel[document.type] ?? document.title}</p>
              <p className="text-[#6B6B6B] text-sm">{document.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-sm font-semibold"
                href={`/print/document/${document.id}`}
              >
                <ExternalLink className="size-4" />
                Ouvrir
              </Link>
              <SecondaryButton disabled={!target} onClick={() => target && print(target.type, target.id)}>
                <Printer className="size-4" />
                Imprimer
              </SecondaryButton>
              <SecondaryButton disabled={!target} onClick={() => target && download(target.type, target.id)}>
                <Download className="size-4" />
                Télécharger
              </SecondaryButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotesTab({
  repair,
  focus,
  onFocusHandled,
}: Readonly<{ repair: Repair; focus?: "internal" | "client" | null; onFocusHandled?: () => void }>) {
  const store = useBeharStore();
  const [internalDraft, setInternalDraft] = useState("");
  const [clientDraft, setClientDraft] = useState("");
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const clientRef = useRef<HTMLTextAreaElement>(null);
  const messages = repair.messages ?? [];
  const internalNotes = messages.filter((message) => message.visibility === "internal");
  const clientNotes = messages.filter((message) => message.visibility === "client");

  // Quand on arrive depuis « Ajouter une note interne/client », on focalise la bonne colonne.
  useEffect(() => {
    if (!focus) return;
    const target = focus === "client" ? clientRef.current : internalRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
    onFocusHandled?.();
  }, [focus, onFocusHandled]);

  const addInternal = () => {
    const body = internalDraft.trim();
    if (!body) return;
    store.addRepairMessage(repair.id, { body, visibility: "internal", authorType: "staff" });
    setInternalDraft("");
    toast.success("Note interne ajoutée.");
  };
  const addClient = () => {
    const body = clientDraft.trim();
    if (!body) return;
    store.addRepairMessage(repair.id, { body, visibility: "client", authorType: "staff" });
    setClientDraft("");
    toast.success("Note client publiée. Visible sur le suivi client.");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <NoteColumn
        accent="#6B6B6B"
        badgeLabel="Interne"
        badgeTone="internal"
        draft={internalDraft}
        emptyLabel="Aucune note interne."
        hint="Visible uniquement par l'atelier — jamais affichée au client."
        icon={<Lock className="size-4" />}
        notes={internalNotes}
        onAdd={addInternal}
        onChange={setInternalDraft}
        placeholder="Ex : tactile partiellement HS, vis manquante en bas…"
        textareaRef={internalRef}
        title="Notes internes (atelier)"
      />
      <NoteColumn
        accent="#2A9D8F"
        badgeLabel="Client"
        badgeTone="client"
        draft={clientDraft}
        emptyLabel="Aucune note client publiée."
        hint="Publiée sur le lien de suivi client."
        icon={<MessageSquare className="size-4" />}
        notes={clientNotes}
        onAdd={addClient}
        onChange={setClientDraft}
        placeholder="Ex : la pièce est en commande, réparation en cours…"
        textareaRef={clientRef}
        title="Notes client (suivi)"
      />
    </div>
  );
}

function NoteBadge({ label, tone }: Readonly<{ label: string; tone: "internal" | "client" }>) {
  const internal = tone === "internal";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wide",
        internal ? "bg-[#F7F7F7] text-[#6B6B6B]" : "bg-[#EAF6F2] text-[#167B70]",
      )}
    >
      {internal ? <Lock className="size-3" /> : <MessageSquare className="size-3" />}
      {label}
    </span>
  );
}

function NoteColumn({
  accent,
  badgeLabel,
  badgeTone,
  draft,
  emptyLabel,
  hint,
  icon,
  notes,
  onAdd,
  onChange,
  placeholder,
  textareaRef,
  title,
}: Readonly<{
  title: string;
  hint: string;
  icon: React.ReactNode;
  accent: string;
  badgeLabel: string;
  badgeTone: "internal" | "client";
  notes: Array<{ id: string; body: string; authorName: string; createdAt: string }>;
  draft: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  emptyLabel: string;
}>) {
  return (
    <div className="rounded-[18px] border border-[#E8E8E5] bg-[#FAFAFA] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2" style={{ color: accent }}>
          {icon}
          <p className="font-semibold text-[#1A1916] text-sm">{title}</p>
        </div>
        <NoteBadge label={badgeLabel} tone={badgeTone} />
      </div>
      <p className="mt-0.5 text-[#6B6B6B] text-xs">{hint}</p>
      <ul className="mt-3 space-y-2">
        {notes.length === 0 ? (
          <li className="rounded-[12px] border border-dashed border-[#E8E8E5] bg-white px-3 py-4 text-center text-[#6B6B6B] text-xs">
            {emptyLabel}
          </li>
        ) : (
          notes
            .slice()
            .reverse()
            .map((note) => (
              <li className="rounded-[12px] border border-[#F7F7F7] bg-white px-3 py-2.5" key={note.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-[#1A1916] text-[11px]">
                    {note.authorName} · {formatIsoToDisplay(note.createdAt)}
                  </span>
                  <NoteBadge label={badgeLabel} tone={badgeTone} />
                </div>
                <p className="whitespace-pre-line text-[#1A1916] text-sm">{note.body}</p>
              </li>
            ))
        )}
      </ul>
      <textarea
        className="mt-3 min-h-[80px] w-full rounded-[14px] border border-[#E8E8E5] bg-white px-3 py-2 text-sm outline-none focus:border-[#2A9D8F]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={textareaRef}
        value={draft}
      />
      <PrimaryButton className="mt-2 w-full" disabled={!draft.trim()} onClick={onAdd}>
        Ajouter
      </PrimaryButton>
    </div>
  );
}

function HistoryTab({ items }: Readonly<{ items: string[] }>) {
  return (
    <ol className="space-y-3">
      {items.map((entry, index) => (
        <li className="flex gap-3" key={`${entry}_${index}`}>
          <span className="mt-1 size-2.5 rounded-full bg-[#2A9D8F]" />
          <p className="text-[#1A1916] text-sm">{entry}</p>
        </li>
      ))}
      {items.length === 0 ? <li className="text-[#6B6B6B] text-sm">Aucun événement pour le moment.</li> : null}
    </ol>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function InfoGrid({ items }: Readonly<{ items: Array<[string, string]> }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div className="min-w-0 rounded-[14px] border border-[#F7F7F7] bg-[#FAFAFA] p-3" key={label}>
          <p className="text-[#6B6B6B] text-[11px] uppercase tracking-wide">{label}</p>
          <p className="mt-1 truncate font-semibold text-[#1A1916] text-sm">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TextBlock({ label, value }: Readonly<{ label: string; value?: string }>) {
  return (
    <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FAFAFA] p-4">
      <p className="font-semibold text-[#1A1916] text-sm">{label}</p>
      <p className="mt-2 whitespace-pre-line text-[#6B6B6B] text-sm">{value || "Non renseigné"}</p>
    </div>
  );
}

function EditorGrid({
  actionLabel,
  fields,
  onSave,
}: Readonly<{
  fields: Array<{ label: string; value: string; onChange?: (value: string) => void; readOnly?: boolean }>;
  actionLabel: string;
  onSave: () => void;
}>) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <label className="block" key={field.label}>
          <span className="font-semibold text-[#1A1916] text-sm">{field.label}</span>
          <textarea
            className="mt-2 min-h-[96px] w-full rounded-[14px] border border-[#E8E8E5] bg-white px-3 py-2 text-sm outline-none focus:border-[#2A9D8F]"
            onChange={(event) => field.onChange?.(event.target.value)}
            readOnly={field.readOnly || !field.onChange}
            value={field.value}
          />
        </label>
      ))}
      <PrimaryButton onClick={onSave}>{actionLabel}</PrimaryButton>
    </div>
  );
}

function EmptyLinked({ action, onClick, title }: Readonly<{ title: string; action: string; onClick: () => void }>) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#E8E8E5] bg-[#FAFAFA] p-8 text-center">
      <p className="font-semibold text-[#1A1916]">{title}</p>
      <PrimaryButton className="mt-4" onClick={onClick}>
        {action}
      </PrimaryButton>
    </div>
  );
}

function LinkedRow({
  href,
  onOpen,
  status,
  subtitle,
  title,
}: Readonly<{ title: string; subtitle: string; status: string; href: string; onOpen: () => void }>) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-[#E8E8E5] bg-[#FAFAFA] p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-semibold text-[#1A1916]">{title}</p>
        <p className="text-[#6B6B6B] text-sm">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <SecondaryButton asChild onClick={onOpen}>
          <Link href={href}>Ouvrir</Link>
        </SecondaryButton>
      </div>
    </div>
  );
}
