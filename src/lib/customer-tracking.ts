import type { PublicAccess, Repair, WorkshopInfo } from "@/lib/behar-store";

type TrackingRepair = Pick<Repair, "id" | "number" | "createdAt" | "droppedAt" | "publicAccess"> & {
  trackingId?: string;
  publicId?: string;
};
type TrackingShop = Partial<Pick<WorkshopInfo, "name" | "commercialName" | "brand">>;

export function normalizeBaseUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = String(url).trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Domaine public STABLE du SaaS. Tous les liens et QR codes partagés au client
// (page de suivi, reçus, factures…) DOIVENT pointer ici, quel que soit l'endroit
// où ils sont générés : production, déploiement « preview » Vercel (xxx.vercel.app),
// ou app desktop. Un QR généré depuis une URL de preview renvoyait un « 404
// NOT_FOUND » Vercel chez le client. On force donc systématiquement ce domaine
// (sauf en dev localhost, où l'on teste le suivi sur la même machine).
export const CANONICAL_PUBLIC_APP_URL = "https://app.behartechpro.fr";

export function getPublicAppUrl() {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const { hostname, origin } = window.location;
    // Dev local uniquement : on conserve l'origine courante (le suivi lit alors
    // le store local du navigateur).
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return normalizeBaseUrl(origin);
    }
  }
  // Production, preview, desktop : toujours le domaine canonique stable.
  return CANONICAL_PUBLIC_APP_URL;
}

export function buildTrackingUrl({ shopSlug, trackingToken }: { shopSlug: string; trackingToken: string }) {
  const cleanId = String(trackingToken || "").trim();
  if (!cleanId) {
    throw new Error("[tracking] Missing trackingToken");
  }

  const safeShopSlug = shopSlug || "atelier";
  const path = `/suivi/${encodeURIComponent(safeShopSlug)}/${encodeURIComponent(cleanId)}`;

  const envBase = getPublicAppUrl();
  if (!envBase) return path;

  return `${envBase}${path}`;
}

function normalizeAscii(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function shopName(shop?: TrackingShop | null) {
  return (shop?.commercialName || shop?.name || shop?.brand || "atelier").trim();
}

export function createShopSlug(name: string) {
  const slug = normalizeAscii(name)
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "atelier";
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 version 4 compliant
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getTrackingCode(repair?: Partial<TrackingRepair> | null) {
  if (!repair) return generateUUID();

  const existing = repair.publicAccess?.token?.trim() || repair.trackingId?.trim() || repair.publicId?.trim();
  if (existing) return existing;

  const number = repair.number?.trim();
  if (number && /^BT-\d{4}-\d{5}$/i.test(number)) return number;

  if (repair.id && repair.id !== "temp") return repair.id;

  return generateUUID();
}

export function getCustomerTrackingPath(repair: Partial<TrackingRepair>, shop?: TrackingShop | null) {
  const token = getTrackingCode(repair);
  const cleanId = String(token || "").trim();
  if (!cleanId) {
    if (process.env.NODE_ENV === "development") {
      throw new Error("Lien de suivi client invalide : dossier absent");
    }
    return "";
  }
  const safeShopSlug = shop ? createShopSlug(shopName(shop)) : "atelier";
  return `/suivi/${encodeURIComponent(safeShopSlug)}/${encodeURIComponent(cleanId)}`;
}

export function getCustomerTrackingUrl(repair: Partial<TrackingRepair>, shop?: TrackingShop | null) {
  const path = getCustomerTrackingPath(repair, shop);
  if (!path) return "";

  const envBase = getPublicAppUrl();
  if (!envBase) return path;

  return `${envBase}${path}`;
}

export function ensureTrackingCode<T extends Partial<TrackingRepair>>(
  repair: T,
  shop?: TrackingShop | null,
): T & { publicAccess: PublicAccess; trackingId: string; publicId: string } {
  const token = getTrackingCode(repair);

  // Si le repair a déjà le même token dans son publicAccess, on le conserve pour ne pas perturber l'URL existante
  const currentAccess = repair.publicAccess;
  const targetUrl = getCustomerTrackingUrl({ ...repair, publicAccess: { ...currentAccess, token } }, shop);

  return {
    ...repair,
    trackingId: token,
    publicId: token,
    publicAccess: {
      token,
      url: targetUrl,
      createdAt: currentAccess?.createdAt || new Date().toISOString(),
      active: currentAccess?.active !== false,
    },
  } as T & { publicAccess: PublicAccess; trackingId: string; publicId: string };
}
