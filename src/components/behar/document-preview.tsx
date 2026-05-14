"use client";

import { useMemo, useState } from "react";

import { Download, ExternalLink, Eye, Mail, Printer, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PrimaryButton, SecondaryButton, StatusBadge } from "@/components/behar/primitives";
import { type BeharDocument, type DocumentType, formatEuro, useBeharStore } from "@/lib/behar-store";

import { useDocument } from "./print-provider";
import {
  InternalRepairDocument,
  InvoiceDocument,
  PaymentReceiptDocument,
  QuoteDocument,
  RepairIntakeDocument,
  SaleReceiptDocument,
} from "./printable-documents";

type FilterType = "all" | DocumentType;

const TYPE_FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "intake", label: "Bons" },
  { key: "quote", label: "Devis" },
  { key: "invoice", label: "Factures" },
  { key: "payment", label: "Reçus" },
  { key: "sale-receipt", label: "Ventes" },
  { key: "sale-invoice", label: "Factures vente" },
  { key: "internal", label: "Fiches internes" },
];

const TYPE_LABEL: Record<DocumentType, string> = {
  intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
  payment: "Reçu de paiement",
  "sale-receipt": "Reçu de vente",
  "sale-invoice": "Facture de vente",
  internal: "Fiche interne",
  summary: "Document",
};

