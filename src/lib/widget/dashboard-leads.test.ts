import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { leadInputSchema } from "@/lib/widget/public-contracts";
import {
  defaultLeadSms,
  leadCustomerName,
  leadDeviceLabel,
  leadEmailHref,
  leadPhoneHref,
  REQUIRED_LEAD_ACTIONS,
  type DashboardWidgetLead,
} from "@/lib/widget/dashboard-leads";

const lead = {
  first_name: "Sarah",
  last_name: "Martin",
  phone: "06 12 34 56 78",
  phone_normalized: "+33612345678",
  email: "sarah@example.com",
  brand: "Apple",
  model: "iPhone 13",
  issue: "Écran cassé",
} as DashboardWidgetLead;

describe("demandes du site — actions obligatoires", () => {
  it("expose les huit actions demandées sans doublon", () => {
    expect(REQUIRED_LEAD_ACTIONS).toEqual(["call", "sms", "email", "quote", "appointment", "repair", "close", "spam"]);
    expect(new Set(REQUIRED_LEAD_ACTIONS).size).toBe(8);
  });

  it("rend un bouton identifiable pour chacune des huit actions", () => {
    const workspace = readFileSync("src/components/behar/widget-leads-workspace.tsx", "utf8");
    for (const action of REQUIRED_LEAD_ACTIONS) {
      expect(workspace).toContain(`data-lead-action="${action}"`);
    }
  });

  it("construit les actions téléphone, SMS et email avec les données de la demande", () => {
    expect(leadPhoneHref(lead)).toBe("tel:+33612345678");
    expect(leadEmailHref(lead)).toContain("mailto:sarah@example.com");
    expect(decodeURIComponent(leadEmailHref(lead))).toContain("iPhone 13");
    expect(defaultLeadSms(lead, "Behar Tech")).toContain("iPhone 13");
    expect(defaultLeadSms(lead, "Behar Tech")).toContain("Écran cassé");
  });

  it("prépare correctement le client et l’appareil pour les conversions métier", () => {
    expect(leadCustomerName(lead)).toBe("Sarah Martin");
    expect(leadDeviceLabel(lead)).toBe("Apple iPhone 13");
  });
});

describe("demandes du site — contrat de soumission", () => {
  const base = {
    firstName: "Sarah",
    lastName: "Martin",
    phone: "+33612345678",
    email: "sarah@example.com",
    deviceCategory: "Smartphone",
    brand: "Apple",
    model: "iPhone 13",
    issue: "Écran cassé",
    consent: {
      service: true as const,
      marketing: false,
      text: "J’accepte le traitement de ma demande.",
      privacyVersion: "1",
      acceptedAt: new Date().toISOString(),
    },
    startedAt: new Date(Date.now() - 5_000).toISOString(),
    website: "" as const,
  };

  it.each(["callback", "quote", "price_request", "request"] as const)("accepte le type %s", (type) => {
    expect(leadInputSchema.safeParse({ ...base, type }).success).toBe(true);
  });

  it("refuse une demande sans téléphone même si un email est fourni", () => {
    expect(leadInputSchema.safeParse({ ...base, type: "request", phone: "" }).success).toBe(false);
  });

  it("exige et valide l’adresse quand le client demande un déplacement", () => {
    expect(leadInputSchema.safeParse({ ...base, type: "request", serviceMode: "home_service" }).success).toBe(false);
    expect(
      leadInputSchema.safeParse({
        ...base,
        type: "request",
        serviceMode: "home_service",
        serviceAddress: { address: "12 rue du Rhône", postalCode: "1201", city: "Genève", country: "CH" },
      }).success,
    ).toBe(true);
    expect(
      leadInputSchema.safeParse({
        ...base,
        type: "request",
        serviceMode: "home_service",
        serviceAddress: { address: "12 rue du Rhône", postalCode: "12010", city: "Genève", country: "CH" },
      }).success,
    ).toBe(false);
  });

  it("conserve les champs supplémentaires métier connus", () => {
    const result = leadInputSchema.safeParse({
      ...base,
      type: "quote",
      issueDescription: "Écran noir après une chute",
      quality: "OLED",
      comment: "Disponible après 17 h",
      contactPreference: "sms",
      photos: ["w/session/photo.webp"],
      sourceUrl: "https://atelier.example/widget",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        issueDescription: "Écran noir après une chute",
        quality: "OLED",
        comment: "Disponible après 17 h",
        contactPreference: "sms",
      });
    }
  });
});
