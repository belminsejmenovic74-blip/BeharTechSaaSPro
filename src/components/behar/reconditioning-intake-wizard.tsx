"use client";

// reconditioning-intake-wizard — « Nouvelle reprise », mode comptoir tablette.
// 5 étapes en grosses cartes tactiles : Appareil → GO & couleur → Batterie & état
// → Défauts & pièces → Offre. Chaque montant vient des règles DU MODÈLE sélectionné
// (reconditioning-pricing) : batterie, grade, défauts et pièces sont propres au modèle.
// Le stock n'est jamais décrémenté ici — uniquement en atelier (pièce réellement posée).

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Battery,
  Check,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Smartphone,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

import { type DeviceBrand, type DeviceModel, useBeharStore } from "@/lib/behar-store";
import { getDeviceStorageOptions } from "@/lib/device-catalog";
import type { ReconditioningGrade } from "@/lib/recond-settings";
import { formatMoney, type IntakeCondition, safeNumber } from "@/lib/reconditioning-calc";
import {
  BATTERY_TIER_LABELS,
  type BatteryTierKey,
  BLOCKER_LABELS,
  type BlockerKey,
  brandsFromRules,
  calculateBatteryDeduction,
  calculateDefectDeductions,
  calculateGradeDeduction,
  calculateOfferMargin,
  computeOfferCalculation,
  DEFECT_LABELS,
  type DefectKey,
  type EstimatedPartLine,
  findModelRule,
  isPriceKnown,
  modelsForBrand,
  PART_COST_SOURCE_LABELS,
  type PartCostSource,
  type PartKey,
  type ReconditioningOfferCalculation,
  suggestParts,
  useReconditioningRules,
} from "@/lib/reconditioning-pricing";
import { resolvePartCostForReconditioning } from "@/lib/stock-parts";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

import { AccentButton, FieldLabel, GhostButton, inputCls, selectCls } from "./reconditioning-ui";

const STEPS = [
  { id: 1, label: "Appareil" },
  { id: 2, label: "GO & couleur" },
  { id: 3, label: "Batterie & état" },
  { id: 4, label: "Défauts & pièces" },
  { id: 5, label: "Offre" },
] as const;

const GRADES: { grade: ReconditioningGrade; label: string }[] = [
  { grade: "A+", label: "Comme neuf" },
  { grade: "A", label: "Excellent" },
  { grade: "B", label: "Bon état" },
  { grade: "C", label: "Correct" },
  { grade: "D", label: "Usé" },
  { grade: "HS", label: "HS" },
];

const DEFECT_KEYS = Object.keys(DEFECT_LABELS) as DefectKey[];
const BLOCKER_KEYS = Object.keys(BLOCKER_LABELS) as BlockerKey[];

type PartOverride = { piece: number | null; labor: number } | "removed";

type WizardState = {
  customerName: string;
  provenance: "client" | "fournisseur" | "autre";
  brand: string;
  customBrand: boolean;
  model: string;
  storage: string;
  color: string;
  customColor: string;
  imei: string;
  grade: ReconditioningGrade;
  batteryTier: BatteryTierKey | null;
  defects: DefectKey[];
  blockerFlags: BlockerKey[];
  partOverrides: Partial<Record<PartKey, PartOverride>>;
  manualTarget: string;
  proposedPrice: string;
  refusedReason: string;
};

const blankState = (): WizardState => ({
  customerName: "",
  provenance: "client",
  brand: "",
  customBrand: false,
  model: "",
  storage: "",
  color: "",
  customColor: "",
  imei: "",
  grade: "B",
  batteryTier: "90-100",
  defects: [],
  blockerFlags: [],
  partOverrides: {},
  manualTarget: "",
  proposedPrice: "",
  refusedReason: "",
});

const PROVENANCE_TO_SOURCE = { client: "Rachat client", fournisseur: "Lot fournisseur", autre: "Reprise" } as const;

