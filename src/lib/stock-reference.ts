"use client";

type ReferenceCarrier = {
  sku?: string;
  reference?: string;
  internalCode?: string;
};

export function normalizePartReference(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stockReferenceKeys(item: ReferenceCarrier): string[] {
  return Array.from(new Set([item.sku, item.reference, item.internalCode].map(normalizePartReference).filter(Boolean)));
}

export function stockReferenceMatches(item: ReferenceCarrier, query: unknown): boolean {
  const key = normalizePartReference(query);
  return Boolean(key && stockReferenceKeys(item).includes(key));
}

export function stockPrimaryReference(item: ReferenceCarrier): string {
  return item.sku ?? item.reference ?? item.internalCode ?? "";
}
