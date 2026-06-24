// PriceBookItem — Catalogue prix atelier (Phase A)
// Modèle, helpers de calcul et données d'exemple Behar Tech.

import { deviceCatalog } from "@/data/deviceCatalog";
import type { WorkshopCountry } from "@/lib/workshop-country";

export type PriceBookSource = "behar_example" | "preloaded" | "workshop_import" | "manual";

export type PriceBookDeviceType = "smartphone" | "tablet" | "computer" | "console" | "other";

export type PriceBookItem = {
  id: string;
  source: PriceBookSource;
  typeAppareil: PriceBookDeviceType;
  marque: string;
  modele: string;
  /** Valeur brute si le modèle a été corrigé/migré */
  modeleOriginal?: string;
  modeleNormalise?: string;
  reparation: string;
  piece: string;
  qualite: string;
  sku?: string;
  prixAchat: number;
  mainOeuvre: number;
  prixVentePiece: number;
  prixClientTotal: number;
  marge: number;
  margePourcentage?: number;
  prixAchatChf?: number;
  mainOeuvreChf?: number;
  prixVentePieceChf?: number;
  prixClientTotalChf?: number;
  margeChf?: number;
  margePourcentageChf?: number;
  fournisseur?: string;
  stockDisponible?: number;
  stockItemId?: string;
  garantie?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PriceBookInput = Partial<Omit<PriceBookItem, "updatedAt">> &
  Pick<PriceBookItem, "marque" | "modele" | "reparation" | "piece" | "qualite">;

const PRICE_BOOK_DEVICE_TYPES: PriceBookDeviceType[] = ["smartphone", "tablet", "computer", "console", "other"];

export const PRICE_BOOK_DEVICE_LABELS: Record<PriceBookDeviceType, string> = {
  smartphone: "Smartphone",
  tablet: "Tablette",
  computer: "Ordinateur",
  console: "Console",
  other: "Autre",
};

export const PRICE_BOOK_SOURCE_LABELS: Record<PriceBookSource, string> = {
  behar_example: "Exemple Behar",
  preloaded: "Préchargé",
  workshop_import: "Import atelier",
  manual: "Manuel",
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/\s/g, "").replace(",", ".").replace(/[\u20AC$]/g, "");
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  return toNumber(value);
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const cleanSpaces = (s: string) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

export const normalizeDeviceType = (value: unknown): PriceBookDeviceType => {
  if (typeof value !== "string") return "other";
  const v = value.trim().toLowerCase();
  if (PRICE_BOOK_DEVICE_TYPES.includes(v as PriceBookDeviceType)) return v as PriceBookDeviceType;
  if (/(phone|tel)/.test(v)) return "smartphone";
  if (/(tab)/.test(v)) return "tablet";
  if (/(ord|pc|mac|laptop|comput)/.test(v)) return "computer";
  if (/(cons|switch|ps[345]|xbox)/.test(v)) return "console";
  return "other";
};

export const normalizeSource = (value: unknown): PriceBookSource => {
  if (value === "workshop_import" || value === "manual" || value === "behar_example" || value === "preloaded")
    return value;
  return "manual";
};

export const computePriceBookTotals = (
  prixVentePiece: number,
  mainOeuvre: number,
  prixAchat: number,
): {
  prixClientTotal: number;
  marge: number;
  margePourcentage: number;
} => {
  const total = round2(prixVentePiece + mainOeuvre);
  const marge = round2(total - prixAchat);
  const margePct = total > 0 ? round2((marge / total) * 100) : 0;
  return { prixClientTotal: total, marge, margePourcentage: margePct };
};

export type PriceBookMarketPrice = {
  country: WorkshopCountry;
  prixAchat: number;
  mainOeuvre: number;
  prixVentePiece: number;
  prixClientTotal: number;
  marge: number;
  margePourcentage: number;
  hasPrice: boolean;
};

export const getPriceBookMarketPrice = (
  item: PriceBookItem,
  country: WorkshopCountry,
): PriceBookMarketPrice => {
  if (country === "CH") {
    const prixAchat = item.prixAchatChf ?? 0;
    const mainOeuvre = item.mainOeuvreChf ?? 0;
    const prixVentePiece = item.prixVentePieceChf ?? 0;
    const totals = computePriceBookTotals(prixVentePiece, mainOeuvre, prixAchat);
    return {
      country,
      prixAchat,
      mainOeuvre,
      prixVentePiece,
      prixClientTotal: item.prixClientTotalChf ?? totals.prixClientTotal,
      marge: item.margeChf ?? totals.marge,
      margePourcentage: item.margePourcentageChf ?? totals.margePourcentage,
      hasPrice: prixVentePiece > 0 || mainOeuvre > 0 || (item.prixClientTotalChf ?? 0) > 0,
    };
  }
  return {
    country,
    prixAchat: item.prixAchat,
    mainOeuvre: item.mainOeuvre,
    prixVentePiece: item.prixVentePiece,
    prixClientTotal: item.prixClientTotal,
    marge: item.marge,
    margePourcentage: item.margePourcentage ?? 0,
    hasPrice: item.prixVentePiece > 0 || item.mainOeuvre > 0 || item.prixClientTotal > 0,
  };
};

const todayIso = () => new Date().toISOString();

const newId = () => `pb_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

export type PriceBookNormalizationResult = {
  item: PriceBookItem;
  /** Item corrigé automatiquement (modèle/qualité/intervention) */
  autoCorrected: boolean;
  /** La correction n'est pas sûre -> item désactivé + marqué à vérifier */
  needsReview: boolean;
  extractedQualities: string[];
  extractedIntervention?: string;
};

const QUALITY_TOKENS: Array<{ label: string; re: RegExp }> = [
  { label: "LTPS", re: /\bLTPS\b/i },
  { label: "OLED", re: /\bOLED\b/i },
  { label: "Soft OLED", re: /\bSoft\s*OLED\b/i },
  { label: "Hard OLED", re: /\bHard\s*OLED\b/i },
  { label: "Incell", re: /\bIncell\b/i },
  { label: "LCD", re: /\bLCD\b/i },
  { label: "120Hz", re: /\b120\s*Hz\b|\b120Hz\b/i },
  { label: "60Hz", re: /\b60\s*Hz\b|\b60Hz\b/i },
  { label: "TI", re: /\bTI\b/i },
  { label: "GX", re: /\bGX\b/i },
  { label: "Pulled", re: /\bPulled\b/i },
  { label: "Original", re: /\bOriginal\b/i },
  { label: "Compatible", re: /\bCompatible\b/i },
  { label: "Service Pack", re: /\bService\s*Pack\b/i },
];

const INTERVENTION_TOKENS: Array<{ label: string; re: RegExp }> = [
  { label: "Écran", re: /\b(ecran|écran|screen)\b/i },
  { label: "Vitre", re: /\b(vitre)\b/i },
  { label: "Batterie", re: /\b(batterie|battery)\b/i },
  { label: "Connecteur de charge", re: /\b(connecteur|charge|charging\s*port|usb|dock)\b/i },
  { label: "Lecteur carte SIM", re: /\b(sim|lecteur\s*sim|carte\s*sim)\b/i },
  { label: "Caméra", re: /\b(cam(é|e)ra|camera)\b/i },
  { label: "Haut-parleur", re: /\b(haut[\s-]*parleur|speaker)\b/i },
  { label: "Diagnostic", re: /\b(diagnostic)\b/i },
  { label: "Port HDMI", re: /\b(hdmi)\b/i },
];

const MODEL_ALIASES: Array<{ re: RegExp; to: string }> = [
  { re: /\bPS5\b/i, to: "PlayStation 5" },
  { re: /\bPS4\b/i, to: "PlayStation 4" },
  { re: /\bPS3\b/i, to: "PlayStation 3" },
  { re: /\bXbox\s*Series\s*X\b/i, to: "Xbox Series X" },
  { re: /\bXbox\s*Series\s*S\b/i, to: "Xbox Series S" },
];

const isModelTooVague = (model: string) => {
  const m = cleanSpaces(model);
  if (!m) return true;
  // Ex: "iPhone", "Galaxy", "MacBook" sans numéro/suffixe
  if (/^iphone$/i.test(m)) return true;
  if (/^galaxy$/i.test(m)) return true;
  if (/^macbook$/i.test(m)) return true;
  return false;
};

/**
 * Normalise un item de catalogue prix.
 * Objectif P0: ne jamais laisser une qualité/intervention dans `modele`.
 *
 * - Si correction sûre: on déplace vers `qualite` / (optionnellement) `reparation`.
 * - Si correction incertaine: on désactive la ligne + on la marque "À vérifier" (réversible via `modeleOriginal`).
 */
export const normalizePriceBookStructure = (raw: PriceBookItem): PriceBookNormalizationResult => {
  const originalModel = cleanSpaces(raw.modele);
  const originalRepair = cleanSpaces(raw.reparation);
  const originalQuality = cleanSpaces(raw.qualite || "");

  let workingModel = originalModel;
  const extractedQualities: string[] = [];

  // 1. Détection et extraction des couleurs
  const colorTokens = [
    "Blanc",
    "Noir",
    "Bleu",
    "Rouge",
    "Vert",
    "Jaune",
    "Mauve",
    "Violet",
    "Or",
    "Argent",
    "Gris",
    "Sideral",
    "Midnight",
    "Starlight",
    "Alpine",
    "Graphite",
    "Pacific",
    "Deep Purple",
    "Sierra",
    "Space Grey",
    "Silver",
    "Gold",
    "Rose",
    "Pink",
    "Blue",
    "Black",
    "White",
    "Green",
    "Red",
    "Yellow",
    "Purple",
  ];
  for (const color of colorTokens) {
    const re = new RegExp(`\\b${color}\\b`, "i");
    if (re.test(workingModel)) {
      extractedQualities.push(color);
      workingModel = workingModel.replace(re, " ");
    }
  }

  // 2. Détection et extraction des variantes de pièces
  const variantTokens = [
    { label: "Large Hole", re: /\bLarge\s*Hole\b/i },
    { label: "Small Hole", re: /\bSmall\s*Hole\b/i },
    { label: "Sans Logo", re: /\bSans\s*Logo\b/i },
    { label: "With Logo", re: /\bWith\s*Logo\b/i },
    { label: "ReLife", re: /\bReLife\b/i },
  ];
  for (const v of variantTokens) {
    if (v.re.test(workingModel)) {
      extractedQualities.push(v.label);
      workingModel = workingModel.replace(v.re, " ");
    }
  }

  // Heuristique P0: si le champ `modele` contient plusieurs fois le nom de gamme
  const lastOccurrenceTail = (hay: string, needle: string) => {
    const idx = hay.toLowerCase().lastIndexOf(needle.toLowerCase());
    if (idx < 0) return hay;
    return hay.slice(idx);
  };
  if ((workingModel.match(/iphone/gi) ?? []).length >= 2) workingModel = lastOccurrenceTail(workingModel, "iPhone");
  if ((workingModel.match(/galaxy/gi) ?? []).length >= 2) workingModel = lastOccurrenceTail(workingModel, "Galaxy");
  if ((workingModel.match(/redmi/gi) ?? []).length >= 2) workingModel = lastOccurrenceTail(workingModel, "Redmi");
  if ((workingModel.match(/pixel/gi) ?? []).length >= 2) workingModel = lastOccurrenceTail(workingModel, "Pixel");

  for (const a of MODEL_ALIASES) {
    if (a.re.test(workingModel)) workingModel = workingModel.replace(a.re, a.to);
  }

  for (const t of QUALITY_TOKENS) {
    if (t.re.test(workingModel)) extractedQualities.push(t.label);
  }

  // Variantes fréquentes
  if (/\bversion\s*us\b/i.test(workingModel) && !extractedQualities.includes("Version US"))
    extractedQualities.push("Version US");
  const pulledGrade = workingModel.match(/\bPulled\s*([ABC])\b/i)?.[1];
  if (pulledGrade && !extractedQualities.some((q) => q.toLowerCase() === `pulled ${pulledGrade}`.toLowerCase())) {
    extractedQualities.push(`Pulled ${pulledGrade}`);
  }

  let extractedIntervention: string | undefined;
  for (const t of INTERVENTION_TOKENS) {
    if (t.re.test(workingModel)) {
      extractedIntervention = t.label;
      break;
    }
  }

  // Retire tokens (qualité/intervention) du modèle
  for (const t of QUALITY_TOKENS) workingModel = workingModel.replace(t.re, " ");
  workingModel = workingModel.replace(/\bPulled\s*[ABC]\b/gi, " ");
  workingModel = workingModel.replace(/\bVersion\s*US\b/gi, " ");
  workingModel = workingModel.replace(/\bUS\b/gi, " ");
  for (const t of INTERVENTION_TOKENS) workingModel = workingModel.replace(t.re, " ");
  workingModel = workingModel.replace(/[()【】[\]{}]/g, " ");
  workingModel = workingModel.replace(/[-/|_]+/g, " ");

  let normalizedModel = cleanSpaces(workingModel);

  // 3. Match avec le catalogue officiel (Source de vérité)
  const officialBrand = deviceCatalog.find((b) => b.brand.toLowerCase() === raw.marque.toLowerCase());
  if (officialBrand) {
    // Essai de match exact ou partiel
    const match = officialBrand.models.find((m) => {
      const cleanM = cleanSpaces(m).toLowerCase();
      const cleanTarget = normalizedModel.toLowerCase();
      return cleanM === cleanTarget || cleanTarget === cleanM;
    });
    if (match) {
      normalizedModel = match;
    } else {
      // Recherche du modèle le plus long contenu dans normalizedModel (ex: "iPhone 11 Pro Max" matché dans "iPhone 11 Pro Max (A)")
      const partialMatch = officialBrand.models
        .filter((m) => normalizedModel.toLowerCase().includes(m.toLowerCase()))
        .sort((a, b) => b.length - a.length)[0];
      if (partialMatch) {
        normalizedModel = partialMatch;
      }
    }
  }

  const hasSuspicious = normalizedModel !== originalModel;
  const mergedQuality = Array.from(
    new Set(
      [originalQuality, ...extractedQualities]
        .flatMap((q) => cleanSpaces(q).split(/\s*\/\s*/g))
        .map((q) => cleanSpaces(q))
        .filter(Boolean),
    ),
  ).join(" / ");

  // Cas incertains
  const needsReview = hasSuspicious && isModelTooVague(normalizedModel);

  const next: PriceBookItem = {
    ...raw,
    modele: needsReview ? originalModel : normalizedModel || originalModel,
    modeleOriginal: hasSuspicious ? originalModel : raw.modeleOriginal,
    modeleNormalise: (needsReview ? originalModel : normalizedModel || originalModel).trim().toLowerCase(),
    qualite: mergedQuality || "Standard",
    reparation: originalRepair || extractedIntervention || raw.reparation,
    isActive: needsReview ? false : raw.isActive,
  };

  if (needsReview) {
    const tag = "[À vérifier]";
    const context = `modele="${originalModel}" → modeleNettoye="${normalizedModel || "?"}"`;
    const base = cleanSpaces(raw.notes || "");
    next.notes = base.includes(tag) ? base : cleanSpaces([tag, context, base].filter(Boolean).join(" "));
  }

  return {
    item: next,
    autoCorrected: hasSuspicious && !needsReview,
    needsReview,
    extractedQualities,
    extractedIntervention,
  };
};

export const createPriceBookItem = (input: PriceBookInput): PriceBookItem => {
  const prixAchatRaw = toNumber(input.prixAchat);
  const prixVentePiece = round2(toNumber(input.prixVentePiece));
  const mainOeuvre = round2(toNumber(input.mainOeuvre));
  const prixAchat = round2(prixAchatRaw);
  const totals = computePriceBookTotals(prixVentePiece, mainOeuvre, prixAchat);
  const prixAchatChfRaw = toOptionalNumber(input.prixAchatChf);
  const prixVentePieceChfRaw = toOptionalNumber(input.prixVentePieceChf);
  const mainOeuvreChfRaw = toOptionalNumber(input.mainOeuvreChf);
  const hasSwissPrice =
    prixAchatChfRaw !== undefined || prixVentePieceChfRaw !== undefined || mainOeuvreChfRaw !== undefined;
  const prixAchatChf = prixAchatChfRaw === undefined ? undefined : round2(prixAchatChfRaw);
  const prixVentePieceChf = prixVentePieceChfRaw === undefined ? undefined : round2(prixVentePieceChfRaw);
  const mainOeuvreChf = mainOeuvreChfRaw === undefined ? undefined : round2(mainOeuvreChfRaw);
  const swissTotals = hasSwissPrice
    ? computePriceBookTotals(prixVentePieceChf ?? 0, mainOeuvreChf ?? 0, prixAchatChf ?? 0)
    : undefined;
  const now = todayIso();
  const notesParts: string[] = [];
  if (input.notes) notesParts.push(input.notes);
  if (!prixAchatRaw) notesParts.push("prix achat à vérifier");

  const created: PriceBookItem = {
    id: input.id ?? newId(),
    source: normalizeSource(input.source ?? "manual"),
    typeAppareil: normalizeDeviceType(input.typeAppareil),
    marque: String(input.marque || "").trim(),
    modele: String(input.modele || "").trim(),
    modeleNormalise:
      input.modeleNormalise ||
      String(input.modele || "")
        .trim()
        .toLowerCase(),
    reparation: String(input.reparation || "").trim(),
    piece: String(input.piece || "").trim(),
    qualite: String(input.qualite || "Standard").trim(),
    sku: input.sku ? String(input.sku).trim() : undefined,
    prixAchat,
    mainOeuvre,
    prixVentePiece,
    prixClientTotal: totals.prixClientTotal,
    marge: totals.marge,
    margePourcentage: totals.margePourcentage,
    prixAchatChf,
    mainOeuvreChf,
    prixVentePieceChf,
    prixClientTotalChf: swissTotals?.prixClientTotal,
    margeChf: swissTotals?.marge,
    margePourcentageChf: swissTotals?.margePourcentage,
    fournisseur: input.fournisseur ? String(input.fournisseur).trim() : undefined,
    stockDisponible:
      input.stockDisponible === undefined || input.stockDisponible === null
        ? undefined
        : toNumber(input.stockDisponible),
    stockItemId: input.stockItemId,
    garantie: input.garantie ? String(input.garantie).trim() : undefined,
    notes: notesParts.length ? notesParts.join(" — ") : undefined,
    isActive: input.isActive ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  // P0: on force la structure propre lors de la création (import / manuel inclus).
  return normalizePriceBookStructure(created).item;
};

export const updatePriceBookItem = (current: PriceBookItem, patch: Partial<PriceBookItem>): PriceBookItem => {
  const next = { ...current, ...patch };
  const prixAchat = round2(toNumber(next.prixAchat));
  const prixVentePiece = round2(toNumber(next.prixVentePiece));
  const mainOeuvre = round2(toNumber(next.mainOeuvre));
  const totals = computePriceBookTotals(prixVentePiece, mainOeuvre, prixAchat);
  const prixAchatChf = toOptionalNumber(next.prixAchatChf);
  const prixVentePieceChf = toOptionalNumber(next.prixVentePieceChf);
  const mainOeuvreChf = toOptionalNumber(next.mainOeuvreChf);
  const hasSwissPrice =
    prixAchatChf !== undefined || prixVentePieceChf !== undefined || mainOeuvreChf !== undefined;
  const swissTotals = hasSwissPrice
    ? computePriceBookTotals(prixVentePieceChf ?? 0, mainOeuvreChf ?? 0, prixAchatChf ?? 0)
    : undefined;
  return {
    ...next,
    prixAchat,
    prixVentePiece,
    mainOeuvre,
    ...totals,
    prixAchatChf: prixAchatChf === undefined ? undefined : round2(prixAchatChf),
    prixVentePieceChf: prixVentePieceChf === undefined ? undefined : round2(prixVentePieceChf),
    mainOeuvreChf: mainOeuvreChf === undefined ? undefined : round2(mainOeuvreChf),
    prixClientTotalChf: swissTotals?.prixClientTotal,
    margeChf: swissTotals?.marge,
    margePourcentageChf: swissTotals?.margePourcentage,
    updatedAt: todayIso(),
  };
};

export const normalizePriceBookItem = (raw: unknown): PriceBookItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PriceBookItem>;
  if (!r.marque || !r.modele || !r.reparation) return null;
  const created = createPriceBookItem({
    ...r,
    marque: r.marque,
    modele: r.modele,
    reparation: r.reparation,
    piece: r.piece ?? "",
    qualite: r.qualite ?? "Standard",
    id: r.id,
    createdAt: r.createdAt,
    isActive: r.isActive ?? true,
    source: r.source,
  });
  // `createPriceBookItem` applique déjà la normalisation P0.
  // Mais on garde le comportement explicite si des vieux items n'ont pas l'update.
  return normalizePriceBookStructure(created).item;
};

// Clé de doublon : marque + modele + reparation + qualite + sku
export const priceBookDuplicateKey = (
  item: Pick<PriceBookItem, "typeAppareil" | "marque" | "modele" | "reparation" | "sku">,
) =>
  [
    item.typeAppareil.trim().toLowerCase(),
    item.marque.trim().toLowerCase(),
    item.modele.trim().toLowerCase(),
    item.reparation.trim().toLowerCase(),
    (item.sku ?? "").trim().toLowerCase(),
  ].join("|");

export const formatEuroPriceBook = (value: number, currency: "EUR" | "CHF" = "EUR") =>
  new Intl.NumberFormat(currency === "CHF" ? "fr-CH" : "fr-FR", {
    style: "currency",
    currency,
    currencyDisplay: currency === "CHF" ? "code" : "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const SOURCE_PRIORITY: Record<PriceBookSource, number> = {
  manual: 4,
  workshop_import: 3,
  preloaded: 2,
  behar_example: 1,
};

export const getBestPriceBookItem = (items: PriceBookItem[]): PriceBookItem | undefined => {
  if (items.length === 0) return undefined;

  return [...items].sort((a, b) => {
    // Préférer une pièce réellement en stock : un tarif posé sur une pièce à 0 en
    // stock ne doit pas masquer le prix de la pièce disponible (cohérence avec les
    // paramètres prix — ex. un écran disponible plutôt qu'un doublon à 0 en stock).
    const aInStock = (a.stockDisponible ?? 0) > 0 ? 1 : 0;
    const bInStock = (b.stockDisponible ?? 0) > 0 ? 1 : 0;
    if (aInStock !== bInStock) return bInStock - aInStock;
    const priorityDiff = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })[0];
};

/**
 * Nettoie le nom du modèle pour retirer les suffixes liés aux technologies d'écran ou variantes.
 */
export const normalizeDeviceModel = (rawModel: string): string => {
  if (!rawModel) return "";
  let clean = rawModel;
  const suffixes = [
    /\(LTPS\)/gi,
    /\(Ti\)/gi,
    /120Hz/gi,
    /120 Hz/gi,
    /Haute Capacit[eé]/gi,
    /OLED/gi,
    /LCD/gi,
    /Incell/gi,
    /Service Pack/gi,
    /\bBlanc\b/gi,
    /\bNoir\b/gi,
    /\bBleu\b/gi,
    /\bRouge\b/gi,
    /\bVert\b/gi,
    /\bJaune\b/gi,
    /\bLarge Hole\b/gi,
    /\bSmall Hole\b/gi,
    /\bPulled\b/gi,
    /\bPulled\s*[ABC]\b/gi,
  ];
  for (const regex of suffixes) {
    clean = clean.replace(regex, "");
  }
  return clean.replace(/\s+/g, " ").trim();
};

/**
 * Combine la qualité de l'item avec les variantes extraites du nom du modèle.
 */
export const extractPartQuality = (item: PriceBookItem): string => {
  const qualities = [];
  if (item.qualite && item.qualite.trim()) {
    qualities.push(item.qualite.trim());
  }
  const rawModel = item.modele || "";

  if (/\(LTPS\)/i.test(rawModel)) qualities.push("LTPS");
  if (/\(Ti\)/i.test(rawModel)) qualities.push("Ti");
  if (/120Hz|120 Hz/i.test(rawModel)) qualities.push("120Hz");
  if (/Haute Capacit[eé]/i.test(rawModel)) qualities.push("Haute Capacité");
  if (/\bOLED\b/i.test(rawModel) && !qualities.some((q) => /OLED/i.test(q))) qualities.push("OLED");
  if (/\bLCD\b/i.test(rawModel) && !qualities.some((q) => /LCD/i.test(q))) qualities.push("LCD");
  if (/\bIncell\b/i.test(rawModel) && !qualities.some((q) => /Incell/i.test(q))) qualities.push("Incell");
  if (/Service Pack/i.test(rawModel) && !qualities.some((q) => /Service Pack/i.test(q))) qualities.push("Service Pack");

  // Couleurs et variantes physiques
  const extraTokens = ["Blanc", "Noir", "Bleu", "Rouge", "Vert", "Jaune", "Large Hole", "Small Hole", "Pulled"];
  for (const token of extraTokens) {
    const re = new RegExp(`\\b${token}\\b`, "i");
    if (re.test(rawModel) && !qualities.some((q) => q.toLowerCase().includes(token.toLowerCase()))) {
      qualities.push(token);
    }
  }

  if (qualities.length === 0) return "Standard";

  // Dédoublonnage simple
  return Array.from(new Set(qualities)).join(" / ");
};

// Jeu d'exemples démo Behar Tech (source = behar_example, jamais prioritaires).
// Aligné avec les scénarios du brief : prix achat / vente / MO / client conseillé.
export const seedPriceBookExamples = (): PriceBookItem[] => {
  const examples: Array<Omit<PriceBookInput, "source">> = [
    // Apple iPhone 13
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 13",
      reparation: "Écran",
      piece: "Écran iPhone 13",
      qualite: "Standard",
      sku: "DEMO-IP13-SCR",
      prixAchat: 45,
      prixVentePiece: 99,
      mainOeuvre: 30,
      garantie: "6 mois",
    },
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 13",
      reparation: "Batterie",
      piece: "Batterie iPhone 13",
      qualite: "Standard",
      sku: "DEMO-IP13-BAT",
      prixAchat: 18,
      prixVentePiece: 44,
      mainOeuvre: 25,
      garantie: "6 mois",
    },
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 13",
      reparation: "Connecteur de charge",
      piece: "Connecteur de charge iPhone 13",
      qualite: "Standard",
      sku: "DEMO-IP13-CHG",
      prixAchat: 15,
      prixVentePiece: 44,
      mainOeuvre: 35,
    },
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 13",
      reparation: "Caméra arrière",
      piece: "Caméra arrière iPhone 13",
      qualite: "Standard",
      sku: "DEMO-IP13-CAM",
      prixAchat: 35,
      prixVentePiece: 59,
      mainOeuvre: 30,
    },
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 13",
      reparation: "Diagnostic",
      piece: "Diagnostic atelier",
      qualite: "Atelier",
      prixAchat: 0,
      prixVentePiece: 0,
      mainOeuvre: 29,
    },

    // Apple iPhone 12
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 12",
      reparation: "Écran",
      piece: "Écran iPhone 12",
      qualite: "Standard",
      sku: "DEMO-IP12-SCR",
      prixAchat: 40,
      prixVentePiece: 89,
      mainOeuvre: 30,
    },
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 12",
      reparation: "Batterie",
      piece: "Batterie iPhone 12",
      qualite: "Standard",
      sku: "DEMO-IP12-BAT",
      prixAchat: 18,
      prixVentePiece: 44,
      mainOeuvre: 25,
    },
    {
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 12",
      reparation: "Connecteur de charge",
      piece: "Connecteur de charge iPhone 12",
      qualite: "Standard",
      sku: "DEMO-IP12-CHG",
      prixAchat: 15,
      prixVentePiece: 44,
      mainOeuvre: 35,
    },

    // Samsung Galaxy A52
    {
      typeAppareil: "smartphone",
      marque: "Samsung",
      modele: "Galaxy A52",
      reparation: "Écran",
      piece: "Écran Galaxy A52",
      qualite: "Standard",
      sku: "DEMO-A52-SCR",
      prixAchat: 38,
      prixVentePiece: 69,
      mainOeuvre: 30,
    },
    {
      typeAppareil: "smartphone",
      marque: "Samsung",
      modele: "Galaxy A52",
      reparation: "Batterie",
      piece: "Batterie Galaxy A52",
      qualite: "Standard",
      sku: "DEMO-A52-BAT",
      prixAchat: 16,
      prixVentePiece: 34,
      mainOeuvre: 25,
    },
    {
      typeAppareil: "smartphone",
      marque: "Samsung",
      modele: "Galaxy A52",
      reparation: "Connecteur de charge",
      piece: "Connecteur de charge Galaxy A52",
      qualite: "Standard",
      sku: "DEMO-A52-CHG",
      prixAchat: 12,
      prixVentePiece: 44,
      mainOeuvre: 35,
    },
    {
      typeAppareil: "smartphone",
      marque: "Samsung",
      modele: "Galaxy A52",
      reparation: "Diagnostic",
      piece: "Diagnostic atelier",
      qualite: "Atelier",
      prixAchat: 0,
      prixVentePiece: 0,
      mainOeuvre: 29,
    },

    // Sony PlayStation 5
    {
      typeAppareil: "console",
      marque: "Sony",
      modele: "PlayStation 5",
      reparation: "Port HDMI",
      piece: "Port HDMI PS5",
      qualite: "Standard",
      sku: "DEMO-PS5-HDMI",
      prixAchat: 12,
      prixVentePiece: 39,
      mainOeuvre: 80,
    },
    {
      typeAppareil: "console",
      marque: "Sony",
      modele: "PlayStation 5",
      reparation: "Nettoyage complet",
      piece: "Nettoyage atelier",
      qualite: "Atelier",
      prixAchat: 0,
      prixVentePiece: 0,
      mainOeuvre: 49,
    },
    {
      typeAppareil: "console",
      marque: "Sony",
      modele: "PlayStation 5",
      reparation: "Diagnostic",
      piece: "Diagnostic atelier",
      qualite: "Atelier",
      prixAchat: 0,
      prixVentePiece: 0,
      mainOeuvre: 29,
    },

    // Apple MacBook Air
    {
      typeAppareil: "computer",
      marque: "Apple",
      modele: "MacBook Air",
      reparation: "Diagnostic alimentation",
      piece: "Diagnostic atelier",
      qualite: "Atelier",
      prixAchat: 0,
      prixVentePiece: 0,
      mainOeuvre: 49,
    },
    {
      typeAppareil: "computer",
      marque: "Apple",
      modele: "MacBook Air",
      reparation: "Batterie",
      piece: "Batterie MacBook Air",
      qualite: "Standard",
      sku: "DEMO-MBA-BAT",
      prixAchat: 70,
      prixVentePiece: 84,
      mainOeuvre: 45,
    },
    {
      typeAppareil: "computer",
      marque: "Apple",
      modele: "MacBook Air",
      reparation: "Nettoyage interne",
      piece: "Nettoyage atelier",
      qualite: "Atelier",
      prixAchat: 0,
      prixVentePiece: 0,
      mainOeuvre: 59,
    },
  ];

  return examples.map((entry) =>
    createPriceBookItem({
      ...entry,
      source: "behar_example",
    }),
  );
};

/**
 * Filtre le catalogue par type / marque / modèle, puis par mots de l’intervention.
 * Ne bloque jamais : si aucun score avec l’intervention, renvoie quand même le pool filtré appareil (pour choix qualité).
 */
export function findCatalogMatches(
  items: PriceBookItem[],
  params: {
    typeAppareil: PriceBookDeviceType;
    marque: string;
    modele: string;
    interventionHint: string;
  },
): PriceBookItem[] {
  const marque = stripDiacritics(params.marque.trim().toLowerCase());
  const modele = normalizeDeviceModel(params.modele).toLowerCase();
  const hint = stripDiacritics(params.interventionHint.trim().toLowerCase());

  const active = items.filter((i) => i.isActive !== false && i.typeAppareil === params.typeAppareil);

  let pool = active;
  if (marque) {
    pool = pool.filter(
      (i) =>
        stripDiacritics(i.marque.toLowerCase()) === marque ||
        stripDiacritics(i.marque.toLowerCase()).includes(marque) ||
        marque.includes(stripDiacritics(i.marque.toLowerCase())),
    );
  }

  if (modele.length >= 2) {
    pool = pool.filter((i) => {
      const im = normalizeDeviceModel(i.modele).toLowerCase();
      return im === modele || im.includes(modele) || modele.includes(im);
    });
  }

  if (!hint) return pool;

  const hayScore = (i: PriceBookItem) => {
    const hay = stripDiacritics(`${i.reparation} ${i.piece}`.toLowerCase());
    let s = 0;
    const words = hint.split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words) {
      if (hay.includes(w)) s += 3;
    }
    if (hay.includes(hint)) s += 10;
    return s;
  };

  const scored = pool
    .map((i) => ({ item: i, score: hayScore(i) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return scored.map((x) => x.item);
  return pool;
}

export function groupCatalogByQualityLabel(items: PriceBookItem[]): Map<string, PriceBookItem[]> {
  const m = new Map<string, PriceBookItem[]>();
  for (const item of items) {
    const q = extractPartQuality(item);
    const arr = m.get(q) ?? [];
    arr.push(item);
    m.set(q, arr);
  }
  return m;
}
