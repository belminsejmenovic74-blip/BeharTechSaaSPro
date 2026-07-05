"use client";

// reconditioning-pricing — moteur de reprise par modèle.
// Chaque combinaison marque + modèle + stockage possède SA configuration :
// prix de revente cible, barème batterie, décotes défauts et coûts de pièces
// sont embarqués dans la règle du modèle. Aucune règle d'un autre modèle ne
// peut fuiter : un iPhone 11 n'affiche jamais des pièces iPhone 13.
// Quand un modèle n'a pas de règle spécifique, le barème PAR DÉFAUT (neutre,
// clairement affiché comme tel) s'applique.
//
// Formule :
//   prix_revente_cible (modèle + stockage)
//   − décote_batterie (barème du modèle)
//   − décote_grade
//   − décote_défauts (barème du modèle)
//   − coûts_pièces_estimés − main_d'œuvre_estimée (coûts du modèle, stock ou manuel)
//   − marge_cible − risque
//   = prix_reprise_max  →  prix_conseillé  →  prix proposé (ajustable)

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ReconditioningGrade } from "@/lib/recond-settings";
import { safeNumber, safePercent } from "@/lib/reconditioning-calc";

/* ═══════════════════════ Types ═══════════════════════ */

export type BatteryTierKey = "90-100" | "85-89" | "80-84" | "<80";

export const BATTERY_TIER_LABELS: { key: BatteryTierKey; label: string; approxHealth: number }[] = [
  { key: "90-100", label: "100–90 %", approxHealth: 94 },
  { key: "85-89", label: "89–85 %", approxHealth: 87 },
  { key: "80-84", label: "84–80 %", approxHealth: 82 },
  { key: "<80", label: "< 80 %", approxHealth: 75 },
];

export type DefectKey =
  | "ecranCasse"
  | "tactileHs"
  | "faceIdHs"
  | "touchIdHs"
  | "vitreArriere"
  | "cameraHs"
  | "reseauHs"
  | "connecteurHs"
  | "hautParleurHs"
  | "microHs"
  | "oxydationLegere";

export const DEFECT_LABELS: Record<DefectKey, string> = {
  ecranCasse: "Écran cassé",
  tactileHs: "Tactile HS",
  faceIdHs: "Face ID HS",
  touchIdHs: "Touch ID HS",
  vitreArriere: "Face arrière cassée",
  cameraHs: "Caméra HS",
  reseauHs: "Réseau HS",
  connecteurHs: "Connecteur de charge HS",
  hautParleurHs: "Haut-parleur HS",
  microHs: "Micro HS",
  oxydationLegere: "Oxydation légère",
};

export type DefectAction = "decote" | "manual" | "block";

export type DefectRule = {
  /** Décote en € appliquée au prix de reprise. */
  amount: number;
  action: DefectAction;
  active: boolean;
};

export type PartKey =
  | "ecran"
  | "batterie"
  | "vitreArriere"
  | "connecteur"
  | "camera"
  | "hautParleur"
  | "micro"
  | "chassis";

export const PART_LABELS: Record<PartKey, string> = {
  ecran: "Écran",
  batterie: "Batterie",
  vitreArriere: "Vitre arrière",
  connecteur: "Connecteur de charge",
  camera: "Caméra",
  hautParleur: "Haut-parleur",
  micro: "Micro",
  chassis: "Châssis",
};

/** Provenance du coût d'une pièce dans une règle de reprise. */
export type PartCostSource = "stock" | "manual" | "default" | "missing";

export const PART_COST_SOURCE_LABELS: Record<PartCostSource, string> = {
  stock: "Depuis le stock",
  manual: "Manuel",
  default: "Par défaut",
  missing: "À renseigner",
};

/** Un prix pièce n'est connu que s'il est fini et strictement positif — 0 n'est jamais « gratuit par défaut ». */
export const isPriceKnown = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** Coût d'une pièce propre à UNE règle modèle + stockage. */
export type ModelPartCost = {
  /** Prix pièce en € — null = inconnu (« À renseigner »), jamais 0 par défaut. */
  piece: number | null;
  labor: number | null;
  /** Article du stock utilisé comme référence de coût. */
  stockItemId?: string;
  source: PartCostSource;
  active: boolean;
};

export type ModelPartCosts = Record<PartKey, ModelPartCost>;

/** Barème batterie propre à UNE règle modèle + stockage. */
export type ModelBatteryConfig = {
  /** Décote en € par tranche de santé batterie. */
  tiers: Record<BatteryTierKey, number>;
  /** Remplacement batterie conseillé sous ce seuil de santé (%) — 0 = jamais. */
  replacementAdvisedBelow: number;
  /** Décote supplémentaire quand le remplacement est conseillé. */
  replacementExtraDeduction: number;
};

export type ModelDefectRules = Record<DefectKey, DefectRule>;

/** Coût pièce du barème PAR DÉFAUT (pas de lien stock : c'est un fallback neutre). */
export type DefaultPartCost = {
  piece: number | null;
  labor: number | null;
  active: boolean;
};

export type ReconditioningCalculationMode = "ai" | "manual" | "parts_labor";
export type ReconditioningDefaultMode = ReconditioningCalculationMode;

export const CALCULATION_MODE_LABELS: Record<ReconditioningCalculationMode, string> = {
  ai: "Auto",
  manual: "Manuel",
  parts_labor: "Pièces + MO",
};

export const CALCULATION_MODE_TITLES: Record<ReconditioningCalculationMode, string> = {
  ai: "Automatique",
  manual: "Manuel",
  parts_labor: "Pièces + main-d'œuvre",
};

export const CALCULATION_MODE_DESCRIPTIONS: Record<ReconditioningCalculationMode, string> = {
  ai: "Calcul automatique selon vos règles et l'historique.",
  manual: "Vous fixez le prix de reprise maximum et le prix de revente estimé.",
  parts_labor: "Prix de revente estimé, moins défauts, pièces, main-d'œuvre, marge et risque.",
};

