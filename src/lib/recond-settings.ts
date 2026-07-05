// recond-settings — moteur de stratégie et de calcul du module reconditionnement.
// Il conserve l'API simple historique tout en ajoutant les règles métier du workflow
// Reconditionnement : stratégie IA / manuel / pièces + main-d'œuvre, grades, coûts,
// blocages et simulateur.

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getMarketData } from "@/data/marketData";

/* ───────────────────────── Types ───────────────────────── */

export type SimpleGrade = "A+" | "A" | "B" | "C";
export type ReconditioningGrade = "A+" | "A" | "B" | "C" | "D" | "HS";
export type CalculationMethod = "ai" | "manual" | "parts_labor";

export const SIMPLE_GRADES: { grade: SimpleGrade; label: string }[] = [
  { grade: "A+", label: "Comme neuf" },
  { grade: "A", label: "Très bon état" },
  { grade: "B", label: "Bon état" },
  { grade: "C", label: "État correct" },
];

export const RECONDITIONING_GRADES: { grade: ReconditioningGrade; label: string; description: string }[] = [
  { grade: "A+", label: "Grade A+", description: "État impeccable, comme neuf. Aucune trace visible." },
  { grade: "A", label: "Grade A", description: "Excellent état. Traces d'usage très légères." },
  { grade: "B", label: "Grade B", description: "Bon état général. Traces d'usage visibles." },
  { grade: "C", label: "Grade C", description: "État correct. Rayures et impacts visibles." },
  { grade: "D", label: "Grade D", description: "État médiocre. Usure prononcée, chocs visibles." },
  { grade: "HS", label: "Grade HS", description: "Hors service. Non fonctionnel ou irréparable." },
];

export type BatteryTier = ">=90" | "85-89" | "80-84" | "<80";

export const BATTERY_TIERS: { key: BatteryTier; label: string; approxHealth: number }[] = [
  { key: ">=90", label: "Batterie ≥ 90 %", approxHealth: 93 },
  { key: "85-89", label: "Batterie 85–89 %", approxHealth: 87 },
  { key: "80-84", label: "Batterie 80–84 %", approxHealth: 82 },
  { key: "<80", label: "Batterie < 80 %", approxHealth: 75 },
];

export type SimpleDefectKey =
  | "ecranCasse"
  | "faceArriereCassee"
  | "batterieFaible"
  | "cameraHs"
  | "biometrieHs"
  | "reseauHs"
  | "chargeHs"
  | "chassisAbime"
  | "autreDefaut";

export const SIMPLE_DEFECTS: { key: SimpleDefectKey; label: string; category: string }[] = [
  { key: "ecranCasse", label: "Écran cassé", category: "Écran & tactile" },
  { key: "faceArriereCassee", label: "Dos cassé", category: "Châssis & dos" },
  { key: "batterieFaible", label: "Batterie < 80 %", category: "Batterie" },
  { key: "cameraHs", label: "Caméra arrière HS", category: "Caméras" },
  { key: "biometrieHs", label: "Face ID HS", category: "Biométrie" },
  { key: "reseauHs", label: "Réseau HS", category: "Réseau" },
  { key: "chargeHs", label: "Connecteur de charge HS", category: "Audio & connectique" },
  { key: "chassisAbime", label: "Châssis abîmé", category: "Châssis & dos" },
  { key: "autreDefaut", label: "Autre défaut", category: "Carte mère" },
];

export const defectLabel = (key: SimpleDefectKey) => SIMPLE_DEFECTS.find((d) => d.key === key)?.label ?? key;

export type DefectRisk = "Faible" | "Moyen" | "Élevé";
export type DefectAction = "deduct" | "confirm" | "block";

export type DefectCost = {
  piece: number;
  labor: number;
  risk: DefectRisk;
  active: boolean;
  action: DefectAction;
  source: "Configuré" | "Estimation IA" | "Manuel";
};

export type CalculationStrategy = {
  globalDefault: CalculationMethod;
  brandOverrides: Record<string, CalculationMethod | undefined>;
  modelOverrides: Record<string, CalculationMethod | undefined>;
};

