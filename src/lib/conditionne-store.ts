// conditionne-store — module Comptoir « Conditionné » : estimation & reprise téléphone.
// Outil commercial d'estimation (PAS un registre légal). Prix dérivés de marketData +
// règles de reprise modifiables. Store isolé et persisté.

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useBeharStore } from "@/lib/behar-store";
import { getMarketData } from "@/data/marketData";

export type EtatGeneral = "Comme neuf" | "Très bon état" | "Bon état" | "Correct" | "Abîmé" | "HS";
export type EcranEtat = "OK" | "Rayé" | "Fissuré" | "Cassé" | "Tactile HS";
export type BatterieTranche = "100-90" | "89-80" | "79-70" | "<70" | "inconnue";
export type FonctionEtat = "OK" | "Défaut" | "Non testé";
export type ReseauEtat = "OK" | "Bloqué" | "Non testé";
export type ProblemePrincipal =
  | "Aucun"
  | "Écran cassé"
  | "Batterie faible"
  | "Dos cassé"
  | "Face ID HS"
  | "Caméra HS"
  | "Charge HS"
  | "Bloqué opérateur / iCloud"
  | "Ne s'allume pas"
  | "Autre";

export type ConditionnePhotoSlot = "face" | "dos" | "gauche" | "droite" | "defaut" | "accessoires";
export type EstimationGrade = "A+" | "A" | "B" | "C" | "D" | "HS";
export type DeductionMode = "euro" | "percent" | "blocking";
export type BlockingAction = "allow" | "block" | "confirm" | "deduct";
export type RiskLevel = "faible" | "moyen" | "élevé" | "bloquant";

export const DEFECT_CATALOG = [
  { key: "ecran_casse", label: "Écran cassé" },
  { key: "ecran_raye", label: "Écran rayé" },
  { key: "tactile_hs", label: "Tactile HS" },
  { key: "batterie_faible", label: "Batterie faible" },
  { key: "batterie_a_remplacer", label: "Batterie à remplacer" },
  { key: "face_id_hs", label: "Face ID HS" },
  { key: "touch_id_hs", label: "Touch ID HS" },
  { key: "dos_casse", label: "Dos cassé" },
  { key: "camera_avant_hs", label: "Caméra avant HS" },
  { key: "camera_arriere_hs", label: "Caméra arrière HS" },
  { key: "micro_hs", label: "Micro HS" },
  { key: "haut_parleur_hs", label: "Haut-parleur HS" },
  { key: "connecteur_charge_hs", label: "Connecteur de charge HS" },
  { key: "boutons_hs", label: "Boutons HS" },
  { key: "chassis_tordu", label: "Châssis tordu" },
  { key: "oxydation", label: "Oxydation" },
  { key: "carte_mere_suspecte", label: "Carte mère suspecte" },
  { key: "reseau_hs", label: "Réseau HS" },
  { key: "wifi_bluetooth_hs", label: "Wi-Fi / Bluetooth HS" },
  { key: "telephone_non_teste", label: "Téléphone non testé" },
  { key: "icloud_bloque", label: "iCloud bloqué" },
  { key: "google_frp_bloque", label: "Google FRP bloqué" },
  { key: "imei_manquant", label: "IMEI manquant" },
  { key: "telephone_blackliste", label: "Téléphone blacklisté" },
  { key: "piece_manquante", label: "Pièce manquante" },
] as const;

export type DefectKey = (typeof DEFECT_CATALOG)[number]["key"];

export type ReconditioningCosts = {
  ecran: number;
  batterie: number;
  dos: number;
  camera: number;
  connecteur: number;
  mainOeuvre: number;
  autres: number;
};

export type DefectDeductionRule = {
  defect: DefectKey;
  mode: DeductionMode;
  value: number;
  risk: RiskLevel;
  action: BlockingAction;
  active: boolean;
};

export type ModelDeductionRule = {
  id: string;
  brand: string;
  model: string;
  range: string;
  storage: string;
  year: string;
  phoneType: string;
  defect: DefectKey;
  mode: Exclude<DeductionMode, "blocking">;
  value: number;
  action: BlockingAction;
  active: boolean;
};

export type GradeDeductionRule = {
  grade: EstimationGrade;
  description: string;
  mode: "percent" | "blocking";
  value: number;
  active: boolean;
};

