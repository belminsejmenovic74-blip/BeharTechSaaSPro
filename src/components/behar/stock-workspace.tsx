"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Battery,
  Boxes,
  Camera,
  ChevronDown,
  Check,
  Copy,
  Download,
  EllipsisVertical,
  FileText,
  Filter,
  History,
  Layers,
  Package,
  Plus,
  Printer,
  ReceiptText,
  ScanQrCode,
  Search,
  SlidersHorizontal,
  Smartphone,
  Tags,
  Trash2,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import {
  type DeviceType,
  formatEuro,
  STOCK_PRODUCT_CATEGORIES,
  type StockItem,
  type StockItemType,
  type StockProductCategory,
  type StockMovementType,
  useBeharStore,
} from "@/lib/behar-store";
import { getPartTraceability } from "@/lib/part-traceability";
import type { PriceBookItem } from "@/lib/price-book";
import { buildScannedPartUrl } from "@/lib/stock-label-url";
import { downloadStockLabelPdf } from "@/lib/stock-label-pdf";
import { getStockLotsForItem } from "@/lib/stock-lots";
import {
  findPriceBookBySelection,
  findStockBySelection,
  getDefaultQualityForCategory,
  getQualitiesForCategory,
  isQualityValidForCategory,
  suggestStockName,
  suggestStockSku,
} from "@/lib/stock-catalog-link";
import { stockPrimaryReference } from "@/lib/stock-reference";
import { cn } from "@/lib/utils";

import { type DeviceCategory, getDeviceBrands, getModelsByBrand } from "../../data/deviceCatalog";
import { PageShell } from "./page-shell";
import { PartReferenceLink } from "./part-reference-link";
import {
  DetailRow,
  Panel,
  PartPlaceholder,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
} from "./primitives";
import { StockImportModal } from "./stock-import-modal";
import { SupplierInvoiceImportModal } from "./supplier-invoice-import-modal";

function findLinkedTariff(item: StockItem, priceBookItems: PriceBookItem[]) {
  return findLinkedTariffs(item, priceBookItems)[0];
}

function comparable(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function categoryMatchesStock(item: StockItem, tariff: PriceBookItem) {
  const stockCategory = comparable(item.categoryName || item.category);
  const tariffCategory = comparable(`${tariff.reparation} ${tariff.piece}`);
  return Boolean(stockCategory && tariffCategory.includes(stockCategory));
}

function modelMatchesStock(item: StockItem, tariff: PriceBookItem) {
  const tariffModel = comparable(tariff.modele);
  return item.compatibleModels.some((model) => comparable(model) === tariffModel);
}

function findLinkedTariffs(item: StockItem, priceBookItems: PriceBookItem[]) {
  const activeItems = priceBookItems.filter((entry) => entry.isActive !== false);
  const sku = comparable(item.sku || item.reference);
  const direct = activeItems.filter(
    (entry) =>
      entry.id === item.priceBookItemId || entry.stockItemId === item.id || (sku && comparable(entry.sku) === sku),
  );
  if (direct.length) return direct;

  const stockBrand = comparable(item.brandName);
  const stockQuality = comparable(item.quality);
  const precise = activeItems.filter(
    (entry) =>
      (!stockBrand || comparable(entry.marque) === stockBrand) &&
      modelMatchesStock(item, entry) &&
      categoryMatchesStock(item, entry) &&
      (!stockQuality || comparable(entry.qualite) === stockQuality),
  );
  if (precise.length) return precise;

  return activeItems.filter((entry) => modelMatchesStock(item, entry) && categoryMatchesStock(item, entry));
}

function priceBookDeviceTypeFromStock(item: StockItem): PriceBookItem["typeAppareil"] {
  if (item.deviceType === "Smartphone") return "smartphone";
  if (item.deviceType === "Tablette") return "tablet";
  if (item.deviceType === "Ordinateur") return "computer";
  if (item.deviceType === "Console") return "console";
  return "other";
}

function tariffPriceLabel(item: StockItem, priceBookItems: PriceBookItem[]) {
  const tariff = findLinkedTariff(item, priceBookItems);
  if (tariff) return formatEuro(tariff.prixVentePiece || tariff.prixClientTotal);
  // §4 — article comptoir (accessoire/consommable) : prix de vente direct.
  if (item.counterSaleEnabled && item.salePrice > 0) return formatEuro(item.salePrice);
  if (item.repairEnabled) return "Pièce atelier";
  return "Prix à définir";
}

function tariffHelperLabel(item: StockItem, priceBookItems: PriceBookItem[]) {
  const tariff = findLinkedTariff(item, priceBookItems);
  if (!tariff) {
    if (item.counterSaleEnabled && item.salePrice > 0) return "Prix de vente comptoir";
    if (item.repairEnabled) return "Non vendu comptoir";
    return "Prix requis avant vente";
  }
  if (tariff.prixClientTotal > 0 && tariff.prixClientTotal !== tariff.prixVentePiece) {
    return `Prestation ${formatEuro(tariff.prixClientTotal)}`;
  }
  return "Lecture seule depuis Tarifs";
}

function productCategoryToItemType(category: StockProductCategory): StockItemType {
  if (category === "Accessoires") return "accessory";
  if (category === "Pièces détachées") return "part";
  return "product";
}

function stockItemKindLabel(item: StockItem) {
  if (item.itemType === "accessory") return "Accessoire comptoir";
  if (item.itemType === "product") return "Produit boutique";
  return "Pièce atelier";
}

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  supplier_purchase_received: "Achat fournisseur",
  manual_adjustment: "Ajustement manuel",
  repair_part_used: "Sortie réparation",
  reconditioning_part_used: "Reconditionnement",
  counter_sale_sold: "Vente comptoir",
  reconditioned_device_sold: "Vente reconditionné",
  reservation_created: "Réservation atelier",
  reservation_released: "Annulation / retour",
  return_to_supplier: "Retour fournisseur",
  stock_transfer_out: "Transfert sortant",
  stock_transfer_in: "Transfert entrant",
  correction: "Correction",
};

