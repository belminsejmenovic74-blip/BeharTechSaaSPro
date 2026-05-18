/**
 * Pont logique entre Stock (inventaire interne) et Catalogue prix
 * (tarifs client). La règle absolue : le module Stock est la source de
 * vérité pour les quantités. Ce module ne contient que des helpers purs.
 */

import type { PriceBookItem } from "@/lib/price-book";

// Type minimal pour ne pas créer de dépendance circulaire avec behar-store.
export type StockItemLite = {
  id: string;
  sku?: string;
  reference?: string;
  name: string;
  brandName?: string;
  compatibleModels: string[];
  categoryName?: string;
  category?: string;
  stock: number;
  quantity: number;
  priceBookItemId?: string;
  salePrice?: number;
  purchasePrice?: number;
  supplier?: string;
};

/**
 * Liste exhaustive des qualités possibles, tous contextes confondus.
 * À utiliser uniquement comme type. Pour afficher la liste dans une UI,
 * utiliser getQualitiesForCategory(category) — la qualité dépend toujours
 * de la catégorie (un écran a OLED/Incell, une caméra a Originale/Compatible).
 */
export const QUALITY_PRESETS = [
  // qualités écran
  "Incell",
  "LCD",
  "TFT",
  "OLED",
  "Hard OLED",
  "Soft OLED",
  // qualités génériques
  "Original",
  "Originale",
  "Original reconditionné",
  "Reconditionnée",
  "Reconditionné",
  "OEM",
  "Premium",
  "Normale",
  "Compatible",
  "Haute capacité",
  "Diagnostic",
  "Standard",
  "Non précisée",
  "Autre",
] as const;

export type QualityPreset = (typeof QUALITY_PRESETS)[number];

/**
 * Qualités contextuelles par catégorie. Règle absolue : "OLED",
 * "Hard OLED", "Soft OLED", "Incell", "TFT" n'existent QUE pour l'écran.
 * Les autres catégories utilisent les variantes génériques (Originale,
 * OEM, Compatible, Premium, etc.).
 *
 * La clé est la version normalisée du nom de catégorie (sans accents,
 * lowercase), pour que la recherche soit robuste aux variations.
 */
const QUALITIES_BY_CATEGORY: Record<string, readonly string[]> = {
  // Écran
  ecran: ["Incell", "LCD", "TFT", "OLED", "Hard OLED", "Soft OLED", "Original", "Original reconditionné", "OEM", "Premium", "Autre"],

  // Batterie
  batterie: ["Normale", "Compatible", "Premium", "Originale", "OEM", "Haute capacité", "Reconditionnée", "Autre"],

  // Caméras
  "camera arriere": ["Normale", "Compatible", "Originale", "OEM", "Reconditionnée", "Premium", "Autre"],
  "camera avant": ["Normale", "Compatible", "Originale", "OEM", "Reconditionnée", "Premium", "Autre"],
  // alias générique "Caméra" sans précision arrière/avant
  camera: ["Normale", "Compatible", "Originale", "OEM", "Reconditionnée", "Premium", "Autre"],

  // Connecteur de charge
  "connecteur de charge": ["Normale", "Compatible", "Originale", "OEM", "Premium", "Autre"],

  // Audio
  "haut-parleur": ["Normale", "Compatible", "Originale", "OEM", "Reconditionné", "Premium", "Autre"],
  micro: ["Normale", "Compatible", "Originale", "OEM", "Reconditionné", "Premium", "Autre"],

  // Boutons
  "bouton power": ["Normale", "Compatible", "Originale", "OEM", "Reconditionné", "Premium", "Autre"],
  "boutons volume": ["Normale", "Compatible", "Originale", "OEM", "Reconditionné", "Premium", "Autre"],

  // Capteurs / biométrie
  "face id / touch id": ["Normale", "Originale", "Reconditionnée", "Diagnostic", "Autre"],
  "face id": ["Normale", "Originale", "Reconditionnée", "Diagnostic", "Autre"],
  "touch id": ["Normale", "Originale", "Reconditionnée", "Diagnostic", "Autre"],

  // SIM
  "lecteur carte sim": ["Normale", "Compatible", "Originale", "OEM", "Autre"],

  // Coque arrière
  "dos arriere": ["Normale", "Compatible", "Original", "Original reconditionné", "OEM", "Premium", "Autre"],
  "vitre arriere": ["Normale", "Compatible", "Original", "Original reconditionné", "OEM", "Premium", "Autre"],

  // Diagnostic (prestation atelier, pas une pièce)
  diagnostic: ["Diagnostic", "Autre"],

  // Mécanique / consommables
  "pate thermique": ["Normale", "Premium", "Autre"],
  joystick: ["Normale", "Compatible", "Originale", "OEM", "Reconditionné", "Premium", "Autre"],
  ventilateur: ["Normale", "Compatible", "Originale", "OEM", "Reconditionné", "Premium", "Autre"],
};

