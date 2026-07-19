import { describe, expect, it } from "vitest";

import { DemoWidgetClient } from "@/lib/widget/demo-data";
import type { PublicService } from "@/lib/widget/public-types";

describe("aperçu du widget connecté au catalogue atelier", () => {
  it("utilise le prix exact du modèle fourni au lieu des paliers démo 89/129", async () => {
    const catalog: PublicService[] = [
      {
        publicId: "svc_real_screen",
        category: "Smartphone",
        brand: "Apple",
        model: "iPhone 15",
        issue: "Écran",
        service: "Écran",
        quality: "Soft OLED",
        price: { mode: "exact", amount: 147, currency: "EUR" },
      },
    ];
    const client = new DemoWidgetClient();
    client.setPreviewServices(catalog);

    const services = await client.getServices("preview", {
      category: "Smartphone",
      brand: "Apple",
      model: "iPhone 15",
    });

    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({ quality: "Soft OLED", price: { mode: "exact", amount: 147 } });
    expect(services.some((service) => service.price?.amount === 89 || service.price?.amount === 129)).toBe(false);
  });

  it("ne mélange pas le tarif d'un autre modèle", async () => {
    const client = new DemoWidgetClient();
    client.setPreviewServices([
      {
        publicId: "svc_iphone14",
        category: "Smartphone",
        brand: "Apple",
        model: "iPhone 14",
        issue: "Écran",
        service: "Écran",
        price: { mode: "exact", amount: 119, currency: "EUR" },
      },
    ]);

    await expect(
      client.getServices("preview", { category: "Smartphone", brand: "Apple", model: "iPhone 15" }),
    ).resolves.toEqual([]);
  });
});
