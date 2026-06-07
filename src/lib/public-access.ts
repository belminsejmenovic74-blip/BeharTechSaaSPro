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

function publicBaseUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  const origin = browserOrigin();
  if (origin && (!envBase || isLocalPublicBase(envBase))) return origin;
  return envBase || origin;
}

export function publicAbsoluteUrl(relativeUrl: string): string {
  const base = publicBaseUrl();
  if (!relativeUrl) return base;
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
