// stock-parts — liaison LECTURE SEULE entre le stock réel et le module
// Reconditionnement. Sert à retrouver les pièces compatibles avec un modèle
// précis (marque + modèle) et à en récupérer le prix d'achat réel.
//
// IMPORTANT : ce service ne décrémente JAMAIS le stock. La décrémentation se
// fait uniquement dans l'atelier, quand une pièce est réellement posée sur
// l'appareil (reconditioning-store.updatePart → adjustStock).

import type { StockItem } from "@/lib/behar-store";
import {
  isPriceKnown,
  type ModelPartCost,
  type PartCostSource,
  type PartKey,
  type ReconditioningModelPriceRule,
  type RulesSnapshot,
} from "@/lib/reconditioning-pricing";

/* ═══════════════════ Correspondance catégorie pièce ═══════════════════ */

/** Mots-clés de catégorie/nom acceptés pour chaque type de pièce du moteur. */
const PART_CATEGORY_KEYWORDS: Record<PartKey, string[]> = {
  ecran: ["ecran", "display", "lcd", "oled", "amoled"],
  batterie: ["batterie", "battery", "accu"],
  vitreArriere: ["vitre arriere", "dos arriere", "face arriere", "back glass", "backcover", "back cover", "dos"],
  connecteur: ["connecteur", "port de charge", "charging port", "dock"],
  camera: ["camera"],
  hautParleur: ["haut-parleur", "haut parleur", "speaker", "ecouteur interne"],
  micro: ["micro"],
  chassis: ["chassis", "frame", "coque centrale"],
};

/** Tokens qui indiquent une variante PLUS longue d'un modèle (iPhone 11 ≠ iPhone 11 Pro). */
const MODEL_VARIANT_TOKENS = new Set([
  "pro",
  "plus",
  "max",
  "mini",
  "ultra",
  "se",
  "fe",
  "lite",
  "note",
  "edge",
  "air",
]);

const normalize = (value: string | undefined | null): string =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Le nom contient-il exactement ce modèle, sans être une variante plus longue ? */
function nameMatchesModel(name: string, modelName: string): boolean {
  const haystack = normalize(name);
  const needle = normalize(modelName);
  if (!needle) return false;
  let from = 0;
  while (true) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) return false;
    const before = index === 0 ? "" : haystack[index - 1];
    const rest = haystack.slice(index + needle.length).trimStart();
    const nextToken = rest.split(/[\s,;()/-]+/)[0] ?? "";
    const boundaryBefore = before === "" || !/[a-z0-9]/.test(before);
    // « iPhone 11 » ne doit pas matcher « iPhone 11 Pro » ni « iPhone 112 ».
    const boundaryAfter =
      (rest === "" || !/^[a-z0-9]/.test(haystack[index + needle.length] ?? "")) &&
      !MODEL_VARIANT_TOKENS.has(nextToken) &&
      !/^\d/.test(nextToken);
    if (boundaryBefore && boundaryAfter) return true;
    from = index + needle.length;
  }
}

const matchesBrand = (item: StockItem, brandName: string): boolean => {
  if (!item.brandName) return true; // marque non renseignée sur la pièce : on ne bloque pas
  return normalize(item.brandName) === normalize(brandName);
};

const matchesModel = (item: StockItem, modelName: string): boolean => {
  if (!modelName) return false;
  const target = normalize(modelName);
  if ((item.compatibleModels ?? []).some((m) => normalize(m) === target)) return true;
  return nameMatchesModel(item.name, modelName);
};

const matchesPartCategory = (item: StockItem, partKey: PartKey): boolean => {
  const keywords = PART_CATEGORY_KEYWORDS[partKey];
  const category = normalize(item.categoryName || item.category);
  const name = normalize(item.name);
  return keywords.some((keyword) => category.includes(keyword) || name.includes(keyword));
};

const isPartItem = (item: StockItem): boolean =>
  item.active !== false && (item.itemType === "part" || item.productCategory === "Pièces détachées");

/** Pièce du stock compatible avec ce modèle (toutes catégories confondues) — pour l'atelier. */
export const isStockItemCompatibleWithModel = (item: StockItem, brandName: string, modelName: string): boolean =>
  isPartItem(item) && matchesBrand(item, brandName) && matchesModel(item, modelName);

const availableQuantity = (item: StockItem): number =>
  Math.max(0, Number.isFinite(item.stock) ? item.stock : (item.quantity ?? 0));

/* ═══════════════════ Recherche de pièces compatibles ═══════════════════ */

export type CompatibleStockPart = {
  stockItem: StockItem;
  /** Prix d'achat réel, ou null si non renseigné (jamais 0 par défaut). */
  purchasePrice: number | null;
  quantity: number;
  supplier: string | null;
};

/**
 * Pièces du stock compatibles avec CE modèle (marque + modèle + catégorie de pièce).
 * Tri : prix d'achat connu d'abord, puis en stock, puis le moins cher.
 */