export function NewReconditioningIntakeWizard({
  onClose,
  onOpenDevice,
}: Readonly<{ onClose: () => void; onOpenDevice: (id: string) => void }>) {
  const rules = useReconditioningRules();
  const customers = useBeharStore((s) => s.customers);
  const stockItems = useBeharStore((s) => s.stockItems);
  const deviceBrands = useBeharStore((s) => s.deviceBrands);
  const deviceModels = useBeharStore((s) => s.deviceModels);
  const loadPreloadedCatalog = useBeharStore((s) => s.loadPreloadedCatalog);
  const createFile = useReconditioningStore((s) => s.createFile);
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const acceptIntake = useReconditioningStore((s) => s.acceptIntake);
  const markRefused = useReconditioningStore((s) => s.markRefused);
  const sendToWorkshop = useReconditioningStore((s) => s.sendToWorkshop);
  const files = useReconditioningStore((s) => s.files);

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(blankState);
  const [done, setDone] = useState<{ id: string; accepted: boolean } | null>(null);

  useEffect(() => {
    void loadPreloadedCatalog();
  }, [loadPreloadedCatalog]);

  const patch = (p: Partial<WizardState>) => setState((prev) => ({ ...prev, ...p }));

  /* ── Règles du modèle sélectionné ── */
  const modelRule = useMemo(() => findModelRule(rules, state), [rules, state]);
  const battery = useMemo(
    () => calculateBatteryDeduction(rules, modelRule, state.batteryTier),
    [rules, modelRule, state.batteryTier],
  );

  // Pièces estimées : suggérées depuis les défauts + remplacement batterie conseillé.
  // Les prix viennent du stock compatible avec CE modèle quand il existe (lecture
  // seule — aucun décrément ici), sinon règle du modèle, sinon saisie manuelle.
  const parts = useMemo<EstimatedPartLine[]>(() => {
    const suggested = suggestParts(rules, modelRule, state.defects, battery.replacementAdvised);
    return suggested
      .map((line) => {
        const override = state.partOverrides[line.key];
        if (override === "removed") return null;
        const resolved = resolvePartCostForReconditioning({
          rules,
          ruleItem: modelRule,
          partKey: line.key,
          stockItems,
          brandName: state.brand,
          modelName: state.model,
        });
        const base: EstimatedPartLine = {
          ...line,
          piece: resolved.piece,
          labor: resolved.labor ?? line.labor,
          source: resolved.source,
          stockItemId: resolved.stockItem?.id,
        };
        return override
          ? { ...base, piece: override.piece, labor: override.labor, source: "manual" as PartCostSource }
          : base;
      })
      .filter((line): line is EstimatedPartLine => line !== null);
  }, [
    rules,
    modelRule,
    state.defects,
    battery.replacementAdvised,
    state.partOverrides,
    stockItems,
    state.brand,
    state.model,
  ]);

  const calc = useMemo(
    () =>
      computeOfferCalculation(
        {
          brand: state.brand,
          model: state.model,
          storage: state.storage,
          grade: state.grade,
          batteryTier: state.batteryTier,
          defects: state.defects,
          blockerFlags: state.blockerFlags,
          parts,
          manualTarget: state.manualTarget ? safeNumber(state.manualTarget) : null,
        },
        rules,
      ),
    [state, parts, rules],
  );

  const proposedPrice = state.proposedPrice === "" ? calc.suggestedOffer : Math.max(0, safeNumber(state.proposedPrice));
  const margin = calculateOfferMargin(calc, proposedPrice);
  const blocked = calc.blocked.length > 0;

  const canNext = step === 1 ? Boolean(state.brand && state.model.trim()) : step === 2 ? Boolean(state.storage) : true;

  /* ── Décision ── */
  const persistFile = (): string => {
    const condition: IntakeCondition = {
      grade: state.grade,
      batteryPct: state.batteryTier
        ? (BATTERY_TIER_LABELS.find((t) => t.key === state.batteryTier)?.approxHealth ?? null)
        : null,
      screen: state.defects.includes("ecranCasse")
        ? "casse"
        : state.defects.includes("tactileHs")
          ? "tactile_hs"
          : "ok",
      backGlass: state.defects.includes("vitreArriere") ? "casse" : "ok",
      biometrics: state.defects.includes("faceIdHs") || state.defects.includes("touchIdHs") ? "hs" : "ok",
      network: state.defects.includes("reseauHs") ? "hs" : "ok",
      camera: state.defects.includes("cameraHs") ? "hs" : "ok",
      oxidation: state.blockerFlags.includes("oxydationForte")
        ? "forte"
        : state.defects.includes("oxydationLegere")
          ? "legere"
          : "non",
      lock: state.blockerFlags.includes("icloudActif") || state.blockerFlags.includes("googleLock") ? "actif" : "libre",
      imeiStatus: state.blockerFlags.includes("imeiBlacklist") ? "blackliste" : "propre",
      batteryTier: state.batteryTier ?? undefined,
      defects: state.defects,
      blockerFlags: state.blockerFlags,
    };

    const id = createFile();
    updateFile(id, {
      brand: state.brand,
      model: state.model,
      storage: state.storage,
      color: state.color === "Autre" ? state.customColor : state.color,
      imei: state.imei,
      customerName: state.customerName || undefined,
      provenance: state.provenance,
      source: PROVENANCE_TO_SOURCE[state.provenance],
      supplierName: state.provenance === "fournisseur" ? state.customerName || undefined : undefined,
      condition,
      cosmeticGrade: state.grade === "HS" ? "D" : state.grade,
      batteryHealth: condition.batteryPct,
      prixAchat: proposedPrice ?? 0,
      prixVentePrevu: calc.targetResale ?? 0,
      prixConseille: calc.suggestedOffer ?? 0,
      laborCost: calc.laborCost,
      warrantyMonths: 12,
      parts: parts.map((line, index) => ({
        id: `part_${Date.now().toString(36)}_${index}`,
        label: isPriceKnown(line.piece) ? `${line.label} (estimé)` : `${line.label} (estimé — prix à renseigner)`,
        cost: safeNumber(line.piece),
        quantity: 1,
        priceMode: "achat" as const,
      })),
      originalEstimation: {
        createdAt: new Date().toISOString(),
        coteDeBase: calc.targetResale ?? 0,
        deductions: [
          ...(calc.batteryDeduction > 0 ? [{ label: "Batterie", amount: calc.batteryDeduction }] : []),
          ...(calc.gradeDeduction > 0 ? [{ label: `Grade ${state.grade}`, amount: calc.gradeDeduction }] : []),
          ...calc.defectLines.map((line) => ({ label: line.label, amount: line.amount })),
        ],
        defects: [...state.defects.map((d) => DEFECT_LABELS[d]), ...state.blockerFlags.map((b) => BLOCKER_LABELS[b])],
        plannedCostsTotal: calc.partsCost + calc.laborCost,
        prixAutomatique: calc.maxBuyback ?? 0,
        prixConseille: calc.suggestedOffer ?? 0,
        prixMaxAchat: calc.maxBuyback ?? 0,
        prixFinalPaye: proposedPrice ?? 0,
        manualOverride: state.proposedPrice !== "" && proposedPrice !== calc.suggestedOffer,
        margeEstimee: margin?.amount ?? 0,
        riskLevel: calc.manualReview.length ? "moyen" : "faible",
        blockedBy: calc.blocked,
        confirmationRequired: calc.manualReview,
      },
    });
    return id;
  };

  const accept = () => {
    const id = persistFile();
    acceptIntake(id);
    setDone({ id, accepted: true });
  };

  const refuse = () => {
    const id = persistFile();
    markRefused(id, calc.blocked[0] ?? state.refusedReason ?? undefined);
    setDone({ id, accepted: false });
  };

  if (done) {
    const file = files.find((f) => f.id === done.id);
    return (
      <DoneCard
        accepted={done.accepted}
        number={file?.number ?? ""}
        onClose={onClose}
        onNew={() => {
          setState(blankState());
          setStep(1);
          setDone(null);
        }}
        onOpen={() => onOpenDevice(done.id)}
        onPrint={() =>
          window.open(`/print/reconditionnement?id=${encodeURIComponent(done.id)}&doc=achat`, "_blank", "noopener")
        }
        onWorkshop={() => {
          sendToWorkshop(done.id);
          onOpenDevice(done.id);
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-[18px] border border-[#E4E7EC] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {STEPS.map((s, i) => {
          const stepState = step === s.id ? "active" : s.id < step ? "done" : "todo";
          return (
            <div className="flex flex-1 items-center" key={s.id}>
              <button
                className="flex min-w-0 items-center gap-2.5"
                onClick={() => s.id < step && setStep(s.id)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full font-semibold text-[13px] transition",
                    stepState === "active" && "bg-[#2A9D8F] text-white",
                    stepState === "done" && "bg-[#ECF8F4] text-[#147065]",
                    stepState === "todo" && "bg-[#F5F7FA] text-[#667085]",
                  )}
                >
                  {stepState === "done" ? <Check className="size-4" /> : s.id}
                </span>
                <span
                  className={cn(
                    "hidden whitespace-nowrap font-semibold text-[13px] md:block",
                    stepState === "active" ? "text-[#101828]" : "text-[#667085]",
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && <span className="mx-2 h-px flex-1 bg-[#E4E7EC]" />}
            </div>
          );
        })}
      </div>

      <div className={cn("mt-4 grid gap-4", step === 5 && "lg:grid-cols-[minmax(0,1fr)_380px]")}>
        <div className="rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-7">
          {step === 1 && (
            <StepDevice
              customers={customers.map((c) => c.name)}
              deviceBrands={deviceBrands}
              deviceModels={deviceModels}
              patch={patch}
              rules={rules}
              state={state}
            />
          )}
          {step === 2 && (
            <StepStorageColor
              deviceBrands={deviceBrands}
              deviceModels={deviceModels}
              patch={patch}
              rules={rules}
              state={state}
            />
          )}
          {step === 3 && (
            <StepBatteryGrade
              battery={battery}
              calcTarget={calc.targetResale}
              patch={patch}
              rules={rules}
              ruleItem={modelRule}
              state={state}
            />
          )}
          {step === 4 && (
            <StepDefectsParts
              calc={calc}
              modelRule={modelRule}
              parts={parts}
              patch={patch}
              rules={rules}
              state={state}
            />
          )}
          {step === 5 && (
            <StepOfferDecision
              blocked={blocked}
              calc={calc}
              onAccept={accept}
              onRefuse={refuse}
              patch={patch}
              proposedPrice={proposedPrice}
              state={state}
            />
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-[#F2F4F7] border-t pt-5">
            <GhostButton className="h-13 px-6" onClick={() => (step === 1 ? onClose() : setStep(step - 1))}>
              <ArrowLeft className="size-5" />
              {step === 1 ? "Annuler" : "Retour"}
            </GhostButton>
            {step < 5 && (
              <AccentButton className="h-13 px-7" disabled={!canNext} onClick={() => setStep(step + 1)}>
                Suivant
                <ArrowRight className="size-5" />
              </AccentButton>
            )}
          </div>
        </div>

        {/* Panneau récapitulatif sticky (étape 5) */}
        {step === 5 && <OfferSummaryPanel calc={calc} margin={margin} proposedPrice={proposedPrice} state={state} />}
      </div>

      {/* Estimation en direct (étapes 2 à 4) */}
      {step > 1 && step < 5 && (
        <div className="sticky bottom-3 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#D7EFEA] bg-[#F7FCFA]/95 px-5 py-3.5 shadow-[0_8px_24px_rgba(16,24,40,0.08)] backdrop-blur">
          <span className="text-[#667085] text-[13px]">
            {[state.brand, state.model, state.storage].filter(Boolean).join(" ") || "Appareil"}
            {state.batteryTier
              ? ` · Batterie ${BATTERY_TIER_LABELS.find((t) => t.key === state.batteryTier)?.label}`
              : ""}
          </span>
          {blocked ? (
            <span className="font-semibold text-[#B4342A] text-[14px]">Reprise bloquée</span>
          ) : (
            <span className="font-semibold text-[#147065] text-[16px]">
              Prix de reprise conseillé : {formatMoney(calc.suggestedOffer)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════ Étape 1 — Appareil ════════════════ */

function StepDevice({
  state,
  patch,
  rules,
  customers,
  deviceBrands,
  deviceModels,
}: Readonly<{
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
  rules: ReturnType<typeof useReconditioningRules.getState>;
  customers: string[];
  deviceBrands: DeviceBrand[];
  deviceModels: DeviceModel[];
}>) {
  const activeModels = useMemo(() => deviceModels.filter((model) => model.isActive), [deviceModels]);
  const brandById = useMemo(() => new Map(deviceBrands.map((brand) => [brand.id, brand])), [deviceBrands]);

  // Marques : celles des règles configurées d'abord, complétées par le catalogue appareils existant.
  const ruleBrands = brandsFromRules(rules);
  const catalogBrands = activeModels
    .map((model) => brandById.get(model.brandId)?.name)
    .filter((brand): brand is string => Boolean(brand));
  const priorityBrands = ["Apple", "Samsung", "Xiaomi", "Google"];
  const brands = [
    ...new Set([
      ...ruleBrands,
      ...priorityBrands.filter((brand) => catalogBrands.includes(brand)),
      ...catalogBrands.sort((a, b) => a.localeCompare(b, "fr")),
    ]),
  ];

  const ruleModels = state.brand ? modelsForBrand(rules, state.brand) : [];
  const catalogBrandIds = deviceBrands.filter((brand) => brand.name === state.brand).map((brand) => brand.id);
  const catalogModels = state.brand
    ? activeModels
        .filter((model) => catalogBrandIds.includes(model.brandId))
        .map((model) => model.name)
        .sort((a, b) => a.localeCompare(b, "fr"))
    : [];
  const models = [...new Set([...ruleModels, ...catalogModels])];

  return (
    <div>
      <StepTitle
        subtitle="Sélectionnez la marque puis le modèle — les modèles configurés dans vos règles ont un prix cible."
        title="Appareil"
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Client / fournisseur (optionnel)">
          <input
            className={inputCls}
            list="recond-customers"
            onChange={(e) => patch({ customerName: e.target.value })}
            placeholder="Nom du client"
            value={state.customerName}
          />
          <datalist id="recond-customers">
            {[...new Set(customers)].slice(0, 50).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </FieldLabel>
        <FieldLabel label="Provenance">
          <select
            className={selectCls}
            onChange={(e) => patch({ provenance: e.target.value as WizardState["provenance"] })}
            value={state.provenance}
          >
            <option value="client">Client</option>
            <option value="fournisseur">Fournisseur</option>
            <option value="autre">Autre</option>
          </select>
        </FieldLabel>
      </div>

      <p className="mb-2.5 font-semibold text-[#101828] text-[13.5px]">Marque</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((brand) => (
          <BigCard
            active={!state.customBrand && state.brand === brand}
            key={brand}
            label={brand}
            onClick={() => patch({ brand, model: "", storage: "", customBrand: false })}
          />
        ))}
        <BigCard
          active={state.customBrand}
          label="Autre"
          onClick={() => patch({ brand: "", model: "", storage: "", customBrand: true })}
        />
      </div>

      {state.customBrand && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Marque">
            <input
              className={inputCls}
              onChange={(e) => patch({ brand: e.target.value })}
              placeholder="Marque"
              value={state.brand}
            />
          </FieldLabel>
          <FieldLabel label="Modèle">
            <input
              className={inputCls}
              onChange={(e) => patch({ model: e.target.value })}
              placeholder="Modèle"
              value={state.model}
            />
          </FieldLabel>
        </div>
      )}

      {!state.customBrand && state.brand && (
        <>
          <p className="mt-6 mb-2.5 font-semibold text-[#101828] text-[13.5px]">Modèle</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {models.map((model) => {
              const configured = ruleModels.includes(model);
              return (
                <BigCard
                  active={state.model === model}
                  badge={configured ? "Règles configurées" : undefined}
                  key={model}
                  label={model}
                  onClick={() => patch({ model, storage: "", color: "" })}
                />
              );
            })}
          </div>
        </>
      )}

      <div className="mt-6 max-w-[360px]">
        <FieldLabel label="IMEI / numéro de série (optionnel)">
          <input
            className={inputCls}
            onChange={(e) => patch({ imei: e.target.value })}
            placeholder="IMEI ou série"
            value={state.imei}
          />
        </FieldLabel>
      </div>
    </div>
  );
}

/* ════════════════ Étape 2 — GO & couleur ════════════════ */

function StepStorageColor({
  state,
  patch,
  rules,
  deviceBrands,
  deviceModels,
}: Readonly<{
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
  rules: ReturnType<typeof useReconditioningRules.getState>;
  deviceBrands: DeviceBrand[];
  deviceModels: DeviceModel[];
}>) {
  const brand = deviceBrands.find((item) => item.name === state.brand);
  const catalogModel = deviceModels.find(
    (item) => item.isActive && item.name === state.model && (!brand || item.brandId === brand.id),
  );
  const storageOptions = getDeviceStorageOptions({
    type: catalogModel?.deviceType ?? "Smartphone",
    brandName: state.brand,
    modelName: state.model,
    modelRules: rules.modelRules,
  });
  const storages = storageOptions.map((storage) => {
    const rule = findModelRule(rules, { brand: state.brand, model: state.model, storage: storage.label });
    return { storage, target: rule?.targetResalePrice ?? null };
  });
  const selectedStorage = storageOptions.find((storage) => storage.label === state.storage) ?? storageOptions[0];
  const colors = selectedStorage?.colors.map((color) => color.label) ?? [];

  return (
    <div>
      <StepTitle
        subtitle={`Chaque stockage a son propre prix cible pour ${state.model || "ce modèle"}.`}
        title="Stockage & couleur"
      />

      <p className="mb-2.5 font-semibold text-[#101828] text-[13.5px]">Stockage</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {storages.map(({ storage, target }) => (
          <BigCard
            active={state.storage === storage.label}
            badge={target != null && target > 0 ? `Cible ${formatMoney(target)}` : undefined}
            key={storage.label}
            label={storage.label}
            onClick={() => patch({ storage: storage.label, color: colors.includes(state.color) ? state.color : "" })}
          />
        ))}
      </div>

      <p className="mt-6 mb-2.5 font-semibold text-[#101828] text-[13.5px]">Couleur</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[...colors, "Autre"].map((color) => (
          <BigCard active={state.color === color} key={color} label={color} onClick={() => patch({ color })} small />
        ))}
      </div>
      {state.color === "Autre" && (
        <div className="mt-3 max-w-[280px]">
          <input
            className={inputCls}
            onChange={(e) => patch({ customColor: e.target.value })}
            placeholder="Couleur"
            value={state.customColor}
          />
        </div>
      )}
    </div>
  );
}

/* ════════════════ Étape 3 — Batterie & état ════════════════ */

function StepBatteryGrade({
  state,
  patch,
  rules,
  ruleItem,
  battery,
  calcTarget,
}: Readonly<{
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
  rules: ReturnType<typeof useReconditioningRules.getState>;
  ruleItem: ReturnType<typeof findModelRule>;
  battery: { amount: number; replacementAdvised: boolean };
  calcTarget: number | null;
}>) {
  return (
    <div>
      <StepTitle
        subtitle={
          ruleItem?.battery
            ? "Décotes batterie propres à ce modèle."
            : "Barème batterie par défaut — configurez le modèle pour l'affiner."
        }
        title="Batterie & état"
      />

      <p className="mb-2.5 flex items-center gap-2 font-semibold text-[#101828] text-[13.5px]">
        <Battery className="size-4 text-[#2A9D8F]" />
        Santé batterie
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {BATTERY_TIER_LABELS.map((tier) => {
          const deduction = calculateBatteryDeduction(rules, ruleItem, tier.key);
          return (
            <BigCard
              active={state.batteryTier === tier.key}
              badge={deduction.amount > 0 ? `− ${formatMoney(deduction.amount)}` : "Aucune décote"}
              badgeTone={deduction.amount > 0 ? "danger" : "good"}
              key={tier.key}
              label={tier.label}
              onClick={() => patch({ batteryTier: tier.key })}
            />
          );
        })}
      </div>
      {battery.replacementAdvised && (
        <p className="mt-3 rounded-[12px] border border-[#F0E0BC] bg-[#FFF9EE] px-3.5 py-2.5 font-semibold text-[#9A6B1B] text-[12.5px]">
          Remplacement batterie conseillé pour ce modèle — décote supplémentaire appliquée et pièce batterie suggérée.
        </p>
      )}

      <p className="mt-6 mb-2.5 font-semibold text-[#101828] text-[13.5px]">Grade esthétique</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {GRADES.map(({ grade, label }) => {
          const deduction = grade === "HS" ? null : calculateGradeDeduction(rules, ruleItem, grade, calcTarget);
          return (
            <BigCard
              active={state.grade === grade}
              badge={
                grade === "HS"
                  ? "Non revendable"
                  : deduction != null && deduction > 0
                    ? `− ${formatMoney(deduction)}`
                    : "Aucune décote"
              }
              badgeTone={grade === "HS" || (deduction != null && deduction > 0) ? "danger" : "good"}
              key={grade}
              label={`${grade}`}
              onClick={() => patch({ grade })}
              sub={label}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════ Étape 4 — Défauts & pièces ════════════════ */

function StepDefectsParts({
  state,
  patch,
  calc,
  parts,
  rules,
  modelRule,
}: Readonly<{
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
  calc: ReconditioningOfferCalculation;
  parts: EstimatedPartLine[];
  rules: ReturnType<typeof useReconditioningRules.getState>;
  modelRule: ReturnType<typeof findModelRule>;
}>) {
  // Décotes du profil du modèle pour TOUS les défauts (affichées même non cochés).
  const allDefectLines = calculateDefectDeductions(rules, modelRule, DEFECT_KEYS);
  const toggleDefect = (key: DefectKey) =>
    patch({ defects: state.defects.includes(key) ? state.defects.filter((d) => d !== key) : [...state.defects, key] });
  const toggleBlocker = (key: BlockerKey) =>
    patch({
      blockerFlags: state.blockerFlags.includes(key)
        ? state.blockerFlags.filter((b) => b !== key)
        : [...state.blockerFlags, key],
    });
  const overridePart = (key: PartKey, override: PartOverride) =>
    patch({ partOverrides: { ...state.partOverrides, [key]: override } });

  return (
    <div>
      <StepTitle
        subtitle="Chaque défaut applique la décote de CE modèle. Les pièces sont des coûts estimés, lus depuis le stock compatible — le stock n'est pas décrémenté ici."
        title="Défauts & pièces"
      />

      <p className="mb-2.5 font-semibold text-[#101828] text-[13.5px]">Défauts constatés</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {allDefectLines.map((line) => (
          <DefectCard
            active={state.defects.includes(line.key)}
            amount={line.amount}
            badge={line.action === "manual" ? "Validation manuelle" : line.action === "block" ? "Bloquant" : undefined}
            key={line.key}
            label={line.label}
            onClick={() => toggleDefect(line.key)}
          />
        ))}
      </div>

      <p className="mt-6 mb-2.5 font-semibold text-[#101828] text-[13.5px]">Blocages critiques</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {BLOCKER_KEYS.map((key) => (
          <DefectCard
            active={state.blockerFlags.includes(key)}
            badge={key === "oxydationForte" || key === "carteMere" ? "Validation manuelle" : "Bloquant"}
            key={key}
            label={BLOCKER_LABELS[key]}
            onClick={() => toggleBlocker(key)}
            tone="critical"
          />
        ))}
      </div>

      {(calc.blocked.length > 0 || calc.manualReview.length > 0) && (
        <div className="mt-4 space-y-2">
          {calc.blocked.map((b) => (
            <Banner key={b} kind="critical" text={b} />
          ))}
          {calc.manualReview.map((b) => (
            <Banner key={b} kind="warn" text={b} />
          ))}
        </div>
      )}

      <p className="mt-6 mb-2.5 font-semibold text-[#101828] text-[13.5px]">Pièces estimées à changer</p>
      {parts.length === 0 ? (
        <p className="rounded-[14px] border border-[#E4E7EC] border-dashed px-4 py-5 text-center text-[#98A2B3] text-[13px]">
          Aucune pièce suggérée — cochez un défaut pour estimer la remise en état.
        </p>
      ) : (
        <div className="space-y-2">
          {parts.map((line) => (
            <div
              className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-[13px] border border-[#E4E7EC] bg-[#FCFCFD] px-3 py-2.5"
              key={line.key}
            >
              <Wrench className="size-4 shrink-0 text-[#2A9D8F]" />
              <span className="min-w-[110px] flex-1 font-semibold text-[#101828] text-[13px]">{line.label}</span>
              <span
                className={cn(
                  "inline-flex h-[22px] items-center whitespace-nowrap rounded-full border px-2 font-semibold text-[10.5px]",
                  line.source === "stock" && "border-[#D7EFEA] bg-[#ECF8F4] text-[#147065]",
                  line.source === "manual" && "border-[#D9E7FF] bg-[#F3F7FF] text-[#2563EB]",
                  line.source === "default" && "border-[#E4E7EC] bg-[#F5F7FA] text-[#667085]",
                  line.source === "missing" && "border-[#F0D9D6] bg-[#FCF4F3] text-[#B4342A]",
                )}
              >
                {PART_COST_SOURCE_LABELS[line.source]}
              </span>
              <label className="flex items-center gap-1.5 text-[#667085] text-[12px]">
                Pièce
                <input
                  className={cn(
                    inputCls,
                    "h-8 w-[88px] text-right text-[12px]",
                    line.piece == null && "border-[#F0D9D6]",
                  )}
                  min={0}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const value = raw === "" ? null : Math.max(0, safeNumber(raw));
                    overridePart(line.key, { piece: value != null && value > 0 ? value : null, labor: line.labor });
                  }}
                  placeholder="—"
                  type="number"
                  value={line.piece ?? ""}
                />
                €
              </label>
              <label className="flex items-center gap-1.5 text-[#667085] text-[12px]">
                MO
                <input
                  className={cn(inputCls, "h-8 w-[76px] text-right text-[12px]")}
                  min={0}
                  onChange={(e) =>
                    overridePart(line.key, { piece: line.piece, labor: Math.max(0, safeNumber(e.target.value)) })
                  }
                  type="number"
                  value={line.labor}
                />
                €
              </label>
              <span className="whitespace-nowrap font-semibold text-[13px]">
                {isPriceKnown(line.piece) ? (
                  <span className="text-[#101828]">= {formatMoney(line.piece + line.labor)}</span>
                ) : (
                  <span className="text-[#B4342A]">À renseigner</span>
                )}
              </span>
              <button
                className="grid size-8 place-items-center rounded-[8px] text-[#98A2B3] transition hover:bg-[#FCF4F3] hover:text-[#B4342A]"
                onClick={() => overridePart(line.key, "removed")}
                title="Ne pas prévoir cette pièce"
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {calc.partsMissingPrice.length > 0 && (
            <p className="rounded-[12px] border border-[#F0D9D6] bg-[#FCF4F3] px-3.5 py-2.5 font-semibold text-[#B4342A] text-[12.5px]">
              Prix à renseigner :{" "}
              {calc.partsMissingPrice.map((key) => parts.find((p) => p.key === key)?.label ?? key).join(", ")} — ces
              pièces ne sont pas comptées dans le calcul tant que le prix est vide.
            </p>
          )}
          <p className="pt-1 text-right font-semibold text-[#147065] text-[13px]">
            Total estimé : {formatMoney(calc.partsCost + calc.laborCost)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ════════════════ Étape 5 — Offre & décision ════════════════ */

function StepOfferDecision({
  state,
  patch,
  calc,
  proposedPrice,
  blocked,
  onAccept,
  onRefuse,
}: Readonly<{
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
  calc: ReconditioningOfferCalculation;
  proposedPrice: number | null;
  blocked: boolean;
  onAccept: () => void;
  onRefuse: () => void;
}>) {
  return (
    <div>
      <StepTitle
        subtitle={
          blocked
            ? "Un blocage critique empêche la reprise — seul le refus est possible."
            : "Ajustez le prix proposé puis validez la décision du client."
        }
        title="Offre"
      />

      {calc.rule == null && !blocked && (
        <div className="mb-4 rounded-[14px] border border-[#F0E0BC] bg-[#FFF9EE] p-4">
          <p className="font-semibold text-[#9A6B1B] text-[13.5px]">
            Aucune règle pour {[state.brand, state.model, state.storage].filter(Boolean).join(" ") || "ce modèle"}
          </p>
          <p className="mt-0.5 mb-3 text-[#667085] text-[12.5px]">
            Indiquez un prix de revente cible manuel — vous pourrez créer la règle dans Paramètres → Catalogue de
            reprise.
          </p>
          <div className="max-w-[220px]">
            <input
              className={inputCls}
              min={0}
              onChange={(e) => patch({ manualTarget: e.target.value })}
              placeholder="Prix revente cible (€)"
              type="number"
              value={state.manualTarget}
            />
          </div>
        </div>
      )}

      {blocked ? (
        <div className="space-y-2">
          {calc.blocked.map((b) => (
            <Banner key={b} kind="critical" text={b} />
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] border border-[#D7EFEA] bg-[#F7FCFA] p-5">
          <FieldLabel label="Prix proposé au client (modifiable)">
            <input
              className={cn(inputCls, "h-13 font-semibold text-xl")}
              min={0}
              onChange={(e) => patch({ proposedPrice: e.target.value })}
              type="number"
              value={state.proposedPrice === "" ? (calc.suggestedOffer ?? "") : state.proposedPrice}
            />
          </FieldLabel>
          {calc.maxBuyback != null && proposedPrice != null && proposedPrice > calc.maxBuyback && (
            <p className="mt-3 rounded-[10px] bg-[#FCF4F3] px-3 py-2 font-semibold text-[#B4342A] text-[12px]">
              Au-dessus du prix de reprise maximum ({formatMoney(calc.maxBuyback)}) — marge sous votre cible.
            </p>
          )}
          {calc.manualReview.length > 0 && (
            <div className="mt-3 space-y-2">
              {calc.manualReview.map((b) => (
                <Banner key={b} kind="warn" text={b} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className={cn(
            "flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 p-5 text-center transition",
            blocked || proposedPrice == null
              ? "cursor-not-allowed border-[#E4E7EC] bg-[#F5F7FA] opacity-60"
              : "border-[#2A9D8F] bg-[#ECF8F4] hover:bg-[#DFF3ED]",
          )}
          disabled={blocked || proposedPrice == null}
          onClick={onAccept}
          type="button"
        >
          <CheckCircle2 className="size-7 text-[#147065]" />
          <span className="font-semibold text-[#147065] text-[15px]">Reprise acceptée</span>
          <span className="text-[#667085] text-[12.5px]">
            {proposedPrice != null ? `Achat ${formatMoney(proposedPrice)} — bon de reprise généré` : "Prix à compléter"}
          </span>
        </button>
        <button
          className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-[#E4E7EC] bg-white p-5 text-center transition hover:border-[#F0D9D6] hover:bg-[#FCF4F3]"
          onClick={onRefuse}
          type="button"
        >
          <XCircle className="size-7 text-[#B4342A]" />
          <span className="font-semibold text-[#B4342A] text-[15px]">Reprise refusée</span>
          <span className="text-[#667085] text-[12.5px]">Historique conservé — rien n'est ajouté au stock</span>
        </button>
      </div>
      {!blocked && (
        <div className="mt-4 max-w-[420px]">
          <FieldLabel label="Raison du refus (optionnel)">
            <input
              className={inputCls}
              onChange={(e) => patch({ refusedReason: e.target.value })}
              placeholder="Prix refusé par le client…"
              value={state.refusedReason}
            />
          </FieldLabel>
        </div>
      )}
    </div>
  );
}

/* ════════════════ Panneau récapitulatif sticky ════════════════ */

function OfferSummaryPanel({
  state,
  calc,
  proposedPrice,
  margin,
}: Readonly<{
  state: WizardState;
  calc: ReconditioningOfferCalculation;
  proposedPrice: number | null;
  margin: { amount: number; pct: number | null } | null;
}>) {
  const color = state.color === "Autre" ? state.customColor : state.color;
  return (
    <aside className="h-fit rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:sticky lg:top-5">
      <div className="flex items-center gap-2.5">
        <Smartphone className="size-4.5 text-[#2A9D8F]" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#101828] text-[14px]">
            {[state.brand, state.model, state.storage].filter(Boolean).join(" ") || "Appareil"}
          </p>
          <p className="truncate text-[#98A2B3] text-[11.5px]">
            {[
              color,
              state.batteryTier
                ? `Batterie ${BATTERY_TIER_LABELS.find((t) => t.key === state.batteryTier)?.label}`
                : "",
              `Grade ${state.grade}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-0.5 text-[12.5px]">
        <SummaryRow label="Prix revente estimé" value={formatMoney(calc.targetResale)} />
        {calc.batteryDeduction > 0 && (
          <SummaryRow label="Décote batterie" negative value={formatMoney(calc.batteryDeduction)} />
        )}
        {calc.gradeDeduction > 0 && (
          <SummaryRow label={`Décote grade ${state.grade}`} negative value={formatMoney(calc.gradeDeduction)} />
        )}
        {calc.defectLines.map((line) => (
          <SummaryRow key={line.key} label={line.label} negative value={formatMoney(line.amount)} />
        ))}
        {calc.partsCost > 0 && <SummaryRow label="Coût pièces estimé" negative value={formatMoney(calc.partsCost)} />}
        {calc.laborCost > 0 && <SummaryRow label="Main-d'œuvre estimée" negative value={formatMoney(calc.laborCost)} />}
        <SummaryRow label="Marge cible" negative value={formatMoney(calc.targetMarginAmount)} />
        <SummaryRow label="Risque" negative value={formatMoney(calc.riskAmount)} />
        <div className="border-[#F2F4F7] border-t pt-1.5">
          <SummaryRow label="Prix de reprise max" strong value={formatMoney(calc.maxBuyback)} />
          <SummaryRow label="Prix de reprise conseillé" strong tone="accent" value={formatMoney(calc.suggestedOffer)} />
          <SummaryRow label="Prix proposé" strong tone="accent" value={formatMoney(proposedPrice)} />
        </div>
      </div>

      <div className="mt-3 rounded-[12px] bg-[#F5F7FA] px-3.5 py-2.5">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-[#667085]">Marge estimée après reprise</span>
          <span
            className={cn(
              "font-semibold",
              margin == null ? "text-[#98A2B3]" : margin.amount >= 0 ? "text-[#147065]" : "text-[#B4342A]",
            )}
          >
            {margin == null
              ? "À compléter"
              : `${formatMoney(margin.amount)}${margin.pct != null ? ` (${margin.pct} %)` : ""}`}
          </span>
        </div>
      </div>
    </aside>
  );
}

/* ════════════════ Confirmation ════════════════ */

function DoneCard({
  accepted,
  number,
  onNew,
  onClose,
  onOpen,
  onPrint,
  onWorkshop,
}: Readonly<{
  accepted: boolean;
  number: string;
  onNew: () => void;
  onClose: () => void;
  onOpen: () => void;
  onPrint: () => void;
  onWorkshop: () => void;
}>) {
  return (
    <div className="mx-auto grid w-full max-w-[560px] place-items-center py-8">
      <div className="w-full rounded-[20px] border border-[#E4E7EC] bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <span
          className={cn(
            "mx-auto grid size-14 place-items-center rounded-full",
            accepted ? "bg-[#ECF8F4] text-[#147065]" : "bg-[#F5F7FA] text-[#667085]",
          )}
        >
          {accepted ? <CheckCircle2 className="size-7" /> : <X className="size-7" />}
        </span>
        <h2 className="mt-5 font-semibold text-[#101828] text-xl">
          {accepted ? "Reprise acceptée" : "Reprise refusée"}
        </h2>
        <p className="mt-1 text-[#667085] text-sm">
          Référence <span className="font-mono font-semibold text-[#167B70]">{number}</span>
          {accepted
            ? " — l'appareil est en statut Acheté, visible dans Appareils."
            : " — l'historique est conservé, rien n'a été ajouté au stock."}
        </p>

        {accepted && (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <GhostButton className="w-full" onClick={onPrint}>
              <FileText className="size-4 text-[#2A9D8F]" />
              Bon de reprise
            </GhostButton>
            <AccentButton className="w-full" onClick={onWorkshop}>
              <Wrench className="size-4" />
              Passer en atelier
            </AccentButton>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <GhostButton className="w-full" onClick={onNew}>
            Nouvelle reprise
          </GhostButton>
          {accepted ? (
            <GhostButton className="w-full" onClick={onOpen}>
              <BadgeCheck className="size-4 text-[#2A9D8F]" />
              Ouvrir la fiche
            </GhostButton>
          ) : (
            <AccentButton className="w-full" onClick={onClose}>
              Terminer
            </AccentButton>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════ Primitives tactiles ════════════════ */

function StepTitle({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold text-[#2A9D8F] text-[15px]">{title}</h2>
      <p className="mt-0.5 text-[#667085] text-[13px]">{subtitle}</p>
    </div>
  );
}

function BigCard({
  label,
  sub,
  badge,
  badgeTone,
  active,
  onClick,
  small,
}: Readonly<{
  label: string;
  sub?: string;
  badge?: string;
  badgeTone?: "good" | "danger";
  active: boolean;
  onClick: () => void;
  small?: boolean;
}>) {
  return (
    <button
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-[16px] border-2 px-3 text-center transition",
        small ? "min-h-[56px] py-2.5" : "min-h-[76px] py-3.5",
        active ? "border-[#2A9D8F] bg-[#ECF8F4]" : "border-[#E4E7EC] bg-white hover:border-[#2A9D8F]/40",
      )}
      onClick={onClick}
      type="button"
    >
      <span className={cn("font-semibold text-[14.5px]", active ? "text-[#147065]" : "text-[#101828]")}>{label}</span>
      {sub && <span className="text-[#667085] text-[11.5px]">{sub}</span>}
      {badge && (
        <span
          className={cn(
            "font-semibold text-[11.5px]",
            badgeTone === "danger" ? "text-[#B4342A]" : badgeTone === "good" ? "text-[#147065]" : "text-[#98A2B3]",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function DefectCard({
  label,
  amount,
  badge,
  active,
  onClick,
  tone,
}: Readonly<{
  label: string;
  amount?: number;
  badge?: string;
  active: boolean;
  onClick: () => void;
  tone?: "critical";
}>) {
  return (
    <button
      className={cn(
        "flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-[14px] border-2 px-3.5 py-2.5 text-left transition",
        active
          ? tone === "critical"
            ? "border-[#B4342A] bg-[#FCF4F3]"
            : "border-[#2A9D8F] bg-[#ECF8F4]"
          : "border-[#E4E7EC] bg-white hover:border-[#2A9D8F]/40",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "font-semibold text-[13px]",
          active ? (tone === "critical" ? "text-[#B4342A]" : "text-[#147065]") : "text-[#101828]",
        )}
      >
        {label}
      </span>
      {amount != null && amount > 0 && (
        <span className={cn("font-semibold text-[12px]", active ? "text-[#B4342A]" : "text-[#98A2B3]")}>
          − {formatMoney(amount)}
        </span>
      )}
      {badge && <span className={cn("text-[11px]", active ? "text-[#9A6B1B]" : "text-[#B0B0AB]")}>{badge}</span>}
    </button>
  );
}

function Banner({ text, kind }: Readonly<{ text: string; kind: "critical" | "warn" }>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[12px] border px-3.5 py-2.5",
        kind === "critical" ? "border-[#F0D9D6] bg-[#FCF4F3]" : "border-[#F0E0BC] bg-[#FFF9EE]",
      )}
    >
      {kind === "critical" ? (
        <ShieldAlert className="size-4 shrink-0 text-[#B4342A]" />
      ) : (
        <AlertTriangle className="size-4 shrink-0 text-[#9A6B1B]" />
      )}
      <span className={cn("font-semibold text-[12.5px]", kind === "critical" ? "text-[#B4342A]" : "text-[#9A6B1B]")}>
        {text}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  negative,
  strong,
  tone,
}: Readonly<{ label: string; value: string; negative?: boolean; strong?: boolean; tone?: "accent" }>) {
  return (
    <div className="flex items-center justify-between gap-3 py-[3px]">
      <span className={cn(strong ? "font-semibold text-[#101828]" : "text-[#667085]")}>{label}</span>
      <span
        className={cn(
          "font-semibold",
          tone === "accent" ? "text-[#147065]" : negative ? "text-[#B4342A]" : "text-[#101828]",
        )}
      >
        {negative && value !== "À compléter" ? `− ${value}` : value}
      </span>
    </div>
  );
}