export type ReconditioningModelRule = {
  brand: string;
  model: string;
  storage: string;
  color?: string;
  calculationSource?: CalculationMethod;
  baseBuyPrice: number;
  resalePrice: number;
  defaultGrade: ReconditioningGrade;
  activePartCosts: number;
  updatedAt: string;
  active: boolean;
};

export type BlockingAction = "Reprise impossible" | "Bloquer" | "Confirmer manuellement" | "Décote forte" | "Décote";
export type BlockingPriority = "Critique" | "Haute" | "Moyenne" | "Faible";

export type BlockingRule = {
  key: string;
  condition: string;
  action: BlockingAction;
  priority: BlockingPriority;
  active: boolean;
};

export type RecondSettings = {
  calculationStrategy: CalculationStrategy;
  modelRules: ReconditioningModelRule[];
  grades: { grade: SimpleGrade; decotePct: number; active: boolean }[];
  reconditioningGrades: {
    grade: ReconditioningGrade;
    label: string;
    description: string;
    resaleImpactPct: number;
    active: boolean;
  }[];
  resaleByGrade: Record<ReconditioningGrade, number | null>;
  batteryDecotes: Record<BatteryTier, number>;
  /** Ancienne API conservée pour le comptoir et les tests existants. */
  defectDecotes: Record<SimpleDefectKey, number>;
  defectCosts: Record<SimpleDefectKey, DefectCost>;
  blockingRules: BlockingRule[];
  minMarginPct: number;
  defaultLaborCost: number;
  riskFeePct: number;
  manualPriceAllowed: boolean;
  minNonRentableMarginPct: number;
  manualValidationMarginPct: number;
  defaultWarrantyMonths: number;
  labelTemplate: "standard" | "compact";
  receiptTemplate: "standard" | "detaille";
};

const DEFECT_DECOTES: Record<SimpleDefectKey, number> = {
  ecranCasse: 90,
  faceArriereCassee: 50,
  batterieFaible: 30,
  cameraHs: 45,
  biometrieHs: 70,
  reseauHs: 80,
  chargeHs: 35,
  chassisAbime: 40,
  autreDefaut: 25,
};