/** Défaut → pièce estimée à changer (suggestion automatique à la reprise). */
export const DEFECT_TO_PART: Partial<Record<DefectKey, PartKey>> = {
  ecranCasse: "ecran",
  tactileHs: "ecran",
  vitreArriere: "vitreArriere",
  connecteurHs: "connecteur",
  cameraHs: "camera",
  hautParleurHs: "hautParleur",
  microHs: "micro",
};

/** Règle par modèle + stockage : le cœur du moteur. Tout est embarqué ici. */
export type ReconditioningModelPriceRule = {
  id: string;
  brand: string;
  model: string;
  storage: string;
  calculationMode: ReconditioningCalculationMode;
  /** Prix de revente cible pour cette combinaison exacte. */
  targetResalePrice: number;
  /** Prix de reprise maximum saisi dans le mode manuel. */
  manualMaxBuybackPrice?: number;
  /** Prix proposé par défaut dans le mode manuel. */
  defaultOfferPrice?: number;
  allowFinalManualAdjustment?: boolean;
  minimumAcceptablePrice?: number;
  /** Surcharges propres à ce modèle + stockage, sinon réglages globaux. */
  targetMarginPct?: number;
  riskPct?: number;
  defaultLaborCost?: number;
  diagnosticCost?: number;
  /** Barèmes embarqués, propres à CE modèle + stockage. Absents = barème par défaut. */
  battery?: ModelBatteryConfig;
  defects?: ModelDefectRules;
  parts?: ModelPartCosts;
  /** Décotes grade en € propres au modèle (sinon % globaux). */
  gradeOverrides?: Partial<Record<ReconditioningGrade, number>>;
  active: boolean;
  updatedAt: string;
};

/** Blocages critiques (globaux, surchargés par les actions des barèmes défauts). */
export type BlockerKey = "icloudActif" | "googleLock" | "imeiBlacklist" | "oxydationForte" | "carteMere";

export const BLOCKER_LABELS: Record<BlockerKey, string> = {
  icloudActif: "iCloud actif",
  googleLock: "Compte Google verrouillé",
  imeiBlacklist: "IMEI blacklisté",
  oxydationForte: "Oxydation forte",
  carteMere: "Carte mère suspecte",
};

export type BlockerRule = {
  key: BlockerKey;
  action: "block" | "manual";
  active: boolean;
};

/* ═══════════════ Types hérités (migration v1 uniquement) ═══════════════ */

export type PartCostRule = {
  piece: number;
  labor: number;
  stockItemId?: string;
  active: boolean;
};

type LegacyBatteryProfile = ModelBatteryConfig & { id: string; name: string };
type LegacyDefectProfile = { id: string; name: string; defects: ModelDefectRules };
type LegacyPartProfile = { id: string; name: string; parts: Record<PartKey, PartCostRule> };

type LegacyRuleFields = {
  batteryProfileId?: string;
  defectProfileId?: string;
  partProfileId?: string;
};

/* ═══════════════════════ Valeurs par défaut ═══════════════════════ */

const now = () => new Date().toISOString().slice(0, 10);

