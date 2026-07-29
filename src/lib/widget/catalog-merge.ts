// Fusion catalogue global ↔ configuration boutique.
//
// Le catalogue global sert à NAVIGUER (capter la demande) ; la config boutique
// (prestations publiées) vient enrichir prix / durée / qualité / dispo quand
// elle existe. L'absence de configuration ne bloque jamais : on retombe sur
// « Sur devis » / « Estimation personnalisée » et on taggue la demande.

import { fold, sameIssueLabel } from "@/lib/widget/global-catalog";
import type { PublicService } from "@/lib/widget/public-types";

export type IssueRow = {
  issue: string;
  service?: PublicService; // prestation boutique correspondante, si configurée
  configured: boolean;
};

// Prestations boutique disponibles pour le modèle sélectionné (tolérant).
export function shopServicesForModel(shopServices: PublicService[], model: string): PublicService[] {
  const target = fold(model);
  if (!target) return [];
  return shopServices.filter((service) => {
    const candidate = fold(service.model);
    return candidate === target || candidate.includes(target) || target.includes(candidate);
  });
}

// Associe chaque panne globale à sa prestation boutique (si configurée).
export function mergeIssues(globalIssues: string[], shopServices: PublicService[]): IssueRow[] {
  const rows: IssueRow[] = globalIssues.map((issue) => {
    const service = shopServices.find((entry) => sameIssueLabel(entry.issue, issue));
    return { issue, service, configured: Boolean(service) };
  });
  // Pannes configurées en boutique mais absentes de la liste globale : on les ajoute.
  for (const service of shopServices) {
    if (!rows.some((row) => sameIssueLabel(row.issue, service.issue))) {
      rows.push({ issue: service.issue, service, configured: true });
    }
  }
  return rows;
}

export function bestServiceForIssue(shopServices: PublicService[], issue: string): PublicService | undefined {
  return shopServices.find((service) => sameIssueLabel(service.issue, issue));
}

export type LeadTagInput = {
  /** Le modèle provient du catalogue global (false = saisie manuelle libre). */
  modelInGlobalCatalog: boolean;
  /** La boutique a au moins une prestation configurée pour ce modèle. */
  modelConfigured: boolean;
  /** Pour chaque panne retenue : est-elle configurée en boutique ? */
  selectedIssuesConfigured: boolean[];
};

// Tags posés sur la demande pour l'admin (traitement hors catalogue).
export function computeLeadTags(input: LeadTagInput): string[] {
  const anyIssueUnconfigured =
    input.selectedIssuesConfigured.length === 0 || input.selectedIssuesConfigured.some((configured) => !configured);
  const tags: string[] = [];
  if (!input.modelConfigured) tags.push("modèle_non_configuré");
  if (anyIssueUnconfigured) tags.push("panne_non_configurée");
  if (!input.modelInGlobalCatalog) tags.push("demande_hors_catalogue");
  if (!input.modelConfigured || anyIssueUnconfigured) tags.push("devis_manuel_à_traiter");
  return [...new Set(tags)];
}

// Message rassurant et commercial (jamais technique) pour les cas non configurés.
export function reassuranceText(kind: "model" | "issue" | "generic" | "confirm"): string {
  switch (kind) {
    case "model":
      return "Vous pouvez continuer votre demande.";
    case "issue":
      return "Cette panne sera traitée sur devis personnalisé.";
    case "confirm":
      return "Votre atelier peut confirmer le prix après vérification.";
    default:
      return "Nous reviendrons vers vous avec une estimation adaptée.";
  }
}

// Libellé de prix à afficher : le prix boutique s'il existe, sinon un état
// commercial rassurant.
export function displayPriceLabel(service: PublicService | undefined, hasAnyPrice: boolean): string {
  if (service?.price && service.price.mode === "exact" && typeof service.price.amount === "number") {
    return `${service.price.amount} ${service.price.currency || "€"}`;
  }
  if (service?.price && service.price.mode === "from" && typeof service.price.amount === "number") {
    return `À partir de ${service.price.amount} ${service.price.currency || "€"}`;
  }
  return hasAnyPrice ? "Estimation personnalisée" : "Sur devis";
}