export const DEFAULT_RECOND_SETTINGS: RecondSettings = {
  calculationStrategy: {
    globalDefault: "ai",
    brandOverrides: { Apple: "manual" },
    modelOverrides: { "Apple|iPhone 13|128 Go": "parts_labor" },
  },
  modelRules: [
    {
      brand: "Apple",
      model: "iPhone 13",
      storage: "128 Go",
      color: "Minuit",
      calculationSource: "parts_labor",
      baseBuyPrice: 430,
      resalePrice: 699,
      defaultGrade: "A",
      activePartCosts: 3,
      updatedAt: "2024-05-18",
      active: true,
    },
    {
      brand: "Apple",
      model: "iPhone 12",
      storage: "128 Go",
      color: "Bleu",
      calculationSource: "manual",
      baseBuyPrice: 350,
      resalePrice: 569,
      defaultGrade: "B",
      activePartCosts: 2,
      updatedAt: "2024-05-17",
      active: true,
    },
    {
      brand: "Samsung",
      model: "Galaxy S21",
      storage: "128 Go",
      color: "Phantom Gray",
      calculationSource: "ai",
      baseBuyPrice: 280,
      resalePrice: 449,
      defaultGrade: "A",
      activePartCosts: 4,
      updatedAt: "2024-05-15",
      active: true,
    },
    {
      brand: "Xiaomi",
      model: "Xiaomi 12",
      storage: "128 Go",
      color: "Noir",
      calculationSource: "ai",
      baseBuyPrice: 220,
      resalePrice: 379,
      defaultGrade: "B",
      activePartCosts: 2,
      updatedAt: "2024-05-14",
      active: true,
    },
    {
      brand: "Google",
      model: "Pixel 6",
      storage: "128 Go",
      color: "Sorta Seafoam",
      calculationSource: "ai",
      baseBuyPrice: 180,
      resalePrice: 329,
      defaultGrade: "C",
      activePartCosts: 1,
      updatedAt: "2024-05-12",
      active: true,
    },
  ],
  grades: [
    { grade: "A+", decotePct: 0, active: true },
    { grade: "A", decotePct: 5, active: true },
    { grade: "B", decotePct: 12, active: true },
    { grade: "C", decotePct: 22, active: true },
  ],
  reconditioningGrades: [
    {
      grade: "A+",
      label: "Comme neuf",
      description: "État impeccable, aucune trace d'usage visible.",
      resaleImpactPct: 20,
      active: true,
    },
    {
      grade: "A",
      label: "Excellent état",
      description: "Traces d'usage très légères.",
      resaleImpactPct: 10,
      active: true,
    },
    { grade: "B", label: "Bon état", description: "Traces d'usage visibles.", resaleImpactPct: 0, active: true },
    {
      grade: "C",
      label: "État correct",
      description: "Rayures et impacts visibles.",
      resaleImpactPct: -10,
      active: true,
    },
    {
      grade: "D",
      label: "État médiocre",
      description: "Usure prononcée, chocs visibles.",
      resaleImpactPct: -20,
      active: true,
    },
    {
      grade: "HS",
      label: "Hors service",
      description: "Non fonctionnel ou irréparable.",
      resaleImpactPct: -100,
      active: true,
    },
  ],
  resaleByGrade: { "A+": 539, A: 489, B: 445, C: 400, D: 360, HS: null },
  batteryDecotes: { ">=90": 0, "85-89": 15, "80-84": 30, "<80": 50 },
  defectDecotes: DEFECT_DECOTES,
  defectCosts: {
    ecranCasse: { piece: 90, labor: 30, risk: "Moyen", active: true, action: "deduct", source: "Configuré" },
    faceArriereCassee: { piece: 50, labor: 30, risk: "Moyen", active: true, action: "deduct", source: "Configuré" },
    batterieFaible: { piece: 30, labor: 20, risk: "Faible", active: true, action: "deduct", source: "Configuré" },
    cameraHs: { piece: 45, labor: 30, risk: "Moyen", active: true, action: "deduct", source: "Manuel" },
    biometrieHs: { piece: 70, labor: 30, risk: "Élevé", active: true, action: "confirm", source: "Estimation IA" },
    reseauHs: { piece: 80, labor: 30, risk: "Élevé", active: true, action: "deduct", source: "Estimation IA" },
    chargeHs: { piece: 35, labor: 25, risk: "Faible", active: true, action: "deduct", source: "Configuré" },
    chassisAbime: { piece: 40, labor: 20, risk: "Moyen", active: true, action: "deduct", source: "Manuel" },
    autreDefaut: { piece: 25, labor: 20, risk: "Moyen", active: true, action: "confirm", source: "Estimation IA" },
  },
  blockingRules: [
    { key: "icloud", condition: "iCloud actif", action: "Reprise impossible", priority: "Critique", active: true },
    { key: "google", condition: "Compte Google verrouillé", action: "Bloquer", priority: "Critique", active: true },
    { key: "imei", condition: "IMEI blacklisté", action: "Bloquer", priority: "Critique", active: true },
    {
      key: "oxidation",
      condition: "Oxydation forte",
      action: "Confirmer manuellement",
      priority: "Haute",
      active: true,
    },
    {
      key: "motherboard",
      condition: "Carte mère suspecte",
      action: "Confirmer manuellement",
      priority: "Haute",
      active: true,
    },
    { key: "network", condition: "Réseau HS", action: "Décote forte", priority: "Moyenne", active: true },
    { key: "faceid", condition: "Face ID HS", action: "Décote", priority: "Moyenne", active: true },
    { key: "battery", condition: "Batterie très dégradée", action: "Décote", priority: "Faible", active: true },
    { key: "camera", condition: "Caméra arrière HS", action: "Décote", priority: "Faible", active: true },
  ],
  minMarginPct: 25,
  defaultLaborCost: 30,
  riskFeePct: 3,
  manualPriceAllowed: true,
  minNonRentableMarginPct: 10,
  manualValidationMarginPct: 15,
  defaultWarrantyMonths: 12,
  labelTemplate: "standard",
  receiptTemplate: "standard",
};