const defect = (amount: number, action: DefectAction = "decote", active = true): DefectRule => ({
  amount,
  action,
  active,
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Barème batterie PAR DÉFAUT — neutre, appliqué quand le modèle n'a pas sa règle. */
export const DEFAULT_BATTERY_CONFIG: ModelBatteryConfig = {
  tiers: { "90-100": 0, "85-89": 10, "80-84": 25, "<80": 45 },
  replacementAdvisedBelow: 80,
  replacementExtraDeduction: 10,
};

/** Barème défauts PAR DÉFAUT — neutre. */
export const DEFAULT_DEFECT_RULES: ModelDefectRules = {
  ecranCasse: defect(50),
  tactileHs: defect(45),
  faceIdHs: defect(25),
  touchIdHs: defect(20),
  vitreArriere: defect(20),
  cameraHs: defect(15),
  reseauHs: defect(20),
  connecteurHs: defect(15),
  hautParleurHs: defect(10),
  microHs: defect(10),
  oxydationLegere: defect(10),
};

const defaultPart = (piece: number | null, labor: number | null, active = true): DefaultPartCost => ({
  piece,
  labor,
  active,
});

/** Coûts pièces PAR DÉFAUT — fallback neutre, sans lien stock. */
export const DEFAULT_PART_COSTS: Record<PartKey, DefaultPartCost> = {
  ecran: defaultPart(70, 30),
  batterie: defaultPart(25, 15),
  vitreArriere: defaultPart(30, 20),
  connecteur: defaultPart(18, 15),
  camera: defaultPart(28, 20),
  hautParleur: defaultPart(12, 15),
  micro: defaultPart(12, 15),
  chassis: defaultPart(50, 40, false),
};

const modelPart = (piece: number | null, labor: number | null, active = true): ModelPartCost => ({
  piece,
  labor,
  source: isPriceKnown(piece) ? "manual" : "missing",
  active,
});

const IPHONE_13_BATTERY: ModelBatteryConfig = {
  tiers: { "90-100": 0, "85-89": 20, "80-84": 40, "<80": 70 },
  replacementAdvisedBelow: 85,
  replacementExtraDeduction: 20,
};

const IPHONE_12_BATTERY: ModelBatteryConfig = {
  tiers: { "90-100": 0, "85-89": 15, "80-84": 35, "<80": 60 },
  replacementAdvisedBelow: 85,
  replacementExtraDeduction: 15,
};

const GALAXY_S21_BATTERY: ModelBatteryConfig = {
  tiers: { "90-100": 0, "85-89": 15, "80-84": 30, "<80": 50 },
  replacementAdvisedBelow: 80,
  replacementExtraDeduction: 15,
};

const IPHONE_13_DEFECTS: ModelDefectRules = {
  ecranCasse: defect(80),
  tactileHs: defect(70),
  faceIdHs: defect(40),
  touchIdHs: defect(0, "decote", false),
  vitreArriere: defect(35),
  cameraHs: defect(20),
  reseauHs: defect(25),
  connecteurHs: defect(20),
  hautParleurHs: defect(15),
  microHs: defect(15),
  oxydationLegere: defect(10),
};

const IPHONE_12_DEFECTS: ModelDefectRules = {
  ...clone(IPHONE_13_DEFECTS),
  ecranCasse: defect(65),
  tactileHs: defect(55),
  faceIdHs: defect(35),
};

const GALAXY_S21_DEFECTS: ModelDefectRules = {
  ecranCasse: defect(60),
  tactileHs: defect(50),
  faceIdHs: defect(0, "decote", false),
  touchIdHs: defect(25),
  vitreArriere: defect(25),
  cameraHs: defect(18),
  reseauHs: defect(30, "manual"),
  connecteurHs: defect(18),
  hautParleurHs: defect(12),
  microHs: defect(12),
  oxydationLegere: defect(10),
};

const IPHONE_13_PARTS: ModelPartCosts = {
  ecran: modelPart(89, 35),
  batterie: modelPart(29.9, 15),
  vitreArriere: modelPart(39, 20),
  connecteur: modelPart(19, 15),
  camera: modelPart(35, 20),
  hautParleur: modelPart(15, 15),
  micro: modelPart(15, 15),
  chassis: modelPart(60, 40, false),
};

const IPHONE_12_PARTS: ModelPartCosts = {
  ecran: modelPart(75, 35),
  batterie: modelPart(24.9, 15),
  vitreArriere: modelPart(35, 20),
  connecteur: modelPart(17, 15),
  camera: modelPart(30, 20),
  hautParleur: modelPart(14, 15),
  micro: modelPart(14, 15),
  chassis: modelPart(55, 40, false),
};

const GALAXY_S21_PARTS: ModelPartCosts = {
  ecran: modelPart(110, 40),
  batterie: modelPart(25, 20),
  vitreArriere: modelPart(25, 15),
  connecteur: modelPart(15, 15),
  camera: modelPart(30, 20),
  hautParleur: modelPart(12, 15),
  micro: modelPart(12, 15),
  chassis: modelPart(50, 40, false),
};

const rule = (
  id: string,
  brand: string,
  model: string,
  storage: string,
  targetResalePrice: number,
  config: { battery?: ModelBatteryConfig; defects?: ModelDefectRules; parts?: ModelPartCosts },
  calculationMode: ReconditioningCalculationMode = "ai",
): ReconditioningModelPriceRule => ({
  id,
  brand,
  model,
  storage,
  calculationMode,
  targetResalePrice,
  battery: config.battery ? clone(config.battery) : undefined,
  defects: config.defects ? clone(config.defects) : undefined,
  parts: config.parts ? clone(config.parts) : undefined,
  allowFinalManualAdjustment: true,
  active: true,
  updatedAt: now(),
});

// Chaque modèle embarque SES barèmes : aucun partage entre modèles.
// Pixel 6 n'a volontairement pas de barème embarqué → « Par défaut » affiché.
const DEFAULT_MODEL_RULES: ReconditioningModelPriceRule[] = [
  rule(
    "mr-ip13-128",
    "Apple",
    "iPhone 13",
    "128 Go",
    560,
    { battery: IPHONE_13_BATTERY, defects: IPHONE_13_DEFECTS, parts: IPHONE_13_PARTS },
    "ai",
  ),
  rule(
    "mr-ip13-256",
    "Apple",
    "iPhone 13",
    "256 Go",
    620,
    { battery: IPHONE_13_BATTERY, defects: IPHONE_13_DEFECTS, parts: IPHONE_13_PARTS },
    "manual",
  ),
  rule(
    "mr-ip13-512",
    "Apple",
    "iPhone 13",
    "512 Go",
    690,
    { battery: IPHONE_13_BATTERY, defects: IPHONE_13_DEFECTS, parts: IPHONE_13_PARTS },
    "parts_labor",
  ),
  rule(
    "mr-ip12-128",
    "Apple",
    "iPhone 12",
    "128 Go",
    420,
    { battery: IPHONE_12_BATTERY, defects: IPHONE_12_DEFECTS, parts: IPHONE_12_PARTS },
    "parts_labor",
  ),
  rule(
    "mr-s21-128",
    "Samsung",
    "Galaxy S21",
    "128 Go",
    250,
    { battery: GALAXY_S21_BATTERY, defects: GALAXY_S21_DEFECTS, parts: GALAXY_S21_PARTS },
    "parts_labor",
  ),
  rule("mr-px6-128", "Google", "Pixel 6", "128 Go", 190, {}, "ai"),
];

/** Décotes grade par défaut, en % du prix de revente cible (surchargeable par modèle en €). */
const DEFAULT_GRADE_PCT: Record<ReconditioningGrade, number> = { "A+": 0, A: 4, B: 10, C: 18, D: 30, HS: 100 };

const DEFAULT_BLOCKERS: BlockerRule[] = [
  { key: "icloudActif", action: "block", active: true },
  { key: "googleLock", action: "block", active: true },
  { key: "imeiBlacklist", action: "block", active: true },
  { key: "oxydationForte", action: "manual", active: true },
  { key: "carteMere", action: "manual", active: true },
];

/* ═══════════════════════ Store des règles ═══════════════════════ */

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

type ReconditioningRulesState = {
  defaultMode: ReconditioningDefaultMode;
  modelRules: ReconditioningModelPriceRule[];
  /** Barèmes PAR DÉFAUT — appliqués quand le modèle n'a pas de règle spécifique. */
  defaultBattery: ModelBatteryConfig;
  defaultDefects: ModelDefectRules;
  defaultParts: Record<PartKey, DefaultPartCost>;
  gradePct: Record<ReconditioningGrade, number>;
  blockers: BlockerRule[];
  /** Marge cible (%) et risque (%) retenus sur le prix de revente cible. */
  targetMarginPct: number;
  riskPct: number;

  addModelRule: (patch?: Partial<ReconditioningModelPriceRule>) => string;
  updateModelRule: (id: string, patch: Partial<ReconditioningModelPriceRule>) => void;
  duplicateModelRule: (id: string) => string | null;
  removeModelRule: (id: string) => void;
  saveModelReconditioningRule: (
    input: Pick<ReconditioningModelPriceRule, "brand" | "model" | "storage">,
    patch: Partial<ReconditioningModelPriceRule>,
  ) => string;
  resetModelReconditioningRule: (input: Pick<ReconditioningModelPriceRule, "brand" | "model" | "storage">) => void;
  duplicateRuleToStorage: (sourceId: string, storage: string) => string | null;

  setDefaultBattery: (patch: Partial<ModelBatteryConfig>) => void;
  setDefaultBatteryTier: (tier: BatteryTierKey, amount: number) => void;
  setDefaultDefectRule: (key: DefectKey, patch: Partial<DefectRule>) => void;
  setDefaultPartCost: (key: PartKey, patch: Partial<DefaultPartCost>) => void;

  setGradePct: (grade: ReconditioningGrade, pct: number) => void;
  setBlocker: (key: BlockerKey, patch: Partial<BlockerRule>) => void;
  setMargins: (patch: Partial<{ targetMarginPct: number; riskPct: number }>) => void;
  setDefaultMode: (mode: ReconditioningDefaultMode) => void;
  reset: () => void;
};

const DEFAULT_RULES_STATE = {
  defaultMode: "ai" as ReconditioningDefaultMode,
  modelRules: DEFAULT_MODEL_RULES,
  defaultBattery: DEFAULT_BATTERY_CONFIG,
  defaultDefects: DEFAULT_DEFECT_RULES,
  defaultParts: DEFAULT_PART_COSTS,
  gradePct: DEFAULT_GRADE_PCT,
  blockers: DEFAULT_BLOCKERS,
  targetMarginPct: 25,
  riskPct: 3,
};

const cleanMoney = (value: number | null | undefined): number | null => {
  if (value == null) return null;
  const n = safeNumber(value);
  return n > 0 ? n : null;
};

const sanitizeModelParts = (parts: ModelPartCosts | undefined): ModelPartCosts | undefined => {
  if (!parts) return undefined;
  const next = {} as ModelPartCosts;
  for (const key of Object.keys(PART_LABELS) as PartKey[]) {
    const entry = parts[key];
    if (!entry) {
      next[key] = { ...modelPart(null, null), active: false };
      continue;
    }
    const piece = cleanMoney(entry.piece);
    next[key] = {
      piece,
      labor: entry.labor == null ? null : Math.max(0, safeNumber(entry.labor)),
      stockItemId: entry.stockItemId || undefined,
      source: entry.stockItemId
        ? "stock"
        : isPriceKnown(piece)
          ? entry.source === "default"
            ? "default"
            : "manual"
          : "missing",
      active: Boolean(entry.active),
    };
  }
  return next;
};

/* ─────────────── Migration v1 → v2 (profils partagés → barèmes embarqués) ─────────────── */

export function migrateRulesV1toV2(persisted: any): Partial<ReconditioningRulesState> {
  const batteryProfiles: LegacyBatteryProfile[] = Array.isArray(persisted?.batteryProfiles)
    ? persisted.batteryProfiles
    : [];
  const defectProfiles: LegacyDefectProfile[] = Array.isArray(persisted?.defectProfiles)
    ? persisted.defectProfiles
    : [];
  const partProfiles: LegacyPartProfile[] = Array.isArray(persisted?.partProfiles) ? persisted.partProfiles : [];
  const oldRules: (ReconditioningModelPriceRule & LegacyRuleFields)[] = Array.isArray(persisted?.modelRules)
    ? persisted.modelRules
    : [];

  const migratedRules: ReconditioningModelPriceRule[] = oldRules.map((old) => {
    const bp = batteryProfiles.find((p) => p.id === old.batteryProfileId);
    const dp = defectProfiles.find((p) => p.id === old.defectProfileId);
    const pp = partProfiles.find((p) => p.id === old.partProfileId);
    const parts: ModelPartCosts | undefined = pp
      ? (Object.fromEntries(
          (Object.keys(PART_LABELS) as PartKey[]).map((key) => {
            const legacy = pp.parts[key];
            const piece = cleanMoney(legacy?.piece);
            return [
              key,
              {
                piece,
                labor: legacy ? Math.max(0, safeNumber(legacy.labor)) : null,
                stockItemId: legacy?.stockItemId,
                source: legacy?.stockItemId ? "stock" : isPriceKnown(piece) ? "manual" : "missing",
                active: Boolean(legacy?.active),
              } satisfies ModelPartCost,
            ];
          }),
        ) as ModelPartCosts)
      : undefined;
    const { batteryProfileId: _b, defectProfileId: _d, partProfileId: _p, ...rest } = old;
    return {
      ...rest,
      battery:
        old.battery ??
        (bp
          ? {
              tiers: clone(bp.tiers),
              replacementAdvisedBelow: bp.replacementAdvisedBelow,
              replacementExtraDeduction: bp.replacementExtraDeduction,
            }
          : undefined),
      defects: old.defects ?? (dp ? clone(dp.defects) : undefined),
      parts: old.parts ?? parts,
    };
  });

  return {
    ...persisted,
    modelRules: migratedRules,
    defaultBattery: persisted?.defaultBattery ?? clone(DEFAULT_BATTERY_CONFIG),
    defaultDefects: persisted?.defaultDefects ?? clone(DEFAULT_DEFECT_RULES),
    defaultParts: persisted?.defaultParts ?? clone(DEFAULT_PART_COSTS),
    batteryProfiles: undefined,
    defectProfiles: undefined,
    partProfiles: undefined,
  };
}

export const useReconditioningRules = create<ReconditioningRulesState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_RULES_STATE,

      addModelRule: (patch) => {
        const id = uid("mr");
        set((state) => ({
          modelRules: [
            {
              id,
              brand: "",
              model: "",
              storage: "128 Go",
              calculationMode: state.defaultMode,
              targetResalePrice: 0,
              allowFinalManualAdjustment: true,
              active: true,
              updatedAt: now(),
              ...patch,
              parts: sanitizeModelParts(patch?.parts),
            },
            ...state.modelRules,
          ],
        }));
        return id;
      },
      updateModelRule: (id, patch) =>
        set((state) => ({
          modelRules: state.modelRules.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  calculationMode: patch.calculationMode ?? r.calculationMode ?? get().defaultMode,
                  targetResalePrice:
                    patch.targetResalePrice == null
                      ? r.targetResalePrice
                      : Math.max(0, safeNumber(patch.targetResalePrice)),
                  manualMaxBuybackPrice:
                    patch.manualMaxBuybackPrice == null
                      ? r.manualMaxBuybackPrice
                      : Math.max(0, safeNumber(patch.manualMaxBuybackPrice)),
                  defaultOfferPrice:
                    patch.defaultOfferPrice == null
                      ? r.defaultOfferPrice
                      : Math.max(0, safeNumber(patch.defaultOfferPrice)),
                  minimumAcceptablePrice:
                    patch.minimumAcceptablePrice == null
                      ? r.minimumAcceptablePrice
                      : Math.max(0, safeNumber(patch.minimumAcceptablePrice)),
                  targetMarginPct:
                    patch.targetMarginPct == null
                      ? r.targetMarginPct
                      : Math.max(0, Math.min(90, safeNumber(patch.targetMarginPct))),
                  riskPct: patch.riskPct == null ? r.riskPct : Math.max(0, Math.min(50, safeNumber(patch.riskPct))),
                  defaultLaborCost:
                    patch.defaultLaborCost == null
                      ? r.defaultLaborCost
                      : Math.max(0, safeNumber(patch.defaultLaborCost)),
                  diagnosticCost:
                    patch.diagnosticCost == null ? r.diagnosticCost : Math.max(0, safeNumber(patch.diagnosticCost)),
                  parts: patch.parts === undefined ? r.parts : sanitizeModelParts(patch.parts),
                  updatedAt: now(),
                }
              : r,
          ),
        })),
      duplicateModelRule: (id) => {
        const source = get().modelRules.find((r) => r.id === id);
        if (!source) return null;
        const copyId = uid("mr");
        set((state) => ({
          modelRules: [{ ...clone(source), id: copyId, updatedAt: now() }, ...state.modelRules],
        }));
        return copyId;
      },
      removeModelRule: (id) => set((state) => ({ modelRules: state.modelRules.filter((r) => r.id !== id) })),
      saveModelReconditioningRule: (input, patch) => {
        const cleanInput = {
          brand: input.brand.trim(),
          model: input.model.trim(),
          storage: input.storage.trim(),
        };
        if (!cleanInput.brand || !cleanInput.model || !cleanInput.storage) return "";
        const existing = get().modelRules.find(
          (ruleItem) =>
            ruleItem.brand === cleanInput.brand &&
            ruleItem.model === cleanInput.model &&
            ruleItem.storage === cleanInput.storage,
        );
        if (existing) {
          get().updateModelRule(existing.id, { ...patch, ...cleanInput, active: patch.active ?? true });
          return existing.id;
        }
        // Seul un stockage FRÈRE du MÊME modèle peut servir de base — jamais un autre modèle.
        const sibling = get().modelRules.find((r) => r.brand === cleanInput.brand && r.model === cleanInput.model);
        return get().addModelRule({
          ...cleanInput,
          calculationMode: patch.calculationMode ?? get().defaultMode,
          targetResalePrice: Math.max(0, safeNumber(patch.targetResalePrice)),
          manualMaxBuybackPrice:
            patch.manualMaxBuybackPrice == null ? undefined : Math.max(0, safeNumber(patch.manualMaxBuybackPrice)),
          defaultOfferPrice:
            patch.defaultOfferPrice == null ? undefined : Math.max(0, safeNumber(patch.defaultOfferPrice)),
          allowFinalManualAdjustment: patch.allowFinalManualAdjustment ?? true,
          minimumAcceptablePrice:
            patch.minimumAcceptablePrice == null ? undefined : Math.max(0, safeNumber(patch.minimumAcceptablePrice)),
          targetMarginPct:
            patch.targetMarginPct == null ? undefined : Math.max(0, Math.min(90, safeNumber(patch.targetMarginPct))),
          riskPct: patch.riskPct == null ? undefined : Math.max(0, Math.min(50, safeNumber(patch.riskPct))),
          defaultLaborCost:
            patch.defaultLaborCost == null ? undefined : Math.max(0, safeNumber(patch.defaultLaborCost)),
          diagnosticCost: patch.diagnosticCost == null ? undefined : Math.max(0, safeNumber(patch.diagnosticCost)),
          battery: patch.battery ?? (sibling?.battery ? clone(sibling.battery) : undefined),
          defects: patch.defects ?? (sibling?.defects ? clone(sibling.defects) : undefined),
          parts: patch.parts ?? (sibling?.parts ? clone(sibling.parts) : undefined),
          active: patch.active ?? true,
        });
      },
      resetModelReconditioningRule: (input) =>
        set((state) => ({
          modelRules: state.modelRules.filter(
            (ruleItem) =>
              !(ruleItem.brand === input.brand && ruleItem.model === input.model && ruleItem.storage === input.storage),
          ),
        })),
      duplicateRuleToStorage: (sourceId, storage) => {
        const source = get().modelRules.find((r) => r.id === sourceId);
        const cleanStorage = storage.trim();
        if (!source || !cleanStorage) return null;
        const { id: _id, updatedAt: _updatedAt, storage: _storage, ...copy } = clone(source);
        return get().saveModelReconditioningRule(
          { brand: source.brand, model: source.model, storage: cleanStorage },
          { ...copy, storage: cleanStorage, active: true },
        );
      },

      setDefaultBattery: (patch) =>
        set((state) => ({
          defaultBattery: {
            ...state.defaultBattery,
            ...patch,
            replacementAdvisedBelow:
              patch.replacementAdvisedBelow == null
                ? state.defaultBattery.replacementAdvisedBelow
                : Math.max(0, Math.min(100, safeNumber(patch.replacementAdvisedBelow))),
            replacementExtraDeduction:
              patch.replacementExtraDeduction == null
                ? state.defaultBattery.replacementExtraDeduction
                : Math.max(0, safeNumber(patch.replacementExtraDeduction)),
          },
        })),
      setDefaultBatteryTier: (tier, amount) =>
        set((state) => ({
          defaultBattery: {
            ...state.defaultBattery,
            tiers: { ...state.defaultBattery.tiers, [tier]: Math.max(0, safeNumber(amount)) },
          },
        })),
      setDefaultDefectRule: (key, patch) =>
        set((state) => ({
          defaultDefects: {
            ...state.defaultDefects,
            [key]: {
              ...state.defaultDefects[key],
              ...patch,
              amount: patch.amount == null ? state.defaultDefects[key].amount : Math.max(0, safeNumber(patch.amount)),
            },
          },
        })),
      setDefaultPartCost: (key, patch) =>
        set((state) => ({
          defaultParts: {
            ...state.defaultParts,
            [key]: {
              ...state.defaultParts[key],
              ...patch,
              piece: patch.piece === undefined ? state.defaultParts[key].piece : cleanMoney(patch.piece),
              labor:
                patch.labor === undefined
                  ? state.defaultParts[key].labor
                  : patch.labor == null
                    ? null
                    : Math.max(0, safeNumber(patch.labor)),
            },
          },
        })),

      setGradePct: (grade, pct) =>
        set((state) => ({ gradePct: { ...state.gradePct, [grade]: Math.max(0, Math.min(100, safeNumber(pct))) } })),
      setBlocker: (key, patch) =>
        set((state) => ({ blockers: state.blockers.map((b) => (b.key === key ? { ...b, ...patch } : b)) })),
      setMargins: (patch) =>
        set((state) => ({
          targetMarginPct:
            patch.targetMarginPct == null
              ? state.targetMarginPct
              : Math.max(0, Math.min(90, safeNumber(patch.targetMarginPct))),
          riskPct: patch.riskPct == null ? state.riskPct : Math.max(0, Math.min(50, safeNumber(patch.riskPct))),
        })),
      setDefaultMode: (mode) => set({ defaultMode: mode }),
      reset: () => set(clone({ ...DEFAULT_RULES_STATE })),
    }),
    {
      name: "behar-recond-rules",
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) return migrateRulesV1toV2(persisted) as ReconditioningRulesState;
        return persisted as ReconditioningRulesState;
      },
    },
  ),
);

