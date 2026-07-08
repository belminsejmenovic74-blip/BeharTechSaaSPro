"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  FileText,
  Filter,
  History,
  Package,
  Plus,
  Printer,
  Search,
  Tags,
  Trash2,
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
import { stockKpis } from "@/mock/stock";

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
  TableShell,
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

function openStockLabel(item: StockItem, qrDataUrl: string, print: boolean) {
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Étiquette ${reference}</title>
  <style>
    body { margin: 0; padding: 18px; background: #FAFAF8; color: #1A1916; font-family: Arial, sans-serif; }
    .label { width: 320px; min-height: 190px; border: 1px solid #E8E8E5; border-radius: 10px; background: #fff; padding: 16px; }
    .top { display: flex; gap: 12px; align-items: flex-start; }
    .brand { display: flex; align-items: center; gap: 7px; margin-bottom: 12px; font-weight: 800; font-size: 13px; letter-spacing: .02em; }
    .dot { width: 6px; height: 6px; border-radius: 999px; background: #2A9D8F; display: inline-block; }
    .pro { margin-left: 4px; border: 1px solid #2A9D8F; border-radius: 6px; padding: 2px 5px; color: #167B70; font-size: 10px; }
    img { width: 86px; height: 86px; }
    h1 { margin: 0; font-size: 16px; line-height: 1.2; }
    p { margin: 6px 0 0; font-size: 12px; color: #6B6B6B; }
    .code { margin-top: 14px; font-family: monospace; font-size: 15px; font-weight: 700; letter-spacing: 0.04em; }
    .bars { margin-top: 10px; height: 28px; background: repeating-linear-gradient(90deg, #1A1916 0 2px, transparent 2px 5px, #1A1916 5px 7px, transparent 7px 11px); }
    @media print { body { background: #fff; padding: 0; } .label { border-color: #1A1916; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="brand">BEHAR <span class="dot"></span> TECH <span class="pro">PRO</span></div>
    <div class="top">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ""}
      <div>
        <h1>${item.name}</h1>
        <p>${item.categoryName || item.category || "Catégorie"}</p>
        <p>${item.compatibleModels?.join(", ") || "Modèle compatible"}</p>
      </div>
    </div>
    <div class="code">${reference}</div>
    <p>${item.internalCode ?? ""}</p>
    <div class="bars"></div>
  </div>
  ${print ? "<script>window.addEventListener('load', () => window.print());</script>" : ""}
</body>
</html>`;
  const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=360");
  if (!win) {
    toast.error("Ouverture de l'étiquette bloquée par le navigateur.");
    return;
  }
  win.document.write(html);
  win.document.close();
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

export function StockWorkspace() {
  const store = useBeharStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const filteredItems = store.stockItems.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.reference.toLowerCase().includes(q) ||
      (item.internalCode || "").toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      item.compatibleModels.join(" ").toLowerCase().includes(q) ||
      item.supplier.toLowerCase().includes(q);

    if (filterLowStock && item.quantity > item.threshold) return false;
    return matchesSearch;
  });

  const selected = filteredItems.find((item) => item.id === store.selectedStockItemId) ?? filteredItems[0];
  const canManageStock = store.hasPermission("canManageStock");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const stockValue = store.stockItems.reduce((total, item) => total + item.purchasePrice * item.quantity, 0);
  const lowStockCount = store.stockItems.filter((item) => item.quantity > 0 && item.quantity <= item.threshold).length;
  const outCount = store.stockItems.filter((item) => item.quantity === 0).length;
  const linkedTariffCount = store.stockItems.filter((item) => findLinkedTariff(item, store.priceBookItems)).length;
  const dynamicKpis = stockKpis.map((kpi) => {
    // On neutralise les tendances factices "vs mois dernier" — pas de comparaison réelle disponible.
    const base = { ...kpi, trend: "" };
    if (kpi.label === "Références")
      return { ...base, value: String(store.stockItems.length), helper: "références suivies" };
    if (kpi.label === "Valeur du stock")
      return { ...base, value: canViewPurchasePrice ? formatEuro(stockValue) : "Masqué", helper: "au prix d'achat" };
    if (kpi.label === "Ruptures")
      return { ...base, value: String(outCount), helper: `${lowStockCount} stock faible`, negative: outCount > 0 };
    if (kpi.label === "Marge moyenne")
      return { ...base, label: "Tarifs liés", value: String(linkedTariffCount), helper: "prix client dans Tarifs" };
    return base;
  });

  return (
    <PageShell
      searchPlaceholder="Rechercher..."
      title="Stock"
      subtitle="Pièces, composants et fournisseurs de votre atelier."
    >
      <div className="flex flex-col gap-4">
        {/* Mobile : strip horizontal de KPI compacts */}
        <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:hidden scrollbar-none">
          {dynamicKpis.map((kpi) => (
            <div
              key={kpi.label}
              className="w-[42%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]"
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-[10px]",
                  kpi.negative ? "bg-[#FFFFFF] text-[#B42318]" : "bg-[#FFFFFF] text-[#2A9D8F]",
                )}
              >
                <Package className="size-[18px]" strokeWidth={2} />
              </span>
              <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium leading-tight tracking-tight">{kpi.label}</p>
              <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tracking-tight tabular-nums">
                {kpi.value}
              </p>
              {kpi.helper && <p className="mt-1.5 truncate text-[#6B6B6B] text-[10px] font-medium">{kpi.helper}</p>}
            </div>
          ))}
        </section>

        {/* Desktop : grille KPI standard */}
        <section className="hidden md:grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {dynamicKpis.map((kpi) => (
            <StockMetricCard {...kpi} key={kpi.label} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_350px]">
          <TableShell className="min-h-[400px]">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-[#E8E8E5] border-b bg-white p-3">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
                <input
                  className="h-10 w-full rounded-[13px] border border-[#E8E8E5] bg-white pr-4 pl-10 text-[#1A1916] text-sm outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                  placeholder="Rechercher une pièce, référence, fournisseur..."
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <PrimaryButton className="h-10 shrink-0" onClick={() => setOpen(true)} disabled={!canManageStock}>
                <Plus className="size-4" />
                <span>Nouvelle pièce</span>
              </PrimaryButton>
              <SupplierInvoiceImportModal buttonLabel="Import facture" />
              <span className="hidden 2xl:inline-flex">
                <StockImportModal />
              </span>
              <SecondaryButton
                className={filterLowStock ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1A1916]" : ""}
                onClick={() => setFilterLowStock(!filterLowStock)}
              >
                <Filter className="size-4" />
                {filterLowStock ? "Stock faible uniquement" : "Tous les stocks"}
              </SecondaryButton>
            </div>
            <table className={`${tableClassName} hidden md:table min-w-[980px]`}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className="px-4 py-3">Nom pièce</th>
                  <th className="px-4 py-3">Référence / SKU</th>
                  <th className="px-4 py-3">Modèle compatible</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3 text-right">Stock disponible</th>
                  {canViewPurchasePrice && <th className="px-4 py-3 text-right">Prix moyen</th>}
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = stockStatusLabel(item);
                  return (
                    <tr
                      className={`cursor-pointer transition hover:bg-[#FFFFFF] ${item.id === selected?.id ? "bg-[#FFFFFF]" : ""}`}
                      key={item.id}
                      onClick={() => store.setSelected("stockItem", item.id)}
                    >
                      <td className={`${tableCellClassName} py-2.5 font-semibold`}>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#2A9D8F]">
                            <span className="block h-6 w-3 rounded-sm bg-[#1A1916]/80" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[#1A1916]">{item.displayName ?? item.name}</p>
                            {item.quality && <p className="mt-0.5 text-[#6B6B6B] text-[11px]">{item.quality}</p>}
                          </div>
                        </div>
                      </td>
                      <td className={`${tableCellClassName} py-2.5`}>
                        <div className="flex flex-col gap-1">
                          <PartReferenceLink reference={item.sku || item.reference} />
                          {item.internalCode && (
                            <span className="font-mono text-[#8A8A85] text-[10.5px]">{item.internalCode}</span>
                          )}
                        </div>
                      </td>
                      <td className={`${tableCellClassName} max-w-[220px] py-2.5`}>
                        {item.compatibleModels.length ? item.compatibleModels.join(" / ") : "Non défini"}
                      </td>
                      <td className={`${tableCellClassName} py-2.5`}>{item.categoryName}</td>
                      <td className={`${tableCellClassName} py-2.5 text-right tabular-nums`}>
                        <span className="font-semibold">{item.quantity}</span>
                      </td>
                      {canViewPurchasePrice && (
                        <td className={`${tableCellClassName} py-2.5 text-right tabular-nums`}>
                          {formatEuro(item.averagePurchasePrice ?? item.purchasePrice)}
                        </td>
                      )}
                      <td className={`${tableCellClassName} py-2.5`}>
                        <StatusBadge className="h-6 px-2 text-[11px]" status={status} />
                      </td>
                      <td className={`${tableCellClassName} py-2.5 text-right`}>
                        <SecondaryButton
                          className="h-8 px-3 text-xs"
                          onClick={() => store.setSelected("stockItem", item.id)}
                        >
                          Voir détail
                        </SecondaryButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Vue cartes mobile premium */}
            <div className="md:hidden space-y-2.5 p-3 bg-[#FFFFFF]">
              {filteredItems.length === 0 ? (
                <p className="rounded-[16px] bg-white px-4 py-10 text-center text-[#6B6B6B] text-sm shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  Aucune pièce.
                </p>
              ) : (
                filteredItems.map((item) => {
                  const isOut = item.quantity === 0;
                  const isLow = item.quantity > 0 && item.quantity <= item.threshold;
                  const openItem = () => {
                    store.setSelected("stockItem", item.id);
                    setMobileDetailOpen(true);
                  };
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: la carte contient une référence cliquable, éviter un bouton imbriqué.
                    <div
                      key={item.id}
                      className="block w-full rounded-[18px] bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                      onClick={openItem}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openItem();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "grid size-12 shrink-0 place-items-center rounded-[14px]",
                            isOut ? "bg-[#FFFFFF] text-[#B42318]" : "bg-[#FFFFFF] text-[#1A1916]",
                          )}
                        >
                          <Package className="size-[20px]" strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                              {item.name}
                            </p>
                            {(isOut || isLow) && (
                              <span
                                className={cn(
                                  "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  isOut ? "bg-[#FFFFFF] text-[#B42318]" : "bg-[#FFFFFF] text-[#6B6B6B]",
                                )}
                              >
                                {isOut ? <AlertTriangle className="size-3" /> : null}
                                {isOut ? "Rupture" : "Stock bas"}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[#6B6B6B] text-[11.5px]">
                            SKU <PartReferenceLink reference={item.sku || item.reference} /> ·{" "}
                            {stockItemKindLabel(item)}
                          </div>
                          <div className="mt-2.5 grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-[#6B6B6B] text-[10px] font-medium uppercase tracking-wider">Stock</p>
                              <p
                                className={cn(
                                  "mt-0.5 font-semibold text-[14px] tabular-nums",
                                  isOut ? "text-[#B42318]" : isLow ? "text-[#6B6B6B]" : "text-[#2A9D8F]",
                                )}
                              >
                                {item.quantity}
                              </p>
                            </div>
                            {canViewPurchasePrice && (
                              <div>
                                <p className="text-[#6B6B6B] text-[10px] font-medium uppercase tracking-wider">Achat</p>
                                <p className="mt-0.5 font-semibold text-[#1A1916] text-[14px] tabular-nums">
                                  {formatEuro(item.purchasePrice)}
                                </p>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[#6B6B6B] text-[10px] font-medium uppercase tracking-wider">
                                Catégorie
                              </p>
                              <p className="mt-0.5 truncate font-semibold text-[#1A1916] text-[13px]">
                                {item.categoryName}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 truncate text-[#6B6B6B] text-[11px]">
                            {item.compatibleModels.length ? item.compatibleModels.join(" / ") : "Modèle non défini"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TableShell>

          {/* Desktop detail panel — sticky so it stays in view while the page scrolls */}
          {selected && (
            <div className="hidden md:block">
              <div className="sticky top-6">
                <StockDetail item={selected} />
              </div>
            </div>
          )}
        </section>
      </div>

      {open && <StockModal onClose={() => setOpen(false)} />}

      {/* Mobile bottom sheet drawer */}
      {mobileDetailOpen && selected && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-[#1A1916]/40 animate-in fade-in duration-200"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Fermer"
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] flex flex-col rounded-t-[28px] bg-white shadow-[0_-20px_60px_rgba(26,25,22,0.18)] animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <span className="h-1 w-9 rounded-full bg-[#FFFFFF]" aria-hidden />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-3 shrink-0 border-b border-[#FFFFFF]">
              <p className="font-semibold text-[#1A1916] text-[17px] truncate">{selected.name}</p>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-[#FFFFFF] text-[#6B6B6B] active:scale-90 shrink-0"
                aria-label="Fermer"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <StockDetailMobile item={selected} onClose={() => setMobileDetailOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

/** Mobile version — inside a scrollable bottom sheet, no fixed height constraints */
function StockDetailMobile({ item, onClose }: Readonly<{ item: StockItem; onClose: () => void }>) {
  const store = useBeharStore();
  const router = useRouter();
  const [targetRepairId, setTargetRepairId] = useState(store.selectedRepairId || "");
  const [qrDataUrl, setQrDataUrl] = useState("");
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
    QRCode.toDataURL(reference, { margin: 1, width: 148, color: { dark: "#1A1916", light: "#FFFFFF" } })
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
          <SecondaryButton className="h-11 w-full" onClick={() => openStockLabel(item, qrDataUrl, true)}>
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
    </div>
  );
}

function StockDetail({ item }: Readonly<{ item: StockItem }>) {
  const store = useBeharStore();
  const router = useRouter();
  const [targetRepairId, setTargetRepairId] = useState(store.selectedRepairId || "");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const canManageStock = store.hasPermission("canManageStock");
  const canUseStockItem = store.hasPermission("canUseStockItem");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const linkedTariffs = findLinkedTariffs(item, store.priceBookItems);
  const tariff = linkedTariffs[0];
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  const trace = useMemo(() => getPartTraceability(store, reference), [store, reference]);
  const entries = trace.supplierInvoiceLines.length
    ? trace.supplierInvoiceLines.map((line) => ({
        id: line.id,
        date:
          trace.supplierInvoices.find((invoice) => invoice.id === line.supplierInvoiceId)?.purchaseDate ??
          line.createdAt,
        supplier:
          trace.supplierInvoices.find((invoice) => invoice.id === line.supplierInvoiceId)?.supplierName ??
          line.supplierName,
        invoiceNumber: trace.supplierInvoices.find((invoice) => invoice.id === line.supplierInvoiceId)?.invoiceNumber,
        invoiceUrl: trace.supplierInvoices.find((invoice) => invoice.id === line.supplierInvoiceId)?.originalFileUrl,
        purchaseId: line.purchaseId,
        quantity: line.quantityPurchased,
        unitCost: line.unitPurchasePriceExclTax,
        supplierInvoiceId: line.supplierInvoiceId,
      }))
    : trace.purchases.map((purchase) => ({
        id: purchase.id,
        date: purchase.date || purchase.createdAt,
        supplier: purchase.supplier,
        invoiceNumber: purchase.invoiceNumber,
        invoiceUrl: purchase.originalFileUrl,
        purchaseId: purchase.id,
        quantity: purchase.quantity,
        unitCost: purchase.unitCost,
        supplierInvoiceId: purchase.supplierInvoiceId,
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
    QRCode.toDataURL(reference, { margin: 1, width: 164, color: { dark: "#1A1916", light: "#FFFFFF" } })
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
      <PartPlaceholder className="h-36 rounded-[14px]" />
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
          <SecondaryButton className="h-9 w-full text-xs" onClick={() => openStockLabel(item, qrDataUrl, true)}>
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
        <TracePanel title="Origine des pièces" icon={FileText}>
          {entries.length ? (
            <div className="overflow-x-auto">
              <table className={`${tableClassName} min-w-[760px]`}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Fournisseur</th>
                    <th className="px-3 py-2">Facture</th>
                    <th className="px-3 py-2">Achat</th>
                    <th className="px-3 py-2 text-right">Qté entrée</th>
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
          <SecondaryButton className="h-10 w-full" onClick={() => openStockLabel(item, qrDataUrl, false)}>
            <Tags className="size-4" />
            Étiquette
          </SecondaryButton>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton className="h-10 w-full" onClick={() => openStockLabel(item, qrDataUrl, true)}>
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
    </Panel>
  );
}

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
