export type WeightedAverageInput = {
  currentQuantity?: number | null;
  currentAverageCost?: number | null;
  addedQuantity: number;
  addedUnitCost: number;
};

function finiteNonNegative(value: number | null | undefined, label: string): number {
  const normalized = value ?? 0;
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new RangeError(`${label} doit être un nombre positif ou nul.`);
  }
  return normalized;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("Le montant doit être fini.");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateWeightedAverageCost(input: WeightedAverageInput): number {
  const currentQuantity = finiteNonNegative(input.currentQuantity, "Le stock courant");
  const currentAverageCost = finiteNonNegative(input.currentAverageCost, "Le prix moyen courant");
  const addedQuantity = finiteNonNegative(input.addedQuantity, "La quantité ajoutée");
  const addedUnitCost = finiteNonNegative(input.addedUnitCost, "Le coût unitaire ajouté");
  const nextQuantity = currentQuantity + addedQuantity;
  if (nextQuantity === 0) return 0;
  return roundMoney((currentQuantity * currentAverageCost + addedQuantity * addedUnitCost) / nextQuantity);
}

export function calculateCompleteReconditioningCost(input: {
  purchasePrice?: number | null;
  partsCost?: number | null;
  laborCost?: number | null;
  otherCosts?: number | null;
}): number {
  return roundMoney(
    finiteNonNegative(input.purchasePrice, "Le prix de rachat") +
      finiteNonNegative(input.partsCost, "Le coût des pièces") +
      finiteNonNegative(input.laborCost, "Le coût de main-d’œuvre") +
      finiteNonNegative(input.otherCosts, "Les autres coûts"),
  );
}

/**
 * Calcule le prix moyen après annulation d'une entrée encore présente en stock.
 * La correction est refusée si elle ferait passer le stock sous zéro.
 */
export function reverseWeightedAverageCost(input: {
  currentQuantity: number;
  currentAverageCost: number;
  removedQuantity: number;
  removedUnitCost: number;
}): number {
  const currentQuantity = finiteNonNegative(input.currentQuantity, "Le stock courant");
  const currentAverageCost = finiteNonNegative(input.currentAverageCost, "Le prix moyen courant");
  const removedQuantity = finiteNonNegative(input.removedQuantity, "La quantité annulée");
  const removedUnitCost = finiteNonNegative(input.removedUnitCost, "Le coût unitaire annulé");
  const nextQuantity = currentQuantity - removedQuantity;
  if (nextQuantity < 0) throw new RangeError("Une correction ne peut pas rendre le stock négatif.");
  if (nextQuantity === 0) return 0;
  const remainingValue = currentQuantity * currentAverageCost - removedQuantity * removedUnitCost;
  if (remainingValue < -0.005) throw new RangeError("La correction produirait une valeur de stock négative.");
  return roundMoney(Math.max(0, remainingValue) / nextQuantity);
}