/* ═══════════════════════ Résolution des règles ═══════════════════════ */

export type RulesSnapshot = Pick<
  ReconditioningRulesState,
  | "defaultMode"
  | "modelRules"
  | "defaultBattery"
  | "defaultDefects"
  | "defaultParts"
  | "gradePct"
  | "blockers"
  | "targetMarginPct"
  | "riskPct"
>;

export const brandsFromRules = (rules: RulesSnapshot): string[] => [
  ...new Set(rules.modelRules.filter((r) => r.active && r.brand).map((r) => r.brand)),
];

export const modelsForBrand = (rules: RulesSnapshot, brand: string): string[] => [
  ...new Set(rules.modelRules.filter((r) => r.active && r.brand === brand && r.model).map((r) => r.model)),
];

export const storagesForModel = (rules: RulesSnapshot, brand: string, model: string): ReconditioningModelPriceRule[] =>
  rules.modelRules
    .filter((r) => r.active && r.brand === brand && r.model === model)
    .sort((a, b) => a.targetResalePrice - b.targetResalePrice);

export function findModelRule(
  rules: RulesSnapshot,
  input: { brand: string; model: string; storage: string },
): ReconditioningModelPriceRule | null {
  return (
    rules.modelRules.find(
      (r) => r.active && r.brand === input.brand && r.model === input.model && r.storage === input.storage,
    ) ?? null
  );
}

