import type { DeviceBrand as StoreDeviceBrand, DeviceModel as StoreDeviceModel, DeviceType } from "@/lib/behar-store";
import type { ReconditioningModelPriceRule } from "@/lib/reconditioning-pricing";

export type DeviceColorOption = {
  label: string;
};

export type DeviceStorageOption = {
  label: string;
  colors: DeviceColorOption[];
  source: "rule" | "default";
};

export type DeviceCatalogModel = {
  id: string;
  type: DeviceType;
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  storages: DeviceStorageOption[];
};

export type DeviceCatalogBrand = {
  id: string;
  name: string;
  models: DeviceCatalogModel[];
};

export type DeviceCatalogType = {
  type: DeviceType;
  label: string;
  brands: DeviceCatalogBrand[];
};

const DEVICE_TYPE_ORDER: DeviceType[] = ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"];

const DEFAULT_STORAGES_BY_TYPE: Record<DeviceType, string[]> = {
  Smartphone: ["64 Go", "128 Go", "256 Go", "512 Go", "1 To"],
  Tablette: ["64 Go", "128 Go", "256 Go", "512 Go", "1 To"],
  Ordinateur: ["256 Go", "512 Go", "1 To", "2 To"],
  Console: ["512 Go", "1 To", "2 To"],
  Autre: ["Standard"],
};

const DEFAULT_COLORS_BY_TYPE: Record<DeviceType, string[]> = {
  Smartphone: ["Noir", "Blanc", "Bleu", "Rouge", "Violet", "Vert"],
  Tablette: ["Gris", "Argent", "Bleu", "Or"],
  Ordinateur: ["Gris sidéral", "Argent", "Noir"],
  Console: ["Noir", "Blanc"],
  Autre: ["Standard"],
};

const APPLE_IPHONE_COLORS: Record<string, string[]> = {
  "iPhone 13": ["Minuit", "Lumière stellaire", "Bleu", "Rose", "Rouge", "Vert"],
  "iPhone 12": ["Noir", "Blanc", "Bleu", "Vert", "Mauve", "Rouge"],
  "iPhone 11": ["Noir", "Blanc", "Vert", "Jaune", "Mauve", "Rouge"],
};

const storageRank = (storage: string) => {
  const value = Number.parseFloat(storage.replace(",", "."));
  if (!Number.isFinite(value)) return Number.MAX_SAFE_INTEGER;
  return /\bto\b/i.test(storage) ? value * 1024 : value;
};

export const sortStorages = (storages: string[]) =>
  [...new Set(storages.filter(Boolean))].sort((a, b) => storageRank(a) - storageRank(b) || a.localeCompare(b, "fr"));

export function getDeviceColors(input: {
  type: DeviceType;
  brandName: string;
  modelName: string;
}): DeviceColorOption[] {
  const appleColors = APPLE_IPHONE_COLORS[input.modelName];
  const samsungColors =
    input.brandName.toLowerCase() === "samsung" ? ["Phantom Gray", "Noir", "Blanc", "Violet"] : null;
  const colors = appleColors ?? samsungColors ?? DEFAULT_COLORS_BY_TYPE[input.type] ?? DEFAULT_COLORS_BY_TYPE.Autre;
  return colors.map((label) => ({ label }));
}

export function getDeviceStorageOptions(input: {
  type: DeviceType;
  brandName: string;
  modelName: string;
  modelRules: ReconditioningModelPriceRule[];
}): DeviceStorageOption[] {
  const ruleStorages = input.modelRules
    .filter((rule) => rule.brand === input.brandName && rule.model === input.modelName && rule.storage)
    .map((rule) => rule.storage);
  const labels = ruleStorages.length
    ? sortStorages(ruleStorages)
    : (DEFAULT_STORAGES_BY_TYPE[input.type] ?? DEFAULT_STORAGES_BY_TYPE.Autre);
  const colors = getDeviceColors(input);
  return labels.map((label) => ({ label, colors, source: ruleStorages.length ? "rule" : "default" }));
}

/** Modèle du catalogue appareils par id, avec sa marque. */
export function getDeviceModelById(input: {
  deviceBrands: StoreDeviceBrand[];
  deviceModels: StoreDeviceModel[];
  modelId: string;
}): { model: StoreDeviceModel; brand: StoreDeviceBrand } | null {
  const model = input.deviceModels.find((candidate) => candidate.id === input.modelId);
  if (!model) return null;
  const brand = input.deviceBrands.find((candidate) => candidate.id === model.brandId);
  return brand ? { model, brand } : null;
}

export function getDeviceCatalog(input: {
  deviceBrands: StoreDeviceBrand[];
  deviceModels: StoreDeviceModel[];
  modelRules: ReconditioningModelPriceRule[];
  search?: string;
}): DeviceCatalogType[] {
  const q = input.search?.trim().toLowerCase() ?? "";
  const brandById = new Map(input.deviceBrands.map((brand) => [brand.id, brand]));
  const byType = new Map<DeviceType, Map<string, DeviceCatalogBrand>>();

  for (const model of input.deviceModels) {
    if (!model.isActive) continue;
    const brand = brandById.get(model.brandId);
    if (!brand) continue;
    const haystack = `${model.deviceType} ${brand.name} ${model.name}`.toLowerCase();
    if (q && !haystack.includes(q)) continue;

    if (!byType.has(model.deviceType)) byType.set(model.deviceType, new Map());
    const brandsForType = byType.get(model.deviceType)!;
    if (!brandsForType.has(brand.id)) {
      brandsForType.set(brand.id, { id: brand.id, name: brand.name, models: [] });
    }
    brandsForType.get(brand.id)!.models.push({
      id: `${model.deviceType}:${brand.id}:${model.id}`,
      type: model.deviceType,
      brandId: brand.id,
      brandName: brand.name,
      modelId: model.id,
      modelName: model.name,
      storages: getDeviceStorageOptions({
        type: model.deviceType,
        brandName: brand.name,
        modelName: model.name,
        modelRules: input.modelRules,
      }),
    });
  }

  return DEVICE_TYPE_ORDER.map((type) => {
    const brands = [...(byType.get(type)?.values() ?? [])]
      .map((brand) => ({
        ...brand,
        models: [...brand.models].sort((a, b) => a.modelName.localeCompare(b.modelName, "fr")),
      }))
      .filter((brand) => brand.models.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return { type, label: type, brands };
  }).filter((group) => group.brands.length > 0);
}
