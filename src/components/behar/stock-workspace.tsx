"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Filter, Package, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { type DeviceType, formatEuro, type StockItem, useBeharStore } from "@/lib/behar-store";
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
  const canViewMargin = store.hasPermission("canViewMargin");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const stockValue = store.stockItems.reduce((total, item) => total + item.purchasePrice * item.quantity, 0);
  const lowStockCount = store.stockItems.filter((item) => item.quantity > 0 && item.quantity <= item.threshold).length;
  const outCount = store.stockItems.filter((item) => item.quantity === 0).length;
  const averageMargin =
    store.stockItems.length > 0
      ? store.stockItems.reduce((total, item) => {
          const margin = item.salePrice - item.purchasePrice;
          return total + (item.salePrice > 0 ? (margin / item.salePrice) * 100 : 0);
        }, 0) / store.stockItems.length
      : 0;
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
      return { ...base, value: canViewMargin ? `${averageMargin.toFixed(0)} %` : "Masqué", helper: "sur prix de vente" };
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
                  <th className="px-4 py-3">Prix de vente</th>
                  {canViewMargin && <th className="px-4 py-3">Marge</th>}
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Seuil</th>
                  {canViewSupplier && <th className="px-4 py-3">Fournisseur</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const margin = item.salePrice - item.purchasePrice;
                  const rate = item.salePrice > 0 ? (margin / item.salePrice) * 100 : 0;
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
                      <td className={`${tableCellClassName} py-2.5`}>{formatEuro(item.salePrice)}</td>
                      {canViewMargin && <td className={`${tableCellClassName} py-2.5`}>
                        <span className="font-semibold">{formatEuro(margin)}</span>
                        <br />
                        <span className="text-[#2A9D8F] text-xs">{rate.toFixed(1).replace(".", ",")} %</span>
                      </td>}
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
                const margin = item.salePrice - item.purchasePrice;
                const rate = item.salePrice > 0 ? (margin / item.salePrice) * 100 : 0;
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
                          <div>
                            <p className="text-[#8A8984] text-[10px] font-medium uppercase tracking-wider">Vente</p>
                            <p className="mt-0.5 font-semibold text-[#1A1916] text-[14px] tabular-nums">
                              {formatEuro(item.salePrice)}
                            </p>
                          </div>
                        </div>
                        {canViewMargin && rate > 0 && (
                          <p className="mt-2 text-[#2A9D8F] text-[11px] font-medium">
                            Marge {rate.toFixed(0)} %
                          </p>
                        )}
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
  const canViewMargin = store.hasPermission("canViewMargin");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const margin = item.salePrice - item.purchasePrice;
  const rate = item.salePrice > 0 ? (margin / item.salePrice) * 100 : 0;
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
          <span className={labelClass}>Prix de vente</span>
          <input className={inputClass} type="number" min={0} step="0.01" value={item.salePrice} readOnly={!canManageStock}
            onChange={(e) => store.updateStockItem(item.id, { salePrice: Math.max(0, Number(e.target.value)) })} />
        </div>
        {canViewMargin && (
          <div className={rowClass}>
            <span className={labelClass}>Marge brute</span>
            <span className="pt-2 text-[15px] font-semibold text-[#1A1916]">{formatEuro(margin)} <span className="text-[#2A9D8F] font-medium text-[13px]">({rate.toFixed(1).replace(".", ",")} %)</span></span>
          </div>
        )}
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
  const canViewMargin = store.hasPermission("canViewMargin");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const margin = item.salePrice - item.purchasePrice;
  const rate = item.salePrice > 0 ? (margin / item.salePrice) * 100 : 0;
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
          label="Prix de vente"
          value={
            <input
              className={inputClass}
              min={0}
              onChange={(event) =>
                store.updateStockItem(item.id, { salePrice: Math.max(0, Number(event.target.value)) })
              }
              readOnly={!canManageStock}
              step="0.01"
              type="number"
              value={item.salePrice}
            />
          }
        />
        {canViewMargin && (
          <DetailRow
            className="py-2"
            label="Marge brute"
            value={`${formatEuro(margin)} / ${rate.toFixed(1).replace(".", ",")} %`}
          />
        )}
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
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-0 backdrop-blur-sm md:p-4">
      <Panel className="mx-auto my-0 min-h-svh max-w-none overflow-y-auto rounded-none p-5 md:my-8 md:max-h-[calc(100svh-4rem)] md:max-w-2xl md:min-h-0 md:rounded-[20px] md:p-6">
        <h2 className="font-semibold text-2xl text-[#1A1916]">Nouvelle pièce</h2>
        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name") || "").trim();
            if (!name) {
              toast.error("Nom de la pièce requis.");
              return;
            }
            const purchasePrice = Math.max(0, Number(data.get("purchasePrice") || 0));
            const salePrice = Math.max(0, Number(data.get("salePrice") || 0));
            const quantity = Math.max(0, Number(data.get("stock") || 0));
            const threshold = Math.max(0, Number(data.get("threshold") || 0));
            const category = store.partCategories.find((entry) => entry.id === categoryId);
            const modelIds = selectedModels;
            store.addStockItem({
              sku: String(data.get("sku") || `REF-${Date.now()}`),
              name,
              deviceType: deviceType as DeviceType,
              brandId: brandName,
              brandName: brandName,
              modelIds,
              compatibleModels: modelIds,
              categoryId: category?.id,
              categoryName: category?.name,
              supplier: String(data.get("supplier") || "Non renseigné"),
              purchasePrice,
              salePrice,
              quantity,
              threshold,
            });

            toast.success("Pièce ajoutée au stock.");
            onClose();
          }}
        >
          <input className="h-11 rounded-xl border border-black/[0.08] px-3" name="sku" placeholder="SKU" />
          <input
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            name="name"
            placeholder="Nom de la pièce"
          />
          <select
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            onChange={(event) => {
              const nextType = event.target.value;
              const category = categoryMapping[nextType] || "smartphone";
              const brands = getDeviceBrands(category);
              const firstBrand = brands[0]?.brand || "Autre";
              const firstCategory = store.partCategories.find((cat) =>
                cat.deviceTypes.includes(nextType as DeviceType),
              );
              setDeviceType(nextType);
              setBrandName(firstBrand);
              setCategoryId(firstCategory?.id ?? "cat_other");
              setSelectedModels([]);
            }}
            value={deviceType}
          >
            {["Smartphone", "Tablette", "Ordinateur", "Console"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            onChange={(event) => { setBrandName(event.target.value); setSelectedModels([]); }}
            value={brandName}
          >
            {availableBrands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b.brand}
              </option>
            ))}
            <option value="Autre">Autre</option>
          </select>

          <div className="md:col-span-2">
            <p className="mb-1.5 text-[#6B6B6B] text-sm font-medium">Modèles compatibles</p>
            <ModelSelector
              availableModels={availableModels}
              selected={selectedModels}
              onChange={(models) => {
                setSelectedModels(models);
                // Reset when brand/type changes — handled in brand/type onChange
              }}
            />
          </div>
          <select
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            name="supplier"
            placeholder="Fournisseur"
          />
          <input
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            name="purchasePrice"
            placeholder="Prix achat"
            type="number"
          />
          <input
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            name="salePrice"
            placeholder="Prix vente"
            type="number"
          />
          <input
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            name="stock"
            placeholder="Stock"
            type="number"
          />
          <input
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            name="threshold"
            placeholder="Seuil"
            type="number"
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
            <PrimaryButton type="submit">Ajouter</PrimaryButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
