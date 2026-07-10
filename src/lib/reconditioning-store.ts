// reconditioning-store — Dossiers de reconditionnement (achat → remise en état → certificat → stock).
// Store isolé et persisté, indépendant du behar-store pour ne pas alourdir le cœur réparation.

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useBeharStore } from "@/lib/behar-store";
import { publishDomainEvent, subscribeDomainEvent } from "@/lib/domain-events";
import { getMarketData } from "@/data/marketData";
import type { IntakeCondition } from "@/lib/reconditioning-calc";
import { syncPublicReconditioningCertificate } from "@/lib/reconditioning-public-sync";
import {
  canMarkReadyForSale,
  canMarkSold,
  canPublishPublicCertificate,
  getDeviceDisplayName,
  isDeviceComplete,
} from "@/lib/reconditioning-validation";

export type ReconditioningStatus =
  | "À compléter"
  | "Brouillon"
  | "Acheté"
  | "Évaluation"
  | "Tests"
  | "Reconditionnement"
  | "En attente pièce"
  | "Prêt à vendre"
  | "En stock"
  | "Vendu"
  | "Refusé"
  | "Bloqué"
  | "Abandonné";

/** Statuts terminaux : ne repassent pas dans le flux du wizard. */
export const TERMINAL_RECONDITIONING_STATUSES: ReconditioningStatus[] = ["Vendu", "Refusé", "Bloqué", "Abandonné"];

/**
 * Libellés simples affichés en boutique (terrain). Les statuts internes historiques
 * sont conservés pour la compatibilité des données persistées.
 */
export const SIMPLE_STATUS_LABEL: Record<ReconditioningStatus, string> = {
  "À compléter": "À compléter",
  Brouillon: "À diagnostiquer",
  Acheté: "Acheté",
  Évaluation: "À diagnostiquer",
  Reconditionnement: "À reconditionner",
  "En attente pièce": "En attente pièce",
  Tests: "En test final",
  "Prêt à vendre": "Prêt à vendre",
  "En stock": "Mis en vente",
  Vendu: "Vendu",
  Refusé: "Refusé",
  Bloqué: "Bloqué",
  Abandonné: "Abandonné",
};

/**
 * Libellé « produit » des statuts, cohérent partout dans le module Reconditionnement :
 * Offre créée → Acheté → À diagnostiquer → En reconditionnement → Prêt à vendre → Vendu.
 */
export const DEVICE_STATUS_LABEL: Record<ReconditioningStatus, string> = {
  "À compléter": "À compléter",
  Brouillon: "Offre créée",
  Acheté: "Acheté",
  Évaluation: "À diagnostiquer",
  Reconditionnement: "En reconditionnement",
  "En attente pièce": "En reconditionnement",
  Tests: "En reconditionnement",
  "Prêt à vendre": "Prêt à vendre",
  "En stock": "Prêt à vendre",
  Vendu: "Vendu",
  Refusé: "Refusé",
  Bloqué: "Bloqué",
  Abandonné: "Refusé",
};

/** Étapes du pipeline (Vue d'ensemble). */
export type PipelineStage = "offre" | "achete" | "atelier" | "pret" | "vendu";

export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "offre", label: "Offre créée" },
  { key: "achete", label: "Acheté" },
  { key: "atelier", label: "Diagnostic atelier" },
  { key: "pret", label: "Prêt à vendre" },
  { key: "vendu", label: "Vendu" },
];

/** Étape du pipeline pour un statut donné — null pour les statuts hors flux (Refusé, Bloqué, Abandonné). */
export function pipelineStage(status: ReconditioningStatus): PipelineStage | null {
  switch (status) {
    case "À compléter":
      return "offre";
    case "Brouillon":
      return "offre";
    case "Acheté":
      return "achete";
    case "Évaluation":
    case "Reconditionnement":
    case "En attente pièce":
    case "Tests":
      return "atelier";
    case "Prêt à vendre":
    case "En stock":
      return "pret";
    case "Vendu":
      return "vendu";
    default:
      return null;
  }
}

/** Statuts « travaux en cours » sélectionnables à la main dans l'atelier. */
export const WORK_STATUSES: { status: ReconditioningStatus; label: string }[] = [
  { status: "Évaluation", label: "À diagnostiquer" },
  { status: "Reconditionnement", label: "À reconditionner" },
  { status: "En attente pièce", label: "En attente pièce" },
  { status: "Tests", label: "En test final" },
];

export type ReconditioningSource = "Achat comptoir" | "Rachat client" | "Lot fournisseur" | "Reprise";

export type CosmeticGrade = "A+" | "A" | "B" | "C" | "D";

export type TestState = "OK" | "À vérifier" | "Défaut" | "Non applicable";
export type PhysicalState = "OK" | "Léger" | "Important" | "Non applicable";
export type SaleChannel = "Boutique physique" | "Leboncoin" | "Internet / Reconditionné";

export type ReconditioningPart = {
  id: string;
  label: string;
  cost: number;
  quantity: number;
  /** Article de stock sélectionné (behar-store StockItem.id). */
  stockItemId?: string;
  /** Quel prix du stock est utilisé comme coût : prix d'achat ou prix de vente. */
  priceMode?: "achat" | "vente";
  /** true quand le stock a été décrémenté pour cette pièce (évite le double décrément). */
  stockDecremented?: boolean;
  reference?: string;
  sku?: string;
  supplier?: string;
  supplierInvoice?: string;
  usedAt?: string;
  technician?: string;
  stockBefore?: number;
  stockAfter?: number;
};

export type ReconditioningMediaVisibility = "internal_purchase" | "internal_workshop" | "public_sale";

