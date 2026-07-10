"use client";

import { CANONICAL_PUBLIC_APP_URL } from "@/lib/customer-tracking";

export const STOCK_APP_URL_ENV = "NEXT_PUBLIC_APP_URL";

export class StockLabelUrlConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockLabelUrlConfigurationError";
  }
}

export function buildScannedPartPath(scanToken: string) {
  const token = scanToken.trim();
  if (!token) throw new StockLabelUrlConfigurationError("Token de scan absent pour cette pièce.");
  const path = `/piece/${encodeURIComponent(token)}`;
  const params = new URLSearchParams({ returnTo: path });
  return `${path}?${params.toString()}`;
}

export function validateStockAppUrl(value: string | undefined): { url: string; error: string } {
  const configured = value?.trim();
  if (!configured) {
    return {
      url: "",
      error: `URL de production absente. Configurez ${STOCK_APP_URL_ENV} avec le domaine HTTPS stable du SaaS.`,
    };
  }

  try {
    const parsed = new URL(configured);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:") {
      return { url: "", error: `${STOCK_APP_URL_ENV} doit utiliser HTTPS.` };
    }
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".vercel.app")
    ) {
      return {
        url: "",
        error: `${STOCK_APP_URL_ENV} doit être le domaine de production stable, jamais localhost ni *.vercel.app.`,
      };
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      return { url: "", error: `${STOCK_APP_URL_ENV} doit être une origine HTTPS sans identifiants ni paramètres.` };
    }
    return { url: parsed.origin, error: "" };
  } catch {
    return { url: "", error: `${STOCK_APP_URL_ENV} n'est pas une URL valide.` };
  }
}

export function getStockLabelUrlConfiguration() {
  // Une étiquette stock est imprimée (permanente) : elle doit TOUJOURS pointer
  // vers le domaine de production stable. On exigeait NEXT_PUBLIC_APP_URL, mais
  // cette variable est souvent absente/mal configurée sur Vercel (ex. ancien
  // domaine .com mort) → la génération d'étiquette plantait (throw) ou pointait
  // vers un domaine mort. On force donc le domaine canonique, exactement comme
  // getPublicAppUrl() pour le suivi client, pour garantir la cohérence.
  return validateStockAppUrl(CANONICAL_PUBLIC_APP_URL);
}

export function buildScannedPartUrl(scanToken: string) {
  const path = buildScannedPartPath(scanToken);
  const configuration = getStockLabelUrlConfiguration();
  if (configuration.error || !configuration.url) {
    console.error("[stock-label] production URL configuration error", {
      code: "STOCK_APP_URL_INVALID",
      env: STOCK_APP_URL_ENV,
    });
    throw new StockLabelUrlConfigurationError(configuration.error);
  }
  return new URL(path, configuration.url).toString();
}

export function safeReturnTo(value: string | null | undefined, fallback = "/dashboard/stock"): string {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const parsed = new URL(candidate, "https://app.invalid");
    if (parsed.origin !== "https://app.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
