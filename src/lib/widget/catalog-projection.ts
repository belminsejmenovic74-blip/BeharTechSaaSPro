// Projection catalogue → widget public.
//
// Transforme le VRAI catalogue Behar Tech Pro (`PriceBookItem[]`, source de
// vérité de l'atelier) en entrées publiques du widget. Aucune catégorie,
// marque, modèle ou panne n'est codée en dur : toutes les valeurs proviennent
// des données de l'atelier.
//
// Règles appliquées :
//   * seuls les éléments actifs et activés pour la boutique concernée ;
//   * relations catégorie → marque → modèle → panne → prestation → qualité →
//     pièce → boutique préservées ;
//   * déduplication (variantes de pièce/casse/accents fusionnées, meilleur tarif
//     retenu via getBestPriceBookItem) ;
//   * classement logique + éléments récents/populaires en tête si connus ;
//   * la pièce et le SKU restent internes (jamais exposés), conformément aux
//     invariants de sécurité — ils ne servent qu'aux relations et au dédoublonnage.

import {
  PRICE_BOOK_DEVICE_LABELS,
  getBestPriceBookItem,
  getPriceBookMarketPrice,
  type PriceBookDeviceType,
  type PriceBookItem,
} from "@/lib/price-book";
import type { WorkshopCountry } from "@/lib/workshop-country";

export type WidgetCatalogPrice = {
  mode: "exact" | "from" | "range" | "request" | "hidden";
  amount?: number;
  min?: number;
  max?: number;
  currency?: string;
};

export type WidgetCatalogStock = {
  mode: "hidden" | "simple" | "delay" | "quantity";
  status?: string;
  label?: string;
  quantity?: number;
};

// Entrée telle qu'écrite dans `widget_settings.published_config.catalog`, lue
// ensuite par `publicServices()` côté API publique.
export type WidgetCatalogEntry = {
  publicId: string;
  category: string;
  brand: string;
  model: string;
  issue: string;
  service: string;
  quality?: string;
  price?: WidgetCatalogPrice;
  stock?: WidgetCatalogStock;
  durationMinutes?: number;
  warranty?: string;
  shops?: string[]; // ids publics des boutiques concernées ; absent = toutes
  /** Liaison interne envoyée à l'API sous licence puis supprimée de la projection publique. */
  stockItemIds?: string[];
};

export type ShopMembership = (item: PriceBookItem, shopPublicId: string) => boolean;

export type BuildCatalogOptions = {
  /** Boutiques servies par le widget (ids publics). Vide = boutique unique implicite. */
  shops?: string[];
  /** Un élément est-il activé pour cette boutique ? Défaut : oui pour toutes. */
  isEnabledForShop?: ShopMembership;
  /** Pays de tarification (FR/autre = EUR, CH = CHF). */
  market?: WorkshopCountry;
  /** Granularité de disponibilité publiée. Défaut : « simple » (dispo / sur commande). */
  stockMode?: "simple" | "quantity" | "hidden";
  /** Scores de popularité par valeur (clé repliée) : modèles, pannes ou marques. */
  popularity?: Record<string, number>;
  /** Règles de prix public explicites. Absentes → tout est « sur demande ». */
  priceRules?: PriceRule[];
};

const clean = (value: string): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const fold = (value: string): string => clean(value).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

const round2 = (value: number): number => Math.round(value * 100) / 100;

// Hash stable (FNV-1a 32 bits) → identifiant public opaque et déterministe.
function stableId(key: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `svc_${(hash >>> 0).toString(36)}`;
}

// Clé publique d'un élément : sa relation visible (sans pièce ni SKU internes).
function publicKey(item: PriceBookItem): string {
  return [item.typeAppareil, fold(item.marque), fold(item.modele), fold(item.reparation), fold(item.qualite)].join("|");
}

function isUsable(item: PriceBookItem): boolean {
  return item.isActive !== false && !!clean(item.marque) && !!clean(item.modele) && !!clean(item.reparation);
}