export type ReconditioningMedia = {
  id: string;
  deviceId: string;
  dataUrl: string;
  storageBucket?: string;
  storagePath?: string;
  publicUrl?: string;
  signedUrlExpiresAt?: string;
  visibility: ReconditioningMediaVisibility;
  isPublic: boolean;
  isPrimary: boolean;
  sortOrder: number;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReconditioningPublicSettings = {
  showShopName: boolean;
  showShopLogo: boolean;
  showPrice: boolean;
  showGrade: boolean;
  showBattery: boolean;
  showWarranty: boolean;
  showReconditionedDate: boolean;
  showReference: boolean;
  showMaskedImei: boolean;
  showFinalDiagnostic: boolean;
  showControlPoints: boolean;
  showPublicPhotos: boolean;
  showPublicComment: boolean;
  showPoweredBy: boolean;
  showModel: boolean;
  showStorage: boolean;
  showColor: boolean;
  showTrustText: boolean;
};

export type ReconditioningPublicTestVisibility = Partial<
  Record<FunctionalTestKey | PhysicalCheckKey | string, boolean>
>;

export type ReconditioningEvent = {
  id: string;
  at: string;
  title: string;
  by?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type OriginalEstimationSnapshot = {
  createdAt: string;
  coteDeBase: number;
  deductions: { label: string; amount: number }[];
  defects: string[];
  plannedCostsTotal: number;
  prixAutomatique: number;
  prixConseille: number;
  prixMaxAchat: number;
  prixFinalPaye: number;
  manualReason?: string;
  manualOverride: boolean;
  margeEstimee: number;
  riskLevel: string;
  blockedBy: string[];
  confirmationRequired: string[];
};

/** Clés des tests fonctionnels (OK / À vérifier / Défaut). */
export const FUNCTIONAL_TESTS = [
  "Écran",
  "Face ID / Touch ID",
  "Caméras",
  "Haut-parleurs",
  "Micro",
  "Boutons",
  "Batterie",
  "Charge",
  "Wi-Fi",
  "Bluetooth",
  "Réseau",
  "Capteurs",
] as const;

/** Clés de l'état physique (OK / Léger / Important). */
export const PHYSICAL_CHECKS = [
  "Rayures",
  "Chocs",
  "Châssis",
  "Vis",
  "Humidité",
  "Écran fissuré",
  "Back glass",
] as const;

export type FunctionalTestKey = (typeof FUNCTIONAL_TESTS)[number];
export type PhysicalCheckKey = (typeof PHYSICAL_CHECKS)[number];

export type ReconditioningFile = {
  id: string;
  number: string;
  status: ReconditioningStatus;
  /** Étape la plus avancée atteinte (1..5). */
  step: number;
  createdAt: string;
  updatedAt: string;

  // Étape 1 — Appareil reçu
  brand: string;
  model: string;
  storage: string;
  color: string;
  imei: string;
  serial: string;
  cosmeticGrade: CosmeticGrade | "";
  source: ReconditioningSource;
  receivedAt: string;
  observations: string;
  photos: Partial<Record<"face" | "dos" | "cote" | "defaut", string>>;
  media?: ReconditioningMedia[];
  /** Client / fournisseur d'origine (reprise comptoir). */
  customerName?: string;
  /** Provenance déclarée à la reprise. */
  provenance?: "client" | "fournisseur" | "autre";
  /** État constaté à la reprise (checklist du wizard). */
  condition?: IntakeCondition;
  /** Raison du refus de reprise. */
  refusedReason?: string;
  /** true quand l'achat a déjà été tracé dans le registre des achats (évite le double comptage). */
  purchaseLogged?: boolean;

  // Étape 2 — Modèle & marge
  prixAchat: number;
  prixVentePrevu: number;
  prixConseille: number;
  /** Main-d'œuvre estimée (entre dans le coût total). */
  laborCost?: number;
  canalVente: SaleChannel;
  delaiVenteEstime: number;
  parts: ReconditioningPart[];
  originalEstimation?: OriginalEstimationSnapshot;

  // Étape 3 — Tests & état
  functionalTests: Partial<Record<FunctionalTestKey, TestState>>;
  physicalChecks: Partial<Record<PhysicalCheckKey, PhysicalState>>;
  testComment: string;
  publicSettings?: ReconditioningPublicSettings;
  publicTestVisibility?: ReconditioningPublicTestVisibility;

  // Étape 4 — Diagnostic atelier
  batteryHealth: number | null;
  m360Notes: string;

  // Étape 5 — Certificat & sortie
  warrantyMonths: number;
  accessories: string;
  destinationShop: string;
  certificateGenerated: boolean;
  publishedToStock: boolean;
  /** Article de stock créé dans le behar-store lors de la publication. */
  stockItemId?: string;
  /** QR interne atelier : ouvre la fiche interne, jamais la page publique client. */
  internalQrToken?: string;
  internalLabelGeneratedAt?: string;
  /** Dernière impression de l'étiquette interne atelier. */
  internalLabelPrintedAt?: string;
  /** Étiquette de vente client générée (imprimable). */
  saleLabelGeneratedAt?: string;
  /** Technicien en charge du reconditionnement. */
  technician?: string;
  /** Date promise « prêt à vendre » (équivalent du « promis le » réparation). */
  promisedReadyAt?: string;
  /** Emplacement atelier (bac diagnostic, bac reconditionnement A2…). */
  workshopLocation?: string;
  /** Temps passé en intervention (minutes). */
  interventionMinutes?: number;
  /** Données de publication publique. */
  publicToken?: string;
  publicEnabled?: boolean;
  qrGeneratedAt?: string;
  /** Date de fin réelle du reconditionnement / diagnostic final. */
  reconditionedAt?: string;

  // Mise en vente & provenance
  /** Emplacement en boutique (étagère, vitrine…). */
  saleLocation?: string;
  /** Note interne de mise en vente. */
  saleNote?: string;
  /** Date de mise en vente effective (publication en stock). */
  listedAt?: string;
  /** Fournisseur (cas achat fournisseur). */
  supplierName?: string;
  /** Référence facture fournisseur (optionnelle). */
  supplierInvoice?: string;

  // Cycle de vie & rentabilité réelle
  /** Date de mise "Prêt à vendre" (pour le temps moyen avant mise en vente). */
  readyAt?: string;
  /** Vente réelle. */
  soldAt?: string;
  soldPrice?: number;
  saleId?: string;
  finalSalePrice?: number;
  realMargin?: number | null;
  marginStatus?: "Calculée" | "À compléter";
  /** true quand l'article de stock boutique a été décrémenté à la vente (permet la restauration à la réouverture). */
  saleStockDecremented?: boolean;
  /** Blocage : raison (iCloud, FRP, IMEI manquant, carte mère HS, coût trop élevé…). */
  blockedReason?: string;

  history: ReconditioningEvent[];
};

export type MarginSummary = {
  coutTotal: number;
  margeBrute: number;
  margePct: number;
  rentabilite: "Faible" | "Correcte" | "Rentable" | "Très rentable";
  rentabiliteScore: number; // 0..1 pour la barre
};

export type TestSummary = {
  okCount: number;
  defautCount: number;
  aVerifierCount: number;
  importantCount: number;
  totalTests: number;
  grade: CosmeticGrade;
  riskDetected: boolean;
};

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const nowIso = () => new Date().toISOString();

const padNumber = (seq: number) => `ACQ-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`;
const internalToken = (number: string) =>
  `ri-${number
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()}`;
const publicToken = (number: string) => internalToken(number).replace(/^ri-/, "rd-");

export const DEFAULT_PUBLIC_SETTINGS: ReconditioningPublicSettings = {
  showShopName: true,
  showShopLogo: true,
  showPrice: true,
  showGrade: true,
  showBattery: true,
  showWarranty: true,
  showReconditionedDate: true,
  showReference: true,
  showMaskedImei: false,
  showFinalDiagnostic: true,
  showControlPoints: true,
  showPublicPhotos: true,
  showPublicComment: true,
  showPoweredBy: true,
  showModel: true,
  showStorage: true,
  showColor: true,
  showTrustText: true,
};

export function createBlankFile(seq: number): ReconditioningFile {
  const ts = nowIso();
  const number = padNumber(seq);
  return {
    id: uid("recond"),
    number,
    status: "Brouillon",
    step: 1,
    createdAt: ts,
    updatedAt: ts,
    brand: "",
    model: "",
    storage: "",
    color: "",
    imei: "",
    serial: "",
    cosmeticGrade: "",
    source: "Achat comptoir",
    receivedAt: ts,
    observations: "",
    photos: {},
    media: [],
    prixAchat: 0,
    prixVentePrevu: 0,
    prixConseille: 0,
    canalVente: "Boutique physique",
    delaiVenteEstime: 0,
    parts: [],
    functionalTests: {},
    physicalChecks: {},
    testComment: "",
    publicSettings: DEFAULT_PUBLIC_SETTINGS,
    publicTestVisibility: {},
    batteryHealth: null,
    m360Notes: "",
    warrantyMonths: 12,
    accessories: "",
    destinationShop: "Behar Tech",
    certificateGenerated: false,
    publishedToStock: false,
    internalQrToken: internalToken(number),
    internalLabelGeneratedAt: ts,
    publicEnabled: false,
    history: [
      { id: uid("evt"), at: ts, title: "Dossier de reconditionnement créé", by: "Atelier" },
      { id: uid("evt"), at: ts, title: "Étiquette interne atelier générée", by: "Atelier" },
    ],
  };
}

/** Calcule la marge à partir du dossier (coût total = achat + pièces + main-d'œuvre). */
export function computeMargin(file: ReconditioningFile): MarginSummary {
  const partsTotal = file.parts.reduce((sum, part) => sum + part.cost * part.quantity, 0);
  const coutTotal = file.prixAchat + partsTotal + (file.laborCost ?? 0);
  const margeBrute = file.prixVentePrevu - coutTotal;
  const margePct = file.prixVentePrevu > 0 ? (margeBrute / file.prixVentePrevu) * 100 : 0;
  let rentabilite: MarginSummary["rentabilite"] = "Faible";
  if (margePct >= 35) rentabilite = "Très rentable";
  else if (margePct >= 22) rentabilite = "Rentable";
  else if (margePct >= 12) rentabilite = "Correcte";
  const rentabiliteScore = Math.max(0, Math.min(1, margePct / 45));
  return { coutTotal, margeBrute, margePct, rentabilite, rentabiliteScore };
}

/** Marge réelle : uniquement si le téléphone est vendu (prix vendu - coût total). */
export function realMargin(file: ReconditioningFile): { margeReelle: number; tauxReel: number } | null {
  if (!isDeviceComplete(file)) return null;
  if (file.status !== "Vendu" || typeof file.soldPrice !== "number") return null;
  const coutTotal = computeMargin(file).coutTotal;
  const margeReelle = file.soldPrice - coutTotal;
  const tauxReel = coutTotal > 0 ? (margeReelle / coutTotal) * 100 : 0;
  return { margeReelle, tauxReel };
}

function calculateActualSaleMargin(file: ReconditioningFile, finalSalePrice: number): number | null {
  if (typeof file.laborCost !== "number" || !Number.isFinite(file.laborCost)) return null;
  const partsTotal = file.parts.reduce((sum, part) => sum + part.cost * part.quantity, 0);
  return Math.round((finalSalePrice - file.prixAchat - partsTotal - file.laborCost) * 100) / 100;
}

/** Nombre de jours entre l'achat (receivedAt) et la mise en vente (readyAt). */
export function daysToReady(file: ReconditioningFile): number | null {
  if (!file.readyAt || !file.receivedAt) return null;
  const diff = new Date(file.readyAt).getTime() - new Date(file.receivedAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.round(diff / 86_400_000);
}

const A_TESTER_STATUSES: ReconditioningStatus[] = ["Brouillon", "Acheté", "Évaluation"];
const EN_RECOND_STATUSES: ReconditioningStatus[] = ["Tests", "Reconditionnement", "En attente pièce"];
const PRETS_STATUSES: ReconditioningStatus[] = ["Prêt à vendre", "En stock"];
/** Statuts hors activité (ni comptés dans les KPI d'en-cours, ni dans l'investissement). */
const INACTIVE_STATUSES: ReconditioningStatus[] = ["Abandonné", "Refusé"];

const isSameMonth = (iso: string | undefined, ref: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};

export type ReconditioningKpis = {
  aTester: number;
  enRecond: number;
  prets: number;
  vendus: number;
  bloques: number;
  achetesCeMois: number;
  vendusCeMois: number;
  margeEstimeeTotale: number;
  valeurStock: number;
  coutTotal: number;
  margeReelleTotale: number;
  tempsMoyenVente: number | null;
  coutMoyen: number;
  tauxBlocage: number;
  tauxTransformation: number;
  telephonesAchetes: number;
  valeurTotaleAchat: number;
  decoteMoyenne: number;
  ecartEstimationPrixReel: number;
  modificationsManuelles: number;
  bloquesParRegle: number;
  coutMoyenReconditionnement: number;
  tauxEstimationAchat: number;
  tauxAchatPret: number;
  tauxPretVendu: number;
  /** Téléphones en attente d'une pièce. */
  enAttentePiece: number;
  /** Top modèles les plus rentables (sur les téléphones vendus). */
  topModels: { model: string; count: number; margin: number }[];
};

/** Agrège tous les KPI du module reconditionnement à partir des dossiers. */
export function computeReconditioningKpis(files: ReconditioningFile[]): ReconditioningKpis {
  const now = new Date();
  const actifs = files.filter((f) => !INACTIVE_STATUSES.includes(f.status));
  const complets = actifs.filter(isDeviceComplete);
  const incomplets = actifs.filter((f) => !isDeviceComplete(f));
  const aTester = complets.filter((f) => A_TESTER_STATUSES.includes(f.status)).length;
  const enRecond = complets.filter((f) => EN_RECOND_STATUSES.includes(f.status)).length;
  const prets = complets.filter((f) => PRETS_STATUSES.includes(f.status)).length;
  const vendus = files.filter((f) => f.status === "Vendu" && isDeviceComplete(f)).length;
  const bloques = files.filter((f) => f.status === "Bloqué").length + incomplets.length;
  const achetesCeMois = actifs.filter(
    (f) => f.status !== "Brouillon" && isSameMonth(f.receivedAt || f.createdAt, now),
  ).length;
  const vendusCeMois = files.filter(
    (f) => f.status === "Vendu" && isDeviceComplete(f) && isSameMonth(f.soldAt, now),
  ).length;

  // Marge estimée : dossiers pas encore vendus (potentiel).
  const enCours = complets.filter((f) => f.status !== "Vendu" && f.status !== "Bloqué");
  const margeEstimeeTotale = enCours.reduce((sum, f) => sum + computeMargin(f).margeBrute, 0);
  const valeurStock = complets
    .filter((f) => PRETS_STATUSES.includes(f.status))
    .reduce((sum, f) => sum + (f.prixVentePrevu || 0), 0);
  const coutTotal = complets
    .filter((f) => EN_RECOND_STATUSES.includes(f.status) || PRETS_STATUSES.includes(f.status))
    .reduce((sum, f) => sum + computeMargin(f).coutTotal, 0);

  // Marge réelle : uniquement les vendus.
  const margeReelleTotale = files.reduce((sum, f) => sum + (realMargin(f)?.margeReelle ?? 0), 0);

  const delais = files.map((f) => daysToReady(f)).filter((d): d is number => d !== null);
  const tempsMoyenVente = delais.length ? Math.round(delais.reduce((s, d) => s + d, 0) / delais.length) : null;

  const withCost = complets.map((f) => computeMargin(f).coutTotal).filter((c) => c > 0);
  const coutMoyen = withCost.length ? Math.round(withCost.reduce((s, c) => s + c, 0) / withCost.length) : 0;

  const totalAchetes = files.length;
  const tauxBlocage = totalAchetes ? Math.round((bloques / totalAchetes) * 100) : 0;
  const tauxTransformation = totalAchetes ? Math.round(((prets + vendus) / totalAchetes) * 100) : 0;
  const telephonesAchetes = complets.filter((f) => f.prixAchat > 0 || f.originalEstimation).length;
  const valeurTotaleAchat = complets.reduce(
    (sum, f) => sum + (f.prixAchat || f.originalEstimation?.prixFinalPaye || 0),
    0,
  );
  const estimationFiles = files.filter((f) => f.originalEstimation);
  const decoteMoyenne = estimationFiles.length
    ? Math.round(
        estimationFiles.reduce(
          (sum, f) => sum + (f.originalEstimation?.deductions.reduce((s, d) => s + d.amount, 0) ?? 0),
          0,
        ) / estimationFiles.length,
      )
    : 0;
  const ecartEstimationPrixReel = estimationFiles.length
    ? Math.round(
        estimationFiles.reduce(
          (sum, f) =>
            sum + ((f.originalEstimation?.prixConseille ?? 0) - (f.originalEstimation?.prixFinalPaye ?? f.prixAchat)),
          0,
        ) / estimationFiles.length,
      )
    : 0;
  const modificationsManuelles = estimationFiles.filter((f) => f.originalEstimation?.manualOverride).length;
  const bloquesParRegle = files.filter(
    (f) => f.originalEstimation?.blockedBy.length || f.blockedReason?.toLowerCase().includes("règle"),
  ).length;
  const coutMoyenReconditionnement = withCost.length
    ? Math.round(withCost.reduce((s, c) => s + c, 0) / withCost.length)
    : 0;
  const estimationsTransformees = estimationFiles.length;
  const tauxEstimationAchat = estimationsTransformees ? 100 : 0;
  const tauxAchatPret = telephonesAchetes ? Math.round(((prets + vendus) / telephonesAchetes) * 100) : 0;
  const tauxPretVendu = prets + vendus ? Math.round((vendus / (prets + vendus)) * 100) : 0;
  const enAttentePiece = actifs.filter((f) => f.status === "En attente pièce").length;

  // Top modèles les plus rentables : agrégation des marges réelles par modèle vendu.
  const byModel = new Map<string, { count: number; margin: number }>();
  for (const f of files) {
    const real = realMargin(f);
    if (!real) continue;
    const model = [f.brand, f.model].filter(Boolean).join(" ").trim() || "Modèle inconnu";
    const entry = byModel.get(model) ?? { count: 0, margin: 0 };
    entry.count += 1;
    entry.margin += real.margeReelle;
    byModel.set(model, entry);
  }
  const topModels = [...byModel.entries()]
    .map(([model, entry]) => ({ model, count: entry.count, margin: Math.round(entry.margin) }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  return {
    aTester,
    enRecond,
    prets,
    vendus,
    bloques,
    achetesCeMois,
    vendusCeMois,
    margeEstimeeTotale,
    valeurStock,
    coutTotal,
    margeReelleTotale,
    tempsMoyenVente,
    coutMoyen,
    tauxBlocage,
    tauxTransformation,
    telephonesAchetes,
    valeurTotaleAchat,
    decoteMoyenne,
    ecartEstimationPrixReel,
    modificationsManuelles,
    bloquesParRegle,
    coutMoyenReconditionnement,
    tauxEstimationAchat,
    tauxAchatPret,
    tauxPretVendu,
    enAttentePiece,
    topModels,
  };
}

/** Synthèse des tests + grade calculé. */
export function computeTestSummary(file: ReconditioningFile): TestSummary {
  const fVals = FUNCTIONAL_TESTS.map((key) => file.functionalTests[key]);
  const pVals = PHYSICAL_CHECKS.map((key) => file.physicalChecks[key]);
  const okCount = fVals.filter((v) => v === "OK").length + pVals.filter((v) => v === "OK").length;
  const defautCount = fVals.filter((v) => v === "Défaut").length;
  const aVerifierCount = fVals.filter((v) => v === "À vérifier").length;
  const importantCount = pVals.filter((v) => v === "Important").length;
  const legerCount = pVals.filter((v) => v === "Léger").length;
  const totalTests = FUNCTIONAL_TESTS.length + PHYSICAL_CHECKS.length;

  let grade: CosmeticGrade = "A";
  if (defautCount >= 2 || importantCount >= 2) grade = "C";
  else if (defautCount === 1 || importantCount === 1) grade = "B";
  else if (legerCount >= 2) grade = "B";
  if (defautCount >= 4 || importantCount >= 3) grade = "D";

  return {
    okCount,
    defautCount,
    aVerifierCount,
    importantCount,
    totalTests,
    grade,
    riskDetected: defautCount > 0 || importantCount > 0,
  };
}

const GRADE_LABEL: Record<CosmeticGrade, string> = {
  "A+": "Comme neuf",
  A: "Très bon état",
  B: "Bon état",
  C: "État correct",
  D: "État moyen",
};

export const gradeLabel = (grade: CosmeticGrade | "") => (grade ? GRADE_LABEL[grade] : "Non évalué");

export const RECONDITIONING_STEPS = [
  { id: 1, label: "Appareil", caption: "Appareil reçu" },
  { id: 2, label: "Modèle & marge", caption: "Références & prix" },
  { id: 3, label: "Tests & état", caption: "Contrôles & état" },
  { id: 4, label: "Diagnostic atelier", caption: "Synthèse contrôle" },
  { id: 5, label: "Certificat", caption: "Rapport & sortie" },
] as const;

type ReconditioningState = {
  files: ReconditioningFile[];
  sequence: number;
  createFile: () => string;
  updateFile: (id: string, patch: Partial<ReconditioningFile>) => void;
  setPhoto: (id: string, slot: keyof ReconditioningFile["photos"], dataUrl: string | undefined) => void;
  addMedia: (
    id: string,
    input: Omit<ReconditioningMedia, "id" | "deviceId" | "createdAt" | "updatedAt" | "sortOrder"> & {
      sortOrder?: number;
    },
  ) => void;
  deleteMedia: (id: string, mediaId: string) => void;
  setPrimaryMedia: (id: string, mediaId: string) => void;
  toggleMediaPublic: (id: string, mediaId: string, isPublic: boolean) => void;
  reorderMedia: (id: string, mediaId: string, direction: "up" | "down") => void;
  appendEvent: (id: string, title: string, by?: string) => void;
  setStep: (id: string, step: number) => void;
  setTest: (id: string, key: FunctionalTestKey, value: TestState) => void;
  setPhysical: (id: string, key: PhysicalCheckKey, value: PhysicalState) => void;
  addPart: (id: string) => void;
  /** Ajoute une pièce depuis le stock : décrément immédiat + traçabilité fournisseur/facture. */
  addPartFromStock: (id: string, stockItemId: string, quantity?: number) => void;
  updatePart: (id: string, partId: string, patch: Partial<ReconditioningPart>) => void;
  removePart: (id: string, partId: string) => void;
  prefillFromMarket: (id: string) => void;
  generateCertificate: (id: string) => void;
  publishToStock: (id: string) => void;
  /** Reprise acceptée : statut « Acheté » + achat tracé dans le registre des achats. */
  acceptIntake: (id: string) => void;
  /** Reprise refusée : statut « Refusé », historique conservé, rien en stock. */
  markRefused: (id: string, reason?: string) => void;
  /** Envoi en atelier : statut « En reconditionnement ». */
  sendToWorkshop: (id: string) => void;
  markSold: (id: string, price: number) => void;
  markSoldFromCounterSale: (input: {
    id: string;
    price: number;
    saleId: string;
    saleNumber?: string;
    soldAt?: string;
    cashierId?: string;
  }) => void;
  markBlocked: (id: string, reason: string) => void;
  reopenFile: (id: string) => void;
  removeFile: (id: string) => void;
};

const touch = (file: ReconditioningFile, patch: Partial<ReconditioningFile>): ReconditioningFile => ({
  ...file,
  ...patch,
  updatedAt: nowIso(),
});

const shouldSyncPublicCertificate = (file?: ReconditioningFile) =>
  Boolean(file?.publicEnabled || file?.certificateGenerated || file?.publicToken);

export const useReconditioningStore = create<ReconditioningState>()(
  persist(
    (set, get) => ({
      files: [],
      sequence: 1,
      createFile: () => {
        const seq = get().sequence;
        const file = createBlankFile(seq);
        set((state) => ({ files: [file, ...state.files], sequence: state.sequence + 1 }));
        return file.id;
      },
      updateFile: (id, patch) =>
        set((state) => ({
          files: state.files.map((file) => (file.id === id ? touch(file, patch) : file)),
        })),
      setPhoto: (id, slot, dataUrl) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { photos: { ...file.photos, [slot]: dataUrl } }) : file,
          ),
        })),
      addMedia: (id, input) => {
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            const media = file.media ?? [];
            const publicSale = input.visibility === "public_sale";
            const hasPrimary = media.some((item) => item.visibility === input.visibility && item.isPrimary);
            const now = nowIso();
            const next: ReconditioningMedia = {
              ...input,
              id: uid("media"),
              deviceId: id,
              isPublic: input.isPublic || publicSale,
              isPrimary: input.isPrimary || (publicSale && !hasPrimary),
              sortOrder: input.sortOrder ?? media.filter((item) => item.visibility === input.visibility).length,
              createdAt: now,
              updatedAt: now,
            };
            return touch(file, {
              media: [
                ...media.map((item) =>
                  next.isPrimary && item.visibility === next.visibility ? { ...item, isPrimary: false } : item,
                ),
                next,
              ],
              photos:
                next.visibility === "public_sale" && next.isPrimary
                  ? { ...file.photos, cote: next.dataUrl }
                  : file.photos,
              history: [
                ...file.history,
                {
                  id: uid("evt"),
                  at: now,
                  title: `Photo ${publicSale ? "publique" : "interne"} ajoutée`,
                  by: "Atelier",
                },
              ],
            });
          }),
        }));
        const file = get().files.find((entry) => entry.id === id);
        if (file && input.visibility === "public_sale" && shouldSyncPublicCertificate(file))
          void syncPublicReconditioningCertificate(file);
      },
      deleteMedia: (id, mediaId) => {
        let removedPublic = false;
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            const removed = file.media?.find((item) => item.id === mediaId);
            removedPublic = removedPublic || Boolean(removed?.visibility === "public_sale");
            const remaining = (file.media ?? []).filter((item) => item.id !== mediaId);
            const publicMedia = remaining
              .filter((item) => item.visibility === "public_sale" && item.isPublic)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const needsPrimary = removed?.visibility === "public_sale" && removed.isPrimary;
            const nextMedia =
              needsPrimary && publicMedia[0]
                ? remaining.map((item) =>
                    item.id === publicMedia[0].id ? { ...item, isPrimary: true, updatedAt: nowIso() } : item,
                  )
                : remaining;
            const primary = nextMedia.find(
              (item) => item.visibility === "public_sale" && item.isPublic && item.isPrimary,
            );
            return touch(file, {
              media: nextMedia,
              photos: file.photos.cote === removed?.dataUrl ? { ...file.photos, cote: primary?.dataUrl } : file.photos,
            });
          }),
        }));
        const file = get().files.find((entry) => entry.id === id);
        if (file && removedPublic && shouldSyncPublicCertificate(file)) void syncPublicReconditioningCertificate(file);
      },
      setPrimaryMedia: (id, mediaId) => {
        let changedPublic = false;
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            const target = file.media?.find((item) => item.id === mediaId);
            if (!target) return file;
            changedPublic = changedPublic || target.visibility === "public_sale";
            const nextMedia = (file.media ?? []).map((item) =>
              item.visibility === target.visibility
                ? {
                    ...item,
                    isPrimary: item.id === mediaId,
                    isPublic: item.id === mediaId ? true : item.isPublic,
                    updatedAt: nowIso(),
                  }
                : item,
            );
            return touch(file, {
              media: nextMedia,
              photos: target.visibility === "public_sale" ? { ...file.photos, cote: target.dataUrl } : file.photos,
            });
          }),
        }));
        const file = get().files.find((entry) => entry.id === id);
        if (file && changedPublic && shouldSyncPublicCertificate(file)) void syncPublicReconditioningCertificate(file);
      },
      toggleMediaPublic: (id, mediaId, isPublic) => {
        let changedPublic = false;
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            const target = file.media?.find((item) => item.id === mediaId);
            if (!target) return file;
            changedPublic = true;
            const publicMedia = (file.media ?? []).filter(
              (item) => item.visibility === "public_sale" && item.isPublic && item.id !== mediaId,
            );
            const nextMedia = (file.media ?? []).map((item) => {
              if (item.id !== mediaId) return item;
              return {
                ...item,
                isPublic,
                visibility: isPublic ? "public_sale" : item.visibility,
                isPrimary: isPublic && publicMedia.length === 0,
                updatedAt: nowIso(),
              };
            });
            const primary = nextMedia.find(
              (item) => item.visibility === "public_sale" && item.isPublic && item.isPrimary,
            );
            return touch(file, {
              media: nextMedia,
              photos: primary ? { ...file.photos, cote: primary.dataUrl } : file.photos,
            });
          }),
        }));
        const file = get().files.find((entry) => entry.id === id);
        if (file && changedPublic && shouldSyncPublicCertificate(file)) void syncPublicReconditioningCertificate(file);
      },
      reorderMedia: (id, mediaId, direction) =>
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            const media = [...(file.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
            const index = media.findIndex((item) => item.id === mediaId);
            const swap = direction === "up" ? index - 1 : index + 1;
            if (index < 0 || swap < 0 || swap >= media.length) return file;
            const a = media[index];
            const b = media[swap];
            media[index] = { ...b, sortOrder: a.sortOrder, updatedAt: nowIso() };
            media[swap] = { ...a, sortOrder: b.sortOrder, updatedAt: nowIso() };
            return touch(file, { media });
          }),
        })),
      appendEvent: (id, title, by) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  history: [...file.history, { id: uid("evt"), at: nowIso(), title, by: by || "Atelier" }],
                })
              : file,
          ),
        })),
      setStep: (id, step) =>
        set((state) => ({
          files: state.files.map((file) => (file.id === id ? touch(file, { step: Math.max(file.step, step) }) : file)),
        })),
      setTest: (id, key, value) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { functionalTests: { ...file.functionalTests, [key]: value } }) : file,
          ),
        })),
      setPhysical: (id, key, value) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { physicalChecks: { ...file.physicalChecks, [key]: value } }) : file,
          ),
        })),
      addPart: (id) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  parts: [...file.parts, { id: uid("part"), label: "", cost: 0, quantity: 1, priceMode: "achat" }],
                })
              : file,
          ),
        })),
      addPartFromStock: (id, stockItemId, quantity = 1) => {
        const behar = useBeharStore.getState();
        const stockItem = behar.stockItems.find((item) => item.id === stockItemId);
        if (!stockItem) return;
        const qty = Math.max(1, Math.round(quantity));
        const before = stockItem.stock ?? 0;
        const after = Math.max(0, before - qty);
        behar.adjustStock(stockItemId, -qty, "Reconditionnement : pièce utilisée");
        // Facture fournisseur : on remonte le dernier achat tracé pour cette pièce.
        const purchase = [...behar.purchases]
          .filter((entry) => entry.stockItemId === stockItemId)
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
        const cost =
          Number.isFinite(stockItem.purchasePrice) && stockItem.purchasePrice > 0 ? stockItem.purchasePrice : 0;
        const at = nowIso();
        const part: ReconditioningPart = {
          id: uid("part"),
          label: stockItem.name,
          cost,
          quantity: qty,
          stockItemId,
          priceMode: "achat",
          stockDecremented: true,
          reference: stockItem.reference || stockItem.sku || undefined,
          sku: stockItem.sku || stockItem.reference || undefined,
          supplier:
            stockItem.supplier && stockItem.supplier !== "Non renseigné" ? stockItem.supplier : purchase?.supplier,
          supplierInvoice: purchase?.reference || purchase?.number || undefined,
          usedAt: at,
          technician: get().files.find((f) => f.id === id)?.technician || "Atelier principal",
          stockBefore: before,
          stockAfter: after,
        };
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  parts: [...file.parts, part],
                  history: [
                    ...file.history,
                    { id: uid("evt"), at, title: `Pièce utilisée : ${stockItem.name}`, by: "Atelier" },
                    { id: uid("evt"), at, title: `Stock décrémenté (${before} → ${after})`, by: "Système" },
                  ],
                })
              : file,
          ),
        }));
      },
      updatePart: (id, partId, patch) => {
        // Lien stock : quand la pièce est reliée à un article du stock, on décrémente le
        // stock central ; si on change/retire l'article, on restaure l'ancien.
        const file = get().files.find((f) => f.id === id);
        const part = file?.parts.find((p) => p.id === partId);
        const nextPatch: Partial<ReconditioningPart> = { ...patch };
        if (part && "stockItemId" in patch && patch.stockItemId !== part.stockItemId) {
          const behar = useBeharStore.getState();
          const qty = Math.max(1, patch.quantity ?? part.quantity ?? 1);
          if (part.stockDecremented && part.stockItemId) {
            behar.adjustStock(part.stockItemId, part.quantity, "Reconditionnement : pièce retirée");
          }
          if (patch.stockItemId) {
            const stockItem = behar.stockItems.find((item) => item.id === patch.stockItemId);
            const before = stockItem?.stock ?? 0;
            const after = Math.max(0, before - qty);
            behar.adjustStock(patch.stockItemId, -qty, "Reconditionnement : pièce utilisée");
            nextPatch.stockDecremented = true;
            nextPatch.reference = stockItem?.reference || stockItem?.sku || nextPatch.reference;
            nextPatch.sku = stockItem?.sku || stockItem?.reference || nextPatch.sku;
            nextPatch.supplier = stockItem?.supplier || nextPatch.supplier;
            nextPatch.usedAt = nowIso();
            nextPatch.technician = "Technicien atelier";
            nextPatch.stockBefore = before;
            nextPatch.stockAfter = after;
          } else {
            nextPatch.stockDecremented = false;
          }
        } else if (part?.stockDecremented && part.stockItemId && "quantity" in patch) {
          const nextQty = Math.max(1, patch.quantity ?? part.quantity ?? 1);
          const delta = part.quantity - nextQty;
          if (delta) {
            const stockItem = useBeharStore.getState().stockItems.find((item) => item.id === part.stockItemId);
            const before = stockItem?.stock ?? 0;
            const after = Math.max(0, before + delta);
            useBeharStore.getState().adjustStock(part.stockItemId, delta, "Reconditionnement : quantité pièce ajustée");
            nextPatch.stockBefore = part.stockBefore ?? before;
            nextPatch.stockAfter = after;
            nextPatch.usedAt = part.usedAt ?? nowIso();
          }
        }
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id
              ? touch(f, {
                  parts: f.parts.map((p) => (p.id === partId ? { ...p, ...nextPatch } : p)),
                  history:
                    part && ("stockItemId" in patch || "quantity" in patch)
                      ? [
                          ...f.history,
                          {
                            id: uid("evt"),
                            at: nowIso(),
                            title: nextPatch.stockDecremented
                              ? `Pièce utilisée : ${nextPatch.label || part.label || "pièce atelier"}`
                              : "Pièce atelier mise à jour",
                            by: "Atelier",
                          },
                        ]
                      : f.history,
                })
              : f,
          ),
        }));
      },
      removePart: (id, partId) => {
        const file = get().files.find((f) => f.id === id);
        const part = file?.parts.find((p) => p.id === partId);
        if (part?.stockDecremented && part.stockItemId) {
          useBeharStore.getState().adjustStock(part.stockItemId, part.quantity, "Reconditionnement : pièce retirée");
        }
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? touch(f, { parts: f.parts.filter((p) => p.id !== partId) }) : f,
          ),
        }));
      },
      prefillFromMarket: (id) =>
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            const market = getMarketData(`${file.brand} ${file.model}`) ?? getMarketData(file.model);
            if (!market) return file;
            const resale = market.prixInternet ?? market.prixMoyen;
            return touch(file, {
              prixVentePrevu: file.prixVentePrevu || resale,
              prixConseille: file.prixConseille || Math.round(resale * 1.07),
              delaiVenteEstime: file.delaiVenteEstime || Math.round(market.joursMoyenVente),
              history: [
                ...file.history,
                {
                  id: uid("evt"),
                  at: nowIso(),
                  title: `Estimation marché appliquée (${resale} · ${Math.round(market.joursMoyenVente)} j)`,
                  by: "Marché",
                },
              ],
            });
          }),
        })),
      generateCertificate: (id) => {
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            if (!canMarkReadyForSale(file)) {
              return touch(file, {
                status: isDeviceComplete(file) ? file.status : "À compléter",
                history: [
                  ...file.history,
                  {
                    id: uid("evt"),
                    at: nowIso(),
                    title: "Complétez la fiche avant de mettre cet appareil en vente",
                    by: "Atelier",
                  },
                ],
              });
            }
            return touch(file, {
              certificateGenerated: true,
              publicEnabled: true,
              publicToken: file.publicToken ?? publicToken(file.number),
              qrGeneratedAt: nowIso(),
              reconditionedAt: file.reconditionedAt ?? nowIso(),
              status: file.status === "En stock" ? "En stock" : "Prêt à vendre",
              // Date de mise en vente (pour le temps moyen avant mise en vente).
              readyAt: file.readyAt ?? nowIso(),
              step: Math.max(file.step, 5),
              history: [
                ...file.history,
                { id: uid("evt"), at: nowIso(), title: "Diagnostic final validé et QR public généré", by: "Atelier" },
              ],
            });
          }),
        }));
        const file = get().files.find((entry) => entry.id === id);
        if (file && shouldSyncPublicCertificate(file)) void syncPublicReconditioningCertificate(file);
      },
      publishToStock: (id) => {
        const file = get().files.find((entry) => entry.id === id);
        if (!file || file.publishedToStock) return;
        if (!isDeviceComplete(file) || !canPublishPublicCertificate(file) || !file.publicEnabled) {
          set((state) => ({
            files: state.files.map((entry) =>
              entry.id === id
                ? touch(entry, {
                    status: isDeviceComplete(entry) ? entry.status : "À compléter",
                    history: [
                      ...entry.history,
                      {
                        id: uid("evt"),
                        at: nowIso(),
                        title: "Diagnostic final et QR public requis avant publication stock",
                        by: "Atelier",
                      },
                    ],
                  })
                : entry,
            ),
          }));
          return;
        }
        const label = getDeviceDisplayName(file);
        const margin = computeMargin(file);
        const beharStore = useBeharStore.getState();
        // 1. Le téléphone reconditionné devient un vrai article de stock (produit boutique).
        let stockItemId: string | undefined;
        try {
          stockItemId =
            beharStore.addStockItem({
              name: label,
              part: label,
              reference: file.imei || file.serial || file.number,
              sku: file.imei || file.number,
              deviceType: "Smartphone",
              brandName: file.brand || undefined,
              purchasePrice: margin.coutTotal,
              salePrice: file.prixVentePrevu,
              quantity: 1,
              stock: 1,
              threshold: 0,
              supplier: file.source,
              itemType: "product",
              productCategory: "Autre",
              counterVisible: true,
              counterSaleEnabled: true,
              repairEnabled: false,
              active: true,
              skipModelInference: true,
              skipPurchaseLog: true,
              reconditioningFileId: file.id,
            }) || undefined;
        } catch {
          /* pas de permission stock : on publie quand même le dossier */
        }
        // 2. L'acquisition (prix d'achat) est tracée comme un achat téléphone,
        //    sauf si elle l'a déjà été à l'acceptation de la reprise (acceptIntake).
        let purchaseLoggedNow = false;
        if (file.prixAchat > 0 && !file.purchaseLogged) {
          try {
            beharStore.addPurchase({
              kind: "telephone",
              source: "Reconditionnement",
              label,
              reference: file.imei || file.serial || undefined,
              supplier: file.source,
              quantity: 1,
              unitCost: file.prixAchat,
              reconditioningFileId: file.id,
              stockItemId,
            });
            purchaseLoggedNow = true;
          } catch {
            /* ignore */
          }
        }
        set((state) => ({
          files: state.files.map((entry) =>
            entry.id === id
              ? touch(entry, {
                  publishedToStock: true,
                  purchaseLogged: entry.purchaseLogged || purchaseLoggedNow,
                  status: "En stock",
                  stockItemId,
                  readyAt: entry.readyAt ?? nowIso(),
                  listedAt: entry.listedAt ?? nowIso(),
                  history: [
                    ...entry.history,
                    { id: uid("evt"), at: nowIso(), title: "Publié en stock boutique", by: "Atelier" },
                  ],
                })
              : entry,
          ),
        }));
        const nextFile = get().files.find((entry) => entry.id === id);
        if (nextFile && shouldSyncPublicCertificate(nextFile)) void syncPublicReconditioningCertificate(nextFile);
      },
      acceptIntake: (id) => {
        const file = get().files.find((entry) => entry.id === id);
        if (!file || file.purchaseLogged) return;
        const label = isDeviceComplete(file)
          ? getDeviceDisplayName(file)
          : [file.brand, file.model, file.storage].filter((value) => value.trim()).join(" ") || "Téléphone B2C";
        const isB2cBuyback =
          file.provenance === "client" || file.source === "Rachat client" || file.source === "Achat comptoir";
        let logged = false;
        try {
          useBeharStore.getState().addPurchase({
            kind: "telephone",
            source: isB2cBuyback ? "Rachat client" : "Reconditionnement",
            label,
            reference: file.imei || file.serial || undefined,
            supplier: isB2cBuyback ? file.customerName || "Client B2C" : file.supplierName || file.source,
            invoiceNumber: file.supplierInvoice,
            quantity: 1,
            unitCost: Math.max(0, file.prixAchat),
            reconditioningFileId: file.id,
          });
          logged = true;
        } catch {
          /* pas de permission achats : la fiche reste valide */
        }
        if (!isDeviceComplete(file)) {
          set((state) => ({
            files: state.files.map((entry) =>
              entry.id === id
                ? touch(entry, {
                    status: "À compléter",
                    purchaseLogged: logged,
                    history: [
                      ...entry.history,
                      {
                        id: uid("evt"),
                        at: nowIso(),
                        title: "Reprise incomplète — achat enregistré, fiche à compléter",
                        by: "Comptoir",
                      },
                    ],
                  })
                : entry,
            ),
          }));
          return;
        }
        set((state) => ({
          files: state.files.map((entry) =>
            entry.id === id
              ? touch(entry, {
                  status: "Acheté",
                  purchaseLogged: logged || entry.purchaseLogged,
                  history: [
                    ...entry.history,
                    { id: uid("evt"), at: nowIso(), title: `Reprise acceptée — ${label}`, by: "Comptoir" },
                  ],
                })
              : entry,
          ),
        }));
      },
      markRefused: (id, reason) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  status: "Refusé",
                  refusedReason: reason,
                  history: [
                    ...file.history,
                    {
                      id: uid("evt"),
                      at: nowIso(),
                      title: `Reprise refusée${reason ? ` : ${reason}` : ""}`,
                      by: "Comptoir",
                    },
                  ],
                })
              : file,
          ),
        })),
      sendToWorkshop: (id) =>
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            if (!isDeviceComplete(file)) {
              return touch(file, {
                status: "À compléter",
                history: [
                  ...file.history,
                  { id: uid("evt"), at: nowIso(), title: "Complétez la fiche avant l'envoi en atelier", by: "Atelier" },
                ],
              });
            }
            return touch(file, {
              status: "Reconditionnement",
              step: Math.max(file.step, 3),
              history: [
                ...file.history,
                { id: uid("evt"), at: nowIso(), title: "Envoyé en atelier (reconditionnement)", by: "Atelier" },
              ],
            });
          }),
        })),
      markSold: (id, price) => {
        // L'appareil publié en stock boutique sort du stock à la vente — sinon il
        // resterait vendable au comptoir (stock fantôme / double vente).
        const target = get().files.find((file) => file.id === id);
        let saleStockDecremented = false;
        if (
          target &&
          canMarkSold(target) &&
          target.publishedToStock &&
          target.stockItemId &&
          !target.saleStockDecremented
        ) {
          const behar = useBeharStore.getState();
          const stockItem = behar.stockItems.find((item) => item.id === target.stockItemId);
          if (stockItem && stockItem.stock > 0) {
            behar.adjustStock(target.stockItemId, -1, "Reconditionnement : appareil vendu");
            saleStockDecremented = true;
          }
        }
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            if (!canMarkSold(file)) {
              return touch(file, {
                status: isDeviceComplete(file) ? file.status : "À compléter",
                history: [
                  ...file.history,
                  {
                    id: uid("evt"),
                    at: nowIso(),
                    title: "Complétez la fiche avant de vendre cet appareil",
                    by: "Atelier",
                  },
                ],
              });
            }
            return touch(file, {
              status: "Vendu",
              soldAt: nowIso(),
              soldPrice: Math.max(0, price),
              finalSalePrice: Math.max(0, price),
              realMargin: calculateActualSaleMargin(file, Math.max(0, price)),
              marginStatus: calculateActualSaleMargin(file, Math.max(0, price)) == null ? "À compléter" : "Calculée",
              saleStockDecremented: file.saleStockDecremented || saleStockDecremented,
              history: [
                ...file.history,
                { id: uid("evt"), at: nowIso(), title: `Vendu ${Math.max(0, price)} €`, by: "Atelier" },
                ...(saleStockDecremented
                  ? [{ id: uid("evt"), at: nowIso(), title: "Article retiré du stock boutique", by: "Système" }]
                  : []),
              ],
            });
          }),
        }));
        const file = get().files.find((entry) => entry.id === id);
        if (file && shouldSyncPublicCertificate(file)) void syncPublicReconditioningCertificate(file);
      },
      markSoldFromCounterSale: ({ id, price, saleId, saleNumber, soldAt, cashierId }) => {
        const soldAtIso = soldAt || nowIso();
        const finalSalePrice = Math.max(0, price);
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            if (!canMarkSold(file) && file.status === "Vendu" && file.saleId === saleId) return file;
            if (!canMarkSold(file)) {
              return touch(file, {
                status: isDeviceComplete(file) ? file.status : "À compléter",
                history: [
                  ...file.history,
                  { id: uid("evt"), at: soldAtIso, title: "Vente comptoir reçue mais fiche incomplète", by: "Système" },
                ],
              });
            }
            const margin = calculateActualSaleMargin(file, finalSalePrice);
            return touch(file, {
              status: "Vendu",
              soldAt: soldAtIso,
              soldPrice: finalSalePrice,
              saleId,
              finalSalePrice,
              realMargin: margin,
              marginStatus: margin == null ? "À compléter" : "Calculée",
              saleStockDecremented: true,
              history: [
                ...file.history,
                {
                  id: uid("evt"),
                  at: soldAtIso,
                  title: "Appareil vendu",
                  by: "Vente comptoir",
                  description: `Vente comptoir liée à la référence ${saleNumber || saleId}`,
                  metadata: {
                    sale_id: saleId,
                    sale_price: finalSalePrice,
                    sold_at: soldAtIso,
                    cashier_id: cashierId,
                  },
                },
              ],
            });
          }),
        }));
        const file = get().files.find((entry) => entry.id === id);
        if (file) {
          void syncPublicReconditioningCertificate(file);
          publishDomainEvent({ type: "reconditioning.device_sold", deviceId: id, saleId, occurredAt: soldAtIso });
        }
      },
      markBlocked: (id, reason) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  status: "Bloqué",
                  blockedReason: reason,
                  history: [
                    ...file.history,
                    {
                      id: uid("evt"),
                      at: nowIso(),
                      title: `Bloqué : ${reason || "raison non précisée"}`,
                      by: "Atelier",
                    },
                  ],
                })
              : file,
          ),
        })),
      reopenFile: (id) => {
        // Vente annulée : l'article de stock boutique décrémenté à la vente est restauré.
        const target = get().files.find((file) => file.id === id);
        if (target?.saleStockDecremented && target.stockItemId) {
          useBeharStore.getState().adjustStock(target.stockItemId, 1, "Reconditionnement : vente annulée");
        }
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  status: file.publishedToStock
                    ? "En stock"
                    : file.certificateGenerated
                      ? "Prêt à vendre"
                      : "Reconditionnement",
                  blockedReason: undefined,
                  soldAt: undefined,
                  soldPrice: undefined,
                  saleId: undefined,
                  finalSalePrice: undefined,
                  realMargin: undefined,
                  marginStatus: undefined,
                  saleStockDecremented: undefined,
                  history: [
                    ...file.history,
                    { id: uid("evt"), at: nowIso(), title: "Dossier réactivé", by: "Atelier" },
                  ],
                })
              : file,
          ),
        }));
      },
      removeFile: (id) => set((state) => ({ files: state.files.filter((file) => file.id !== id) })),
    }),
    { name: "behar-reconditioning", version: 1 },
  ),
);

