import type { Repair, WorkshopSettings } from "./behar-store";
import { printRepairQr } from "./documents/document-actions";

export async function printRepairTrackingQr(
  repair: Repair,
  _settings: WorkshopSettings,
  format: "A4" | "A6" | "80mm" | "58mm" = "80mm",
  _showCopyLink = true,
) {
  if (!printRepairQr(repair.id, { format })) {
    throw new Error("Impossible d'ouvrir la page d'impression QR.");
  }
}