export const getDefaultReconditioningMode = (rules: Pick<RulesSnapshot, "defaultMode">): ReconditioningDefaultMode =>
  rules.defaultMode ?? "ai";

export function getReconditioningRuleForModelStorage(
  rules: RulesSnapshot,
  input: { brand: string; model: string; storage: string },
): ReconditioningModelPriceRule | null {
  return findModelRule(rules, input);
}

/** @deprecated utilisez getReconditioningRuleForModelStorage */
export const getReconditioningRuleForModel = getReconditioningRuleForModelStorage;

export function resolveCalculationModeForDevice(
  rules: RulesSnapshot,
  input: { brand: string; model: string; storage: string },
): ReconditioningCalculationMode {
  return findModelRule(rules, input)?.calculationMode ?? getDefaultReconditioningMode(rules);
}

/* ─────────────── Barèmes effectifs (règle du modèle → sinon par défaut) ─────────────── */

/** Barème batterie effectif : celui du modèle, sinon le barème par défaut. */
export const resolveBatteryConfig = (
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
): { config: ModelBatteryConfig; source: "model" | "default" } =>
  ruleItem?.battery
    ? { config: ruleItem.battery, source: "model" }
    : { config: rules.defaultBattery, source: "default" };

/** Barème défauts effectif : celui du modèle, sinon le barème par défaut. */
export const resolveDefectRules = (
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
): { defects: ModelDefectRules; source: "model" | "default" } =>
  ruleItem?.defects
    ? { defects: ruleItem.defects, source: "model" }
    : { defects: rules.defaultDefects, source: "default" };

