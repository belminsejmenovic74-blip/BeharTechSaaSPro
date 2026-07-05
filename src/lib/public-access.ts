import QRCode from "qrcode";

const PUBLIC_TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomValues(length: number): Uint8Array {
  const values = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
    return values;
  }
  for (let i = 0; i < length; i += 1) values[i] = Math.floor(Math.random() * 256);
  return values;
}

export function generatePublicToken(prefix: string, length = 16): string {
  const cleanPrefix = prefix.replace(/_$/, "");
  const values = randomValues(length);
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += PUBLIC_TOKEN_ALPHABET[values[i] % PUBLIC_TOKEN_ALPHABET.length];
  }
  return `${cleanPrefix}_${token}`;
}

export function makePublicUrl(basePath: string, token: string): string {
  const cleanPath = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${cleanPath.replace(/\/$/, "")}/${token}`;
}

function isLocalPublicBase(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function browserOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/$/, "");
}

const PUBLIC_URL_ERROR =
  "URL publique non configurée. Renseignez NEXT_PUBLIC_APP_URL ou NEXT_PUBLIC_PUBLIC_BASE_URL avec le domaine public de production.";

function configuredPublicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    process.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.SITE_URL?.replace(/\/$/, "") ||
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ||
    ""
  );
}

import { buildTrackingUrl, getPublicAppUrl } from "@/lib/customer-tracking";

function publicBaseUrl(): { base: string; error: string } {
  const envBase = getPublicAppUrl();
  if (envBase) {
    return { base: envBase, error: "" };
  }

  const origin = browserOrigin();
  return { base: origin || "http://localhost:3000", error: "" };
}

export function getPublicUrlConfigurationError(): string {
  return publicBaseUrl().error;
}

export function publicAbsoluteUrl(relativeUrl: string): string {
  const { base, error } = publicBaseUrl();
  if (error || !base) return "";
  if (!relativeUrl) return base;

  // Intercepter les liens de suivi client pour reconstruire l'adresse avec le domaine dynamique actif
  if ((relativeUrl.includes("/suivi/") && !relativeUrl.startsWith("/suivi/appareil/")) || relativeUrl.includes("/p/")) {
    try {
      const segments = relativeUrl.split("/").filter(Boolean);
      const token = segments.pop() || "";
      const suiviIdx = segments.indexOf("suivi");
      const pIdx = segments.indexOf("p");
      const idx = suiviIdx !== -1 ? suiviIdx : pIdx;
      const shopSlug =
        idx !== -1 && segments[idx + 1] && segments[idx + 1] !== token
          ? decodeURIComponent(segments[idx + 1])
          : "atelier";

      return buildTrackingUrl({ shopSlug, trackingToken: token });
    } catch (e) {
      console.error("[public-access] Failed to rebuild dynamic tracking url:", e);
    }
  }

  if (relativeUrl.startsWith("http")) {
    if (base && typeof window !== "undefined" && isLocalPublicBase(relativeUrl) && !isLocalPublicBase(base)) {
      const url = new URL(relativeUrl);
      return `${base}${url.pathname}${url.search}${url.hash}`;
    }
    return relativeUrl;
  }
  const path = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
  return `${base}${path}`;
}

export function safePublicAbsoluteUrl(relativeUrl: string): { url: string; error: string } {
  const error = getPublicUrlConfigurationError();
  if (error) return { url: "", error };
  const url = publicAbsoluteUrl(relativeUrl);
  return url ? { url, error: "" } : { url: "", error: PUBLIC_URL_ERROR };
}

export async function generateQrCodeDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#1A1916", light: "#FFFFFF" },
  });
}

export function ensurePublicAccessForRepair<T extends { public_token?: string | null; public_url?: string | null }>(
  repair: T,
): T & { public_token: string; public_url: string } {
  const public_token = repair.public_token || generatePublicToken("rp");
  return { ...repair, public_token, public_url: repair.public_url || makePublicUrl("/suivi", public_token) };
}

export function ensurePublicAccessForQuote<T extends { public_token?: string | null; public_url?: string | null }>(
  quote: T,
): T & { public_token: string; public_url: string } {
  const public_token = quote.public_token || generatePublicToken("dv");
  return { ...quote, public_token, public_url: quote.public_url || makePublicUrl("/devis", public_token) };
}

export function ensurePublicAccessForInvoice<T extends { public_token?: string | null; public_url?: string | null }>(
  invoice: T,
): T & { public_token: string; public_url: string } {
  const public_token = invoice.public_token || generatePublicToken("fc");
  return { ...invoice, public_token, public_url: invoice.public_url || makePublicUrl("/facture", public_token) };
}

export function ensurePublicAccessForPayment<T extends { public_token?: string | null; public_url?: string | null }>(
  payment: T,
): T & { public_token: string; public_url: string } {
  const public_token = payment.public_token || generatePublicToken("py");
  return { ...payment, public_token, public_url: payment.public_url || makePublicUrl("/recu", public_token) };
}

export function ensurePublicAccessForSale<T extends { public_token?: string | null; public_url?: string | null }>(
  sale: T,
): T & { public_token: string; public_url: string } {
  const public_token = sale.public_token || generatePublicToken("vt");
  return { ...sale, public_token, public_url: sale.public_url || makePublicUrl("/vente", public_token) };
}

export const generateQrDataUrl = generateQrCodeDataUrl;
