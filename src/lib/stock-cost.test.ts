import { describe, expect, it } from "vitest";

import {
  calculateCompleteReconditioningCost,
  calculateWeightedAverageCost,
  reverseWeightedAverageCost,
} from "./stock-cost";

describe("stock weighted average cost", () => {
  it("gère un stock initial nul", () => {
    expect(
      calculateWeightedAverageCost({
        currentQuantity: 0,
        currentAverageCost: null,
        addedQuantity: 2,
        addedUnitCost: 38,
      }),
    ).toBe(38);
  });

  it("applique la moyenne pondérée et l'arrondi monétaire", () => {
    expect(
      calculateWeightedAverageCost({
        currentQuantity: 3,
        currentAverageCost: 10,
        addedQuantity: 2,
        addedUnitCost: 21.13,
      }),
    ).toBe(14.45);
  });

  it("refuse les quantités et coûts négatifs", () => {
    expect(() =>
      calculateWeightedAverageCost({
        currentQuantity: -1,
        currentAverageCost: 10,
        addedQuantity: 1,
        addedUnitCost: 38,
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateWeightedAverageCost({
        currentQuantity: 1,
        currentAverageCost: 10,
        addedQuantity: -1,
        addedUnitCost: 38,
      }),
    ).toThrow(RangeError);
  });

  it("inclut achat, pièces, main-d'œuvre et autres coûts", () => {
    expect(
      calculateCompleteReconditioningCost({
        purchasePrice: 120,
        partsCost: 38.2,
        laborCost: 25,
        otherCosts: 4.35,
      }),
    ).toBe(187.55);
  });

  it("annule précisément une entrée et refuse un stock négatif", () => {
    expect(
      reverseWeightedAverageCost({
        currentQuantity: 5,
        currentAverageCost: 14.45,
        removedQuantity: 2,
        removedUnitCost: 21.13,
      }),
    ).toBe(10);
    expect(() =>
      reverseWeightedAverageCost({
        currentQuantity: 1,
        currentAverageCost: 10,
        removedQuantity: 2,
        removedUnitCost: 10,
      }),
    ).toThrow(RangeError);
  });
});
