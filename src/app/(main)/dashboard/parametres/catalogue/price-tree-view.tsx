"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  PRICE_BOOK_DEVICE_LABELS,
  extractPartQuality,
  type PriceBookDeviceType,
  type PriceBookItem,
} from "@/lib/price-book";
import { getDeviceSeries } from "@/lib/device-series";
import { getDefaultInterventionsByDeviceType, type InterventionDeviceType } from "@/lib/repair-intervention";
import type { DeviceBrand, DeviceModel, DeviceType } from "@/lib/behar-store";

const STORE_TYPE_TO_PRICEBOOK: Record<DeviceType, PriceBookDeviceType> = {
  Smartphone: "smartphone",
  Tablette: "tablet",
  Ordinateur: "computer",
  Console: "console",
  Autre: "other",
};

export function PriceTreeView({
  items,
  deviceModels = [],
  deviceBrands = [],
  onEdit,
  onPatch,
  onDelete,
}: Readonly<{
  items: PriceBookItem[];
  deviceModels?: DeviceModel[];
  deviceBrands?: DeviceBrand[];
  onEdit: (item: PriceBookItem) => void;
  onPatch: (id: string, patch: Partial<PriceBookItem>) => void;
  onDelete: (item: PriceBookItem) => void;
}>) {
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({});
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({});
  const [openSeries, setOpenSeries] = useState<Record<string, boolean>>({});
  const [openModels, setOpenModels] = useState<Record<string, boolean>>({});
  const [openInterventions, setOpenInterventions] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => {
    // Structure: Type -> Brand -> Series -> Model -> Intervention -> PriceBookItem[]
    const map = new Map<PriceBookDeviceType, Map<string, Map<string, Map<string, Map<string, PriceBookItem[]>>>>>();

    // 1. Initialiser avec TOUS les modèles connus (depuis le store / deviceCatalog)
    for (const model of deviceModels) {
      if (!model.isActive) continue;
      const brand = deviceBrands.find((b) => b.id === model.brandId);
      if (!brand) continue;

      const type = STORE_TYPE_TO_PRICEBOOK[model.deviceType] || "other";
      if (!map.has(type)) map.set(type, new Map());
      const brands = map.get(type)!;

      if (!brands.has(brand.name)) brands.set(brand.name, new Map());
      const seriesMap = brands.get(brand.name)!;

      const series = getDeviceSeries(brand.name, model.name);
      if (!seriesMap.has(series)) seriesMap.set(series, new Map());
      const models = seriesMap.get(series)!;

      if (!models.has(model.name)) models.set(model.name, new Map());
    }

    // 2. Remplir avec les prix existants
    for (const item of items) {
      if (!map.has(item.typeAppareil)) map.set(item.typeAppareil, new Map());
      const brands = map.get(item.typeAppareil)!;
      if (!brands.has(item.marque)) brands.set(item.marque, new Map());
      const seriesMap = brands.get(item.marque)!;
      const series = getDeviceSeries(item.marque, item.modele);
      if (!seriesMap.has(series)) seriesMap.set(series, new Map());
      const models = seriesMap.get(series)!;
      if (!models.has(item.modele)) models.set(item.modele, new Map());
      const interventions = models.get(item.modele)!;
      if (!interventions.has(item.reparation)) interventions.set(item.reparation, []);
      interventions.get(item.reparation)!.push(item);
    }
    return map;
  }, [items, deviceModels, deviceBrands]);


  return (
    <div className="space-y-3">
      {[...tree.entries()].map(([type, brands]) => {
        const typeKey = String(type);
        const typeOpen = openTypes[typeKey] ?? true;
        const brandCount = brands.size;
        const itemCount = [...brands.values()].reduce(
          (s, seriesMap) => s + [...seriesMap.values()].reduce(
            (sm, models) => sm + [...models.values()].reduce(
              (m, interventions) => m + [...interventions.values()].reduce(
                (i, list) => i + list.length, 0), 0), 0), 0);
        return (
          <div className="rounded-[18px] border border-[#E7E4DC] bg-white shadow-sm overflow-hidden" key={typeKey}>
            <button
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#FAFAF8]"
              onClick={() => setOpenTypes((prev) => ({ ...prev, [typeKey]: !typeOpen }))}
              type="button"
            >
              <span className="flex items-center gap-3">
                <div className={`flex size-8 items-center justify-center rounded-lg transition ${typeOpen ? "bg-[#E8F7F3] text-[#167B70]" : "bg-[#F1EFE8] text-[#6B6B6B]"}`}>
                  {typeOpen ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                </div>
                <span className="font-bold text-[#1A1916] text-base">
                  {PRICE_BOOK_DEVICE_LABELS[type]}
                </span>
              </span>
              <span className="bg-[#F1EFE8] px-2.5 py-1 rounded-full text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">
                {brandCount} marques · {itemCount} prix
              </span>
            </button>
            {typeOpen && (
              <div className="border-[#EFEDE6] border-t px-3 pb-3 pt-1 space-y-2">
                {[...brands.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0], "fr"))
                  .map(([brand, seriesMap]) => {
                    const brandKey = `${typeKey}::${brand}`;
                    const brandOpen = openBrands[brandKey] ?? false;
                    return (
                      <div
                        className="rounded-[14px] border border-[#EFEDE6] bg-[#FAFAF8]/50"
                        key={brandKey}
                      >
                        <button
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#FAFAF8]"
                          onClick={() => setOpenBrands((prev) => ({ ...prev, [brandKey]: !brandOpen }))}
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            {brandOpen ? (
                              <ChevronDown className="size-4 text-[#167B70]" />
                            ) : (
                              <ChevronRight className="size-4 text-[#6B6B6B]" />
                            )}
                            <span className="font-semibold text-[#1A1916] text-sm">{brand}</span>
                          </span>
                          <span className="text-[#6B6B6B] text-xs font-medium">
                            {seriesMap.size} séries
                          </span>
                        </button>
                        {brandOpen && (
                          <div className="space-y-3 px-3 pb-3">
                            {[...seriesMap.entries()]
                              .sort((a, b) => a[0].localeCompare(b[0], "fr"))
                              .map(([series, models]) => {
                                const seriesKey = `${brandKey}::${series}`;
                                const seriesOpen = openSeries[seriesKey] ?? false;
                                return (
                                  <div key={seriesKey} className="rounded-xl border border-[#EFEDE6] bg-white shadow-sm overflow-hidden">
                                    <button
                                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left bg-[#F1EFE8]/20 hover:bg-[#F1EFE8]/40 transition"
                                      onClick={() => setOpenSeries(p => ({ ...p, [seriesKey]: !seriesOpen }))}
                                      type="button"
                                    >
                                      <span className="flex items-center gap-2">
                                        {seriesOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                        <span className="font-bold text-[#1A1916] text-xs uppercase tracking-tight">{series}</span>
                                      </span>
                                      <span className="text-[#6B6B6B] text-[10px]">{models.size} modèles</span>
                                    </button>
                                    
                                    {seriesOpen && (
                                      <div className="p-2 space-y-2">
                                        {[...models.entries()]
                                          .sort((a, b) => a[0].localeCompare(b[0], "fr"))
                                          .map(([model, interventions]) => {
                                            const modelKey = `${seriesKey}::${model}`;
                                            const modelOpen = openModels[modelKey] ?? true;
                                            
                                            // Ajout des interventions standards manquantes
                                            const uiType = PRICE_BOOK_DEVICE_LABELS[type] as InterventionDeviceType;
                                            const standardList = getDefaultInterventionsByDeviceType(uiType);
                                            const finalInterventions = new Map(interventions);
                                            for (const std of standardList) {
                                              if (!finalInterventions.has(std)) {
                                                finalInterventions.set(std, []);
                                              }
                                            }

                                            return (
                                              <div
                                                className="rounded-[12px] border border-[#E7E4DC] bg-white overflow-hidden"
                                                key={modelKey}
                                              >
                                                <button
                                                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-[#FAFAF8]"
                                                  onClick={() => setOpenModels((p) => ({ ...p, [modelKey]: !modelOpen }))}
                                                  type="button"
                                                >
                                                  <span className="flex items-center gap-2">
                                                    {modelOpen ? <ChevronDown className="size-4 text-[#167B70]" /> : <ChevronRight className="size-4 text-[#6B6B6B]" />}
                                                    <span className="font-bold text-[#1A1916] text-sm">{model}</span>
                                                  </span>
                                                  <span className="text-[#6B6B6B] text-[11px] bg-[#F8F7F2] px-2 py-0.5 rounded-md">
                                                    {interventions.size} prix configurés
                                                  </span>
                                                </button>
                                                {modelOpen && (
                                                  <div className="border-[#EFEDE6] border-t divide-y divide-[#EFEDE6]">
                                                    {[...finalInterventions.entries()]
                                                      .sort((a, b) => {
                                                        // Sort standard interventions first based on BASE_INTERVENTIONS order
                                                        const idxA = standardList.indexOf(a[0]);
                                                        const idxB = standardList.indexOf(b[0]);
                                                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                                        if (idxA !== -1) return -1;
                                                        if (idxB !== -1) return 1;
                                                        return a[0].localeCompare(b[0], "fr");
                                                      })
                                                      .map(([reparation, list]) => {
                                                        const interventionKey = `${modelKey}::${reparation}`;
                                                        const interventionOpen = openInterventions[interventionKey] ?? false;
                                                        
                                                        const hasPrice = list.length > 0;
                                                        const prices = list.map(i => i.prixClientTotal);
                                                        const minPrice = hasPrice ? Math.min(...prices) : 0;
                                                        const maxPrice = hasPrice ? Math.max(...prices) : 0;
                                                        const priceRange = !hasPrice 
                                                          ? "À définir"
                                                          : minPrice === maxPrice 
                                                            ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(minPrice)
                                                            : `${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(minPrice)} - ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(maxPrice)}`;

                                                        return (
                                                          <div key={interventionKey} className="group">
                                                            <button
                                                              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-[#FAFAF8] ${!hasPrice ? "opacity-60" : ""}`}
                                                              onClick={() => setOpenInterventions(prev => ({ ...prev, [interventionKey]: !interventionOpen }))}
                                                              type="button"
                                                            >
                                                              <div className="flex items-center gap-2">
                                                                <div className={`flex size-5 items-center justify-center rounded-md transition ${interventionOpen ? "bg-[#E8F7F3] text-[#167B70]" : "text-[#6B6B6B]"}`}>
                                                                  {interventionOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                                                </div>
                                                                <span className="font-medium text-[#1A1916] text-sm">{reparation}</span>
                                                              </div>
                                                              <div className="flex items-center gap-4">
                                                                <span className={`${hasPrice ? "text-[#167B70] font-semibold" : "text-[#6B6B6B] italic font-normal"} text-sm`}>{priceRange}</span>
                                                                {hasPrice && (
                                                                  <span className="text-[#6B6B6B] text-[11px] opacity-0 group-hover:opacity-100 transition">
                                                                    {list.length} variante{list.length > 1 ? "s" : ""}
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </button>
                                                            
                                                            {interventionOpen && (
                                                              <div className="bg-[#FAFAF8]/40 overflow-x-auto">
                                                                {hasPrice ? (
                                                                  <table className="w-full min-w-[820px] text-sm">
                                                                    <thead className="bg-[#FAFAF8]/80 text-[#6B6B6B] text-[10px] uppercase tracking-wider font-bold">
                                                                      <tr>
                                                                        <th className="px-5 py-2 text-left">Variante / Pièce</th>
                                                                        <th className="px-3 py-2 text-left">Qualité</th>
                                                                        <th className="px-3 py-2 text-right">Achat</th>
                                                                        <th className="px-3 py-2 text-right">Vente pièce</th>
                                                                        <th className="px-3 py-2 text-right">M.O.</th>
                                                                        <th className="px-3 py-2 text-right text-[#167B70]">Prix client</th>
                                                                        <th className="px-3 py-2 text-center">Stock</th>
                                                                        <th className="px-3 py-2 text-left">Fournisseur / SKU</th>
                                                                        <th className="px-5 py-2 text-right">Actions</th>
                                                                      </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-[#EFEDE6]">
                                                                      {list.map((item) => (
                                                                        <PriceTreeRow
                                                                          item={item}
                                                                          qualityLabel={extractPartQuality(item)}
                                                                          key={item.id}
                                                                          onDelete={onDelete}
                                                                          onEdit={onEdit}
                                                                          onPatch={onPatch}
                                                                        />
                                                                      ))}
                                                                    </tbody>
                                                                  </table>
                                                                ) : (
                                                                  <div className="px-12 py-4 flex flex-col items-center justify-center text-center">
                                                                    <p className="text-[#6B6B6B] text-xs mb-2 italic">Aucun tarif défini pour cette intervention.</p>
                                                                    <button 
                                                                      onClick={() => {
                                                                        onEdit({ 
                                                                          id: "", 
                                                                          typeAppareil: type, 
                                                                          marque: brand, 
                                                                          modele: model, 
                                                                          reparation, 
                                                                          piece: reparation,
                                                                          qualite: "Standard",
                                                                          prixAchat: 0,
                                                                          prixVentePiece: 0,
                                                                          mainOeuvre: 0,
                                                                          prixClientTotal: 0,
                                                                          marge: 0,
                                                                          isActive: true,
                                                                          source: "manual",
                                                                          createdAt: new Date().toISOString(),
                                                                          updatedAt: new Date().toISOString()
                                                                        });
                                                                      }}
                                                                      className="text-[#167B70] text-[11px] font-bold hover:underline"
                                                                    >
                                                                      + Définir un prix maintenant
                                                                    </button>
                                                                  </div>
                                                                )}
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PriceTreeRow({
  item,
  qualityLabel,
  onEdit,
  onPatch,
  onDelete,
}: Readonly<{
  item: PriceBookItem;
  qualityLabel: string;
  onEdit: (item: PriceBookItem) => void;
  onPatch: (id: string, patch: Partial<PriceBookItem>) => void;
  onDelete: (item: PriceBookItem) => void;
}>) {
  const router = useRouter();
  const [achat, setAchat] = useState(String(item.prixAchat ?? ""));
  const [vente, setVente] = useState(String(item.prixVentePiece ?? ""));
  const [mo, setMo] = useState(String(item.mainOeuvre ?? ""));
  const [client, setClient] = useState(String(item.prixClientTotal ?? ""));

  const numA = Number.parseFloat(achat.replace(",", ".") || "0") || 0;
  const numV = Number.parseFloat(vente.replace(",", ".") || "0") || 0;
  const numM = Number.parseFloat(mo.replace(",", ".") || "0") || 0;
  const numC = Number.parseFloat(client.replace(",", ".") || "0") || 0;
  const liveClient = numV + numM;

  const dirty =
    numA !== item.prixAchat ||
    numV !== item.prixVentePiece ||
    numM !== item.mainOeuvre ||
    numC !== item.prixClientTotal;

  const save = () => {
    const patch: Partial<PriceBookItem> = {
      prixAchat: numA,
      prixVentePiece: numV,
      mainOeuvre: numM,
    };
    if (numC > 0 && numC !== numV + numM) {
      const ratio = numC / (numV + numM || 1);
      patch.prixVentePiece = Math.round(numV * ratio * 100) / 100;
      patch.mainOeuvre = Math.round(numM * ratio * 100) / 100;
    }
    onPatch(item.id, patch);
    toast.success("Prix mis à jour");
  };

  const numClass =
    "h-9 w-24 rounded-[10px] border border-[#E7E4DC] bg-white px-2 text-right text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-2 focus:ring-[#2A9D8F]/10";

  return (
    <tr className="border-[#EFEDE6] border-t hover:bg-[#FAFAF8]/60">
      <td className="px-3 py-2">
        <div className="font-medium text-[#1A1916]">{item.reparation}</div>
        <div className="text-[#6B6B6B] text-xs">
          {item.piece}
        </div>
      </td>
      <td className="px-3 py-2 text-[#1A1916] text-sm">
        <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[#6B6B6B] text-xs">{qualityLabel || "Standard"}</span>
      </td>
      <td className="px-3 py-2 text-right">
        <input className={numClass} inputMode="decimal" onChange={(e) => setAchat(e.target.value)} value={achat} />
      </td>
      <td className="px-3 py-2 text-right">
        <input className={numClass} inputMode="decimal" onChange={(e) => setVente(e.target.value)} value={vente} />
      </td>
      <td className="px-3 py-2 text-right">
        <input className={numClass} inputMode="decimal" onChange={(e) => setMo(e.target.value)} value={mo} />
      </td>
      <td className="px-3 py-2 text-right">
        <input
          className={`${numClass} font-semibold text-[#167B70]`}
          inputMode="decimal"
          onChange={(e) => setClient(e.target.value)}
          onFocus={() => {
            if (!client || numC === 0) setClient(String(liveClient));
          }}
          placeholder={String(liveClient)}
          value={client}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex flex-col items-center">
          <span className={`font-bold text-sm ${item.stockDisponible && item.stockDisponible > 0 ? "text-[#167B70]" : "text-red-500"}`}>
            {item.stockDisponible ?? 0}
          </span>
          {item.stockItemId && (
            <button
              className="text-[9px] text-[#6B6B6B] hover:text-[#167B70] underline"
              onClick={() => {
                router.push("/dashboard/stock");
              }}
            >
              Voir Stock
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-[#6B6B6B] text-xs">{item.fournisseur ?? "—"}</td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          {dirty && (
            <button
              className="rounded-[10px] bg-[#2A9D8F] px-3 py-1 font-medium text-white text-xs"
              onClick={save}
              type="button"
            >
              Enregistrer
            </button>
          )}
          <button
            aria-label="Modifier détaillé"
            className="grid size-8 place-items-center rounded-lg text-[#6B6B6B] hover:bg-[#F1EFE8] hover:text-[#1A1916]"
            onClick={() => onEdit(item)}
            type="button"
          >
            <Pencil className="size-4" />
          </button>
          <button
            aria-label="Supprimer"
            className="grid size-8 place-items-center rounded-lg text-[#6B6B6B] hover:bg-red-50 hover:text-red-600"
            onClick={() => onDelete(item)}
            type="button"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