const STATUS_FILTERS = [
  "Tous",
  "Brouillon",
  "Envoyé",
  "Accepté",
  "Non payé",
  "Payé",
  "Annulé",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type PrintableDocumentTarget = {
  type: "intake" | "quote" | "invoice" | "payment" | "internal" | "sale-receipt";
  id: string;
};

function getPrintableTarget(document: BeharDocument): PrintableDocumentTarget | null {
  if (document.type === "intake" && document.repairId) return { type: "intake", id: document.repairId };
  if (document.type === "quote" && document.quoteId) return { type: "quote", id: document.quoteId };
  if (document.type === "invoice" && document.invoiceId) return { type: "invoice", id: document.invoiceId };
  if (document.type === "payment" && document.paymentId) return { type: "payment", id: document.paymentId };
  if (document.type === "internal" && document.repairId) return { type: "internal", id: document.repairId };
  if ((document.type === "sale-receipt" || document.type === "sale-invoice") && document.saleId) return { type: "sale-receipt", id: document.saleId };
  return null;
}

const sourceHref = (document: BeharDocument): string | null => {
  if (document.repairId) return `/dashboard/reparations`;
  if (document.quoteId) return `/dashboard/devis`;
  if (document.invoiceId) return `/dashboard/factures`;
  if (document.paymentId) return `/dashboard/paiements`;
  if (document.saleId) return `/dashboard/ventes`;
  return null;
};

export function DocumentPreview() {
  const store = useBeharStore();
  const { print, download } = useDocument();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("Tous");
  const [search, setSearch] = useState("");

  const enriched = useMemo(() => {
    return store.documents.map((document) => {
      const customer = store.customers.find((entry) => entry.id === document.customerId);
      const repair = document.repairId ? store.repairs.find((entry) => entry.id === document.repairId) : undefined;
      const quote = document.quoteId ? store.quotes.find((entry) => entry.id === document.quoteId) : undefined;
      const invoice = document.invoiceId
        ? store.invoices.find((entry) => entry.id === document.invoiceId)
        : undefined;
      const payment = document.paymentId
        ? store.payments.find((entry) => entry.id === document.paymentId)
        : undefined;
      const sale = document.saleId ? store.sales.find((entry) => entry.id === document.saleId) : undefined;

      const isCounter = customer?.type === "counter";
      const customerLabel = isCounter ? "Client comptoir" : (customer?.name ?? "Client");
      const deviceLabel = repair
        ? `${repair.brandName ?? ""} ${repair.deviceModel ?? repair.model ?? ""}`.trim() || repair.device
        : "";

      const interventionLabel = repair?.issue ?? "";

      const numberLabel =
        sale?.number ??
        invoice?.number ??
        quote?.number ??
        repair?.number ??
        payment?.paymentNumber ??
        document.id.slice(-6).toUpperCase();

      const amount =
        sale?.total ??
        invoice?.lines?.reduce((s, l) => s + l.quantity * l.unitPrice, 0) ??
        quote?.lines?.reduce((s, l) => s + l.quantity * l.unitPrice, 0) ??
        payment?.amount ??
        repair?.total ??
        repair?.amount ??
        0;

      const titleLabel =
        document.type === "intake" && repair
          ? `Bon de prise en charge / ${repair.number} / ${customerLabel} / ${deviceLabel || repair.device}`
          : document.title;

      let statusLabel = "—";
      if (document.type === "invoice" && invoice) {
        statusLabel = invoice.status === "Payée" ? "Payé" : invoice.status === "Annulée" ? "Annulé" : "Non payé";
      } else if (document.type === "quote" && quote) {
        statusLabel = quote.status === "Accepté" || quote.status === "Facturé" ? "Accepté" : quote.status;
      } else if (document.type === "payment" && payment) {
        statusLabel = payment.status === "Payé" ? "Payé" : payment.status;
      } else if ((document.type === "sale-receipt" || document.type === "sale-invoice") && sale) {
        statusLabel = sale.status;
      } else if (document.type === "intake" && repair) {
        statusLabel = repair.status;
      } else if (document.type === "internal") {
        statusLabel = "Interne";
      }

      const haystack = [
        document.title,
        titleLabel,
        numberLabel,
        customerLabel,
        deviceLabel,
        interventionLabel,
        repair?.brandName ?? "",
        repair?.deviceModel ?? "",
        repair?.model ?? "",
        repair?.device ?? "",
        repair?.number ?? "",
        invoice?.number ?? "",
        quote?.number ?? "",
        payment?.paymentNumber ?? "",
        sale?.number ?? "",
        isCounter ? "comptoir" : "",
        // Montants searchables (réparateur peut taper "29" ou "29,00")
        amount > 0 ? String(amount) : "",
        amount > 0 ? amount.toFixed(2).replace(".", ",") : "",
        amount > 0 ? formatEuro(amount) : "",
      ]
        .join(" ")
        .toLowerCase();

      return {
        document,
        customer,
        repair,
        quote,
        invoice,
        payment,
        isCounter,
        customerLabel,
        deviceLabel,
        interventionLabel,
        numberLabel,
        amount,
        titleLabel,
        statusLabel,
        haystack,
      };
    });
  }, [store.documents, store.customers, store.repairs, store.quotes, store.invoices, store.payments, store.sales]);

  const filtered = useMemo(() => {
    // Recherche multi-mots, AND, insensible à l'ordre et aux mots intermédiaires.
    // Permet de taper "Karim iPhone 13" et de retrouver les docs même si "Apple"
    // se glisse entre le nom et le modèle dans le libellé interne.
    const tokens = search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return enriched.filter((row) => {
      if (filterType !== "all" && row.document.type !== filterType) return false;
      if (filterStatus !== "Tous") {
        if (filterStatus === "Non payé") {
          if (!(row.document.type === "invoice" && row.statusLabel === "Non payé")) return false;
        } else if (row.statusLabel.toLowerCase() !== filterStatus.toLowerCase()) {
          return false;
        }
      }
      if (tokens.length && !tokens.every((token) => row.haystack.includes(token))) return false;
      return true;
    });
  }, [enriched, filterType, filterStatus, search]);

  const selectedRow =
    filtered.find((row) => row.document.id === store.selectedDocumentId) ?? filtered[0];
  const selected = selectedRow?.document;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E7E4DC] bg-white p-4 shadow-[0_8px_22px_rgba(26,25,22,0.03)]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {TYPE_FILTERS.map((entry) => {
            const active = filterType === entry.key;
            return (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-[#2A9D8F] bg-[#E8F7F3] text-[#1A1916]"
                    : "border-[#E7E4DC] bg-[#FAFAF8] text-[#6B6B6B] hover:border-[#2A9D8F]/40"
                }`}
                key={entry.key}
                onClick={() => setFilterType(entry.key)}
                type="button"
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[#6B6B6B] text-xs">Statut :</span>
          {STATUS_FILTERS.map((entry) => {
            const active = filterStatus === entry;
            return (
              <button
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? "border-[#167B70] bg-[#E8F7F3] text-[#167B70]"
                    : "border-[#E7E4DC] bg-white text-[#6B6B6B] hover:border-[#167B70]/40"
                }`}
                key={entry}
                onClick={() => setFilterStatus(entry)}
                type="button"
              >
                {entry}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            className="h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-[#FAFAF8] pl-10 pr-3 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
            data-testid="documents-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Numéro, client, comptoir, appareil, modèle, intervention, réparation, facture…"
            type="search"
            value={search}
          />
        </div>
        <p className="mt-2 text-[#6B6B6B] text-xs">
          {filtered.length} document{filtered.length > 1 ? "s" : ""} sur {enriched.length}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-[16px] border border-dashed border-[#E7E4DC] bg-[#FAFAF8] py-10 text-center">
              <p className="text-[13px] font-medium text-[#8A8984]">Aucun document ne correspond aux filtres.</p>
              <p className="mt-1 text-[12px] text-[#CDCBC5]">Les bons, devis, factures et reçus apparaîtront ici.</p>
            </div>
          )}
          {filtered.map((row) => {
            const active = row.document.id === selected?.id;
            return (
              <button
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[#2A9D8F] bg-[#EAF6F2] shadow-[0_14px_34px_rgba(42,157,143,0.10)]"
                    : "border-[#E7E4DC] bg-white hover:border-[#2A9D8F]/40"
                }`}
                data-document-id={row.document.id}
                data-document-type={row.document.type}
                data-testid={`document-row-${row.document.type}`}
                key={row.document.id}
                onClick={() => store.setSelected("document", row.document.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[#6B6B6B] text-[10px] uppercase tracking-wide">
                    {TYPE_LABEL[row.document.type]}
                  </span>
                  <span className="font-mono text-[#6B6B6B] text-[11px]">{row.numberLabel}</span>
                </div>
                <div className="mt-1 font-semibold text-[#1A1916] text-sm">{row.titleLabel}</div>
                <div className="mt-1 text-[#6B6B6B] text-xs">
                  {row.customerLabel} · {row.document.createdAt}
                </div>
                {row.deviceLabel ? (
                  <div className="text-[#6B6B6B] text-xs">{row.deviceLabel}</div>
                ) : null}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1A1916]">{formatEuro(row.amount)}</span>
                  <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[#6B6B6B]">{row.statusLabel}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {selected && selectedRow && (
          <section className="min-w-0" data-testid="document-preview-panel">
            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E4DC] bg-white p-4">
              <div>
                <p className="font-semibold text-[#1A1916]">{selectedRow.titleLabel}</p>
                <p className="text-[#6B6B6B] text-sm">
                  {TYPE_LABEL[selected.type]} · {selectedRow.customerLabel}
                  {selectedRow.deviceLabel ? ` · ${selectedRow.deviceLabel}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selectedRow.statusLabel} />
                {sourceHref(selected) && (
                  <Link
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E7E4DC] bg-white px-3 text-[#1A1916] text-xs hover:border-[#2A9D8F]/50"
                    href={sourceHref(selected) as string}
                    onClick={() => {
                      if (selected.repairId) store.setSelected("repair", selected.repairId);
                      else if (selected.quoteId) store.setSelected("quote", selected.quoteId);
                      else if (selected.invoiceId) store.setSelected("invoice", selected.invoiceId);
                      else if (selected.paymentId) store.setSelected("payment", selected.paymentId);
                      else if (selected.saleId) store.setSelected("sale", selected.saleId);
                    }}
                  >
                    <ExternalLink className="size-3.5" />
                    Ouvrir dossier lié
                  </Link>
                )}
                <SecondaryButton onClick={() => toast.info("Ouvert ci-dessous (aperçu)")}>
                  <Eye className="size-4" />
                  Voir
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => {
                    const target = getPrintableTarget(selected);
                    if (!target) {
                      toast.error("Document lié introuvable");
                      return;
                    }
                    download(target.type, target.id);
                  }}
                >
                  <Download className="size-4" />
                  Télécharger PDF
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => {
                    const target = getPrintableTarget(selected);
                    if (!target) {
                      toast.error("Document lié introuvable");
                      return;
                    }
                    print(target.type, target.id);
                  }}
                >
                  <Printer className="size-4" />
                  Imprimer
                </SecondaryButton>
                <PrimaryButton onClick={() => toast.success("Email simulé, aucun envoi réel")}>
                  <Mail className="size-4" />
                  Envoyer
                </PrimaryButton>
                <SecondaryButton
                  className="text-[#B42318]"
                  onClick={() => {
                    if (window.confirm("Supprimer ce document ?")) {
                      store.deleteDocument(selected.id);
                      toast.success("Document supprimé");
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </SecondaryButton>
              </div>
            </div>
            <DynamicDocument document={selected} />
          </section>
        )}
      </div>
    </div>
  );
}

function DynamicDocument({ document }: Readonly<{ document: BeharDocument }>) {
  const store = useBeharStore();
  const customer = store.customers.find((entry) => entry.id === document.customerId);
  const repair = store.repairs.find((entry) => entry.id === document.repairId);
  const quote = store.quotes.find((entry) => entry.id === document.quoteId);
  const invoice = store.invoices.find((entry) => entry.id === document.invoiceId);
  const payment = store.payments.find((entry) => entry.id === document.paymentId);
  const paymentRepair = repair ?? store.repairs.find((entry) => entry.id === (payment?.repairId ?? invoice?.repairId));

  if (!customer) return <p className="p-12 text-center text-[#6B6B6B]">Client introuvable</p>;

  switch (document.type) {
    case "intake":
      if (!repair) return <p className="p-12 text-center text-[#6B6B6B]">Réparation introuvable</p>;
      return <RepairIntakeDocument customer={customer} repair={repair} workshop={store.workshopInfo} />;
    case "quote":
      if (!quote) return <p className="p-12 text-center text-[#6B6B6B]">Devis introuvable</p>;
      return <QuoteDocument customer={customer} quote={quote} repair={repair} workshop={store.workshopInfo} />;
    case "invoice":
      if (!invoice) return <p className="p-12 text-center text-[#6B6B6B]">Facture introuvable</p>;
      return (
        <InvoiceDocument
          customer={customer}
          invoice={invoice}
          quote={quote}
          repair={repair}
          workshop={store.workshopInfo}
        />
      );
    case "payment":
      if (!payment) return <p className="p-12 text-center text-[#6B6B6B]">Paiement introuvable</p>;
      return (
        <PaymentReceiptDocument
          customer={customer}
          invoice={invoice}
          payment={payment}
          repair={paymentRepair}
          workshop={store.workshopInfo}
        />
      );
    case "internal":
      if (!repair) return <p className="p-12 text-center text-[#6B6B6B]">Réparation introuvable</p>;
      return <InternalRepairDocument customer={customer} repair={repair} workshop={store.workshopInfo} />;
    case "sale-receipt":
    case "sale-invoice":
      const sale = store.sales.find((entry) => entry.id === document.saleId);
      if (!sale) return <p className="p-12 text-center text-[#6B6B6B]">Vente introuvable</p>;
      return <SaleReceiptDocument customer={customer} sale={sale} workshop={store.workshopInfo} />;
    default:
      return <p className="p-12 text-center text-[#6B6B6B]">Type de document inconnu</p>;
  }
}
