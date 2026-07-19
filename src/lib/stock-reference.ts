const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type StockReferenceCarrier = {
  id?: string;
  sku?: string;
  reference?: string;
  internalCode?: string;
  legacyReferences?: string[];
  ean?: string;
  name?: string;
  displayName?: string;
  rawName?: string;
  scanToken?: string;
  scanEnabled?: boolean;
};

/** Clé de comparaison : espaces, tirets, casse et accents sont ignorés. */
export function normalizePartReference(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function uniqueText(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    const key = normalizePartReference(text);
    if (!text || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

export function stockReferenceKeys(item: StockReferenceCarrier): string[] {
  return uniqueText([item.internalCode, item.sku, item.reference, item.ean, ...(item.legacyReferences ?? [])]).map(
    normalizePartReference,
  );
}

export function stockReferenceMatches(item: StockReferenceCarrier, query: unknown): boolean {
  const key = normalizePartReference(query);
  return Boolean(key && stockReferenceKeys(item).includes(key));
}

export function stockScanTokenMatches(item: StockReferenceCarrier, token: unknown): boolean {
  return item.scanEnabled !== false && Boolean(item.scanToken && item.scanToken === String(token ?? "").trim());
}

function searchable(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Service central de résolution utilisé par le QR et la saisie Atelier.
 * Ordre strict : token opaque, référence/SKU/EAN/alias, puis nom (si demandé).
 */
export function resolveStockItem<T extends StockReferenceCarrier>(
  items: readonly T[],
  input: unknown,
  options: { allowName?: boolean; includeDisabledScanToken?: boolean } = {},
): T | undefined {
  const raw = String(input ?? "").trim();
  if (!raw) return undefined;

  const tokenMatch = items.find((item) =>
    options.includeDisabledScanToken
      ? Boolean(item.scanToken && item.scanToken === raw)
      : stockScanTokenMatches(item, raw),
  );
  if (tokenMatch) return tokenMatch;

  const referenceMatch = items.find((item) => stockReferenceMatches(item, raw));
  if (referenceMatch || !options.allowName) return referenceMatch;

  const query = searchable(raw);
  if (!query) return undefined;
  return items.find((item) =>
    [item.displayName, item.name, item.rawName].some((value) => searchable(value).includes(query)),
  );
}

/** Référence courte imprimée ; le SKU fournisseur reste un alias de recherche. */
export function stockPrimaryReference(item: StockReferenceCarrier): string {
  return item.internalCode?.trim() || item.sku?.trim() || item.reference?.trim() || "";
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Référence stable pour les anciennes pièces dépourvues de code interne. */
export function stableShortStockReference(id: string): string {
  const hash = stableHash(id || "stock")
    .toString(36)
    .toUpperCase()
    .padStart(7, "0")
    .slice(-7);
  return `PCE-${hash.slice(0, 4)}-${hash.slice(4)}`;
}

export function generateStockScanToken(length = 22): string {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  let token = "sp_";
  for (const byte of bytes) token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
  return token;
}

export function mergeLegacyReferences(
  item: StockReferenceCarrier,
  next: Pick<StockReferenceCarrier, "sku" | "reference" | "internalCode">,
): string[] {
  return uniqueText([...(item.legacyReferences ?? []), item.sku, item.reference, item.internalCode]).filter(
    (value) =>
      ![next.sku, next.reference, next.internalCode].some(
        (current) => normalizePartReference(current) === normalizePartReference(value),
      ),
  );
}