/** Coût pièce effectif : celui du modèle (stock/manuel), sinon barème par défaut, sinon « à renseigner ». */
export function resolvePartCost(
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
  key: PartKey,
): ModelPartCost {
  const own = ruleItem?.parts?.[key];
  if (own) {
    return {
      ...own,
      source: own.stockItemId
        ? "stock"
        : isPriceKnown(own.piece)
          ? own.source === "default"
            ? "default"
            : own.source
          : "missing",
    };
  }
  const fallback = rules.defaultParts[key];
  return {
    piece: fallback?.piece ?? null,
    labor: fallback?.labor ?? null,
    source: isPriceKnown(fallback?.piece) ? "default" : "missing",
    active: fallback?.active ?? false,
  };
}

/** Provenance du coût d'une pièce pour un modèle donné. */
export function getPartCostSource(
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
  key: PartKey,
): PartCostSource {
  return resolvePartCost(rules, ruleItem, key).source;
}

/* ═══════════════════════ Calculs unitaires ═══════════════════════ */

/** Prix de revente cible : celui de la règle modèle + stockage, sinon cote manuelle. */
export function calculateTargetResalePrice(
  rule2: ReconditioningModelPriceRule | null,
  manualTarget?: number | null,
): number | null {
  if (rule2 && rule2.targetResalePrice > 0) return rule2.targetResalePrice;
  if (manualTarget != null && Number.isFinite(manualTarget) && manualTarget > 0) return Math.round(manualTarget);
  return null;
}

