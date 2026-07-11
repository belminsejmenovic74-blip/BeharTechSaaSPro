"use client";

import { useMemo, useState } from "react";

import { Download, Eye, FileText, Package, Plus, Search, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";

import {
  formatEuro,
  type Purchase,
  type PurchaseKind,
  type SupplierInvoice,
  type SupplierInvoiceLine,
  type SupplierPurchaseSource,
  type SupplierPurchaseStatus,
  type StockMovement,
  useBeharStore,
} from "@/lib/behar-store";
import { useReconditioningStore } from "@/lib/reconditioning-store";
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

type PeriodPreset = "all" | "today" | "last7days" | "thisMonth" | "lastMonth" | "custom";
type EntryScope = "all" | "supplier" | "direct";

const PERIOD_PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "all", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "last7days", label: "7 derniers jours" },
  { value: "thisMonth", label: "Ce mois" },
  { value: "lastMonth", label: "Mois dernier" },
  { value: "custom", label: "Personnalisée" },
];

function calendarDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchesPeriod(date: string, period: PeriodPreset, start: string, end: string) {
  if (!date) return period === "all";
  if (period === "custom") return (!start || date >= start) && (!end || date <= end);
  if (period === "all") return true;
  const today = new Date();
  const todayKey = calendarDate(today);
  if (period === "today") return date === todayKey;
  if (period === "last7days") {
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - 6);
    return date >= calendarDate(firstDay) && date <= todayKey;
  }
  if (period === "thisMonth") return date.slice(0, 7) === todayKey.slice(0, 7);
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayPreviousMonth = new Date(firstDayThisMonth);
  lastDayPreviousMonth.setDate(0);
  const firstDayPreviousMonth = new Date(lastDayPreviousMonth.getFullYear(), lastDayPreviousMonth.getMonth(), 1);
  return date >= calendarDate(firstDayPreviousMonth) && date <= calendarDate(lastDayPreviousMonth);
}

