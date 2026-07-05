import { formatMoney } from "@/lib/reconditioning-calc";
import type { ReconditioningFile } from "@/lib/reconditioning-store";

export function safeMoney(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "À compléter" : formatMoney(value);
}

export function safePercent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "À compléter" : `${Math.round(value * 10) / 10} %`;
}

export function getDeviceReference(device: Pick<ReconditioningFile, "number" | "imei" | "serial">): string {
  return device.number || device.imei || device.serial || "Référence à compléter";
}

export function getDeviceOrigin(
  device: Pick<ReconditioningFile, "customerName" | "supplierName" | "source" | "provenance">,
): string {
  return (
    device.customerName ||
    device.supplierName ||
    device.source ||
    (device.provenance === "fournisseur" ? "Fournisseur" : "Client comptoir")
  );
}

export function getDeviceLocation(
  device: Pick<ReconditioningFile, "saleLocation" | "destinationShop" | "status">,
): string {
  return device.saleLocation || (device.status === "Acheté" ? "Stock" : device.destinationShop) || "—";
}

/** IMEI masqué pour l'affichage : 2 premiers + 3 derniers caractères visibles (35***********678). */
export function maskImei(imei: string | undefined | null): string {
  const clean = (imei ?? "").replace(/\s+/g, "");
  if (!clean) return "Non renseigné";
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 2)}${"*".repeat(clean.length - 5)}${clean.slice(-3)}`;
}

/** Durée relative depuis une date ISO (« 2 j 6 h », « 3 h 20 min »). */
export function relativeSinceIso(value: string | undefined | null): string {
  if (!value) return "Non horodaté";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Non horodaté";
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return `${days} j ${hours % 24} h`;
}
