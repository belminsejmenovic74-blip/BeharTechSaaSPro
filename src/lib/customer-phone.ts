import type { WorkshopCountry } from "@/lib/behar-store";

const COUNTRY_PREFIX: Record<WorkshopCountry, string> = {
  FR: "33",
  CH: "41",
  autre: "33",
};

/**
 * Convertit les numéros locaux saisis au comptoir vers un format international
 * stable. Les anciens clients en 06… / 079… restent ainsi utilisables pour les
 * SMS et le suivi, quel que soit l'appareil qui recharge le dossier.
 */
export function normalizeCustomerPhone(value: unknown, country: WorkshopCountry): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;

  const prefix = COUNTRY_PREFIX[country];
  if (digits.startsWith(prefix) && digits.length > prefix.length + 6) return `+${digits}`;

  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return national ? `+${prefix}${national}` : "";
}

export function isValidCustomerPhone(value: unknown, country: WorkshopCountry): boolean {
  const normalized = normalizeCustomerPhone(value, country);
  if (!/^\+\d{7,15}$/.test(normalized)) return false;
  if (country === "FR") return /^\+33[1-9]\d{8}$/.test(normalized);
  if (country === "CH") return /^\+41[1-9]\d{8}$/.test(normalized);
  return true;
}