function isSupplierInvoicePurchase(purchase: Purchase) {
  return [
    Boolean(purchase.supplierInvoiceId),
    Boolean(purchase.supplierInvoiceLineId),
    purchase.source === "Facture fournisseur",
    purchase.source === "Analyse IA",
  ].some(Boolean);
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

function invoiceFileType(invoice: SupplierInvoice) {
  const fileName = invoice.originalFileName?.toLowerCase() ?? "";
  if (fileName.endsWith(".pdf")) return "PDF";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "JPG";
  if (fileName.endsWith(".png")) return "PNG";
  if (invoice.originalFileUrl?.startsWith("data:image/png")) return "PNG";
  if (invoice.originalFileUrl?.startsWith("data:image/jpeg")) return "JPG";
  if (invoice.originalFileUrl?.startsWith("data:application/pdf")) return "PDF";
  return "Document";
}

function downloadOriginalInvoice(invoice: SupplierInvoice) {
  if (!invoice.originalFileUrl) {
    toast.error("Aucun fichier original attaché.");
    return;
  }
  const link = document.createElement("a");
  link.href = invoice.originalFileUrl;
  link.download = invoice.originalFileName ?? `facture-${invoice.invoiceNumber ?? invoice.id}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openOriginalInvoice(invoice: SupplierInvoice) {
  if (!invoice.originalFileUrl) {
    toast.error("Aucun fichier original attaché.");
    return;
  }
  window.open(invoice.originalFileUrl, "_blank", "noopener,noreferrer");
}

function exportLinesCsv(invoice: SupplierInvoice, lines: SupplierInvoiceLine[]) {
  const headers = ["Article", "Référence", "Modèle", "Catégorie", "Quantité", "Prix HT", "TVA", "Total HT"];
  const rows = lines.map((line) => [
    line.itemName,
    line.reference || line.sku || "",
    line.compatibleModel || "",
    line.category || "",
    String(line.quantityPurchased),
    String(line.unitPurchasePriceExclTax).replace(".", ","),
    line.taxRate ? `${line.taxRate}%` : String(line.taxAmount ?? 0).replace(".", ","),
    String(line.lineTotalExclTax).replace(".", ","),
  ]);
  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\n");
  downloadTextFile(`lignes-achat-${invoice.invoiceNumber || invoice.id}.csv`, csv, "text/csv;charset=utf-8");
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportSummaryPdf(invoice: SupplierInvoice, lines: SupplierInvoiceLine[], movements: StockMovement[]) {
  const rows = lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.itemName)}</td>
          <td>${escapeHtml(line.reference || line.sku || "—")}</td>
          <td>${escapeHtml(line.quantityPurchased)}</td>
          <td>${escapeHtml(formatEuro(line.unitPurchasePriceExclTax))}</td>
          <td>${escapeHtml(formatEuro(line.lineTotalExclTax))}</td>
        </tr>`,
    )
    .join("");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Achat ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    body { margin: 0; padding: 28px; background: #FAFAF8; color: #1A1916; font-family: Arial, sans-serif; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 4px 0; color: #6B6B6B; }
    .card { margin-top: 18px; border: 1px solid #E8E8E5; border-radius: 12px; background: #fff; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border-bottom: 1px solid #E8E8E5; padding: 8px; text-align: left; }
    th { color: #6B6B6B; font-weight: 600; }
    .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
    .total { border: 1px solid #E8E8E5; border-radius: 10px; padding: 12px; background: #fff; }
    .total strong { display: block; margin-top: 4px; font-size: 18px; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <h1>Récapitulatif achat fournisseur</h1>
  <p>${escapeHtml(invoice.supplierName)} · ${escapeHtml(invoice.invoiceNumber || "Facture")} · ${escapeHtml(isoDate(invoice.purchaseDate))}</p>
  <div class="totals">
    <div class="total">Total HT<strong>${formatEuro(invoice.totalExcludingTax)}</strong></div>
    <div class="total">TVA<strong>${formatEuro(invoice.taxAmount)}</strong></div>
    <div class="total">Total TTC<strong>${formatEuro(invoice.totalIncludingTax)}</strong></div>
  </div>
  <div class="card">
    <strong>Lignes achetées</strong>
    <table>
      <thead><tr><th>Article</th><th>Référence</th><th>Qté</th><th>Prix HT</th><th>Total HT</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="card">
    <strong>Traçabilité créée</strong>
    <p>${lines.length} ligne(s) d'achat · ${movements.length} mouvement(s) de stock.</p>
  </div>
  <script>window.addEventListener("load", () => window.print());</script>
</body>
</html>`;
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) {
    toast.error("Ouverture du récapitulatif bloquée par le navigateur.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

function movementDisplayKey(movement: StockMovement) {
  return [
    movement.movementType,
    movement.linkedPurchaseId,
    movement.linkedSupplierInvoiceId,
    movement.linkedSupplierInvoiceLineId,
    movement.partReference,
    movement.stockItemId,
    movement.quantityDelta,
    movement.quantityBefore,
    movement.quantityAfter,
  ].join("|");
}

function uniqueMovements(movements: StockMovement[]) {
  const seen = new Set<string>();
  return movements.filter((movement) => {
    const key = movementDisplayKey(movement);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

        <Panel className="mt-5 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-[#1A1916] text-sm">Facture originale</h3>
              {invoice.originalFileName || detail.documentTitle ? (
                <p className="mt-1 text-[#6B6B6B] text-xs">
                  {invoice.originalFileName || detail.documentTitle} · {invoiceFileType(invoice)} · Importée le{" "}
                  {isoDate(invoice.createdAt)}
                </p>
              ) : (
                <p className="mt-1 text-[#6B6B6B] text-xs">Aucun fichier original attaché</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton onClick={() => openOriginalInvoice(invoice)} disabled={!invoice.originalFileUrl}>
                <Eye className="size-4" />
                Voir la facture
              </SecondaryButton>
              <SecondaryButton onClick={() => downloadOriginalInvoice(invoice)} disabled={!invoice.originalFileUrl}>
                <Download className="size-4" />
                Télécharger la facture
              </SecondaryButton>
              <SecondaryButton disabled>
                {invoice.originalFileUrl ? "Remplacer le fichier" : "Ajouter une facture"}
              </SecondaryButton>
            </div>
          </div>
        </Panel>

        <div className="mt-5 flex flex-wrap gap-2">
          <SecondaryButton onClick={() => exportSummaryPdf(invoice, detail.lines, detail.movements)}>
            <FileText className="size-4" />
            Exporter le récapitulatif PDF
          </SecondaryButton>
          <SecondaryButton onClick={() => exportLinesCsv(invoice, detail.lines)}>
            <Download className="size-4" />
            Exporter les lignes CSV
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
      </Panel>
    </div>
  );
}

export function AchatsWorkspace() {
  const purchases = useBeharStore((s) => s.purchases);
  const updatePurchase = useBeharStore((s) => s.updatePurchase);
  const updateReconditioningFile = useReconditioningStore((s) => s.updateFile);
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
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("all");
  const [entryScope, setEntryScope] = useState<EntryScope>("all");
  const [directSourceFilter, setDirectSourceFilter] = useState("all");
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
      movements: uniqueMovements(stockMovements.filter((movement) => movement.linkedSupplierInvoiceId === invoice.id)),
    }));
  }, [stockMovements, supplierInvoiceLines, supplierInvoices]);

  const suppliers = useMemo(() => uniqueValues(invoiceRows.map((row) => row.invoice.supplierName)), [invoiceRows]);
  const standalonePurchases = useMemo(
    () => purchases.filter((purchase) => !isSupplierInvoicePurchase(purchase)),
    [purchases],
  );
  const directSources = useMemo(
    () => uniqueValues(standalonePurchases.map((purchase) => purchase.source)),
    [standalonePurchases],
  );

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
      if (!matchesPeriod(date, periodPreset, dateStart, dateEnd)) return false;
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
    periodPreset,
    referenceSearch,
    search,
    sourceFilter,
    statusFilter,
    supplierFilter,
    supplierSearch,
  ]);

  const filteredDirectPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return standalonePurchases.filter((purchase) => {
      const date = isoDate(purchase.date);
      if (!matchesPeriod(date, periodPreset, dateStart, dateEnd)) return false;
      if (directSourceFilter !== "all" && purchase.source !== directSourceFilter) return false;
      if (!query) return true;
      return [purchase.label, purchase.reference, purchase.invoiceNumber, purchase.supplier, purchase.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [dateEnd, dateStart, directSourceFilter, periodPreset, search, standalonePurchases]);

  const resetFilters = () => {
    setPeriodPreset("all");
    setEntryScope("all");
    setDirectSourceFilter("all");
    setDateStart("");
    setDateEnd("");
    setSupplierSearch("");
    setInvoiceSearch("");
    setReferenceSearch("");
    setSupplierFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setAmountMin("");
    setAmountMax("");
  };

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
      subtitle="Registre interne des factures fournisseur, importations, entrées de stock et reprises de téléphones."
      title="Achats"
    >
      <Panel className="mb-5 p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Search className="size-4 text-[#2A9D8F]" />
              <h2 className="font-semibold text-[#1A1916] text-sm">Filtrer le registre</h2>
            </div>
            <p className="mt-1 text-[#6B6B6B] text-xs">
              Les factures fournisseur et les reprises/achats directs sont séparés pour éviter les doublons.
            </p>
          </div>
          <button
            className="h-9 w-fit rounded-[9px] border border-[#E8E8E5] bg-white px-3 font-semibold text-[#6B6B6B] text-[12px] hover:border-[#2A9D8F]/45 hover:text-[#1A1916]"
            onClick={resetFilters}
            type="button"
          >
            Réinitialiser les filtres
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <FilterSelect
            label="Période"
            onChange={(value) => setPeriodPreset(value as PeriodPreset)}
            options={PERIOD_PRESETS}
            value={periodPreset}
          />
          <FilterSelect
            label="Type d'entrée"
            onChange={(value) => setEntryScope(value as EntryScope)}
            options={[
              { value: "all", label: "Toutes les entrées" },
              { value: "supplier", label: "Factures fournisseur" },
              { value: "direct", label: "Reprises & achats directs" },
            ]}
            value={entryScope}
          />
          {entryScope !== "supplier" && (
            <FilterSelect
              label="Origine directe"
              onChange={setDirectSourceFilter}
              options={[
                { value: "all", label: "Toutes les origines" },
                ...directSources.map((source) => ({ value: source, label: source })),
              ]}
              value={directSourceFilter}
            />
          )}
          {periodPreset === "custom" && (
            <>
              <FilterInput label="Du" onChange={setDateStart} type="date" value={dateStart} />
              <FilterInput label="Au" onChange={setDateEnd} type="date" value={dateEnd} />
            </>
          )}
        </div>
      </Panel>

      {entryScope !== "direct" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi
            label="Achats du mois"
            value={formatEuro(stats.monthTotal)}
            helper="factures fournisseurs"
            icon={ShoppingCart}
          />
          <Kpi label="Factures" value={String(stats.invoiceCount)} helper="historique fournisseur" icon={FileText} />
          <Kpi label="Pièces achetées" value={String(stats.piecesBought)} helper="quantité cumulée" icon={Package} />
          <Kpi
            label="Coût moyen"
            value={formatEuro(stats.averageCost)}
            helper="par pièce achetée"
            icon={ShoppingCart}
          />
          <Kpi label="Fournisseur principal" value={stats.mainSupplier} helper="par montant TTC" icon={Package} />
        </div>
      )}

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

      {entryScope !== "direct" && (
        <>
          <Panel className="mt-5 p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Search className="size-4 text-[#2A9D8F]" />
              <h2 className="font-semibold text-[#1A1916] text-sm">Filtres détaillés des factures fournisseur</h2>
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
              <FilterInput
                label="Montant min"
                onChange={setAmountMin}
                placeholder="0"
                type="number"
                value={amountMin}
              />
              <FilterInput
                label="Montant max"
                onChange={setAmountMax}
                placeholder="9999"
                type="number"
                value={amountMax}
              />
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
                              {references.length > 4 && (
                                <span className="text-[#8A8A85]">+{references.length - 4}</span>
                              )}
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
        </>
      )}

      {entryScope !== "supplier" && (
        <Panel className="mt-4 p-4">
          <div className="mb-3">
            <p className="font-semibold text-[#1A1916] text-sm">Reprises & achats directs</p>
            <p className="text-[#6B6B6B] text-xs">
              Téléphones repris au comptoir, ajoutés en reconditionnement ou entrées stock sans facture fournisseur.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-[#E8E8E5] border-b text-left text-[#6B6B6B] text-xs">
                  <th className="py-2 pr-3 font-semibold">Article</th>
                  <th className="py-2 pr-3 font-semibold">Source</th>
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 text-right font-semibold">Qté</th>
                  <th className="py-2 pr-3 text-right font-semibold">Prix d'achat unitaire</th>
                  <th className="py-2 pr-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredDirectPurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-[#F0F0ED] border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-[#1A1916]">{purchase.label || "—"}</td>
                    <td className="py-2 pr-3 text-[#6B6B6B]">{purchase.source}</td>
                    <td className="py-2 pr-3 text-[#6B6B6B]">
                      {purchase.date ? new Date(purchase.date).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{purchase.quantity}</td>
                    <td className="py-2 pr-3 text-right">
                      {canViewPurchases ? (
                        <input
                          aria-label={`Prix d'achat de ${purchase.label || "l'article"}`}
                          className="w-24 rounded-[8px] border border-[#E8E8E5] px-2 py-1 text-right tabular-nums outline-none focus:border-[#2A9D8F]"
                          min={0}
                          onChange={(event) => {
                            const unitCost = Math.max(0, Number(event.target.value) || 0);
                            updatePurchase(purchase.id, { unitCost });
                            if (purchase.reconditioningFileId) {
                              updateReconditioningFile(purchase.reconditioningFileId, { prixAchat: unitCost });
                            }
                          }}
                          type="number"
                          value={purchase.unitCost || 0}
                        />
                      ) : (
                        <span className="text-[#6B6B6B]">Masqué</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                      {canViewPurchases
                        ? formatEuro(purchase.total ?? (purchase.unitCost || 0) * (purchase.quantity || 1))
                        : "Masqué"}
                    </td>
                  </tr>
                ))}
                {filteredDirectPurchases.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-[#6B6B6B] text-sm" colSpan={6}>
                      Aucune reprise ou entrée directe pour ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {detail && <DetailModal detail={detail} onClose={() => setDetailId(null)} />}
    </PageShell>
  );
}
