// conditionne-store — module Comptoir « Conditionné » : estimation & reprise téléphone.
// Outil commercial d'estimation (PAS un registre légal). Prix dérivés de marketData +
// règles de reprise modifiables. Store isolé et persisté.

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export type Deduction = { label: string; amount: number };

export type Estimation = {
  coteDeBase: number;
  deductions: Deduction[];
  totalDeductions: number;
  prixMaxAchat: number;
  prixConseille: number;
  prixReventeEstime: number;
  marketSource: "reel" | "estime" | "manuel" | "inconnu";
  hasModel: boolean;
};

/** Moteur d'estimation : cote/revente depuis marketData, déductions depuis les règles. */
export function estimate(input: ConditionneInput, rules: PriceRules): Estimation {
  const market = input.model ? getMarketData(`${input.brand} ${input.model}`) ?? getMarketData(input.model) : undefined;
  const coteDeBase = market?.prixMoyen ?? 0;
  const prixReventeEstime = market
    ? market.prixInternet ?? Math.round(market.prixMoyen * (1 + rules.reventeUplift))
    : 0;

  const deductions: Deduction[] = [];
  const add = (label: string, amount: number) => {
    if (amount > 0) deductions.push({ label, amount });
  };

  if (input.ecran === "Rayé") add("Écran rayé", rules.ecranRaye);
  else if (input.ecran === "Fissuré") add("Écran fissuré", rules.ecranFissure);
  else if (input.ecran === "Cassé") add("Écran cassé", rules.ecranCasse);
  else if (input.ecran === "Tactile HS") add("Tactile HS", rules.tactileHs);

  if (input.batterie === "79-70") add("Batterie 70-79 %", rules.batterie70);
  else if (input.batterie === "<70") add("Batterie < 70 %", rules.batterieMoins70);

  if (input.faceId === "Défaut") add("Face ID / Touch ID HS", rules.faceIdHs);
  if (input.cameras === "Défaut") add("Caméra HS", rules.cameraHs);
  if (input.charge === "Défaut") add("Charge HS", rules.chargeHs);
  if (input.reseau === "Bloqué") add("Réseau bloqué", rules.reseauBloque);
  if (input.boutons === "Défaut") add("Boutons HS", rules.boutonsHs);
  if (input.hautParleurs === "Défaut") add("Haut-parleurs HS", rules.hpHs);
  if (input.micro === "Défaut") add("Micro HS", rules.microHs);

  if (input.probleme === "Dos cassé") add("Dos cassé", rules.dosCasse);
  else if (input.probleme === "Bloqué opérateur / iCloud") add("Appareil bloqué", rules.bloque);
  else if (input.probleme === "Ne s'allume pas") add("Ne s'allume pas", rules.neSallumePas);

  if (input.etatGeneral === "Correct") add("État correct", rules.etatCorrect);
  else if (input.etatGeneral === "Abîmé") add("État abîmé", rules.etatAbime);
  else if (input.etatGeneral === "HS") add("État HS", rules.etatHs);

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const prixMaxAchat = Math.max(0, Math.round(coteDeBase - totalDeductions));
  const prixConseille = Math.max(0, Math.round(prixMaxAchat * (1 - rules.margeBuffer)));

  return {
    coteDeBase,
    deductions,
    totalDeductions,
    prixMaxAchat,
    prixConseille,
    prixReventeEstime,
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
  prixMaxAchat: number;
  prixConseille: number;
  prixPropose: number;
  prixReventeEstime: number;
  marge: number;
  margePct: number;
  decision: ConditionneDecision;
  reconditioningFileId?: string;
};

const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const refNum = (seq: number) => `RPR-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

type SaveArgs = {
  input: ConditionneInput;
  estimation: Estimation;
  prixPropose: number;
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
    const marge = prixReventeEstime - prixPropose;
    return {
      id: uid("rpr"),
      number: refNum(seq),
      createdAt: new Date(Date.now() - days * 86_400_000).toISOString(),
      brand,
      model,
      storage,
      color,
      imei: "",
      etatGeneral,
      probleme,
      coteDeBase,
      totalDeductions,
      prixMaxAchat,
      prixConseille: Math.round(prixMaxAchat * 0.9),
      prixPropose,
      prixReventeEstime,
      marge,
      margePct: prixReventeEstime ? Math.round((marge / prixReventeEstime) * 1000) / 10 : 0,
      decision,
    };
  };
  return [
    mk(3, 0, "Apple", "iPhone 14", "128 Go", "Minuit", "Bon état", "Écran cassé", 430, 110, 270, 429, "Envoyé en reconditionnement"),
    mk(2, 1, "Samsung", "Galaxy S23", "256 Go", "Noir", "Très bon état", "Aucun", 390, 0, 300, 449, "Brouillon"),
    mk(1, 3, "Apple", "iPhone 12", "64 Go", "Bleu", "Correct", "Dos cassé", 230, 50, 120, 249, "Estimation enregistrée"),
  ];
};

type ConditionneState = {
  rules: PriceRules;
  records: ConditionneRecord[];
  sequence: number;
  updateRules: (patch: Partial<PriceRules>) => void;
  resetRules: () => void;
  saveRecord: (args: SaveArgs) => string;
};

export const useConditionneStore = create<ConditionneState>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_RULES,
      records: seededRecords(),
      sequence: 4,
      updateRules: (patch) => set((state) => ({ rules: { ...state.rules, ...patch } })),
      resetRules: () => set({ rules: DEFAULT_RULES }),
      saveRecord: ({ input, estimation, prixPropose, decision, reconditioningFileId }) => {
        const seq = get().sequence;
        const marge = estimation.prixReventeEstime - prixPropose;
        const record: ConditionneRecord = {
          id: uid("rpr"),
          number: refNum(seq),
          createdAt: new Date().toISOString(),
          brand: input.brand,
          model: input.model,
          storage: input.storage,
          color: input.color,
          imei: input.imei,
          etatGeneral: input.etatGeneral,
          probleme: input.probleme,
          coteDeBase: estimation.coteDeBase,
          totalDeductions: estimation.totalDeductions,
          prixMaxAchat: estimation.prixMaxAchat,
          prixConseille: estimation.prixConseille,
          prixPropose,
          prixReventeEstime: estimation.prixReventeEstime,
          marge,
          margePct: estimation.prixReventeEstime ? Math.round((marge / estimation.prixReventeEstime) * 1000) / 10 : 0,
          decision,
          reconditioningFileId,
        };
        set((state) => ({ records: [record, ...state.records], sequence: state.sequence + 1 }));
        return record.id;
      },
    }),
    { name: "behar-conditionne", version: 1 },
  ),
);
