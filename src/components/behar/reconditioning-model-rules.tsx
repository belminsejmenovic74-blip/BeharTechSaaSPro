"use client";

// reconditioning-model-rules — Paramètres › Catalogue de reprise.
// Le catalogue appareils existant sert de base : le réparateur configure
// la règle de reprise de chaque combinaison modèle + stockage. Tout ce qui
// s'affiche dans la modal appartient au modèle sélectionné : batterie,
// défauts et pièces sont embarqués dans SA règle — jamais celle d'un autre
// modèle. Les pièces sont reliées au stock réel (lecture seule ici).

import { useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronRight, Copy, Save, Search, Settings, Smartphone, Trash2, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { type StockItem, useBeharStore } from "@/lib/behar-store";
import {
  type DeviceCatalogModel,
  type DeviceStorageOption,
  getDeviceCatalog,
  sortStorages,
} from "@/lib/device-catalog";
import { realDeviceImage } from "@/lib/real-product-images";
import type { ReconditioningGrade } from "@/lib/recond-settings";
import { formatMoney, safeNumber } from "@/lib/reconditioning-calc";
import {
  BATTERY_TIER_LABELS,
  CALCULATION_MODE_DESCRIPTIONS,
  CALCULATION_MODE_LABELS,
  CALCULATION_MODE_TITLES,
  type DefectAction,
  type DefectKey,
  DEFECT_LABELS,
  DEFECT_TO_PART,
  isPriceKnown,
  type ModelBatteryConfig,
  type ModelDefectRules,
  type ModelPartCosts,
  PART_LABELS,
  type PartCostSource,
  type PartKey,
  type ReconditioningCalculationMode,
  type ReconditioningModelPriceRule,
  useReconditioningRules,
} from "@/lib/reconditioning-pricing";
import { type CompatibleStockPart, getCompatibleStockPartsForModel } from "@/lib/stock-parts";
import { cn } from "@/lib/utils";

import { AccentButton, GhostButton, inputCls, SectionCard, selectCls } from "./reconditioning-ui";

const GRADE_KEYS: ReconditioningGrade[] = ["A+", "A", "B", "C", "D"];
const MODE_KEYS: ReconditioningCalculationMode[] = ["ai", "manual", "parts_labor"];
const DEFECT_KEYS = Object.keys(DEFECT_LABELS) as DefectKey[];
const PART_KEYS = Object.keys(PART_LABELS) as PartKey[];

type SelectedStorage = {
  model: DeviceCatalogModel;
  storage: DeviceStorageOption;
};

/** Coût pièce en cours d'édition — le prix stock est lu en direct, jamais copié. */
type DraftPartCost = {
  active: boolean;
  /** "" = pas de pièce stock : prix manuel. */
  stockItemId: string;
  /** Saisie brute — "" = prix inconnu (« À renseigner »), jamais 0 par défaut. */
  manualPiece: string;
  labor: string;
};

type ModelRuleDraft = {
  calculationMode: ReconditioningCalculationMode;
  targetResalePrice: number;
  manualMaxBuybackPrice: number;
  defaultOfferPrice: number;
  allowFinalManualAdjustment: boolean;
  minimumAcceptablePrice: number;
  targetMarginPct: number;
  riskPct: number;
  defaultLaborCost: number;
  diagnosticCost: number;
  battery: ModelBatteryConfig;
  defects: ModelDefectRules;
  parts: Record<PartKey, DraftPartCost>;
  duplicateStorage: string;
};

const ruleMatches = (
  ruleItem: ReconditioningModelPriceRule,
  input: Pick<ReconditioningModelPriceRule, "brand" | "model" | "storage">,
) => ruleItem.brand === input.brand && ruleItem.model === input.model && ruleItem.storage === input.storage;

const findExactRule = (
  modelRules: ReconditioningModelPriceRule[],
  input: Pick<ReconditioningModelPriceRule, "brand" | "model" | "storage">,
) => modelRules.find((ruleItem) => ruleMatches(ruleItem, input)) ?? null;

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** "49,90" | "49.90" → 49.9 ; "" | "0" | invalide → null (prix inconnu). */
const parseMoneyInput = (raw: string): number | null => {
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
};

const modeBadgeTone = (mode: ReconditioningCalculationMode) => {
  if (mode === "ai") return "border-[#D7EFEA] bg-[#ECF8F4] text-[#147065]";
  if (mode === "manual") return "border-[#D9E7FF] bg-[#F3F7FF] text-[#2563EB]";
  return "border-[#F0E0BC] bg-[#FFF7E8] text-[#9A6B1B]";
};

function buildDraft(
  selected: SelectedStorage,
  exactRule: ReconditioningModelPriceRule | null,
  rules: ReturnType<typeof useReconditioningRules.getState>,
  compatibleByKey: Record<PartKey, CompatibleStockPart[]>,
): ModelRuleDraft {
  // Base autorisée : la règle exacte, sinon un stockage frère du MÊME modèle.
  // Jamais la règle d'un autre modèle.
  const sibling =
    exactRule ??
    rules.modelRules.find(
      (ruleItem) => ruleItem.brand === selected.model.brandName && ruleItem.model === selected.model.modelName,
    ) ??
    null;

  const battery = cloneJson(exactRule?.battery ?? sibling?.battery ?? rules.defaultBattery);
  const defects = cloneJson(exactRule?.defects ?? sibling?.defects ?? rules.defaultDefects);

  const parts = Object.fromEntries(
    PART_KEYS.map((key) => {
      const own = (exactRule?.parts ?? sibling?.parts)?.[key];
      const fallback = rules.defaultParts[key];
      // Pièce stock épinglée encore valide → conservée. Sinon : meilleure pièce
      // compatible du stock avec prix, sinon prix manuel / barème par défaut.
      const pinnedStillValid = own?.stockItemId
        ? compatibleByKey[key].some((candidate) => candidate.stockItem.id === own.stockItemId)
        : false;
      const bestStock = compatibleByKey[key].find((candidate) => candidate.purchasePrice != null);
      const stockItemId = pinnedStillValid ? (own?.stockItemId ?? "") : own ? "" : (bestStock?.stockItem.id ?? "");
      const manualPiece = own && !pinnedStillValid && isPriceKnown(own.piece) ? String(own.piece) : "";
      const labor = own?.labor ?? fallback?.labor;
      return [
        key,
        {
          active: own?.active ?? fallback?.active ?? true,
          stockItemId,
          manualPiece,
          labor: labor == null ? "" : String(labor),
        } satisfies DraftPartCost,
      ];
    }),
  ) as Record<PartKey, DraftPartCost>;

  return {
    calculationMode: exactRule?.calculationMode ?? rules.defaultMode,
    targetResalePrice: exactRule?.targetResalePrice ?? 0,
    manualMaxBuybackPrice: exactRule?.manualMaxBuybackPrice ?? 0,
    defaultOfferPrice: exactRule?.defaultOfferPrice ?? 0,
    allowFinalManualAdjustment: exactRule?.allowFinalManualAdjustment ?? true,
    minimumAcceptablePrice: exactRule?.minimumAcceptablePrice ?? 0,
    targetMarginPct: exactRule?.targetMarginPct ?? rules.targetMarginPct,
    riskPct: exactRule?.riskPct ?? rules.riskPct,
    defaultLaborCost: exactRule?.defaultLaborCost ?? 0,
    diagnosticCost: exactRule?.diagnosticCost ?? 0,
    battery,
    defects,
    parts,
    duplicateStorage: "",
  };
}

const serializeDraft = (draft: ModelRuleDraft) => JSON.stringify({ ...draft, duplicateStorage: "" });

function draftToRulePatch(draft: ModelRuleDraft, stockItems: StockItem[]): Partial<ReconditioningModelPriceRule> {
  const parts = Object.fromEntries(
    PART_KEYS.map((key) => {
      const entry = draft.parts[key];
      const stockItem = entry.stockItemId ? stockItems.find((item) => item.id === entry.stockItemId) : undefined;
      const piece = stockItem
        ? isPriceKnown(stockItem.purchasePrice)
          ? stockItem.purchasePrice
          : null
        : parseMoneyInput(entry.manualPiece);
      return [
        key,
        {
          piece,
          labor: parseMoneyInput(entry.labor) ?? (entry.labor.trim() === "0" ? 0 : null),
          stockItemId: entry.stockItemId || undefined,
          source: (entry.stockItemId ? "stock" : piece != null ? "manual" : "missing") satisfies PartCostSource,
          active: entry.active,
        },
      ];
    }),
  ) as ModelPartCosts;

  return {
    calculationMode: draft.calculationMode,
    targetResalePrice: draft.targetResalePrice,
    manualMaxBuybackPrice: draft.manualMaxBuybackPrice,
    defaultOfferPrice: draft.defaultOfferPrice,
    allowFinalManualAdjustment: draft.allowFinalManualAdjustment,
    minimumAcceptablePrice: draft.minimumAcceptablePrice,
    targetMarginPct: draft.targetMarginPct,
    riskPct: draft.riskPct,
    defaultLaborCost: draft.defaultLaborCost,
    diagnosticCost: draft.diagnosticCost,
    battery: cloneJson(draft.battery),
    defects: cloneJson(draft.defects),
    parts,
    active: true,
  };
}

/** Erreurs bloquantes : Enregistrer est désactivé tant qu'elles existent. */
function draftErrors(draft: ModelRuleDraft): string[] {
  const errors: string[] = [];
  if (draft.calculationMode === "manual") {
    if (draft.targetResalePrice <= 0) errors.push("Prix revente estimé à renseigner.");
    if (draft.manualMaxBuybackPrice <= 0) errors.push("Prix reprise maximum à renseigner.");
  }
  if (draft.calculationMode === "parts_labor") {
    if (draft.targetResalePrice <= 0) errors.push("Prix revente estimé à renseigner.");
  }
  return errors;
}

export function ReconditioningModelRules() {
  const rules = useReconditioningRules();
  const { deviceBrands, deviceModels, loadPreloadedCatalog } = useBeharStore(
    useShallow((state) => ({
      deviceBrands: state.deviceBrands,
      deviceModels: state.deviceModels,
      loadPreloadedCatalog: state.loadPreloadedCatalog,
    })),
  );
  const [search, setSearch] = useState("");
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({ Smartphone: true });
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({ Apple: true, Samsung: true });
  const [selected, setSelected] = useState<SelectedStorage | null>(null);
  const [defaultModeOpen, setDefaultModeOpen] = useState(false);

  useEffect(() => {
    void loadPreloadedCatalog();
  }, [loadPreloadedCatalog]);

  const catalog = useMemo(
    () =>
      getDeviceCatalog({
        deviceBrands,
        deviceModels,
        modelRules: rules.modelRules,
        search,
      }),
    [deviceBrands, deviceModels, rules.modelRules, search],
  );

  const configuredCount = rules.modelRules.filter((ruleItem) => ruleItem.active).length;
  const modelCount = catalog.reduce(
    (typeSum, typeGroup) => typeSum + typeGroup.brands.reduce((brandSum, brand) => brandSum + brand.models.length, 0),
    0,
  );

  const openStorage = (model: DeviceCatalogModel, storage: DeviceStorageOption) => setSelected({ model, storage });

  return (
    <div className="space-y-4">
      <SectionCard
        action={
          <GhostButton className="h-8 px-3 text-[12px]" onClick={() => setDefaultModeOpen(true)}>
            <Settings className="size-3.5 text-[#2A9D8F]" />
            Paramètres par défaut
          </GhostButton>
        }
        subtitle="Les règles de reprise se configurent sur les modèles du catalogue appareils. Chaque modèle a ses propres barèmes."
        title="Catalogue de reprise"
      >
        <div className="mb-3.5 grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#667085]" />
            <input
              className={cn(inputCls, "pl-9")}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher type, marque ou modèle"
              value={search}
            />
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <InfoPill label={`${modelCount} modèles catalogue`} />
            <InfoPill label={`${configuredCount} règles spécifiques`} />
            <ModeBadge inherited mode={rules.defaultMode} />
          </div>
        </div>

        <div className="space-y-2.5">
          {catalog.map((typeGroup) => {
            const typeOpen = openTypes[typeGroup.type] ?? typeGroup.type === "Smartphone";
            const rowCount = typeGroup.brands.reduce(
              (count, brand) =>
                count +
                brand.models.reduce((modelCountForBrand, model) => modelCountForBrand + model.storages.length, 0),
              0,
            );
            return (
              <div className="overflow-hidden rounded-[16px] border border-[#E4E7EC] bg-white" key={typeGroup.type}>
                <button
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-[#F5F7FA]"
                  onClick={() => setOpenTypes((current) => ({ ...current, [typeGroup.type]: !typeOpen }))}
                  type="button"
                >
                  <span className="flex items-center gap-2.5">
                    {typeOpen ? (
                      <ChevronDown className="size-4 text-[#147065]" />
                    ) : (
                      <ChevronRight className="size-4 text-[#667085]" />
                    )}
                    <span className="font-semibold text-[#101828] text-[13px]">{typeGroup.label}</span>
                  </span>
                  <span className="text-[#667085] text-xs">{rowCount} stockages</span>
                </button>

                {typeOpen && (
                  <div className="space-y-2 border-[#E4E7EC] border-t bg-[#F9FAFB] p-2.5">
                    {typeGroup.brands.map((brand) => {
                      const brandKey = `${typeGroup.type}:${brand.name}`;
                      const brandOpen = openBrands[brandKey] ?? brand.name === "Apple";
                      return (
                        <div className="overflow-hidden rounded-[14px] border border-[#E4E7EC] bg-white" key={brand.id}>
                          <button
                            className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-[#F5F7FA]"
                            onClick={() => setOpenBrands((current) => ({ ...current, [brandKey]: !brandOpen }))}
                            type="button"
                          >
                            <span className="flex items-center gap-2.5">
                              {brandOpen ? (
                                <ChevronDown className="size-4 text-[#147065]" />
                              ) : (
                                <ChevronRight className="size-4 text-[#667085]" />
                              )}
                              <span className="font-semibold text-[#101828] text-[13px]">{brand.name}</span>
                            </span>
                            <span className="text-[#667085] text-xs">
                              {brand.models.length} modèle{brand.models.length > 1 ? "s" : ""}
                            </span>
                          </button>

                          {brandOpen && (
                            <div className="divide-y divide-[#F2F4F7] border-[#E4E7EC] border-t">
                              {brand.models.map((model) => (
                                <CatalogModelRows key={model.id} model={model} onOpen={openStorage} rules={rules} />
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

          {catalog.length === 0 && (
            <p className="rounded-[18px] border border-[#E4E7EC] border-dashed bg-white px-4 py-8 text-center text-[#667085] text-sm">
              Aucun modèle trouvé dans le catalogue appareils.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        subtitle="Décote appliquée selon le grade esthétique, en % du prix cible du modèle. HS = non revendable."
        title="Décotes grade par défaut"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {GRADE_KEYS.map((grade) => (
            <div className="rounded-[13px] border border-[#E4E7EC] p-2.5 text-center" key={grade}>
              <p className="font-semibold text-[#101828] text-[14px]">{grade}</p>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <input
                  className={cn(inputCls, "h-8 w-14 text-right text-[12px]")}
                  min={0}
                  onChange={(event) => rules.setGradePct(grade, safeNumber(event.target.value))}
                  type="number"
                  value={rules.gradePct[grade]}
                />
                <span className="text-[#667085] text-[12px]">%</span>
              </div>
              <p className="mt-1.5 text-[#98A2B3] text-[11px]">
                Ex. cible 560 € → − {formatMoney(Math.round((560 * rules.gradePct[grade]) / 100))}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {selected && (
        <ReconditioningModelConfigModal
          onClose={() => setSelected(null)}
          onSelectStorage={(storageLabel) => {
            const nextStorage = selected.model.storages.find((storage) => storage.label === storageLabel);
            if (nextStorage) setSelected({ model: selected.model, storage: nextStorage });
          }}
          selected={selected}
        />
      )}

      {defaultModeOpen && <ReconditioningDefaultModeModal onClose={() => setDefaultModeOpen(false)} />}
    </div>
  );
}

function CatalogModelRows({
  model,
  rules,
  onOpen,
}: Readonly<{
  model: DeviceCatalogModel;
  rules: ReturnType<typeof useReconditioningRules.getState>;
  onOpen: (model: DeviceCatalogModel, storage: DeviceStorageOption) => void;
}>) {
  const image = realDeviceImage(model.brandName, model.modelName, model.type);
  return (
    <div className="px-3 py-2.5">
      <button
        className="mb-2 flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition hover:bg-[#F5F7FA]"
        onClick={() => onOpen(model, model.storages[0])}
        type="button"
      >
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-[#F9FAFB]">
          {image ? (
            <img alt="" className="h-full w-full object-contain p-1.5" src={image} />
          ) : (
            <Smartphone className="size-5 text-[#2A9D8F]" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-[#101828] text-[13px]">{model.modelName}</span>
          <span className="block truncate text-[#667085] text-[11.5px]">
            {model.storages.length} stockage{model.storages.length > 1 ? "s" : ""} disponible
            {model.storages.length > 1 ? "s" : ""}
          </span>
        </span>
      </button>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="text-[#98A2B3] text-[11px] uppercase tracking-wide">
              <th className="px-2 py-2 font-semibold">Modèle</th>
              <th className="px-2 py-2 font-semibold">Stockage</th>
              <th className="px-2 py-2 font-semibold">Couleurs</th>
              <th className="px-2 py-2 font-semibold">Mode</th>
              <th className="px-2 py-2 font-semibold">État</th>
              <th className="px-2 py-2 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {model.storages.map((storage) => {
              const exactRule = findExactRule(rules.modelRules, {
                brand: model.brandName,
                model: model.modelName,
                storage: storage.label,
              });
              const activeRule = exactRule?.active ? exactRule : null;
              const mode = activeRule?.calculationMode ?? rules.defaultMode;
              return (
                <tr className="border-[#F2F4F7] border-t transition hover:bg-[#FCFCFD]" key={storage.label}>
                  <td className="px-2 py-2.5">
                    <button
                      className="max-w-[220px] truncate font-semibold text-[#101828] text-[12.5px] hover:text-[#147065]"
                      onClick={() => onOpen(model, storage)}
                      type="button"
                    >
                      {model.modelName}
                    </button>
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      className="rounded-[8px] border border-[#E4E7EC] bg-white px-2 py-0.5 font-semibold text-[#101828] text-[11.5px] transition hover:border-[#2A9D8F]/50 hover:bg-[#ECF8F4]"
                      onClick={() => onOpen(model, storage)}
                      type="button"
                    >
                      {storage.label}
                    </button>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex max-w-[220px] flex-wrap gap-1.5">
                      {storage.colors.slice(0, 3).map((color) => (
                        <span
                          className="rounded-full border border-[#E4E7EC] bg-white px-2 py-0.5 text-[#667085] text-[10.5px]"
                          key={color.label}
                        >
                          {color.label}
                        </span>
                      ))}
                      {storage.colors.length > 3 && (
                        <span className="text-[#98A2B3] text-[11px]">+{storage.colors.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <ModeBadge inherited={!activeRule} mode={mode} />
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={cn(
                        "inline-flex h-[22px] max-w-full items-center truncate whitespace-nowrap rounded-full border px-2 font-semibold text-[10.5px]",
                        activeRule
                          ? "border-[#D7EFEA] bg-[#ECF8F4] text-[#147065]"
                          : "border-[#E4E7EC] bg-[#F5F7FA] text-[#667085]",
                      )}
                    >
                      {activeRule ? "Règle spécifique" : "Valeurs par défaut"}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <GhostButton className="h-8 px-2.5 text-[11.5px]" onClick={() => onOpen(model, storage)}>
                      <Settings className="size-3.5 text-[#2A9D8F]" />
                      Configurer
                    </GhostButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════ Modal de configuration modèle + stockage ═══════════════ */

function ReconditioningModelConfigModal({
  selected,
  onClose,
  onSelectStorage,
}: Readonly<{
  selected: SelectedStorage;
  onClose: () => void;
  onSelectStorage: (storageLabel: string) => void;
}>) {
  const rules = useReconditioningRules();
  const stockItems = useBeharStore((s) => s.stockItems);
  const exactRule = findExactRule(rules.modelRules, {
    brand: selected.model.brandName,
    model: selected.model.modelName,
    storage: selected.storage.label,
  });

  // Pièces du stock compatibles avec CE modèle — lecture seule, aucun décrément.
  const compatibleByKey = useMemo(
    () =>
      Object.fromEntries(
        PART_KEYS.map((key) => [
          key,
          getCompatibleStockPartsForModel({
            stockItems,
            brandName: selected.model.brandName,
            modelName: selected.model.modelName,
            partKey: key,
          }),
        ]),
      ) as Record<PartKey, CompatibleStockPart[]>,
    [stockItems, selected.model.brandName, selected.model.modelName],
  );

  const [draft, setDraft] = useState(() => buildDraft(selected, exactRule, rules, compatibleByKey));
  const [initialDraft, setInitialDraft] = useState(() =>
    serializeDraft(buildDraft(selected, exactRule, rules, compatibleByKey)),
  );

  useEffect(() => {
    const nextDraft = buildDraft(selected, exactRule, useReconditioningRules.getState(), compatibleByKey);
    setDraft(nextDraft);
    setInitialDraft(serializeDraft(nextDraft));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconstruit uniquement quand la cible change
  }, [selected.model.id, selected.storage.label, exactRule?.id]);

  const dirty = serializeDraft(draft) !== initialDraft;
  const errors = draftErrors(draft);
  const image = realDeviceImage(selected.model.brandName, selected.model.modelName, selected.model.type);
  const activeRule = exactRule?.active ? exactRule : null;
  const allStorages = sortStorages(selected.model.storages.map((storage) => storage.label));
  const storageChips = [...selected.model.storages].sort(
    (a, b) => allStorages.indexOf(a.label) - allStorages.indexOf(b.label),
  );

  const closeWithGuard = () => {
    if (!dirty || window.confirm("Des modifications ne sont pas enregistrées. Fermer la fenêtre ?")) onClose();
  };

  const saveRule = () => {
    if (errors.length > 0) return;
    rules.saveModelReconditioningRule(
      { brand: selected.model.brandName, model: selected.model.modelName, storage: selected.storage.label },
      draftToRulePatch(draft, stockItems),
    );
    onClose();
  };

  const duplicateToStorage = () => {
    if (!draft.duplicateStorage || errors.length > 0) return;
    const sourceId = rules.saveModelReconditioningRule(
      { brand: selected.model.brandName, model: selected.model.modelName, storage: selected.storage.label },
      draftToRulePatch(draft, stockItems),
    );
    if (sourceId) rules.duplicateRuleToStorage(sourceId, draft.duplicateStorage);
    setDraft((current) => ({ ...current, duplicateStorage: "" }));
  };

  const switchStorage = (storageLabel: string) => {
    if (storageLabel === selected.storage.label) return;
    if (!dirty || window.confirm("Changer de stockage sans enregistrer les modifications ?"))
      onSelectStorage(storageLabel);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/25 p-3 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[20px] border border-[#E4E7EC] bg-[#F9FAFB] shadow-[0_24px_80px_rgba(16,24,40,0.20)]"
        role="dialog"
      >
        {/* Header sticky */}
        <header className="border-[#E4E7EC] border-b bg-white px-4 pt-3.5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-[#E4E7EC] bg-[#F9FAFB]">
                {image ? (
                  <img alt="" className="h-full w-full object-contain p-1.5" src={image} />
                ) : (
                  <Smartphone className="size-6 text-[#2A9D8F]" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[#667085] text-[11.5px]">{selected.model.brandName} · Configuration reprise</p>
                <h2 className="truncate font-semibold text-[#101828] text-[16px] tracking-tight">
                  {selected.model.modelName} · {selected.storage.label}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <ModeBadge inherited={!activeRule} mode={draft.calculationMode} />
                  <span
                    className={cn(
                      "inline-flex h-6 items-center rounded-full border px-2.5 font-semibold text-[11px]",
                      activeRule
                        ? "border-[#D7EFEA] bg-[#ECF8F4] text-[#147065]"
                        : "border-[#E4E7EC] bg-[#F5F7FA] text-[#667085]",
                    )}
                  >
                    {activeRule ? "Règle spécifique" : "Valeurs par défaut"}
                  </span>
                </div>
              </div>
            </div>
            <button
              className="grid size-8 shrink-0 place-items-center rounded-[9px] text-[#667085] transition hover:bg-[#F5F7FA] hover:text-[#101828]"
              onClick={closeWithGuard}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Stockages du modèle */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {storageChips.map((storage) => {
              const chipRule = findExactRule(rules.modelRules, {
                brand: selected.model.brandName,
                model: selected.model.modelName,
                storage: storage.label,
              });
              const isCurrent = storage.label === selected.storage.label;
              return (
                <button
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-semibold text-[11.5px] transition",
                    isCurrent
                      ? "border-[#2A9D8F] bg-[#ECF8F4] text-[#147065]"
                      : "border-[#E4E7EC] bg-white text-[#667085] hover:border-[#2A9D8F]/45 hover:text-[#101828]",
                  )}
                  key={storage.label}
                  onClick={() => switchStorage(storage.label)}
                  type="button"
                >
                  {storage.label}
                  {chipRule?.active && chipRule.targetResalePrice > 0 && (
                    <span className="font-normal text-[11px] opacity-80">
                      {formatMoney(chipRule.targetResalePrice)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* Contenu scrollable */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
          <ModalPanel title="Mode de calcul">
            <ReconditioningCalculationModeSelector
              mode={draft.calculationMode}
              onChange={(calculationMode) => setDraft((current) => ({ ...current, calculationMode }))}
            />
          </ModalPanel>

          <ModalPanel title="Valeurs principales">
            <ModeFields draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
          </ModalPanel>

          <ModalPanel subtitle="Décotes propres à ce modèle, selon la santé batterie." title="Batterie">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {BATTERY_TIER_LABELS.map((tier) => (
                <Field key={tier.key} label={tier.label}>
                  <MoneySuffixInput
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        battery: {
                          ...current.battery,
                          tiers: { ...current.battery.tiers, [tier.key]: Math.max(0, value) },
                        },
                      }))
                    }
                    value={draft.battery.tiers[tier.key]}
                  />
                </Field>
              ))}
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <Field label="Remplacement conseillé sous (%)">
                <input
                  className={cn(inputCls, "text-right")}
                  max={100}
                  min={0}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      battery: {
                        ...current.battery,
                        replacementAdvisedBelow: Math.max(0, Math.min(100, safeNumber(event.target.value))),
                      },
                    }))
                  }
                  type="number"
                  value={draft.battery.replacementAdvisedBelow}
                />
              </Field>
              <Field label="Décote si remplacement conseillé">
                <MoneySuffixInput
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      battery: { ...current.battery, replacementExtraDeduction: Math.max(0, value) },
                    }))
                  }
                  value={draft.battery.replacementExtraDeduction}
                />
              </Field>
            </div>
            <BatteryStockHint compatible={compatibleByKey.batterie} draft={draft} stockItems={stockItems} />
          </ModalPanel>

          <ModalPanel subtitle="Décote, validation manuelle ou blocage — propres à ce modèle." title="Défauts">
            <div className="overflow-hidden rounded-[14px] border border-[#E4E7EC] bg-white">
              {DEFECT_KEYS.map((key) => {
                const entry = draft.defects[key];
                const linkedPart = DEFECT_TO_PART[key];
                return (
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-x-2.5 gap-y-2 border-[#F2F4F7] border-b px-3 py-2 last:border-0",
                      !entry.active && "opacity-45",
                    )}
                    key={key}
                  >
                    <Toggle
                      on={entry.active}
                      onToggle={() =>
                        setDraft((current) => ({
                          ...current,
                          defects: {
                            ...current.defects,
                            [key]: { ...current.defects[key], active: !current.defects[key].active },
                          },
                        }))
                      }
                    />
                    <span className="min-w-[130px] flex-1">
                      <span className="block font-semibold text-[#101828] text-[12.5px]">{DEFECT_LABELS[key]}</span>
                      {linkedPart && (
                        <span className="block text-[#98A2B3] text-[11px]">Pièce liée : {PART_LABELS[linkedPart]}</span>
                      )}
                    </span>
                    <select
                      className={cn(selectCls, "h-8 w-[165px] text-[11.5px]")}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          defects: {
                            ...current.defects,
                            [key]: { ...current.defects[key], action: event.target.value as DefectAction },
                          },
                        }))
                      }
                      value={entry.action}
                    >
                      <option value="decote">Décote</option>
                      <option value="manual">Validation manuelle</option>
                      <option value="block">Reprise impossible</option>
                    </select>
                    {entry.action === "decote" ? (
                      <div className="w-[104px]">
                        <MoneySuffixInput
                          onChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              defects: {
                                ...current.defects,
                                [key]: { ...current.defects[key], amount: Math.max(0, value) },
                              },
                            }))
                          }
                          value={entry.amount}
                        />
                      </div>
                    ) : (
                      <span className="w-[110px] text-right text-[#98A2B3] text-[12px]">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </ModalPanel>

          {/* Actions secondaires */}
          <ModalPanel title="Actions">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={cn(selectCls, "w-[180px]")}
                onChange={(event) => setDraft((current) => ({ ...current, duplicateStorage: event.target.value }))}
                value={draft.duplicateStorage}
              >
                <option value="">Dupliquer vers…</option>
                {selected.model.storages
                  .filter((storage) => storage.label !== selected.storage.label)
                  .map((storage) => (
                    <option key={storage.label} value={storage.label}>
                      {storage.label}
                    </option>
                  ))}
              </select>
              <GhostButton
                className="px-3"
                disabled={!draft.duplicateStorage || errors.length > 0}
                onClick={duplicateToStorage}
              >
                <Copy className="size-3.5" />
                Dupliquer
              </GhostButton>
              {activeRule && (
                <GhostButton
                  className="px-3 text-[#B4342A]"
                  onClick={() => {
                    if (
                      window.confirm("Supprimer la règle spécifique ? Ce stockage repassera aux valeurs par défaut.")
                    ) {
                      rules.resetModelReconditioningRule({
                        brand: selected.model.brandName,
                        model: selected.model.modelName,
                        storage: selected.storage.label,
                      });
                      onClose();
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Supprimer la règle
                </GhostButton>
              )}
            </div>
          </ModalPanel>
        </div>

        {/* Footer sticky */}
        <footer className="border-[#E4E7EC] border-t bg-white px-4 py-3">
          {errors.length > 0 && <p className="mb-2 text-[#B4342A] text-[12px]">{errors.join(" ")}</p>}
          <div className="flex items-center justify-end gap-2">
            <GhostButton className="px-4" onClick={closeWithGuard}>
              Annuler
            </GhostButton>
            <AccentButton className="px-4" disabled={errors.length > 0} onClick={saveRule}>
              <Save className="size-4" />
              Enregistrer
            </AccentButton>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Indication du coût de remplacement batterie depuis le stock (lecture seule). */
function BatteryStockHint({
  draft,
  compatible,
  stockItems,
}: Readonly<{ draft: ModelRuleDraft; compatible: CompatibleStockPart[]; stockItems: StockItem[] }>) {
  const entry = draft.parts.batterie;
  const selectedStockItem = entry.stockItemId ? stockItems.find((item) => item.id === entry.stockItemId) : undefined;
  const stockPrice =
    selectedStockItem && isPriceKnown(selectedStockItem.purchasePrice) ? selectedStockItem.purchasePrice : null;
  const price = entry.stockItemId ? stockPrice : parseMoneyInput(entry.manualPiece);
  const bestFallback = compatible.find((candidate) => candidate.purchasePrice != null);
  const shown = price ?? bestFallback?.purchasePrice ?? null;
  return (
    <p className="mt-2.5 rounded-[12px] border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[#667085] text-[11.5px]">
      Coût remplacement batterie :{" "}
      {shown != null ? (
        <strong className="text-[#101828]">{formatMoney(shown)}</strong>
      ) : (
        <strong className="text-[#B4342A]">à renseigner</strong>
      )}{" "}
      — estimation issue du stock.
    </p>
  );
}

/* ─────────────── Mode par défaut global ─────────────── */

function ReconditioningDefaultModeModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const rules = useReconditioningRules();
  const [mode, setMode] = useState<ReconditioningCalculationMode>(rules.defaultMode);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/25 p-3 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        aria-modal="true"
        className="w-full max-w-[620px] rounded-[20px] border border-[#E4E7EC] bg-white p-4 shadow-[0_24px_80px_rgba(16,24,40,0.20)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">Mode par défaut</h2>
            <p className="mt-1 text-[#667085] text-[12.5px]">Utilisé quand un modèle n'a pas de règle spécifique.</p>
          </div>
          <button
            className="grid size-8 place-items-center rounded-[9px] text-[#667085] transition hover:bg-[#F5F7FA] hover:text-[#101828]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <ReconditioningCalculationModeSelector mode={mode} onChange={setMode} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <GhostButton onClick={onClose}>Annuler</GhostButton>
          <AccentButton
            onClick={() => {
              rules.setDefaultMode(mode);
              onClose();
            }}
          >
            Enregistrer
          </AccentButton>
        </div>
      </div>
    </div>
  );
}

function ReconditioningCalculationModeSelector({
  mode,
  onChange,
}: Readonly<{ mode: ReconditioningCalculationMode; onChange: (mode: ReconditioningCalculationMode) => void }>) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {MODE_KEYS.map((candidate) => (
        <button
          className={cn(
            "rounded-[14px] border p-3 text-left transition",
            mode === candidate
              ? "border-[#2A9D8F] bg-[#ECF8F4] shadow-[0_10px_24px_rgba(42,157,143,0.12)]"
              : "border-[#E4E7EC] bg-white hover:border-[#2A9D8F]/45",
          )}
          key={candidate}
          onClick={() => onChange(candidate)}
          type="button"
        >
          <span className="font-semibold text-[#101828] text-[13px]">{CALCULATION_MODE_TITLES[candidate]}</span>
          <span className="mt-1 block text-[#667085] text-[11.5px] leading-snug">
            {CALCULATION_MODE_DESCRIPTIONS[candidate]}
          </span>
        </button>
      ))}
    </div>
  );
}

function ModeFields({
  draft,
  onChange,
}: Readonly<{ draft: ModelRuleDraft; onChange: (patch: Partial<ModelRuleDraft>) => void }>) {
  if (draft.calculationMode === "ai") {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2">
        <ToggleField
          checked={draft.allowFinalManualAdjustment}
          label="Autoriser l'ajustement manuel final"
          onChange={(allowFinalManualAdjustment) => onChange({ allowFinalManualAdjustment })}
        />
        <Field label="Marge cible">
          <PercentInput onChange={(targetMarginPct) => onChange({ targetMarginPct })} value={draft.targetMarginPct} />
        </Field>
        <Field label="Risque">
          <PercentInput onChange={(riskPct) => onChange({ riskPct })} value={draft.riskPct} />
        </Field>
        <Field label="Prix minimum acceptable">
          <MoneyInput
            onChange={(minimumAcceptablePrice) => onChange({ minimumAcceptablePrice })}
            value={draft.minimumAcceptablePrice}
          />
        </Field>
      </div>
    );
  }

  if (draft.calculationMode === "manual") {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Prix revente estimé">
          <MoneyInput
            onChange={(targetResalePrice) => onChange({ targetResalePrice })}
            value={draft.targetResalePrice}
          />
        </Field>
        <Field label="Prix reprise maximum">
          <MoneyInput
            onChange={(manualMaxBuybackPrice) => onChange({ manualMaxBuybackPrice })}
            value={draft.manualMaxBuybackPrice}
          />
        </Field>
        <Field label="Prix proposé par défaut">
          <MoneyInput
            onChange={(defaultOfferPrice) => onChange({ defaultOfferPrice })}
            value={draft.defaultOfferPrice}
          />
        </Field>
        <Field label="Marge cible">
          <PercentInput onChange={(targetMarginPct) => onChange({ targetMarginPct })} value={draft.targetMarginPct} />
        </Field>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <Field label="Prix revente estimé">
        <MoneyInput onChange={(targetResalePrice) => onChange({ targetResalePrice })} value={draft.targetResalePrice} />
      </Field>
      <Field label="Marge cible">
        <PercentInput onChange={(targetMarginPct) => onChange({ targetMarginPct })} value={draft.targetMarginPct} />
      </Field>
      <Field label="Main-d'œuvre par défaut">
        <MoneyInput onChange={(defaultLaborCost) => onChange({ defaultLaborCost })} value={draft.defaultLaborCost} />
      </Field>
      <Field label="Risque">
        <PercentInput onChange={(riskPct) => onChange({ riskPct })} value={draft.riskPct} />
      </Field>
      <Field label="Coût diagnostic optionnel">
        <MoneyInput onChange={(diagnosticCost) => onChange({ diagnosticCost })} value={draft.diagnosticCost} />
      </Field>
    </div>
  );
}

function ModalPanel({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle?: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-[16px] border border-[#E4E7EC] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h3 className="font-semibold text-[#101828] text-[13.5px]">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[#667085] text-[11.5px] leading-snug">{subtitle}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block space-y-1">
      <span className="font-medium text-[#101828] text-[12px]">{label}</span>
      {children}
    </label>
  );
}

function MoneyInput({ value, onChange }: Readonly<{ value: number; onChange: (value: number) => void }>) {
  return (
    <div className="relative">
      <input
        className={cn(inputCls, "h-8 pr-8 text-right text-[12px]")}
        min={0}
        onChange={(event) => onChange(safeNumber(event.target.value))}
        type="number"
        value={value || ""}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#667085] text-[11.5px]">
        €
      </span>
    </div>
  );
}

function MoneySuffixInput({ value, onChange }: Readonly<{ value: number; onChange: (value: number) => void }>) {
  return (
    <div className="relative">
      <input
        className={cn(inputCls, "h-8 pr-7 text-right text-[12px]")}
        min={0}
        onChange={(event) => onChange(safeNumber(event.target.value))}
        type="number"
        value={value}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#98A2B3] text-[11.5px]">
        €
      </span>
    </div>
  );
}

function PercentInput({ value, onChange }: Readonly<{ value: number; onChange: (value: number) => void }>) {
  return (
    <div className="relative">
      <input
        className={cn(inputCls, "h-8 pr-8 text-right text-[12px]")}
        max={100}
        min={0}
        onChange={(event) => onChange(safeNumber(event.target.value))}
        type="number"
        value={value}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#667085] text-[11.5px]">
        %
      </span>
    </div>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
}: Readonly<{ checked: boolean; label: string; onChange: (checked: boolean) => void }>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2">
      <span className="font-medium text-[#101828] text-[12px]">{label}</span>
      <Toggle on={checked} onToggle={() => onChange(!checked)} />
    </div>
  );
}

function ModeBadge({ mode, inherited }: Readonly<{ mode: ReconditioningCalculationMode; inherited?: boolean }>) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full shrink-0 items-center truncate whitespace-nowrap rounded-full border px-2 font-semibold text-[10.5px]",
        modeBadgeTone(mode),
      )}
    >
      {inherited ? `Par défaut · ${CALCULATION_MODE_LABELS[mode]}` : CALCULATION_MODE_LABELS[mode]}
    </span>
  );
}

function InfoPill({ label }: Readonly<{ label: string }>) {
  return (
    <span className="inline-flex h-7 items-center rounded-full border border-[#E4E7EC] bg-white px-2.5 font-semibold text-[#667085] text-[11px]">
      {label}
    </span>
  );
}

export function Toggle({ on, onToggle }: Readonly<{ on: boolean; onToggle: () => void }>) {
  return (
    <button
      aria-checked={on}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-[#2A9D8F]" : "bg-[#E4E7EC]")}
      onClick={onToggle}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
          on ? "left-[18px]" : "left-0.5",
        )}
      />
    </button>
  );
}
