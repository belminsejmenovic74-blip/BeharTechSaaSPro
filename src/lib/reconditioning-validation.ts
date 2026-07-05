import type { ReconditioningFile, ReconditioningStatus } from "@/lib/reconditioning-store";
import { realDeviceImage } from "@/lib/real-product-images";

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const FINAL_FUNCTIONAL_TESTS = [
  "Écran",
  "Face ID / Touch ID",
  "Caméras",
  "Haut-parleurs",
  "Micro",
  "Boutons",
  "Batterie",
  "Charge",
  "Wi-Fi",
  "Bluetooth",
  "Réseau",
  "Capteurs",
] as const;
const FINAL_PHYSICAL_CHECKS = [
  "Rayures",
  "Chocs",
  "Châssis",
  "Vis",
  "Humidité",
  "Écran fissuré",
  "Back glass",
] as const;

export function hasUsableMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getDeviceGrade(device: Pick<ReconditioningFile, "condition" | "cosmeticGrade">): string {
  return device.condition?.grade || device.cosmeticGrade || "";
}

export function isDeviceComplete(
  device: Pick<
    ReconditioningFile,
    "brand" | "model" | "storage" | "condition" | "cosmeticGrade" | "prixAchat" | "prixVentePrevu"
  >,
): boolean {
  return Boolean(
    clean(device.brand) &&
      clean(device.model) &&
      clean(device.storage) &&
      getDeviceGrade(device) &&
      hasUsableMoney(device.prixAchat) &&
      hasUsableMoney(device.prixVentePrevu),
  );
}

export function getDeviceDisplayName(
  device: Pick<
    ReconditioningFile,
    "brand" | "model" | "storage" | "condition" | "cosmeticGrade" | "prixAchat" | "prixVentePrevu"
  >,
): string {
  if (!isDeviceComplete(device)) return "Données à compléter";
  return [device.brand, device.model].map(clean).filter(Boolean).join(" ");
}

export function getDeviceSubtitle(
  device: Pick<
    ReconditioningFile,
    "brand" | "model" | "storage" | "color" | "condition" | "cosmeticGrade" | "prixAchat" | "prixVentePrevu"
  >,
): string {
  if (!isDeviceComplete(device)) return "Complétez modèle, stockage et couleur";
  return [device.storage, device.color].map(clean).filter(Boolean).join(" · ") || "Stockage à compléter";
}

export function canMarkReadyForSale(device: ReconditioningFile): boolean {
  if (!isDeviceComplete(device)) return false;
  if (!canPublishPublicCertificate(device)) return false;
  return ["Évaluation", "Reconditionnement", "En attente pièce", "Tests", "Acheté", "Prêt à vendre"].includes(
    device.status,
  );
}

export function hasFinalDiagnostic(device: ReconditioningFile): boolean {
  const functionalDone = FINAL_FUNCTIONAL_TESTS.every((key) => Boolean(device.functionalTests[key]));
  const physicalDone = FINAL_PHYSICAL_CHECKS.every((key) => Boolean(device.physicalChecks[key]));
  return functionalDone && physicalDone;
}

export function canPublishPublicCertificate(device: ReconditioningFile): boolean {
  return Boolean(
    isDeviceComplete(device) &&
      hasFinalDiagnostic(device) &&
      getDeviceGrade(device) &&
      device.batteryHealth != null &&
      device.batteryHealth >= 0 &&
      device.warrantyMonths > 0 &&
      (device.photos.cote || realDeviceImage(device.brand, device.model, "smartphone")),
  );
}

export function canGenerateSaleLabel(device: ReconditioningFile): boolean {
  return canPublishPublicCertificate(device);
}

export type ReadyForSaleCheck = { label: string; done: boolean };

/**
 * Checklist « Prêt à vendre » : chaque point manquant est affiché à l'atelier
 * et bloque la génération de l'étiquette de vente / du QR public.
 */
export function getReadyForSaleChecklist(device: ReconditioningFile): ReadyForSaleCheck[] {
  return [
    { label: "Modèle renseigné", done: Boolean(clean(device.brand) && clean(device.model)) },
    { label: "Stockage renseigné", done: Boolean(clean(device.storage)) },
    { label: "Couleur renseignée", done: Boolean(clean(device.color)) },
    { label: "Grade final", done: Boolean(getDeviceGrade(device)) },
    { label: "Batterie finale (%)", done: device.batteryHealth != null && device.batteryHealth >= 0 },
    { label: "Prix de vente", done: hasUsableMoney(device.prixVentePrevu) },
    { label: "Garantie (mois)", done: device.warrantyMonths > 0 },
    { label: "Diagnostic final complet", done: hasFinalDiagnostic(device) },
    {
      label: "Photo publique ou image catalogue",
      done: Boolean(device.photos.cote || realDeviceImage(device.brand, device.model, "smartphone")),
    },
  ];
}

export function canMarkSold(device: ReconditioningFile): boolean {
  if (!isDeviceComplete(device)) return false;
  return device.status === "Prêt à vendre" || device.status === "En stock";
}

export function normalizeReconditioningDevice(device: ReconditioningFile): ReconditioningFile {
  if (isDeviceComplete(device)) return device;
  if (device.status === "Vendu" || device.status === "Prêt à vendre" || device.status === "En stock") {
    return { ...device, status: "À compléter" as ReconditioningStatus };
  }
  return device.status === "À compléter" ? device : { ...device, status: "À compléter" as ReconditioningStatus };
}
