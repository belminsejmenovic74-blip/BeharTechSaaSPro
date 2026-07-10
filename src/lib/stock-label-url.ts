"use client";

import { normalizePartReference } from "@/lib/stock-reference";

export function buildScannedPartPath(reference: string) {
  const cleanReference = normalizePartReference(reference);
  return `/piece/${encodeURIComponent(cleanReference || reference.trim())}`;
}

export function buildScannedPartUrl(reference: string) {
  const path = buildScannedPartPath(reference);
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}
