"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Lock,
  Menu,
  MessageSquare,
  Pencil,
  Printer,
  QrCode,
  Receipt,
  Share2,
  ShoppingCart,
  Smartphone,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { getPrintableTarget } from "@/components/behar/local-printable-document";
import { RealDeviceVisual } from "@/components/behar/real-product-visual";
import {
  SettlementModal,
  useSettlementModal,
  todayInputValue as sharedTodayInputValue,
} from "@/components/behar/settlement-modal";
import {
  buildInvoiceLinesFromRepair,
  formatCurrency,
  formatEuro,
  formatIsoToDisplay,
  getInvoiceTotal,
  getQuoteTotal,
  getRepairReadyDisplayLabel,
  isTerminalRepairStatus,
  paymentMethods,
  type Customer,
  type DeviceModel,
  type Invoice,
  type PaymentMethod,
  type Repair,
  type RepairStatus,
  type SettlementStatus,
  type StockItem,
  useBeharStore,
} from "@/lib/behar-store";
import { getInternalDocumentUrl, getShareableDocumentUrl, printRepairQr } from "@/lib/documents/document-actions";
import { isStockItemCompatibleWithRepair } from "./atelier-workspace";
import { displayCustomerName } from "@/lib/customer-display";
import { getCustomerTrackingUrl } from "@/lib/customer-tracking";
import { formatDeviceLabel } from "@/lib/format-device";
import { generateQrDataUrl, publicAbsoluteUrl } from "@/lib/public-link";
import { cn } from "@/lib/utils";

import { useDocument } from "./print-provider";
import { Modal, PrimaryButton, SecondaryButton, StatusBadge } from "./primitives";
import { TrackingQrModal } from "./tracking-qr-modal";

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
const canQuoteFromStatus = (status: RepairStatus): boolean => ["Reçu", "Diagnostic", "En attente"].includes(status);

// Ordre d'affichage des documents liés : la fiche d'entrée toujours en premier.
const docTypeOrder: Record<string, number> = {
  intake: 0,
  diagnostic_report: 1,
  quote: 2,
  invoice: 3,
  payment: 4,
  "sale-receipt": 5,
  "sale-invoice": 6,
  summary: 7,
  internal: 8,
};

const docLabel: Record<string, string> = {
  intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
  payment: "Confirmation de règlement",
  internal: "Fiche intervention interne",
  summary: "Rapport final",
  "sale-receipt": "Justificatif de vente",
  "sale-invoice": "Facture de vente",
  diagnostic_report: "Rapport diagnostic",
};

const settlementStatuses: SettlementStatus[] = ["Non réglé", "Partiellement réglé", "Réglé", "Offert / Garantie / SAV"];

const settlementMethods: PaymentMethod[] = [
  "Espèces",
  "Carte bancaire",
  "SumUp",
  "Stripe",
  "Virement",
  "Chèque",
  "Autre",
];

function todayInputValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function cleanDossierId(value?: string | null) {
  const id = (value ?? "").trim();
  return id && id !== "_" ? id : "";
}

function dossierIdFromBrowserUrl() {
  if (typeof window === "undefined") return "";
  const urlParams = new URLSearchParams(window.location.search);
  const queryId = urlParams.get("id") || urlParams.get("dossierId");
  if (queryId) return cleanDossierId(queryId);

  const [, rawId] = window.location.pathname.match(/\/dashboard\/dossiers\/([^/?#]+)/) ?? [];
  return cleanDossierId(rawId ? decodeURIComponent(rawId) : "");
}

export function DossierDetailWorkspace({ dossierId }: Readonly<{ dossierId: string }>) {
  const router = useRouter();
  const store = useBeharStore();
  const { print, download, preview } = useDocument();
  const [browserDossierId, setBrowserDossierId] = useState("");
  const [tab, setTab] = useState<DossierTab>("Vue d'ensemble");
  const [mobileTab, setMobileTab] = useState<string>("Vue d'ensemble");
  const [notesFocus, setNotesFocus] = useState<"internal" | "client" | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [viewingMobileDoc, setViewingMobileDoc] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("" as PaymentMethod);
  const settlement = useSettlementModal();
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [settlementDraft, setSettlementDraft] = useState<{
    status: SettlementStatus;
    amount: string;
    date: string;
    method: PaymentMethod;
    customMethod: string;
    externalReference: string;
    note: string;
    confirmExternal: boolean;
  }>({
    status: "Réglé",
    amount: "0",
    date: todayInputValue(),
    method: "" as PaymentMethod,
    customMethod: "",
    externalReference: "",
    note: "",
    confirmExternal: false,
  });
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
  const formatDossier = (value: number) => formatEuro(value);
  const readyDisplayLabel = repair ? getRepairReadyDisplayLabel(repair, payments) : "";

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

    if (!repair.customerId || !customer) {
      return toast.error("Ajoutez un client ou sélectionnez un client comptoir avant de générer la facture.");
    }

    if (!repair.currency) {
      return toast.error("Sélectionnez une devise pour le dossier avant de générer la facture.");
    }

    let hasLines = false;
    let totalAmount = 0;

    if (acceptedQuote) {
      hasLines = Boolean(acceptedQuote.lines && acceptedQuote.lines.length > 0);
      totalAmount = acceptedQuote.totalTtc ?? acceptedQuote.totalAmount ?? 0;
    } else {
      const partsCount = repair.parts?.length ?? 0;
      hasLines =
        partsCount > 0 ||
        (repair.total !== undefined && repair.total > 0) ||
        (repair.amount !== undefined && repair.amount > 0);
      totalAmount = repair.total ?? repair.amount ?? 0;
    }

    if (totalAmount <= 0 && !hasLines) {
      return toast.error("Ajoutez au moins une ligne avec un montant avant de générer la facture.");
    }

    const id = acceptedQuote ? store.convertQuoteToInvoice(acceptedQuote.id) : store.createInvoiceFromRepair(repair.id);
    if (!id) return toast.error("Création de facture impossible : vérifiez le devis accepté ou le total du dossier.");
    store.setSelected("invoice", id);
    toast.success("Facture liée au dossier.");
  };

  const indicatePayment = () => {
    settlement.open(repair.id);
  };

  const advance = () => {
    const target = nextStatus[repair.status];
    if (!target) return toast.info("Aucune étape suivante disponible.");
    store.changeRepairStatus(repair.id, target);
    toast.success(`Dossier passé en ${target}.`);
  };

  const closeDossier = () => {
    // Open the closure + settlement modal instead of window.confirm
    setSettlementDraft((draft) => ({
      ...draft,
      amount: String(dossierTotal || repair.amount || 0),
      date: todayInputValue(),
      method: settlementMethods.includes(paymentMethod) ? paymentMethod : ("" as PaymentMethod),
      customMethod: "",
      status:
        paidAmount > 0 && paidAmount >= dossierTotal ? "Réglé" : paidAmount > 0 ? "Partiellement réglé" : "Non réglé",
      confirmExternal: false,
      externalReference: "",
      note: "",
    }));
    setClosureModalOpen(true);
  };

  const submitClosure = () => {
    const amount = Number.parseFloat(settlementDraft.amount.replace(",", "."));
    const ok = store.closeDossierWithSettlement(repair.id, {
      status: settlementDraft.status,
      amount: Number.isFinite(amount) ? amount : 0,
      date: settlementDraft.date,
      method: settlementDraft.method,
      customMethod: settlementDraft.customMethod,
      externalReference: settlementDraft.externalReference,
      note: settlementDraft.note,
      confirmExternal: settlementDraft.confirmExternal,
    });
    if (!ok) {
      toast.error("Clôture impossible. Vérifiez les informations de règlement.");
      return;
    }
    setClosureModalOpen(false);
    toast.success("Dossier clôturé avec succès.");
  };

  const activeIndex = Math.max(0, progression.indexOf(repair.status));

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block space-y-5">
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
          <div className="flex flex-wrap justify-end gap-2">
            <StatusPill status={repair.status} />
            {repair.status === "Prêt" && <StatusBadge status={readyDisplayLabel} />}
            {repair.finalTest?.status && <StatusBadge status={repair.finalTest.status} />}
          </div>
        </div>

        {/* En-tête : client / appareil / problème / intervention / montant */}
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
          <div className="flex flex-col gap-5 divide-y divide-[#FFFFFF] lg:flex-row lg:items-center lg:divide-x lg:divide-y-0">
            <div className="flex min-w-0 items-center gap-3 lg:pr-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#FFFFFF] font-semibold text-[#167B70]">
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
                className="size-20 rounded-[18px] border border-[#E8E8E5] bg-[#FFFFFF] p-2 shadow-[0_10px_24px_rgba(26,25,22,0.045)]"
                model={repair.deviceModel || repair.model || repair.device}
                type={repair.deviceType}
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#1A1916]">{formatDeviceLabel(repair, repair.device)}</p>
                <p className="truncate text-[#6B6B6B] text-xs">
                  {repair.imei ? `IMEI : ${repair.imei}` : "IMEI / S/N non renseigné"}
                </p>
              </div>
            </div>
            <HeaderCol className="lg:px-6" label="Problème" value={repair.issue || "À préciser"} />
            <HeaderCol
              className="lg:px-6"
              label="Intervention prévue"
              value={repair.recommendedIntervention || repair.issueType || "À définir"}
            />
            {repair.status === "Prêt" && (
              <HeaderCol className="lg:px-6" label="Restitution" value={readyDisplayLabel} />
            )}
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
                paymentSummary={repair.paymentMethodNote}
                setPaymentMethod={setPaymentMethod}
              />
            )}
            {tab === "Documents" && (
              <DocumentsTab documents={documents} download={download} print={print} repair={repair} />
            )}
            {tab === "Notes" && (
              <NotesTab focus={notesFocus} onFocusHandled={() => setNotesFocus(null)} repair={repair} />
            )}
            {tab === "Historique" && <HistoryTab items={activity} />}
          </section>
        )}
      </div>

      {/* Mobile view */}
      <div className="block md:hidden space-y-5 px-1 py-1 min-h-screen text-[#1A1916]">
        <MobileRepairHeader repair={repair} customer={customer} readyDisplayLabel={readyDisplayLabel} />

        <MobileRepairSummaryCard
          repair={repair}
          customer={customer}
          dossierTotal={dossierTotal}
          formatDossier={formatDossier}
        />

        <MobileRepairStepper status={repair.status} />

        <MobileRepairTabs activeTab={mobileTab} setActiveTab={setMobileTab} />

        <div className="space-y-4 pt-1">
          {mobileTab === "Vue d'ensemble" && (
            <MobileOverviewSection
              repair={repair}
              customer={customer}
              documents={documents}
              invoices={invoices}
              quotes={quotes}
              total={dossierTotal}
              onAdvance={advance}
              onClose={closeDossier}
              onCreateQuote={createQuote}
              onCreateInvoice={createInvoice}
              onPrint={() => setMobileTab("Documents")}
              onNotes={(t) => {
                setMobileTab("Notes");
                if (t) setNotesFocus(t);
              }}
              setViewingMobileDoc={setViewingMobileDoc}
            />
          )}
          {mobileTab === "Fiche d'entrée" && (
            <MobileEntrySheetSection
              repair={repair}
              customer={customer}
              documents={documents}
              setActivePhotoIndex={setActivePhotoIndex}
            />
          )}
          {mobileTab === "Diagnostic" && (
            <MobileDiagnosticSection
              repair={repair}
              onCreateQuote={createQuote}
              onNotes={() => setMobileTab("Notes")}
            />
          )}
          {mobileTab === "Pièces" && <MobilePartsSection repair={repair} />}
          {mobileTab === "Devis" && (
            <MobileQuoteSection
              repair={repair}
              quote={quote}
              quotes={quotes}
              onCreate={createQuote}
              setViewingMobileDoc={setViewingMobileDoc}
            />
          )}
          {mobileTab === "Facture" && (
            <MobileInvoiceSection
              invoice={invoice}
              invoices={invoices}
              onCreate={createInvoice}
              onPayment={indicatePayment}
              paymentMethod={paymentMethod}
              paymentSummary={repair.paymentMethodNote}
              setPaymentMethod={setPaymentMethod}
              formatDossier={formatDossier}
              setViewingMobileDoc={setViewingMobileDoc}
            />
          )}
          {mobileTab === "Documents" && (
            <MobileDocumentsSection
              repair={repair}
              documents={documents}
              download={download}
              print={print}
              setViewingMobileDoc={setViewingMobileDoc}
            />
          )}
          {mobileTab === "Notes" && (
            <MobileNotesHistorySection repair={repair} focus={notesFocus} onFocusHandled={() => setNotesFocus(null)} />
          )}
          {mobileTab === "SAV" && (
            <MobileFinalTestSection
              repair={repair}
              onAdvance={advance}
              onClose={closeDossier}
              invoice={invoice}
              setMobileTab={setMobileTab}
              setViewingMobileDoc={setViewingMobileDoc}
            />
          )}
        </div>

        {/* Visionneuse de document plein écran sur mobile */}
        {viewingMobileDoc && (
          <MobileDocumentViewerModal
            doc={viewingMobileDoc}
            repair={repair}
            customer={customer}
            quotes={quotes}
            invoices={invoices}
            payments={payments}
            onClose={() => setViewingMobileDoc(null)}
            download={download}
            print={print}
          />
        )}

        {/* Visionneuse de photos (Lightbox) sur mobile */}
        {activePhotoIndex !== null && (
          <MobilePhotoLightbox
            photos={repair.intakeCondition?.photos ?? repair.workshopPhotos ?? []}
            activeIndex={activePhotoIndex}
            onClose={() => setActivePhotoIndex(null)}
            onChangeIndex={setActivePhotoIndex}
          />
        )}
      </div>

      <SettlementModal
        draft={settlement.draft}
        isOpen={settlement.isOpen}
        onClose={settlement.close}
        onDraftChange={settlement.setDraft}
        onSubmit={settlement.submit}
        total={settlement.total}
      />
      <ClosureSettlementModal
        draft={settlementDraft}
        isOpen={closureModalOpen}
        onClose={() => setClosureModalOpen(false)}
        onDraftChange={setSettlementDraft}
        onSubmit={submitClosure}
        repair={repair}
        customer={customer}
        invoice={invoice}
        total={dossierTotal}
      />
    </>
  );
}