export type GeneralEstimationRules = {
  minimumMargin: number;
  defaultLaborCost: number;
  defaultRisk: RiskLevel;
  allowManualPrice: boolean;
};

export type EstimationSettings = {
  general: GeneralEstimationRules;
  defects: DefectDeductionRule[];
  modelRules: ModelDeductionRule[];
  grades: GradeDeductionRule[];
};

export type ConditionneInput = {
  brand: string;
  model: string;
  storage: string;
  color: string;
  imei: string;
  batteryPct: string;
  locked: boolean;
  etatGeneral: EtatGeneral;
  ecran: EcranEtat;
  batterie: BatterieTranche;
  faceId: FonctionEtat;
  cameras: FonctionEtat;
  charge: FonctionEtat;
  reseau: ReseauEtat;
  wifi: FonctionEtat;
  boutons: FonctionEtat;
  hautParleurs: FonctionEtat;
  micro: FonctionEtat;
  probleme: ProblemePrincipal;
  selectedDefects: DefectKey[];
  cosmeticGrade: EstimationGrade;
  plannedCosts: ReconditioningCosts;
  manualReason: string;
  notes: string;
  photos: Partial<Record<ConditionnePhotoSlot, string>>;
};

export function blankInput(): ConditionneInput {
  return {
    brand: "",
    model: "",
    storage: "",
    color: "",
    imei: "",
    batteryPct: "",
    locked: false,
    etatGeneral: "Bon état",
    ecran: "OK",
    batterie: "inconnue",
    faceId: "Non testé",
    cameras: "Non testé",
    charge: "Non testé",
    reseau: "Non testé",
    wifi: "Non testé",
    boutons: "Non testé",
    hautParleurs: "Non testé",
    micro: "Non testé",
    probleme: "Aucun",
    selectedDefects: [],
    cosmeticGrade: "B",
    plannedCosts: {
      ecran: 0,
      batterie: 0,
      dos: 0,
      camera: 0,
      connecteur: 0,
      mainOeuvre: 25,
      autres: 0,
    },
    manualReason: "",
    notes: "",
    photos: {},
  };
}

/** Règles de reprise modifiables (Paramètres → Conditionné). Déductions dans la devise atelier. */
export type PriceRules = {
  ecranRaye: number;
  ecranFissure: number;
  ecranCasse: number;
  tactileHs: number;
  dosCasse: number;
  batterie70: number;
  batterieMoins70: number;
  faceIdHs: number;
  cameraHs: number;
  chargeHs: number;
  reseauBloque: number;
  boutonsHs: number;
  hpHs: number;
  microHs: number;
  bloque: number;
  neSallumePas: number;
  etatCorrect: number;
  etatAbime: number;
  etatHs: number;
  /** Le prix conseillé laisse une marge sous le prix max d'achat. */
  margeBuffer: number;
  /** Revente estimée si non mesurée = prix occasion × (1 + uplift). */
  reventeUplift: number;
  defaultWarrantyMonths: number;
  canalVente: string;
};

export const DEFAULT_RULES: PriceRules = {
  ecranRaye: 15,
  ecranFissure: 60,
  ecranCasse: 110,
  tactileHs: 90,
  dosCasse: 50,
  batterie70: 25,
  batterieMoins70: 45,
  faceIdHs: 60,
  cameraHs: 40,
  chargeHs: 35,
  reseauBloque: 80,
  boutonsHs: 20,
  hpHs: 20,
  microHs: 20,
  bloque: 150,
  neSallumePas: 200,
  etatCorrect: 15,
  etatAbime: 40,
  etatHs: 120,
  margeBuffer: 0.1,
  reventeUplift: 0.15,
  defaultWarrantyMonths: 6,
  canalVente: "Boutique",
};