type RecondSettingsState = {
  settings: RecondSettings;
  update: (patch: Partial<RecondSettings>) => void;
  setGrade: (grade: SimpleGrade, patch: Partial<{ decotePct: number; active: boolean }>) => void;
  setReconditioningGrade: (
    grade: ReconditioningGrade,
    patch: Partial<{ label: string; description: string; resaleImpactPct: number; active: boolean }>,
  ) => void;
  setResaleByGrade: (grade: ReconditioningGrade, value: number | null) => void;
  setBatteryDecote: (tier: BatteryTier, value: number) => void;
  setDefectDecote: (key: SimpleDefectKey, value: number) => void;
  setDefectCost: (key: SimpleDefectKey, patch: Partial<DefectCost>) => void;
  setCalculationMethod: (method: CalculationMethod) => void;
  setBrandCalculationMethod: (brand: string, method: CalculationMethod) => void;
  setModelCalculationMethod: (modelKey: string, method: CalculationMethod) => void;
  updateModelRule: (modelKey: string, patch: Partial<ReconditioningModelRule>) => void;
  addModelRule: () => string;
  setBlockingRule: (key: string, patch: Partial<BlockingRule>) => void;
  reset: () => void;
};

export const useRecondSettings = create<RecondSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_RECOND_SETTINGS,
      update: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      setGrade: (grade, patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            grades: state.settings.grades.map((g) => (g.grade === grade ? { ...g, ...patch } : g)),
          },
        })),
      setReconditioningGrade: (grade, patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            reconditioningGrades: state.settings.reconditioningGrades.map((g) =>
              g.grade === grade ? { ...g, ...patch } : g,
            ),
          },
        })),
      setResaleByGrade: (grade, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            resaleByGrade: {
              ...state.settings.resaleByGrade,
              [grade]: value == null ? null : Math.max(0, Math.round(value)),
            },
          },
        })),
      setBatteryDecote: (tier, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            batteryDecotes: { ...state.settings.batteryDecotes, [tier]: Math.max(0, value) },
          },
        })),
      setDefectDecote: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            defectDecotes: { ...state.settings.defectDecotes, [key]: Math.max(0, value) },
            defectCosts: {
              ...state.settings.defectCosts,
              [key]: { ...state.settings.defectCosts[key], piece: Math.max(0, value) },
            },
          },
        })),
      setDefectCost: (key, patch) =>
        set((state) => {
          const current = state.settings.defectCosts[key];
          const next = {
            ...current,
            ...patch,
            piece: patch.piece == null ? current.piece : Math.max(0, Math.round(patch.piece)),
            labor: patch.labor == null ? current.labor : Math.max(0, Math.round(patch.labor)),
          };
          return {
            settings: {
              ...state.settings,
              defectCosts: { ...state.settings.defectCosts, [key]: next },
              defectDecotes: { ...state.settings.defectDecotes, [key]: next.piece },
            },
          };
        }),
      setCalculationMethod: (method) =>
        set((state) => ({
          settings: {
            ...state.settings,
            calculationStrategy: { ...state.settings.calculationStrategy, globalDefault: method },
          },
        })),
      setBrandCalculationMethod: (brand, method) =>
        set((state) => ({
          settings: {
            ...state.settings,
            calculationStrategy: {
              ...state.settings.calculationStrategy,
              brandOverrides: { ...state.settings.calculationStrategy.brandOverrides, [brand]: method },
            },
          },
        })),
      setModelCalculationMethod: (modelKey, method) =>
        set((state) => ({
          settings: {
            ...state.settings,
            calculationStrategy: {
              ...state.settings.calculationStrategy,
              modelOverrides: { ...state.settings.calculationStrategy.modelOverrides, [modelKey]: method },
            },
            modelRules: state.settings.modelRules.map((rule) =>
              modelRuleKey(rule) === modelKey
                ? { ...rule, calculationSource: method, updatedAt: new Date().toISOString().slice(0, 10) }
                : rule,
            ),
          },
        })),
      updateModelRule: (modelKey, patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            modelRules: state.settings.modelRules.map((rule) => {
              if (modelRuleKey(rule) !== modelKey) return rule;
              return {
                ...rule,
                ...patch,
                baseBuyPrice:
                  patch.baseBuyPrice == null ? rule.baseBuyPrice : Math.max(0, Math.round(patch.baseBuyPrice)),
                resalePrice: patch.resalePrice == null ? rule.resalePrice : Math.max(0, Math.round(patch.resalePrice)),
                activePartCosts:
                  patch.activePartCosts == null ? rule.activePartCosts : Math.max(0, Math.round(patch.activePartCosts)),
                updatedAt: new Date().toISOString().slice(0, 10),
              };
            }),
          },
        })),
      addModelRule: () => {
        const createdAt = new Date().toISOString().slice(0, 10);
        const suffix = Math.floor(Date.now() % 1000);
        const rule: ReconditioningModelRule = {
          brand: "Apple",
          model: `Nouveau modèle ${suffix}`,
          storage: "128 Go",
          color: "Noir",
          calculationSource: "ai",
          baseBuyPrice: 0,
          resalePrice: 0,
          defaultGrade: "B",
          activePartCosts: 0,
          updatedAt: createdAt,
          active: true,
        };
        const key = modelRuleKey(rule);
        set((state) => ({
          settings: {
            ...state.settings,
            modelRules: [rule, ...state.settings.modelRules],
            calculationStrategy: {
              ...state.settings.calculationStrategy,
              modelOverrides: { ...state.settings.calculationStrategy.modelOverrides, [key]: "ai" },
            },
          },
        }));
        return key;
      },
      setBlockingRule: (key, patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            blockingRules: state.settings.blockingRules.map((rule) =>
              rule.key === key ? { ...rule, ...patch } : rule,
            ),
          },
        })),
      reset: () => set({ settings: DEFAULT_RECOND_SETTINGS }),
    }),
    {
      name: "behar-recond-settings",
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Partial<RecondSettingsState> | undefined;
        const persistedSettings = state?.settings ?? {};
        const legacyDefectCosts = (persistedSettings as Partial<RecondSettings>).defectCosts;
        const legacyDefectDecotes =
          (persistedSettings as Partial<RecondSettings>).defectDecotes ??
          (legacyDefectCosts
            ? Object.fromEntries(Object.entries(legacyDefectCosts).map(([key, value]) => [key, value.piece]))
            : undefined);

        return {
          settings: {
            ...DEFAULT_RECOND_SETTINGS,
            ...persistedSettings,
            calculationStrategy: {
              ...DEFAULT_RECOND_SETTINGS.calculationStrategy,
              ...(persistedSettings as Partial<RecondSettings>).calculationStrategy,
              brandOverrides: {
                ...DEFAULT_RECOND_SETTINGS.calculationStrategy.brandOverrides,
                ...((persistedSettings as Partial<RecondSettings>).calculationStrategy?.brandOverrides ?? {}),
              },
              modelOverrides: {
                ...DEFAULT_RECOND_SETTINGS.calculationStrategy.modelOverrides,
                ...((persistedSettings as Partial<RecondSettings>).calculationStrategy?.modelOverrides ?? {}),
              },
            },
            modelRules: (persistedSettings as Partial<RecondSettings>).modelRules?.length
              ? (persistedSettings as RecondSettings).modelRules
              : DEFAULT_RECOND_SETTINGS.modelRules,
            grades: (persistedSettings as Partial<RecondSettings>).grades?.length
              ? (persistedSettings as RecondSettings).grades
              : DEFAULT_RECOND_SETTINGS.grades,
            reconditioningGrades: (persistedSettings as Partial<RecondSettings>).reconditioningGrades?.length
              ? (persistedSettings as RecondSettings).reconditioningGrades
              : DEFAULT_RECOND_SETTINGS.reconditioningGrades,
            resaleByGrade: {
              ...DEFAULT_RECOND_SETTINGS.resaleByGrade,
              ...((persistedSettings as Partial<RecondSettings>).resaleByGrade ?? {}),
            },
            batteryDecotes: {
              ...DEFAULT_RECOND_SETTINGS.batteryDecotes,
              ...((persistedSettings as Partial<RecondSettings>).batteryDecotes ?? {}),
            },
            defectDecotes: { ...DEFAULT_RECOND_SETTINGS.defectDecotes, ...legacyDefectDecotes },
            defectCosts: { ...DEFAULT_RECOND_SETTINGS.defectCosts, ...legacyDefectCosts },
            blockingRules: (persistedSettings as Partial<RecondSettings>).blockingRules?.length
              ? (persistedSettings as RecondSettings).blockingRules
              : DEFAULT_RECOND_SETTINGS.blockingRules,
          },
        };
      },
    },
  ),
);