// Choisit une graphie canonique par clé repliée : la plus fréquente, à égalité
// la première rencontrée. Fusionne ainsi « Apple » / « apple » ou « Écran » /
// « ecran ». La clé et la graphie affichée sont fournies séparément pour pouvoir
// canoniser un modèle par (marque, modèle) sans mélanger l'affichage.
function canonicalizer(pairs: Array<{ key: string; display: string }>): (key: string) => string {
  const counts = new Map<string, Map<string, number>>();
  for (const { key, display } of pairs) {
    const value = clean(display);
    if (!key || !value) continue;
    const bucket = counts.get(key) ?? new Map<string, number>();
    bucket.set(value, (bucket.get(value) ?? 0) + 1);
    counts.set(key, bucket);
  }
  const chosen = new Map<string, string>();
  for (const [key, bucket] of counts) {
    let best = "";
    let bestCount = -1;
    for (const [display, count] of bucket) {
      if (count > bestCount) {
        best = display;
        bestCount = count;
      }
    }
    chosen.set(key, best);
  }
  return (key: string) => chosen.get(key) ?? "";
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });
}

function definedStock(items: PriceBookItem[]): number | undefined {
  let value: number | undefined;
  for (const item of items) {
    if (typeof item.stockDisponible === "number") value = Math.max(value ?? 0, item.stockDisponible);
  }
  return value;
}

function buildStock(items: PriceBookItem[], mode: "simple" | "quantity" | "hidden"): WidgetCatalogStock | undefined {
  const quantity = definedStock(items);
  if (quantity === undefined) return undefined; // stock non configuré → « à confirmer » côté widget
  if (mode === "hidden") return { mode: "hidden" };
  const status = quantity > 0 ? "available" : "out";
  if (mode === "quantity") return { mode: "quantity", quantity, status };
  return { mode: "simple", status };
}

export type PricePublicationMode = WidgetCatalogPrice["mode"];

export type PriceRuleScope = {
  shop?: string;
  category?: string;
  brand?: string;
  model?: string;
  issue?: string;
  service?: string;
  quality?: string;
};

// Règle de publication de prix configurée par le réparateur. Le mode et, le cas
// échéant, les montants sont EXPLICITES. Sans règle applicable, le prix reste
// « sur demande » — jamais dérivé automatiquement du prix fournisseur.
export type PriceRule = {
  mode: PricePublicationMode;
  scope?: PriceRuleScope;
  amount?: number;
  min?: number;
  max?: number;
  currency?: string;
};

export type PriceContext = {
  shop?: string;
  category: string;
  brand: string;
  model: string;
  issue: string;
  quality: string;
};

const SCOPE_KEYS = ["shop", "category", "brand", "model", "issue", "service", "quality"] as const;

function ruleMatches(rule: PriceRule, ctx: PriceContext): boolean {
  const scope = rule.scope ?? {};
  if (scope.shop !== undefined && scope.shop !== "" && scope.shop !== ctx.shop) return false;
  const soft = (want: string | undefined, have: string) =>
    want === undefined || want === "" || fold(want) === fold(have);
  return (
    soft(scope.category, ctx.category) &&
    soft(scope.brand, ctx.brand) &&
    soft(scope.model, ctx.model) &&
    soft(scope.issue, ctx.issue) &&
    soft(scope.service, ctx.issue) &&
    soft(scope.quality, ctx.quality)
  );
}

function ruleSpecificity(rule: PriceRule): number {
  const scope = rule.scope ?? {};
  return SCOPE_KEYS.filter((key) => scope[key] !== undefined && scope[key] !== "").length;
}

/**
 * Résout le prix PUBLIC d'un service pour une boutique donnée, selon les règles
 * explicites du réparateur (boutique/catégorie/marque/modèle/panne/prestation/
 * qualité). La règle la plus spécifique gagne ; à égalité, la dernière déclarée.
 *
 * - Sans règle applicable → « sur demande » (le réparateur n'a pas rendu le prix public).
 * - Le montant dérivé provient du prix CLIENT publié (vente pièce + main d'œuvre),
 *   jamais du seul prix fournisseur (`prixAchat`).
 */
