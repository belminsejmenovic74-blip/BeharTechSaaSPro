import type { PublicAccess, Repair, WorkshopInfo } from "@/lib/behar-store";

type TrackingRepair = Pick<Repair, "id" | "number" | "createdAt" | "droppedAt" | "publicAccess">;
type TrackingShop = Partial<Pick<WorkshopInfo, "name" | "commercialName" | "brand">>;

export function getPublicAppUrl() {
  if (
    typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_APP_URL
  ) {
    return (import.meta as unknown as { env: Record<string, string> }).env.VITE_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function buildTrackingUrl({ shopSlug, trackingToken }: { shopSlug: string; trackingToken: string }) {
  const baseUrl = getPublicAppUrl();

  if (!trackingToken) {
    throw new Error("[tracking] Missing trackingToken");
  }

  const safeShopSlug = shopSlug || "atelier";

  const url = `${baseUrl}/suivi/${encodeURIComponent(safeShopSlug)}/${encodeURIComponent(trackingToken)}`;
  if (process.env.NODE_ENV === "development") {
    console.log("[tracking] buildTrackingUrl generated:", url);
  }
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
  const existing = repair?.publicAccess?.token?.trim();
  if (existing) return existing;

  const number = repair?.number?.trim();
  if (number && /^BT-\d{4}-\d{5}$/i.test(number)) return number;

  return generateUUID();
}

export function getCustomerTrackingPath(repair: Partial<TrackingRepair>, shop?: TrackingShop | null) {
  return `/suivi/${createShopSlug(shopName(shop))}/${getTrackingCode(repair)}`;
}

export function getCustomerTrackingUrl(repair: Partial<TrackingRepair>, shop?: TrackingShop | null) {
  const shopSlug = shop ? createShopSlug(shopName(shop)) : "atelier";
  const token = getTrackingCode(repair);
  return buildTrackingUrl({ shopSlug, trackingToken: token });
}

export function ensureTrackingCode<T extends Partial<TrackingRepair>>(
  repair: T,
  shop?: TrackingShop | null,
): T & { publicAccess: PublicAccess } {
  const token = getTrackingCode(repair);

  // Si le repair a déjà le même token dans son publicAccess, on le conserve pour ne pas perturber l'URL existante
  const currentAccess = repair.publicAccess;
  const targetUrl = getCustomerTrackingUrl({ ...repair, publicAccess: { ...currentAccess, token } }, shop);

  return {
    ...repair,
    publicAccess: {
      token,
      url: targetUrl,
      createdAt: currentAccess?.createdAt || new Date().toISOString(),
      active: currentAccess?.active !== false,
    },
  } as T & { publicAccess: PublicAccess };
}
