import { describe, expect, it } from "vitest";

import {
  buildTheme,
  formatAvailability,
  formatDuration,
  formatPrice,
  resolveFeatures,
  resolveTexts,
} from "@/components/widget/widget-theme";

describe("formatPrice — bascule vers demande de contact", () => {
  it("formate les prix publiés selon le mode", () => {
    expect(formatPrice({ mode: "exact", amount: 129 }, "EUR", "fr-FR").label).toMatch(/129/);
    expect(formatPrice({ mode: "from", amount: 100 }, "EUR", "fr-FR").label).toMatch(/^À partir de/);
    expect(formatPrice({ mode: "range", min: 100, max: 150 }, "EUR", "fr-FR").label).toMatch(/^De .* à /);
  });

  it("signale onRequest quand aucun prix exploitable n'est publié", () => {
    for (const price of [
      undefined,
      { mode: "request" as const },
      { mode: "hidden" as const },
      { mode: "exact" as const },
    ]) {
      const result = formatPrice(price, "EUR", "fr-FR");
      expect(result.onRequest).toBe(true);
      expect(result.label).toBeNull();
    }
  });
});

describe("formatAvailability — jamais « disponible » par défaut", () => {
  it("retombe sur « à confirmer » sans stock ou en mode masqué", () => {
    expect(formatAvailability(undefined)).toBe("Disponibilité à confirmer");
    expect(formatAvailability({ mode: "hidden" })).toBe("Disponibilité à confirmer");
  });

  it("affiche les statuts et quantités publiés", () => {
    expect(formatAvailability({ mode: "simple", label: "Dispo atelier" })).toBe("Dispo atelier");
    expect(formatAvailability({ mode: "simple", status: "available" })).toBe("Disponible");
    expect(formatAvailability({ mode: "quantity", quantity: 3 })).toBe("3 en stock");
    expect(formatAvailability({ mode: "quantity", quantity: 0 })).toBe("Sur commande");
  });
});

describe("formatDuration", () => {
  it("formate minutes et heures", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(90)).toBe("1 h 30");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
  });
});

describe("buildTheme — contraste et variables CSS", () => {
  it("choisit un texte lisible sur la couleur primaire", () => {
    expect(buildTheme({ primaryColor: "#FFFFFF" }).onPrimary).toBe("#1A1916");
    expect(buildTheme({ primaryColor: "#000000" }).onPrimary).toBe("#FFFFFF");
  });

  it("applique la palette Behar par défaut et expose les variables", () => {
    const theme = buildTheme(undefined);
    expect(theme.primary).toBe("#2A9D8F");
    expect(theme.onPrimary).toBe("#FFFFFF");
    expect(theme.style).toMatchObject({ "--w-primary": "#2A9D8F" });
  });
});

describe("valeurs par défaut", () => {
  it("active les fonctionnalités du parcours et laisse le multi-problème désactivé", () => {
    const features = resolveFeatures(undefined);
    expect(features.booking).toBe(true);
    expect(features.multiIssue).toBe(false);
    expect(resolveFeatures({ multiIssue: true }).multiIssue).toBe(true);
  });

  it("fournit des libellés français et respecte les surcharges", () => {
    expect(resolveTexts(undefined).bookingLabel).toBe("Prendre rendez-vous");
    expect(resolveTexts({ bookingLabel: "Réserver" }).bookingLabel).toBe("Réserver");
  });
});
