// reconditioning-calc — service de calcul centralisé du module Reconditionnement.
// Toutes les valeurs affichées en UI passent par ici : aucune fonction ne retourne
// NaN / Infinity — quand une donnée manque, on retourne `null` et l'UI affiche
// « À compléter ».

import { getMarketData } from "@/data/marketData";
import type { RecondSettings, ReconditioningGrade } from "@/lib/recond-settings";

/* ───────────────────────── Garde-fous numériques ───────────────────────── */

/** Nombre fini ou 0 (jamais NaN / Infinity / undefined). */
export function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Pourcentage sûr : null quand le dénominateur est nul ou invalide. */
export function safePercent(part: unknown, total: unknown): number | null {
  const p = safeNumber(part);
  const t = safeNumber(total);
  if (t <= 0) return null;
  const pct = (p / t) * 100;
  return Number.isFinite(pct) ? Math.round(pct * 10) / 10 : null;
}

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** Montant en euros, ou « À compléter » si la valeur est absente/incalculable. */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "À compléter";
  return euroFormatter.format(value);
}

/** Pourcentage formaté, ou « À compléter » si incalculable. */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "À compléter";
  return `${Math.round(value * 10) / 10} %`;
}

/* ───────────────────────── État de l'appareil (reprise) ───────────────────────── */

export type ScreenState = "ok" | "casse" | "tactile_hs" | "tache" | "lignes";
export type SimpleOkHs = "ok" | "hs";
export type OxidationState = "non" | "legere" | "forte";
export type LockState = "libre" | "actif" | "inconnu";
export type ImeiState = "propre" | "blackliste" | "inconnu";

export type IntakeCondition = {
  grade: ReconditioningGrade;
  /** Santé batterie en %, null si non renseignée. */
  batteryPct: number | null;
  screen: ScreenState;
  backGlass: "ok" | "casse";
  biometrics: SimpleOkHs;
  network: SimpleOkHs;
  camera: SimpleOkHs;
  oxidation: OxidationState;
  lock: LockState;
  imeiStatus: ImeiState;
  /** Tranche batterie sélectionnée au comptoir (moteur par modèle). */
  batteryTier?: string;
  /** Défauts cochés au comptoir (clés du profil défauts du modèle). */
  defects?: string[];
  /** Blocages cochés au comptoir (iCloud actif, IMEI blacklisté…). */
  blockerFlags?: string[];
};

export const blankCondition = (): IntakeCondition => ({
  grade: "B",
  batteryPct: null,
  screen: "ok",
  backGlass: "ok",
  biometrics: "ok",
  network: "ok",
  camera: "ok",
  oxidation: "non",
  lock: "libre",
  imeiStatus: "propre",
});

export const SCREEN_STATES: { key: ScreenState; label: string }[] = [
  { key: "ok", label: "OK" },
  { key: "casse", label: "Cassé" },
  { key: "tactile_hs", label: "Tactile HS" },
  { key: "tache", label: "Tache" },
  { key: "lignes", label: "Lignes" },
];

export const OXIDATION_STATES: { key: OxidationState; label: string }[] = [
  { key: "non", label: "Non" },
  { key: "legere", label: "Légère" },
  { key: "forte", label: "Forte" },
];

export const LOCK_STATES: { key: LockState; label: string }[] = [
  { key: "libre", label: "Libre" },
  { key: "actif", label: "Actif" },
  { key: "inconnu", label: "Inconnu" },
];

export const IMEI_STATES: { key: ImeiState; label: string }[] = [
  { key: "propre", label: "Propre" },
  { key: "blackliste", label: "Blacklisté" },
  { key: "inconnu", label: "Inconnu" },
];

/* ───────────────────────── Blocages ───────────────────────── */

export type BlockerCheck = {
  /** Blocages critiques : reprise impossible. */
  critical: string[];
  /** Validation manuelle requise. */
  manualReview: string[];
  /** Défauts qui décotent sans bloquer. */
  notes: string[];
  blocked: boolean;
};

const ruleActive = (settings: RecondSettings, key: string) =>
  settings.blockingRules.find((r) => r.key === key)?.active !== false;