/** Impact du stockage : écart de prix cible vs le stockage le moins cher du même modèle. */
export function calculateStorageImpact(rules: RulesSnapshot, ruleItem: ReconditioningModelPriceRule): number {
  const siblings = storagesForModel(rules, ruleItem.brand, ruleItem.model);
  if (siblings.length <= 1) return 0;
  return ruleItem.targetResalePrice - siblings[0].targetResalePrice;
}

/** Décote batterie du modèle (barème du modèle), avec remplacement conseillé éventuel. */
export function calculateBatteryDeduction(
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
  tier: BatteryTierKey | null,
): { amount: number; replacementAdvised: boolean } {
  if (!tier) return { amount: 0, replacementAdvised: false };
  const { config } = resolveBatteryConfig(rules, ruleItem);
  const approx = BATTERY_TIER_LABELS.find((t) => t.key === tier)?.approxHealth ?? 100;
  const replacementAdvised = config.replacementAdvisedBelow > 0 && approx < config.replacementAdvisedBelow;
  const amount =
    safeNumber(config.tiers[tier]) + (replacementAdvised ? safeNumber(config.replacementExtraDeduction) : 0);
  return { amount: Math.max(0, Math.round(amount)), replacementAdvised };
}

/** Décote grade : override € du modèle, sinon % global du prix cible. */
export function calculateGradeDeduction(
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
  grade: ReconditioningGrade,
  targetPrice: number | null,
): number {
  const override = ruleItem?.gradeOverrides?.[grade];
  if (override != null) return Math.max(0, Math.round(safeNumber(override)));
  if (targetPrice == null) return 0;
  return Math.max(0, Math.round((targetPrice * safeNumber(rules.gradePct[grade])) / 100));
}

export type DefectDeductionLine = { key: DefectKey; label: string; amount: number; action: DefectAction };

/** Décotes défauts du modèle (barème du modèle) — actions manual/block remontées. */
export function calculateDefectDeductions(
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
  defects: DefectKey[],
): DefectDeductionLine[] {
  const { defects: profile } = resolveDefectRules(rules, ruleItem);
  return [...new Set(defects)]
    .map((key) => {
      const entry = profile[key];
      if (!entry || !entry.active) return null;
      return {
        key,
        label: DEFECT_LABELS[key],
        amount: Math.max(0, Math.round(safeNumber(entry.amount))),
        action: entry.action,
      };
    })
    .filter((line): line is DefectDeductionLine => line !== null);
}

export type EstimatedPartLine = {
  key: PartKey;
  label: string;
  /** null = prix inconnu (« À renseigner ») — jamais 0 par défaut. */
  piece: number | null;
  labor: number;
  source: PartCostSource;
  stockItemId?: string;
};

/** Pièces estimées à changer (coûts du modèle) pour une liste de pièces. */
export function calculateEstimatedPartCosts(
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
  parts: PartKey[],
): EstimatedPartLine[] {
  return [...new Set(parts)].map((key) => {
    const entry = resolvePartCost(rules, ruleItem, key);
    return {
      key,
      label: PART_LABELS[key],
      piece: isPriceKnown(entry.piece) ? entry.piece : null,
      labor: Math.max(0, safeNumber(entry.labor)),
      source: entry.source,
      stockItemId: entry.stockItemId,
    };
  });
}

/* ═══════════════════════ Calcul d'offre complet ═══════════════════════ */

export type OfferInput = {
  brand: string;
  model: string;
  storage: string;
  grade: ReconditioningGrade;
  batteryTier: BatteryTierKey | null;
  defects: DefectKey[];
  blockerFlags: BlockerKey[];
  /** Pièces estimées retenues (par défaut : suggérées depuis les défauts). */
  parts: EstimatedPartLine[];
  /** Prix cible manuel si aucune règle ne correspond. */
  manualTarget?: number | null;
};

export type ReconditioningOfferCalculation = {
  rule: ReconditioningModelPriceRule | null;
  calculationMode: ReconditioningCalculationMode;
  usesDefaultMode: boolean;
  targetResale: number | null;
  storageImpact: number;
  batteryDeduction: number;
  batteryReplacementAdvised: boolean;
  gradeDeduction: number;
  defectLines: DefectDeductionLine[];
  defectDeduction: number;
  partsCost: number;
  laborCost: number;
  /** Pièces prévues dont le prix est inconnu — à renseigner avant de se fier au calcul. */
  partsMissingPrice: PartKey[];
  targetMarginAmount: number | null;
  riskAmount: number | null;
  maxBuyback: number | null;
  suggestedOffer: number | null;
  blocked: string[];
  manualReview: string[];
};

/** Suggestion de pièces depuis les défauts cochés + remplacement batterie conseillé. */
export function suggestParts(
  rules: RulesSnapshot,
  ruleItem: ReconditioningModelPriceRule | null,
  defects: DefectKey[],
  batteryReplacementAdvised: boolean,
): EstimatedPartLine[] {
  const keys = [
    ...new Set([
      ...defects.map((d) => DEFECT_TO_PART[d]).filter((k): k is PartKey => Boolean(k)),
      ...(batteryReplacementAdvised ? (["batterie"] as PartKey[]) : []),
    ]),
  ];
  return calculateEstimatedPartCosts(rules, ruleItem, keys);
}

export function calculateMaxBuybackPrice(calc: {
  targetResale: number | null;
  batteryDeduction: number;
  gradeDeduction: number;
  defectDeduction: number;
  partsCost: number;
  laborCost: number;
  targetMarginPct: number;
  riskPct: number;
}): number | null {
  if (calc.targetResale == null || calc.targetResale <= 0) return null;
  const margin = (calc.targetResale * safeNumber(calc.targetMarginPct)) / 100;
  const risk = (calc.targetResale * safeNumber(calc.riskPct)) / 100;
  const max =
    calc.targetResale -
    safeNumber(calc.batteryDeduction) -
    safeNumber(calc.gradeDeduction) -
    safeNumber(calc.defectDeduction) -
    safeNumber(calc.partsCost) -
    safeNumber(calc.laborCost) -
    margin -
    risk;
  return Math.max(0, Math.round(max));
}

