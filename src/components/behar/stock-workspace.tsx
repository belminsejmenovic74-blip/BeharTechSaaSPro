"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Filter, Package, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { type DeviceType, formatEuro, type StockItem, useBeharStore } from "@/lib/behar-store";
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
import { cn } from "@/lib/utils";
import { stockKpis } from "@/mock/stock";

import { type DeviceCategory, getDeviceBrands, getModelsByBrand } from "../../data/deviceCatalog";
import { PageShell } from "./page-shell";
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

function findLinkedTariff(item: StockItem, priceBookItems: PriceBookItem[]) {
  return priceBookItems.find((entry) => entry.id === item.priceBookItemId || entry.stockItemId === item.id)
    ?? priceBookItems.find((entry) => Boolean(item.sku) && entry.sku === item.sku);
}

function tariffPriceLabel(item: StockItem, priceBookItems: PriceBookItem[]) {
  const tariff = findLinkedTariff(item, priceBookItems);
  if (!tariff) return "Non défini dans les tarifs";
  return formatEuro(tariff.prixVentePiece || tariff.prixClientTotal);
}

function tariffHelperLabel(item: StockItem, priceBookItems: PriceBookItem[]) {
  const tariff = findLinkedTariff(item, priceBookItems);
  if (!tariff) return "À définir dans Tarifs / Prestations";
  if (tariff.prixClientTotal > 0 && tariff.prixClientTotal !== tariff.prixVentePiece) {
    return `Prestation ${formatEuro(tariff.prixClientTotal)}`;
  }
  return "Lecture seule depuis Tarifs";
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
    if (!trimmed || selected.includes(trimmed)) { setInput(""); return; }
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
            <span key={model} className="inline-flex items-center gap-1 rounded-full bg-[#EAF6F2] px-2.5 py-1 text-[12px] font-medium text-[#147065]">
              {model}
              {!disabled && (
                <button type="button" onClick={() => remove(model)}
                  className="ml-0.5 grid size-3.5 place-items-center rounded-full hover:bg-[#2A9D8F] hover:text-white transition"
                  aria-label={`Retirer ${model}`}>
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
            {availableModels.filter((m) => !selected.includes(m)).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <div className="flex gap-1.5">
            <input
              list={listId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
              placeholder={availableModels.length > 0 ? "Sélectionner ou saisir…" : "Saisir un modèle…"}
              className="h-9 flex-1 rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-[13px] text-[#1A1916] outline-none transition placeholder:text-[#8A8984] focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
            />
            <button
              type="button"
              onClick={() => add(input)}
              disabled={!input.trim()}
              className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#EAF6F2] text-[#2A9D8F] transition hover:bg-[#2A9D8F] hover:text-white disabled:opacity-40"
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
      item.supplier.toLowerCase().includes(q);
    
    if (filterLowStock && item.quantity > item.threshold) return false;
    return matchesSearch;
  });

  const selected = filteredItems.find((item) => item.id === store.selectedStockItemId) ?? filteredItems[0];
  const canManageStock = store.hasPermission("canManageStock");
  const canUseStockItem = store.hasPermission("canUseStockItem");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");
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
              <span className={cn(
                "grid size-9 place-items-center rounded-[10px]",
                kpi.negative ? "bg-[#FDECEC] text-[#B42318]" : "bg-[#EAF6F2] text-[#2A9D8F]",
              )}>
                <Package className="size-[18px]" strokeWidth={2} />
              </span>
              <p className="mt-3 text-[#8A8984] text-[11px] font-medium leading-tight tracking-tight">
                {kpi.label}
              </p>
              <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tracking-tight tabular-nums">
                {kpi.value}
              </p>
              {kpi.helper && (
                <p className="mt-1.5 truncate text-[#8A8984] text-[10px] font-medium">{kpi.helper}</p>
              )}
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
            <div className="sticky top-0 z-10 flex items-center gap-3 border-[#E7E4DC] border-b bg-white p-3">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
                <input
                  className="h-10 w-full rounded-[13px] border border-[#E7E4DC] bg-white pr-4 pl-10 text-[#1A1916] text-sm outline-none transition placeholder:text-[#8A8984] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
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
              <span className="hidden 2xl:inline-flex">
                <StockImportModal />
              </span>
              <SecondaryButton
                className={filterLowStock ? "border-[#2A9D8F] bg-[#EAF6F2] text-[#1A1916]" : ""}
                onClick={() => setFilterLowStock(!filterLowStock)}
              >
                <Filter className="size-4" />
                {filterLowStock ? "Stock faible uniquement" : "Tous les stocks"}
              </SecondaryButton>
            </div>
            <table className={`${tableClassName} hidden md:table min-w-[1320px]`}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className="px-4 py-3">Pièce</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Marque</th>
                  <th className="px-4 py-3">Modèles</th>
                  <th className="px-4 py-3">Catégorie</th>
                  {canViewPurchasePrice && <th className="px-4 py-3">Prix d'achat</th>}
                  <th className="px-4 py-3">Prix client indicatif</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Seuil</th>
                  {canViewSupplier && <th className="px-4 py-3">Fournisseur</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const tariff = findLinkedTariff(item, store.priceBookItems);
                  return (
                    <tr
                      className={`cursor-pointer transition hover:bg-[#FAFAF8] ${item.id === selected?.id ? "bg-[#EAF6F2]" : ""}`}
                      key={item.id}
                      onClick={() => store.setSelected("stockItem", item.id)}
                    >
                      <td className={`${tableCellClassName} py-2.5 font-semibold`}>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-[10px] bg-[#F1F1EF] text-[#2A9D8F]">
                            <span className="block h-6 w-3 rounded-sm bg-[#1A1916]/80" />
                          </span>
                          {item.name}
                        </div>
                      </td>
                      <td className={`${tableCellClassName} py-2.5`}>{item.sku}</td>
                      <td className={`${tableCellClassName} py-2.5`}>{item.deviceType}</td>
                      <td className={`${tableCellClassName} py-2.5`}>{item.brandName || "Non défini"}</td>
                      <td className={`${tableCellClassName} max-w-[220px] py-2.5`}>
                        {item.compatibleModels.length ? item.compatibleModels.join(", ") : "Non défini"}
                      </td>
                      <td className={`${tableCellClassName} py-2.5`}>{item.categoryName}</td>
                      {canViewPurchasePrice && <td className={`${tableCellClassName} py-2.5`}>{formatEuro(item.purchasePrice)}</td>}
                      <td className={`${tableCellClassName} py-2.5`}>
                        <div className="flex flex-col">
                          <span className={cn("font-semibold", tariff ? "text-[#1A1916]" : "text-[#8A8984]")}>
                            {tariffPriceLabel(item, store.priceBookItems)}
                          </span>
                          <span className="mt-1 text-[10px] font-medium text-[#167B70]">
                            {tariffHelperLabel(item, store.priceBookItems)}
                          </span>
                        </div>
                      </td>
                      <td className={`${tableCellClassName} py-2.5`}>
                        <span className="font-semibold">{item.quantity}</span>
                        {item.quantity === 0 && <StatusBadge className="ml-2 h-6 px-2 text-[11px]" status="Rupture" />}
                        {item.quantity > 0 && item.quantity <= item.threshold && (
                          <StatusBadge className="ml-2 h-6 px-2 text-[11px]" status="Stock faible" />
                        )}
                      </td>
                      <td className={`${tableCellClassName} py-2.5`}>{item.threshold}</td>
                      {canViewSupplier && <td className={`${tableCellClassName} py-2.5`}>
                        <div className="flex flex-col">
                          <span>{item.supplier}</span>
                          {item.priceBookItemId && (
                            <span className="text-[10px] text-[#167B70] font-medium flex items-center gap-1 mt-1">
                              <span className="size-1.5 rounded-full bg-[#167B70]" />
                              Catalogue Prix lié
                            </span>
                          )}
                        </div>
                      </td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Vue cartes mobile premium */}
            <div className="md:hidden space-y-2.5 p-3 bg-[#FAFAF8]">
              {filteredItems.length === 0 ? (
                <p className="rounded-[16px] bg-white px-4 py-10 text-center text-[#6B6B6B] text-sm shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  Aucune pièce.
                </p>
              ) : filteredItems.map((item) => {
                const tariff = findLinkedTariff(item, store.priceBookItems);
                const isOut = item.quantity === 0;
                const isLow = item.quantity > 0 && item.quantity <= item.threshold;
                return (
                  <button
                    key={item.id}
                    className="block w-full rounded-[18px] bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                    onClick={() => {
                      store.setSelected("stockItem", item.id);
                      setMobileDetailOpen(true);
                    }}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-[14px]",
                        isOut ? "bg-[#FDECEC] text-[#B42318]" : "bg-[#FAFAF8] text-[#1A1916]",
                      )}>
                        <Package className="size-[20px]" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                            {item.name}
                          </p>
                          {(isOut || isLow) && (
                            <span className={cn(
                              "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              isOut ? "bg-[#FDECEC] text-[#B42318]" : "bg-[#FFF4E5] text-[#9A6A17]",
                            )}>
                              {isOut ? <AlertTriangle className="size-3" /> : null}
                              {isOut ? "Rupture" : "Stock bas"}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[#8A8984] text-[11.5px]">
                          SKU {item.sku} · {item.categoryName}
                        </p>
                        <div className="mt-2.5 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[#8A8984] text-[10px] font-medium uppercase tracking-wider">Stock</p>
                            <p className={cn(
                              "mt-0.5 font-semibold text-[14px] tabular-nums",
                              isOut ? "text-[#B42318]" : isLow ? "text-[#9A6A17]" : "text-[#2A9D8F]",
                            )}>
                              {item.quantity}
                            </p>
                          </div>
                          {canViewPurchasePrice && (
                            <div>
                              <p className="text-[#8A8984] text-[10px] font-medium uppercase tracking-wider">Achat</p>
                              <p className="mt-0.5 font-semibold text-[#1A1916] text-[14px] tabular-nums">
                                {formatEuro(item.purchasePrice)}
                              </p>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[#8A8984] text-[10px] font-medium uppercase tracking-wider">Tarif</p>
                            <p className={cn("mt-0.5 truncate font-semibold text-[13px] tabular-nums", tariff ? "text-[#1A1916]" : "text-[#8A8984]")}>
                              {tariff ? tariffPriceLabel(item, store.priceBookItems) : "Non défini"}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-[#2A9D8F] text-[11px] font-medium">
                          {tariffHelperLabel(item, store.priceBookItems)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
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
            className="absolute inset-0 bg-[#1A1916]/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Fermer"
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] flex flex-col rounded-t-[28px] bg-white shadow-[0_-20px_60px_rgba(26,25,22,0.18)] animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <span className="h-1 w-9 rounded-full bg-[#D1CFCA]" aria-hidden />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-3 shrink-0 border-b border-[#F1F1EF]">
              <p className="font-semibold text-[#1A1916] text-[17px] truncate">{selected.name}</p>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-[#F1F1EF] text-[#6B6B6B] active:scale-90 shrink-0"
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
  const canManageStock = store.hasPermission("canManageStock");
  const canUseStockItem = store.hasPermission("canUseStockItem");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const tariff = findLinkedTariff(item, store.priceBookItems);
  const categoryMapping: Record<string, DeviceCategory> = {
    Smartphone: "smartphone",
    Tablette: "tablet",
    Ordinateur: "computer",
    Console: "console",
  };
  const category = categoryMapping[item.deviceType] || "smartphone";
  const availableBrands = getDeviceBrands(category);
  const availableModels = getModelsByBrand(item.brandName || "", category);
  const availableCategories = store.partCategories.filter((cat) => cat.deviceTypes.includes(item.deviceType));

  const inputClass = "h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-right text-[15px] text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const textInputClass = "h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-[15px] text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const rowClass = "flex items-start justify-between gap-3 py-3 border-b border-[#F1F1EF] last:border-0";
  const labelClass = "shrink-0 w-[110px] text-[#6B6B6B] text-[13px] pt-2.5 font-medium";

  return (
    <div className="px-4 pb-10 pt-3">
      <StatusBadge
        className="mb-3"
        status={item.stock === 0 ? "Rupture" : item.stock <= item.threshold ? "Stock faible" : "En stock"}
      />
      {item.stock <= item.threshold && (
        <p className="mb-3 rounded-[12px] bg-[#FFF4DE] px-3 py-2 text-[#9A6A17] text-sm">
          Alerte stock bas : réapprovisionnement conseillé.
        </p>
      )}

      <PartPlaceholder className="h-36 rounded-[16px] mb-4" />

      {/* Fields */}
      <div className="rounded-[16px] border border-[#F1F1EF] bg-[#FAFAF8] px-4 divide-y divide-[#F1F1EF] mb-4">
        <div className={rowClass}>
          <span className={labelClass}>Référence</span>
          <input className={textInputClass} value={item.sku} readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { sku: e.target.value })} />
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Type</span>
          <select className={textInputClass} value={item.deviceType} disabled={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { deviceType: e.target.value as StockItem["deviceType"], brandId: undefined, brandName: undefined, modelIds: [], compatibleModels: [] })}>
            {["Smartphone", "Tablette", "Ordinateur", "Console"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Marque</span>
          <select className={textInputClass} value={item.brandName ?? ""} disabled={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { brandId: e.target.value, brandName: e.target.value, modelIds: [], compatibleModels: [] })}>
            <option value="">Générique</option>
            {availableBrands.map((b) => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
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
          <select className={textInputClass} value={item.categoryId} disabled={!canManageStock}
            onChange={(e) => { const cat = store.partCategories.find((c) => c.id === e.target.value); store.updateStockItem(item.id, { categoryId: cat?.id, categoryName: cat?.name }); }}>
            {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {canViewPurchasePrice && (
          <div className={rowClass}>
            <span className={labelClass}>Prix d'achat</span>
            <input className={inputClass} type="number" min={0} step="0.01" value={item.purchasePrice} readOnly={!canManageStock}
              onChange={(e) => store.updateStockItem(item.id, { purchasePrice: Math.max(0, Number(e.target.value)) })} />
          </div>
        )}
        <div className={rowClass}>
          <span className={labelClass}>Prix client</span>
          <div className="flex-1 rounded-[12px] border border-[#E7E4DC] bg-white px-3 py-2 text-right">
            <p className={cn("text-[15px] font-semibold", tariff ? "text-[#1A1916]" : "text-[#8A8984]")}>
              {tariffPriceLabel(item, store.priceBookItems)}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[#167B70]">{tariffHelperLabel(item, store.priceBookItems)}</p>
          </div>
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Stock actuel</span>
          <input className={inputClass} type="number" min={0} value={item.quantity} readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { quantity: Math.max(0, Number(e.target.value)) })} />
        </div>
        <div className={rowClass}>
          <span className={labelClass}>Seuil d'alerte</span>
          <input className={inputClass} type="number" min={0} value={item.threshold} readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { threshold: Math.max(0, Number(e.target.value)) })} />
        </div>
        {canViewSupplier && (
          <div className={rowClass}>
            <span className={labelClass}>Fournisseur</span>
            <input className={textInputClass} value={item.supplier} readOnly={!canManageStock}
              onChange={(e) => store.updateStockItem(item.id, { supplier: e.target.value })} />
          </div>
        )}
        <div className={rowClass}>
          <span className={labelClass}>Délai moyen</span>
          <input className={textInputClass} value={item.leadTime} readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { leadTime: e.target.value })} />
        </div>
      </div>

      {/* Actions */}
      <div className="grid gap-2">
        <PrimaryButton className="h-12 w-full text-[15px]" disabled={!canManageStock}
          onClick={() => {
            const qty = Number(window.prompt("Quantité à ajouter au stock", "5") || 0);
            if (!Number.isFinite(qty) || qty <= 0) { toast.error("Quantité invalide"); return; }
            store.restockItem(item.id, qty);
            toast.success("Stock mis à jour");
          }}>
          Réapprovisionner
        </PrimaryButton>
        <select
          className="h-11 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-[15px] text-[#1A1916] outline-none"
          disabled={store.repairs.length === 0}
          value={targetRepairId}
          onChange={(e) => setTargetRepairId(e.target.value)}>
          <option value="">Sélectionnez une réparation</option>
          {store.repairs.map((r) => <option key={r.id} value={r.id}>{r.number} - {r.device} ({r.status})</option>)}
        </select>
        <SecondaryButton className="h-11 w-full" disabled={store.repairs.length === 0 || !canUseStockItem}
          onClick={() => {
            const repair = store.repairs.find((r) => r.id === targetRepairId);
            if (!repair) { toast.error("Sélectionnez une réparation."); return; }
            if (!window.confirm(`Utiliser 1 x ${item.name} sur ${repair.number} ?`)) return;
            const ok = store.addPartToRepair(repair.id, item.id, 1);
            toast[ok ? "success" : "error"](ok ? `Pièce ajoutée à ${repair.device}` : `Stock insuffisant`);
          }}>
          Utiliser dans une réparation
        </SecondaryButton>
        {item.priceBookItemId && (
          <SecondaryButton className="h-11 w-full" onClick={() => { router.push("/dashboard/parametres/catalogue"); onClose(); }}>
            Voir dans Catalogue Prix
          </SecondaryButton>
        )}
        <SecondaryButton className="h-11 w-full text-[#B42318]" disabled={!canManageStock}
          onClick={() => {
            if (window.confirm("Supprimer cette pièce ?")) {
              store.deleteStockItem(item.id);
              toast.success("Pièce supprimée");
              onClose();
            }
          }}>
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
  const canManageStock = store.hasPermission("canManageStock");
  const canUseStockItem = store.hasPermission("canUseStockItem");
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const tariff = findLinkedTariff(item, store.priceBookItems);
  const categoryMapping: Record<string, DeviceCategory> = {
    Smartphone: "smartphone",
    Tablette: "tablet",
    Ordinateur: "computer",
    Console: "console",
  };
  const category = categoryMapping[item.deviceType] || "smartphone";
  const availableBrands = getDeviceBrands(category);
  const availableModels = getModelsByBrand(item.brandName || "", category);
  const availableCategories = store.partCategories.filter((cat) => cat.deviceTypes.includes(item.deviceType));

  const inputClass =
    "h-9 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-right text-sm text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const textInputClass =
    "h-9 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-sm text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  return (
    <Panel className="overflow-y-auto rounded-[14px] p-4 md:max-h-[calc(100vh-11rem)]">
      <div className="mb-4">
        <input
          className={`${textInputClass} h-11 font-semibold text-xl`}
          onChange={(event) => store.updateStockItem(item.id, { name: event.target.value })}
          readOnly={!canManageStock}
          value={item.name}
        />
        <StatusBadge
          className="mt-3"
          status={item.stock === 0 ? "Rupture" : item.stock <= item.threshold ? "Stock faible" : "En stock"}
        />
        {item.stock <= item.threshold && (
          <p className="mt-2 rounded-[10px] bg-[#FFF4DE] px-3 py-2 text-[#9A6A17] text-sm">
            Alerte stock bas : réapprovisionnement conseillé.
          </p>
        )}
      </div>
      <PartPlaceholder className="h-36 rounded-[14px]" />
      <dl className="mt-4 divide-y divide-[#E7E4DC]">
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
            <div className="rounded-[10px] border border-[#E7E4DC] bg-white px-3 py-2 text-right">
              <p className={cn("text-sm font-semibold", tariff ? "text-[#1A1916]" : "text-[#8A8984]")}>
                {tariffPriceLabel(item, store.priceBookItems)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-[#167B70]">{tariffHelperLabel(item, store.priceBookItems)}</p>
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
      <div className="mt-4 grid gap-2 border-[#E7E4DC] border-t pt-4">
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
          className="h-9 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-sm text-[#1A1916] outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
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
        {item.priceBookItemId && (
          <div className="rounded-[10px] bg-[#E8F7F3] px-3 py-2 text-[#167B70] text-sm flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#167B70] shrink-0" />
            <span className="font-medium">Prix catalogue lié</span>
          </div>
        )}
        <SecondaryButton
          className="h-10 w-full"
          disabled={!item.priceBookItemId}
          onClick={() => {
            router.push("/dashboard/parametres/catalogue");
          }}
        >
          Voir dans Catalogue Prix
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
      <div className="flex h-full flex-col justify-center gap-1">
        <p className="text-[#8A8984] text-[13px]">{label}</p>
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
        <p className="mt-0.5 text-[#B0AEA8] text-[12px]">{helper}</p>
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

  const categoryMapping: Record<string, DeviceCategory> = {
    Smartphone: "smartphone",
    Tablette: "tablet",
    Ordinateur: "computer",
    Console: "console",
  };

  const category = categoryMapping[deviceType] || "smartphone";
  const availableBrands = getDeviceBrands(category);
  const availableModels = getModelsByBrand(brandName, category);
  const availableCategories = store.partCategories.filter((cat) =>
    cat.deviceTypes.includes(deviceType as DeviceType),
  );
  const selectedCategory = store.partCategories.find((cat) => cat.id === categoryId);
  const categoryName = selectedCategory?.name ?? "";

  // Qualités contextuelles : OLED uniquement pour Écran, etc.
  const availableQualities = useMemo(() => getQualitiesForCategory(categoryName), [categoryName]);
  // La qualité réelle envoyée au système : si "Autre", on prend le texte libre.
  const effectiveQuality = quality === "Autre" ? customQuality.trim() : quality;

  // Auto-suggérés (s'appliquent tant que l'utilisateur n'a pas overridé).
  const suggestedName = useMemo(
    () => suggestStockName({ brand: brandName, model: selectedModel, category: categoryName, quality: effectiveQuality }),
    [brandName, selectedModel, categoryName, effectiveQuality],
  );
  const suggestedSku = useMemo(
    () => suggestStockSku({ brand: brandName, model: selectedModel, category: categoryName, quality: effectiveQuality }),
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-0 backdrop-blur-sm md:p-4">
      <Panel className="mx-auto my-0 min-h-svh max-w-none overflow-y-auto rounded-none p-5 md:my-8 md:max-h-[calc(100svh-4rem)] md:max-w-2xl md:min-h-0 md:rounded-[20px] md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-2xl text-[#1A1916]">Nouvelle pièce</h2>
            <p className="mt-1 text-[#6B6B6B] text-[13px]">
              Sélection guidée : marque → modèle → catégorie → gamme.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-[#F1F1EF] text-[#1A1916] active:scale-90"
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
          {/* Type d'appareil */}
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Type</span>
            <select
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
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
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
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
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
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
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
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
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
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
                className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
                placeholder="Ex : Service Pack"
                value={customQuality}
                onChange={(e) => setCustomQuality(e.target.value)}
              />
            </label>
          )}

          {/* Aperçu auto-rempli (nom / SKU) avec override possible */}
          <div className="rounded-xl border border-[#E7E4DC] bg-[#FAFAF8] p-3 md:col-span-2">
            <p className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">
              Auto-rempli
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="block">
                <span className="text-[#6B6B6B] text-[11px]">Nom (modifiable)</span>
                <input
                  type="text"
                  className="mt-1 h-10 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-[13.5px] outline-none focus:border-[#2A9D8F]"
                  placeholder={suggestedName || "Sélectionnez un modèle"}
                  value={nameOverride}
                  onChange={(e) => setNameOverride(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[#6B6B6B] text-[11px]">SKU (modifiable)</span>
                <input
                  type="text"
                  className="mt-1 h-10 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-[13.5px] font-mono outline-none focus:border-[#2A9D8F]"
                  placeholder={suggestedSku || "Sélectionnez un modèle"}
                  value={skuOverride}
                  onChange={(e) => setSkuOverride(e.target.value)}
                />
              </label>
            </div>
          </div>

          {!linkedPriceBook && selectedModel && (
            <div className="rounded-xl border border-[#E7E4DC] bg-white p-3 text-[12px] text-[#6B6B6B] md:col-span-2">
              Aucun tarif client lié pour cette sélection. Vous pourrez en créer un dans
              Paramètres → Tarifs / Prestations.
            </div>
          )}

          {/* Données internes : prix achat, fournisseur, quantité, seuil */}
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Fournisseur</span>
            <input
              type="text"
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              placeholder="UTOPYA, etc."
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Prix d'achat atelier</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
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
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">Seuil d'alerte</span>
            <input
              type="number"
              min="0"
              className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] bg-white px-3 text-[14px] outline-none focus:border-[#2A9D8F]"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </label>

          <div className="rounded-xl border border-[#E7E4DC] bg-[#FAFAF8] px-3 py-2.5 text-[12.5px] text-[#6B6B6B] md:col-span-2">
            Le prix client est défini dans <strong>Paramètres → Tarifs / Prestations</strong>.
            Stock = inventaire interne, Catalogue = tarifs client.
          </div>

          <div className="flex justify-end gap-2 md:col-span-2">
            <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
            <PrimaryButton type="submit">
              {existingStock ? "Mettre à jour le stock" : "Ajouter la pièce"}
            </PrimaryButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
