import { describe, expect, it } from "vitest";

import {
  DEFAULT_WIDGET_CMS_CONFIG,
  editableWidgetConfigSchema,
  mergeEditableWidgetConfig,
  normalizeEditableWidgetConfig,
} from "@/lib/widget/cms-config";

describe("mini-CMS widget", () => {
  it("normalise une ancienne configuration avec les garde-fous responsive", () => {
    const config = normalizeEditableWidgetConfig({
      general: { commercialName: "Atelier Démo" },
      visual: { primaryColor: "#123456", radius: 80 },
    });
    expect(config.general.commercialName).toBe("Atelier Démo");
    expect(config.visual.primaryColor).toBe("#123456");
    expect(config.visual.radius).toBe(DEFAULT_WIDGET_CMS_CONFIG.visual.radius);
    expect(config.layout.columns).toBe(1);
    expect(config.layout.blockOrder).toEqual(["header", "progress", "content", "actions"]);
  });

  it("interdit de masquer les coordonnées, le consentement, le contenu ou les actions", () => {
    const invalidContact = editableWidgetConfigSchema.safeParse({
      ...DEFAULT_WIDGET_CMS_CONFIG,
      layout: { ...DEFAULT_WIDGET_CMS_CONFIG.layout, hiddenFields: ["contact"] },
    });
    const invalidActions = editableWidgetConfigSchema.safeParse({
      ...DEFAULT_WIDGET_CMS_CONFIG,
      layout: { ...DEFAULT_WIDGET_CMS_CONFIG.layout, hiddenBlocks: ["actions"] },
    });
    expect(invalidContact.success).toBe(false);
    expect(invalidActions.success).toBe(false);
  });

  it("refuse les ordres incomplets ou dupliqués et les valeurs visuelles libres", () => {
    const duplicate = editableWidgetConfigSchema.safeParse({
      ...DEFAULT_WIDGET_CMS_CONFIG,
      layout: {
        ...DEFAULT_WIDGET_CMS_CONFIG.layout,
        blockOrder: ["header", "header", "content", "actions"],
      },
    });
    const badColor = editableWidgetConfigSchema.safeParse({
      ...DEFAULT_WIDGET_CMS_CONFIG,
      visual: { ...DEFAULT_WIDGET_CMS_CONFIG.visual, primaryColor: "red" },
    });
    expect(duplicate.success).toBe(false);
    expect(badColor.success).toBe(false);
  });

  it("accepte les trois modes, les dispositions encadrées et deux colonnes", () => {
    for (const displayMode of ["inline", "modal", "floating"] as const) {
      const result = editableWidgetConfigSchema.safeParse({
        ...DEFAULT_WIDGET_CMS_CONFIG,
        displayMode,
        layout: {
          ...DEFAULT_WIDGET_CMS_CONFIG.layout,
          columns: 2,
          alignment: "center",
          template: "showcase",
        },
      });
      expect(result.success).toBe(true);
    }
  });

  it("préserve le catalogue et le planning lors d’une modification visuelle", () => {
    const merged = mergeEditableWidgetConfig(
      {
        catalog: [{ publicId: "svc_1", model: "iPhone 15" }],
        booking: { durationMinutes: 45 },
      },
      { ...DEFAULT_WIDGET_CMS_CONFIG, general: { ...DEFAULT_WIDGET_CMS_CONFIG.general, commercialName: "Nouveau" } },
    );
    expect(merged.catalog).toEqual([{ publicId: "svc_1", model: "iPhone 15" }]);
    expect(merged.booking).toEqual({ durationMinutes: 45 });
    expect(merged.general.commercialName).toBe("Nouveau");
  });

  it("n’affiche aucune icône ni mention Behar Tech Pro par défaut", () => {
    expect(DEFAULT_WIDGET_CMS_CONFIG.icons.poweredBy).toBe(false);
    expect(
      Object.entries(DEFAULT_WIDGET_CMS_CONFIG.icons)
        .filter(([key]) => key !== "poweredBy")
        .every(([, choice]) => (choice as { mode: string }).mode === "none"),
    ).toBe(true);
    const invalidCustom = editableWidgetConfigSchema.safeParse({
      ...DEFAULT_WIDGET_CMS_CONFIG,
      icons: {
        ...DEFAULT_WIDGET_CMS_CONFIG.icons,
        phone: { ...DEFAULT_WIDGET_CMS_CONFIG.icons.phone, mode: "custom", assetUrl: "" },
      },
    });
    expect(invalidCustom.success).toBe(false);
  });
});