export const DEFAULT_ESTIMATION_SETTINGS: EstimationSettings = {
  general: {
    minimumMargin: 70,
    defaultLaborCost: 25,
    defaultRisk: "moyen",
    allowManualPrice: true,
  },
  defects: [
    { defect: "ecran_casse", mode: "euro", value: 50, risk: "moyen", action: "deduct", active: true },
    { defect: "ecran_raye", mode: "euro", value: 15, risk: "faible", action: "deduct", active: true },
    { defect: "tactile_hs", mode: "euro", value: 80, risk: "élevé", action: "deduct", active: true },
    { defect: "batterie_faible", mode: "euro", value: 30, risk: "faible", action: "deduct", active: true },
    { defect: "batterie_a_remplacer", mode: "euro", value: 45, risk: "moyen", action: "deduct", active: true },
    { defect: "face_id_hs", mode: "euro", value: 80, risk: "élevé", action: "deduct", active: true },
    { defect: "touch_id_hs", mode: "euro", value: 55, risk: "moyen", action: "deduct", active: true },
    { defect: "dos_casse", mode: "euro", value: 40, risk: "moyen", action: "deduct", active: true },
    { defect: "camera_avant_hs", mode: "euro", value: 30, risk: "moyen", action: "deduct", active: true },
    { defect: "camera_arriere_hs", mode: "euro", value: 35, risk: "moyen", action: "deduct", active: true },
    { defect: "micro_hs", mode: "euro", value: 20, risk: "moyen", action: "deduct", active: true },
    { defect: "haut_parleur_hs", mode: "euro", value: 25, risk: "moyen", action: "deduct", active: true },
    { defect: "connecteur_charge_hs", mode: "euro", value: 35, risk: "moyen", action: "deduct", active: true },
    { defect: "boutons_hs", mode: "euro", value: 25, risk: "faible", action: "deduct", active: true },
    { defect: "chassis_tordu", mode: "euro", value: 45, risk: "élevé", action: "deduct", active: true },
    { defect: "oxydation", mode: "percent", value: 35, risk: "élevé", action: "confirm", active: true },
    { defect: "carte_mere_suspecte", mode: "percent", value: 50, risk: "élevé", action: "confirm", active: true },
    { defect: "reseau_hs", mode: "euro", value: 80, risk: "élevé", action: "confirm", active: true },
    { defect: "wifi_bluetooth_hs", mode: "euro", value: 45, risk: "moyen", action: "deduct", active: true },
    { defect: "telephone_non_teste", mode: "percent", value: 25, risk: "élevé", action: "confirm", active: true },
    { defect: "icloud_bloque", mode: "blocking", value: 100, risk: "bloquant", action: "block", active: true },
    { defect: "google_frp_bloque", mode: "blocking", value: 100, risk: "bloquant", action: "block", active: true },
    { defect: "imei_manquant", mode: "blocking", value: 100, risk: "bloquant", action: "block", active: true },
    { defect: "telephone_blackliste", mode: "blocking", value: 100, risk: "bloquant", action: "block", active: true },
    { defect: "piece_manquante", mode: "euro", value: 35, risk: "moyen", action: "deduct", active: true },
  ],
  modelRules: [
    {
      id: "model_iphone14_screen",
      brand: "Apple",
      model: "iPhone 14",
      range: "",
      storage: "",
      year: "2022",
      phoneType: "Smartphone",
      defect: "ecran_casse",
      mode: "euro",
      value: 50,
      action: "deduct",
      active: true,
    },
    {
      id: "model_iphone11_screen",
      brand: "Apple",
      model: "iPhone 11",
      range: "",
      storage: "",
      year: "2019",
      phoneType: "Smartphone",
      defect: "ecran_casse",
      mode: "euro",
      value: 30,
      action: "deduct",
      active: true,
    },
    {
      id: "model_s23_screen",
      brand: "Samsung",
      model: "Galaxy S23",
      range: "S",
      storage: "",
      year: "2023",
      phoneType: "Smartphone",
      defect: "ecran_casse",
      mode: "euro",
      value: 70,
      action: "deduct",
      active: true,
    },
  ],
  grades: [
    { grade: "A+", description: "Comme neuf", mode: "percent", value: 0, active: true },
    { grade: "A", description: "Très bon état", mode: "percent", value: 5, active: true },
    { grade: "B", description: "Bon état", mode: "percent", value: 10, active: true },
    { grade: "C", description: "État correct", mode: "percent", value: 20, active: true },
    { grade: "D", description: "Très marqué", mode: "percent", value: 35, active: true },
    { grade: "HS", description: "Non revendable / prix manuel", mode: "blocking", value: 100, active: true },
  ],
};

export type Deduction = {
  label: string;
  amount: number;
  source?: "defect" | "model" | "grade" | "cost" | "legacy";
  mode?: DeductionMode;
};

