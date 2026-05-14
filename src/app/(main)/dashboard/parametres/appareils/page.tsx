"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { PageShell } from "@/components/behar/page-shell";
import { Combobox, Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { type DeviceModel, type DeviceType, useBeharStore } from "@/lib/behar-store";
import { normalizeDeviceModel, type PriceBookDeviceType } from "@/lib/price-book";
import { getDeviceSeries } from "@/lib/device-series";

const UI_TYPES: Array<{ ui: DeviceType; pb: PriceBookDeviceType }> = [
  { ui: "Smartphone", pb: "smartphone" },
  { ui: "Tablette", pb: "tablet" },
  { ui: "Ordinateur", pb: "computer" },
  { ui: "Console", pb: "console" },
  { ui: "Autre", pb: "other" },
];

const suspiciousRe = /(LTPS|OLED|120\s*Hz|120Hz|\bTI\b|Pulled|Batterie|Écran|Ecran|Lecteur\s*SIM|Connecteur|HDMI)/i;

export default function CatalogueAppareilsPage() {
  const router = useRouter();
  const { deviceBrands, deviceModels, priceBookItems, addDeviceBrand, addDeviceModel, updateDeviceModel, toggleDeviceModel } =
    useBeharStore(useShallow((s) => ({
      deviceBrands: s.deviceBrands,
      deviceModels: s.deviceModels,
      priceBookItems: s.priceBookItems,
      addDeviceBrand: s.addDeviceBrand,
      addDeviceModel: s.addDeviceModel,
      updateDeviceModel: s.updateDeviceModel,
      toggleDeviceModel: s.toggleDeviceModel,
    })));

  useEffect(() => {
    useBeharStore.getState().loadPreloadedCatalog();
  }, []);

  const [search, setSearch] = useState("");
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({});
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({});

  const brandById = useMemo(() => new Map(deviceBrands.map((b) => [b.id, b])), [deviceBrands]);

  const modelsByTypeBrand = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Structure: Type -> BrandId -> Series -> DeviceModel[]
    const map = new Map<DeviceType, Map<string, Map<string, DeviceModel[]>>>();
    for (const m of deviceModels) {
      const brand = brandById.get(m.brandId);
      if (q) {
        const hay = `${m.name} ${brand?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (!map.has(m.deviceType)) map.set(m.deviceType, new Map());
      const byBrand = map.get(m.deviceType)!;
      if (!byBrand.has(m.brandId)) byBrand.set(m.brandId, new Map());
      const bySeries = byBrand.get(m.brandId)!;
      
      const series = getDeviceSeries(brand?.name ?? "", m.name);
      if (!bySeries.has(series)) bySeries.set(series, []);
      bySeries.get(series)!.push(m);
    }
    // Sort models inside each series
    for (const [, byBrand] of map.entries()) {
      for (const [, bySeries] of byBrand.entries()) {
        for (const [series, list] of bySeries.entries()) {
          bySeries.set(
            series,
            [...list].sort((a, b) => a.name.localeCompare(b.name, "fr")),
          );
        }
      }
    }
    return map;
  }, [deviceModels, brandById, search]);

  const countPricesFor = (type: DeviceType, brandName: string, modelName: string) => {
    const pbType = UI_TYPES.find((t) => t.ui === type)?.pb ?? "other";
    return priceBookItems.filter(
      (i) =>
        i.typeAppareil === pbType &&
        i.isActive !== false &&
        i.marque.toLowerCase() === brandName.toLowerCase() &&
        i.modele.toLowerCase() === modelName.toLowerCase(),
    ).length;
  };

  const brandOptionsByType = (type: DeviceType) =>
    deviceBrands
      .filter((b) => b.deviceTypes.includes(type))
      .map((b) => b.name)
      .sort((a, b) => a.localeCompare(b, "fr"));

  const createBrandForType = (type: DeviceType) => {
    const name = window.prompt(`Nom de la marque (${type}) ?`)?.trim();
    if (!name) return;
    addDeviceBrand({ name, deviceType: type });
    toast.success("Marque ajoutée");
  };

  const createModelForBrand = (type: DeviceType, brandId: string) => {
    const brandName = brandById.get(brandId)?.name ?? "Marque";
    const name = window.prompt(`Nom du modèle (${brandName}) ?`)?.trim();
    if (!name) return;
    const cleaned = normalizeDeviceModel(name);
    if (!cleaned || suspiciousRe.test(cleaned)) {
      toast.error("Le nom du modèle semble contenir une pièce ou une qualité. Veuillez saisir uniquement le nom de l'appareil.");
      return;
    }
    addDeviceModel({ brandId, name: cleaned, deviceType: type });
    toast.success("Modèle ajouté");
  };

  const editModel = (modelId: string, current: string) => {
    const next = window.prompt("Renommer le modèle :", current)?.trim();
    if (!next) return;
    const cleaned = normalizeDeviceModel(next);
    if (!cleaned || suspiciousRe.test(cleaned)) {
      toast.error("Le nom du modèle semble contenir une pièce ou une qualité. Veuillez saisir uniquement le nom de l'appareil.");
      return;
    }
    updateDeviceModel(modelId, { name: cleaned });
    toast.success("Modèle modifié");
  };

  const openPricesFor = (type: DeviceType, brand: string, model: string) => {
    const q = `${brand} ${model}`.trim();
    router.push(`/dashboard/parametres/catalogue?q=${encodeURIComponent(q)}`);
  };

  return (
    <PageShell title="Catalogue appareils" subtitle="Type → Marque → Modèle (sans les prix)">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/parametres"
            className="inline-flex items-center gap-2 text-[#6B6B6B] text-sm hover:text-[#1A1916]"
          >
            <ArrowLeft className="size-4" /> Retour aux paramètres
          </Link>
          <SecondaryButton
            onClick={() => {
              toast.message("Astuce: ajoutez marques/modèles depuis la section correspondante.");
            }}
          >
            <Plus className="mr-2 size-4" /> Ajouter
          </SecondaryButton>
        </div>

        <Panel className="p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (marque, modèle…)"
              className="h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white pr-3 pl-10 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
            />
          </label>
        </Panel>

        <div className="space-y-2">
          {UI_TYPES.map(({ ui: type }) => {
            const typeKey = type;
            const typeOpen = openTypes[typeKey] ?? true;
            const byBrand: Map<string, Map<string, DeviceModel[]>> = modelsByTypeBrand.get(type) ?? new Map();
            const modelCount = [...byBrand.values()].reduce(
              (s, bySeries) => s + [...bySeries.values()].reduce((ss, list) => ss + list.length, 0),
              0
            );
            return (
              <div className="rounded-[14px] border border-[#E7E4DC] bg-white" key={typeKey}>
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenTypes((p) => ({ ...p, [typeKey]: !typeOpen }))}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    {typeOpen ? (
                      <ChevronDown className="size-4 text-[#167B70]" />
                    ) : (
                      <ChevronRight className="size-4 text-[#6B6B6B]" />
                    )}
                    <span className="font-semibold text-[#1A1916] text-sm">{type}</span>
                  </span>
                  <span className="text-[#6B6B6B] text-xs">{modelCount} modèle{modelCount > 1 ? "s" : ""}</span>
                </button>

                {typeOpen && (
                  <div className="border-[#EFEDE6] border-t px-3 py-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <SecondaryButton onClick={() => createBrandForType(type)}>
                        <Plus className="mr-2 size-4" /> Ajouter une marque
                      </SecondaryButton>
                      <span className="text-[#6B6B6B] text-xs">
                        Marques disponibles: {brandOptionsByType(type).slice(0, 6).join(", ")}
                        {brandOptionsByType(type).length > 6 ? "…" : ""}
                      </span>
                    </div>

                    {[...byBrand.entries()]
                      .sort((a, b) => (brandById.get(a[0])?.name ?? "").localeCompare(brandById.get(b[0])?.name ?? "", "fr"))
                      .map(([brandId, bySeries]) => {
                        const brand = brandById.get(brandId);
                        if (!brand) return null;
                        const brandKey = `${type}::${brandId}`;
                        const isOpen = openBrands[brandKey];
                        const count = [...bySeries.values()].reduce((acc, list) => acc + list.length, 0);

                        return (
                          <div key={brandId} className="rounded-xl border border-[#EFEDE6] bg-white overflow-hidden shadow-sm mb-2">
                            <div
                              className="flex w-full items-center justify-between px-4 py-3 hover:bg-[#FAFAF8] transition cursor-pointer"
                              onClick={() => setOpenBrands((p) => ({ ...p, [brandKey]: !isOpen }))}
                            >
                              <div className="flex items-center gap-3">
                                {isOpen ? <ChevronDown className="size-4 text-[#167B70]" /> : <ChevronRight className="size-4 text-[#6B6B6B]" />}
                                <span className="font-bold text-[#1A1916] text-sm">{brand.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[#6B6B6B] text-[11px] font-medium uppercase tracking-wider">
                                  {count} modèles
                                </span>
                                <button
                                  className="p-1 hover:bg-[#F1EFE8] rounded-md transition"
                                  onClick={(e) => { e.stopPropagation(); createModelForBrand(type, brandId); }}
                                  type="button"
                                >
                                  <Plus className="size-4 text-[#167B70]" />
                                </button>
                              </div>
                            </div>

                            {isOpen && (
                              <div className="border-t border-[#EFEDE6] bg-[#FAFAF8]/40 p-3 space-y-3">
                                {[...bySeries.entries()]
                                  .sort((a, b) => a[0].localeCompare(b[0], "fr"))
                                  .map(([series, list]) => (
                                    <div key={series} className="space-y-1">
                                      <div className="px-2 py-1 text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest bg-[#F1EFE8]/50 rounded-md inline-block mb-1">
                                        {series}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {list.map((m) => (
                                          <div
                                            key={m.id}
                                            className={`flex items-center justify-between p-3 rounded-xl border bg-white transition hover:shadow-md group ${m.isActive ? "border-[#E7E4DC]" : "opacity-50 border-dashed"}`}
                                          >
                                            <div className="flex flex-col">
                                              <span className="font-semibold text-sm text-[#1A1916]">{m.name}</span>
                                              <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-[#6B6B6B]">
                                                  {countPricesFor(type, brand.name, m.name)} tarifs
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                              <button
                                                className="p-1.5 hover:bg-[#F1EFE8] rounded-lg transition"
                                                onClick={() => {
                                                  const newName = window.prompt("Nouveau nom du modèle ?", m.name);
                                                  if (newName && newName !== m.name) {
                                                    updateDeviceModel(m.id, { name: newName });
                                                    toast.success("Modèle renommé");
                                                  }
                                                }}
                                              >
                                                <Pencil className="size-3.5 text-[#6B6B6B]" />
                                              </button>
                                              <button
                                                className={`p-1.5 rounded-lg transition ${m.isActive ? "hover:bg-red-50 text-[#6B6B6B] hover:text-red-500" : "hover:bg-green-50 text-red-400 hover:text-green-500"}`}
                                                onClick={() => {
                                                  toggleDeviceModel(m.id, !m.isActive);
                                                  toast.success(m.isActive ? "Modèle désactivé" : "Modèle réactivé");
                                                }}
                                              >
                                                <Trash2 className="size-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
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
      </div>
    </PageShell>
  );
}