function shortDate(value?: string) {
  return value ? value.slice(0, 10) : "—";
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function displayText(value: string | undefined, fallback = "—") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function stockStatusLabel(item: StockItem) {
  if (item.stock === 0) return "Rupture";
  if (item.stock <= item.threshold) return "Stock faible";
  return "En stock";
}

function TracePanel({
  title,
  icon: Icon,
  children,
}: Readonly<{ title: string; icon: LucideIcon; children: ReactNode }>) {
  return (
    <section className="rounded-[12px] border border-[#E8E8E5] bg-white">
      <div className="flex items-center gap-2 border-[#E8E8E5] border-b px-3 py-2.5">
        <Icon className="size-4 text-[#2A9D8F]" />
        <h3 className="font-semibold text-[#1A1916] text-sm">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EmptyLinkedState({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="p-3 text-[#6B6B6B] text-xs">{children}</p>;
}

type StockLabelFormat = "thermal40" | "standard60" | "a4";

const STOCK_LABEL_FORMATS: Record<
  Exclude<StockLabelFormat, "a4">,
  { label: string; widthMm: number; heightMm: number; qrMm: number; paddingMm: number }
> = {
  thermal40: { label: "40 × 25 mm", widthMm: 40, heightMm: 25, qrMm: 11.5, paddingMm: 2.2 },
  standard60: { label: "60 × 30 mm", widthMm: 60, heightMm: 30, qrMm: 17, paddingMm: 2.8 },
};

function stockLabelName(item: StockItem) {
  const name = firstNonEmpty(item.displayName, item.name, item.categoryName, item.category, "Pièce");
  const model = item.compatibleModels.length ? item.compatibleModels.join(" / ") : "";
  if (!model || name.toLowerCase().includes(model.toLowerCase())) return name;
  return `${name} ${model}`;
}

function printElement(element: HTMLElement, title: string) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=760,height=720");
  if (!win) {
    toast.error("Ouverture de l'impression bloquée par le navigateur.");
    return;
  }
  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #FAFAF8; color: #1A1916; font-family: Arial, sans-serif; }
    @page { size: A4; margin: 8mm; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .print-root { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-root">${element.innerHTML}</div>
  <script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
</body>
</html>`);
  win.document.close();
}

function StockLabelCard({
  item,
  qrDataUrl,
  format,
}: Readonly<{ item: StockItem; qrDataUrl: string; format: Exclude<StockLabelFormat, "a4"> }>) {
  const config = STOCK_LABEL_FORMATS[format];
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  const compact = format === "thermal40";
  const style: CSSProperties = {
    width: `${config.widthMm}mm`,
    height: `${config.heightMm}mm`,
    padding: `${config.paddingMm}mm`,
  };

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden border border-[#1A1916] bg-white text-[#1A1916]"
      style={style}
    >
      <div className="flex items-center gap-[1.4mm] font-bold text-[5.5px] leading-none tracking-normal">
        <span>BEHAR</span>
        <span className="size-[1.8mm] rounded-full bg-[#2A9D8F]" />
        <span>TECH</span>
        <span className="rounded-[1.5mm] border border-[#2A9D8F] px-[1mm] py-[0.4mm] font-bold text-[#167B70]">
          PRO
        </span>
      </div>
      <div className="mt-[1.5mm] flex min-h-0 flex-1 gap-[2mm]">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-mono font-black leading-none tracking-normal",
              compact ? "text-[12px]" : "text-[17px]",
            )}
          >
            {reference}
          </p>
          <p
            className={cn(
              "mt-[1.2mm] line-clamp-2 font-semibold leading-tight",
              compact ? "text-[6.5px]" : "text-[8px]",
            )}
          >
            {stockLabelName(item)}
          </p>
          <p className={cn("mt-[1mm] truncate font-mono text-[#6B6B6B]", compact ? "text-[5.7px]" : "text-[7px]")}>
            {displayText(item.internalCode, "Code interne")}
          </p>
        </div>
        <div className="grid shrink-0 place-items-center bg-white" style={{ width: `${config.qrMm}mm` }}>
          {qrDataUrl ? (
            // biome-ignore lint/performance/noImgElement: QR local data URL nécessaire pour impression thermique/PDF.
            <img alt={`QR ${reference}`} className="h-full w-full object-contain" src={qrDataUrl} />
          ) : (
            <span className="text-[#6B6B6B] text-[6px]">QR</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StockLabelPreview({
  item,
  qrDataUrl,
  format,
  copies,
}: Readonly<{ item: StockItem; qrDataUrl: string; format: StockLabelFormat; copies: number }>) {
  if (format !== "a4") {
    return (
      <div className="inline-flex bg-white p-4 shadow-sm">
        <StockLabelCard format={format} item={item} qrDataUrl={qrDataUrl} />
      </div>
    );
  }

  const safeCopies = Math.max(1, Math.min(40, copies));
  return (
    <div
      className="pdf-page grid bg-white shadow-sm"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "8mm",
        gridTemplateColumns: "repeat(3, 60mm)",
        gridAutoRows: "30mm",
        gap: "5mm 4mm",
      }}
    >
      {Array.from({ length: safeCopies }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: copies d'étiquette identiques, sans état ni réordonnancement.
        <StockLabelCard key={index} format="standard60" item={item} qrDataUrl={qrDataUrl} />
      ))}
    </div>
  );
}

function StockLabelPrintModal({
  item,
  qrDataUrl,
  onClose,
}: Readonly<{ item: StockItem; qrDataUrl: string; onClose: () => void }>) {
  const [format, setFormat] = useState<StockLabelFormat>("thermal40");
  const [copies, setCopies] = useState(24);
  const printRef = useRef<HTMLDivElement>(null);
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);

  async function downloadPdf() {
    try {
      downloadStockLabelPdf({
        copies,
        filename: `etiquettes-${reference}.pdf`,
        format,
        item,
        qrDataUrl,
      });
      toast.success("PDF des étiquettes téléchargé.");
    } catch {
      toast.error("Téléchargement PDF impossible.");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#1A1916]/30 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#E8E8E5] bg-[#FAFAF8] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-[#E8E8E5] border-b bg-white px-5 py-4">
          <div>
            <p className="font-semibold text-[#1A1916] text-lg">Étiquette pièce</p>
            <p className="mt-1 text-[#6B6B6B] text-sm">
              Référence, nom court, code interne et QR code. Le détail complet reste dans la fiche pièce.
            </p>
          </div>
          <button
            aria-label="Fermer"
            className="grid size-9 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#FAFAF8]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 md:grid-cols-[260px_1fr]">
          <aside className="space-y-4 rounded-[14px] border border-[#E8E8E5] bg-white p-4">
            <div>
              <p className="font-semibold text-[#1A1916] text-sm">Format</p>
              <div className="mt-3 grid gap-2">
                {(
                  [
                    ["thermal40", "40 × 25 mm thermique"],
                    ["standard60", "60 × 30 mm standard"],
                    ["a4", "Planche A4"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    className={cn(
                      "h-10 rounded-[10px] border px-3 text-left font-semibold text-sm transition",
                      format === value
                        ? "border-[#2A9D8F] bg-[#ECF8F5] text-[#167B70]"
                        : "border-[#E8E8E5] bg-white text-[#1A1916] hover:border-[#2A9D8F]/50",
                    )}
                    key={value}
                    onClick={() => setFormat(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {format === "a4" && (
              <label className="block text-[#6B6B6B] text-xs">
                Nombre d'étiquettes
                <input
                  className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]/60"
                  max={40}
                  min={1}
                  onChange={(event) => setCopies(Number(event.target.value))}
                  type="number"
                  value={copies}
                />
              </label>
            )}
            <div className="rounded-[12px] bg-[#FAFAF8] p-3">
              <p className="font-mono font-semibold text-[#1A1916] text-sm">{reference}</p>
              <p className="mt-1 text-[#6B6B6B] text-xs">{stockLabelName(item)}</p>
              <p className="mt-1 font-mono text-[#6B6B6B] text-xs">{displayText(item.internalCode)}</p>
            </div>
            <div className="grid gap-2">
              <PrimaryButton
                onClick={() => printRef.current && printElement(printRef.current, `Étiquette ${reference}`)}
              >
                <Printer className="size-4" />
                Imprimer
              </PrimaryButton>
              <SecondaryButton onClick={downloadPdf}>
                <Download className="size-4" />
                Télécharger PDF
              </SecondaryButton>
            </div>
          </aside>
          <div className="min-h-0 overflow-auto rounded-[14px] border border-[#E8E8E5] bg-[#F2F2EE] p-5">
            <div ref={printRef} data-pdf-paginate={format === "a4" ? "true" : undefined}>
              <StockLabelPreview copies={copies} format={format} item={item} qrDataUrl={qrDataUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Model selector: type freely or pick from suggestions, adds as chips */
function ModelSelector({
  availableModels,
  selected,
  onChange,
  disabled,
}: Readonly<{
  availableModels: string[];
  selected: string[];
  onChange: (models: string[]) => void;
  disabled?: boolean;
}>) {
  const [input, setInput] = useState("");
  const listId = `models-list-${Math.random().toString(36).slice(2)}`;

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || selected.includes(trimmed)) {
      setInput("");
      return;
    }
    onChange([...selected, trimmed]);
    setInput("");
  };

  const remove = (model: string) => onChange(selected.filter((m) => m !== model));

  return (
    <div className="flex flex-col gap-2">
      {/* Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((model) => (
            <span
              key={model}
              className="inline-flex items-center gap-1 rounded-full bg-[#FFFFFF] px-2.5 py-1 text-[12px] font-medium text-[#147065]"
            >
              {model}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(model)}
                  className="ml-0.5 grid size-3.5 place-items-center rounded-full hover:bg-[#2A9D8F] hover:text-white transition"
                  aria-label={`Retirer ${model}`}
                >
                  <X className="size-2.5" strokeWidth={2.5} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input + datalist */}
      {!disabled && (
        <>
          <datalist id={listId}>
            {availableModels
              .filter((m) => !selected.includes(m))
              .map((m) => (
                <option key={m} value={m} />
              ))}
          </datalist>
          <div className="flex gap-1.5">
            <input
              list={listId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(input);
                }
              }}
              placeholder={availableModels.length > 0 ? "Sélectionner ou saisir…" : "Saisir un modèle…"}
              className="h-9 flex-1 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13px] text-[#1A1916] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
            />
            <button
              type="button"
              onClick={() => add(input)}
              disabled={!input.trim()}
              className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#2A9D8F] transition hover:bg-[#2A9D8F] hover:text-white disabled:opacity-40"
            >
              <Plus className="size-4" strokeWidth={2.2} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type StockStatusFilter = "all" | "in_stock" | "low" | "out";
type StockAvailabilityFilter = "all" | "positive" | "needs_attention";

const stockStatusOptions: Array<{ value: StockStatusFilter; label: string }> = [
  { value: "all", label: "Tous les statuts" },
  { value: "in_stock", label: "En stock" },
  { value: "low", label: "Stock faible" },
  { value: "out", label: "Rupture" },
];

const stockAvailabilityOptions: Array<{ value: StockAvailabilityFilter; label: string }> = [
  { value: "all", label: "Tous les stocks" },
  { value: "positive", label: "Disponible" },
  { value: "needs_attention", label: "À surveiller" },
];

function stockDetailPath(item: StockItem) {
  return `/dashboard/stock/${encodeURIComponent(item.id)}`;
}

function stockSearchText(item: StockItem) {
  return [
    item.name,
    item.displayName,
    item.rawName,
    item.sku,
    item.reference,
    item.internalCode,
    item.categoryName,
    item.category,
    item.quality,
    item.supplier,
    item.primarySupplier,
    item.supplierBrand,
    item.ean,
    ...item.compatibleModels,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function itemMatchesStatus(item: StockItem, status: StockStatusFilter) {
  if (status === "all") return true;
  if (status === "out") return item.stock === 0;
  if (status === "low") return item.stock > 0 && item.stock <= item.threshold;
  return item.stock > item.threshold;
}

function itemMatchesAvailability(item: StockItem, availability: StockAvailabilityFilter) {
  if (availability === "all") return true;
  if (availability === "positive") return item.stock > 0;
  return item.stock === 0 || item.stock <= item.threshold;
}

function stockUnitLabel(quantity: number) {
  return quantity > 1 ? "unités" : "unité";
}

function stockAveragePrice(item: StockItem) {
  return item.averagePurchasePrice ?? item.purchasePrice ?? 0;
}

function stockTotalValue(item: StockItem) {
  return Math.round(stockAveragePrice(item) * item.stock * 100) / 100;
}

function stockCategoryIcon(item: StockItem): LucideIcon {
  const value = comparable(`${item.categoryName} ${item.category} ${item.displayName ?? item.name}`);
  if (value.includes("batterie")) return Battery;
  if (value.includes("camera") || value.includes("lentille")) return Camera;
  if (value.includes("ecran") || value.includes("vitre")) return Smartphone;
  if (value.includes("connecteur") || value.includes("charge")) return Boxes;
  return Package;
}

function StockItemThumbnail({ item }: Readonly<{ item: StockItem }>) {
  const Icon = stockCategoryIcon(item);
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-[12px] border border-[#E8E8E5] bg-[#FAFAF8] text-[#2A9D8F] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <Icon className="size-5" strokeWidth={1.8} />
    </span>
  );
}

function StockQualityBadge({ quality }: Readonly<{ quality?: string }>) {
  if (!quality) return null;
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-[#D7EFEA] bg-[#F2FAF8] px-2.5 font-semibold text-[#167B70] text-[11px]">
      {quality.toLowerCase().includes("qualité") ? quality : `Qualité ${quality}`}
    </span>
  );
}

function PremiumStockKpiCard({
  icon: Icon,
  label,
  value,
  helper,
  warning,
}: Readonly<{ icon: LucideIcon; label: string; value: string; helper: string; warning?: boolean }>) {
  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(26,25,22,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-[12px]",
            warning ? "bg-[#FFF7E8] text-[#B7791F]" : "bg-[#F0F8F6] text-[#2A9D8F]",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 text-right">
          <p className="text-[#6B6B6B] text-[13px]">{label}</p>
          <p className="mt-1 font-semibold text-[#1A1916] text-[30px] leading-none tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-2 text-[#6B6B6B] text-xs">{helper}</p>
        </div>
      </div>
    </section>
  );
}

function StockFilterSelect<T extends string>({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: Readonly<{
  icon?: LucideIcon;
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}>) {
  return (
    <label className="relative block">
      {Icon && (
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-[#6B6B6B]" />
      )}
      <select
        aria-label={label}
        className={cn(
          "h-11 min-w-[170px] appearance-none rounded-[12px] border border-[#E8E8E5] bg-white pr-10 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10",
          Icon ? "pl-10" : "pl-4",
        )}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#6B6B6B]" />
    </label>
  );
}

function StockStatusPill({ item }: Readonly<{ item: StockItem }>) {
  const status = stockStatusLabel(item);
  const warning = status !== "En stock";
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 font-semibold text-xs",
        warning ? "border-[#F2D4D1] bg-[#FFF9F8] text-[#B42318]" : "border-[#D7EFEA] bg-[#F2FAF8] text-[#167B70]",
      )}
    >
      <span className={cn("size-1.5 rounded-full", warning ? "bg-[#B42318]" : "bg-[#2A9D8F]")} />
      {status}
    </span>
  );
}

function StockReferenceButton({ item }: Readonly<{ item: StockItem }>) {
  const router = useRouter();
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  return (
    <button
      className="text-left font-mono font-semibold text-[#167B70] text-sm transition hover:underline"
      onClick={(event) => {
        event.stopPropagation();
        router.push(stockDetailPath(item));
      }}
      type="button"
    >
      {reference}
    </button>
  );
}

export function StockWorkspace() {
  const store = useBeharStore();
  const router = useRouter();
  const resolveStockItemByReference = useBeharStore((state) => state.resolveStockItemByReference);
  const setSelected = useBeharStore((state) => state.setSelected);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<StockAvailabilityFilter>("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referenceParam = params.get("ref");
    if (!referenceParam) return;
    setSearch(referenceParam);
    const match = resolveStockItemByReference(referenceParam);
    if (match) {
      setSelected("stockItem", match.id);
      router.replace(stockDetailPath(match));
    }
  }, [resolveStockItemByReference, router, setSelected]);

  const activeItems = useMemo(() => store.stockItems.filter((item) => item.active !== false), [store.stockItems]);
  const categories = useMemo(
    () =>
      Array.from(
        new Set(activeItems.map((item) => item.categoryName || item.category || "Autre").filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [activeItems],
  );
  const qualities = useMemo(
    () => Array.from(new Set(activeItems.map((item) => item.quality).filter(Boolean) as string[])).sort(),
    [activeItems],
  );
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeItems.filter((item) => {
      const matchesSearch = !q || stockSearchText(item).includes(q);
      const matchesCategory = categoryFilter === "all" || (item.categoryName || item.category) === categoryFilter;
      const matchesQuality = qualityFilter === "all" || item.quality === qualityFilter;
      return (
        matchesSearch &&
        matchesCategory &&
        matchesQuality &&
        itemMatchesStatus(item, statusFilter) &&
        itemMatchesAvailability(item, availabilityFilter)
      );
    });
  }, [activeItems, availabilityFilter, categoryFilter, qualityFilter, search, statusFilter]);

  const canManageStock = store.hasPermission("canManageStock");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const stockValue = activeItems.reduce((total, item) => total + stockTotalValue(item), 0);
  const totalUnits = activeItems.reduce((total, item) => total + item.stock, 0);
  const lowStockCount = activeItems.filter((item) => item.stock > 0 && item.stock <= item.threshold).length;
  const outCount = activeItems.filter((item) => item.stock === 0).length;
  const recentMovementCount = store.stockMovements.slice(0, 30).length;
  const categoryPills = [
    { label: "Toutes les catégories", value: "all", count: activeItems.length, icon: Layers },
    ...categories.map((category) => {
      const sample = activeItems.find((item) => (item.categoryName || item.category) === category);
      return {
        label: category,
        value: category,
        count: activeItems.filter((item) => (item.categoryName || item.category) === category).length,
        icon: sample ? stockCategoryIcon(sample) : Package,
      };
    }),
  ];

  function openItem(item: StockItem) {
    setSelected("stockItem", item.id);
    router.push(stockDetailPath(item));
  }

  function exportStockCsv() {
    const headers = [
      "Nom pièce",
      "SKU",
      "Code interne",
      "Modèle",
      "Catégorie",
      "Qualité",
      "Stock",
      "Prix moyen",
      "Statut",
    ];
    const rows = filteredItems.map((item) => [
      item.displayName || item.name,
      stockPrimaryReference(item),
      item.internalCode || "",
      item.compatibleModels.join(" / "),
      item.categoryName || item.category,
      item.quality || "",
      String(item.stock),
      String(stockAveragePrice(item)).replace(".", ","),
      stockStatusLabel(item),
    ]);
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-behar-tech-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell
      title="Stock"
      subtitle="Pièces, quantités et seuils d'alerte."
      actions={
        <>
          <SecondaryButton className="h-11" onClick={exportStockCsv}>
            <Download className="size-4" />
            Exporter
          </SecondaryButton>
          <SupplierInvoiceImportModal buttonLabel="Import facture" />
          <PrimaryButton className="h-11" onClick={() => setOpen(true)} disabled={!canManageStock}>
            <Plus className="size-4" />
            Nouvelle pièce
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PremiumStockKpiCard
            icon={Package}
            label="Valeur du stock"
            value={canViewPurchasePrice ? formatEuro(stockValue) : "Masqué"}
            helper="au prix moyen d'achat"
          />
          <PremiumStockKpiCard
            icon={Layers}
            label="Références en stock"
            value={String(activeItems.length)}
            helper={`${totalUnits} ${stockUnitLabel(totalUnits)} suivie(s)`}
          />
          <PremiumStockKpiCard
            icon={AlertTriangle}
            label="Stock faible"
            value={String(lowStockCount + outCount)}
            helper={`${outCount} rupture(s), ${lowStockCount} seuil bas`}
            warning={lowStockCount + outCount > 0}
          />
          <PremiumStockKpiCard
            icon={History}
            label="Mouvements récents"
            value={String(recentMovementCount)}
            helper="dernières écritures du ledger"
          />
        </section>

        <Panel className="overflow-hidden rounded-[20px]">
          <div className="flex gap-2 overflow-x-auto border-[#E8E8E5] border-b bg-white px-4 py-3">
            {categoryPills.map(({ label, value, count, icon: Icon }) => (
              <button
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-[12px] border px-3.5 font-semibold text-sm transition",
                  categoryFilter === value
                    ? "border-[#D7EFEA] bg-[#F2FAF8] text-[#167B70]"
                    : "border-transparent bg-white text-[#6B6B6B] hover:border-[#E8E8E5] hover:text-[#1A1916]",
                )}
                key={value}
                onClick={() => setCategoryFilter(value)}
                type="button"
              >
                <Icon className="size-4" />
                {label}
                <span className="rounded-full border border-[#E8E8E5] bg-white px-2 py-0.5 text-[#1A1916] text-xs">
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 border-[#E8E8E5] border-b bg-white px-4 py-4 lg:grid-cols-[minmax(320px,1fr)_auto_auto_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
              <input
                className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white pr-4 pl-10 text-[#1A1916] text-sm outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                placeholder="Rechercher une pièce, référence, SKU ou modèle..."
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <StockFilterSelect
              icon={Filter}
              label="Catégorie"
              value={categoryFilter}
              options={[
                { value: "all", label: "Catégorie" },
                ...categories.map((category) => ({ value: category, label: category })),
              ]}
              onChange={setCategoryFilter}
            />
            <StockFilterSelect
              icon={SlidersHorizontal}
              label="Statut"
              value={statusFilter}
              options={stockStatusOptions}
              onChange={setStatusFilter}
            />
            <StockFilterSelect
              icon={Package}
              label="Stock"
              value={availabilityFilter}
              options={stockAvailabilityOptions}
              onChange={setAvailabilityFilter}
            />
            {qualities.length > 0 && (
              <StockFilterSelect
                label="Qualité"
                value={qualityFilter}
                options={[
                  { value: "all", label: "Toutes les qualités" },
                  ...qualities.map((quality) => ({ value: quality, label: quality })),
                ]}
                onChange={setQualityFilter}
              />
            )}
            <span className="hidden lg:inline-flex">
              <StockImportModal />
            </span>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className={`${tableClassName} min-w-[1060px]`}>
              <thead className="border-[#E8E8E5] border-b bg-[#FAFAF8] text-left font-semibold text-[#6B6B6B] text-xs">
                <tr>
                  <th className="px-5 py-4">Pièce</th>
                  <th className="px-5 py-4">Référence / SKU</th>
                  <th className="px-5 py-4">Modèle compatible</th>
                  <th className="px-5 py-4">Catégorie</th>
                  <th className="px-5 py-4 text-right">Stock disponible</th>
                  {canViewPurchasePrice && <th className="px-5 py-4 text-right">Prix moyen</th>}
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E5]">
                {filteredItems.map((item) => {
                  return (
                    <tr
                      className="group cursor-pointer bg-white transition hover:bg-[#FAFAF8]"
                      key={item.id}
                      onClick={() => openItem(item)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <StockItemThumbnail item={item} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1A1916] text-[15px]">
                              {item.displayName ?? item.name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {item.supplierBrand && (
                                <span className="text-[#6B6B6B] text-xs">{item.supplierBrand}</span>
                              )}
                              <StockQualityBadge quality={item.quality} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <StockReferenceButton item={item} />
                          {item.internalCode && (
                            <span className="font-mono text-[#8A8A85] text-[10.5px]">{item.internalCode}</span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[220px] px-5 py-4 text-[#1A1916] text-sm">
                        {item.compatibleModels.length ? item.compatibleModels.join(" / ") : "Non défini"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#F2FAF8] px-3 text-[#6B6B6B] text-sm">
                          {(() => {
                            const Icon = stockCategoryIcon(item);
                            return <Icon className="size-4 text-[#2A9D8F]" />;
                          })()}
                          {item.categoryName || item.category || "Autre"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        <span className="font-semibold text-[#1A1916] text-lg">{item.stock}</span>
                        <span className="block text-[#6B6B6B] text-xs">{stockUnitLabel(item.stock)}</span>
                      </td>
                      {canViewPurchasePrice && (
                        <td className="px-5 py-4 text-right font-semibold text-[#1A1916] text-sm tabular-nums">
                          {formatEuro(stockAveragePrice(item))}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <StockStatusPill item={item} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Actions ${item.displayName || item.name}`}
                          className="inline-grid size-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-white hover:text-[#1A1916]"
                          onClick={(event) => {
                            event.stopPropagation();
                            openItem(item);
                          }}
                          type="button"
                        >
                          <EllipsisVertical className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="px-5 py-16 text-center">
                <p className="font-semibold text-[#1A1916] text-sm">Aucune pièce trouvée</p>
                <p className="mt-1 text-[#6B6B6B] text-sm">Essayez une autre recherche ou retirez un filtre.</p>
              </div>
            )}
            <div className="flex items-center justify-between border-[#E8E8E5] border-t bg-white px-5 py-4 text-[#6B6B6B] text-sm">
              <span>
                1 à {filteredItems.length} sur {activeItems.length} pièces
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid size-9 place-items-center rounded-[10px] border border-[#E8E8E5] text-[#B7B7B2]"
                  disabled
                  type="button"
                >
                  <ChevronDown className="size-4 rotate-90" />
                </button>
                <span className="grid size-9 place-items-center rounded-[10px] border border-[#E8E8E5] font-semibold text-[#1A1916]">
                  1
                </span>
                <button
                  className="grid size-9 place-items-center rounded-[10px] border border-[#E8E8E5] text-[#B7B7B2]"
                  disabled
                  type="button"
                >
                  <ChevronDown className="size-4 -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {open && <StockModal onClose={() => setOpen(false)} />}
    </PageShell>
  );
}

/** Mobile version — inside a scrollable bottom sheet, no fixed height constraints */
// biome-ignore lint/correctness/noUnusedVariables: ancien détail mobile conservé temporairement pendant la transition vers la fiche dédiée.
function StockDetailMobile({ item, onClose }: Readonly<{ item: StockItem; onClose: () => void }>) {
  const store = useBeharStore();
  const router = useRouter();
  const [targetRepairId, setTargetRepairId] = useState(store.selectedRepairId || "");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [labelOpen, setLabelOpen] = useState(false);
  const canManageStock = store.hasPermission("canManageStock");
  const canUseStockItem = store.hasPermission("canUseStockItem");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const linkedTariffs = findLinkedTariffs(item, store.priceBookItems);
  const tariff = linkedTariffs[0];
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  const trace = useMemo(() => getPartTraceability(store, reference), [store, reference]);
  const categoryMapping: Record<string, DeviceCategory> = {
    Smartphone: "smartphone",
    Tablette: "tablet",
    Ordinateur: "computer",
    Console: "console",
  };
  const category = categoryMapping[item.deviceType] || "smartphone";
  const availableBrands = getDeviceBrands(category);
  const availableModels = getModelsByBrand(item.brandName ?? "", category);
  const availableCategories = store.partCategories.filter((cat) => cat.deviceTypes.includes(item.deviceType));

  const inputClass =
    "h-10 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-right text-[15px] text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const textInputClass =
    "h-10 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[15px] text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const rowClass = "flex items-start justify-between gap-3 py-3 border-b border-[#FFFFFF] last:border-0";
  const labelClass = "shrink-0 w-[110px] text-[#6B6B6B] text-[13px] pt-2.5 font-medium";
  const createTariffFromItem = () => {
    const purchasePrice = item.averagePurchasePrice ?? item.lastPurchasePrice ?? item.purchasePrice;
    const salePrice = item.salePrice > 0 ? item.salePrice : Math.round(purchasePrice * 1.8 * 100) / 100;
    const id = store.addPriceBookItem({
      source: "manual",
      typeAppareil: priceBookDeviceTypeFromStock(item),
      marque: firstNonEmpty(item.brandName, "Apple"),
      modele: firstNonEmpty(item.compatibleModels[0], "Modèle à compléter"),
      reparation: firstNonEmpty(item.categoryName, item.category, "Réparation"),
      piece: firstNonEmpty(item.displayName, item.name),
      qualite: firstNonEmpty(item.quality, "Standard"),
      sku: firstNonEmpty(item.sku, item.reference),
      prixAchat: purchasePrice,
      mainOeuvre: 0,
      prixVentePiece: salePrice,
      prixClientTotal: salePrice,
      marge: Math.max(0, salePrice - purchasePrice),
      fournisseur: firstNonEmpty(item.primarySupplier, item.supplier),
      stockDisponible: item.stock,
      stockItemId: item.id,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    store.updateStockItem(item.id, { priceBookItemId: id });
    toast.success("Tarif créé depuis cette pièce.");
    router.push("/dashboard/parametres/catalogue");
    onClose();
  };

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(buildScannedPartUrl(reference), {
      margin: 1,
      width: 148,
      color: { dark: "#1A1916", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="px-4 pb-10 pt-3">
      <StatusBadge
        className="mb-3"
        status={item.stock === 0 ? "Rupture" : item.stock <= item.threshold ? "Stock faible" : "En stock"}
      />
      {item.stock <= item.threshold && (
        <p className="mb-3 rounded-[12px] bg-[#FFFFFF] px-3 py-2 text-[#6B6B6B] text-sm">
          Alerte stock bas : réapprovisionnement conseillé.
        </p>
      )}

      <PartPlaceholder className="h-36 rounded-[16px] mb-4" />
      <div className="mb-4 grid grid-cols-[1fr_116px] gap-3">
        <div className="rounded-[16px] border border-[#FFFFFF] bg-[#FFFFFF] p-4">
          <p className="text-[#6B6B6B] text-[11px] font-semibold uppercase tracking-[0.12em]">Référence centrale</p>
          <p className="mt-2 font-mono font-semibold text-[#1A1916] text-sm">
            <PartReferenceLink reference={reference} />
          </p>
          <p className="mt-1 font-mono text-[#8A8A85] text-[11px]">
            {displayText(item.internalCode, "Code interne à compléter")}
          </p>
        </div>
        <div className="rounded-[16px] border border-[#FFFFFF] bg-[#FFFFFF] p-2 text-center">
          {qrDataUrl ? (
            // biome-ignore lint/performance/noImgElement: QR généré localement en data URL pour impression d'étiquette.
            <img alt={`QR ${reference}`} className="mx-auto size-[88px]" src={qrDataUrl} />
          ) : (
            <div className="mx-auto grid size-[88px] place-items-center rounded-[8px] bg-[#FAFAF8] text-[#6B6B6B] text-xs">
              QR
            </div>
          )}
          <p className="mt-1 text-[#6B6B6B] text-[10px]">Étiquette</p>
        </div>
      </div>

      {/* Fields */}
      <div className="rounded-[16px] border border-[#FFFFFF] bg-[#FFFFFF] px-4 divide-y divide-[#FFFFFF] mb-4">
        <div className={rowClass}>
          <span className={labelClass}>Référence</span>
          <input
            className={textInputClass}
            value={item.sku}
            readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { sku: e.target.value })}
          />
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Type</span>
          <select
            className={textInputClass}
            value={item.deviceType}
            disabled={!canManageStock}
            onChange={(e) =>
              store.updateStockItem(item.id, {
                deviceType: e.target.value as StockItem["deviceType"],
                brandId: undefined,
                brandName: undefined,
                modelIds: [],
                compatibleModels: [],
              })
            }
          >
            {["Smartphone", "Tablette", "Ordinateur", "Console"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Marque</span>
          <select
            className={textInputClass}
            value={item.brandName ?? ""}
            disabled={!canManageStock}
            onChange={(e) =>
              store.updateStockItem(item.id, {
                brandId: e.target.value,
                brandName: e.target.value,
                modelIds: [],
                compatibleModels: [],
              })
            }
          >
            <option value="">Générique</option>
            {availableBrands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b.brand}
              </option>
            ))}
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Modèles</span>
          <div className="flex-1">
            <ModelSelector
              availableModels={availableModels}
              selected={item.compatibleModels}
              disabled={!canManageStock}
              onChange={(models) => store.updateStockItem(item.id, { modelIds: models, compatibleModels: models })}
            />
          </div>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Catégorie</span>
          <select
            className={textInputClass}
            value={item.categoryId}
            disabled={!canManageStock}
            onChange={(e) => {
              const cat = store.partCategories.find((c) => c.id === e.target.value);
              store.updateStockItem(item.id, { categoryId: cat?.id, categoryName: cat?.name });
            }}
          >
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Type de produit</span>
          <select
            className={textInputClass}
            value={item.productCategory ?? "Pièces détachées"}
            disabled={!canManageStock}
            onChange={(e) => {
              const productCategory = e.target.value as StockProductCategory;
              const itemType = productCategoryToItemType(productCategory);
              const counterSaleEnabled = itemType !== "part";
              store.updateStockItem(item.id, {
                productCategory,
                itemType,
                repairEnabled: itemType === "part",
                counterSaleEnabled,
                counterVisible: counterSaleEnabled,
              });
            }}
          >
            {STOCK_PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Vente comptoir</span>
          <button
            className={cn(
              "flex flex-1 items-center justify-between rounded-[12px] border px-3 py-2 text-left text-sm transition",
              item.counterSaleEnabled
                ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70]"
                : "border-[#E8E8E5] bg-white text-[#6B6B6B]",
              !canManageStock && "cursor-not-allowed opacity-60",
            )}
            disabled={!canManageStock}
            onClick={() => {
              const counterSaleEnabled = !item.counterSaleEnabled;
              store.updateStockItem(item.id, { counterSaleEnabled, counterVisible: counterSaleEnabled });
            }}
            type="button"
          >
            <span>{item.counterSaleEnabled ? "Visible en vente comptoir" : "Masqué en vente comptoir"}</span>
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border transition",
                item.counterSaleEnabled
                  ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                  : "border-[#C4C2BB] text-transparent",
              )}
            >
              <Check className="size-3.5" />
            </span>
          </button>
        </div>
        {canViewPurchasePrice && (
          <div className={rowClass}>
            <span className={labelClass}>Prix d'achat</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              value={item.purchasePrice}
              readOnly={!canManageStock}
              onChange={(e) => store.updateStockItem(item.id, { purchasePrice: Math.max(0, Number(e.target.value)) })}
            />
          </div>
        )}
        <div className={rowClass}>
          <span className={labelClass}>Prix client</span>
          <div className="flex-1 rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 text-right">
            <p className={cn("text-[15px] font-semibold", tariff ? "text-[#1A1916]" : "text-[#6B6B6B]")}>
              {tariffPriceLabel(item, store.priceBookItems)}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[#167B70]">
              {tariffHelperLabel(item, store.priceBookItems)}
            </p>
          </div>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Stock actuel</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={item.quantity}
            readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { quantity: Math.max(0, Number(e.target.value)) })}
          />
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Seuil d'alerte</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={item.threshold}
            readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { threshold: Math.max(0, Number(e.target.value)) })}
          />
        </div>
        {canViewSupplier && (
          <div className={rowClass}>
            <span className={labelClass}>Fournisseur</span>
            <input
              className={textInputClass}
              value={item.supplier}
              readOnly={!canManageStock}
              onChange={(e) => store.updateStockItem(item.id, { supplier: e.target.value })}
            />
          </div>
        )}
        <div className={rowClass}>
          <span className={labelClass}>Délai moyen</span>
          <input
            className={textInputClass}
            value={item.leadTime}
            readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { leadTime: e.target.value })}
          />
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="rounded-[16px] border border-[#FFFFFF] bg-[#FFFFFF] p-4">
          <h3 className="font-semibold text-[#1A1916] text-sm">Traçabilité liée</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Entrées", String(trace.supplierInvoiceLines.length || trace.purchases.length)],
              ["Sorties", String(trace.repairUsages.length)],
              ["Mouvements", String(trace.movements.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[12px] bg-[#FAFAF8] px-3 py-2">
                <p className="text-[#6B6B6B] text-[10px]">{label}</p>
                <p className="mt-0.5 font-semibold text-[#1A1916] text-sm">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {trace.movements.slice(0, 4).map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between rounded-[12px] border border-[#E8E8E5] px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-[#1A1916] text-xs">{MOVEMENT_LABELS[movement.movementType]}</p>
                  <p className="text-[#6B6B6B] text-[11px]">{shortDate(movement.createdAt)}</p>
                </div>
                <p
                  className={cn(
                    "font-semibold text-sm tabular-nums",
                    movement.quantityDelta < 0 ? "text-[#B42318]" : "text-[#167B70]",
                  )}
                >
                  {movement.quantityDelta > 0 ? "+" : ""}
                  {movement.quantityDelta}
                </p>
              </div>
            ))}
            {!trace.movements.length && <p className="text-[#6B6B6B] text-xs">Aucun mouvement relié.</p>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton
            className="h-11 w-full"
            disabled={!canManageStock}
            onClick={() => {
              const delta = Number(window.prompt("Ajustement stock (+ ou -)", "1") || 0);
              if (!Number.isFinite(delta) || delta === 0) {
                toast.error("Ajustement invalide");
                return;
              }
              store.adjustStock(item.id, delta, "Ajustement depuis fiche pièce");
              toast.success("Ajustement stock enregistré");
            }}
          >
            Ajuster
          </SecondaryButton>
          <SecondaryButton className="h-11 w-full" onClick={() => setLabelOpen(true)}>
            <Printer className="size-4" />
            Imprimer
          </SecondaryButton>
        </div>
        <PrimaryButton
          className="h-12 w-full text-[15px]"
          disabled={!canManageStock}
          onClick={() => {
            const qty = Number(window.prompt("Quantité à ajouter au stock", "5") || 0);
            if (!Number.isFinite(qty) || qty <= 0) {
              toast.error("Quantité invalide");
              return;
            }
            store.restockItem(item.id, qty);
            toast.success("Stock mis à jour");
          }}
        >
          Réapprovisionner
        </PrimaryButton>
        <select
          className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[15px] text-[#1A1916] outline-none"
          disabled={store.repairs.length === 0}
          value={targetRepairId}
          onChange={(e) => setTargetRepairId(e.target.value)}
        >
          <option value="">Sélectionnez une réparation</option>
          {store.repairs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.number} - {r.device} ({r.status})
            </option>
          ))}
        </select>
        <SecondaryButton
          className="h-11 w-full"
          disabled={store.repairs.length === 0 || !canUseStockItem}
          onClick={() => {
            const repair = store.repairs.find((r) => r.id === targetRepairId);
            if (!repair) {
              toast.error("Sélectionnez une réparation.");
              return;
            }
            if (!window.confirm(`Utiliser 1 x ${item.name} sur ${repair.number} ?`)) return;
            const ok = store.addPartToRepair(repair.id, item.id, 1);
            toast[ok ? "success" : "error"](ok ? `Pièce ajoutée à ${repair.device}` : `Stock insuffisant`);
          }}
        >
          Utiliser dans une réparation
        </SecondaryButton>
        <div className="rounded-[16px] border border-[#FFFFFF] bg-[#FFFFFF] p-4">
          <h3 className="font-semibold text-[#1A1916] text-sm">Tarifs liés</h3>
          {linkedTariffs.length ? (
            <div className="mt-3 space-y-2">
              {linkedTariffs.slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-[12px] bg-[#FAFAF8] px-3 py-2">
                  <p className="font-medium text-[#1A1916] text-xs">
                    {entry.modele} · {entry.reparation}
                  </p>
                  <p className="mt-0.5 text-[#6B6B6B] text-xs">
                    Prix client {formatEuro(entry.prixClientTotal)} · Marge {formatEuro(entry.marge)}
                  </p>
                </div>
              ))}
              <SecondaryButton
                className="h-11 w-full"
                onClick={() => {
                  router.push("/dashboard/parametres/catalogue");
                  onClose();
                }}
              >
                Voir dans Catalogue Prix
              </SecondaryButton>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-[#6B6B6B] text-xs">Aucun tarif client lié pour cette pièce.</p>
              <SecondaryButton className="mt-3 h-11 w-full" onClick={createTariffFromItem}>
                Créer un tarif depuis cette pièce
              </SecondaryButton>
            </div>
          )}
        </div>
        <SecondaryButton
          className="h-11 w-full text-[#B42318]"
          disabled={!canManageStock}
          onClick={() => {
            if (window.confirm("Supprimer cette pièce ?")) {
              store.deleteStockItem(item.id);
              toast.success("Pièce supprimée");
              onClose();
            }
          }}
        >
          <Trash2 className="size-4" />
          Supprimer la pièce
        </SecondaryButton>
      </div>
      {labelOpen && <StockLabelPrintModal item={item} qrDataUrl={qrDataUrl} onClose={() => setLabelOpen(false)} />}
    </div>
  );
}

