"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { type DeviceBrand, type DeviceModel, type DeviceType, useBeharStore } from "@/lib/behar-store";
import { getDeviceSeries } from "@/lib/device-series";
import {
  extractPartQuality,
  getPriceBookMarketPrice,
  PRICE_BOOK_DEVICE_LABELS,
  type PriceBookDeviceType,
  type PriceBookItem,
} from "@/lib/price-book";
import { getDefaultInterventionsByDeviceType, type InterventionDeviceType } from "@/lib/repair-intervention";
import { liveStockForPriceBook } from "@/lib/stock-catalog-link";
import { formatMoney, getWorkshopCountryConfig, type WorkshopCountry } from "@/lib/workshop-country";

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
  marketCountry,
}: Readonly<{
  items: PriceBookItem[];
  deviceModels?: DeviceModel[];
  deviceBrands?: DeviceBrand[];
  onEdit: (item: PriceBookItem) => void;
  onPatch: (id: string, patch: Partial<PriceBookItem>) => void;
  onDelete: (item: PriceBookItem) => void;
  marketCountry: WorkshopCountry;
}>) {
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({});
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({});
  const [openSeries, setOpenSeries] = useState<Record<string, boolean>>({});
  const [openModels, setOpenModels] = useState<Record<string, boolean>>({});
  const [openInterventions, setOpenInterventions] = useState<Record<string, boolean>>({});
  const marketConfig = getWorkshopCountryConfig(marketCountry);

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
          (s, seriesMap) =>
            s +
            [...seriesMap.values()].reduce(
              (sm, models) =>
                sm +
                [...models.values()].reduce(
                  (m, interventions) => m + [...interventions.values()].reduce((i, list) => i + list.length, 0),
                  0,
                ),
              0,
            ),
          0,
        );
        return (
          <div
            className="rounded-[16px] border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.035)] overflow-hidden"
            key={typeKey}
          >
            <button
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#FFFFFF]"
              onClick={() => setOpenTypes((prev) => ({ ...prev, [typeKey]: !typeOpen }))}
              type="button"
            >
              <span className="flex items-center gap-3">
                <div
                  className={`flex size-8 items-center justify-center rounded-[9px] transition ${typeOpen ? "bg-[#FFFFFF] text-[#167B70]" : "bg-[#FFFFFF] text-[#667085]"}`}
                >
                  {typeOpen ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                </div>
                <span className="font-bold text-[#101828] text-base">{PRICE_BOOK_DEVICE_LABELS[type]}</span>
              </span>
              <span className="rounded-[7px] border border-[#E4E7EC] bg-[#FFFFFF] px-2 py-0.5 text-[#667085] text-[11px] font-semibold uppercase tracking-wide">
                {brandCount} marques · {itemCount} prix
              </span>
            </button>
            {typeOpen && (
              <div className="border-[#E4E7EC] border-t px-3 pb-3 pt-1 space-y-2">
                {[...brands.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0], "fr"))
                  .map(([brand, seriesMap]) => {
                    const brandKey = `${typeKey}::${brand}`;
                    const brandOpen = openBrands[brandKey] ?? false;
                    return (
                      <div className="rounded-[14px] border border-[#E4E7EC] bg-[#FFFFFF]" key={brandKey}>
                        <button
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#FFFFFF]"
                          onClick={() => setOpenBrands((prev) => ({ ...prev, [brandKey]: !brandOpen }))}
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            {brandOpen ? (
                              <ChevronDown className="size-4 text-[#167B70]" />
                            ) : (
                              <ChevronRight className="size-4 text-[#667085]" />
                            )}
                            <span className="font-semibold text-[#101828] text-sm">{brand}</span>
                          </span>
                          <span className="text-[#667085] text-xs font-medium">{seriesMap.size} séries</span>
                        </button>
                        {brandOpen && (
                          <div className="space-y-3 px-3 pb-3">
                            {[...seriesMap.entries()]
                              .sort((a, b) => a[0].localeCompare(b[0], "fr"))
                              .map(([series, models]) => {
                                const seriesKey = `${brandKey}::${series}`;
                                const seriesOpen = openSeries[seriesKey] ?? false;
                                return (
                                  <div
                                    key={seriesKey}
                                    className="rounded-[12px] border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025)] overflow-hidden"
                                  >
                                    <button
                                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left bg-[#FFFFFF] hover:bg-[#FFFFFF] transition"
                                      onClick={() => setOpenSeries((p) => ({ ...p, [seriesKey]: !seriesOpen }))}
                                      type="button"
                                    >
                                      <span className="flex items-center gap-2">
                                        {seriesOpen ? (
                                          <ChevronDown className="size-3.5" />
                                        ) : (
                                          <ChevronRight className="size-3.5" />
                                        )}
                                        <span className="font-bold text-[#101828] text-xs uppercase tracking-tight">
                                          {series}
                                        </span>
                                      </span>
                                      <span className="text-[#667085] text-[10px]">{models.size} modèles</span>
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
                                                className="rounded-[12px] border border-[#E4E7EC] bg-white overflow-hidden"
                                                key={modelKey}
                                              >
                                                <button
                                                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-[#FFFFFF]"
                                                  onClick={() =>
                                                    setOpenModels((p) => ({ ...p, [modelKey]: !modelOpen }))
                                                  }
                                                  type="button"
                                                >
                                                  <span className="flex items-center gap-2">
                                                    {modelOpen ? (
                                                      <ChevronDown className="size-4 text-[#167B70]" />
                                                    ) : (
                                                      <ChevronRight className="size-4 text-[#667085]" />
                                                    )}
                                                    <span className="font-bold text-[#101828] text-sm">{model}</span>
                                                  </span>
                                                  <span className="text-[#667085] text-[11px] bg-[#FFFFFF] px-2 py-0.5 rounded-md">
                                                    {interventions.size} prix configurés
                                                  </span>
                                                </button>
                                                {modelOpen && (
                                                  <div className="border-[#E4E7EC] border-t divide-y divide-[#E4E7EC]">
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
                                                        const interventionOpen =
                                                          openInterventions[interventionKey] ?? false;

                                                        const hasRows = list.length > 0;
                                                        const prices = list
                                                          .map((item) => getPriceBookMarketPrice(item, marketCountry))
                                                          .filter((price) => price.hasPrice)
                                                          .map((price) => price.prixClientTotal);
                                                        const hasPrice = prices.length > 0;
                                                        const minPrice = hasPrice ? Math.min(...prices) : 0;
                                                        const maxPrice = hasPrice ? Math.max(...prices) : 0;
                                                        const priceRange = !hasPrice
                                                          ? "À définir"
                                                          : minPrice === maxPrice
                                                            ? formatMoney(minPrice, marketConfig.currency)
                                                            : `${formatMoney(minPrice, marketConfig.currency)} - ${formatMoney(maxPrice, marketConfig.currency)}`;

                                                        return (
                                                          <div key={interventionKey} className="group">
                                                            <button
                                                              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-[#FFFFFF] ${!hasPrice ? "opacity-60" : ""}`}
                                                              onClick={() =>
                                                                setOpenInterventions((prev) => ({
                                                                  ...prev,
                                                                  [interventionKey]: !interventionOpen,
                                                                }))
                                                              }
                                                              type="button"
                                                            >
                                                              <div className="flex items-center gap-2">
                                                                <div
                                                                  className={`flex size-5 items-center justify-center rounded-md transition ${interventionOpen ? "bg-[#FFFFFF] text-[#167B70]" : "text-[#667085]"}`}
                                                                >
                                                                  {interventionOpen ? (
                                                                    <ChevronDown className="size-3.5" />
                                                                  ) : (
                                                                    <ChevronRight className="size-3.5" />
                                                                  )}
                                                                </div>
                                                                <span className="font-medium text-[#101828] text-sm">
                                                                  {reparation}
                                                                </span>
                                                              </div>
                                                              <div className="flex items-center gap-4">
                                                                <span
                                                                  className={`${hasPrice ? "text-[#167B70] font-semibold" : "text-[#667085] italic font-normal"} text-sm`}
                                                                >
                                                                  {priceRange}
                                                                </span>
                                                                {hasRows && (
                                                                  <span className="text-[#667085] text-[11px] opacity-0 group-hover:opacity-100 transition">
                                                                    {list.length} variante{list.length > 1 ? "s" : ""}
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </button>

                                                            {interventionOpen && (
                                                              <div className="bg-[#FFFFFF] overflow-x-auto">
                                                                {hasRows ? (
                                                                  <div className="flex flex-col">
                                                                    <table className="w-full min-w-[820px] text-sm">
                                                                      <thead className="bg-[#FFFFFF] text-[#667085] text-[10px] uppercase tracking-wider font-bold">
                                                                        <tr>
                                                                          <th className="px-5 py-2 text-left">
                                                                            Variante / Pièce
                                                                          </th>
                                                                          <th className="px-3 py-2 text-left">
                                                                            Qualité
                                                                          </th>
                                                                          <th className="px-3 py-2 text-right">
                                                                            Achat
                                                                          </th>
                                                                          <th className="px-3 py-2 text-right">
                                                                            Vente pièce
                                                                          </th>
                                                                          <th className="px-3 py-2 text-right">M.O.</th>
                                                                          <th className="px-3 py-2 text-right text-[#167B70]">
                                                                            Prix client
                                                                          </th>
                                                                          <th className="px-3 py-2 text-center">
                                                                            Stock
                                                                          </th>
                                                                          <th className="px-3 py-2 text-left">
                                                                            Fournisseur / SKU
                                                                          </th>
                                                                          <th className="px-5 py-2 text-right">
                                                                            Actions
                                                                          </th>
                                                                        </tr>
                                                                      </thead>
                                                                      <tbody className="divide-y divide-[#E4E7EC]">
                                                                        {list.map((item) => (
                                                                          <PriceTreeRow
                                                                            item={item}
                                                                            qualityLabel={extractPartQuality(item)}
                                                                            key={`${item.id}-${marketCountry}`}
                                                                            marketCountry={marketCountry}
                                                                            onDelete={onDelete}
                                                                            onEdit={onEdit}
                                                                            onPatch={onPatch}
                                                                          />
                                                                        ))}
                                                                      </tbody>
                                                                    </table>
                                                                    <div className="bg-[#F9FAFB] px-5 py-3 border-t border-[#E4E7EC] flex justify-end">
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                          onEdit({
                                                                            id: "",
                                                                            typeAppareil: type,
                                                                            marque: brand,
                                                                            modele: model,
                                                                            reparation,
                                                                            piece: reparation,
                                                                            qualite: "Nouvelle",
                                                                            prixAchat: 0,
                                                                            prixVentePiece: 0,
                                                                            mainOeuvre: 0,
                                                                            prixClientTotal: 0,
                                                                            marge: 0,
                                                                            isActive: true,
                                                                            source: "manual",
                                                                            createdAt: new Date().toISOString(),
                                                                            updatedAt: new Date().toISOString(),
                                                                          });
                                                                        }}
                                                                        className="text-[#167B70] text-[12px] font-bold hover:underline bg-white px-3 py-1.5 rounded-md border border-[#167B70]/20 shadow-sm"
                                                                      >
                                                                        + Ajouter une qualité (ex: OLED)
                                                                      </button>
                                                                    </div>
                                                                  </div>
                                                                ) : (
                                                                  <div className="px-12 py-4 flex flex-col items-center justify-center text-center">
                                                                    <p className="text-[#667085] text-xs mb-2 italic">
                                                                      Aucun tarif défini pour cette intervention.
                                                                    </p>
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
                                                                          updatedAt: new Date().toISOString(),
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
  marketCountry,
  onEdit,
  onPatch,
  onDelete,
}: Readonly<{
  item: PriceBookItem;
  qualityLabel: string;
  marketCountry: WorkshopCountry;
  onEdit: (item: PriceBookItem) => void;
  onPatch: (id: string, patch: Partial<PriceBookItem>) => void;
  onDelete: (item: PriceBookItem) => void;
}>) {
  const router = useRouter();
  // Source de vérité du stock = module Stock, jamais PriceBookItem.stockDisponible
  const stockItems = useBeharStore((s) => s.stockItems);
  const liveStock = liveStockForPriceBook(item, stockItems);
  const marketPrice = getPriceBookMarketPrice(item, marketCountry);
  const [achat, setAchat] = useState(String(marketPrice.prixAchat || ""));
  const [vente, setVente] = useState(String(marketPrice.prixVentePiece || ""));
  const [mo, setMo] = useState(String(marketPrice.mainOeuvre || ""));
  const [client, setClient] = useState(String(marketPrice.prixClientTotal || ""));
  const [qualite, setQualite] = useState(item.qualite || qualityLabel || "");

  const numA = Number.parseFloat(achat.replace(",", ".") || "0") || 0;
  const numV = Number.parseFloat(vente.replace(",", ".") || "0") || 0;
  const numM = Number.parseFloat(mo.replace(",", ".") || "0") || 0;
  const numC = Number.parseFloat(client.replace(",", ".") || "0") || 0;
  const liveClient = numV + numM;

  const dirty =
    numA !== marketPrice.prixAchat ||
    numV !== marketPrice.prixVentePiece ||
    numM !== marketPrice.mainOeuvre ||
    numC !== marketPrice.prixClientTotal ||
    qualite !== (item.qualite || qualityLabel || "");

  const save = () => {
    const patch: Partial<PriceBookItem> =
      marketCountry === "CH"
        ? { prixAchatChf: numA, prixVentePieceChf: numV, mainOeuvreChf: numM, qualite }
        : { prixAchat: numA, prixVentePiece: numV, mainOeuvre: numM, qualite };
    if (numC > 0 && numC !== numV + numM) {
      const ratio = numC / (numV + numM || 1);
      if (marketCountry === "CH") {
        patch.prixVentePieceChf = Math.round(numV * ratio * 100) / 100;
        patch.mainOeuvreChf = Math.round(numM * ratio * 100) / 100;
      } else {
        patch.prixVentePiece = Math.round(numV * ratio * 100) / 100;
        patch.mainOeuvre = Math.round(numM * ratio * 100) / 100;
      }
    }
    onPatch(item.id, patch);
    toast.success("Prix mis à jour");
  };

  const numClass =
    "h-9 w-24 rounded-[10px] border border-[#E4E7EC] bg-white px-2 text-right text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-2 focus:ring-[#2A9D8F]/10";

  return (
    <tr className="border-[#E4E7EC] border-t hover:bg-[#FFFFFF]">
      <td className="px-3 py-2">
        <div className="font-medium text-[#101828]">{item.reparation}</div>
        <div className="text-[#667085] text-xs">{item.piece}</div>
      </td>
      <td className="px-3 py-2 text-[#101828] text-sm">
        <input
          className="h-8 w-[110px] rounded-[7px] border border-[#E4E7EC] bg-[#FFFFFF] px-2 text-xs font-semibold text-[#667085] outline-none transition focus:border-[#2A9D8F]/50 focus:ring-2 focus:ring-[#2A9D8F]/10"
          value={qualite}
          onChange={(e) => setQualite(e.target.value)}
          placeholder="Standard"
        />
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
        <div className="flex flex-col items-center" title="Quantité lue directement depuis le module Stock">
          {liveStock.item ? (
            <>
              <span className={`font-bold text-sm ${liveStock.quantity > 0 ? "text-[#167B70]" : "text-red-500"}`}>
                {liveStock.quantity}
              </span>
              <button
                className="text-[9px] text-[#667085] hover:text-[#167B70] underline"
                onClick={() => router.push("/dashboard/stock")}
              >
                Gérer dans Stock
              </button>
            </>
          ) : (
            <>
              <span className="font-medium text-[10px] text-[#98A2B3]">Non lié</span>
              <button
                className="mt-0.5 text-[9px] text-[#167B70] hover:underline"
                onClick={() => router.push("/dashboard/stock")}
              >
                Créer la pièce
              </button>
            </>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-[#667085] text-xs">{item.fournisseur ?? "—"}</td>
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
            className="grid size-8 place-items-center rounded-lg text-[#667085] hover:bg-[#FFFFFF] hover:text-[#101828]"
            onClick={() => onEdit(item)}
            type="button"
          >
            <Pencil className="size-4" />
          </button>
          <button
            aria-label="Supprimer"
            className="grid size-8 place-items-center rounded-lg text-[#667085] hover:bg-red-50 hover:text-red-600"
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
