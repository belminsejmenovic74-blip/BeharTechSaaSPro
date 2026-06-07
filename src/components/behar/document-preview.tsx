"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { Download, ExternalLink, Eye, Mail, Printer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PrimaryButton, SecondaryButton, StatusBadge } from "@/components/behar/primitives";
import { type BeharDocument, type DocumentType, formatEuro, getQuoteDeviceListLabel, useBeharStore } from "@/lib/behar-store";
import { formatDeviceLabel } from "@/lib/format-device";
import { formatIntakeBonNumber } from "@/lib/utils";

import { getPrintableTarget, LocalPrintableDocument } from "./local-printable-document";
import { useDocument } from "./print-provider";

// "sales" est un filtre composite : reçus de vente (sale-receipt + sale-invoice).
type FilterType = "all" | "sales" | DocumentType;

const TYPE_FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "intake", label: "Bons" },
  { key: "quote", label: "Devis" },
  { key: "invoice", label: "Factures" },
  { key: "payment", label: "Reçus" },
  { key: "sales", label: "Ventes" },
  { key: "internal", label: "Fiches internes" },
  { key: "summary", label: "Résumés" },
];

const TYPE_LABEL: Record<DocumentType, string> = {
  intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
  payment: "Reçu / justificatif",
  "sale-receipt": "Reçu",
  "sale-invoice": "Reçu",
  internal: "Fiche interne",
  summary: "Résumé dossier",
};

const TYPE_SHORT_LABEL: Record<DocumentType, string> = {
  intake: "Bon",
  quote: "Devis",
  invoice: "Facture",
  payment: "Reçu",
  "sale-receipt": "Reçu",
  "sale-invoice": "Reçu",
  internal: "Interne",
  summary: "Résumé",
};

const PREVIEW_DOCUMENT_WIDTH = 794;