export function resolvePublicPrice(
  best: PriceBookItem,
  ctx: PriceContext,
  rules: PriceRule[],
  market: WorkshopCountry,
): WidgetCatalogPrice {
  const clientTotal = round2(getPriceBookMarketPrice(best, market).prixClientTotal);
  const matching = rules
    .filter((rule) => ruleMatches(rule, ctx))
    .sort((a, b) => ruleSpecificity(a) - ruleSpecificity(b));
  const rule = matching.length ? matching[matching.length - 1] : undefined;
  const currency = rule?.currency || (market === "CH" ? "CHF" : "EUR");
  if (!rule) return { mode: "request", currency };
  if (rule.mode === "hidden") return { mode: "hidden", currency };
  if (rule.mode === "request") return { mode: "request", currency };
  if (rule.mode === "range") {
    const min = round2(rule.min ?? clientTotal);
    const max = round2(rule.max ?? rule.min ?? clientTotal);
    return min > 0 && max >= min ? { mode: "range", min, max, currency } : { mode: "request", currency };
  }
  const amount = round2(rule.amount ?? clientTotal);
  if (amount <= 0) return { mode: "request", currency };
  return { mode: rule.mode === "from" ? "from" : "exact", amount, currency };
}

/**
 * Construit le catalogue public du widget depuis le catalogue réel de l'atelier.
 * Le résultat alimente `published_config.catalog` à la publication.
 */