let reconditioningSalesBridgeInstalled = false;

export function installReconditioningSalesBridge() {
  if (reconditioningSalesBridgeInstalled) return;
  reconditioningSalesBridgeInstalled = true;
  subscribeDomainEvent("counter_sale.completed", (event) => {
    const store = useReconditioningStore.getState();
    for (const line of event.sale.lines) {
      const deviceId =
        line.reconditioningFileId ||
        store.files.find((file) => file.stockItemId && file.stockItemId === line.stockItemId)?.id;
      if (!deviceId) continue;
      store.markSoldFromCounterSale({
        id: deviceId,
        price: line.total || line.unitPrice,
        saleId: event.sale.id,
        saleNumber: event.sale.number,
        soldAt: event.sale.paidAt || event.occurredAt,
        cashierId: event.sale.createdByUserId,
      });
    }
  });
  subscribeDomainEvent("counter_sale.cancelled", (event) => {
    const store = useReconditioningStore.getState();
    for (const line of event.sale.lines) {
      const deviceId =
        line.reconditioningFileId ||
        store.files.find((file) => file.stockItemId && file.stockItemId === line.stockItemId)?.id;
      if (!deviceId) continue;
      const file = store.files.find((entry) => entry.id === deviceId);
      if (file?.saleId === event.sale.id) store.reopenFile(deviceId);
    }
  });
}

installReconditioningSalesBridge();
