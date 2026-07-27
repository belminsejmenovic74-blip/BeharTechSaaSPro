import { describe, expect, it } from "vitest";

import { appointmentInputSchema, leadInputSchema } from "./public-contracts";

const contact = {
  firstName: "Alice",
  lastName: "Test",
  phone: "+33612345678",
  email: "",
  deviceCategory: "Smartphone",
  brand: "Apple",
  model: "iPhone 12",
  issue: "Écran",
  consent: {
    service: true as const,
    marketing: false,
    text: "J’accepte la transmission de ma demande à l’atelier.",
    privacyVersion: "v1",
    acceptedAt: new Date().toISOString(),
  },
  startedAt: new Date(Date.now() - 5_000).toISOString(),
};

describe("contrats publics des modes de prise en charge", () => {
  it("refuse une intervention à domicile sans adresse complète", () => {
    expect(
      leadInputSchema.safeParse({
        ...contact,
        type: "request",
        serviceMode: "home_service",
      }).success,
    ).toBe(false);
    expect(
      leadInputSchema.safeParse({
        ...contact,
        type: "request",
        serviceMode: "home_service",
        serviceAddress: { address: "10 rue du Test", postalCode: "75001", city: "Paris", country: "FR" },
      }).success,
    ).toBe(true);
  });

  it("refuse de détourner la route rendez-vous vers un autre mode", () => {
    const base = { ...contact, type: "appointment" as const, date: "2026-08-03", time: "10:00" };
    expect(appointmentInputSchema.safeParse({ ...base, serviceMode: "appointment" }).success).toBe(true);
    expect(appointmentInputSchema.safeParse({ ...base, serviceMode: "home_service" }).success).toBe(false);
  });
});