const FALLBACK_QUALITIES: readonly string[] = [
  "Normale",
  "Compatible",
  "Originale",
  "OEM",
  "Premium",
  "Autre",
];

/**
 * Renvoie la liste des qualités valides pour une catégorie donnée.
 * Pour une catégorie inconnue, renvoie la liste générique.
 */
export function getQualitiesForCategory(category: string | undefined | null): readonly string[] {
  const key = normalizeKey(category);
  if (!key) return FALLBACK_QUALITIES;
  return QUALITIES_BY_CATEGORY[key] ?? FALLBACK_QUALITIES;
}

/**
 * Qualité par défaut pour une catégorie donnée.
 * - Écran → "" (forcer un choix explicite, qu'on traduit en UI en
 *   "Choisir une qualité…")
 * - Autres → "Normale"
 */
export function getDefaultQualityForCategory(category: string | undefined | null): string {
  const key = normalizeKey(category);
  if (key === "ecran") return "";
  return "Normale";
}

/**
 * Indique si une qualité est valide pour la catégorie donnée. Utile
 * pour décider d'un reset lorsqu'on change de catégorie : si l'ancienne
 * qualité ("Hard OLED") n'existe pas pour la nouvelle catégorie ("Batterie"),
 * on doit la remplacer par le défaut.
 */
export function isQualityValidForCategory(quality: string, category: string | undefined | null): boolean {
  if (!quality) return true; // chaîne vide = choix non fait, toujours acceptable
  const list = getQualitiesForCategory(category);
  const q = normalizeKey(quality);
  return list.some((item) => normalizeKey(item) === q);
}

/**
 * Normalise une chaîne pour la comparaison : lowercase, sans accents,
 * sans espaces parasites. À utiliser uniquement pour le matching.
 */
export function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Clé logique d'une pièce, basée sur Marque + Modèle + Catégorie + Gamme.
 * Renvoie une string stable utilisable comme identifiant de matching.
 */
export function buildSelectionKey(input: {
  brand?: string;
  model?: string;
  category?: string;
  quality?: string;
}): string {
  return [
    normalizeKey(input.brand),
    normalizeKey(input.model),
    normalizeKey(input.category),
    normalizeKey(input.quality),
  ]
    .filter(Boolean)
    .join("|");
}

/**
 * Suggère un nom de pièce lisible humain à partir de la sélection.
 * Ex: { category: "Écran", model: "iPhone 12", quality: "Hard OLED" }
 *     → "Écran iPhone 12 — Hard OLED"
 */
export function suggestStockName(input: {
  brand?: string;
  model?: string;
  category?: string;
  quality?: string;
}): string {
  const category = (input.category ?? "").trim();
  const model = (input.model ?? "").trim();
  const quality = (input.quality ?? "").trim();
  const main = [category, model].filter(Boolean).join(" ");
  return quality ? `${main} — ${quality}` : main;
}

/**
 * Génère un SKU compact lisible à partir de la sélection.
 * Ex: { brand: "Apple", model: "iPhone 12", category: "Écran", quality: "Hard OLED" }
 *     → "APP-IPH12-ECRAN-HARDOLED"
 */
