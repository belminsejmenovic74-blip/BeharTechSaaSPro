import type { Repair } from "@/lib/behar-store";

const cleanDevicePart = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

export function formatBrandModel(brandValue: unknown, modelValue: unknown, fallback = "Appareil"): string {
  const brand = cleanDevicePart(brandValue);
  const model = cleanDevicePart(modelValue);
  if (!brand && !model) return fallback;
  if (!brand) return model;
  if (!model) return brand;
  if (model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return `${brand} ${model}`;
}

/**
 * Combine la marque et le modèle d'un appareil en évitant les doublons :
 * - brand = "Apple", model = "iPhone 13"            → "Apple iPhone 13"
 * - brand = "Apple", model = "Apple iPhone 13 mini" → "Apple iPhone 13 mini"
 *   (on ne préfixe pas une 2e fois la marque)
 * - brand = "", model = "iPhone 13"                 → "iPhone 13"
 * - brand = "Apple", model = ""                     → "Apple"
 * - tout vide                                       → repair.device ou "Appareil"
 *
 * La fonction est case-insensitive et tolère les espaces parasites.
 */
export function formatDeviceLabel(
  source: Pick<Repair, "brandName" | "deviceModel" | "model" | "device"> | null | undefined,
  fallback = "Appareil",
): string {
  if (!source) return fallback;
  const brand = cleanDevicePart(source.brandName);
  const model = cleanDevicePart(source.deviceModel || source.model);
  if (!brand && !model) return cleanDevicePart(source.device) || fallback;
  return formatBrandModel(brand, model, fallback);
}