/** Prix conseillé : max arrondi à 5 € en dessous. */
export function calculateSuggestedOffer(maxBuyback: number | null): number | null {
  if (maxBuyback == null) return null;
  return Math.max(0, Math.floor(maxBuyback / 5) * 5);
}

/** Calcule l'offre complète : chaque ligne vient des règles du modèle sélectionné. */
export function computeOfferCalculation(input: OfferInput, rules: RulesSnapshot): ReconditioningOfferCalculation {
  const ruleItem = findModelRule(rules, input);
  const calculationMode = ruleItem?.calculationMode ?? getDefaultReconditioningMode(rules);
  const usesDefaultMode = ruleItem == null;
  const targetResale = calculateTargetResalePrice(ruleItem, input.manualTarget);
  const storageImpact = ruleItem ? calculateStorageImpact(rules, ruleItem) : 0;
  const battery = calculateBatteryDeduction(rules, ruleItem, input.batteryTier);
  const gradeDeduction =
    input.grade === "HS" ? (targetResale ?? 0) : calculateGradeDeduction(rules, ruleItem, input.grade, targetResale);
  const defectLines = calculateDefectDeductions(rules, ruleItem, input.defects);
  const defectDeduction = defectLines.reduce((sum, line) => sum + line.amount, 0);
  const partsMissingPrice = input.parts.filter((p) => !isPriceKnown(p.piece)).map((p) => p.key);
  const rawPartsCost = input.parts.reduce((sum, p) => sum + (isPriceKnown(p.piece) ? p.piece : 0), 0);
  const rawLaborCost = input.parts.reduce((sum, p) => sum + safeNumber(p.labor), 0);
  const partsCost = calculationMode === "parts_labor" ? rawPartsCost : 0;
  const laborCost =
    calculationMode === "parts_labor"
      ? rawLaborCost +
        Math.max(0, safeNumber(ruleItem?.defaultLaborCost)) +
        Math.max(0, safeNumber(ruleItem?.diagnosticCost))
      : 0;

  // Blocages : règles globales déclenchées + actions des défauts du barème modèle.
  const blocked: string[] = [];
  const manualReview: string[] = [];
  for (const flag of new Set(input.blockerFlags)) {
    const blocker = rules.blockers.find((b) => b.key === flag);
    if (!blocker || !blocker.active) continue;
    if (blocker.action === "block") blocked.push(`${BLOCKER_LABELS[flag]} — reprise impossible`);
    else manualReview.push(`${BLOCKER_LABELS[flag]} — validation manuelle requise`);
  }
  for (const line of defectLines) {
    if (line.action === "block") blocked.push(`${line.label} — reprise impossible`);
    else if (line.action === "manual") manualReview.push(`${line.label} — validation manuelle requise`);
  }
  if (input.grade === "HS") manualReview.push("Grade HS — appareil non revendable en l'état");
  if (calculationMode === "parts_labor" && partsMissingPrice.length > 0) {
    manualReview.push(
      `Prix à renseigner : ${partsMissingPrice.map((key) => PART_LABELS[key]).join(", ")} — coût pièce inconnu, non compté dans le calcul`,
    );
  }

  const targetMarginPct = ruleItem?.targetMarginPct ?? rules.targetMarginPct;
  const riskPct = ruleItem?.riskPct ?? rules.riskPct;
  const targetMarginAmount = targetResale == null ? null : Math.round((targetResale * targetMarginPct) / 100);
  const riskAmount = targetResale == null ? null : Math.round((targetResale * riskPct) / 100);
  const formulaMaxBuyback = calculateMaxBuybackPrice({
    targetResale,
    batteryDeduction: battery.amount,
    gradeDeduction,
    defectDeduction,
    partsCost,
    laborCost,
    targetMarginPct,
    riskPct,
  });
  const maxBuyback = blocked.length
    ? null
    : calculationMode === "manual" && ruleItem?.manualMaxBuybackPrice && ruleItem.manualMaxBuybackPrice > 0
      ? Math.max(
          0,
          Math.round(safeNumber(ruleItem.manualMaxBuybackPrice) - battery.amount - gradeDeduction - defectDeduction),
        )
      : formulaMaxBuyback;
  const manualDefaultOffer =
    maxBuyback != null && calculationMode === "manual" && ruleItem?.defaultOfferPrice && ruleItem.defaultOfferPrice > 0
      ? Math.min(Math.round(safeNumber(ruleItem.defaultOfferPrice)), maxBuyback)
      : null;

  return {
    rule: ruleItem,
    calculationMode,
    usesDefaultMode,
    targetResale,
    storageImpact,
    batteryDeduction: battery.amount,
    batteryReplacementAdvised: battery.replacementAdvised,
    gradeDeduction,
    defectLines,
    defectDeduction,
    partsCost: Math.round(partsCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    partsMissingPrice,
    targetMarginAmount,
    riskAmount,
    maxBuyback,
    suggestedOffer: manualDefaultOffer ?? calculateSuggestedOffer(maxBuyback),
    blocked,
    manualReview,
  };
}

/** Alias métier : calcule l'offre de rachat complète pour un appareil. */
export const calculateBuybackOffer = computeOfferCalculation;

/** Marge estimée si on achète au prix proposé (revente cible − prix payé − pièces − MO). */
export function calculateOfferMargin(
  calc: ReconditioningOfferCalculation,
  proposedPrice: number | null,
): { amount: number; pct: number | null } | null {
  if (calc.targetResale == null || proposedPrice == null || !Number.isFinite(proposedPrice)) return null;
  const amount = Math.round(calc.targetResale - proposedPrice - calc.partsCost - calc.laborCost);
  return { amount, pct: safePercent(amount, calc.targetResale) };
}