export function suggestStockSku(input: {
  brand?: string;
  model?: string;
  category?: string;
  quality?: string;
}): string {
  const shortBrand = abbreviateBrand(input.brand ?? "");
  const shortModel = abbreviateModel(input.model ?? "");
  const shortCategory = abbreviateCategory(input.category ?? "");
  const shortQuality = abbreviateQuality(input.quality ?? "");
  return [shortBrand, shortModel, shortCategory, shortQuality]
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

function abbreviateBrand(brand: string): string {
  const map: Record<string, string> = {
    apple: "APP",
    samsung: "SAM",
    xiaomi: "XIA",
    huawei: "HUA",
    google: "GOO",
    oneplus: "OP",
    sony: "SNY",
    honor: "HON",
    oppo: "OPP",
    nokia: "NOK",
    realme: "RM",
  };
  const key = normalizeKey(brand);
  if (map[key]) return map[key];
  return key.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();
}

function abbreviateModel(model: string): string {
  const norm = normalizeKey(model).replace(/^iphone\s*/, "iph").replace(/^galaxy\s*/, "g");
  return norm.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
}

function abbreviateCategory(category: string): string {
  const norm = normalizeKey(category);
  const map: Record<string, string> = {
    ecran: "ECRAN",
    batterie: "BATTERIE",
    "connecteur de charge": "CONNECTEUR-CHARGE",
    camera: "CAMERA",
    "camera arriere": "CAMERA-ARR",
    "camera avant": "CAMERA-AV",
    "haut-parleur": "HP",
    micro: "MICRO",
    "bouton power": "POWER",
    "boutons volume": "VOLUME",
    "vitre arriere": "VITRE-ARR",
    "dos arriere": "DOS-ARR",
    chassis: "CHASSIS",
    "lecteur carte sim": "SIM",
    "face id / touch id": "BIOMETRIE",
    "face id": "FACEID",
    "touch id": "TOUCHID",
    diagnostic: "DIAG",
    joystick: "JOYSTICK",
    ventilateur: "VENTILO",
    "pate thermique": "PATE",
    autre: "AUTRE",
  };
  return map[norm] ?? norm.replace(/\s+/g, "-").replace(/[^a-z0-9-]/gi, "").toUpperCase().slice(0, 16);
}

function abbreviateQuality(quality: string): string {
  const norm = normalizeKey(quality);
  const map: Record<string, string> = {
    // écran
    "hard oled": "HARD-OLED",
    "soft oled": "SOFT-OLED",
    oled: "OLED",
    incell: "INCELL",
    lcd: "LCD",
    tft: "TFT",
    // génériques
    original: "ORIGINAL",
    originale: "ORIGINALE",
    "original reconditionne": "ORIGINAL-RC",
    reconditionne: "RECONDITIONNE",
    reconditionnee: "RECONDITIONNEE",
    oem: "OEM",
    premium: "PREMIUM",
    normale: "NORMALE",
    compatible: "COMPATIBLE",
    "haute capacite": "HAUTE-CAPACITE",
    diagnostic: "DIAG",
    standard: "STANDARD",
    "non precisee": "",
  };
  if (norm in map) return map[norm];
  return norm.replace(/\s+/g, "-").replace(/[^a-z0-9-]/gi, "").toUpperCase().slice(0, 16);
}

/**
 * Cherche dans le stock un item qui correspond à la sélection
 * Marque/Modèle/Catégorie/Gamme. Retourne le premier match plausible.
 */
export function findStockBySelection(
  items: StockItemLite[],
  selection: { brand?: string; model?: string; category?: string; quality?: string; sku?: string },
): StockItemLite | undefined {
  // 1) match SKU exact (le plus fiable)
  const skuKey = normalizeKey(selection.sku);
  if (skuKey) {
    const bySku = items.find(
      (item) => normalizeKey(item.sku) === skuKey || normalizeKey(item.reference) === skuKey,
    );
    if (bySku) return bySku;
  }

  const brandKey = normalizeKey(selection.brand);
  const modelKey = normalizeKey(selection.model);
  const categoryKey = normalizeKey(selection.category);
  const qualityKey = normalizeKey(selection.quality);

  // 2) match Marque + Modèle + Catégorie (+ Gamme dans le nom si présent)
  return items.find((item) => {
    if (brandKey && normalizeKey(item.brandName) !== brandKey) return false;
    if (categoryKey) {
      const itemCategory = normalizeKey(item.categoryName ?? item.category);
      if (itemCategory && itemCategory !== categoryKey) return false;
    }
    if (modelKey) {
      const modelMatch = item.compatibleModels?.some(
        (m) => normalizeKey(m) === modelKey,
      ) || normalizeKey(item.name).includes(modelKey);
      if (!modelMatch) return false;
    }
    if (qualityKey) {
      // La gamme est généralement incluse dans le nom de la pièce.
      const itemName = normalizeKey(item.name);
      if (!itemName.includes(qualityKey)) return false;
    }
    return true;
  });
}

/**
 * Cherche dans le catalogue prix un tarif qui correspond à la sélection.
 */
export function findPriceBookBySelection(
  items: PriceBookItem[],
  selection: { brand?: string; model?: string; category?: string; quality?: string },
): PriceBookItem | undefined {
  const brandKey = normalizeKey(selection.brand);
  const modelKey = normalizeKey(selection.model);
  const categoryKey = normalizeKey(selection.category);
  const qualityKey = normalizeKey(selection.quality);
  return items.find((pb) => {
    if (brandKey && normalizeKey(pb.marque) !== brandKey) return false;
    if (modelKey && normalizeKey(pb.modele) !== modelKey) return false;
    if (categoryKey) {
      const cat = normalizeKey(pb.reparation);
      if (cat !== categoryKey && !cat.includes(categoryKey)) return false;
    }
    if (qualityKey && normalizeKey(pb.qualite) !== qualityKey) return false;
    return true;
  });
}

/**
 * Quantité de stock réelle pour un tarif catalogue donné.
 * Source de vérité = la table StockItem, jamais PriceBookItem.stockDisponible.
 */
export function liveStockForPriceBook(
  pb: PriceBookItem,
  stockItems: StockItemLite[],
): { item: StockItemLite | undefined; quantity: number } {
  // 1) lien direct
  if (pb.stockItemId) {
    const direct = stockItems.find((s) => s.id === pb.stockItemId);
    if (direct) return { item: direct, quantity: direct.stock };
  }
  // 2) lien inverse via priceBookItemId
  const linked = stockItems.find((s) => s.priceBookItemId === pb.id);
  if (linked) return { item: linked, quantity: linked.stock };
  // 3) match par sélection
  const matched = findStockBySelection(stockItems, {
    brand: pb.marque,
    model: pb.modele,
    category: pb.reparation,
    quality: pb.qualite,
    sku: pb.sku,
  });
  return { item: matched, quantity: matched?.stock ?? 0 };
}
