import {
  DEVICE_STATUS_LABEL,
  pipelineStage,
  type PipelineStage,
  type ReconditioningFile,
} from "@/lib/reconditioning-store";
import { canMarkReadyForSale, canMarkSold, isDeviceComplete } from "@/lib/reconditioning-validation";

export type ReconditioningActionId =
  | "complete"
  | "open"
  | "send_to_workshop"
  | "add_part"
  | "mark_ready"
  | "mark_sold"
  | "view_sale"
  | "view_block";

export type ReconditioningDeviceAction = {
  id: ReconditioningActionId;
  label: string;
};

export function getEffectiveDeviceStatus(device: ReconditioningFile): string {
  if (!isDeviceComplete(device)) return "À compléter";
  return DEVICE_STATUS_LABEL[device.status] ?? device.status;
}

export function getDevicePipelineStage(device: ReconditioningFile): PipelineStage | null {
  if (!isDeviceComplete(device)) return "offre";
  return pipelineStage(device.status);
}

export function getNextAvailableActions(device: ReconditioningFile): ReconditioningDeviceAction[] {
  if (!isDeviceComplete(device)) return [{ id: "complete", label: "Compléter" }];

  switch (device.status) {
    case "Brouillon":
      return [{ id: "open", label: "Ouvrir" }];
    case "Acheté":
      return [{ id: "send_to_workshop", label: "Passer en atelier" }];
    case "Évaluation":
    case "Reconditionnement":
    case "En attente pièce":
    case "Tests":
      return [
        { id: "add_part", label: "Ajouter pièce" },
        ...(canMarkReadyForSale(device) ? [{ id: "mark_ready" as const, label: "Prêt à vendre" }] : []),
      ];
    case "Prêt à vendre":
    case "En stock":
      return canMarkSold(device)
        ? [{ id: "mark_sold", label: "Marquer vendu" }]
        : [{ id: "complete", label: "Compléter" }];
    case "Vendu":
      return [{ id: "view_sale", label: "Voir vente" }];
    case "Bloqué":
      return [{ id: "view_block", label: "Voir blocage" }];
    default:
      return [{ id: "open", label: "Ouvrir" }];
  }
}