export type Estimation = {
  coteDeBase: number;
  deductions: Deduction[];
  blockedBy: string[];
  confirmationRequired: string[];
  resolvedRepairCosts: ReconditioningCosts;
  plannedCostsTotal: number;
  totalDeductions: number;
  prixMaxAchat: number;
  prixAutomatique: number;
  prixConseille: number;
  prixReventeEstime: number;
  margeEstimee: number;
  rentabiliteEstimee: number;
  riskLevel: RiskLevel;
  marketSource: "reel" | "estime" | "manuel" | "inconnu";
  hasModel: boolean;
};

const norm = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

const DEFECT_REPAIR_COST_KEY: Partial<Record<DefectKey, keyof ReconditioningCosts>> = {
  ecran_casse: "ecran",
  ecran_raye: "ecran",
  tactile_hs: "ecran",
  batterie_faible: "batterie",
  batterie_a_remplacer: "batterie",
  dos_casse: "dos",
  camera_avant_hs: "camera",
  camera_arriere_hs: "camera",
  connecteur_charge_hs: "connecteur",
};

const DEFECT_PRICE_KEYWORDS: Partial<Record<DefectKey, string[]>> = {
  ecran_casse: ["ecran", "vitre", "lcd", "oled"],
  ecran_raye: ["ecran", "vitre", "polissage"],
  tactile_hs: ["tactile", "ecran", "lcd", "oled"],
  batterie_faible: ["batterie"],
  batterie_a_remplacer: ["batterie"],
  dos_casse: ["dos", "back glass", "vitre arriere"],
  camera_avant_hs: ["camera avant", "camera front", "front camera"],
  camera_arriere_hs: ["camera arriere", "camera", "module photo"],
  connecteur_charge_hs: ["connecteur", "charge", "dock"],
};

function resolveCatalogPartCost(input: ConditionneInput, defect: DefectKey): number {
  const keywords = DEFECT_PRICE_KEYWORDS[defect];
  if (!keywords?.length || !input.model) return 0;
  try {
    const store = useBeharStore.getState();
    const model = norm(input.model);
    const brand = norm(input.brand);
    const keywordHit = (value: unknown) => {
      const hay = norm(value);
      return keywords.some((keyword) => hay.includes(norm(keyword)));
    };
    const priceBookMatch = store.priceBookItems
      .filter((item) => item.isActive !== false)
      .find((item) => {
        const itemModel = norm(item.modele);
        const itemBrand = norm(item.marque);
        const sameModel = itemModel.includes(model) || model.includes(itemModel);
        const sameBrand = !brand || itemBrand.includes(brand) || brand.includes(itemBrand);
        return sameModel && sameBrand && (keywordHit(item.reparation) || keywordHit(item.piece));
      });
    if (priceBookMatch?.prixAchat) return Math.round(priceBookMatch.prixAchat);

    const stockMatch = store.stockItems
      .filter((item) => item.active !== false && item.itemType !== "product")
      .find((item) => {
        const sameModel =
          norm(item.name).includes(model) ||
          (item.compatibleModels ?? []).some((compatible) => {
            const cm = norm(compatible);
            return cm.includes(model) || model.includes(cm);
          });
        const sameBrand = !brand || norm(item.brandName).includes(brand) || norm(item.name).includes(brand);
        return sameModel && sameBrand && keywordHit(`${item.name} ${item.part ?? ""}`);
      });
    return stockMatch?.purchasePrice ? Math.round(stockMatch.purchasePrice) : 0;
  } catch {
    return 0;
  }
}