export function buildWidgetCatalog(
  priceBook: PriceBookItem[],
  options: BuildCatalogOptions = {},
): WidgetCatalogEntry[] {
  const market = options.market ?? "FR";
  const stockMode = options.stockMode ?? "simple";
  const shops = options.shops ?? [];
  const isEnabled = options.isEnabledForShop ?? (() => true);
  const popularity = options.popularity ?? {};
  const priceRules = options.priceRules ?? [];

  const usable = priceBook.filter(isUsable);

  // Graphies canoniques (dédoublonnage casse/espaces/accents) par dimension.
  const brandCanon = canonicalizer(usable.map((item) => ({ key: fold(item.marque), display: item.marque })));
  const modelCanon = canonicalizer(
    usable.map((item) => ({ key: `${fold(item.marque)}|${fold(item.modele)}`, display: item.modele })),
  );
  const issueCanon = canonicalizer(usable.map((item) => ({ key: fold(item.reparation), display: item.reparation })));
  const qualityCanon = canonicalizer(usable.map((item) => ({ key: fold(item.qualite), display: item.qualite })));
  const canonBrand = (item: PriceBookItem) => brandCanon(fold(item.marque)) || clean(item.marque);
  const canonModel = (item: PriceBookItem) =>
    modelCanon(`${fold(item.marque)}|${fold(item.modele)}`) || clean(item.modele);
  const canonIssue = (item: PriceBookItem) => issueCanon(fold(item.reparation)) || clean(item.reparation);

  // Regroupe par identité publique.
  const groups = new Map<string, PriceBookItem[]>();
  for (const item of usable) {
    const key = publicKey(item);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  const entries: Array<{ entry: WidgetCatalogEntry; recency: number }> = [];
  for (const [key, items] of groups) {
    const enabledShops = shops.length ? shops.filter((shop) => items.some((item) => isEnabled(item, shop))) : [];
    if (shops.length && enabledShops.length === 0) continue; // activé pour aucune boutique

    const best = getBestPriceBookItem(items) ?? items[0];
    const category = PRICE_BOOK_DEVICE_LABELS[best.typeAppareil as PriceBookDeviceType] ?? "Autre";
    const qualityRaw = clean(best.qualite);
    // « Standard » n'apporte rien au client : on ne l'expose pas comme qualité distincte.
    const quality =
      qualityRaw && qualityRaw.toLowerCase() !== "standard"
        ? qualityCanon(fold(best.qualite)) || qualityRaw
        : undefined;
    const warranty = clean(best.garantie ?? "") || undefined;
    const stock = buildStock(items, stockMode);
    const recency = Number.isFinite(Date.parse(best.updatedAt)) ? Date.parse(best.updatedAt) : 0;
    const baseCtx = {
      category,
      brand: canonBrand(best),
      model: canonModel(best),
      issue: canonIssue(best),
      quality: qualityRaw,
    };

    const makeEntry = (price: WidgetCatalogPrice, entryShops?: string[]): WidgetCatalogEntry => ({
      publicId: entryShops?.length ? stableId(`${key}@${[...entryShops].sort().join(",")}`) : stableId(key),
      category,
      brand: baseCtx.brand,
      model: baseCtx.model,
      issue: baseCtx.issue,
      service: baseCtx.issue,
      quality,
      price,
      stock,
      warranty,
      stockItemIds: [...new Set(items.map((item) => item.stockItemId).filter((id): id is string => !!id))],
      ...(entryShops?.length ? { shops: entryShops } : {}),
    });

    if (!shops.length) {
      // Boutique unique implicite : un prix, une entrée.
      entries.push({
        entry: makeEntry(resolvePublicPrice(best, { ...baseCtx, shop: undefined }, priceRules, market)),
        recency,
      });
      continue;
    }

    // Multi-boutiques : le prix peut dépendre de la boutique. On regroupe les
    // boutiques partageant le même prix résolu et on émet une entrée par groupe.
    const byPrice = new Map<string, { price: WidgetCatalogPrice; group: string[] }>();
    for (const shop of enabledShops) {
      const price = resolvePublicPrice(best, { ...baseCtx, shop }, priceRules, market);
      const signature = JSON.stringify(price);
      const bucket = byPrice.get(signature) ?? { price, group: [] };
      bucket.group.push(shop);
      byPrice.set(signature, bucket);
    }
    for (const { price, group } of byPrice.values()) {
      const coversAll = group.length === shops.length;
      entries.push({ entry: makeEntry(price, coversAll ? undefined : group), recency });
    }
  }

  // Rangs pour le classement logique.
  const categoryCount = new Map<string, number>();
  const brandCount = new Map<string, number>();
  const issueCount = new Map<string, number>();
  for (const { entry } of entries) {
    categoryCount.set(entry.category, (categoryCount.get(entry.category) ?? 0) + 1);
    brandCount.set(`${entry.category}|${entry.brand}`, (brandCount.get(`${entry.category}|${entry.brand}`) ?? 0) + 1);
    issueCount.set(entry.issue, (issueCount.get(entry.issue) ?? 0) + 1);
  }
  const score = (value: string) => popularity[fold(value)] ?? 0;

  entries.sort((a, b) => {
    const ae = a.entry;
    const be = b.entry;
    // 1. Catégorie : la plus fournie d'abord.
    const categoryDiff = (categoryCount.get(be.category) ?? 0) - (categoryCount.get(ae.category) ?? 0);
    if (categoryDiff) return categoryDiff;
    if (ae.category !== be.category) return ae.category.localeCompare(be.category, "fr");
    // 2. Marque : populaire, sinon la plus fournie, sinon alpha.
    const brandPop = score(be.brand) - score(ae.brand);
    if (brandPop) return brandPop;
    const brandDiff =
      (brandCount.get(`${be.category}|${be.brand}`) ?? 0) - (brandCount.get(`${ae.category}|${ae.brand}`) ?? 0);
    if (brandDiff) return brandDiff;
    if (ae.brand !== be.brand) return ae.brand.localeCompare(be.brand, "fr");
    // 3. Modèle : populaire, sinon récent, sinon naturel.
    const modelPop = score(be.model) - score(ae.model);
    if (modelPop) return modelPop;
    if (a.recency !== b.recency) return b.recency - a.recency;
    if (ae.model !== be.model) return naturalCompare(ae.model, be.model);
    // 4. Panne : populaire, sinon la plus fréquente, sinon alpha.
    const issuePop = score(be.issue) - score(ae.issue);
    if (issuePop) return issuePop;
    const issueDiff = (issueCount.get(be.issue) ?? 0) - (issueCount.get(ae.issue) ?? 0);
    if (issueDiff) return issueDiff;
    if (ae.issue !== be.issue) return ae.issue.localeCompare(be.issue, "fr");
    // 5. Qualité : prix croissant, puis alpha.
    const priceA = ae.price?.amount ?? Number.POSITIVE_INFINITY;
    const priceB = be.price?.amount ?? Number.POSITIVE_INFINITY;
    if (priceA !== priceB) return priceA - priceB;
    return (ae.quality ?? "").localeCompare(be.quality ?? "", "fr");
  });

  return entries.map(({ entry }) => entry);
}

// Un élément public est-il disponible pour la boutique demandée ?
// (miroir de la logique appliquée côté API publique).
export function isEntryAvailableInShop(entry: Pick<WidgetCatalogEntry, "shops">, shopPublicId?: string): boolean {
  if (!entry.shops || entry.shops.length === 0) return true;
  if (!shopPublicId) return true;
  return entry.shops.includes(shopPublicId);
}