/** Applique les règles de blocage configurées à l'état constaté. */
export function evaluateIntakeBlockers(condition: IntakeCondition, settings: RecondSettings): BlockerCheck {
  const critical: string[] = [];
  const manualReview: string[] = [];
  const notes: string[] = [];

  if (condition.lock === "actif" && (ruleActive(settings, "icloud") || ruleActive(settings, "google"))) {
    critical.push("iCloud / compte Google actif — reprise impossible");
  }
  if (condition.imeiStatus === "blackliste" && ruleActive(settings, "imei")) {
    critical.push("IMEI blacklisté — reprise impossible");
  }
  if (condition.oxidation === "forte" && ruleActive(settings, "oxidation")) {
    manualReview.push("Oxydation forte — validation manuelle requise");
  }
  if (condition.lock === "inconnu") {
    manualReview.push("Verrouillage iCloud / Google non vérifié");
  }
  if (condition.imeiStatus === "inconnu") {
    manualReview.push("IMEI non vérifié");
  }
  if (condition.biometrics === "hs" && ruleActive(settings, "faceid")) {
    notes.push("Face ID / Touch ID HS — décote appliquée");
  }
  if (
    condition.batteryPct != null &&
    condition.batteryPct > 0 &&
    condition.batteryPct < 80 &&
    ruleActive(settings, "battery")
  ) {
    notes.push("Batterie très dégradée — décote appliquée");
  }
  if (condition.network === "hs" && ruleActive(settings, "network")) {
    notes.push("Réseau HS — décote forte appliquée");
  }

  return { critical, manualReview, notes, blocked: critical.length > 0 };
}

/* ───────────────────────── Pièces à changer (estimées) ───────────────────────── */

export type PartOptionKey =
  | "ecran"
  | "batterie"
  | "faceArriere"
  | "connecteur"
  | "camera"
  | "hautParleur"
  | "micro"
  | "chassis"
  | "autre";

export type PartOption = { key: PartOptionKey; label: string; defaultPiece: number; defaultLabor: number };

/** Liste des pièces proposées à l'étape 3, coûts par défaut depuis les Paramètres. */
export function getPartOptions(settings: RecondSettings): PartOption[] {
  const c = settings.defectCosts;
  const labor = settings.defaultLaborCost;
  return [
    {
      key: "ecran",
      label: "Écran",
      defaultPiece: c.ecranCasse?.piece ?? 90,
      defaultLabor: c.ecranCasse?.labor ?? labor,
    },
    {
      key: "batterie",
      label: "Batterie",
      defaultPiece: c.batterieFaible?.piece ?? 30,
      defaultLabor: c.batterieFaible?.labor ?? labor,
    },
    {
      key: "faceArriere",
      label: "Face arrière",
      defaultPiece: c.faceArriereCassee?.piece ?? 50,
      defaultLabor: c.faceArriereCassee?.labor ?? labor,
    },
    {
      key: "connecteur",
      label: "Connecteur de charge",
      defaultPiece: c.chargeHs?.piece ?? 35,
      defaultLabor: c.chargeHs?.labor ?? labor,
    },
    { key: "camera", label: "Caméra", defaultPiece: c.cameraHs?.piece ?? 45, defaultLabor: c.cameraHs?.labor ?? labor },
    { key: "hautParleur", label: "Haut-parleur", defaultPiece: 25, defaultLabor: labor },
    { key: "micro", label: "Micro", defaultPiece: 20, defaultLabor: labor },
    {
      key: "chassis",
      label: "Châssis",
      defaultPiece: c.chassisAbime?.piece ?? 40,
      defaultLabor: c.chassisAbime?.labor ?? labor,
    },
    {
      key: "autre",
      label: "Autre",
      defaultPiece: c.autreDefaut?.piece ?? 25,
      defaultLabor: c.autreDefaut?.labor ?? labor,
    },
  ];
}

export type SelectedPart = { key: PartOptionKey; label: string; piece: number; labor: number };

export function partsTotals(parts: SelectedPart[]): { piece: number; labor: number; total: number } {
  const piece = parts.reduce((sum, p) => sum + safeNumber(p.piece), 0);
  const labor = parts.reduce((sum, p) => sum + safeNumber(p.labor), 0);
  return { piece, labor, total: piece + labor };
}