export function modelRuleKey(rule: Pick<ReconditioningModelRule, "brand" | "model" | "storage">) {
  return [rule.brand, rule.model, rule.storage].join("|");
}

export function methodLabel(method: CalculationMethod) {
  if (method === "manual") return "Manuel par modèle";
  if (method === "parts_labor") return "Pièces + main-d'œuvre";
  return "Estimation IA";
}

export function resolveCalculationMethod(
  strategy: CalculationStrategy,
  input: { brand?: string; model?: string; storage?: string },
): { method: CalculationMethod; level: "modelOverride" | "brandOverride" | "globalDefault" | "aiFallback" } {
  const modelKey = [input.brand, input.model, input.storage].filter(Boolean).join("|");
  if (modelKey && strategy.modelOverrides[modelKey]) {
    return { method: strategy.modelOverrides[modelKey] as CalculationMethod, level: "modelOverride" };
  }
  if (input.brand && strategy.brandOverrides[input.brand]) {
    return { method: strategy.brandOverrides[input.brand] as CalculationMethod, level: "brandOverride" };
  }
  if (strategy.globalDefault) return { method: strategy.globalDefault, level: "globalDefault" };
  return { method: "ai", level: "aiFallback" };
}

/* ───────────────────────── Calcul d'offre d'achat ───────────────────────── */