/** Moteur d'estimation : cote/revente depuis marketData, déductions depuis les règles. */
export function estimate(
  input: ConditionneInput,
  rules: PriceRules,
  settings: EstimationSettings = DEFAULT_ESTIMATION_SETTINGS,
): Estimation {
  const market = input.model
    ? (getMarketData(`${input.brand} ${input.model}`) ?? getMarketData(input.model))
    : undefined;
  const coteDeBase = market?.prixMoyen ?? 0;
  const prixReventeEstime = market
    ? (market.prixInternet ?? Math.round(market.prixMoyen * (1 + rules.reventeUplift)))
    : 0;

  const deductions: Deduction[] = [];
  const blockedBy: string[] = [];
  const confirmationRequired: string[] = [];
  const resolvedRepairCosts: ReconditioningCosts = {
    ecran: 0,
    batterie: 0,
    dos: 0,
    camera: 0,
    connecteur: 0,
    mainOeuvre: input.plannedCosts?.mainOeuvre ?? settings.general.defaultLaborCost,
    autres: input.plannedCosts?.autres ?? 0,
  };
  const add = (label: string, amount: number, extra?: Partial<Deduction>) => {
    if (amount > 0) deductions.push({ label, amount: Math.round(amount), ...extra });
  };

  const selectedDefects = new Set<DefectKey>(input.selectedDefects ?? []);
  if (input.ecran === "Rayé") selectedDefects.add("ecran_raye");
  else if (input.ecran === "Fissuré" || input.ecran === "Cassé") selectedDefects.add("ecran_casse");
  else if (input.ecran === "Tactile HS") selectedDefects.add("tactile_hs");
  if (input.batterie === "79-70") selectedDefects.add("batterie_faible");
  else if (input.batterie === "<70") selectedDefects.add("batterie_a_remplacer");
  if (input.faceId === "Défaut") selectedDefects.add("face_id_hs");
  if (input.cameras === "Défaut") selectedDefects.add("camera_arriere_hs");
  if (input.charge === "Défaut") selectedDefects.add("connecteur_charge_hs");
  if (input.reseau === "Bloqué") selectedDefects.add("reseau_hs");
  if (input.wifi === "Défaut") selectedDefects.add("wifi_bluetooth_hs");
  if (input.boutons === "Défaut") selectedDefects.add("boutons_hs");
  if (input.hautParleurs === "Défaut") selectedDefects.add("haut_parleur_hs");
  if (input.micro === "Défaut") selectedDefects.add("micro_hs");
  if (input.locked) selectedDefects.add("icloud_bloque");
  if (input.probleme === "Écran cassé") selectedDefects.add("ecran_casse");
  else if (input.probleme === "Batterie faible") selectedDefects.add("batterie_faible");
  else if (input.probleme === "Dos cassé") selectedDefects.add("dos_casse");
  else if (input.probleme === "Face ID HS") selectedDefects.add("face_id_hs");
  else if (input.probleme === "Caméra HS") selectedDefects.add("camera_arriere_hs");
  else if (input.probleme === "Charge HS") selectedDefects.add("connecteur_charge_hs");
  else if (input.probleme === "Bloqué opérateur / iCloud") selectedDefects.add("icloud_bloque");

  const defectLabel = (defect: DefectKey) => DEFECT_CATALOG.find((item) => item.key === defect)?.label ?? defect;
  const amountFor = (mode: DeductionMode, value: number) => (mode === "euro" ? value : (coteDeBase * value) / 100);
  const riskScore: Record<RiskLevel, number> = { faible: 1, moyen: 2, élevé: 3, bloquant: 4 };
  let riskLevel: RiskLevel = settings.general.defaultRisk;
  const modelMatches = (rule: ModelDeductionRule) => {
    const sameBrand = !rule.brand || rule.brand.toLowerCase() === input.brand.toLowerCase();
    const sameModel = !rule.model || input.model.toLowerCase().includes(rule.model.toLowerCase());
    const sameStorage = !rule.storage || rule.storage === input.storage;
    return rule.active && sameBrand && sameModel && sameStorage;
  };

  for (const defect of selectedDefects) {
    const baseRule = settings.defects.find((rule) => rule.defect === defect && rule.active);
    if (!baseRule) continue;
    const override = settings.modelRules.find((rule) => rule.defect === defect && modelMatches(rule));
    const mode = override?.mode ?? baseRule.mode;
    const value = override?.value ?? baseRule.value;
    const action = override?.action ?? baseRule.action;
    const label = `${defectLabel(defect)}${override ? ` (${override.model || override.brand})` : ""}`;
    const repairCostKey = DEFECT_REPAIR_COST_KEY[defect];
    const catalogCost = repairCostKey ? resolveCatalogPartCost(input, defect) : 0;
    if (repairCostKey && catalogCost > 0) {
      resolvedRepairCosts[repairCostKey] = Math.max(resolvedRepairCosts[repairCostKey], catalogCost);
    }
    if (riskScore[baseRule.risk] > riskScore[riskLevel]) riskLevel = baseRule.risk;
    if (action === "block" || mode === "blocking") {
      blockedBy.push(defectLabel(defect));
    } else if (action === "confirm") {
      confirmationRequired.push(defectLabel(defect));
      if (catalogCost > 0)
        add(`Pièce ${defectLabel(defect)} (${input.model})`, catalogCost, { source: "cost", mode: "euro" });
      else add(label, amountFor(mode, value), { source: override ? "model" : "defect", mode });
    } else if (action === "deduct") {
      if (catalogCost > 0)
        add(`Pièce ${defectLabel(defect)} (${input.model})`, catalogCost, { source: "cost", mode: "euro" });
      else add(label, amountFor(mode, value), { source: override ? "model" : "defect", mode });
    }
  }

  const gradeRule = settings.grades.find((rule) => rule.grade === input.cosmeticGrade && rule.active);
  if (gradeRule?.mode === "blocking") {
    confirmationRequired.push(`Grade ${gradeRule.grade}`);
    if (riskScore.élevé > riskScore[riskLevel]) riskLevel = "élevé";
  } else if (gradeRule) {
    add(`Grade ${gradeRule.grade} — ${gradeRule.description}`, (coteDeBase * gradeRule.value) / 100, {
      source: "grade",
      mode: "percent",
    });
  } else if (input.etatGeneral === "Correct") {
    add("État correct", rules.etatCorrect, { source: "legacy" });
  } else if (input.etatGeneral === "Abîmé") {
    add("État abîmé", rules.etatAbime, { source: "legacy" });
  } else if (input.etatGeneral === "HS") {
    add("État HS", rules.etatHs, { source: "legacy" });
  }

  const plannedCosts = input.plannedCosts ?? blankInput().plannedCosts;
  const effectiveCosts: ReconditioningCosts = {
    ecran: plannedCosts.ecran || resolvedRepairCosts.ecran,
    batterie: plannedCosts.batterie || resolvedRepairCosts.batterie,
    dos: plannedCosts.dos || resolvedRepairCosts.dos,
    camera: plannedCosts.camera || resolvedRepairCosts.camera,
    connecteur: plannedCosts.connecteur || resolvedRepairCosts.connecteur,
    mainOeuvre: plannedCosts.mainOeuvre || resolvedRepairCosts.mainOeuvre,
    autres: plannedCosts.autres || resolvedRepairCosts.autres,
  };
  for (const key of Object.keys(effectiveCosts) as Array<keyof ReconditioningCosts>) {
    resolvedRepairCosts[key] = effectiveCosts[key];
  }
  const partCostAlreadyDeducted = deductions.filter((d) => d.source === "cost").reduce((sum, d) => sum + d.amount, 0);
  const plannedCostsTotal = Object.values(effectiveCosts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const remainingCosts = Math.max(0, plannedCostsTotal - partCostAlreadyDeducted);
  if (remainingCosts > 0) add("Main-d'œuvre et autres frais prévus", remainingCosts, { source: "cost", mode: "euro" });

  if (blockedBy.length > 0) riskLevel = "bloquant";
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const prixMaxAchat = Math.max(0, Math.round(coteDeBase - totalDeductions));
  const prixAutomatique = prixMaxAchat;
  const prixConseille = blockedBy.length
    ? 0
    : Math.max(0, Math.min(prixMaxAchat, Math.round(prixMaxAchat * (1 - rules.margeBuffer))));
  const margeEstimee = prixReventeEstime - prixConseille - plannedCostsTotal;
  const rentabiliteEstimee = prixReventeEstime > 0 ? (margeEstimee / prixReventeEstime) * 100 : 0;

  return {
    coteDeBase,
    deductions,
    blockedBy,
    confirmationRequired,
    resolvedRepairCosts,
    plannedCostsTotal,
    totalDeductions,
    prixMaxAchat,
    prixAutomatique,
    prixConseille,
    prixReventeEstime,
    margeEstimee,
    rentabiliteEstimee,
    riskLevel,
    marketSource: market?.source ?? "inconnu",
    hasModel: Boolean(market),
  };
}

export type ConditionneDecision =
  | "Estimation enregistrée"
  | "Brouillon"
  | "Achat créé"
  | "Envoyé en reconditionnement"
  | "Refus client";

/**
 * Décisions correspondant à un rachat effectif (téléphone payé au client).
 * Elles impactent le CA : le prix de rachat est déduit des règlements du jour.
 * Le brouillon (rachat à valider) et la simple estimation ne déplacent pas
 * d'argent → aucun impact CA. « Achat créé » est conservé pour les données
 * historiques (ancien libellé du brouillon).
 */
export const isBuybackDecision = (decision: ConditionneDecision): boolean =>
  decision === "Achat créé" || decision === "Envoyé en reconditionnement";

export type ConditionneRecord = {
  id: string;
  number: string;
  createdAt: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  imei: string;
  etatGeneral: EtatGeneral;
  probleme: ProblemePrincipal;
  coteDeBase: number;
  totalDeductions: number;
  deductions: Deduction[];
  selectedDefects: DefectKey[];
  plannedCostsTotal: number;
  prixAutomatique: number;
  prixMaxAchat: number;
  prixConseille: number;
  prixPropose: number;
  manualReason?: string;
  manualOverride: boolean;
  blockedBy: string[];
  confirmationRequired: string[];
  riskLevel: RiskLevel;
  prixReventeEstime: number;
  marge: number;
  margePct: number;
  decision: ConditionneDecision;
  reconditioningFileId?: string;
  history: { at: string; title: string }[];
};

const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const refNum = (seq: number) => `RPR-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

type SaveArgs = {
  input: ConditionneInput;
  estimation: Estimation;
  prixPropose: number;
  manualReason?: string;
  decision: ConditionneDecision;
  reconditioningFileId?: string;
};

const seededRecords = (): ConditionneRecord[] => {
  const mk = (
    seq: number,
    days: number,
    brand: string,
    model: string,
    storage: string,
    color: string,
    etatGeneral: EtatGeneral,
    probleme: ProblemePrincipal,
    coteDeBase: number,
    totalDeductions: number,
    prixPropose: number,
    prixReventeEstime: number,
    decision: ConditionneDecision,
  ): ConditionneRecord => {
    const prixMaxAchat = coteDeBase - totalDeductions;
    const prixConseille = Math.round(prixMaxAchat * 0.9);
    const marge = prixReventeEstime - prixPropose;
    const createdAt = new Date(Date.now() - days * 86_400_000).toISOString();
    return {
      id: uid("rpr"),
      number: refNum(seq),
      createdAt,
      brand,
      model,
      storage,
      color,
      imei: "",
      etatGeneral,
      probleme,
      coteDeBase,
      totalDeductions,
      deductions: totalDeductions ? [{ label: "Décotes historiques", amount: totalDeductions, source: "legacy" }] : [],
      selectedDefects: [],
      plannedCostsTotal: 0,
      prixAutomatique: prixMaxAchat,
      prixMaxAchat,
      prixConseille,
      prixPropose,
      manualOverride: prixPropose !== prixConseille,
      blockedBy: [],
      confirmationRequired: [],
      riskLevel: totalDeductions > 100 ? "élevé" : "moyen",
      prixReventeEstime,
      marge,
      margePct: prixReventeEstime ? Math.round((marge / prixReventeEstime) * 1000) / 10 : 0,
      decision,
      history: [{ at: createdAt, title: "Estimation historique importée" }],
    };
  };
  return [
    mk(
      3,
      0,
      "Apple",
      "iPhone 14",
      "128 Go",
      "Minuit",
      "Bon état",
      "Écran cassé",
      430,
      110,
      270,
      429,
      "Envoyé en reconditionnement",
    ),
    mk(2, 1, "Samsung", "Galaxy S23", "256 Go", "Noir", "Très bon état", "Aucun", 390, 0, 300, 449, "Brouillon"),
    mk(
      1,
      3,
      "Apple",
      "iPhone 12",
      "64 Go",
      "Bleu",
      "Correct",
      "Dos cassé",
      230,
      50,
      120,
      249,
      "Estimation enregistrée",
    ),
  ];
};

type ConditionneState = {
  rules: PriceRules;
  estimationSettings: EstimationSettings;
  records: ConditionneRecord[];
  sequence: number;
  updateRules: (patch: Partial<PriceRules>) => void;
  updateEstimationSettings: (patch: Partial<EstimationSettings>) => void;
  resetRules: () => void;
  resetEstimationSettings: () => void;
  saveRecord: (args: SaveArgs) => string;
};

export const useConditionneStore = create<ConditionneState>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_RULES,
      estimationSettings: DEFAULT_ESTIMATION_SETTINGS,
      records: seededRecords(),
      sequence: 4,
      updateRules: (patch) => set((state) => ({ rules: { ...state.rules, ...patch } })),
      updateEstimationSettings: (patch) =>
        set((state) => ({ estimationSettings: { ...state.estimationSettings, ...patch } })),
      resetRules: () => set({ rules: DEFAULT_RULES, estimationSettings: DEFAULT_ESTIMATION_SETTINGS }),
      resetEstimationSettings: () => set({ estimationSettings: DEFAULT_ESTIMATION_SETTINGS }),
      saveRecord: ({ input, estimation, prixPropose, manualReason, decision, reconditioningFileId }) => {
        const seq = get().sequence;
        const marge = estimation.prixReventeEstime - prixPropose;
        const manualOverride = prixPropose !== estimation.prixConseille;
        const createdAt = new Date().toISOString();
        const record: ConditionneRecord = {
          id: uid("rpr"),
          number: refNum(seq),
          createdAt,
          brand: input.brand,
          model: input.model,
          storage: input.storage,
          color: input.color,
          imei: input.imei,
          etatGeneral: input.etatGeneral,
          probleme: input.probleme,
          coteDeBase: estimation.coteDeBase,
          totalDeductions: estimation.totalDeductions,
          deductions: estimation.deductions,
          selectedDefects: input.selectedDefects,
          plannedCostsTotal: estimation.plannedCostsTotal,
          prixAutomatique: estimation.prixAutomatique,
          prixMaxAchat: estimation.prixMaxAchat,
          prixConseille: estimation.prixConseille,
          prixPropose,
          manualReason: manualOverride ? manualReason?.trim() : undefined,
          manualOverride,
          blockedBy: estimation.blockedBy,
          confirmationRequired: estimation.confirmationRequired,
          riskLevel: estimation.riskLevel,
          prixReventeEstime: estimation.prixReventeEstime,
          marge,
          margePct: estimation.prixReventeEstime ? Math.round((marge / estimation.prixReventeEstime) * 1000) / 10 : 0,
          decision,
          reconditioningFileId,
          history: [
            { at: createdAt, title: "Estimation calculée" },
            ...(manualOverride
              ? [
                  {
                    at: createdAt,
                    title: `Prix manuel : ${prixPropose} (${manualReason?.trim() || "raison non renseignée"})`,
                  },
                ]
              : []),
            ...(reconditioningFileId ? [{ at: createdAt, title: "Transformée en dossier de reconditionnement" }] : []),
          ],
        };
        set((state) => ({ records: [record, ...state.records], sequence: state.sequence + 1 }));
        // Traçabilité achat : un rachat direct ("Achat créé") est une entrée téléphone.
        // Les dossiers "Envoyé en reconditionnement" sont tracés à la publication en stock
        // (évite un double comptage du même téléphone).
        if (decision === "Achat créé" && prixPropose > 0) {
          try {
            useBeharStore.getState().addPurchase({
              kind: "telephone",
              source: "Rachat client",
              label: [input.brand, input.model, input.storage].filter(Boolean).join(" ").trim() || "Téléphone",
              reference: input.imei || undefined,
              supplier: "Client (rachat)",
              quantity: 1,
              unitCost: prixPropose,
              conditionneRecordId: record.id,
            });
          } catch {
            /* ignore */
          }
        }
        return record.id;
      },
    }),
    {
      name: "behar-conditionne",
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Partial<ConditionneState> | undefined;
        return {
          ...state,
          rules: { ...DEFAULT_RULES, ...(state?.rules ?? {}) },
          estimationSettings: {
            ...DEFAULT_ESTIMATION_SETTINGS,
            ...(state?.estimationSettings ?? {}),
            general: { ...DEFAULT_ESTIMATION_SETTINGS.general, ...(state?.estimationSettings?.general ?? {}) },
            defects: state?.estimationSettings?.defects ?? DEFAULT_ESTIMATION_SETTINGS.defects,
            modelRules: state?.estimationSettings?.modelRules ?? DEFAULT_ESTIMATION_SETTINGS.modelRules,
            grades: state?.estimationSettings?.grades ?? DEFAULT_ESTIMATION_SETTINGS.grades,
          },
        };
      },
    },
  ),
);
