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
 * Liste préconfigurée des gammes / qualités les plus utilisées par les
 * réparateurs FR. C'est la liste affichée dans les selects "Gamme".
 */
export const QUALITY_PRESETS = [
  "Original",
  "Original reconditionné",
  "OEM",
  "Hard OLED",
  "Soft OLED",
  "OLED",
  "Incell",
  "LCD",
  "TFT",
  "Standard",
] as const;

export type QualityPreset = (typeof QUALITY_PRESETS)[number];

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
    batterie: "BAT",
    "connecteur de charge": "CHARGE",
    "camera arriere": "CAMR",
    "camera avant": "CAMA",
    "haut-parleur": "HP",
    micro: "MIC",
    "bouton power": "POW",
    "boutons volume": "VOL",
    "vitre arriere": "VITR",
    chassis: "CHA",
    autre: "AUT",
  };
  return map[norm] ?? norm.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
}

function abbreviateQuality(quality: string): string {
  const norm = normalizeKey(quality);
  const map: Record<string, string> = {
    original: "ORIG",
    "original reconditionne": "ORIGRC",
    oem: "OEM",
    "hard oled": "HOLED",
    "soft oled": "SOLED",
    oled: "OLED",
    incell: "INCL",
    lcd: "LCD",
    tft: "TFT",
    standard: "STD",
  };
  return map[norm] ?? norm.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8);
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