export type BuyOfferInput = {
  brand: string;
  model: string;
  grade: SimpleGrade;
  batteryTier: BatteryTier;
  defects: SimpleDefectKey[];
  manualCote?: number;
};

export type BuyOffer = {
  coteBase: number;
  prixRevente: number;
  decotes: { label: string; amount: number }[];
  totalDecotes: number;
  coutsPrevus: number;
  travauxNecessaires: boolean;
  prixMax: number;
  prixConseille: number;
  hasMarket: boolean;
};

export function estimatedMargin(offer: BuyOffer, buyPrice: number): { marge: number; margePct: number } {
  const marge = offer.prixRevente - buyPrice - offer.coutsPrevus;
  const margePct = offer.prixRevente > 0 ? (marge / offer.prixRevente) * 100 : 0;
  return { marge: Math.round(marge), margePct: Math.round(margePct * 10) / 10 };
}

export function computeBuyOffer(input: BuyOfferInput, settings: RecondSettings): BuyOffer {
  const market = input.model
    ? (getMarketData(`${input.brand} ${input.model}`) ?? getMarketData(input.model))
    : undefined;
  const coteBase = Math.max(0, Math.round(input.manualCote ?? market?.prixMoyen ?? 0));
  const prixRevente = market?.prixInternet ?? Math.round(coteBase * 1.15);

  const decotes: { label: string; amount: number }[] = [];
  const push = (label: string, amount: number) => {
    if (amount > 0) decotes.push({ label, amount: Math.round(amount) });
  };

  const uniqueDefects = [...new Set(input.defects)];
  for (const key of uniqueDefects) {
    push(defectLabel(key), settings.defectDecotes[key] ?? settings.defectCosts[key]?.piece ?? 0);
  }

  const batteryTier = BATTERY_TIERS.find((t) => t.key === input.batteryTier);
  const batteryDecote = settings.batteryDecotes[input.batteryTier] ?? 0;
  if (!uniqueDefects.includes("batterieFaible") && batteryDecote > 0) {
    push(batteryTier?.label ?? "Batterie", batteryDecote);
  }

  const gradeRule = settings.grades.find((g) => g.grade === input.grade);
  if (gradeRule && gradeRule.decotePct > 0) {
    push(`Grade ${gradeRule.grade}`, (coteBase * gradeRule.decotePct) / 100);
  }

  const totalDecotes = decotes.reduce((sum, d) => sum + d.amount, 0);
  const travauxNecessaires = uniqueDefects.length > 0 || input.batteryTier === "80-84" || input.batteryTier === "<80";
  const coutsPrevus = travauxNecessaires ? settings.defaultLaborCost : 0;

  const prixMax = Math.max(0, Math.round(coteBase - totalDecotes));
  const prixVise = Math.round(prixRevente * (1 - settings.minMarginPct / 100) - coutsPrevus);
  const prixConseille = Math.max(0, Math.min(prixMax, prixVise));

  return {
    coteBase,
    prixRevente,
    decotes,
    totalDecotes,
    coutsPrevus,
    travauxNecessaires,
    prixMax,
    prixConseille,
    hasMarket: Boolean(market),
  };
}

