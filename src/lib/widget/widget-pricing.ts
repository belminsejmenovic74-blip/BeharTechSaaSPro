// Estimation commerciale du widget : prix des prestations retenues, moins les
// remises (QualiRépar, -25 %…), plus les options ajoutées (verre trempé, chargeur…).
//
// Rien n'est recalculé « métier » ici : on lit les prix publiés par l'atelier et
// on applique les offres sélectionnées telles que configurées dans le CMS.
// L'estimation reste indicative : « le prix final est confirmé après diagnostic ».

import { formatMoney } from "@/components/widget/widget-theme";
import type { PublicService, WidgetOffer, WidgetOffersConfig } from "@/lib/widget/public-types";

export type EstimationLine = {
  id: string;
  label: string;
  amount: number; // signé : négatif = remise, positif = prestation ou option
  kind: "service" | "discount" | "addon";
};

export type Estimation = {
  currency: string;
  base: number;
  lines: EstimationLine[];
  total: number;
  approximate: boolean; // au moins une prestation « à partir de » / fourchette
  onRequest: boolean; // au moins une prestation sans prix publié
  hasPricedService: boolean;
};

function serviceAmount(service: PublicService): { amount: number | null; approximate: boolean } {
  const price = service.price;
  if (!price) return { amount: null, approximate: false };
  switch (price.mode) {
    case "exact":
      return { amount: typeof price.amount === "number" ? price.amount : null, approximate: false };
    case "from":
      return { amount: typeof price.amount === "number" ? price.amount : null, approximate: true };
    case "range":
      return { amount: typeof price.min === "number" ? price.min : null, approximate: true };
    default:
      return { amount: null, approximate: false };
  }
}

// Offres réellement appliquées à l'estimation : automatiques + sélectionnées.
export function appliedOffers(offers: WidgetOffersConfig | undefined, selectedOfferIds: string[]): WidgetOffer[] {
  if (!offers?.enabled) return [];
  return offers.offers.filter(
    (offer) =>
      offer.isPublished &&
      (offer.behavior === "automatic" ||
        ((offer.behavior === "selectable" || offer.behavior === "validation") && selectedOfferIds.includes(offer.id))),
  );
}

// Impact d'une offre sur le total, pour affichage dans le récapitulatif.
export function offerDelta(offer: WidgetOffer, base: number): { amount: number; kind: "discount" | "addon" } | null {
  if (typeof offer.fixedDiscount === "number" && offer.fixedDiscount > 0) {
    return { amount: -offer.fixedDiscount, kind: "discount" };
  }
  if (typeof offer.percentageDiscount === "number" && offer.percentageDiscount > 0) {
    return { amount: -Math.round((base * offer.percentageDiscount) / 100), kind: "discount" };
  }
  if (typeof offer.promotionalPrice === "number") {
    return { amount: offer.promotionalPrice, kind: "addon" };
  }
  return null;
}

export function computeEstimation(services: PublicService[], offers: WidgetOffer[], currency: string): Estimation {
  let base = 0;
  let approximate = false;
  let onRequest = false;
  let hasPricedService = false;
  const lines: EstimationLine[] = [];

  for (const service of services) {
    const { amount, approximate: appx } = serviceAmount(service);
    if (amount == null) {
      onRequest = true;
      continue;
    }
    hasPricedService = true;
    base += amount;
    if (appx) approximate = true;
    lines.push({ id: `svc-${service.publicId}`, label: service.service || service.issue, amount, kind: "service" });
  }

  let total = base;
  for (const offer of offers) {
    const delta = offerDelta(offer, base);
    if (!delta) continue;
    total += delta.amount;
    lines.push({ id: `offer-${offer.id}`, label: offer.title, amount: delta.amount, kind: delta.kind });
  }
  if (total < 0) total = 0;

  return { currency, base, lines, total: Math.round(total), approximate, onRequest, hasPricedService };
}

// « À partir de 114 € » / « 114 € » / « Sur devis » selon les prix publiés.
export function estimationLabel(estimation: Estimation, locale: string): string {
  if (!estimation.hasPricedService) return "Sur devis";
  const money = formatMoney(estimation.total, estimation.currency, locale);
  return estimation.approximate ? `À partir de ${money}` : money;
}

// Montant signé pour une ligne d'option : « −25 € », « +10 € », « −25 % ».
export function signedMoney(amount: number, currency: string, locale: string): string {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${formatMoney(Math.abs(amount), currency, locale)}`;
}
