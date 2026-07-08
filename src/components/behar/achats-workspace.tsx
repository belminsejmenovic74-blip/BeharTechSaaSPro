"use client";

import { useMemo, useState } from "react";

import { Download, Eye, FileJson, FileText, Package, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  formatEuro,
  type PurchaseKind,
  type SupplierInvoice,
  type SupplierInvoiceLine,
  type SupplierPurchaseSource,
  type SupplierPurchaseStatus,
  type StockMovement,
  useBeharStore,
} from "@/lib/behar-store";
import { cn } from "@/lib/utils";

import { PageShell } from "./page-shell";
import { PartReferenceLink } from "./part-reference-link";
import {
  Panel,
  PrimaryButton,
  SecondaryButton,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
  TableShell,
} from "./primitives";
import { SupplierInvoiceImportModal } from "./supplier-invoice-import-modal";

const EMPTY_FORM = {
  kind: "piece" as PurchaseKind,
  label: "",
  supplier: "",
  invoiceNumber: "",
  reference: "",
  quantity: "1",
  unitCost: "",
  taxRate: "20",
};

const statusLabels: Record<SupplierPurchaseStatus, string> = {
  brouillon: "Brouillon",
  reçu: "Reçu",
  partiel: "Partiel",
  annulé: "Annulé",
};

const sourceLabels: Record<SupplierPurchaseSource, string> = {
  manuel: "Manuel",
  textract: "Analyse IA",
};

type InvoiceRow = {
  invoice: SupplierInvoice;
  lines: SupplierInvoiceLine[];
  movements: StockMovement[];
};

