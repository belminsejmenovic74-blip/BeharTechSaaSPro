import { describe, expect, it } from "vitest";

import type { Repair } from "@/lib/behar-store";
import {
  repairInternalTotal,
  repairReturnedCountBetween,
  repairReturnedIsoDay,
  repairRevenueBetween,
  toIsoDay,
} from "@/lib/repair-revenue";

const repair = (patch: Partial<Repair>): Repair => ({ status: "Rendu", ...patch }) as Repair;

describe("montant interne du dossier", () => {
  it("préfère total à amount et ignore les valeurs non exploitables", () => {
    expect(repairInternalTotal({ total: 120, amount: 90 })).toBe(120);
    expect(repairInternalTotal({ total: undefined, amount: 90 })).toBe(90);
    expect(repairInternalTotal({ total: -5, amount: undefined })).toBe(0);
    expect(repairInternalTotal({ total: Number.NaN, amount: undefined })).toBe(0);
  });
});

describe("date de restitution", () => {
  it("accepte l'ISO et les libellés français du store", () => {
    expect(toIsoDay("2026-07-30T10:00:00.000Z")).toBe("2026-07-30");
    expect(toIsoDay("30/07/2026")).toBe("2026-07-30");
    expect(toIsoDay("pas une date")).toBeNull();
  });

  it("ne retient qu'un dossier réellement rendu", () => {
    expect(repairReturnedIsoDay(repair({ returnedAt: "2026-07-30T09:00:00Z" }))).toBe("2026-07-30");
    expect(repairReturnedIsoDay(repair({ status: "Prêt", returnedAt: "2026-07-30T09:00:00Z" }))).toBeNull();
  });

  it("retombe sur closedAt quand returnedAt manque", () => {
    expect(repairReturnedIsoDay(repair({ returnedAt: undefined, closedAt: "2026-07-28T09:00:00Z" }))).toBe(
      "2026-07-28",
    );
  });
});

describe("recettes sans facturation", () => {
  const repairs = [
    repair({ returnedAt: "2026-07-30T09:00:00Z", total: 100 }),
    repair({ returnedAt: "2026-07-29T09:00:00Z", total: 50 }),
    repair({ returnedAt: "2026-07-01T09:00:00Z", total: 999 }),
    repair({ status: "Prêt", returnedAt: "2026-07-30T09:00:00Z", total: 400 }),
  ];

  it("somme les dossiers rendus sur la fenêtre, bornes incluse puis exclue", () => {
    expect(repairRevenueBetween(repairs, "2026-07-29")).toBe(150);
    expect(repairRevenueBetween(repairs, "2026-07-29", "2026-07-30")).toBe(50);
  });

  it("exclut les dossiers non rendus du décompte comme du montant", () => {
    expect(repairReturnedCountBetween(repairs, "2026-07-29")).toBe(2);
  });
});