const STATUS_FILTERS = ["Tous", "Brouillon", "Envoyé", "Accepté", "Non payé", "Payé", "Annulé"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const sourceHref = (document: BeharDocument): string | null => {
  if (document.repairId) return `/dashboard/dossiers/${document.repairId}`;
  if (document.quoteId) return `/dashboard/devis`;
  if (document.invoiceId) return `/dashboard/factures`;
  if (document.paymentId) return `/dashboard/paiements`;
  if (document.saleId) return `/dashboard/ventes`;
  return null;
};

const documentSortValue = (createdAt: string, index: number) => {
  const parsed = Date.parse(createdAt);
  if (Number.isFinite(parsed)) return parsed;
  return index;
};

export function DocumentPreview() {
  const store = useBeharStore();
  const { print, download } = useDocument();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("Tous");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "byRepair" | "byClient" | "recent">("all");

  const enriched = useMemo(() => {
    return store.documents.map((document, index) => {
      const customer = store.customers.find((entry) => entry.id === document.customerId);
      const repair = document.repairId ? store.repairs.find((entry) => entry.id === document.repairId) : undefined;
      const quote = document.quoteId ? store.quotes.find((entry) => entry.id === document.quoteId) : undefined;
      const invoice = document.invoiceId ? store.invoices.find((entry) => entry.id === document.invoiceId) : undefined;
      const payment = document.paymentId ? store.payments.find((entry) => entry.id === document.paymentId) : undefined;
      const sale = document.saleId ? store.sales.find((entry) => entry.id === document.saleId) : undefined;

      const isCounter = customer?.type === "counter";
      const customerLabel = isCounter ? "Client comptoir" : (customer?.name ?? "Client");
      const quoteDeviceLabel = quote ? getQuoteDeviceListLabel(quote) : "";
      const deviceLabel = repair ? formatDeviceLabel(repair, "") : quoteDeviceLabel;

      const interventionLabel = repair?.issue ?? quote?.issue ?? "";

      const numberLabel =
        document.type === "intake" && repair
          ? formatIntakeBonNumber(repair.number)
          : sale?.number ??
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
          ? `Bon de prise en charge / ${numberLabel} / ${customerLabel} / ${deviceLabel || repair.device}`
          : document.title;
      const listTitle =
        document.type === "intake" && repair
          ? `Bon ${numberLabel}`
          : document.type === "internal" && repair
            ? `Fiche interne ${repair.number}`
            : document.type === "summary" && repair
              ? `Résumé ${repair.number}`
              : `${TYPE_SHORT_LABEL[document.type]} ${numberLabel}`;
      const contextLabel = [customerLabel, deviceLabel || repair?.device, interventionLabel]
        .filter(Boolean)
        .join(" · ");

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
        customer?.phone ?? "",
        deviceLabel,
        interventionLabel,
        invoice?.number ?? "",
        payment?.paymentNumber ?? "",
        repair?.brandName ?? "",
        repair?.deviceModel ?? "",
        quote?.brandName ?? "",
        quote?.deviceModel ?? "",
        quote?.deviceType ?? "",
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
        listTitle,
        contextLabel,
        statusLabel,
        sortValue: documentSortValue(document.createdAt, index),
        haystack,
      };
    });
  }, [store.documents, store.customers, store.repairs, store.quotes, store.invoices, store.payments, store.sales]);

  const filtered = useMemo(() => {
    // Recherche multi-mots, AND, insensible à l'ordre et aux mots intermédiaires.
    // Permet de taper "Karim iPhone 13" et de retrouver les docs même si "Apple"
    // se glisse entre le nom et le modèle dans le libellé interne.
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return enriched
      .filter((row) => {
        if (filterType === "sales") {
          if (row.document.type !== "sale-receipt" && row.document.type !== "sale-invoice") return false;
        } else if (filterType !== "all" && row.document.type !== filterType) {
          return false;
        }
        if (filterStatus !== "Tous") {
          if (filterStatus === "Non payé") {
            if (!(row.document.type === "invoice" && row.statusLabel === "Non payé")) return false;
          } else if (row.statusLabel.toLowerCase() !== filterStatus.toLowerCase()) {
            return false;
          }
        }
        if (tokens.length && !tokens.every((token) => row.haystack.includes(token))) return false;
        return true;
      })
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [enriched, filterType, filterStatus, search]);

  const filtersActive = filterType !== "all" || filterStatus !== "Tous" || search.trim().length > 0;

  // Vue récente : derniers documents générés (déjà triés récent → ancien).
  const recentDocs = useMemo(() => filtered.slice(0, 40), [filtered]);

  // Regroupement par dossier atelier ou par client.
  const groups = useMemo(() => {
    if (viewMode !== "byRepair" && viewMode !== "byClient") return [] as Array<{ key: string; title: string; subtitle: string; rows: typeof filtered }>;
    const map = new Map<string, { key: string; title: string; subtitle: string; rows: typeof filtered }>();
    for (const row of filtered) {
      const key = viewMode === "byRepair" ? (row.repair?.id ?? "__none__") : (row.customer?.id ?? "__none__");
      if (!map.has(key)) {
        const title = viewMode === "byRepair" ? (row.repair?.number ?? "Sans dossier") : row.customerLabel;
        const subtitle =
          viewMode === "byRepair"
            ? row.repair
              ? [row.customerLabel, row.deviceLabel].filter(Boolean).join(" · ")
              : "Documents non rattachés à un dossier"
            : (row.customer?.phone ?? "");
        map.set(key, { key, title, subtitle, rows: [] as typeof filtered });
      }
      map.get(key)?.rows.push(row);
    }
    return [...map.values()];
  }, [filtered, viewMode]);

  const selectedRow = filtered.find((row) => row.document.id === store.selectedDocumentId) ?? filtered[0];
  const selected = selectedRow?.document;

  const renderRow = (row: (typeof filtered)[number]) => {
    const active = row.document.id === selected?.id;
    return (
      <button
        className={`w-full rounded-2xl border p-4 text-left transition ${
          active
            ? "border-[#2A9D8F] bg-[#EAF6F2] shadow-[0_14px_34px_rgba(42,157,143,0.10)]"
            : "border-[#E8E8E5] bg-white hover:border-[#2A9D8F]/40"
        }`}
        data-document-id={row.document.id}
        data-document-type={row.document.type}
        data-testid={`document-row-${row.document.type}`}
        key={row.document.id}
        onClick={() => store.setSelected("document", row.document.id)}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 text-[#6B6B6B] text-[10px] uppercase tracking-wide">
              {TYPE_SHORT_LABEL[row.document.type]}
            </span>
            <div className="mt-1 truncate font-semibold text-[#1A1916] text-sm">{row.listTitle}</div>
          </div>
          <span className="shrink-0 font-mono text-[#6B6B6B] text-[11px]">{row.numberLabel}</span>
        </div>
        <div className="mt-2 line-clamp-2 text-[#6B6B6B] text-xs">{row.contextLabel}</div>
        <div className="mt-1 text-[#6B6B6B] text-[11px]">{row.document.createdAt}</div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-[#1A1916]">{formatEuro(row.amount)}</span>
          <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 text-[#6B6B6B]">{row.statusLabel}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E8E8E5] bg-white p-4 shadow-[0_8px_22px_rgba(26,25,22,0.03)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6B6B6B]" />
            <input
              className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-[#FAFAFA] pl-10 pr-3 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
              data-testid="documents-search"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher : client, numéro, appareil, dossier..."
              type="search"
              value={search}
            />
          </div>
          <select
            className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            value={filterType}
          >
            {TYPE_FILTERS.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
            value={filterStatus}
          >
            {STATUS_FILTERS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              { key: "all", label: "Vue globale" },
              { key: "byRepair", label: "Par dossier" },
              { key: "byClient", label: "Par client" },
              { key: "recent", label: "Récents" },
            ] as const
          ).map((entry) => (
            <button
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === entry.key
                  ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                  : "border-[#E8E8E5] bg-white text-[#1A1916] hover:border-[#2A9D8F]/45"
              }`}
              key={entry.key}
              onClick={() => setViewMode(entry.key)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[#6B6B6B] text-xs">
            {filtered.length} document{filtered.length > 1 ? "s" : ""} sur {enriched.length} · plus récents en haut
          </p>
          {filtersActive ? (
            <button
              className="rounded-full border border-[#E8E8E5] bg-white px-3 py-1 text-[#6B6B6B] text-xs hover:border-[#2A9D8F]/45 hover:text-[#167B70]"
              onClick={() => {
                setFilterType("all");
                setFilterStatus("Tous");
                setSearch("");
              }}
              type="button"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-[16px] border border-dashed border-[#E8E8E5] bg-[#FAFAFA] py-10 text-center">
              <p className="text-[13px] font-medium text-[#6B6B6B]">Aucun document ne correspond aux filtres.</p>
              <p className="mt-1 text-[12px] text-[#A3A3A3]">Les bons, devis, factures et reçus apparaîtront ici.</p>
            </div>
          )}
          {viewMode === "all" && filtered.map((row) => renderRow(row))}
          {viewMode === "recent" && recentDocs.map((row) => renderRow(row))}
          {(viewMode === "byRepair" || viewMode === "byClient") &&
            groups.map((group) => (
              <div className="space-y-2" key={group.key}>
                <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 rounded-[12px] border border-[#E8E8E5] bg-[#FAFAFA]/95 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#1A1916] text-[13px]">{group.title}</p>
                    {group.subtitle ? <p className="truncate text-[#6B6B6B] text-[11px]">{group.subtitle}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[#6B6B6B] text-[11px]">
                    {group.rows.length} doc{group.rows.length > 1 ? "s" : ""}
                  </span>
                </div>
                {group.rows.map((row) => renderRow(row))}
              </div>
            ))}
        </aside>

        {selected && selectedRow && (
          <section className="min-w-0" data-testid="document-preview-panel">
            <div className="no-print mb-4 rounded-2xl border border-[#E8E8E5] bg-white p-4 shadow-[0_10px_28px_rgba(26,25,22,0.035)]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-[#1A1916]">{selectedRow.titleLabel}</p>
                    <p className="mt-1 break-words text-[#6B6B6B] text-sm">
                      {TYPE_LABEL[selected.type]} · {selectedRow.customerLabel}
                      {selectedRow.deviceLabel ? ` · ${selectedRow.deviceLabel}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={selectedRow.statusLabel} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
                  {sourceHref(selected) && (
                    <Link
                      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-[14px] border border-[#E8E8E5] bg-white px-3 text-center text-[#1A1916] text-xs leading-tight hover:border-[#2A9D8F]/50"
                      href={sourceHref(selected) as string}
                      onClick={() => {
                        if (selected.repairId) store.setSelected("repair", selected.repairId);
                        else if (selected.quoteId) store.setSelected("quote", selected.quoteId);
                        else if (selected.invoiceId) store.setSelected("invoice", selected.invoiceId);
                        else if (selected.paymentId) store.setSelected("payment", selected.paymentId);
                        else if (selected.saleId) store.setSelected("sale", selected.saleId);
                      }}
                    >
                      <ExternalLink className="size-3.5 shrink-0" />
                      <span>Dossier</span>
                    </Link>
                  )}
                  <Link
                    className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-[14px] border border-[#E8E8E5] bg-white px-3 text-center text-[#1A1916] text-xs leading-tight hover:border-[#2A9D8F]/50"
                    href={`/print/document/${selected.id}`}
                  >
                    <Eye className="size-4 shrink-0" />
                    <span>Ouvrir</span>
                  </Link>
                  <SecondaryButton
                    className="min-w-0 justify-center gap-2 whitespace-normal px-3 text-center text-xs leading-tight"
                    onClick={() => {
                      const target = getPrintableTarget(selected);
                      if (!target) {
                        toast.error("Document lié introuvable");
                        return;
                      }
                      download(target.type, target.id);
                    }}
                  >
                    <Download className="size-4 shrink-0" />
                    Télécharger PDF
                  </SecondaryButton>
                  <SecondaryButton
                    className="min-w-0 justify-center gap-2 px-3 text-xs"
                    onClick={() => {
                      const target = getPrintableTarget(selected);
                      if (!target) {
                        toast.error("Document lié introuvable");
                        return;
                      }
                      print(target.type, target.id);
                    }}
                  >
                    <Printer className="size-4 shrink-0" />
                    Imprimer
                  </SecondaryButton>
                  <PrimaryButton
                    className="min-w-0 justify-center gap-2 px-3 text-xs"
                    onClick={() => toast.success("Message ajouté à l'historique client")}
                  >
                    <Mail className="size-4 shrink-0" />
                    Envoyer
                  </PrimaryButton>
                  <SecondaryButton
                    className="min-w-0 justify-center gap-2 px-3 text-xs text-[#B42318]"
                    onClick={() => {
                      if (window.confirm("Supprimer ce document ?")) {
                        store.deleteDocument(selected.id);
                        toast.success("Document supprimé");
                      }
                    }}
                  >
                    <Trash2 className="size-4 shrink-0" />
                    Supprimer
                  </SecondaryButton>
                </div>
              </div>
            </div>
            <ResponsivePreviewFrame>
              <LocalPrintableDocument document={selected} store={store} />
            </ResponsivePreviewFrame>
          </section>
        )}
      </div>
    </div>
  );
}

function ResponsivePreviewFrame({ children }: Readonly<{ children: ReactNode }>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ height: 0, scale: 1 });

  useEffect(() => {
    const updateMetrics = () => {
      const viewport = viewportRef.current;
      const document = documentRef.current;
      if (!viewport || !document) return;

      const availableWidth = viewport.clientWidth;
      const nextScale = Math.min(1, availableWidth / PREVIEW_DOCUMENT_WIDTH);
      const nextHeight = Math.ceil(document.offsetHeight * nextScale);

      setMetrics((current) => {
        if (Math.abs(current.scale - nextScale) < 0.001 && Math.abs(current.height - nextHeight) <= 1) {
          return current;
        }
        return { height: nextHeight, scale: nextScale };
      });
    };

    updateMetrics();

    const resizeObserver = new ResizeObserver(updateMetrics);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);
    if (documentRef.current) resizeObserver.observe(documentRef.current);
    window.addEventListener("resize", updateMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[#E8E8E5] bg-white p-3 shadow-[0_12px_34px_rgba(26,25,22,0.045)] sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[#6B6B6B] text-sm">Aperçu du document</p>
        <ExternalLink className="size-4 shrink-0 text-[#6B6B6B]" aria-hidden />
      </div>
      <div
        className="relative w-full overflow-hidden rounded-[14px] border border-[#E8E8E5] bg-[#FAFAFA]"
        ref={viewportRef}
        style={{ height: metrics.height || undefined, minHeight: metrics.height ? undefined : 420 }}
      >
        <div
          className="absolute top-0 left-1/2"
          ref={documentRef}
          style={{
            transform: `translateX(-50%) scale(${metrics.scale})`,
            transformOrigin: "top center",
            width: PREVIEW_DOCUMENT_WIDTH,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