export type ReconditioningProposalInput = {
  rule: ReconditioningModelRule;
  grade: ReconditioningGrade;
  defects: SimpleDefectKey[];
  method: CalculationMethod;
  manualBuyPrice?: number;
  extraRiskFee?: number;
};

export type ReconditioningProposal = {
  method: CalculationMethod;
  basePrice: number;
  resalePrice: number;
  gradeDeduction: number;
  partsTotal: number;
  laborTotal: number;
  riskFees: number;
  proposedBuyPrice: number;
  margin: number;
  marginPct: number;
  riskLevel: DefectRisk;
  status: "rentable" | "limite" | "non rentable" | "bloqué" | "validation manuelle";
  blockingReasons: string[];
};

const RISK_WEIGHT: Record<DefectRisk, number> = { Faible: 1, Moyen: 2, Élevé: 3 };

export function computeReconditioningProposal(
  input: ReconditioningProposalInput,
  settings: RecondSettings,
): ReconditioningProposal {
  const gradeRule = settings.reconditioningGrades.find((g) => g.grade === input.grade);
  const gradeDeduction =
    input.grade === "HS"
      ? input.rule.baseBuyPrice
      : Math.max(0, Math.round((input.rule.baseBuyPrice * Math.abs(gradeRule?.resaleImpactPct ?? 0)) / 100));
  const uniqueDefects = [...new Set(input.defects)];
  const costs = uniqueDefects.map((key) => settings.defectCosts[key]).filter(Boolean);
  const partsTotal = costs.reduce((sum, cost) => sum + (cost.active ? cost.piece : 0), 0);
  const laborTotal = costs.reduce((sum, cost) => sum + (cost.active ? cost.labor : 0), 0);
  const highestRisk = costs.reduce<DefectRisk>(
    (risk, cost) => (RISK_WEIGHT[cost.risk] > RISK_WEIGHT[risk] ? cost.risk : risk),
    "Faible",
  );
  const riskFees = Math.round(input.extraRiskFee ?? (input.rule.baseBuyPrice * settings.riskFeePct) / 100);
  const blockingReasons = uniqueDefects
    .filter((key) => settings.defectCosts[key]?.action === "block")
    .map((key) => defectLabel(key));

  const automaticPrice = Math.max(0, input.rule.baseBuyPrice - gradeDeduction - partsTotal - laborTotal - riskFees);
  const proposedBuyPrice =
    input.method === "manual" && typeof input.manualBuyPrice === "number" ? input.manualBuyPrice : automaticPrice;
  const margin = input.rule.resalePrice - proposedBuyPrice - partsTotal - laborTotal;
  const marginPct = input.rule.resalePrice > 0 ? Math.round((margin / input.rule.resalePrice) * 1000) / 10 : 0;

  let status: ReconditioningProposal["status"] = "rentable";
  if (blockingReasons.length || input.grade === "HS") status = "bloqué";
  else if (marginPct < settings.minNonRentableMarginPct) status = "non rentable";
  else if (marginPct < settings.manualValidationMarginPct) status = "validation manuelle";
  else if (marginPct < settings.minMarginPct) status = "limite";

  return {
    method: input.method,
    basePrice: input.rule.baseBuyPrice,
    resalePrice: input.rule.resalePrice,
    gradeDeduction,
    partsTotal,
    laborTotal,
    riskFees,
    proposedBuyPrice: Math.round(proposedBuyPrice),
    margin: Math.round(margin),
    marginPct,
    riskLevel: highestRisk,
    status,
    blockingReasons,
  };
}
