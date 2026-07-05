import { calculateEstimatedMargin as calculateNullableMargin } from "@/lib/reconditioning-calc";
import type { ReconditioningFile } from "@/lib/reconditioning-store";
import { isDeviceComplete } from "@/lib/reconditioning-validation";

export function calculateRepairCost(device: Pick<ReconditioningFile, "parts" | "laborCost">): number {
  const partsTotal = device.parts.reduce((sum, part) => {
    const cost = Number.isFinite(part.cost) ? part.cost : 0;
    const quantity = Number.isFinite(part.quantity) ? part.quantity : 0;
    return sum + cost * quantity;
  }, 0);
  return Math.max(0, Math.round((partsTotal + (device.laborCost ?? 0)) * 100) / 100);
}

export function calculateEstimatedMargin(device: ReconditioningFile): number | null {
  if (!isDeviceComplete(device)) return null;
  return (
    calculateNullableMargin({
      resalePrice: device.prixVentePrevu,
      buyPrice: device.prixAchat,
      partsCost: calculateRepairCost(device),
    })?.amount ?? null
  );
}

export function calculateTotalEstimatedMargin(devices: ReconditioningFile[]): { amount: number; count: number } {
  let amount = 0;
  let count = 0;
  for (const device of devices) {
    if (device.status === "Vendu" || device.status === "Bloqué") continue;
    const margin = calculateEstimatedMargin(device);
    if (margin == null) continue;
    amount += margin;
    count += 1;
  }
  return { amount, count };
}
