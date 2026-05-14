"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import { Filter, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { type DeviceType, formatEuro, type StockItem, useBeharStore } from "@/lib/behar-store";
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

export function StockWorkspace() {
  const store = useBeharStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

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
      fitScreen
      searchPlaceholder="Rechercher..."
      title="Stock"
      subtitle="Pièces, composants et fournisseurs de votre atelier."
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <section className="grid shrink-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {dynamicKpis.map((kpi) => (
            <StockMetricCard {...kpi} key={kpi.label} />
          ))}
        </section>

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_350px]">
          <TableShell className="min-h-[620px] md:h-full md:min-h-0">
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
            {/* Vue cartes mobile */}
            <div className="md:hidden divide-y divide-[#E7E4DC]">
              {filteredItems.map((item) => {
                const margin = item.salePrice - item.purchasePrice;
                const rate = item.salePrice > 0 ? (margin / item.salePrice) * 100 : 0;
                return (
                  <button
                    key={item.id}
                    className={`block w-full text-left px-4 py-3 transition active:bg-[#F6F7F4] ${item.id === selected?.id ? "bg-[#EAF6F2]" : "bg-white"}`}
                    onClick={() => store.setSelected("stockItem", item.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#1A1916] text-sm truncate">{item.name}</p>
                        <p className="mt-0.5 text-[#6B6B6B] text-xs truncate">
                          {item.sku} · {item.categoryName}
                        </p>
                        <p className="mt-0.5 text-[#8A8984] text-[11px] truncate">
                          {item.brandName || "Non défini"} · {item.compatibleModels.length ? item.compatibleModels.join(", ") : "Non défini"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-[#1A1916] text-sm">{formatEuro(item.salePrice)}</p>
                        {canViewMargin && (
                          <p className="text-[#2A9D8F] text-[11px] font-medium">{rate.toFixed(1).replace(".", ",")} %</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[#6B6B6B] text-[11px]">Stock&nbsp;<span className="font-semibold text-[#1A1916]">{item.quantity}</span> / Seuil {item.threshold}</span>
                      {item.quantity === 0 && <StatusBadge className="h-5 px-1.5 text-[10px]" status="Rupture" />}
                      {item.quantity > 0 && item.quantity <= item.threshold && (
                        <StatusBadge className="h-5 px-1.5 text-[10px]" status="Stock faible" />
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <p className="px-4 py-8 text-center text-[#6B6B6B] text-sm">Aucune pièce.</p>
              )}
            </div>
          </TableShell>

          {selected && <StockDetail item={selected} />}
        </section>
      </div>

      {open && <StockModal onClose={() => setOpen(false)} />}
    </PageShell>
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
    <Panel className="flex min-h-0 flex-col overflow-hidden rounded-[14px] p-4 md:h-full">
      <div className="mb-4 shrink-0">
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
      <PartPlaceholder className="h-40 shrink-0 rounded-[14px]" />
      <dl className="mt-4 min-h-0 flex-1 divide-y divide-[#E7E4DC] overflow-hidden">
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
            <select
              className={`${textInputClass} min-h-24`}
              multiple
              onChange={(event) => {
                const modelIds = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                store.updateStockItem(item.id, { modelIds, compatibleModels: modelIds });
              }}
              disabled={!canManageStock}
              value={item.modelIds}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="Autre">Autre</option>
            </select>
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
      <div className="mt-4 grid shrink-0 gap-2 border-[#E7E4DC] border-t pt-4">
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-4 backdrop-blur-sm">
      <Panel className="mx-auto my-8 max-h-[calc(100svh-4rem)] max-w-2xl overflow-y-auto p-6">
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
            const modelIds = data.getAll("modelIds").map(String).filter(Boolean);
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
            }}
            value={deviceType}
          >
            {["Smartphone", "Tablette", "Ordinateur", "Console"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select
            className="h-11 rounded-xl border border-black/[0.08] px-3"
            onChange={(event) => setBrandName(event.target.value)}
            value={brandName}
          >
            {availableBrands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b.brand}
              </option>
            ))}
            <option value="Autre">Autre</option>
          </select>

          <label className="text-[#6B6B6B] text-sm md:col-span-2">
            Modèles compatibles
            <select
              className="mt-1 min-h-28 w-full rounded-xl border border-black/[0.08] px-3 py-2"
              multiple
              name="modelIds"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="Autre">Autre</option>
            </select>
          </label>
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
