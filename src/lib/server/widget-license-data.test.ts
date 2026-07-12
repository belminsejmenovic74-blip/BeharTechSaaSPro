import { describe, expect, it } from "vitest";

import { parseWorkshopBusinessHours } from "@/lib/server/widget-license-data";

describe("connexion widget aux horaires de la licence", () => {
  it("convertit les horaires français en planning ISO", () => {
    expect(parseWorkshopBusinessHours("Lun-Ven 09:00-18:00 · Sam 09:00-13:00")).toEqual({
      "1": [{ start: "09:00", end: "18:00" }],
      "2": [{ start: "09:00", end: "18:00" }],
      "3": [{ start: "09:00", end: "18:00" }],
      "4": [{ start: "09:00", end: "18:00" }],
      "5": [{ start: "09:00", end: "18:00" }],
      "6": [{ start: "09:00", end: "13:00" }],
    });
  });

  it("ignore les plages invalides au lieu d'ouvrir de faux créneaux", () => {
    expect(parseWorkshopBusinessHours("Lun 18:00-09:00 · texte libre")).toEqual({});
  });
});