/* ───────────────────────── Calculs de prix ───────────────────────── */

/**
 * Prix de revente estimé : cote marché (ou cote manuelle) ajustée par l'impact du grade
 * et les décotes défauts. `null` quand on ne sait pas estimer (pas de cote, grade HS).
 */
export function calculateEstimatedResalePrice(
  input: { brand: string; model: string; grade: ReconditioningGrade; manualResale?: number | null },
  settings: RecondSettings,
): number | null {
  if (input.grade === "HS") return null;
  const manual =
    input.manualResale != null && Number.isFinite(input.manualResale) && input.manualResale > 0
      ? input.manualResale
      : null;
  const market = input.model
    ? (getMarketData(`${input.brand} ${input.model}`) ?? getMarketData(input.model))
    : undefined;
  const base = manual ?? market?.prixInternet ?? market?.prixMoyen ?? null;
  if (base == null || base <= 0) return null;
  const gradeRule = settings.reconditioningGrades.find((g) => g.grade === input.grade);
  const impactPct = safeNumber(gradeRule?.resaleImpactPct);
  return Math.max(0, Math.round(base * (1 + impactPct / 100)));
}

export type BuybackInput = {
  resalePrice: number | null;
  partsCost: number;
  laborCost: number;
  /** Décote défauts hors pièces (Face ID HS, réseau…). */
  defectDeduction?: number;
};

/**
 * prix_reprise_max = prix_revente_estimé − coût_pièces − main_d'œuvre − marge_minimale − risque.
 * `null` si le prix de revente n'est pas estimable.
 */
export function calculateBuybackMaxPrice(input: BuybackInput, settings: RecondSettings): number | null {
  if (input.resalePrice == null || !Number.isFinite(input.resalePrice) || input.resalePrice <= 0) return null;
  const minMargin = (input.resalePrice * safeNumber(settings.minMarginPct)) / 100;
  const risk = (input.resalePrice * safeNumber(settings.riskFeePct)) / 100;
  const max =
    input.resalePrice -
    safeNumber(input.partsCost) -
    safeNumber(input.laborCost) -
    safeNumber(input.defectDeduction) -
    minMargin -
    risk;
  return Math.max(0, Math.round(max));
}

/** Prix de reprise conseillé : le max arrondi à 5 € en dessous (offre « propre » au comptoir). */
export function calculateSuggestedOffer(input: BuybackInput, settings: RecondSettings): number | null {
  const max = calculateBuybackMaxPrice(input, settings);
  if (max == null) return null;
  return Math.max(0, Math.floor(max / 5) * 5);
}

export type MarginResult = { amount: number; pct: number | null };

/**
 * Marge estimée = revente estimée − prix de reprise − coûts estimés.
 * `null` quand les données sont incomplètes (pas de prix de revente ou de reprise).
 */
export function calculateEstimatedMargin(input: {
  resalePrice: number | null | undefined;
  buyPrice: number | null | undefined;
  partsCost?: number;
  laborCost?: number;
}): MarginResult | null {
  const resale = safeNumber(input.resalePrice);
  const buy = safeNumber(input.buyPrice);
  if (resale <= 0 || input.buyPrice == null || !Number.isFinite(Number(input.buyPrice))) return null;
  const amount = Math.round(resale - buy - safeNumber(input.partsCost) - safeNumber(input.laborCost));
  return { amount, pct: safePercent(amount, resale) };
}

/** Marge réelle = prix vendu − coût total réel. `null` tant que l'appareil n'est pas vendu. */
export function calculateRealMargin(input: {
  soldPrice: number | null | undefined;
  buyPrice: number | null | undefined;
  partsCost?: number;
  laborCost?: number;
}): MarginResult | null {
  if (input.soldPrice == null || !Number.isFinite(Number(input.soldPrice))) return null;
  if (input.buyPrice == null || !Number.isFinite(Number(input.buyPrice))) return null;
  const sold = safeNumber(input.soldPrice);
  const cost = safeNumber(input.buyPrice) + safeNumber(input.partsCost) + safeNumber(input.laborCost);
  const amount = Math.round(sold - cost);
  return { amount, pct: safePercent(amount, sold) };
}