export function getCompatibleStockPartsForModel(input: {
  stockItems: StockItem[];
  brandName: string;
  modelName: string;
  partKey: PartKey;
}): CompatibleStockPart[] {
  const { stockItems, brandName, modelName, partKey } = input;
  if (!modelName.trim()) return [];
  return stockItems
    .filter(
      (item) =>
        isPartItem(item) &&
        matchesBrand(item, brandName) &&
        matchesModel(item, modelName) &&
        matchesPartCategory(item, partKey),
    )
    .map((item) => ({
      stockItem: item,
      purchasePrice: isPriceKnown(item.purchasePrice) ? item.purchasePrice : null,
      quantity: availableQuantity(item),
      supplier: item.supplier && item.supplier !== "Non renseigné" ? item.supplier : null,
    }))
    .sort((a, b) => {
      const priceKnown = Number(b.purchasePrice != null) - Number(a.purchasePrice != null);
      if (priceKnown !== 0) return priceKnown;
      const inStock = Number(b.quantity > 0) - Number(a.quantity > 0);
      if (inStock !== 0) return inStock;
      if (a.purchasePrice != null && b.purchasePrice != null && a.purchasePrice !== b.purchasePrice) {
        return a.purchasePrice - b.purchasePrice;
      }
      return (b.stockItem.updatedAt || "").localeCompare(a.stockItem.updatedAt || "");
    });
}

/* ═══════════════════ Résolution du coût d'une pièce ═══════════════════ */

export type ResolvedPartCost = {
  /** Prix pièce retenu — null = « À renseigner » (saisie manuelle requise). */
  piece: number | null;
  /** Main-d'œuvre retenue — null = à renseigner. */
  labor: number | null;
  source: PartCostSource;
  /** Pièce du stock utilisée comme référence, le cas échéant. */
  stockItem: StockItem | null;
  /** Toutes les pièces compatibles trouvées (pour le sélecteur). */
  compatibleParts: CompatibleStockPart[];
  active: boolean;
};

/**
 * Coût effectif d'une pièce pour une reprise, dans cet ordre :
 *  1. règle du modèle avec pièce du stock épinglée → prix d'achat réel (live) ;
 *  2. règle du modèle avec prix manuel connu → manuel ;
 *  3. pièce compatible trouvée dans le stock avec prix d'achat → stock ;
 *  4. barème par défaut avec prix connu → par défaut ;
 *  5. sinon → « À renseigner » (jamais 0 €).
 */
export function resolvePartCostForReconditioning(input: {
  rules: RulesSnapshot;
  ruleItem: ReconditioningModelPriceRule | null;
  partKey: PartKey;
  stockItems: StockItem[];
  brandName: string;
  modelName: string;
}): ResolvedPartCost {
  const { rules, ruleItem, partKey, stockItems, brandName, modelName } = input;
  const compatibleParts = getCompatibleStockPartsForModel({ stockItems, brandName, modelName, partKey });
  const own: ModelPartCost | undefined = ruleItem?.parts?.[partKey];
  const fallback = rules.defaultParts[partKey];
  const laborFallback = own?.labor ?? fallback?.labor ?? null;

  // 1. Pièce du stock épinglée dans la règle → toujours le prix d'achat LIVE du stock.
  if (own?.stockItemId) {
    const pinned = stockItems.find((item) => item.id === own.stockItemId && item.active !== false);
    if (pinned) {
      const livePrice = isPriceKnown(pinned.purchasePrice) ? pinned.purchasePrice : null;
      return {
        piece: livePrice,
        labor: laborFallback,
        source: livePrice != null ? "stock" : "missing",
        stockItem: pinned,
        compatibleParts,
        active: own.active,
      };
    }
  }

  // 2. Prix manuel connu dans la règle du modèle.
  if (own && isPriceKnown(own.piece)) {
    return {
      piece: own.piece,
      labor: laborFallback,
      source: "manual",
      stockItem: null,
      compatibleParts,
      active: own.active,
    };
  }

  // 3. Meilleure pièce compatible du stock avec prix d'achat.
  const bestStock = compatibleParts.find((candidate) => candidate.purchasePrice != null);
  if (bestStock) {
    return {
      piece: bestStock.purchasePrice,
      labor: laborFallback,
      source: "stock",
      stockItem: bestStock.stockItem,
      compatibleParts,
      active: own?.active ?? fallback?.active ?? true,
    };
  }

  // 4. Barème par défaut (affiché comme tel, jamais comme une règle du modèle).
  if (own == null && isPriceKnown(fallback?.piece)) {
    return {
      piece: fallback.piece,
      labor: laborFallback,
      source: "default",
      stockItem: null,
      compatibleParts,
      active: fallback.active,
    };
  }

  // 5. Prix inconnu → saisie manuelle requise.
  return {
    piece: null,
    labor: laborFallback,
    source: "missing",
    stockItem: null,
    compatibleParts,
    active: own?.active ?? fallback?.active ?? true,
  };
}

/** Provenance seule (raccourci pour l'UI). */
export function getPartCostSource(input: Parameters<typeof resolvePartCostForReconditioning>[0]): PartCostSource {
  return resolvePartCostForReconditioning(input).source;
}