// biome-ignore lint/correctness/noUnusedVariables: ancien panneau latéral conservé temporairement pendant la transition vers la fiche dédiée.
function StockDetail({ item }: Readonly<{ item: StockItem }>) {
  const store = useBeharStore();
  const router = useRouter();
  const [targetRepairId, setTargetRepairId] = useState(store.selectedRepairId || "");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const canManageStock = store.hasPermission("canManageStock");
  const canUseStockItem = store.hasPermission("canUseStockItem");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const linkedTariffs = findLinkedTariffs(item, store.priceBookItems);
  const tariff = linkedTariffs[0];
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  const trace = useMemo(() => getPartTraceability(store, reference), [store, reference]);
  const stockLots = useMemo(() => getStockLotsForItem(store, item), [store, item]);
  const entries = stockLots.map((lot) => ({
    id: lot.id,
    date: lot.purchaseDate || lot.createdAt,
    supplier: lot.supplierName,
    invoiceNumber: lot.invoiceNumber,
    invoiceUrl: lot.invoiceUrl,
    purchaseId: lot.purchaseId,
    quantity: lot.quantityPurchased,
    remainingQuantity: lot.quantityRemaining,
    unitCost: lot.unitCost,
    supplierInvoiceId: lot.supplierInvoiceId,
  }));
  const categoryMapping: Record<string, DeviceCategory> = {
    Smartphone: "smartphone",
    Tablette: "tablet",
    Ordinateur: "computer",
    Console: "console",
  };
  const category = categoryMapping[item.deviceType] || "smartphone";
  const availableBrands = getDeviceBrands(category);
  const availableModels = getModelsByBrand(item.brandName ?? "", category);
  const availableCategories = store.partCategories.filter((cat) => cat.deviceTypes.includes(item.deviceType));

  const inputClass =
    "h-9 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-right text-sm text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const textInputClass =
    "h-9 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-sm text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const createTariffFromItem = () => {
    const purchasePrice = item.averagePurchasePrice ?? item.lastPurchasePrice ?? item.purchasePrice;
    const salePrice = item.salePrice > 0 ? item.salePrice : Math.round(purchasePrice * 1.8 * 100) / 100;
    const id = store.addPriceBookItem({
      source: "manual",
      typeAppareil: priceBookDeviceTypeFromStock(item),
      marque: firstNonEmpty(item.brandName, "Apple"),
      modele: firstNonEmpty(item.compatibleModels[0], "Modèle à compléter"),
      reparation: firstNonEmpty(item.categoryName, item.category, "Réparation"),
      piece: firstNonEmpty(item.displayName, item.name),
      qualite: firstNonEmpty(item.quality, "Standard"),
      sku: firstNonEmpty(item.sku, item.reference),
      prixAchat: purchasePrice,
      mainOeuvre: 0,
      prixVentePiece: salePrice,
      prixClientTotal: salePrice,
      marge: Math.max(0, salePrice - purchasePrice),
      fournisseur: firstNonEmpty(item.primarySupplier, item.supplier),
      stockDisponible: item.stock,
      stockItemId: item.id,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    store.updateStockItem(item.id, { priceBookItemId: id });
    toast.success("Tarif créé depuis cette pièce.");
    router.push("/dashboard/parametres/catalogue");
  };

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(buildScannedPartUrl(reference), {
      margin: 1,
      width: 164,
      color: { dark: "#1A1916", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <Panel className="overflow-y-auto rounded-[14px] p-4 md:max-h-[calc(100vh-11rem)]">
      <div className="mb-4">
        <h2 className="font-semibold text-[#1A1916] text-xl leading-tight tracking-tight">
          {item.displayName ?? item.name}
        </h2>
        <StatusBadge className="mt-3" status={stockStatusLabel(item)} />
        {item.stock <= item.threshold && (
          <p className="mt-2 rounded-[10px] bg-[#FFFFFF] px-3 py-2 text-[#6B6B6B] text-sm">
            Alerte stock bas : réapprovisionnement conseillé.
          </p>
        )}
      </div>
      <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.03)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[#6B6B6B] text-[11px] font-semibold uppercase tracking-[0.12em]">Pièce atelier</p>
            <p className="mt-1 truncate font-semibold text-[#1A1916] text-sm">{stockLabelName(item)}</p>
            <p className="mt-1 text-[#6B6B6B] text-xs">
              {item.compatibleModels.length ? item.compatibleModels.join(" / ") : "Modèle à compléter"}
            </p>
          </div>
          <span className="rounded-full border border-[#D6EFEB] bg-[#F2FAF8] px-3 py-1 font-semibold text-[#167B70] text-xs">
            {entries.length || 1} lot(s)
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Stock", String(item.stock)],
            ["Réservé", String(Math.max(0, entries.reduce((sum, entry) => sum + entry.quantity, 0) - item.stock))],
            ["Factures", String(new Set(entries.map((entry) => entry.invoiceNumber).filter(Boolean)).size || 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[10px] bg-[#FAFAF8] px-3 py-2 text-center">
              <p className="text-[#6B6B6B] text-[10.5px]">{label}</p>
              <p className="mt-1 font-semibold text-[#1A1916] text-sm tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_132px]">
        <div className="rounded-[12px] border border-[#E8E8E5] bg-white p-3">
          <p className="text-[#6B6B6B] text-xs font-semibold uppercase tracking-[0.12em]">Référence centrale</p>
          <p className="mt-2 font-mono font-semibold text-[#1A1916] text-sm">
            <PartReferenceLink reference={reference} />
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["Code interne", displayText(item.internalCode)],
              ["Qualité", displayText(item.quality)],
              ["Prix moyen", formatEuro(item.averagePurchasePrice ?? item.purchasePrice ?? 0)],
              ["Dernier prix", formatEuro(item.lastPurchasePrice ?? item.purchasePrice ?? 0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[10px] bg-[#FAFAF8] px-2.5 py-2">
                <p className="text-[#6B6B6B] text-[10.5px]">{label}</p>
                <p className="mt-0.5 truncate font-semibold text-[#1A1916] text-xs">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[12px] border border-[#E8E8E5] bg-white p-3 text-center">
          {qrDataUrl ? (
            // biome-ignore lint/performance/noImgElement: QR généré localement en data URL pour impression d'étiquette.
            <img alt={`QR ${reference}`} className="mx-auto size-[104px]" src={qrDataUrl} />
          ) : (
            <div className="mx-auto grid size-[104px] place-items-center rounded-[8px] bg-[#FAFAF8] text-[#6B6B6B] text-xs">
              QR
            </div>
          )}
          <p className="mt-2 font-mono text-[#6B6B6B] text-[10px]">{reference}</p>
        </div>
      </div>
      <div className="mt-4 rounded-[12px] border border-[#E8E8E5] bg-white p-3">
        <dl className="grid gap-2">
          {[
            ["Modèle", item.compatibleModels.length ? item.compatibleModels.join(" / ") : "Non défini"],
            ["Catégorie", item.categoryName || item.category || "Non défini"],
            ["Qualité", displayText(item.quality)],
            ["Stock actuel", String(item.stock)],
            [
              "Prix moyen",
              canViewPurchasePrice ? formatEuro(item.averagePurchasePrice ?? item.purchasePrice ?? 0) : "Masqué",
            ],
            ["Fournisseur", canViewSupplier ? displayText(item.primarySupplier ?? item.supplier) : "Masqué"],
            ["Dernière facture", displayText(item.originSupplierInvoiceNumber)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3 py-1.5">
              <dt className="text-[#6B6B6B] text-xs">{label}</dt>
              <dd className="min-w-0 text-right font-medium text-[#1A1916] text-xs">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PartReferenceLink
            reference={reference}
            className="h-9 justify-center rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-center font-sans text-[#1A1916] text-xs no-underline hover:border-[#2A9D8F]/50 hover:no-underline"
          >
            Voir fiche complète
          </PartReferenceLink>
          <SecondaryButton className="h-9 w-full text-xs" onClick={() => setLabelOpen(true)}>
            <Printer className="size-3.5" />
            Imprimer étiquette
          </SecondaryButton>
        </div>
      </div>
      <button
        className="mt-4 flex h-10 w-full items-center justify-between rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-left font-semibold text-[#1A1916] text-xs transition hover:border-[#2A9D8F]/45"
        onClick={() => setAdvancedOpen((value) => !value)}
        type="button"
      >
        <span>Paramètres avancés</span>
        <span className="text-[#6B6B6B]">{advancedOpen ? "Masquer" : "Afficher"}</span>
      </button>
      {advancedOpen && (
        <dl className="mt-3 divide-y divide-[#E8E8E5] rounded-[12px] border border-[#E8E8E5] bg-white px-3">
          <DetailRow
            className="py-2"
            label="Nom court"
            value={
              <input
                className={textInputClass}
                onChange={(event) =>
                  store.updateStockItem(item.id, { name: event.target.value, displayName: event.target.value })
                }
                readOnly={!canManageStock}
                value={item.displayName ?? item.name}
              />
            }
          />
          <DetailRow
            className="py-2"
            label="Référence"
            value={
              <input
                className={textInputClass}
                onChange={(event) => store.updateStockItem(item.id, { sku: event.target.value })}
                readOnly={!canManageStock}
                value={item.sku}
              />
            }
          />
          <DetailRow
            className="py-2"
            label="Type"
            value={
              <select
                className={textInputClass}
                onChange={(event) =>
                  store.updateStockItem(item.id, {
                    deviceType: event.target.value as StockItem["deviceType"],
                    brandId: undefined,
                    brandName: undefined,
                    modelIds: [],
                    compatibleModels: [],
                  })
                }
                disabled={!canManageStock}
                value={item.deviceType}
              >
                {["Smartphone", "Tablette", "Ordinateur", "Console"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            }
          />
          <DetailRow
            className="py-2"
            label="Marque"
            value={
              <select
                className={textInputClass}
                onChange={(event) => {
                  store.updateStockItem(item.id, {
                    brandId: event.target.value,
                    brandName: event.target.value,
                    modelIds: [],
                    compatibleModels: [],
                  });
                }}
                disabled={!canManageStock}
                value={item.brandName ?? ""}
              >
                <option value="">Générique</option>
                {availableBrands.map((b) => (
                  <option key={b.brand} value={b.brand}>
                    {b.brand}
                  </option>
                ))}
                <option value="Autre">Autre</option>
              </select>
            }
          />
          <DetailRow
            className="py-2"
            label="Modèles"
            value={
              <ModelSelector
                availableModels={availableModels}
                selected={item.compatibleModels}
                disabled={!canManageStock}
                onChange={(models) => store.updateStockItem(item.id, { modelIds: models, compatibleModels: models })}
              />
            }
          />
          <DetailRow
            className="py-2"
            label="Catégorie"
            value={
              <select
                className={textInputClass}
                onChange={(event) => {
                  const category = store.partCategories.find((entry) => entry.id === event.target.value);
                  store.updateStockItem(item.id, { categoryId: category?.id, categoryName: category?.name });
                }}
                disabled={!canManageStock}
                value={item.categoryId}
              >
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            }
          />
          <DetailRow
            className="py-2"
            label="Type de produit"
            value={
              <select
                className={textInputClass}
                disabled={!canManageStock}
                onChange={(event) => {
                  const productCategory = event.target.value as StockProductCategory;
                  const itemType = productCategoryToItemType(productCategory);
                  const counterSaleEnabled = itemType !== "part";
                  store.updateStockItem(item.id, {
                    productCategory,
                    itemType,
                    repairEnabled: itemType === "part",
                    counterSaleEnabled,
                    counterVisible: counterSaleEnabled,
                  });
                }}
                value={item.productCategory ?? "Pièces détachées"}
              >
                {STOCK_PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            }
          />
          <DetailRow
            className="py-2"
            label="Vente comptoir"
            value={
              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-[12px] border px-3 py-2 text-left text-sm transition",
                  item.counterSaleEnabled
                    ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70]"
                    : "border-[#E8E8E5] bg-white text-[#6B6B6B]",
                  !canManageStock && "cursor-not-allowed opacity-60",
                )}
                disabled={!canManageStock}
                onClick={() => {
                  const counterSaleEnabled = !item.counterSaleEnabled;
                  store.updateStockItem(item.id, { counterSaleEnabled, counterVisible: counterSaleEnabled });
                }}
                type="button"
              >
                <span>{item.counterSaleEnabled ? "Visible" : "Masqué"}</span>
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border transition",
                    item.counterSaleEnabled
                      ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                      : "border-[#C4C2BB] text-transparent",
                  )}
                >
                  <Check className="size-3.5" />
                </span>
              </button>
            }
          />
          {canViewPurchasePrice && (
            <DetailRow
              className="py-2"
              label="Prix d'achat"
              value={
                <input
                  className={inputClass}
                  min={0}
                  onChange={(event) =>
                    store.updateStockItem(item.id, { purchasePrice: Math.max(0, Number(event.target.value)) })
                  }
                  readOnly={!canManageStock}
                  step="0.01"
                  type="number"
                  value={item.purchasePrice}
                />
              }
            />
          )}
          <DetailRow
            className="py-2"
            label="Prix client"
            value={
              <div className="rounded-[10px] border border-[#E8E8E5] bg-white px-3 py-2 text-right">
                <p className={cn("text-sm font-semibold", tariff ? "text-[#1A1916]" : "text-[#6B6B6B]")}>
                  {tariffPriceLabel(item, store.priceBookItems)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#167B70]">
                  {tariffHelperLabel(item, store.priceBookItems)}
                </p>
              </div>
            }
          />
          <DetailRow
            className="py-2"
            label="Stock actuel"
            value={
              <input
                className={inputClass}
                min={0}
                onChange={(event) =>
                  store.updateStockItem(item.id, { quantity: Math.max(0, Number(event.target.value)) })
                }
                readOnly={!canManageStock}
                type="number"
                value={item.quantity}
              />
            }
          />
          <DetailRow
            className="py-2"
            label="Seuil d'alerte"
            value={
              <input
                className={inputClass}
                min={0}
                onChange={(event) =>
                  store.updateStockItem(item.id, { threshold: Math.max(0, Number(event.target.value)) })
                }
                readOnly={!canManageStock}
                type="number"
                value={item.threshold}
              />
            }
          />
          {canViewSupplier && (
            <DetailRow
              className="py-2"
              label="Fournisseur"
              value={
                <input
                  className={textInputClass}
                  onChange={(event) => store.updateStockItem(item.id, { supplier: event.target.value })}
                  readOnly={!canManageStock}
                  value={item.supplier}
                />
              }
            />
          )}
          <DetailRow
            className="py-2"
            label="Délai moyen"
            value={
              <input
                className={textInputClass}
                onChange={(event) => store.updateStockItem(item.id, { leadTime: event.target.value })}
                readOnly={!canManageStock}
                value={item.leadTime}
              />
            }
          />
        </dl>
      )}
      <div className="mt-4 space-y-4 border-[#E8E8E5] border-t pt-4">
        <TracePanel title="Tarifs liés" icon={Tags}>
          {linkedTariffs.length ? (
            <div className="space-y-2 p-3">
              {linkedTariffs.map((entry) => (
                <div key={entry.id} className="rounded-[10px] border border-[#E8E8E5] bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1A1916] text-xs">
                        {entry.modele} · {entry.reparation}
                      </p>
                      <p className="mt-0.5 text-[#6B6B6B] text-[11px]">
                        {entry.piece} · {entry.qualite || "Qualité standard"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1A1916] text-xs">{formatEuro(entry.prixClientTotal)}</p>
                      <p className="text-[#167B70] text-[11px]">Marge {formatEuro(entry.marge)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <SecondaryButton
                className="h-9 w-full text-xs"
                onClick={() => router.push("/dashboard/parametres/catalogue")}
              >
                Voir dans Catalogue Prix
              </SecondaryButton>
            </div>
          ) : (
            <div className="p-3">
              <p className="text-[#6B6B6B] text-xs">Aucun tarif client lié pour cette pièce.</p>
              <SecondaryButton className="mt-3 h-9 w-full text-xs" onClick={createTariffFromItem}>
                Créer un tarif depuis cette pièce
              </SecondaryButton>
            </div>
          )}
        </TracePanel>
        <TracePanel title="Données fournisseur" icon={Package}>
          <dl className="divide-y divide-[#E8E8E5] px-3 py-1">
            {[
              ["Nom brut fournisseur", displayText(item.rawName)],
              ["EAN", displayText(item.ean)],
              ["Garantie fournisseur", displayText(item.supplierWarranty)],
              ["Marque fournisseur", displayText(item.supplierBrand)],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2">
                <dt className="text-[#6B6B6B] text-xs">{label}</dt>
                <dd className="min-w-0 break-words text-[#1A1916] text-xs font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </TracePanel>
        <TracePanel title="Lots / factures d'origine" icon={FileText}>
          {entries.length ? (
            <div className="overflow-x-auto">
              <table className={`${tableClassName} min-w-[840px]`}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Fournisseur</th>
                    <th className="px-3 py-2">Facture</th>
                    <th className="px-3 py-2">Achat</th>
                    <th className="px-3 py-2 text-right">Qté entrée</th>
                    <th className="px-3 py-2 text-right">Disponible lot</th>
                    {canViewPurchasePrice && <th className="px-3 py-2 text-right">Prix achat</th>}
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>{shortDate(entry.date)}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>
                        {canViewSupplier ? entry.supplier || "—" : "Masqué"}
                      </td>
                      <td className={cn(tableCellClassName, "px-3 py-2 font-mono text-xs")}>
                        {entry.invoiceNumber || "—"}
                      </td>
                      <td className={cn(tableCellClassName, "px-3 py-2 font-mono text-xs")}>
                        {entry.purchaseId || "—"}
                      </td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-right tabular-nums")}>{entry.quantity}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-right tabular-nums")}>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-semibold text-[11px]",
                            entry.remainingQuantity > 0 ? "bg-[#E9F4F3] text-[#167B70]" : "bg-[#F1F1EE] text-[#6B6B6B]",
                          )}
                        >
                          {entry.remainingQuantity}
                        </span>
                      </td>
                      {canViewPurchasePrice && (
                        <td className={cn(tableCellClassName, "px-3 py-2 text-right tabular-nums")}>
                          {formatEuro(entry.unitCost ?? 0)}
                        </td>
                      )}
                      <td className={cn(tableCellClassName, "px-3 py-2 text-right")}>
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="rounded-full border border-[#E8E8E5] px-2 py-1 text-[#1A1916] text-[11px] disabled:opacity-40"
                            disabled={!entry.invoiceUrl}
                            onClick={() => entry.invoiceUrl && window.open(entry.invoiceUrl, "_blank")}
                            type="button"
                          >
                            Facture
                          </button>
                          <button
                            className="rounded-full border border-[#E8E8E5] px-2 py-1 text-[#1A1916] text-[11px]"
                            onClick={() => router.push("/dashboard/achats")}
                            type="button"
                          >
                            Achat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyLinkedState>Aucune entrée fournisseur reliée à cette référence.</EmptyLinkedState>
          )}
        </TracePanel>

        <TracePanel title="Historique des sorties atelier" icon={Wrench}>
          {trace.repairUsages.length ? (
            <div className="overflow-x-auto">
              <table className={`${tableClassName} min-w-[860px]`}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Réparation</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Appareil</th>
                    <th className="px-3 py-2">IMEI</th>
                    <th className="px-3 py-2 text-right">Qté sortie</th>
                    <th className="px-3 py-2">Technicien</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.repairUsages.map(({ repair, customer, part, usedAt, technician }) => (
                    <tr key={`${repair.id}-${part.stockItemId}-${part.name}`}>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>{shortDate(usedAt)}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 font-mono text-xs")}>{repair.number}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>{customer?.name || "—"}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>{repair.device}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 font-mono text-[11px]")}>
                        {repair.imei || "—"}
                      </td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-right tabular-nums")}>{part.quantity}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>{technician || "—"}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>{repair.status}</td>
                      <td className={cn(tableCellClassName, "px-3 py-2 text-right")}>
                        <button
                          className="rounded-full border border-[#E8E8E5] px-2 py-1 text-[#1A1916] text-[11px]"
                          onClick={() => {
                            store.setSelected("repair", repair.id);
                            router.push(`/dashboard/dossiers/${repair.id}`);
                          }}
                          type="button"
                        >
                          Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyLinkedState>Aucune sortie atelier liée à cette pièce.</EmptyLinkedState>
          )}
        </TracePanel>

        <TracePanel title="Mouvements" icon={History}>
          {trace.movements.length || trace.saleUsages.length ? (
            <div className="space-y-2 p-3">
              {trace.movements.map((movement) => (
                <div key={movement.id} className="rounded-[10px] border border-[#E8E8E5] bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1A1916] text-xs">{MOVEMENT_LABELS[movement.movementType]}</p>
                      <p className="mt-0.5 text-[#6B6B6B] text-[11px]">
                        {movement.reason || movement.note || movement.sourceModule}
                      </p>
                      <p className="mt-1 font-mono text-[#8A8A85] text-[10.5px]">{shortDate(movement.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-semibold text-sm tabular-nums",
                          movement.quantityDelta < 0 ? "text-[#B42318]" : "text-[#167B70]",
                        )}
                      >
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {movement.quantityDelta}
                      </p>
                      <p className="text-[#6B6B6B] text-[11px]">
                        {movement.quantityBefore} → {movement.quantityAfter}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {trace.saleUsages.map(({ sale, line, customer }) => (
                <div
                  key={`${sale.id}-${line.stockItemId}`}
                  className="rounded-[10px] border border-[#E8E8E5] bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1A1916] text-xs">Vente comptoir</p>
                      <p className="mt-0.5 text-[#6B6B6B] text-[11px]">
                        {sale.number} · {customer?.name || sale.customerName}
                      </p>
                      <p className="mt-1 font-mono text-[#8A8A85] text-[10.5px]">{shortDate(sale.createdAt)}</p>
                    </div>
                    <p className="font-semibold text-[#B42318] text-sm tabular-nums">-{line.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLinkedState>Aucun mouvement stock lié à cette référence.</EmptyLinkedState>
          )}
        </TracePanel>
      </div>
      <div className="mt-4 grid gap-2 border-[#E8E8E5] border-t pt-4">
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton
            className="h-10 w-full"
            disabled={!canManageStock}
            onClick={() => {
              const delta = Number(window.prompt("Ajustement stock (+ ou -)", "1") || 0);
              if (!Number.isFinite(delta) || delta === 0) {
                toast.error("Ajustement invalide");
                return;
              }
              store.adjustStock(item.id, delta, "Ajustement depuis fiche pièce");
              toast.success("Ajustement stock enregistré");
            }}
          >
            Ajuster stock
          </SecondaryButton>
          <SecondaryButton className="h-10 w-full" onClick={() => setLabelOpen(true)}>
            <Tags className="size-4" />
            Étiquette
          </SecondaryButton>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton className="h-10 w-full" onClick={() => setLabelOpen(true)}>
            <Printer className="size-4" />
            Imprimer
          </SecondaryButton>
          <SecondaryButton
            className="h-10 w-full"
            onClick={() => router.push(trace.repairUsages.length ? "/dashboard/reparations" : "/dashboard/achats")}
          >
            Voir liens
          </SecondaryButton>
        </div>
        <PrimaryButton
          className="h-10 w-full"
          disabled={!canManageStock}
          onClick={() => {
            const quantity = Number(window.prompt("Quantité à ajouter au stock", "5") || 0);
            if (!Number.isFinite(quantity) || quantity <= 0) {
              toast.error("Quantité invalide");
              return;
            }
            store.restockItem(item.id, quantity);
            toast.success("Stock mis à jour");
          }}
        >
          Réapprovisionner
        </PrimaryButton>
        <SecondaryButton
          className="h-10 w-full"
          disabled={store.repairs.length === 0 || !canUseStockItem}
          onClick={() => {
            const repair = store.repairs.find((entry) => entry.id === targetRepairId);
            if (!repair) {
              toast.error("Sélectionnez une réparation avant d’utiliser cette pièce.");
              return;
            }
            const confirmUse = window.confirm(
              `Utiliser 1 x ${item.name} sur la réparation ${repair.number} (${repair.device}) ?\nLe stock sera décrémenté après confirmation.`,
            );
            if (!confirmUse) return;
            const ok = store.addPartToRepair(repair.id, item.id, 1);
            toast[ok ? "success" : "error"](
              ok ? `Pièce ajoutée à ${repair.device}` : `Stock insuffisant pour ${item.name}`,
            );
          }}
        >
          Utiliser dans une réparation
        </SecondaryButton>
        <select
          className="h-9 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-sm text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
          disabled={store.repairs.length === 0}
          onChange={(event) => setTargetRepairId(event.target.value)}
          value={targetRepairId}
        >
          <option value="">Sélectionnez une réparation</option>
          {store.repairs.map((repair) => (
            <option key={repair.id} value={repair.id}>
              {repair.number} - {repair.device} ({repair.status})
            </option>
          ))}
        </select>
        {store.repairs.length === 0 ? (
          <p className="-mt-1 text-center text-[#6B6B6B] text-[11px]">
            Créez ou sélectionnez une réparation avant d'utiliser cette pièce.
          </p>
        ) : !targetRepairId ? (
          <p className="-mt-1 text-center text-[#6B6B6B] text-[11px]">
            Sélectionnez une réparation avant d’utiliser cette pièce.
          </p>
        ) : null}
        <SecondaryButton
          className="h-10 w-full"
          onClick={linkedTariffs.length ? () => router.push("/dashboard/parametres/catalogue") : createTariffFromItem}
        >
          {linkedTariffs.length ? "Voir dans Catalogue Prix" : "Créer un tarif depuis cette pièce"}
        </SecondaryButton>
        <SecondaryButton
          className="h-10 w-full text-[#B42318]"
          disabled={!canManageStock}
          onClick={() => {
            if (window.confirm("Supprimer cette pièce ?")) {
              store.deleteStockItem(item.id);
              toast.success("Pièce supprimée");
            }
          }}
        >
          <Trash2 className="size-4" />
          Supprimer la pièce
        </SecondaryButton>
      </div>
      {labelOpen && <StockLabelPrintModal item={item} qrDataUrl={qrDataUrl} onClose={() => setLabelOpen(false)} />}
    </Panel>
  );
}

type StockDetailTab = "overview" | "lots" | "movements" | "invoices" | "labels" | "history" | "notes";

const stockDetailTabs: Array<{ id: StockDetailTab; label: string }> = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "lots", label: "Lots" },
  { id: "movements", label: "Mouvements" },
  { id: "invoices", label: "Factures fournisseurs" },
  { id: "labels", label: "Étiquettes" },
  { id: "history", label: "Historique" },
  { id: "notes", label: "Notes" },
];

function StockDetailCard({
  title,
  children,
  action,
}: Readonly<{ title: string; children: ReactNode; action?: ReactNode }>) {
  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(26,25,22,0.035)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-[#1A1916] text-base">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StockDetailDataRow({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-[#6B6B6B]">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-[#1A1916]">{value}</dd>
    </div>
  );
}

function StockEmptyBlock({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="rounded-[12px] bg-[#FAFAF8] px-4 py-8 text-center text-[#6B6B6B] text-sm">{children}</p>;
}

function StockCompactTable({
  headers,
  children,
  minWidth = 720,
}: Readonly<{ headers: string[]; children: ReactNode; minWidth?: number }>) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-[#E8E8E5]">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <thead className="border-[#E8E8E5] border-b bg-[#FAFAF8] text-left text-[#6B6B6B] text-xs">
          <tr>
            {headers.map((header) => (
              <th className="px-4 py-3 font-semibold" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E8E5] bg-white">{children}</tbody>
      </table>
    </div>
  );
}

export function StockItemDetailWorkspace({ pieceId }: Readonly<{ pieceId: string }>) {
  const store = useBeharStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StockDetailTab>("overview");
  const [labelOpen, setLabelOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const decodedId = decodeURIComponent(pieceId);
  const item =
    store.stockItems.find((entry) => entry.id === decodedId) ??
    store.resolveStockItemByReference(decodedId) ??
    store.stockItems.find((entry) => stockPrimaryReference(entry) === decodedId);
  const canManageStock = store.hasPermission("canManageStock");
  const canUseStockItem = store.hasPermission("canUseStockItem");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");

  const reference = item
    ? firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id)
    : decodedId;
  const trace = useMemo(() => getPartTraceability(store, reference), [store, reference]);
  const lots = useMemo(() => (item ? getStockLotsForItem(store, item) : []), [store, item]);
  const linkedTariffs = item ? findLinkedTariffs(item, store.priceBookItems) : [];
  const invoiceDocumentIds = new Set(
    trace.supplierInvoices.map((invoice) => invoice.originalDocumentId).filter(Boolean),
  );
  const linkedDocuments = store.documents.filter((document) => invoiceDocumentIds.has(document.id));
  const auditEntries = store.auditLogs.filter((entry) => entry.targetType === "stock" && entry.targetId === item?.id);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    QRCode.toDataURL(buildScannedPartUrl(reference), {
      margin: 1,
      width: 172,
      color: { dark: "#1A1916", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [item, reference]);

  if (!store._hasHydrated) {
    return <Panel className="p-8 text-[#6B6B6B] text-sm">Chargement de la fiche pièce...</Panel>;
  }

  if (!item) {
    return (
      <Panel className="p-8 text-center">
        <h2 className="font-semibold text-[#1A1916] text-xl">Pièce introuvable</h2>
        <p className="mt-2 text-[#6B6B6B] text-sm">La référence demandée n'existe pas dans le stock local.</p>
        <PrimaryButton className="mt-5" onClick={() => router.push("/dashboard/stock")}>
          Retour au stock
        </PrimaryButton>
      </Panel>
    );
  }

  const itemId = item.id;
  const averagePrice = stockAveragePrice(item);
  const totalValue = stockTotalValue(item);
  const totalLotQuantity = lots.reduce((sum, lot) => sum + lot.quantityPurchased, 0);
  const remainingLotQuantity = lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
  const reservedStock = Math.max(0, totalLotQuantity - item.stock);
  const lastInvoice = trace.supplierInvoices[0];
  const categoryIcon = stockCategoryIcon(item);
  const CategoryIcon = categoryIcon;

  function adjustStock() {
    const delta = Number(window.prompt("Ajustement stock (+ ou -)", "1") || 0);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Ajustement invalide");
      return;
    }
    store.adjustStock(itemId, delta, "Ajustement depuis fiche pièce");
    toast.success("Ajustement stock enregistré");
  }

  function copyReference() {
    navigator.clipboard?.writeText(reference).then(
      () => toast.success("Référence copiée."),
      () => toast.error("Copie impossible."),
    );
  }

  function renderLots(limit?: number) {
    const visibleLots = typeof limit === "number" ? lots.slice(0, limit) : lots;
    if (!visibleLots.length) return <StockEmptyBlock>Aucun lot fournisseur relié à cette pièce.</StockEmptyBlock>;
    return (
      <StockCompactTable
        headers={["Lot", "Fournisseur", "Facture", "Reçu", "Restant", "Date", "Coût unitaire"]}
        minWidth={860}
      >
        {visibleLots.map((lot) => (
          <tr key={lot.id}>
            <td className="px-4 py-3 font-mono text-[#1A1916] text-xs">{lot.id}</td>
            <td className="px-4 py-3 text-[#1A1916]">{canViewSupplier ? lot.supplierName || "—" : "Masqué"}</td>
            <td className="px-4 py-3 font-mono text-[#167B70] text-xs">{lot.invoiceNumber || "—"}</td>
            <td className="px-4 py-3 tabular-nums">{lot.quantityPurchased}</td>
            <td className="px-4 py-3 font-semibold text-[#167B70] tabular-nums">{lot.quantityRemaining}</td>
            <td className="px-4 py-3 text-[#6B6B6B]">{shortDate(lot.purchaseDate || lot.createdAt)}</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {canViewPurchasePrice ? formatEuro(lot.unitCost ?? 0) : "Masqué"}
            </td>
          </tr>
        ))}
      </StockCompactTable>
    );
  }

  function renderMovements(limit?: number) {
    const movements = typeof limit === "number" ? trace.movements.slice(0, limit) : trace.movements;
    if (!movements.length) return <StockEmptyBlock>Aucun mouvement stock lié à cette référence.</StockEmptyBlock>;
    return (
      <StockCompactTable
        headers={["Date", "Type", "Référence", "Quantité", "Stock après", "Utilisateur"]}
        minWidth={820}
      >
        {movements.map((movement) => (
          <tr key={movement.id}>
            <td className="px-4 py-3 text-[#6B6B6B]">{shortDate(movement.createdAt)}</td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-[#F2FAF8] px-2.5 py-1 font-semibold text-[#167B70] text-xs">
                {MOVEMENT_LABELS[movement.movementType]}
              </span>
            </td>
            <td className="px-4 py-3 font-mono text-[#1A1916] text-xs">{movement.sourceId || movement.id}</td>
            <td
              className={cn(
                "px-4 py-3 font-semibold tabular-nums",
                movement.quantityDelta < 0 ? "text-[#B42318]" : "text-[#167B70]",
              )}
            >
              {movement.quantityDelta > 0 ? "+" : ""}
              {movement.quantityDelta}
            </td>
            <td className="px-4 py-3 tabular-nums">{movement.quantityAfter}</td>
            <td className="px-4 py-3 text-[#6B6B6B]">{movement.actorName || "—"}</td>
          </tr>
        ))}
      </StockCompactTable>
    );
  }

  function renderInvoices(limit?: number) {
    const invoices = typeof limit === "number" ? trace.supplierInvoices.slice(0, limit) : trace.supplierInvoices;
    if (!invoices.length) return <StockEmptyBlock>Aucune facture fournisseur liée.</StockEmptyBlock>;
    return (
      <StockCompactTable headers={["Facture", "Fournisseur", "Date", "Montant", "Statut", "Action"]} minWidth={820}>
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td className="px-4 py-3 font-mono text-[#167B70] text-xs">{invoice.invoiceNumber}</td>
            <td className="px-4 py-3">{canViewSupplier ? invoice.supplierName : "Masqué"}</td>
            <td className="px-4 py-3 text-[#6B6B6B]">{shortDate(invoice.purchaseDate)}</td>
            <td className="px-4 py-3 font-semibold tabular-nums">
              {canViewPurchasePrice ? formatEuro(invoice.totalIncludingTax) : "Masqué"}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={invoice.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <button
                className="font-semibold text-[#167B70] text-xs disabled:text-[#B7B7B2]"
                disabled={!invoice.originalFileUrl}
                onClick={() => invoice.originalFileUrl && window.open(invoice.originalFileUrl, "_blank")}
                type="button"
              >
                Voir facture
              </button>
            </td>
          </tr>
        ))}
      </StockCompactTable>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          className="inline-flex w-fit items-center gap-2 rounded-[10px] px-1 font-medium text-[#6B6B6B] text-sm transition hover:text-[#1A1916]"
          onClick={() => router.push("/dashboard/stock")}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Retour au stock
        </button>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton className="h-10" onClick={copyReference}>
            <Copy className="size-4" />
            Copier référence
          </SecondaryButton>
          <SecondaryButton className="h-10" onClick={() => setLabelOpen(true)}>
            <Printer className="size-4" />
            Imprimer étiquette
          </SecondaryButton>
          <PrimaryButton className="h-10" disabled={!canManageStock} onClick={adjustStock}>
            Modifier la pièce
          </PrimaryButton>
        </div>
      </div>

      <Panel className="overflow-hidden rounded-[20px] p-0">
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_660px]">
          <div className="flex gap-5">
            <StockItemThumbnail item={item} />
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[#6B6B6B] text-sm">
                <CategoryIcon className="size-4 text-[#2A9D8F]" />
                <span>{item.categoryName || item.category}</span>
              </div>
              <h1 className="font-semibold text-[#1A1916] text-3xl tracking-tight">{item.displayName || item.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StockQualityBadge quality={item.quality} />
                <span className="text-[#6B6B6B] text-sm">
                  Référence <span className="font-mono font-semibold text-[#167B70]">{reference}</span>
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-[#6B6B6B] text-sm leading-6">
                {item.displayName || item.name} compatible{" "}
                {item.compatibleModels.length ? item.compatibleModels.join(" / ") : "modèle à compléter"}.{" "}
                {item.quality ? `Qualité ${item.quality}.` : "Qualité à compléter."}
              </p>
            </div>
          </div>
          <div className="grid divide-y divide-[#E8E8E5] rounded-[16px] border border-[#E8E8E5] bg-[#FAFAF8] md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              ["Stock disponible", String(item.stock), stockUnitLabel(item.stock)],
              ["Prix moyen", canViewPurchasePrice ? formatEuro(averagePrice) : "Masqué", "HT"],
              ["Valeur totale stock", canViewPurchasePrice ? formatEuro(totalValue) : "Masqué", "HT"],
            ].map(([label, value, helper]) => (
              <div key={label} className="p-5 text-center">
                <p className="text-[#6B6B6B] text-xs">{label}</p>
                <p className="mt-4 font-semibold text-[#1A1916] text-2xl tabular-nums">{value}</p>
                <p className="mt-2 text-[#6B6B6B] text-xs">{helper}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-[#E8E8E5] border-t px-5 py-3">
          <StockStatusPill item={item} />
          <button
            className="grid size-9 place-items-center rounded-full text-[#6B6B6B] hover:bg-[#FAFAF8]"
            type="button"
          >
            <EllipsisVertical className="size-4" />
          </button>
        </div>
      </Panel>

      <div className="overflow-x-auto border-[#E8E8E5] border-b">
        <div className="flex min-w-max gap-2">
          {stockDetailTabs.map((tab) => (
            <button
              className={cn(
                "h-12 border-[#2A9D8F] border-b-2 px-4 font-semibold text-sm transition",
                activeTab === tab.id ? "border-opacity-100 text-[#1A1916]" : "border-opacity-0 text-[#6B6B6B]",
              )}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4 lg:grid-cols-2">
            <StockDetailCard title="Informations générales">
              <dl className="divide-y divide-[#F0F0ED]">
                <StockDetailDataRow label="Catégorie" value={item.categoryName || item.category} />
                <StockDetailDataRow label="Type de pièce" value={stockItemKindLabel(item)} />
                <StockDetailDataRow label="Qualité" value={displayText(item.quality)} />
                <StockDetailDataRow
                  label="Référence interne"
                  value={<span className="font-mono">{item.internalCode}</span>}
                />
                <StockDetailDataRow
                  label="Référence fournisseur"
                  value={<span className="font-mono">{item.sku}</span>}
                />
                <StockDetailDataRow
                  label="Code EAN"
                  value={<span className="font-mono">{displayText(item.ean)}</span>}
                />
                <StockDetailDataRow label="Garantie fournisseur" value={displayText(item.supplierWarranty)} />
                <StockDetailDataRow label="Emplacement" value={displayText(item.leadTime, "À définir")} />
              </dl>
            </StockDetailCard>
            <StockDetailCard title="Stock et valorisation">
              <dl className="divide-y divide-[#F0F0ED]">
                <StockDetailDataRow label="Stock disponible" value={`${item.stock} ${stockUnitLabel(item.stock)}`} />
                <StockDetailDataRow label="Stock réservé" value={`${reservedStock} ${stockUnitLabel(reservedStock)}`} />
                <StockDetailDataRow label="Stock en commande" value="0 unité" />
                <StockDetailDataRow
                  label="Stock total"
                  value={`${item.stock + reservedStock} ${stockUnitLabel(item.stock + reservedStock)}`}
                />
                <StockDetailDataRow
                  label="Stock minimum"
                  value={`${item.threshold} ${stockUnitLabel(item.threshold)}`}
                />
                <StockDetailDataRow
                  label="Valeur unitaire"
                  value={canViewPurchasePrice ? formatEuro(averagePrice) : "Masqué"}
                />
                <StockDetailDataRow
                  label="Valeur du stock"
                  value={canViewPurchasePrice ? formatEuro(totalValue) : "Masqué"}
                />
                <StockDetailDataRow
                  label="Dernier prix achat"
                  value={canViewPurchasePrice ? formatEuro(item.lastPurchasePrice ?? item.purchasePrice) : "Masqué"}
                />
              </dl>
            </StockDetailCard>
            <StockDetailCard
              title="Lots actifs / fournisseurs"
              action={
                lots.length > 3 ? (
                  <button
                    className="font-semibold text-[#167B70] text-xs"
                    onClick={() => setActiveTab("lots")}
                    type="button"
                  >
                    Voir tous les lots
                  </button>
                ) : null
              }
            >
              {renderLots(3)}
            </StockDetailCard>
            <StockDetailCard
              title="Mouvements récents"
              action={
                trace.movements.length > 4 ? (
                  <button
                    className="font-semibold text-[#167B70] text-xs"
                    onClick={() => setActiveTab("movements")}
                    type="button"
                  >
                    Voir tous les mouvements
                  </button>
                ) : null
              }
            >
              {renderMovements(4)}
            </StockDetailCard>
            <StockDetailCard
              title="Factures fournisseurs liées"
              action={
                trace.supplierInvoices.length > 3 ? (
                  <button
                    className="font-semibold text-[#167B70] text-xs"
                    onClick={() => setActiveTab("invoices")}
                    type="button"
                  >
                    Voir toutes les factures
                  </button>
                ) : null
              }
            >
              {renderInvoices(3)}
            </StockDetailCard>
            <StockDetailCard title="Documents liés">
              {linkedDocuments.length ? (
                <div className="space-y-2">
                  {linkedDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-[#E8E8E5] px-3 py-2"
                    >
                      <span className="truncate text-[#1A1916] text-sm">{document.title}</span>
                      <button
                        className="text-[#167B70]"
                        onClick={() => document.fileUrl && window.open(document.fileUrl, "_blank")}
                        type="button"
                      >
                        <ArrowUpRight className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <StockEmptyBlock>
                  Facture originale et documents fournisseur visibles dès qu'ils sont attachés.
                </StockEmptyBlock>
              )}
            </StockDetailCard>
            <StockDetailCard title="Utilisation dans les dossiers">
              {trace.repairUsages.length ? (
                <div className="space-y-2">
                  {trace.repairUsages.slice(0, 4).map(({ repair, customer, part }) => (
                    <button
                      className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-[#E8E8E5] px-3 py-2 text-left transition hover:border-[#2A9D8F]/40"
                      key={`${repair.id}-${part.stockItemId}`}
                      onClick={() => router.push(`/dashboard/dossiers/${repair.id}`)}
                      type="button"
                    >
                      <span>
                        <span className="block font-mono font-semibold text-[#1A1916] text-xs">{repair.number}</span>
                        <span className="block text-[#6B6B6B] text-xs">
                          {customer?.name || "Client"} · {repair.device}
                        </span>
                      </span>
                      <StatusBadge status={repair.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <StockEmptyBlock>Aucun dossier réparation n'utilise encore cette pièce.</StockEmptyBlock>
              )}
            </StockDetailCard>
          </div>
          <StockDetailCard title="Actions rapides">
            <div className="grid gap-2">
              <SecondaryButton className="h-10 w-full justify-start" disabled={!canManageStock} onClick={adjustStock}>
                <SlidersHorizontal className="size-4" />
                Ajuster le stock
              </SecondaryButton>
              <SecondaryButton className="h-10 w-full justify-start" onClick={() => setLabelOpen(true)}>
                <ScanQrCode className="size-4" />
                Créer une étiquette
              </SecondaryButton>
              <SecondaryButton className="h-10 w-full justify-start" onClick={() => router.push("/dashboard/achats")}>
                <ReceiptText className="size-4" />
                Voir les achats
              </SecondaryButton>
              <SecondaryButton className="h-10 w-full justify-start" onClick={() => router.push("/dashboard/achats")}>
                <Truck className="size-4" />
                Commander cette pièce
              </SecondaryButton>
              <SecondaryButton
                className="h-10 w-full justify-start"
                disabled={!canUseStockItem}
                onClick={() => router.push("/dashboard/atelier")}
              >
                <Wrench className="size-4" />
                Utiliser en réparation
              </SecondaryButton>
              <SecondaryButton className="h-10 w-full justify-start" onClick={() => window.print()}>
                <FileText className="size-4" />
                Exporter la fiche
              </SecondaryButton>
            </div>
          </StockDetailCard>
        </div>
      )}

      {activeTab === "lots" && <StockDetailCard title="Lots fournisseurs">{renderLots()}</StockDetailCard>}
      {activeTab === "movements" && <StockDetailCard title="Mouvements de stock">{renderMovements()}</StockDetailCard>}
      {activeTab === "invoices" && <StockDetailCard title="Factures fournisseurs">{renderInvoices()}</StockDetailCard>}
      {activeTab === "labels" && (
        <StockDetailCard title="Étiquettes">
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FAFAF8] p-4 text-center">
              {qrDataUrl ? (
                // biome-ignore lint/performance/noImgElement: data URL QR locale pour impression.
                <img alt={`QR ${reference}`} className="mx-auto size-36" src={qrDataUrl} />
              ) : (
                <div className="mx-auto grid size-36 place-items-center rounded-[12px] bg-white text-[#6B6B6B]">QR</div>
              )}
              <p className="mt-3 font-mono font-semibold text-[#167B70]">{reference}</p>
            </div>
            <div className="space-y-3">
              <p className="text-[#6B6B6B] text-sm">
                L'étiquette contient uniquement le logo, la référence lisible, le nom court, le code interne et le QR
                code.
              </p>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton onClick={() => setLabelOpen(true)}>
                  <Printer className="size-4" />
                  Générer / imprimer
                </PrimaryButton>
                <SecondaryButton onClick={copyReference}>
                  <Copy className="size-4" />
                  Copier la référence
                </SecondaryButton>
              </div>
            </div>
          </div>
        </StockDetailCard>
      )}
      {activeTab === "history" && (
        <StockDetailCard title="Historique">
          {auditEntries.length ? (
            <div className="space-y-2">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="rounded-[12px] border border-[#E8E8E5] px-4 py-3">
                  <p className="font-semibold text-[#1A1916] text-sm">{entry.message}</p>
                  <p className="mt-1 text-[#6B6B6B] text-xs">
                    {entry.actorName} · {shortDate(entry.createdAt)} · {entry.action}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <StockEmptyBlock>Aucune entrée d'audit spécifique à cette pièce.</StockEmptyBlock>
          )}
        </StockDetailCard>
      )}
      {activeTab === "notes" && (
        <StockDetailCard title="Notes">
          <dl className="divide-y divide-[#F0F0ED]">
            <StockDetailDataRow label="Nom brut fournisseur" value={displayText(item.rawName)} />
            <StockDetailDataRow
              label="Fournisseur principal"
              value={canViewSupplier ? displayText(item.primarySupplier || item.supplier) : "Masqué"}
            />
            <StockDetailDataRow
              label="Dernière facture"
              value={displayText(lastInvoice?.invoiceNumber || item.originSupplierInvoiceNumber)}
            />
            <StockDetailDataRow
              label="Quantité lots restante"
              value={`${remainingLotQuantity} ${stockUnitLabel(remainingLotQuantity)}`}
            />
            <StockDetailDataRow label="Tarifs liés" value={`${linkedTariffs.length} tarif(s)`} />
          </dl>
        </StockDetailCard>
      )}

      {labelOpen && <StockLabelPrintModal item={item} qrDataUrl={qrDataUrl} onClose={() => setLabelOpen(false)} />}
    </div>
  );
}

// biome-ignore lint/correctness/noUnusedVariables: ancienne carte KPI conservée temporairement pour éviter un refactor large hors scope.
function StockMetricCard({
  label,
  value,
  trend,
  helper,
  icon: Icon,
  negative,
}: Readonly<{
  label: string;
  value: string;
  trend: string;
  helper: string;
  icon: LucideIcon;
  negative?: boolean;
}>) {
  return (
    <Panel className="h-[116px] p-5">
      <div className="flex h-full items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#2A9D8F]">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[#6B6B6B] text-[13px]">{label}</p>
          <p className="mt-1 font-semibold text-[28px] text-[#1A1916] leading-none tracking-tight">{value}</p>
          {trend ? (
            <p
              className={
                negative ? "mt-1 font-medium text-[#C84848] text-[13px]" : "mt-1 font-medium text-[#2A9D8F] text-[13px]"
              }
            >
              {trend}
            </p>
          ) : null}
          <p className="mt-0.5 text-[#8A8A8A] text-[12px]">{helper}</p>
        </div>
      </div>
    </Panel>
  );
}

function StockModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const store = useBeharStore();
  const [deviceType, setDeviceType] = useState<string>("Smartphone");
  const [brandName, setBrandName] = useState("Apple");
  const [categoryId, setCategoryId] = useState("cat_screen");
  const [selectedModel, setSelectedModel] = useState<string>("");
  // La qualité par défaut dépend de la catégorie initiale (Écran → "").
  const [quality, setQuality] = useState<string>(() => getDefaultQualityForCategory("Écran"));
  const [customQuality, setCustomQuality] = useState<string>("");
  const [nameOverride, setNameOverride] = useState<string>("");
  const [skuOverride, setSkuOverride] = useState<string>("");
  const [supplier, setSupplier] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [stockQty, setStockQty] = useState<string>("1");
  const [threshold, setThreshold] = useState<string>("1");
  // §4 — stock élargi : type de produit + article comptoir (accessoire, consommable…).
  const [productCategory, setProductCategory] = useState<StockProductCategory>("Pièces détachées");
  const [counterVisible, setCounterVisible] = useState(false);
  const [salePrice, setSalePrice] = useState<string>("");
  const isPart = productCategory === "Pièces détachées";
  const itemType = productCategoryToItemType(productCategory);

  const categoryMapping: Record<string, DeviceCategory> = {
    Smartphone: "smartphone",
    Tablette: "tablet",
    Ordinateur: "computer",
    Console: "console",
  };

  const category = categoryMapping[deviceType] || "smartphone";
  const availableBrands = getDeviceBrands(category);
  const availableModels = getModelsByBrand(brandName, category);
  const availableCategories = store.partCategories.filter((cat) => cat.deviceTypes.includes(deviceType as DeviceType));
  const selectedCategory = store.partCategories.find((cat) => cat.id === categoryId);
  const categoryName = selectedCategory?.name ?? "";

  // Qualités contextuelles : OLED uniquement pour Écran, etc.
  const availableQualities = useMemo(() => getQualitiesForCategory(categoryName), [categoryName]);
  // La qualité réelle envoyée au système : si "Autre", on prend le texte libre.
  const effectiveQuality = quality === "Autre" ? customQuality.trim() : quality;

  // Auto-suggérés (s'appliquent tant que l'utilisateur n'a pas overridé).
  const suggestedName = useMemo(
    () =>
      suggestStockName({ brand: brandName, model: selectedModel, category: categoryName, quality: effectiveQuality }),
    [brandName, selectedModel, categoryName, effectiveQuality],
  );
  const suggestedSku = useMemo(
    () =>
      suggestStockSku({ brand: brandName, model: selectedModel, category: categoryName, quality: effectiveQuality }),
    [brandName, selectedModel, categoryName, effectiveQuality],
  );
  const effectiveName = nameOverride.trim() || suggestedName;
  const effectiveSku = skuOverride.trim() || suggestedSku;

  // Détection doublon stock + tarif lié existant.
  const existingStock = useMemo(
    () =>
      findStockBySelection(store.stockItems, {
        brand: brandName,
        model: selectedModel,
        category: categoryName,
        quality: effectiveQuality,
        sku: effectiveSku,
      }),
    [store.stockItems, brandName, selectedModel, categoryName, effectiveQuality, effectiveSku],
  );

  const linkedPriceBook = useMemo(
    () =>
      findPriceBookBySelection(store.priceBookItems, {
        brand: brandName,
        model: selectedModel,
        category: categoryName,
        quality: effectiveQuality,
      }),
    [store.priceBookItems, brandName, selectedModel, categoryName, effectiveQuality],
  );

  const submit = () => {
    // §4 — article comptoir (accessoire, consommable, service…) : pas de modèle imposé.
    if (!isPart) {
      const name = nameOverride.trim();
      if (!name) {
        toast.error("Indiquez le nom de l'article.");
        return;
      }
      const sale = Math.max(0, Number(salePrice.replace(",", ".")) || 0);
      store.addStockItem({
        sku: skuOverride.trim() || `ACC-${Date.now()}`,
        name,
        deviceType: "Autre",
        compatibleModels: [],
        modelIds: [],
        categoryName: productCategory,
        productCategory,
        itemType,
        repairEnabled: false,
        counterSaleEnabled: counterVisible,
        active: true,
        counterVisible,
        salePrice: sale,
        supplier: supplier.trim() || "Non renseigné",
        purchasePrice: Math.max(0, Number(purchasePrice) || 0),
        quantity: Math.max(0, Number(stockQty) || 0),
        threshold: Math.max(0, Number(threshold) || 0),
        skipModelInference: true,
      });
      toast.success(
        sale > 0 ? "Article ajouté au stock." : "Article ajouté au stock — prix à définir avant encaissement.",
      );
      onClose();
      return;
    }
    if (!selectedModel) {
      toast.error("Sélectionnez un modèle.");
      return;
    }
    if (!categoryName) {
      toast.error("Sélectionnez une catégorie.");
      return;
    }
    // Écran : la qualité est obligatoire (pas de défaut "Standard" forcé).
    if (categoryName === "Écran" && !effectiveQuality) {
      toast.error("Choisissez une qualité d'écran (Incell, OLED, Hard OLED, etc.).");
      return;
    }
    // "Autre" sans précision : on bloque pour éviter un SKU bizarre.
    if (quality === "Autre" && !customQuality.trim()) {
      toast.error("Précisez la qualité (champ ‹ Préciser la qualité ›).");
      return;
    }
    // Si un stock existant correspond, on met à jour au lieu de dupliquer.
    if (existingStock) {
      store.updateStockItem(existingStock.id, {
        name: effectiveName,
        sku: effectiveSku,
        brandId: brandName,
        brandName,
        compatibleModels: [selectedModel],
        modelIds: [selectedModel],
        categoryId: selectedCategory?.id,
        categoryName,
        productCategory,
        itemType,
        repairEnabled: true,
        counterSaleEnabled: counterVisible,
        counterVisible,
        supplier: supplier.trim() || existingStock.supplier || "Non renseigné",
        purchasePrice: purchasePrice ? Number(purchasePrice) : existingStock.purchasePrice,
        quantity: Math.max(0, Number(stockQty) || 0) + (existingStock.quantity ?? 0),
        threshold: Math.max(0, Number(threshold) || 0),
      });
      toast.success(`Pièce existante mise à jour (+${Math.max(0, Number(stockQty) || 0)} en stock).`);
      onClose();
      return;
    }
    store.addStockItem({
      sku: effectiveSku || `REF-${Date.now()}`,
      name: effectiveName,
      deviceType: deviceType as DeviceType,
      brandId: brandName,
      brandName,
      modelIds: [selectedModel],
      compatibleModels: [selectedModel],
      categoryId: selectedCategory?.id,
      categoryName,
      productCategory,
      itemType,
      repairEnabled: true,
      counterSaleEnabled: counterVisible,
      active: true,
      counterVisible,
      supplier: supplier.trim() || "Non renseigné",
      purchasePrice: Math.max(0, Number(purchasePrice) || 0),
      quantity: Math.max(0, Number(stockQty) || 0),
      threshold: Math.max(0, Number(threshold) || 0),
      priceBookItemId: linkedPriceBook?.id,
    });
    toast.success("Pièce ajoutée au stock.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-0 md:p-4">
      <Panel className="mx-auto my-0 min-h-svh max-w-none overflow-y-auto rounded-none p-5 md:my-8 md:max-h-[calc(100svh-4rem)] md:max-w-2xl md:min-h-0 md:rounded-[20px] md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-2xl text-[#1A1916]">{isPart ? "Nouvelle pièce" : "Nouvel article"}</h2>
            <p className="mt-1 text-[#6B6B6B] text-[13px]">
              {isPart
                ? "Sélection guidée : marque → modèle → catégorie → gamme."
                : "Accessoire ou prestation vendu directement au comptoir."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-[#FFFFFF] text-[#1A1916] active:scale-90"
            aria-label="Fermer"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </div>

        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {/* §4 — type de produit : pièce de réparation ou article vendu au comptoir. */}
          <label className="block md:col-span-2">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Type de produit</span>
            <select
              className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              value={productCategory}
              onChange={(event) => {
                const nextCategory = event.target.value as StockProductCategory;
                setProductCategory(nextCategory);
                setCounterVisible(productCategoryToItemType(nextCategory) !== "part");
              }}
            >
              {STOCK_PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          {isPart && (
            <>
              {/* Type d'appareil */}
              <label className="block">
                <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Type</span>
                <select
                  className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
                  value={deviceType}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    const nextCategory = categoryMapping[nextType] || "smartphone";
                    const brands = getDeviceBrands(nextCategory);
                    const firstBrand = brands[0]?.brand || "Autre";
                    const firstCategory = store.partCategories.find((cat) =>
                      cat.deviceTypes.includes(nextType as DeviceType),
                    );
                    setDeviceType(nextType);
                    setBrandName(firstBrand);
                    setCategoryId(firstCategory?.id ?? "cat_other");
                    setSelectedModel("");
                    // La nouvelle catégorie peut être incompatible avec la qualité actuelle.
                    const nextCategoryName = firstCategory?.name ?? "";
                    if (!isQualityValidForCategory(quality, nextCategoryName)) {
                      setQuality(getDefaultQualityForCategory(nextCategoryName));
                      setCustomQuality("");
                    }
                  }}
                >
                  {["Smartphone", "Tablette", "Ordinateur", "Console"].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>

              {/* Marque */}
              <label className="block">
                <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Marque</span>
                <select
                  className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
                  value={brandName}
                  onChange={(event) => {
                    setBrandName(event.target.value);
                    setSelectedModel("");
                  }}
                >
                  {availableBrands.map((b) => (
                    <option key={b.brand} value={b.brand}>
                      {b.brand}
                    </option>
                  ))}
                  <option value="Autre">Autre</option>
                </select>
              </label>

              {/* Modèle (sélection guidée — pas de saisie libre) */}
              <label className="block md:col-span-2">
                <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Modèle</span>
                <select
                  className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  required
                >
                  <option value="">Sélectionnez un modèle…</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              {/* Catégorie */}
              <label className="block">
                <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Catégorie</span>
                <select
                  className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
                  value={categoryId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const nextCategory = store.partCategories.find((c) => c.id === nextId);
                    const nextName = nextCategory?.name ?? "";
                    setCategoryId(nextId);
                    // Si l'ancienne qualité n'est plus valide pour la nouvelle catégorie
                    // (ex: "Hard OLED" + "Batterie"), on reset au défaut. Sinon on
                    // conserve le choix utilisateur.
                    if (!isQualityValidForCategory(quality, nextName)) {
                      setQuality(getDefaultQualityForCategory(nextName));
                      setCustomQuality("");
                    }
                  }}
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Gamme / Qualité (contextuelle selon la catégorie) */}
              <label className="block">
                <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Gamme</span>
                <select
                  className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
                  value={quality}
                  onChange={(event) => setQuality(event.target.value)}
                >
                  {quality === "" && <option value="">Choisir une qualité…</option>}
                  {availableQualities.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>

              {/* Champ libre quand la qualité = "Autre" */}
              {quality === "Autre" && (
                <label className="block md:col-span-2">
                  <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">
                    Préciser la qualité
                  </span>
                  <input
                    type="text"
                    className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
                    placeholder="Ex : Service Pack"
                    value={customQuality}
                    onChange={(e) => setCustomQuality(e.target.value)}
                  />
                </label>
              )}

              {/* Aperçu auto-rempli (nom / SKU) avec override possible */}
              <div className="rounded-xl border border-[#E8E8E5] bg-[#FFFFFF] p-3 md:col-span-2">
                <p className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Auto-rempli</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <label className="block">
                    <span className="text-[#6B6B6B] text-[11px]">Nom (modifiable)</span>
                    <input
                      type="text"
                      className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13.5px] outline-none focus:border-[#2A9D8F]"
                      placeholder={suggestedName || "Sélectionnez un modèle"}
                      value={nameOverride}
                      onChange={(e) => setNameOverride(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[#6B6B6B] text-[11px]">SKU (modifiable)</span>
                    <input
                      type="text"
                      className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13.5px] font-mono outline-none focus:border-[#2A9D8F]"
                      placeholder={suggestedSku || "Sélectionnez un modèle"}
                      value={skuOverride}
                      onChange={(e) => setSkuOverride(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              {!linkedPriceBook && selectedModel && (
                <div className="rounded-xl border border-[#E8E8E5] bg-white p-3 text-[12px] text-[#6B6B6B] md:col-span-2">
                  Aucun tarif client lié pour cette sélection. Vous pourrez en créer un dans Paramètres → Tarifs /
                  Prestations.
                </div>
              )}
            </>
          )}

          {/* §4 — article comptoir : saisie directe nom + prix de vente, sans modèle. */}
          {!isPart && (
            <div className="rounded-xl border border-[#E8E8E5] bg-[#FFFFFF] p-3 md:col-span-2">
              <p className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Article comptoir</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label className="block">
                  <span className="text-[#6B6B6B] text-[11px]">Nom de l'article *</span>
                  <input
                    className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13.5px] outline-none focus:border-[#2A9D8F]"
                    onChange={(e) => setNameOverride(e.target.value)}
                    placeholder="Ex : Coque silicone iPhone 15"
                    type="text"
                    value={nameOverride}
                  />
                </label>
                <label className="block">
                  <span className="text-[#6B6B6B] text-[11px]">SKU (optionnel)</span>
                  <input
                    className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 font-mono text-[13.5px] outline-none focus:border-[#2A9D8F]"
                    onChange={(e) => setSkuOverride(e.target.value)}
                    placeholder="ACC-…"
                    type="text"
                    value={skuOverride}
                  />
                </label>
                <label className="block">
                  <span className="text-[#6B6B6B] text-[11px]">Prix de vente TTC</span>
                  <input
                    className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13.5px] outline-none focus:border-[#2A9D8F]"
                    min="0"
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0,00"
                    step="0.01"
                    type="number"
                    value={salePrice}
                  />
                </label>
              </div>
            </div>
          )}

          {/* §4 — visibilité comptoir (utile pour pièces ET accessoires). */}
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E8E5] bg-white px-3 py-2.5 md:col-span-2">
            <span className="text-[#1A1916] text-[13.5px]">
              Visible en vente comptoir
              <span className="block text-[#6B6B6B] text-[11px]">Proposé dans l'écran de vente directe.</span>
            </span>
            <button
              aria-checked={counterVisible}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition",
                counterVisible ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]",
              )}
              onClick={() => setCounterVisible((v) => !v)}
              role="switch"
              type="button"
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition-all",
                  counterVisible ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </label>

          {/* Données internes : prix achat, fournisseur, quantité, seuil */}
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Fournisseur</span>
            <input
              type="text"
              className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              placeholder="UTOPYA, etc."
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">
              Prix d'achat atelier
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              placeholder="À renseigner"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Quantité</span>
            <input
              type="number"
              min="0"
              className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Seuil d'alerte</span>
            <input
              type="number"
              min="0"
              className="mt-1 h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </label>

          <div className="rounded-xl border border-[#E8E8E5] bg-[#FFFFFF] px-3 py-2.5 text-[12.5px] text-[#6B6B6B] md:col-span-2">
            Le prix client est défini dans <strong>Paramètres → Tarifs / Prestations</strong>. Stock = inventaire
            interne, Catalogue = tarifs client.
          </div>

          <div className="flex justify-end gap-2 md:col-span-2">
            <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
            <PrimaryButton type="submit">{existingStock ? "Mettre à jour le stock" : "Ajouter la pièce"}</PrimaryButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
