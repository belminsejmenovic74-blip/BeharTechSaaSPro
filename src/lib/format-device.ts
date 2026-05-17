import type { Repair } from "@/lib/behar-store";

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
  const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
  const brand = clean(source.brandName);
  const model = clean(source.deviceModel || source.model);
  if (!brand && !model) return clean(source.device) || fallback;
  if (!brand) return model;
  if (!model) return brand;
  if (model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return `${brand} ${model}`;
}
