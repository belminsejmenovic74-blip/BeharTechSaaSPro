import type { PublicAccess, Repair, WorkshopInfo } from "@/lib/behar-store";

type TrackingRepair = Pick<Repair, "id" | "number" | "createdAt" | "droppedAt" | "publicAccess"> & {
  trackingId?: string;
  publicId?: string;
};
type TrackingShop = Partial<Pick<WorkshopInfo, "name" | "commercialName" | "brand">>;

export function getPublicAppUrl() {
  // 1. Priorité aux variables d'environnement
  if (
    typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_APP_URL
  ) {
    return (import.meta as unknown as { env: Record<string, string> }).env.VITE_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Fallback sur window.location.origin si exécuté côté navigateur
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  // 3. Fallback stable pour le build / SSR
  return "https://behartechpro.fr";
}

export function buildTrackingUrl({ shopSlug, trackingToken }: { shopSlug: string; trackingToken: string }) {
  const baseUrl = getPublicAppUrl();

  if (!trackingToken) {
    throw new Error("[tracking] Missing trackingToken");
  }

  const safeShopSlug = shopSlug || "atelier";
  const url = `${baseUrl}/suivi/${encodeURIComponent(safeShopSlug)}/${encodeURIComponent(trackingToken)}`;
  
  return url;
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
  return `/suivi/${createShopSlug(shopName(shop))}/${getTrackingCode(repair)}`;
}

export function getCustomerTrackingUrl(repair: Partial<TrackingRepair>, shop?: TrackingShop | null) {
  if (!repair) {
    if (process.env.NODE_ENV === "development") {
      throw new Error("Lien de suivi client invalide : dossier absent");
    }
    return "";
  }

  const token = getTrackingCode(repair);

  if (process.env.NODE_ENV === "development") {
    const baseUrl = getPublicAppUrl();
    const shopSlug = shop ? createShopSlug(shopName(shop)) : "atelier";
    const trackingUrl = token ? `${baseUrl}/suivi/${encodeURIComponent(shopSlug)}/${encodeURIComponent(token)}` : "";

    console.log({
      dossierId: repair.id,
      trackingId: token,
      trackingUrl,
    });

    if (!token) {
      throw new Error("Lien de suivi client invalide : dossier sans trackingId/publicId");
    }
  }

  if (!token) {
    return "";
  }

  const baseUrl = getPublicAppUrl();
  const shopSlug = shop ? createShopSlug(shopName(shop)) : "atelier";
  return `${baseUrl}/suivi/${encodeURIComponent(shopSlug)}/${encodeURIComponent(token)}`;
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