/* ───────────────────────── En-tête ───────────────────────── */

/* ───────────────────────── En-tête ───────────────────────── */

function HeaderCol({ className, label, value }: Readonly<{ label: string; value: string; className?: string }>) {
  return (
    <div className={cn("min-w-0 pt-5 lg:pt-0", className)}>
      <p className="text-[#6B6B6B] text-xs">{label}</p>
      <p className="mt-1 truncate font-medium text-[#1A1916] text-sm">{value}</p>
    </div>
  );
}

function ClosureSettlementModal({
  draft,
  isOpen,
  onClose,
  onDraftChange,
  onSubmit,
  repair,
  customer,
  invoice,
  total,
}: Readonly<{
  draft: {
    status: SettlementStatus;
    amount: string;
    date: string;
    method: PaymentMethod;
    customMethod: string;
    externalReference: string;
    note: string;
    confirmExternal: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onDraftChange: (draft: {
    status: SettlementStatus;
    amount: string;
    date: string;
    method: PaymentMethod;
    customMethod: string;
    externalReference: string;
    note: string;
    confirmExternal: boolean;
  }) => void;
  onSubmit: () => void;
  repair: Repair;
  customer?: Pick<Customer, "name" | "phone">;
  invoice?: Invoice;
  total: number;
}>) {
  const patch = (partial: Partial<typeof draft>) => onDraftChange({ ...draft, ...partial });

  const isPaid = draft.status === "Réglé" || draft.status === "Partiellement réglé";
  const canSubmit = !isPaid || (draft.method && draft.confirmExternal && Number(draft.amount.replace(",", ".")) > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clôture & règlement" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Résumé dossier */}
        <section className="rounded-[14px] border border-[#E8E8E5] bg-[#FAFAFA] p-4 text-sm">
          <h3 className="font-semibold text-[#1A1916] mb-3">Résumé du dossier</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[#6B6B6B] block text-xs mb-1">Dossier</span>
              <span className="font-medium">{repair.number}</span>
            </div>
            <div>
              <span className="text-[#6B6B6B] block text-xs mb-1">Client</span>
              <span className="font-medium">{customer?.name || "Client de passage"}</span>
            </div>
            <div>
              <span className="text-[#6B6B6B] block text-xs mb-1">Appareil</span>
              <span className="font-medium">
                {[repair.brandName, repair.deviceModel].filter(Boolean).join(" ") || repair.device || "Appareil"}
              </span>
            </div>
            <div>
              <span className="text-[#6B6B6B] block text-xs mb-1">Total TTC</span>
              <span className="font-bold text-[#1A1916] text-base">{formatEuro(total)}</span>
            </div>
          </div>
          {invoice && (
            <div className="mt-3 pt-3 border-t border-[#E8E8E5]">
              <span className="text-[#6B6B6B] text-xs">Facture liée : </span>
              <span className="font-medium">{invoice.number}</span>
            </div>
          )}
        </section>

        {/* Statut règlement */}
        <section>
          <h3 className="font-semibold text-[#1A1916] mb-3 text-sm">Statut du règlement</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["Non réglé", "Partiellement réglé", "Réglé"] as SettlementStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  patch({
                    status,
                    amount: status === "Non réglé" ? "0" : String(total),
                    method: status === "Non réglé" ? ("" as PaymentMethod) : draft.method,
                    confirmExternal: status === "Non réglé" ? false : draft.confirmExternal,
                  });
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-[12px] border h-11 px-3 text-sm font-medium transition-colors",
                  draft.status === status
                    ? "border-[#2A9D8F] bg-[#E9F4F3] text-[#167B70]"
                    : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:bg-[#FAFAFA]",
                )}
              >
                {draft.status === status && <CheckCircle2 className="size-4" />}
                {status}
              </button>
            ))}
          </div>
        </section>

        {isPaid && (
          <div className="space-y-4 rounded-[14px] border border-[#E8E8E5] p-4 bg-white shadow-[0_1px_2px_rgba(26,25,22,0.02)]">
            <h3 className="font-semibold text-[#1A1916] text-sm">Informations d'encaissement</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">Montant réglé (€)</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  inputMode="decimal"
                  onChange={(event) => patch({ amount: event.target.value })}
                  type="text"
                  value={draft.amount}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">Moyen de paiement</span>
                <select
                  className={cn(
                    "h-11 rounded-[12px] border bg-white px-3 outline-none focus:border-[#2A9D8F]",
                    !draft.method ? "border-red-300 ring-1 ring-red-100" : "border-[#E8E8E5]",
                  )}
                  onChange={(event) => patch({ method: event.target.value as PaymentMethod })}
                  value={draft.method}
                >
                  <option value="" disabled>
                    Sélectionner...
                  </option>
                  {settlementMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              {draft.method === "Autre" && (
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="font-semibold text-[#1A1916]">Préciser le moyen de paiement</span>
                  <input
                    className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                    onChange={(event) => patch({ customMethod: event.target.value })}
                    type="text"
                    value={draft.customMethod}
                    placeholder="Ex: Chèque cadeau..."
                  />
                </label>
              )}

              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">Date</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => patch({ date: event.target.value })}
                  type="date"
                  value={draft.date}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">Réf. externe (facultatif)</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => patch({ externalReference: event.target.value })}
                  type="text"
                  placeholder="N° transaction..."
                  value={draft.externalReference}
                />
              </label>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-[12px] bg-[#FEFBF6] p-3 border border-[#F3E8C8] cursor-pointer">
              <input
                type="checkbox"
                checked={draft.confirmExternal}
                onChange={(e) => patch({ confirmExternal: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
              />
              <span className="text-sm font-medium text-[#B48421]">
                Je confirme que ce paiement a bien été encaissé hors de l'application Behar Tech Pro.
              </span>
            </label>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-[#E8E8E5]">
          <button
            className="flex h-11 flex-1 items-center justify-center rounded-[12px] border border-[#E8E8E5] bg-white font-semibold text-[#1A1916] text-sm hover:bg-[#FAFAFA]"
            onClick={onClose}
            type="button"
          >
            Annuler
          </button>
          <PrimaryButton className="flex-1" onClick={onSubmit} disabled={!canSubmit}>
            {draft.status === "Non réglé"
              ? "Clôturer sans règlement"
              : draft.status === "Réglé"
                ? "Clôturer et marquer réglé"
                : "Clôturer (règlement partiel)"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function StatusPill({ status }: Readonly<{ status: RepairStatus }>) {
  const tone =
    status === "Rendu" || status === "Clôturé"
      ? "bg-[#FFFFFF] text-[#6B6B6B]"
      : status === "Prêt"
        ? "bg-[#FFFFFF] text-[#0B7A56]"
        : status === "Annulé" || status === "Irréparable"
          ? "bg-[#FFFFFF] text-[#B42318]"
          : status === "Devis envoyé" || status === "SAV"
            ? "bg-[#FFFFFF] text-[#936100]"
            : "bg-[#FFFFFF] text-[#167B70]";
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
                    index === 0 ? "opacity-0" : index <= activeIndex ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]",
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
                    index === progression.length - 1
                      ? "opacity-0"
                      : index < activeIndex
                        ? "bg-[#2A9D8F]"
                        : "bg-[#FFFFFF]",
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
                      ? "bg-[#FFFFFF] text-[#2A9D8F]"
                      : current
                        ? "bg-[#2A9D8F] text-white"
                        : "bg-[#FFFFFF] text-[#8A8A8A]",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : current ? <Clock className="size-3.5" /> : index + 1}
                </span>
                {!isLast ? (
                  <span className={cn("my-0.5 w-0.5 flex-1", done ? "bg-[#FFFFFF]" : "bg-[#FFFFFF]")} />
                ) : null}
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
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E8E8E5] px-2.5 py-1 text-[#6B6B6B] text-xs font-medium hover:bg-[#FFFFFF]"
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
            <FactBlock
              label="Temps estimé"
              value={repair.estimatedDoneAt ? formatIsoToDisplay(repair.estimatedDoneAt) : "—"}
            />
          </div>
          <FactBlock
            label="Pièces utilisées"
            value={
              repair.parts.length
                ? repair.parts.map((part) => `${part.name} ×${part.quantity}`).join(", ")
                : "Aucune pièce"
            }
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
  const { preview, download } = useDocument();
  const rows = documents.map((doc) => {
    const quote = doc.type === "quote" ? (quotes.find((q) => q.id === (doc as any).quoteId) ?? quotes[0]) : undefined;
    const invoice =
      doc.type === "invoice" ? (invoices.find((i) => i.id === (doc as any).invoiceId) ?? invoices[0]) : undefined;
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
          <li className="rounded-[12px] border border-dashed border-[#E8E8E5] bg-[#FFFFFF] px-3 py-4 text-center text-[#6B6B6B] text-xs">
            Aucun document lié.
          </li>
        ) : (
          rows.map(({ doc, amount, number, statusLabel }) => (
            <li
              className="flex items-center gap-3 rounded-[12px] border border-[#FFFFFF] bg-[#FFFFFF] px-3 py-2.5"
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
              {amount ? (
                <span className="shrink-0 font-semibold text-[#1A1916] text-sm">{formatEuro(amount)}</span>
              ) : null}
              {statusLabel ? (
                <span className="shrink-0 rounded-full bg-[#FFFFFF] px-2 py-0.5 font-semibold text-[#167B70] text-[11px]">
                  {statusLabel}
                </span>
              ) : null}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title="Ouvrir le document"
                  className="grid size-7 place-items-center rounded-[8px] text-[#6B6B6B] hover:bg-white"
                  onClick={() => {
                    const target = getPrintableTarget(doc as any);
                    if (target) {
                      preview(target.type, target.id);
                    } else {
                      toast.error("Document lié introuvable");
                    }
                  }}
                >
                  <ExternalLink className="size-4" />
                </button>
                <button
                  type="button"
                  title="Télécharger le PDF"
                  className="grid size-7 place-items-center rounded-[8px] text-[#6B6B6B] hover:bg-white"
                  onClick={() => {
                    const target = getPrintableTarget(doc as any);
                    if (target) {
                      download(target.type, target.id);
                    } else {
                      toast.error("Document lié introuvable");
                    }
                  }}
                >
                  <Download className="size-4" />
                </button>
                <button
                  type="button"
                  title="Copier le lien du document"
                  className="grid size-7 place-items-center rounded-[8px] text-[#6B6B6B] hover:bg-white"
                  onClick={async () => {
                    try {
                      const url = getShareableDocumentUrl(doc as any);
                      if (url) {
                        await navigator.clipboard.writeText(url);
                        toast.success("Lien du document copié.");
                      } else {
                        toast.error("Lien non disponible.");
                      }
                    } catch {
                      toast.error("Erreur lors de la copie.");
                    }
                  }}
                >
                  <Share2 className="size-4" />
                </button>
              </div>
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const store = useBeharStore();
  const trackingUrl = getCustomerTrackingUrl(repair, store.workshopSettings ?? store.workshopInfo);

  useEffect(() => {
    if (!repair.publicAccess) ensureRepairPublicAccess(repair.id);
  }, [repair.id, repair.publicAccess, ensureRepairPublicAccess]);

  useEffect(() => {
    if (trackingUrl)
      generateQrDataUrl(trackingUrl)
        .then(setQr)
        .catch(() => setQr(""));
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
          <div className="cursor-pointer shrink-0" onClick={() => setIsModalOpen(true)}>
            <img alt="QR de suivi" className="size-24 rounded-[12px] border border-[#FFFFFF] bg-white p-1.5" src={qr} />
          </div>
        ) : (
          <div className="grid size-24 shrink-0 place-items-center rounded-[12px] bg-[#FFFFFF] text-[#9A9AA0] text-xs">
            QR…
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[#6B6B6B] text-xs">Le client peut suivre l'avancement de son dossier en ligne.</p>
          <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-[#FFFFFF] px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-[#1E7A6E] text-xs">{trackingUrl || "Lien en cours…"}</span>
            <button
              className="grid size-6 shrink-0 place-items-center rounded-[7px] text-[#6B6B6B] hover:bg-white"
              onClick={copyLink}
              type="button"
            >
              {copied ? <Check className="size-3.5 text-[#2A9D8F]" /> : <Copy className="size-3.5" />}
            </button>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-7 items-center justify-center rounded-[8px] border border-[#E8E8E5] px-2.5 text-xs font-semibold text-[#1A1916] hover:bg-[#FFFFFF]"
            >
              Afficher QR Code
            </button>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center justify-center rounded-[8px] bg-[#2A9D8F] px-2.5 text-xs font-semibold text-white hover:bg-[#238579]"
            >
              Ouvrir le suivi
            </a>
          </div>
        </div>
      </div>
      <TrackingQrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} repairId={repair.id} />
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[#1A1916] text-sm hover:bg-[#FFFFFF]"
          href="/dashboard/ventes"
        >
          <ShoppingCart className="size-4" />
          Vente comptoir
        </Link>
        <ActionRow
          icon={<Lock className="size-4" />}
          label="Ajouter une note interne"
          onClick={() => onNotes("internal")}
        />
        <ActionRow
          icon={<MessageSquare className="size-4" />}
          label="Ajouter une note client"
          onClick={() => onNotes("client")}
        />
        {(canMarkReturned || !isTerminalRepairStatus(repair.status)) && (
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#F3D0CC] bg-white font-semibold text-[#B42318] text-sm hover:bg-[#FFFFFF]"
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
      className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[#1A1916] text-sm hover:bg-[#FFFFFF]"
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
      <dl className="mt-3 divide-y divide-[#FFFFFF]">
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
  const { preview, download } = useDocument();
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
      <div className="flex flex-col gap-3 rounded-[16px] border border-[#2A9D8F]/25 bg-[#FFFFFF] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-[#167B70]">Fiche d'entrée · Bon de prise en charge</p>
          <p className="text-[#167B70]/80 text-sm">
            Dossier {repair.number} · Créée le {formatIsoToDisplay(repair.droppedAt || repair.createdAt || "")}
          </p>
        </div>
        {intakeDoc ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#2A9D8F] px-4 text-sm font-semibold text-white hover:bg-[#238579]"
              onClick={() => preview("intake", repair.id)}
            >
              <ExternalLink className="size-4" />
              Ouvrir
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 text-sm font-semibold text-[#1A1916] hover:bg-[#FFFFFF]"
              onClick={() => download("intake", repair.id)}
            >
              <Download className="size-4" />
              Télécharger PDF
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 text-sm font-semibold text-[#1A1916] hover:bg-[#FFFFFF]"
              onClick={async () => {
                try {
                  const url = getShareableDocumentUrl(intakeDoc);
                  if (url) {
                    await navigator.clipboard.writeText(url);
                    toast.success("Lien de prise en charge copié.");
                  } else {
                    toast.error("Lien non disponible.");
                  }
                } catch {
                  toast.error("Erreur lors de la copie.");
                }
              }}
            >
              <Share2 className="size-4" />
              Copier le lien
            </button>
          </div>
        ) : null}
      </div>

      <InfoGrid
        items={[
          ["N° dossier", repair.number],
          ["Date de prise en charge", formatIsoToDisplay(repair.droppedAt || repair.createdAt || "")],
          ["Client", displayCustomerName(customer) || "Non renseigné"],
          ["Téléphone", customer?.phone || "Non renseigné"],
          ["Appareil", formatDeviceLabel(repair, repair.device)],
          [
            "Marque / modèle",
            [repair.brandName, repair.deviceModel || repair.model].filter(Boolean).join(" ") || "Non renseigné",
          ],
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
  const { uploadToCloud } = useDocument();
  const [diagnosticNotes, setDiagnosticNotes] = useState(repair.diagnosticNotes ?? "");
  const [recommended, setRecommended] = useState(repair.recommendedIntervention ?? "");

  const save = () => {
    store.updateRepair(repair.id, {
      diagnosticNotes,
      recommendedIntervention: recommended,
      history: [...repair.history, "Diagnostic enregistré"],
    });
    toast.success("Diagnostic enregistré.");
  };

  const createDiagnosticReport = () => {
    const existing = store.documents.find((d) => d.repairId === repair.id && d.type === "diagnostic_report");
    if (existing) {
      toast.info("Le rapport diagnostic existe déjà.");
      return;
    }

    const docId = store.addDocument({
      type: "diagnostic_report",
      title: `Rapport diagnostic - ${repair.number}`,
      customerId: repair.customerId,
      repairId: repair.id,
    });

    store.updateRepair(repair.id, {
      history: [...repair.history, "Document généré : rapport diagnostic"],
    });

    toast.success("Rapport diagnostic généré.");
    if (docId) uploadToCloud("diagnostic_report", repair.id, docId);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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
      <aside className="space-y-3">
        <div className="rounded-[18px] border border-[#E8E8E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
          <h4 className="font-semibold text-sm text-[#1A1916]">Actions diagnostic</h4>
          <p className="text-xs text-[#6B6B6B] mt-1 mb-4">
            Générez le rapport de diagnostic officiel et de tests de l'appareil.
          </p>
          <SecondaryButton className="w-full" onClick={createDiagnosticReport}>
            Générer rapport diagnostic
          </SecondaryButton>
        </div>
      </aside>
    </div>
  );
}

function RepairTab({ onAdvance, repair }: Readonly<{ repair: Repair; onAdvance: () => void }>) {
  const store = useBeharStore();
  const [notes, setNotes] = useState(repair.repairNotes ?? repair.notes ?? "");
  const save = () => {
    store.updateRepair(repair.id, {
      repairNotes: notes,
      notes,
      history: [...repair.history, "Notes réparation mises à jour"],
    });
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
        <TextBlock
          label="Pièces utilisées / réservées"
          value={repair.parts.map((part) => `${part.name} x${part.quantity}`).join("\n")}
        />
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
        <PrimaryButton onClick={() => store.updateQuote(quote.id, { status: "Accepté" })}>
          Accepter le devis
        </PrimaryButton>
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
  paymentSummary,
  setPaymentMethod,
}: Readonly<{
  invoice?: { id: string; number: string; status: string; lines: any[] };
  invoices: any[];
  onCreate: () => void;
  onPayment: () => void;
  paymentMethod: PaymentMethod;
  paymentSummary?: string;
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
      {paymentSummary ? (
        <div className="rounded-[14px] border border-[#D7EFEA] bg-[#FFFFFF] p-3 text-[#1E7A6E] text-sm font-semibold">
          {paymentSummary}
        </div>
      ) : null}
      <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
        <p className="font-semibold text-[#1A1916]">Moyen de règlement indiqué</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {paymentMethods.map((method) => (
            <button
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                paymentMethod === method
                  ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                  : "border-[#E8E8E5] bg-white text-[#1A1916]",
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
  repair,
}: Readonly<{
  documents: Array<{ id: string; title: string; type: string }>;
  print: (type: any, id: string) => void;
  download: (type: any, id: string) => void;
  repair: Repair;
}>) {
  const { preview } = useDocument();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-[16px] border border-[#E8E8E5] bg-white p-4">
        <SecondaryButton
          onClick={() => {
            if (!printRepairQr(repair.id)) toast.error("QR de suivi indisponible.");
          }}
        >
          <QrCode className="size-4" />
          Imprimer QR suivi
        </SecondaryButton>
        <SecondaryButton
          onClick={async () => {
            try {
              const state = useBeharStore.getState();
              const access = repair.publicAccess ?? state.ensureRepairPublicAccess(repair.id);
              if (!access) return toast.error("Lien de suivi indisponible.");
              await navigator.clipboard.writeText(
                getCustomerTrackingUrl(
                  { ...repair, publicAccess: access },
                  state.workshopSettings ?? state.workshopInfo,
                ),
              );
              toast.success("Lien de suivi copié");
            } catch {
              toast.error("Copie impossible.");
            }
          }}
        >
          <Copy className="size-4" />
          Copier lien suivi client
        </SecondaryButton>
      </div>
      {!documents.length ? (
        <EmptyLinked action="Retour au dossier" onClick={() => undefined} title="Aucun document lié" />
      ) : null}
      {documents.map((document) => {
        const target = getPrintableTarget(document as any);
        return (
          <div
            className="flex flex-col gap-3 rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-4 md:flex-row md:items-center md:justify-between"
            key={document.id}
          >
            <div>
              <p className="font-semibold text-[#1A1916]">{docLabel[document.type] ?? document.title}</p>
              <p className="text-[#6B6B6B] text-sm">{document.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                disabled={!target}
                onClick={() => {
                  if (target) {
                    preview(target.type, target.id);
                  } else {
                    toast.error("Document lié introuvable");
                  }
                }}
              >
                <ExternalLink className="size-4" />
                Aperçu
              </SecondaryButton>
              <SecondaryButton disabled={!target} onClick={() => target && print(target.type, target.id)}>
                <Printer className="size-4" />
                Imprimer
              </SecondaryButton>
              <SecondaryButton disabled={!target} onClick={() => target && download(target.type, target.id)}>
                <Download className="size-4" />
                Télécharger
              </SecondaryButton>
              <SecondaryButton
                disabled={!target}
                onClick={async () => {
                  try {
                    const url = getShareableDocumentUrl(document as any);
                    if (url) {
                      await navigator.clipboard.writeText(url);
                      toast.success("Lien du document copié.");
                    } else {
                      toast.error("Lien non disponible.");
                    }
                  } catch {
                    toast.error("Erreur lors de la copie.");
                  }
                }}
              >
                <Share2 className="size-4" />
                Copier le lien
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
        internal ? "bg-[#FFFFFF] text-[#6B6B6B]" : "bg-[#FFFFFF] text-[#167B70]",
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
    <div className="rounded-[18px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
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
              <li className="rounded-[12px] border border-[#FFFFFF] bg-white px-3 py-2.5" key={note.id}>
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
        <div className="min-w-0 rounded-[14px] border border-[#FFFFFF] bg-[#FFFFFF] p-3" key={label}>
          <p className="text-[#6B6B6B] text-[11px] uppercase tracking-wide">{label}</p>
          <p className="mt-1 truncate font-semibold text-[#1A1916] text-sm">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TextBlock({ label, value }: Readonly<{ label: string; value?: string }>) {
  return (
    <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
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
    <div className="rounded-[18px] border border-dashed border-[#E8E8E5] bg-[#FFFFFF] p-8 text-center">
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
    <div className="flex flex-col gap-3 rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-4 md:flex-row md:items-center md:justify-between">
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

/* ───────────────────────── COMPOSANTS RESPONSIVE MOBILE ───────────────────────── */

function MobileRepairHeader({
  repair,
  customer,
  readyDisplayLabel,
}: Readonly<{
  repair: Repair;
  customer?: Customer;
  readyDisplayLabel: string;
}>) {
  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/reparations"
          className="inline-flex items-center gap-1.5 text-[#6B6B6B] text-xs font-semibold hover:text-[#1A1916] bg-white border border-[#E8E8E5] px-3.5 py-2 rounded-full shadow-[0_1px_2px_rgba(26,25,22,0.02)]"
        >
          <ArrowLeft className="size-3.5" />
          Retour
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="font-black text-[11px] tracking-wider text-[#6B6B6B]">BEHAR • TECH</span>
          <span className="px-1.5 py-0.5 text-[9px] font-black bg-[#FFFFFF] text-[#167B70] rounded-[6px] tracking-wide shadow-sm">
            PRO
          </span>
        </div>
        <button
          type="button"
          className="p-2 rounded-full bg-white border border-[#E8E8E5] text-[#1A1916] hover:bg-[#FFFFFF] shadow-[0_1px_2px_rgba(26,25,22,0.02)]"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {/* Titre & Statut */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-[22px] font-semibold text-[#1A1916] tracking-tight">Dossier #{repair.number}</h1>
        <div className="flex flex-col items-end gap-1">
          <StatusPill status={repair.status} />
          {repair.status === "Prêt" && <StatusBadge status={readyDisplayLabel} />}
          {repair.finalTest?.status && <StatusBadge status={repair.finalTest.status} />}
        </div>
      </div>

      {/* Appareil & Client Row (Miniature intégrée) */}
      <div className="flex items-center gap-3 bg-[#FFFFFF] rounded-[16px] p-3 border border-[#E8E8E5]/60 shadow-[0_2px_6px_rgba(26,25,22,0.015)]">
        <RealDeviceVisual
          brand={repair.brandName}
          className="size-11 shrink-0 rounded-[12px] border border-[#E8E8E5] bg-white p-1.5 shadow-[0_4px_12px_rgba(26,25,22,0.02)]"
          model={repair.deviceModel || repair.model || repair.device}
          type={repair.deviceType}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#1A1916] truncate">{formatDeviceLabel(repair, repair.device)}</p>
          <p className="text-[11px] text-[#6B6B6B] mt-0.5 truncate">{displayCustomerName(customer) || "Client"}</p>
        </div>
      </div>
    </div>
  );
}

function MobileRepairSummaryCard({
  repair,
  customer,
  dossierTotal,
  formatDossier,
}: Readonly<{
  repair: Repair;
  customer?: Customer;
  dossierTotal: number;
  formatDossier: (val: number) => string;
}>) {
  return (
    <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
      {/* Device Visual Header */}
      <div className="flex items-center gap-3.5 pb-3 border-b border-[#FFFFFF]">
        <RealDeviceVisual
          brand={repair.brandName}
          className="size-12 shrink-0 rounded-[12px] border border-[#E8E8E5] bg-[#FFFFFF] p-1.5 shadow-[0_4px_12px_rgba(26,25,22,0.02)]"
          model={repair.deviceModel || repair.model || repair.device}
          type={repair.deviceType}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#1A1916] truncate">{formatDeviceLabel(repair, repair.device)}</h3>
          <p className="text-xs text-[#6B6B6B] mt-0.5 truncate">
            {repair.imei ? `IMEI : ${repair.imei}` : "IMEI : Non renseigné"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Client</span>
          <p className="text-sm font-semibold text-[#1A1916] mt-0.5 truncate">
            {displayCustomerName(customer) || "Client"}
          </p>
          <p className="text-xs text-[#6B6B6B] mt-0.5 truncate">{customer?.phone || "Téléphone non renseigné"}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Problème</span>
          <p className="text-sm font-semibold text-[#1A1916] mt-0.5 truncate">{repair.issue || "Non renseigné"}</p>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Intervention</span>
          <p className="text-sm font-semibold text-[#1A1916] mt-0.5 truncate">
            {repair.recommendedIntervention || repair.issueType || "Diagnostic"}
          </p>
        </div>
      </div>
      <div className="pt-3 border-t border-[#FFFFFF] flex items-center justify-between">
        <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Montant dossier</span>
        <span className="text-xl font-bold text-[#167B70] tracking-tight">{formatDossier(dossierTotal)}</span>
      </div>
    </div>
  );
}

function MobileRepairStepper({
  status,
}: Readonly<{
  status: RepairStatus;
}>) {
  const steps = ["Reçu", "Diagnostic", "Devis", "Réparation", "Test final", "Prêt", "Rendu"];

  const getActiveStepIndex = (s: RepairStatus): number => {
    switch (s) {
      case "Reçu":
        return 0;
      case "Diagnostic":
        return 1;
      case "En attente":
      case "Devis envoyé":
      case "Devis accepté":
        return 2;
      case "En réparation":
        return 3;
      case "Test final":
        return 4;
      case "Prêt":
        return 5;
      case "Rendu":
      case "Clôturé":
      default:
        return 6;
    }
  };

  const activeIndex = getActiveStepIndex(status);

  return (
    <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-4 shadow-[0_4px_12px_rgba(26,25,22,0.02)] overflow-x-auto scrollbar-none">
      <div className="flex items-center min-w-[560px] py-1">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div className="flex flex-1 items-center" key={step}>
              <div className="flex flex-col items-center flex-1">
                <div className="flex w-full items-center">
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      index === 0 ? "opacity-0" : isCompleted || isCurrent ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]",
                    )}
                  />
                  <div
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold transition-all duration-200",
                      isCompleted
                        ? "border-[#2A9D8F] bg-[#2A9D8F] text-white shadow-sm"
                        : isCurrent
                          ? "border-[#2A9D8F] bg-white text-[#2A9D8F] shadow-[0_0_0_2px_rgba(42,157,143,0.1)] scale-110"
                          : "border-[#E8E8E5] bg-white text-[#6B6B6B]",
                    )}
                  >
                    {isCompleted ? <Check className="size-4" /> : index + 1}
                  </div>
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      index === steps.length - 1 ? "opacity-0" : isCompleted ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]",
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-[11px] font-semibold tracking-tight whitespace-nowrap",
                    isCurrent ? "text-[#1A1916] font-bold" : isCompleted ? "text-[#2A9D8F]" : "text-[#6B6B6B]",
                  )}
                >
                  {step}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MobileRepairTabs({
  activeTab,
  setActiveTab,
}: Readonly<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}>) {
  const tabsList = [
    "Vue d'ensemble",
    "Fiche d'entrée",
    "Diagnostic",
    "Pièces",
    "Devis",
    "Facture",
    "Documents",
    "Notes",
    "SAV",
  ];

  return (
    <div className="flex gap-2 overflow-x-auto py-1.5 scrollbar-none border-b border-[#E8E8E5]">
      {tabsList.map((t) => {
        const active = activeTab === t;
        return (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            type="button"
            className={cn(
              "h-11 shrink-0 px-4 rounded-full text-[13px] font-bold transition-all duration-200 outline-none",
              active
                ? "bg-[#2A9D8F] text-white shadow-[0_2px_8px_rgba(42,157,143,0.25)]"
                : "bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#1A1916]",
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/* Helpers for de-duplication */
const getLatestDocOfTypes = (allDocs: any[], types: string[]) => {
  const filtered = allDocs.filter((d) => types.includes(d.type));
  if (filtered.length === 0) return null;
  return [...filtered].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  })[0];
};

const getDeduplicatedDocuments = (allDocs: any[]) => {
  const typeMap = new Map<string, any>();
  const sorted = [...allDocs].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateA - dateB;
  });
  for (const doc of sorted) {
    typeMap.set(doc.type, doc);
  }
  return Array.from(typeMap.values()).sort((a, b) => (docTypeOrder[a.type] ?? 9) - (docTypeOrder[b.type] ?? 9));
};

function MobileSuiviClientCard({ repair }: Readonly<{ repair: Repair }>) {
  const ensureRepairPublicAccess = useBeharStore((s) => s.ensureRepairPublicAccess);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const store = useBeharStore();
  const trackingUrl = getCustomerTrackingUrl(repair, store.workshopSettings ?? store.workshopInfo);

  useEffect(() => {
    if (!repair.publicAccess) ensureRepairPublicAccess(repair.id);
  }, [repair.id, repair.publicAccess, ensureRepairPublicAccess]);

  useEffect(() => {
    if (trackingUrl)
      generateQrDataUrl(trackingUrl)
        .then(setQr)
        .catch(() => setQr(""));
  }, [trackingUrl]);

  const handleShareOrCopy = async () => {
    if (!trackingUrl) return;
    const shareText = `Bonjour, vous pouvez suivre votre réparation ici : ${trackingUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Suivi Réparation #${repair.number}`,
          text: shareText,
          url: trackingUrl,
        });
        toast.success("Lien de suivi partagé !");
      } catch (err) {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        toast.success("Lien de suivi copié dans le presse-papiers.");
      } catch {
        toast.error("Copie impossible.");
      }
    }
  };

  return (
    <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
      <h3 className="text-[15px] font-bold text-[#1A1916]">Suivi client en direct</h3>

      <div className="flex flex-col items-center gap-3">
        {qr ? (
          <img
            alt="QR Code de suivi"
            className="size-32 rounded-[16px] border border-[#E8E8E5] bg-white p-2 shadow-sm"
            src={qr}
          />
        ) : (
          <div className="size-32 rounded-[16px] bg-[#FFFFFF] border border-dashed border-[#E8E8E5] flex items-center justify-center text-xs text-[#6B6B6B]">
            Génération du QR...
          </div>
        )}
        <p className="text-xs text-[#6B6B6B] text-center max-w-[240px] leading-relaxed">
          Le client peut suivre sa réparation en scannant ce QR code.
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">
          Partager ou copier le lien
        </span>
        <button
          onClick={handleShareOrCopy}
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#FFFFFF] border border-[#2A9D8F]/20 text-[#167B70] font-bold text-sm hover:bg-[#FFFFFF] transition shadow-sm"
        >
          <Share2 className="size-4" />
          {copied ? "Lien copié !" : "Partager le lien de suivi"}
        </button>
      </div>
    </div>
  );
}

function MobileOverviewSection({
  repair,
  customer,
  documents,
  invoices,
  quotes,
  total,
  onAdvance,
  onClose,
  onCreateQuote,
  onCreateInvoice,
  onPrint,
  onNotes,
  setViewingMobileDoc,
}: Readonly<{
  repair: Repair;
  customer?: Customer;
  documents: any[];
  invoices: any[];
  quotes: any[];
  total: number;
  onAdvance: () => void;
  onClose: () => void;
  onCreateQuote: () => void;
  onCreateInvoice: () => void;
  onPrint: () => void;
  onNotes: (target?: "internal" | "client") => void;
  setViewingMobileDoc: (doc: any) => void;
}>) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const store = useBeharStore();
  const history = useMemo(() => {
    return [...(repair.history ?? [])].reverse();
  }, [repair]);

  const visibleHistory = showAllHistory ? history : history.slice(0, 3);

  const status = repair.status;
  const targetStatus = nextStatus[status];
  const canAdvance = Boolean(targetStatus) && !isTerminalRepairStatus(status);

  const quote = quotes[0];
  const acceptedQuote = quotes.find((entry) => entry.status === "Accepté" || entry.status === "Facturé");
  const invoice = invoices[0];

  const quoteDoc = documents.find((d) => d.type === "quote");
  const invoiceDoc = documents.find((d) => d.type === "invoice");
  const paymentDoc = documents.find((d) => ["payment", "sale-receipt", "sale-invoice"].includes(d.type));

  const deduplicatedDocs = useMemo(() => getDeduplicatedDocuments(documents), [documents]);

  const isTotalValid = (repair.total ?? 0) > 0 || (repair.amount ?? 0) > 0 || quotes[0]?.lines?.length > 0;
  const canCreateQuote = isTotalValid;

  const hasAcceptedQuote = !!acceptedQuote;
  const hasTotal = (repair.total ?? 0) > 0 || (repair.amount ?? 0) > 0;
  const canCreateInvoice = hasAcceptedQuote || hasTotal;

  const renderStatusActions = () => {
    switch (status) {
      case "Reçu":
        return (
          <>
            <button
              type="button"
              onClick={onAdvance}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
            >
              <Wrench className="size-4" />
              Passer en Diagnostic
            </button>
            <button
              type="button"
              onClick={() => onNotes("internal")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
            >
              <Lock className="size-4" />
              Ajouter diagnostic / note
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
            >
              <Printer className="size-4" />
              Imprimer documents
            </button>
          </>
        );

      case "Diagnostic":
        return (
          <>
            <button
              type="button"
              onClick={() => onNotes("internal")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
            >
              <Pencil className="size-4" />
              Modifier diagnostic
            </button>
            {!canCreateQuote ? (
              <div className="space-y-1">
                <button
                  type="button"
                  disabled
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed border border-gray-200"
                >
                  <FileText className="size-4" />
                  Créer le devis
                </button>
                <p className="text-[10px] text-[#B42318] bg-[#FFFFFF] rounded-[8px] p-2 border border-[#B42318]/10 leading-normal">
                  ⚠️ Le montant total doit être supérieur à 0 (ajoutez des pièces / main d'œuvre).
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onCreateQuote}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
              >
                <FileText className="size-4" />
                Créer le devis
              </button>
            )}
          </>
        );

      case "Devis envoyé":
        return (
          <>
            {quoteDoc && (
              <button
                type="button"
                onClick={() => setViewingMobileDoc(quoteDoc)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
              >
                <FileText className="size-4" />
                Voir le devis
              </button>
            )}
            <button
              type="button"
              onClick={() => onNotes("client")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
            >
              <MessageSquare className="size-4" />
              Relancer le client
            </button>
            {quote && (
              <button
                type="button"
                onClick={() => {
                  store.updateQuote(quote.id, { status: "Accepté" });
                  toast.success("Devis accepté.");
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
              >
                <Check className="size-4" />
                Marquer comme accepté
              </button>
            )}
          </>
        );

      case "Devis accepté":
        return (
          <>
            <button
              type="button"
              onClick={onAdvance}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
            >
              <Wrench className="size-4" />
              Passer en Réparation
            </button>
            {quoteDoc && (
              <button
                type="button"
                onClick={() => setViewingMobileDoc(quoteDoc)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
              >
                <FileText className="size-4" />
                Voir le devis
              </button>
            )}
          </>
        );

      case "En réparation":
        return (
          <>
            <button
              type="button"
              onClick={() => onNotes("internal")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
            >
              <Lock className="size-4" />
              Ajouter note interne
            </button>
            <button
              type="button"
              onClick={onAdvance}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
            >
              <Check className="size-4" />
              Passer en Test Final
            </button>
          </>
        );

      case "Test final":
        return (
          <>
            <button
              type="button"
              onClick={onAdvance}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
            >
              <CheckCircle2 className="size-4" />
              Valider les tests & passer à Prêt
            </button>
          </>
        );

      case "Prêt":
        return (
          <>
            <button
              type="button"
              onClick={() => onNotes("client")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
            >
              <MessageSquare className="size-4" />
              Prévenir le client
            </button>
            {!canCreateInvoice ? (
              <div className="space-y-1">
                <button
                  type="button"
                  disabled
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed border border-gray-200"
                >
                  <Receipt className="size-4" />
                  Créer la facture
                </button>
                <p className="text-[10px] text-[#B42318] bg-[#FFFFFF] rounded-[8px] p-2 border border-[#B42318]/10 leading-normal">
                  ⚠️ Devis accepté ou montant total &gt; 0 requis.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onCreateInvoice}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
              >
                <Receipt className="size-4" />
                {invoice ? "Voir la facture" : "Créer la facture"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#F3D0CC] bg-white font-semibold text-[#B42318] text-sm hover:bg-[#FFFFFF] transition"
            >
              <ClipboardList className="size-4" />
              Marquer rendu au client
            </button>
          </>
        );

      case "Rendu":
      case "Clôturé":
        return (
          <>
            {invoiceDoc && (
              <button
                type="button"
                onClick={() => setViewingMobileDoc(invoiceDoc)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
              >
                <Receipt className="size-4" />
                Voir la facture
              </button>
            )}
            {paymentDoc && (
              <button
                type="button"
                onClick={() => setViewingMobileDoc(paymentDoc)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
              >
                <Receipt className="size-4" />
                Voir la confirmation de règlement
              </button>
            )}
            <button
              type="button"
              onClick={onPrint}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] transition"
            >
              <Printer className="size-4" />
              Imprimer les documents
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Carte Activité du dossier */}
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
        <h3 className="text-[15px] font-bold text-[#1A1916]">Activité du dossier</h3>
        <ol className="relative border-l border-[#E8E8E5] ml-2 space-y-3.5">
          {visibleHistory.map((item, idx) => (
            <li key={`${item}_${idx}`} className="relative pl-5">
              <span className="absolute left-[-5px] top-1.5 flex size-2 bg-[#2A9D8F] rounded-full ring-4 ring-white" />
              <p className="text-[13px] font-semibold text-[#1A1916] leading-snug">{item}</p>
            </li>
          ))}
          {history.length === 0 && <p className="text-xs text-[#6B6B6B] pl-2">Aucun événement enregistré.</p>}
        </ol>
        {history.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllHistory(!showAllHistory)}
            className="text-[13px] font-bold text-[#2A9D8F] hover:underline block pt-1 outline-none"
          >
            {showAllHistory ? "Réduire l'activité" : "Voir toute l'activité"}
          </button>
        )}
      </div>

      {/* 2. Carte Documents Liés */}
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
        <h3 className="text-[15px] font-bold text-[#1A1916]">Documents liés</h3>
        <ul className="space-y-2.5">
          {deduplicatedDocs.length === 0 ? (
            <li className="rounded-[12px] border border-dashed border-[#E8E8E5] bg-[#FFFFFF] px-3 py-5 text-center text-[#6B6B6B] text-xs">
              Aucun document lié.
            </li>
          ) : (
            deduplicatedDocs.map((doc) => {
              const q =
                doc.type === "quote" ? (quotes.find((entry) => entry.id === doc.quoteId) ?? quotes[0]) : undefined;
              const inv =
                doc.type === "invoice"
                  ? (invoices.find((entry) => entry.id === doc.invoiceId) ?? invoices[0])
                  : undefined;
              const amount = q ? getQuoteTotal(q) : inv ? getInvoiceTotal(inv) : 0;
              const number = q?.number || inv?.number || "";
              const statusLabel = inv
                ? inv.status === "Payée"
                  ? "Réglée"
                  : "À régler"
                : q
                  ? q.status
                  : doc.type === "intake"
                    ? "Émise"
                    : "";

              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setViewingMobileDoc(doc)}
                  className="w-full flex items-center gap-3 rounded-[12px] border border-[#FFFFFF] bg-[#FFFFFF] p-3 text-left transition hover:bg-[#FFFFFF] outline-none"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-[#2A9D8F] border border-[#E8E8E5]">
                    <FileText className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#1A1916]">
                      {docLabel[doc.type] ?? doc.title}
                      {number ? ` · ${number}` : ""}
                    </p>
                    <p className="truncate text-[#6B6B6B] text-[11px] mt-0.5">{doc.title}</p>
                  </div>
                  {amount > 0 && (
                    <span className="shrink-0 font-semibold text-[#1A1916] text-[12px] mr-1">
                      {formatCurrency(amount, q?.currency ?? inv?.currency ?? repair.currency)}
                    </span>
                  )}
                  {statusLabel && (
                    <span className="shrink-0 rounded-full bg-[#FFFFFF] px-2 py-0.5 font-bold text-[#167B70] text-[10px]">
                      {statusLabel}
                    </span>
                  )}
                  <ChevronRight className="size-4 text-[#8A8A8A] shrink-0" />
                </button>
              );
            })
          )}
        </ul>
      </div>

      {/* 3. Carte Actions Rapides */}
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
        <h3 className="text-[15px] font-bold text-[#1A1916]">Actions rapides</h3>
        <div className="space-y-2.5">{renderStatusActions()}</div>
      </div>

      {/* 4. Suivi client & QR Code */}
      <MobileSuiviClientCard repair={repair} />
    </div>
  );
}

function MobileEntrySheetSection({
  repair,
  customer,
  documents,
  setActivePhotoIndex,
}: Readonly<{
  repair: Repair;
  customer?: Customer;
  documents: any[];
  setActivePhotoIndex: (index: number) => void;
}>) {
  const { preview, download } = useDocument();
  const condition = repair.intakeCondition;
  const intakeDoc = documents.find((doc) => doc.type === "intake");
  const accessories =
    [...(condition?.accessories ?? []), ...(condition?.accessoriesOther ? [condition.accessoriesOther] : [])]
      .filter(Boolean)
      .join(", ") || "Aucun";

  const accessLabel = [condition?.accessMethod, condition?.accessCode].filter(Boolean).join(" · ") || "Non communiqué";

  const checklist = [
    { label: "État général", value: condition?.generalCondition ?? "Non renseigné" },
    { label: "Écran", value: condition?.screenState ?? "Non renseigné" },
    { label: "Châssis", value: condition?.frameState ?? "Non renseigné" },
    { label: "Caméras", value: condition?.camerasState ?? "OK" },
    { label: "Boutons", value: condition?.buttonsState ?? "OK" },
    { label: "Code appareil", value: accessLabel },
    { label: "Accessoires fournis", value: accessories },
    { label: "Défauts visibles", value: condition?.visibleDefects || "Aucun défaut majeur" },
  ];

  const photos = repair.intakeCondition?.photos ?? repair.workshopPhotos ?? [];

  return (
    <div className="space-y-4">
      {intakeDoc && (
        <div className="flex flex-col gap-3 rounded-[16px] border border-[#2A9D8F]/20 bg-[#FFFFFF] p-4 items-center justify-between sm:flex-row">
          <div className="min-w-0">
            <p className="font-bold text-[#167B70] text-sm">Fiche d'entrée active</p>
            <p className="text-[#167B70]/80 text-xs mt-0.5 truncate">
              Créée le {formatIsoToDisplay(repair.droppedAt || repair.createdAt || "")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#2A9D8F] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#238579]"
              onClick={() => {
                const target = getPrintableTarget(intakeDoc);
                if (target) preview(target.type, target.id);
              }}
            >
              <ExternalLink className="size-3.5" />
              Ouvrir
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8E8E5] bg-white px-4 text-xs font-bold text-[#1A1916] shadow-sm hover:bg-[#FFFFFF]"
              onClick={() => {
                const target = getPrintableTarget(intakeDoc);
                if (target) download(target.type, target.id);
              }}
            >
              <Download className="size-3.5" />
              Télécharger
            </button>
          </div>
        </div>
      )}

      {/* 1. Tableau Checklist */}
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
        <h3 className="text-[15px] font-bold text-[#1A1916]">État de l'appareil à l'entrée</h3>
        <dl className="divide-y divide-[#FFFFFF]">
          {checklist.map(({ label, value }) => (
            <div className="flex items-center justify-between py-3 text-sm" key={label}>
              <dt className="text-[#6B6B6B] font-semibold">{label}</dt>
              <dd className="text-[#1A1916] font-bold text-right truncate max-w-[200px]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 2. Photos */}
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-3">
        <h3 className="text-[15px] font-bold text-[#1A1916]">Photos à l'entrée</h3>
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center rounded-[12px] bg-[#FFFFFF] border border-dashed border-[#E8E8E5] px-4 py-8 text-[#6B6B6B]">
            <Camera className="size-6 text-[#8A8A8A] mb-2" />
            <p className="text-xs">Aucune photo ajoutée à l'entrée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActivePhotoIndex(index)}
                className="h-24 w-full rounded-[12px] overflow-hidden border border-[#E8E8E5] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] active:scale-95 transition"
              >
                <img
                  src={photo.dataUrl || (photo as any).url}
                  alt={(photo as any).name || (photo as any).label || photo.id}
                  className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Signature */}
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-3">
        <h3 className="text-[15px] font-bold text-[#1A1916]">Signature client</h3>
        {condition?.signatureDataUrl ? (
          <div className="space-y-3">
            <div className="border border-[#E8E8E5] rounded-[14px] bg-[#FFFFFF] p-3 flex justify-center">
              <img src={condition.signatureDataUrl} alt="Signature client" className="h-20 max-w-full object-contain" />
            </div>
            <p className="text-[11px] text-[#6B6B6B] text-center leading-snug">
              Signé le {formatIsoToDisplay(condition.signatureSignedAt || condition.signedAt || "")} par{" "}
              {condition.signerName || "le client"}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#6B6B6B]">Aucune signature enregistrée.</p>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#FFFFFF] text-[#6B6B6B] font-semibold text-sm cursor-not-allowed"
              disabled
            >
              Signature en attente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileDiagnosticSection({
  repair,
  onCreateQuote,
  onNotes,
}: Readonly<{
  repair: Repair;
  onCreateQuote: () => void;
  onNotes: () => void;
}>) {
  const store = useBeharStore();
  const [constat, setConstat] = useState(repair.diagnosticNotes ?? "");
  const [intervention, setIntervention] = useState(repair.recommendedIntervention ?? "");
  const [isEditing, setIsEditing] = useState(false);

  const quotes = store.quotes.filter((entry) => entry.repairId === repair.id);
  const isTotalValid = (repair.total ?? 0) > 0 || (repair.amount ?? 0) > 0 || quotes[0]?.lines?.length > 0;
  const canCreateQuote = isTotalValid;

  const save = () => {
    store.updateRepair(repair.id, {
      diagnosticNotes: constat,
      recommendedIntervention: intervention,
      history: [...repair.history, "Diagnostic mis à jour"],
    });
    setIsEditing(false);
    toast.success("Diagnostic enregistré.");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1A1916]">Constat technique</h3>
          <button
            type="button"
            onClick={() => (isEditing ? save() : setIsEditing(true))}
            className="inline-flex items-center gap-1 rounded-full border border-[#E8E8E5] px-3 py-1 bg-[#FFFFFF] text-[#6B6B6B] text-xs font-bold hover:bg-[#FFFFFF] outline-none"
          >
            <Pencil className="size-3" />
            {isEditing ? "Enregistrer" : "Modifier"}
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Constat</label>
              <textarea
                value={constat}
                onChange={(e) => setConstat(e.target.value)}
                className="w-full rounded-[14px] border border-[#E8E8E5] p-3 text-xs min-h-[90px] outline-none focus:border-[#2A9D8F]"
                placeholder="Décrire la panne constatée..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">
                Intervention prévue
              </label>
              <textarea
                value={intervention}
                onChange={(e) => setIntervention(e.target.value)}
                className="w-full rounded-[14px] border border-[#E8E8E5] p-3 text-xs min-h-[70px] outline-none focus:border-[#2A9D8F]"
                placeholder="Remplacement d'écran, soudure..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Constat</span>
              <p className="text-xs text-[#1A1916] font-medium leading-relaxed bg-[#FFFFFF] rounded-[12px] p-3 border border-[#E8E8E5] whitespace-pre-wrap">
                {repair.diagnosticNotes || "Aucun constat technique."}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">
                Intervention recommandée
              </span>
              <p className="text-xs text-[#1A1916] font-medium leading-relaxed bg-[#FFFFFF] rounded-[12px] p-3 border border-[#E8E8E5] whitespace-pre-wrap">
                {repair.recommendedIntervention || "Aucune intervention spécifiée."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Technicien</span>
                <p className="text-xs font-bold text-[#1A1916] mt-0.5">{repair.technician || "Atelier principal"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">
                  Temps estimé
                </span>
                <p className="text-xs font-bold text-[#1A1916] mt-0.5">
                  {repair.estimatedDoneAt ? formatIsoToDisplay(repair.estimatedDoneAt) : "Non précisé"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {canQuoteFromStatus(repair.status) && (
          <>
            {!canCreateQuote ? (
              <div className="space-y-1">
                <button
                  type="button"
                  disabled
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed border border-gray-200"
                >
                  <FileText className="size-4" />
                  Créer le devis
                </button>
                <p className="text-[10px] text-[#B42318] bg-[#FFFFFF] rounded-[8px] p-2 border border-[#B42318]/10 leading-normal">
                  ⚠️ Le montant total doit être supérieur à 0 (onglet Diagnostic/Pièces).
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onCreateQuote}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm"
              >
                <FileText className="size-4" />
                Créer le devis
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onNotes}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-sm hover:bg-[#FFFFFF] shadow-sm"
        >
          <Lock className="size-4" />
          Ajouter une note
        </button>
      </div>
    </div>
  );
}

function MobilePartsSection({
  repair,
}: Readonly<{
  repair: Repair;
}>) {
  const store = useBeharStore();
  const { stockItems, deviceModels, addPartToRepair } = store;
  const [showAllStock, setShowAllStock] = useState(false);

  const formatPartsCurrency = (value: number) => {
    return formatCurrency(value, repair.currency ?? store.workshopInfo.currency);
  };

  const compatibleItems = useMemo(() => {
    return stockItems.filter((item) => isStockItemCompatibleWithRepair(item, repair, deviceModels));
  }, [stockItems, repair, deviceModels]);

  const itemsToShow = showAllStock ? stockItems : compatibleItems;

  const reserve = (item: StockItem) => {
    const isCompatible = isStockItemCompatibleWithRepair(item, repair, deviceModels);
    if (!isCompatible) {
      const ok = window.confirm(
        `Attention : cette pièce (${item.name}) n'est pas compatible avec l'appareil (${repair.brandName} ${repair.deviceModel || repair.model}). Confirmer la réservation ?`,
      );
      if (!ok) return;
    }
    const success = addPartToRepair(repair.id, item.id, 1);
    if (success) {
      toast.success(`Pièce réservée : ${item.name}`);
    } else {
      toast.error("Stock insuffisant ou pièce inactive.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-bold text-[#1A1916]">
          Pièces compatibles avec {repair.brandName} {repair.deviceModel || repair.model || repair.device}
        </h3>
        <p className="text-xs text-[#6B6B6B] mt-0.5">{compatibleItems.length} références compatibles</p>
      </div>

      <div className="space-y-2.5">
        {itemsToShow.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#E8E8E5] bg-white p-6 text-center">
            <p className="text-xs text-[#6B6B6B]">Aucune pièce compatible trouvée.</p>
            {!showAllStock && (
              <button
                type="button"
                onClick={() => setShowAllStock(true)}
                className="mt-3 text-xs font-bold text-[#2A9D8F] bg-[#FFFFFF] px-3.5 py-2 rounded-full hover:bg-[#FFFFFF]"
              >
                Voir tout le stock
              </button>
            )}
          </div>
        ) : (
          itemsToShow.map((item) => (
            <div
              key={item.id}
              className="rounded-[16px] border border-[#E8E8E5] bg-white p-4 shadow-[0_2px_8px_rgba(26,25,22,0.015)] flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-[13px] font-bold text-[#1A1916] truncate">{item.name}</h4>
                <p className="text-[11px] text-[#6B6B6B] mt-0.5 truncate">
                  Réf. {item.sku || "N/A"} · Stock : <span className="font-bold text-[#1A1916]">{item.stock}</span>
                </p>
                <p className="text-xs font-bold text-[#167B70] mt-1">{formatPartsCurrency(item.salePrice)}</p>
              </div>
              <button
                type="button"
                onClick={() => reserve(item)}
                className="shrink-0 h-9 rounded-full bg-[#FFFFFF] hover:bg-[#FFFFFF] text-[#167B70] font-bold text-xs px-4"
              >
                Réserver
              </button>
            </div>
          ))
        )}
      </div>

      {compatibleItems.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAllStock(!showAllStock)}
          className="text-xs font-bold text-[#2A9D8F] hover:underline block mx-auto py-1 outline-none"
        >
          {showAllStock ? "Afficher uniquement les pièces compatibles" : "Voir tout le stock"}
        </button>
      )}

      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-3.5">
        <h3 className="text-[15px] font-bold text-[#1A1916]">Pièces réservées sur le dossier</h3>
        {repair.parts.length === 0 ? (
          <p className="text-xs text-[#6B6B6B] italic">Aucune pièce réservée pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#FFFFFF]">
            {repair.parts.map((part) => (
              <li key={part.stockItemId} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-bold text-[#1A1916]">{part.name}</p>
                  <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                    Réf. {part.sku} · Qté : {part.quantity}
                  </p>
                </div>
                <span className="rounded-full bg-[#FFFFFF] px-2.5 py-0.5 font-bold text-[#936100] text-[10px]">
                  {part.confirmed ? "Utilisée" : "Réservée"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MobileQuoteSection({
  repair,
  quote,
  quotes,
  onCreate,
  setViewingMobileDoc,
}: Readonly<{
  repair: Repair;
  quote?: any;
  quotes: any[];
  onCreate: () => void;
  setViewingMobileDoc: (doc: any) => void;
}>) {
  const store = useBeharStore();
  const formatQuoteCurrency = (val: number) => {
    return formatCurrency(val, quote?.currency ?? repair.currency);
  };

  const isTotalValid = (repair.total ?? 0) > 0 || (repair.amount ?? 0) > 0 || quotes[0]?.lines?.length > 0;
  const canCreateQuote = isTotalValid;

  if (!quote) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#E8E8E5] bg-white p-8 text-center space-y-4">
        <p className="font-semibold text-sm text-[#1A1916]">Aucun devis lié à ce dossier</p>
        {!canCreateQuote ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="inline-flex h-11 items-center justify-center px-6 rounded-[12px] bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed border border-gray-200 w-full"
            >
              Créer un devis
            </button>
            <p className="text-[10px] text-[#B42318] bg-[#FFFFFF] rounded-[8px] p-2 border border-[#B42318]/10 leading-normal text-left max-w-sm mx-auto">
              ⚠️ Le montant total doit être supérieur à 0 (onglet Diagnostic/Pièces).
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 items-center justify-center px-6 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm shadow-sm hover:bg-[#238579] w-full"
          >
            Créer un devis
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quotes.map((q) => {
        const subtotal = q.lines?.reduce((sum: number, line: any) => sum + line.total, 0) || 0;
        const total = subtotal;

        // Find doc matching this quote
        const doc = store.documents.find((d) => d.quoteId === q.id && d.type === "quote");

        return (
          <div
            key={q.id}
            className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[15px] text-[#1A1916]">Devis {q.number}</h4>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Statut : {q.status}</p>
              </div>
              <span className="text-[15px] font-bold text-[#167B70]">
                {formatCurrency(getQuoteTotal(q), q.currency ?? repair.currency)}
              </span>
            </div>

            <div className="border-t border-[#FFFFFF] pt-3.5 space-y-3">
              {q.lines?.map((line: any, idx: number) => (
                <div key={`${line.description}_${idx}`} className="flex justify-between items-start text-xs">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-bold text-[#1A1916] leading-tight truncate">{line.description}</p>
                    <p className="text-[#6B6B6B] mt-0.5">Qté : {line.quantity}</p>
                  </div>
                  <span className="font-bold text-[#1A1916] shrink-0">
                    {formatCurrency(line.total, q.currency ?? repair.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#FFFFFF] pt-3.5 space-y-1.5 text-xs text-right">
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Sous-total :</span>
                <span className="font-semibold text-[#1A1916]">{formatQuoteCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#FFFFFF]">
                <span className="font-bold text-[#1A1916]">Total :</span>
                <span className="font-bold text-[15px] text-[#167B70]">{formatQuoteCurrency(total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#FFFFFF]">
              {doc && (
                <button
                  type="button"
                  onClick={() => setViewingMobileDoc(doc)}
                  className="flex-1 h-9 rounded-full border border-[#E8E8E5] bg-[#FFFFFF] text-[#1A1916] text-[12px] font-bold flex items-center justify-center gap-1 shadow-sm hover:bg-[#FFFFFF]"
                >
                  <ExternalLink className="size-3.5" />
                  Aperçu PDF
                </button>
              )}
              {q.status !== "Accepté" && q.status !== "Facturé" && (
                <button
                  type="button"
                  onClick={() => {
                    store.updateQuote(q.id, { status: "Accepté" });
                    toast.success("Devis accepté.");
                  }}
                  className="flex-1 h-9 rounded-full bg-[#2A9D8F] text-white text-[12px] font-semibold flex items-center justify-center gap-1 shadow-sm hover:bg-[#238579]"
                >
                  Accepter
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileInvoiceSection({
  invoice,
  invoices,
  onCreate,
  onPayment,
  paymentMethod,
  paymentSummary,
  setPaymentMethod,
  formatDossier,
  setViewingMobileDoc,
}: Readonly<{
  invoice?: any;
  invoices: any[];
  onCreate: () => void;
  onPayment: () => void;
  paymentMethod: PaymentMethod;
  paymentSummary?: string;
  setPaymentMethod: (method: PaymentMethod) => void;
  formatDossier: (val: number) => string;
  setViewingMobileDoc: (doc: any) => void;
}>) {
  const store = useBeharStore();
  const repair = store.repairs.find((r) => r.id === invoice?.repairId || invoices[0]?.repairId);

  const quotes = repair ? store.quotes.filter((entry) => entry.repairId === repair.id) : [];
  const acceptedQuote = quotes.find((entry) => entry.status === "Accepté" || entry.status === "Facturé");

  const hasAcceptedQuote = !!acceptedQuote;
  const hasTotal = repair ? (repair.total ?? 0) > 0 || (repair.amount ?? 0) > 0 : false;
  const canCreateInvoice = hasAcceptedQuote || hasTotal;

  if (!invoice) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#E8E8E5] bg-white p-8 text-center space-y-4">
        <p className="font-semibold text-sm text-[#1A1916]">Aucune facture liée à ce dossier</p>
        {!canCreateInvoice ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="inline-flex h-11 items-center justify-center px-6 rounded-[12px] bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed border border-gray-200 w-full"
            >
              Créer une facture
            </button>
            <p className="text-[10px] text-[#B42318] bg-[#FFFFFF] rounded-[8px] p-2 border border-[#B42318]/10 leading-normal text-left max-w-sm mx-auto">
              ⚠️ Un devis accepté ou un montant total &gt; 0 est requis pour générer une facture.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex h-11 items-center justify-center px-6 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm shadow-sm hover:bg-[#238579] w-full"
          >
            Créer une facture
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paymentSummary ? (
        <div className="rounded-[16px] border border-[#D7EFEA] bg-white p-4 text-[#1E7A6E] text-sm font-bold">
          {paymentSummary}
        </div>
      ) : null}
      {invoices.map((inv) => {
        const doc = store.documents.find((d) => d.invoiceId === inv.id && d.type === "invoice");
        return (
          <div
            key={inv.id}
            className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[15px] text-[#1A1916]">Facture {inv.number}</h4>
                <p className="text-[11px] text-[#6B6B6B] mt-0.5">Créée le {formatIsoToDisplay(inv.createdAt || "")}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wide",
                  inv.status === "Payée" ? "bg-[#FFFFFF] text-[#167B70]" : "bg-[#FFFFFF] text-[#936100]",
                )}
              >
                {inv.status === "Payée" ? "Réglée" : "À régler"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#FFFFFF] rounded-[14px] p-4 border border-[#E8E8E5]">
              <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Montant total</span>
              <span className="text-lg font-bold text-[#167B70]">
                {formatCurrency(getInvoiceTotal(inv), inv.currency)}
              </span>
            </div>

            {inv.status !== "Payée" && (
              <div className="space-y-3 pt-1">
                <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider block">
                  Moyen de règlement
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => {
                    const active = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "h-10 rounded-full border text-[11px] font-bold flex items-center justify-center px-2.5 transition",
                          active
                            ? "border-[#2A9D8F] bg-[#2A9D8F] text-white shadow-sm"
                            : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:text-[#1A1916]",
                        )}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={onPayment}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] text-white font-semibold text-sm hover:bg-[#238579] shadow-sm mt-1"
                >
                  Indiquer le règlement
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-[#FFFFFF]">
              {doc && (
                <button
                  type="button"
                  onClick={() => setViewingMobileDoc(doc)}
                  className="flex-1 h-9 rounded-full border border-[#E8E8E5] bg-[#FFFFFF] text-[#1A1916] text-[12px] font-bold flex items-center justify-center gap-1 shadow-sm hover:bg-[#FFFFFF]"
                >
                  <Printer className="size-3.5" />
                  Imprimer / PDF
                </button>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-[#6B6B6B] text-center italic">
        Aucune donnée bancaire n'est stockée dans ce terminal.
      </p>
    </div>
  );
}

/* ───────────────────────── SECTION DOCUMENTS MOBILE ───────────────────────── */

function MobileDocumentsSection({
  repair,
  documents,
  download,
  print,
  setViewingMobileDoc,
}: Readonly<{
  repair: Repair;
  documents: any[];
  download: (type: any, id: string) => void;
  print: (type: any, id: string) => void;
  setViewingMobileDoc: (doc: any) => void;
}>) {
  const store = useBeharStore();
  const quotes = store.quotes.filter((entry) => entry.repairId === repair.id);
  const invoices = store.invoices.filter((entry) => entry.repairId === repair.id);

  const deduplicatedDocs = useMemo(() => getDeduplicatedDocuments(documents), [documents]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-bold text-[#1A1916]">Documents liés au dossier</h3>
        <p className="text-xs text-[#6B6B6B] mt-0.5">{deduplicatedDocs.length} documents émis</p>
      </div>

      <div className="space-y-3">
        {deduplicatedDocs.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#E8E8E5] bg-white p-8 text-center text-xs text-[#6B6B6B]">
            Aucun document disponible pour le moment.
          </div>
        ) : (
          deduplicatedDocs.map((doc) => {
            const q =
              doc.type === "quote" ? (quotes.find((entry) => entry.id === doc.quoteId) ?? quotes[0]) : undefined;
            const inv =
              doc.type === "invoice"
                ? (invoices.find((entry) => entry.id === doc.invoiceId) ?? invoices[0])
                : undefined;
            const amount = q ? getQuoteTotal(q) : inv ? getInvoiceTotal(inv) : 0;
            const number = q?.number || inv?.number || "";
            const statusLabel = inv
              ? inv.status === "Payée"
                ? "Réglée"
                : "À régler"
              : q
                ? q.status
                : doc.type === "intake"
                  ? "Émise"
                  : "";

            return (
              <div
                key={doc.id}
                className="rounded-[18px] border border-[#E8E8E5] bg-white p-4 shadow-[0_2px_8px_rgba(26,25,22,0.015)] space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#2A9D8F] border border-[#E8E8E5]/50">
                    <FileText className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#1A1916]">
                      {docLabel[doc.type] ?? doc.title}
                      {number ? ` · ${number}` : ""}
                    </p>
                    <p className="truncate text-[#6B6B6B] text-[11px] mt-0.5">{doc.title}</p>
                  </div>
                  {statusLabel && (
                    <span className="shrink-0 rounded-full bg-[#FFFFFF] px-2.5 py-0.5 font-bold text-[#167B70] text-[10px]">
                      {statusLabel}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center bg-[#FFFFFF] rounded-[10px] px-3 py-2 text-xs">
                  <span className="text-[#6B6B6B]">Montant :</span>
                  <span className="font-bold text-[#1A1916]">
                    {amount > 0 ? formatCurrency(amount, q?.currency ?? inv?.currency ?? repair.currency) : "—"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#FFFFFF]">
                  <button
                    type="button"
                    onClick={() => setViewingMobileDoc(doc)}
                    className="h-9 rounded-full bg-[#FFFFFF] border border-[#E8E8E5] text-[#1A1916] text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#FFFFFF] active:scale-95 transition outline-none"
                    title="Voir"
                  >
                    <ExternalLink className="size-3" />
                    Voir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetStr = getPrintableTarget(doc);
                      if (targetStr) download(targetStr.type, targetStr.id);
                    }}
                    className="h-9 rounded-full bg-[#FFFFFF] border border-[#E8E8E5] text-[#1A1916] text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#FFFFFF] active:scale-95 transition outline-none"
                    title="Télécharger"
                  >
                    <Download className="size-3" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetStr = getPrintableTarget(doc);
                      if (targetStr) print(targetStr.type, targetStr.id);
                    }}
                    className="h-9 rounded-full bg-[#FFFFFF] border border-[#E8E8E5] text-[#1A1916] text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#FFFFFF] active:scale-95 transition outline-none"
                    title="Imprimer"
                  >
                    <Printer className="size-3" />
                    Imprimer
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const url = getShareableDocumentUrl(doc);
                        if (url) {
                          await navigator.clipboard.writeText(url);
                          toast.success("Lien du document copié.");
                        } else {
                          toast.error("Lien non disponible.");
                        }
                      } catch {
                        toast.error("Erreur lors de la copie.");
                      }
                    }}
                    className="h-9 rounded-full bg-[#FFFFFF] hover:bg-[#FFFFFF] text-[#167B70] text-[10px] font-bold flex items-center justify-center gap-1 active:scale-95 transition outline-none"
                    title="Copier le lien"
                  >
                    <Share2 className="size-3" />
                    Lien
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── SECTION NOTES & HISTORIQUE MOBILE ───────────────────────── */

function MobileNotesHistorySection({
  repair,
  focus,
  onFocusHandled,
}: Readonly<{
  repair: Repair;
  focus?: "internal" | "client" | null;
  onFocusHandled?: () => void;
}>) {
  const store = useBeharStore();
  const [internalDraft, setInternalDraft] = useState("");
  const [clientDraft, setClientDraft] = useState("");
  const [activeSegment, setActiveSegment] = useState<"internal" | "client">("internal");

  const internalRef = useRef<HTMLTextAreaElement>(null);
  const clientRef = useRef<HTMLTextAreaElement>(null);

  const messages = repair.messages ?? [];
  const internalNotes = messages.filter((message) => message.visibility === "internal");
  const clientNotes = messages.filter((message) => message.visibility === "client");

  useEffect(() => {
    if (!focus) return;
    setActiveSegment(focus);
    setTimeout(() => {
      const target = focus === "client" ? clientRef.current : internalRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    }, 100);
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
    <div className="space-y-4">
      {/* Segmented Control */}
      <div className="flex bg-[#FFFFFF] p-1 rounded-full border border-[#E8E8E5]">
        <button
          type="button"
          onClick={() => setActiveSegment("internal")}
          className={cn(
            "flex-1 h-9 rounded-full text-xs font-bold transition-all outline-none",
            activeSegment === "internal" ? "bg-[#2A9D8F] text-white shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1916]",
          )}
        >
          <Lock className="inline size-3.5 mr-1" />
          Atelier (Interne)
        </button>
        <button
          type="button"
          onClick={() => setActiveSegment("client")}
          className={cn(
            "flex-1 h-9 rounded-full text-xs font-bold transition-all outline-none",
            activeSegment === "client" ? "bg-[#2A9D8F] text-white shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1916]",
          )}
        >
          <MessageSquare className="inline size-3.5 mr-1" />
          Client (Public)
        </button>
      </div>

      {activeSegment === "internal" ? (
        <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-4 space-y-4">
          <div>
            <h4 className="text-[13px] font-bold text-[#1A1916]">Notes internes (Atelier)</h4>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5">Visibles uniquement par l'équipe.</p>
          </div>

          <ul className="space-y-2.5">
            {internalNotes.length === 0 ? (
              <li className="rounded-[12px] border border-dashed border-[#E8E8E5] bg-[#FFFFFF] px-3 py-4 text-center text-[#6B6B6B] text-xs">
                Aucune note interne.
              </li>
            ) : (
              [...internalNotes].reverse().map((note) => (
                <li key={note.id} className="rounded-[12px] border border-[#FFFFFF] bg-[#FFFFFF] p-3 text-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                    <span className="font-bold text-[#1A1916]">{note.authorName}</span>
                    <span>{formatIsoToDisplay(note.createdAt)}</span>
                  </div>
                  <p className="text-[#1A1916] whitespace-pre-wrap leading-relaxed">{note.body}</p>
                </li>
              ))
            )}
          </ul>

          <div className="space-y-2 pt-2 border-t border-[#FFFFFF]">
            <textarea
              ref={internalRef}
              value={internalDraft}
              onChange={(e) => setInternalDraft(e.target.value)}
              placeholder="Ajouter une note de diagnostic, défaut constaté..."
              className="w-full rounded-[12px] border border-[#E8E8E5] p-3 text-xs min-h-[80px] outline-none focus:border-[#2A9D8F] bg-[#FFFFFF]"
            />
            <button
              type="button"
              onClick={addInternal}
              disabled={!internalDraft.trim()}
              className="h-10 w-full rounded-full bg-[#2A9D8F] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs shadow-sm hover:bg-[#238579] active:scale-95 transition"
            >
              Publier la note interne
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-4 space-y-4">
          <div>
            <h4 className="text-[13px] font-bold text-[#1A1916]">Notes client (Suivi)</h4>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5">Visibles en direct par le client sur son lien de suivi.</p>
          </div>

          <ul className="space-y-2.5">
            {clientNotes.length === 0 ? (
              <li className="rounded-[12px] border border-dashed border-[#E8E8E5] bg-[#FFFFFF] px-3 py-4 text-center text-[#6B6B6B] text-xs">
                Aucune note client.
              </li>
            ) : (
              [...clientNotes].reverse().map((note) => (
                <li key={note.id} className="rounded-[12px] border border-[#FFFFFF] bg-[#FFFFFF] p-3 text-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                    <span className="font-bold text-[#1A1916]">{note.authorName}</span>
                    <span>{formatIsoToDisplay(note.createdAt)}</span>
                  </div>
                  <p className="text-[#1A1916] whitespace-pre-wrap leading-relaxed">{note.body}</p>
                </li>
              ))
            )}
          </ul>

          <div className="space-y-2 pt-2 border-t border-[#FFFFFF]">
            <textarea
              ref={clientRef}
              value={clientDraft}
              onChange={(e) => setClientDraft(e.target.value)}
              placeholder="Ex: Pièce reçue, réparation commencée..."
              className="w-full rounded-[12px] border border-[#E8E8E5] p-3 text-xs min-h-[80px] outline-none focus:border-[#2A9D8F] bg-[#FFFFFF]"
            />
            <button
              type="button"
              onClick={addClient}
              disabled={!clientDraft.trim()}
              className="h-10 w-full rounded-full bg-[#2A9D8F] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs shadow-sm hover:bg-[#238579] active:scale-95 transition"
            >
              Publier la note client
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── SECTION CONTRÔLE QUALITÉ & TESTS MOBILE ───────────────────────── */

function MobileFinalTestSection({
  repair,
  onAdvance,
  onClose,
  invoice,
  setMobileTab,
  setViewingMobileDoc,
}: Readonly<{
  repair: Repair;
  onAdvance: () => void;
  onClose: () => void;
  invoice: any;
  setMobileTab: (tab: string) => void;
  setViewingMobileDoc: (doc: any) => void;
}>) {
  const [tests, setTests] = useState([
    { id: "touch", label: "Tactile / Affichage", checked: true },
    { id: "charge", label: "Charge & Batterie", checked: true },
    { id: "audio", label: "Micro / Haut-parleurs", checked: true },
    { id: "wifi", label: "Réseau / Wi-Fi / Bluetooth", checked: true },
    { id: "cameras", label: "Appareils photo (av/ar)", checked: true },
    { id: "buttons", label: "Boutons physiques / Capteurs", checked: true },
  ]);

  const toggleTest = (id: string) => {
    setTests(tests.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)));
  };

  const allPassed = tests.every((t) => t.checked);
  const isPrêt = repair.status === "Prêt";
  const isRendu = repair.status === "Rendu" || repair.status === "Clôturé";

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_4px_12px_rgba(26,25,22,0.02)] space-y-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#1A1916]">Contrôle qualité & Tests finaux</h3>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Cochez les points vérifiés sur l'appareil avant remise au client.
          </p>
        </div>

        <div className="space-y-2.5">
          {tests.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTest(t.id)}
              className="w-full flex items-center justify-between p-3 rounded-[12px] border border-[#E8E8E5] bg-[#FFFFFF] text-left active:scale-[0.99] transition outline-none"
            >
              <span className="text-xs font-bold text-[#1A1916]">{t.label}</span>
              <span
                className={cn(
                  "size-5 rounded-full border flex items-center justify-center transition-all",
                  t.checked ? "bg-[#2A9D8F] border-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-transparent",
                )}
              >
                <Check className="size-3" />
              </span>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-[#FFFFFF]">
          {allPassed ? (
            <div className="bg-[#FFFFFF] border border-[#2A9D8F]/10 rounded-[12px] p-3 text-xs text-[#167B70] leading-normal font-semibold flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              Tous les points de contrôle sont validés. L'appareil est prêt.
            </div>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#936100]/10 rounded-[12px] p-3 text-xs text-[#936100] leading-normal font-semibold">
              Les tests décochés peuvent rester non applicables ou non testés si une note diagnostic l'explique.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {repair.status === "Test final" ? (
          <button
            type="button"
            onClick={onAdvance}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] border border-transparent text-white font-semibold text-sm hover:bg-[#238579] shadow-sm transition"
          >
            <CheckCircle2 className="size-4" />
            Valider les tests et passer à "Prêt"
          </button>
        ) : isPrêt ? (
          <div className="bg-white border border-[#E8E8E5] rounded-[20px] p-4 text-center space-y-3">
            <p className="text-xs text-[#6B6B6B]">L'appareil a passé les tests de contrôle qualité.</p>
            <button
              type="button"
              onClick={() => setMobileTab("Facture")}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#E8E8E5] text-[#1A1916] text-xs font-bold bg-[#FFFFFF] hover:bg-[#FFFFFF]"
            >
              <Receipt className="size-3.5" />
              Gérer la facture / règlement
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#F3D0CC] bg-white font-semibold text-[#B42318] text-sm hover:bg-[#FFFFFF] transition"
            >
              <ClipboardList className="size-4" />
              Marquer rendu au client
            </button>
          </div>
        ) : isRendu ? (
          <div className="bg-white border border-[#E8E8E5] rounded-[20px] p-4 text-center text-xs text-[#6B6B6B]">
            Dossier rendu et archivé. Le contrôle qualité a été validé.
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMobileTab("Vue d'ensemble")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#FFFFFF] text-[#1A1916] font-semibold text-sm"
          >
            Retour à la vue d'ensemble
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── MODALE VISIONNEUSE DE DOCUMENT MOBILE ───────────────────────── */

function MobileDocumentViewerModal({
  doc,
  repair,
  customer,
  quotes,
  invoices,
  payments,
  onClose,
  download,
  print,
}: Readonly<{
  doc: any;
  repair: Repair;
  customer?: Customer;
  quotes: any[];
  invoices: any[];
  payments: any[];
  onClose: () => void;
  download: (type: any, id: string) => void;
  print: (type: any, id: string) => void;
}>) {
  const target = getPrintableTarget(doc);

  const isIntake = doc.type === "intake";
  const isQuote = doc.type === "quote";
  const isInvoice = doc.type === "invoice";
  const isPayment = ["payment", "sale-receipt", "sale-invoice"].includes(doc.type);

  const underlyingQuote = isQuote ? (quotes.find((q) => q.id === doc.quoteId) ?? quotes[0]) : undefined;
  const underlyingInvoice = isInvoice ? (invoices.find((i) => i.id === doc.invoiceId) ?? invoices[0]) : undefined;

  const lines =
    underlyingQuote?.lines ??
    underlyingInvoice?.lines ??
    repair.parts.map((p) => ({
      description: p.name,
      quantity: p.quantity,
      total: p.quantity * p.salePrice,
    }));

  const subtotal = lines?.reduce((sum: number, line: any) => sum + (line.total || 0), 0) || 0;
  const total = subtotal;

  const handleShare = async () => {
    if (!target) return;
    const documentUrl = publicAbsoluteUrl(`/print/document/${doc.id}`);
    const shareText = `Bonjour, voici votre ${docLabel[doc.type] ?? doc.title} pour votre réparation chez Behar Tech : ${documentUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${docLabel[doc.type] ?? doc.title} #${repair.number}`,
          text: shareText,
          url: documentUrl,
        });
        toast.success("Document partagé !");
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Lien de document copié !");
      } catch (err) {
        toast.error("Copie impossible.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1916]/18 flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] rounded-t-[28px] sm:rounded-[24px] max-h-[92vh] flex flex-col shadow-[0_1px_2px_rgba(26,25,22,0.035)] sm:max-w-md sm:w-full sm:mx-auto overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E5] bg-white">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-[#1A1916] truncate">{docLabel[doc.type] ?? doc.title}</h2>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5 truncate">Dossier #{repair.number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#FFFFFF] border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#1A1916] outline-none"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          <div className="bg-white rounded-[20px] border border-[#E8E8E5] p-4 shadow-[0_4px_12px_rgba(26,25,22,0.015)] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Appareil</span>
                <h4 className="text-[13px] font-bold text-[#1A1916] mt-0.5">
                  {formatDeviceLabel(repair, repair.device)}
                </h4>
                {repair.imei && <p className="text-[11px] text-[#6B6B6B] mt-0.5">IMEI: {repair.imei}</p>}
              </div>
              <RealDeviceVisual
                brand={repair.brandName}
                className="size-11 rounded-[10px] border border-[#E8E8E5] bg-[#FFFFFF] p-1 shadow-sm"
                model={repair.deviceModel || repair.model || repair.device}
                type={repair.deviceType}
              />
            </div>

            <div className="border-t border-[#FFFFFF] pt-3.5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Client</span>
                <p className="font-bold text-[#1A1916] mt-0.5 truncate">{displayCustomerName(customer) || "Client"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Date</span>
                <p className="font-bold text-[#1A1916] mt-0.5 truncate">
                  {formatIsoToDisplay(doc.createdAt || repair.droppedAt || repair.createdAt || "")}
                </p>
              </div>
            </div>
          </div>

          {isIntake && (
            <div className="bg-white rounded-[20px] border border-[#E8E8E5] p-5 shadow-[0_4px_12px_rgba(26,25,22,0.015)] space-y-4">
              <h3 className="text-[13px] font-bold text-[#1A1916] border-b border-[#FFFFFF] pb-2">
                Contenu Bon de Prise en Charge
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[#6B6B6B] font-bold block mb-1">Panne déclarée</span>
                  <p className="bg-[#FFFFFF] rounded-[10px] p-2.5 border border-[#E8E8E5] text-[#1A1916] leading-relaxed">
                    {repair.issue || "Non renseigné"}
                  </p>
                </div>
                <div>
                  <span className="text-[#6B6B6B] font-bold block mb-1">Défauts constatés</span>
                  <p className="bg-[#FFFFFF] rounded-[10px] p-2.5 border border-[#E8E8E5] text-[#1A1916] leading-relaxed">
                    {repair.intakeCondition?.visibleDefects || "Aucun défaut majeur"}
                  </p>
                </div>
                <div>
                  <span className="text-[#6B6B6B] font-bold block mb-1">Accessoires déposés</span>
                  <p className="bg-[#FFFFFF] rounded-[10px] p-2.5 border border-[#E8E8E5] text-[#1A1916] leading-relaxed">
                    {repair.intakeCondition?.accessories?.join(", ") || "Aucun accessoire"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(isQuote || isInvoice || isPayment) && (
            <div className="bg-white rounded-[20px] border border-[#E8E8E5] p-5 shadow-[0_4px_12px_rgba(26,25,22,0.015)] space-y-4">
              <h3 className="text-[13px] font-bold text-[#1A1916] border-b border-[#FFFFFF] pb-2">
                Détail des prestations
              </h3>

              <div className="space-y-3.5">
                {lines?.length === 0 ? (
                  <p className="text-xs text-[#6B6B6B] italic">Aucune ligne de facture/devis.</p>
                ) : (
                  lines?.map((line: any, index: number) => (
                    <div
                      key={`${line.description}_${index}`}
                      className="flex justify-between items-start text-xs border-b border-[#FFFFFF] pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-bold text-[#1A1916] truncate">{line.description}</p>
                        <p className="text-[#6B6B6B] text-[10px] mt-0.5">Quantité : {line.quantity}</p>
                      </div>
                      <span className="font-bold text-[#1A1916] shrink-0">
                        {formatCurrency(line.total, doc.currency ?? repair.currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-[#E8E8E5] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B] font-semibold">Sous-total :</span>
                  <span className="font-bold text-[#1A1916]">
                    {formatCurrency(subtotal, doc.currency ?? repair.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#E8E8E5]">
                  <span className="text-sm font-bold text-[#1A1916]">Total TTC :</span>
                  <span className="text-lg font-black text-[#167B70]">
                    {formatCurrency(total, doc.currency ?? repair.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-[#E8E8E5] bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 h-11 rounded-[12px] bg-[#FFFFFF] text-[#167B70] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition outline-none"
          >
            <Share2 className="size-4" />
            Partager
          </button>
          <button
            type="button"
            disabled={!target}
            onClick={() => target && download(target.type, target.id)}
            className="h-11 w-12 rounded-[12px] border border-[#E8E8E5] bg-[#FFFFFF] text-[#1A1916] flex items-center justify-center hover:bg-[#FFFFFF] active:scale-95 transition shrink-0"
            title="Télécharger PDF"
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            disabled={!target}
            onClick={() => target && print(target.type, target.id)}
            className="flex-1 h-11 rounded-[12px] bg-[#2A9D8F] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#238579] active:scale-95 transition shadow-sm outline-none"
          >
            <Printer className="size-4" />
            Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── MODALE LIGHTBOX PHOTO MOBILE ───────────────────────── */

function MobilePhotoLightbox({
  photos,
  activeIndex,
  onClose,
  onChangeIndex,
}: Readonly<{
  photos: any[];
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}>) {
  const currentPhoto = photos[activeIndex];
  const totalPhotos = photos.length;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex > 0) {
      onChangeIndex(activeIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex < totalPhotos - 1) {
      onChangeIndex(activeIndex + 1);
    }
  };

  if (!currentPhoto) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1A1916] flex flex-col justify-between animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 text-white z-10">
        <span className="text-xs font-bold bg-white px-3 py-1 rounded-full">
          {activeIndex + 1} / {totalPhotos}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white text-white hover:bg-white active:scale-95 transition outline-none"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Main image content area */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        {/* Left Arrow Button */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 p-3 rounded-full bg-white text-white hover:bg-white active:scale-90 transition z-10 outline-none"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        <img
          src={currentPhoto.dataUrl || currentPhoto.url}
          alt={currentPhoto.name || currentPhoto.label || `Photo ${activeIndex + 1}`}
          className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl pointer-events-none"
        />

        {/* Right Arrow Button */}
        {activeIndex < totalPhotos - 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 p-3 rounded-full bg-white text-white hover:bg-white active:scale-90 transition z-10 outline-none"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-6 text-center text-white/80 text-xs bg-[#1A1916]">
        <p className="font-semibold tracking-wide">{currentPhoto.name || currentPhoto.label || "Photo d'entrée"}</p>
      </div>
    </div>
  );
}