type DetailPayload = InvoiceRow & {
  documentTitle?: string;
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function isoDate(value: string | undefined) {
  return (value ?? "").slice(0, 10);
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function invoiceReferenceList(lines: SupplierInvoiceLine[]) {
  return uniqueValues(lines.flatMap((line) => [line.reference, line.sku, line.internalCode]));
}

function invoiceArticles(lines: SupplierInvoiceLine[]) {
  return lines.map((line) => line.itemName).filter(Boolean);
}

function sourceBadge(source: SupplierPurchaseSource) {
  return source === "textract"
    ? "border-[#D7EFEA] bg-white text-[#167B70]"
    : "border-[#E8E8E5] bg-white text-[#6B6B6B]";
}

function statusBadge(status: SupplierPurchaseStatus) {
  if (status === "reçu") return "border-[#D7EFEA] bg-white text-[#167B70]";
  if (status === "annulé") return "border-[#F2D4D1] bg-white text-[#B42318]";
  if (status === "partiel") return "border-[#FFE6C7] bg-white text-[#936100]";
  return "border-[#E8E8E5] bg-white text-[#6B6B6B]";
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Kpi({
  label,
  value,
  helper,
  icon: Icon,
}: Readonly<{ label: string; value: string; helper: string; icon: typeof Package }>) {
  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[#6B6B6B] text-xs font-medium tracking-tight">{label}</p>
          <p className="mt-1.5 font-semibold text-[#1A1916] text-[24px] leading-none tracking-tight">{value}</p>
          <p className="mt-1.5 text-[#8A8A85] text-xs">{helper}</p>
        </div>
        <Icon className="h-5 w-5 text-[#B4B4AE]" />
      </div>
    </Panel>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}>) {
  return (
    <label className="flex flex-col gap-1 text-[#6B6B6B] text-xs font-medium">
      {label}
      <input
        className="h-10 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none transition placeholder:text-[#B4B4AE] focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}>) {
  return (
    <label className="flex flex-col gap-1 text-[#6B6B6B] text-xs font-medium">
      {label}
      <select
        className="h-10 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailModal({ detail, onClose }: Readonly<{ detail: DetailPayload; onClose: () => void }>) {
  const invoice = detail.invoice;
  const exportPayload = {
    invoice,
    lines: detail.lines,
    stockMovements: detail.movements,
    documentTitle: detail.documentTitle,
  };

  function downloadOriginal() {
    if (!invoice.originalFileUrl) {
      toast.error("Aucun fichier original téléchargeable pour cette facture.");
      return;
    }
    window.open(invoice.originalFileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-0 md:p-4">
      <Panel className="mx-auto my-0 min-h-svh max-w-none rounded-none bg-[#FAFAF8] p-5 md:my-6 md:max-w-7xl md:min-h-0 md:rounded-[18px] md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[#6B6B6B] text-xs font-semibold uppercase tracking-[0.12em]">Détail achat fournisseur</p>
            <h2 className="mt-1 font-semibold text-[#1A1916] text-2xl tracking-tight">
              {invoice.invoiceNumber || "Facture sans numéro"}
            </h2>
            <p className="mt-1.5 text-[#6B6B6B] text-sm">
              {invoice.supplierName} · {isoDate(invoice.purchaseDate)}
            </p>
          </div>
          <button
            aria-label="Fermer"
            className="rounded-full p-2 text-[#6B6B6B] hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {[
            ["Fournisseur", invoice.supplierName],
            ["Fichier original", invoice.originalFileName || detail.documentTitle || "Non lié"],
            ["Total HT", formatEuro(invoice.totalExcludingTax)],
            ["Total TTC", formatEuro(invoice.totalIncludingTax)],
          ].map(([label, value]) => (
            <Panel key={label} className="p-4">
              <p className="text-[#6B6B6B] text-xs">{label}</p>
              <p className="mt-1 font-semibold text-[#1A1916] text-sm">{value}</p>
            </Panel>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <SecondaryButton onClick={downloadOriginal}>
            <Download className="size-4" />
            Télécharger facture
          </SecondaryButton>
          <SecondaryButton
            onClick={() =>
              downloadTextFile(
                `achat-${invoice.invoiceNumber || invoice.id}.json`,
                JSON.stringify(exportPayload, null, 2),
                "application/json",
              )
            }
          >
            <FileJson className="size-4" />
            Exporter
          </SecondaryButton>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel className="overflow-hidden">
            <div className="border-[#E8E8E5] border-b p-4">
              <h3 className="font-semibold text-[#1A1916] text-sm">Lignes achetées</h3>
            </div>
            <TableShell>
              <table className={`${tableClassName} min-w-[980px]`}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className="px-4 py-3">Article</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Modèle</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3 text-right">Qté</th>
                    <th className="px-4 py-3 text-right">Prix HT</th>
                    <th className="px-4 py-3 text-right">TVA</th>
                    <th className="px-4 py-3 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((line) => (
                    <tr key={line.id}>
                      <td className={cn(tableCellClassName, "font-medium")}>{line.itemName}</td>
                      <td className={cn(tableCellClassName, "font-mono text-xs")}>
                        {line.reference || line.sku ? (
                          <PartReferenceLink reference={line.reference || line.sku || ""} />
                        ) : (
                          "—"
                        )}
                        {line.internalCode && <span className="mt-1 block text-[#A8A8A2]">{line.internalCode}</span>}
                      </td>
                      <td className={cn(tableCellClassName, "text-xs text-[#6B6B6B]")}>
                        {line.compatibleModel || "—"}
                      </td>
                      <td className={cn(tableCellClassName, "text-xs text-[#6B6B6B]")}>{line.category || "—"}</td>
                      <td className={cn(tableCellClassName, "text-right tabular-nums")}>{line.quantityPurchased}</td>
                      <td className={cn(tableCellClassName, "text-right tabular-nums")}>
                        {formatEuro(line.unitPurchasePriceExclTax)}
                      </td>
                      <td className={cn(tableCellClassName, "text-right tabular-nums")}>
                        {line.taxRate ? `${line.taxRate}%` : formatEuro(line.taxAmount ?? 0)}
                      </td>
                      <td className={cn(tableCellClassName, "text-right font-semibold tabular-nums")}>
                        {formatEuro(line.lineTotalExclTax)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </Panel>

          <div className="space-y-5">
            <Panel className="p-4">
              <h3 className="font-semibold text-[#1A1916] text-sm">Pièces créées ou mises à jour</h3>
              <div className="mt-3 space-y-2">
                {detail.lines.map((line) => (
                  <div key={line.id} className="rounded-[12px] border border-[#E8E8E5] bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1A1916] text-sm">{line.itemName}</p>
                        <p className="mt-1 font-mono text-[#6B6B6B] text-xs">
                          {line.reference || line.sku ? (
                            <PartReferenceLink reference={line.reference || line.sku || ""} />
                          ) : (
                            "Référence non renseignée"
                          )}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#D7EFEA] px-2.5 py-1 font-semibold text-[#167B70] text-[11px]">
                        {line.stockItemId ? "Fiche liée" : "À vérifier"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <h3 className="font-semibold text-[#1A1916] text-sm">Mouvements de stock générés</h3>
              <div className="mt-3 space-y-2">
                {detail.movements.length ? (
                  detail.movements.map((movement) => (
                    <div key={movement.id} className="rounded-[12px] border border-[#E8E8E5] bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#1A1916] text-sm">
                            {movement.reason || movement.movementType}
                          </p>
                          <p className="mt-1 text-[#6B6B6B] text-xs">
                            {movement.quantityBefore} → {movement.quantityAfter} · {isoDate(movement.createdAt)}
                          </p>
                        </div>
                        <span className="font-semibold text-[#167B70] text-sm tabular-nums">
                          +{movement.quantityDelta}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[#6B6B6B] text-sm">Aucun mouvement lié.</p>
                )}
              </div>
            </Panel>
          </div>
        </div>

        {invoice.source === "textract" && (
          <Panel className="mt-5 overflow-hidden">
            <div className="border-[#E8E8E5] border-b p-4">
              <h3 className="font-semibold text-[#1A1916] text-sm">Données d'analyse brutes</h3>
            </div>
            <pre className="max-h-80 overflow-auto bg-white p-4 text-[#1A1916] text-xs">
              {JSON.stringify(invoice.textractJson ?? {}, null, 2)}
            </pre>
          </Panel>
        )}
      </Panel>
    </div>
  );
}

export function AchatsWorkspace() {
  const purchases = useBeharStore((s) => s.purchases);
  const commitSupplierInvoice = useBeharStore((s) => s.commitSupplierInvoice);
  const canViewPurchases = useBeharStore((s) => s.hasPermission("canViewPurchasePrice"));
  const supplierInvoices = useBeharStore((s) => s.supplierInvoices);
  const supplierInvoiceLines = useBeharStore((s) => s.supplierInvoiceLines);
  const stockMovements = useBeharStore((s) => s.stockMovements);
  const documents = useBeharStore((s) => s.documents);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [referenceSearch, setReferenceSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const invoiceRows = useMemo<InvoiceRow[]>(() => {
    return supplierInvoices.map((invoice) => ({
      invoice,
      lines: supplierInvoiceLines.filter((line) => line.supplierInvoiceId === invoice.id),
      movements: stockMovements.filter((movement) => movement.linkedSupplierInvoiceId === invoice.id),
    }));
  }, [stockMovements, supplierInvoiceLines, supplierInvoices]);

  const suppliers = useMemo(() => uniqueValues(invoiceRows.map((row) => row.invoice.supplierName)), [invoiceRows]);

  const filteredRows = useMemo(() => {
    const globalQuery = search.trim().toLowerCase();
    const supplierQuery = supplierSearch.trim().toLowerCase();
    const invoiceQuery = invoiceSearch.trim().toLowerCase();
    const referenceQuery = referenceSearch.trim().toLowerCase();
    const min = amountMin.trim() ? Number.parseFloat(amountMin.replace(",", ".")) : undefined;
    const max = amountMax.trim() ? Number.parseFloat(amountMax.replace(",", ".")) : undefined;

    return invoiceRows.filter((row) => {
      const invoice = row.invoice;
      const date = isoDate(invoice.purchaseDate);
      const references = invoiceReferenceList(row.lines).join(" ").toLowerCase();
      const articles = invoiceArticles(row.lines).join(" ").toLowerCase();
      if (globalQuery) {
        const haystack = [
          invoice.supplierName,
          invoice.invoiceNumber,
          references,
          articles,
          invoice.source,
          invoice.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(globalQuery)) return false;
      }
      if (supplierQuery && !invoice.supplierName.toLowerCase().includes(supplierQuery)) return false;
      if (invoiceQuery && !invoice.invoiceNumber.toLowerCase().includes(invoiceQuery)) return false;
      if (referenceQuery && !references.includes(referenceQuery)) return false;
      if (dateStart && date < dateStart) return false;
      if (dateEnd && date > dateEnd) return false;
      if (supplierFilter !== "all" && invoice.supplierName !== supplierFilter) return false;
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (sourceFilter !== "all" && invoice.source !== sourceFilter) return false;
      if (typeof min === "number" && Number.isFinite(min) && invoice.totalIncludingTax < min) return false;
      if (typeof max === "number" && Number.isFinite(max) && invoice.totalIncludingTax > max) return false;
      return true;
    });
  }, [
    amountMax,
    amountMin,
    dateEnd,
    dateStart,
    invoiceRows,
    invoiceSearch,
    referenceSearch,
    search,
    sourceFilter,
    statusFilter,
    supplierFilter,
    supplierSearch,
  ]);

  const stats = useMemo(() => {
    const month = currentMonthKey();
    const monthTotal = invoiceRows
      .filter((row) => isoDate(row.invoice.purchaseDate).slice(0, 7) === month)
      .reduce((sum, row) => sum + row.invoice.totalIncludingTax, 0);
    const piecesBought = invoiceRows.reduce(
      (sum, row) => sum + row.lines.reduce((lineSum, line) => lineSum + line.quantityPurchased, 0),
      0,
    );
    const totalUnitsCost = invoiceRows.reduce(
      (sum, row) => sum + row.lines.reduce((lineSum, line) => lineSum + line.lineTotalExclTax, 0),
      0,
    );
    const supplierTotals = new Map<string, number>();
    for (const row of invoiceRows) {
      supplierTotals.set(
        row.invoice.supplierName,
        (supplierTotals.get(row.invoice.supplierName) ?? 0) + row.invoice.totalIncludingTax,
      );
    }
    const mainSupplier = [...supplierTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return {
      monthTotal,
      invoiceCount: invoiceRows.length,
      piecesBought,
      averageCost: piecesBought > 0 ? totalUnitsCost / piecesBought : 0,
      mainSupplier,
    };
  }, [invoiceRows]);

  const detail = useMemo<DetailPayload | null>(() => {
    const row = invoiceRows.find((entry) => entry.invoice.id === detailId);
    if (!row) return null;
    const document = row.invoice.originalDocumentId
      ? documents.find((entry) => entry.id === row.invoice.originalDocumentId)
      : undefined;
    return { ...row, documentTitle: document?.title };
  }, [detailId, documents, invoiceRows]);

  function submitForm() {
    const label = form.label.trim();
    const supplier = form.supplier.trim();
    const invoiceNumber = form.invoiceNumber.trim();
    const unitCost = Number.parseFloat(form.unitCost.replace(",", "."));
    if (!supplier) {
      toast.error("Indiquez un fournisseur.");
      return;
    }
    if (!invoiceNumber) {
      toast.error("Indiquez un numéro de facture.");
      return;
    }
    if (!label) {
      toast.error("Indiquez une désignation.");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      toast.error("Indiquez un prix d'achat unitaire valide.");
      return;
    }
    const quantity = Math.max(1, Number.parseInt(form.quantity, 10) || 1);
    const taxRate = Math.max(0, Number.parseFloat(form.taxRate.replace(",", ".")) || 0);
    const ht = Math.round(quantity * unitCost * 100) / 100;
    const taxAmount = Math.round(ht * (taxRate / 100) * 100) / 100;
    const invoiceId = commitSupplierInvoice({
      supplier,
      invoiceNumber,
      source: "manuel",
      totalExcludingTax: ht,
      taxAmount,
      totalIncludingTax: ht + taxAmount,
      status: "reçu",
      lines: [
        {
          itemName: label,
          reference: form.reference.trim() || undefined,
          sku: form.reference.trim() || undefined,
          quantityPurchased: quantity,
          unitPurchasePriceExclTax: unitCost,
          taxRate,
          lineTotalExclTax: ht,
          lineTotalInclTax: ht + taxAmount,
        },
      ],
      note: `Saisie manuelle Achats (${form.kind})`,
    });
    if (!invoiceId) {
      toast.error("Impossible d'enregistrer l'achat fournisseur.");
      return;
    }
    toast.success("Achat fournisseur enregistré.");
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  if (!canViewPurchases) {
    return (
      <PageShell title="Achats" subtitle="Accès restreint.">
        <Panel className="p-10 text-center">
          <p className="font-semibold text-[#1A1916] text-sm">Accès non autorisé</p>
          <p className="mt-1.5 text-[#8A8A85] text-xs">
            Les prix d'achat sont réservés aux rôles disposant de la permission « voir les prix d'achat ».
          </p>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      actions={
        <>
          <SupplierInvoiceImportModal />
          <PrimaryButton onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4" />
            Saisie manuelle
          </PrimaryButton>
        </>
      }
      onSearchChange={setSearch}
      searchPlaceholder="Rechercher fournisseur, facture, référence..."
      searchValue={search}
      subtitle="Historique complet des factures fournisseurs reliées au stock, aux mouvements et aux fiches pièces."
      title="Achats"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Achats du mois"
          value={formatEuro(stats.monthTotal)}
          helper="factures fournisseurs"
          icon={ShoppingCart}
        />
        <Kpi label="Factures" value={String(stats.invoiceCount)} helper="historique fournisseur" icon={FileText} />
        <Kpi label="Pièces achetées" value={String(stats.piecesBought)} helper="quantité cumulée" icon={Package} />
        <Kpi label="Coût moyen" value={formatEuro(stats.averageCost)} helper="par pièce achetée" icon={ShoppingCart} />
        <Kpi label="Fournisseur principal" value={stats.mainSupplier} helper="par montant TTC" icon={Package} />
      </div>

      {showForm && (
        <Panel className="mt-5 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1916] text-sm">Saisie manuelle d'achat fournisseur</h2>
            <button
              aria-label="Fermer"
              className="rounded-full p-1 text-[#8A8A85] hover:bg-[#F2F2EF]"
              onClick={() => setShowForm(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-8">
            <FilterSelect
              label="Type"
              onChange={(value) => setForm((current) => ({ ...current, kind: value as PurchaseKind }))}
              options={[
                { value: "piece", label: "Pièce" },
                { value: "accessoire", label: "Accessoire" },
                { value: "telephone", label: "Téléphone" },
                { value: "autre", label: "Autre" },
              ]}
              value={form.kind}
            />
            <FilterInput
              label="Fournisseur"
              onChange={(value) => setForm((current) => ({ ...current, supplier: value }))}
              placeholder="Fournisseur"
              value={form.supplier}
            />
            <FilterInput
              label="N° facture"
              onChange={(value) => setForm((current) => ({ ...current, invoiceNumber: value }))}
              placeholder="FA-..."
              value={form.invoiceNumber}
            />
            <FilterInput
              label="Désignation"
              onChange={(value) => setForm((current) => ({ ...current, label: value }))}
              placeholder="Écran iPhone 13"
              value={form.label}
            />
            <FilterInput
              label="Référence"
              onChange={(value) => setForm((current) => ({ ...current, reference: value }))}
              placeholder="SKU"
              value={form.reference}
            />
            <FilterInput
              label="Quantité"
              onChange={(value) => setForm((current) => ({ ...current, quantity: value }))}
              type="number"
              value={form.quantity}
            />
            <FilterInput
              label="Prix HT"
              onChange={(value) => setForm((current) => ({ ...current, unitCost: value }))}
              type="number"
              value={form.unitCost}
            />
            <FilterInput
              label="TVA %"
              onChange={(value) => setForm((current) => ({ ...current, taxRate: value }))}
              type="number"
              value={form.taxRate}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <SecondaryButton onClick={() => setShowForm(false)}>Annuler</SecondaryButton>
            <PrimaryButton onClick={submitForm}>Enregistrer</PrimaryButton>
          </div>
        </Panel>
      )}

      <Panel className="mt-5 p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search className="size-4 text-[#2A9D8F]" />
          <h2 className="font-semibold text-[#1A1916] text-sm">Filtres achats fournisseurs</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <FilterInput
            label="Recherche fournisseur"
            onChange={setSupplierSearch}
            placeholder="Nom fournisseur"
            value={supplierSearch}
          />
          <FilterInput label="N° facture" onChange={setInvoiceSearch} placeholder="Facture" value={invoiceSearch} />
          <FilterInput
            label="Référence pièce"
            onChange={setReferenceSearch}
            placeholder="SKU / code"
            value={referenceSearch}
          />
          <FilterInput label="Date début" onChange={setDateStart} type="date" value={dateStart} />
          <FilterInput label="Date fin" onChange={setDateEnd} type="date" value={dateEnd} />
          <FilterSelect
            label="Fournisseur"
            onChange={setSupplierFilter}
            options={[
              { value: "all", label: "Tous" },
              ...suppliers.map((supplier) => ({ value: supplier, label: supplier })),
            ]}
            value={supplierFilter}
          />
          <FilterSelect
            label="Statut"
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Tous" },
              { value: "brouillon", label: "Brouillon" },
              { value: "reçu", label: "Reçu" },
              { value: "partiel", label: "Partiel" },
              { value: "annulé", label: "Annulé" },
            ]}
            value={statusFilter}
          />
          <FilterSelect
            label="Source"
            onChange={setSourceFilter}
            options={[
              { value: "all", label: "Toutes" },
              { value: "manuel", label: "Manuel" },
              { value: "textract", label: "Analyse IA" },
            ]}
            value={sourceFilter}
          />
          <FilterInput label="Montant min" onChange={setAmountMin} placeholder="0" type="number" value={amountMin} />
          <FilterInput label="Montant max" onChange={setAmountMax} placeholder="9999" type="number" value={amountMax} />
        </div>
      </Panel>

      <Panel className="mt-4 overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <ShoppingCart className="h-8 w-8 text-[#C9C9C3]" />
            <p className="font-medium text-[#1A1916] text-sm">Aucune facture fournisseur</p>
            <p className="max-w-sm text-[#8A8A85] text-xs">
              Importez une facture ou saisissez un achat fournisseur pour alimenter le stock et les mouvements.
            </p>
          </div>
        ) : (
          <TableShell>
            <table className={`${tableClassName} min-w-[1420px]`}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className="px-4 py-3">Date d'achat</th>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3">N° facture</th>
                  <th className="px-4 py-3">Articles achetés</th>
                  <th className="px-4 py-3">Références</th>
                  <th className="px-4 py-3">Pièces ajoutées</th>
                  <th className="px-4 py-3 text-right">HT</th>
                  <th className="px-4 py-3 text-right">TVA</th>
                  <th className="px-4 py-3 text-right">TTC</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const references = invoiceReferenceList(row.lines);
                  const articles = invoiceArticles(row.lines);
                  const piecesAdded = row.lines.reduce((sum, line) => sum + line.quantityPurchased, 0);
                  return (
                    <tr key={row.invoice.id}>
                      <td className={cn(tableCellClassName, "whitespace-nowrap text-xs text-[#6B6B6B]")}>
                        {isoDate(row.invoice.purchaseDate)}
                      </td>
                      <td className={cn(tableCellClassName, "font-semibold")}>{row.invoice.supplierName}</td>
                      <td className={cn(tableCellClassName, "font-mono text-xs")}>{row.invoice.invoiceNumber}</td>
                      <td className={cn(tableCellClassName, "max-w-[260px] text-xs text-[#1A1916]")}>
                        {articles.slice(0, 3).join(", ")}
                        {articles.length > 3 && <span className="text-[#8A8A85]"> +{articles.length - 3}</span>}
                      </td>
                      <td className={cn(tableCellClassName, "max-w-[230px] text-xs")}>
                        <div className="flex flex-wrap gap-1.5">
                          {references.slice(0, 4).map((reference) => (
                            <PartReferenceLink key={reference} reference={reference} />
                          ))}
                          {references.length > 4 && <span className="text-[#8A8A85]">+{references.length - 4}</span>}
                        </div>
                      </td>
                      <td className={cn(tableCellClassName, "text-xs text-[#6B6B6B]")}>
                        {piecesAdded} unité(s) · {row.movements.length} mouvement(s)
                      </td>
                      <td className={cn(tableCellClassName, "text-right tabular-nums")}>
                        {formatEuro(row.invoice.totalExcludingTax)}
                      </td>
                      <td className={cn(tableCellClassName, "text-right tabular-nums")}>
                        {formatEuro(row.invoice.taxAmount)}
                      </td>
                      <td className={cn(tableCellClassName, "text-right font-semibold tabular-nums")}>
                        {formatEuro(row.invoice.totalIncludingTax)}
                      </td>
                      <td className={tableCellClassName}>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 font-semibold text-[11px]",
                            statusBadge(row.invoice.status),
                          )}
                        >
                          {statusLabels[row.invoice.status]}
                        </span>
                      </td>
                      <td className={tableCellClassName}>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 font-semibold text-[11px]",
                            sourceBadge(row.invoice.source),
                          )}
                        >
                          {sourceLabels[row.invoice.source]}
                        </span>
                      </td>
                      <td className={cn(tableCellClassName, "text-right")}>
                        <button
                          aria-label="Voir détail achat"
                          className="inline-flex items-center gap-1 rounded-full border border-[#E8E8E5] bg-white px-3 py-1.5 font-semibold text-[#1A1916] text-xs hover:border-[#2A9D8F]/45"
                          onClick={() => setDetailId(row.invoice.id)}
                          type="button"
                        >
                          <Eye className="size-3.5" />
                          Voir détail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        )}
      </Panel>

      {purchases.length > 0 && (
        <Panel className="mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#1A1916] text-sm">Anciennes entrées achats</p>
              <p className="text-[#6B6B6B] text-xs">
                Conservées pour compatibilité. Les nouveaux achats fournisseurs passent par les factures ci-dessus.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-full border border-[#E8E8E5] bg-white px-3 py-1.5 font-semibold text-[#6B6B6B] text-xs"
              onClick={() => toast.info("Les anciennes lignes restent disponibles dans l'export interne.")}
              type="button"
            >
              <Trash2 className="size-3.5" />
              {purchases.length} entrée(s)
            </button>
          </div>
        </Panel>
      )}

      {detail && <DetailModal detail={detail} onClose={() => setDetailId(null)} />}
    </PageShell>
  );
}
