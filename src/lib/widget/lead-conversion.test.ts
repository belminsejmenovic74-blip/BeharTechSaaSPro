import { describe, expect, it } from "vitest";

import type { DashboardWidgetLead } from "@/lib/widget/dashboard-leads";
import {
  findExistingCustomerId,
  leadToAppointmentInput,
  leadToQuoteInput,
  leadToRepairInput,
  matchesLeadSearch,
} from "@/lib/widget/lead-conversion";

function lead(over: Partial<DashboardWidgetLead> = {}): DashboardWidgetLead {
  return {
    id: "lead_1",
    shop_id: "shop_a",
    widget_id: "wdg_1",
    customer_id: null,
    appointment_id: null,
    quote_id: null,
    repair_case_id: null,
    lead_type: "price_request",
    first_name: "Sarah",
    last_name: "Martin",
    phone: "06 12 34 56 78",
    phone_normalized: "+33612345678",
    email: "Sarah@Mail.fr",
    email_normalized: "sarah@mail.fr",
    device_category: "Smartphone",
    brand: "Apple",
    model: "iPhone 13",
    issue: "Écran cassé",
    issue_description: "Tombé ce matin",
    service_label: "Remplacement écran",
    quality_label: "OLED",
    displayed_price: 129,
    displayed_price_snapshot: { amount: 129, type: "exact" },
    displayed_stock: "Disponible",
    displayed_stock_snapshot: null,
    displayed_duration_minutes: 45,
    displayed_warranty: "12 mois",
    comment: "Rappel avant 12h",
    photos: ["a.jpg"],
    contact_preference: "phone",
    requested_callback_at: null,
    source_url: "https://exemple.fr",
    status: "new",
    assigned_to: null,
    conversion_reference: null,
    submission_payload: {},
    created_at: "2026-07-11T09:00:00.000Z",
    updated_at: "2026-07-11T09:00:00.000Z",
    last_activity_at: "2026-07-11T09:00:00.000Z",
    closed_at: null,
    spam_at: null,
    ...over,
  };
}

describe("findExistingCustomerId — téléphone puis email", () => {
  const customers = [
    { id: "c1", phone: "0612345678", email: "autre@mail.fr" },
    { id: "c2", phone: "0700000000", email: "sarah@mail.fr" },
  ];
  it("retrouve par téléphone (chiffres, formats différents)", () => {
    expect(findExistingCustomerId(customers, lead())).toBe("c1");
  });
  it("retrouve par email si le téléphone ne correspond pas", () => {
    expect(findExistingCustomerId(customers, lead({ phone: "0800000000", phone_normalized: "+33800000000" }))).toBe(
      "c2",
    );
  });
  it("ne retrouve rien pour un nouveau client", () => {
    expect(
      findExistingCustomerId(
        customers,
        lead({
          phone: "0899999999",
          phone_normalized: "+33899999999",
          email: "new@mail.fr",
          email_normalized: "new@mail.fr",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("mapping demande → store (reprise sans ressaisie)", () => {
  it("réparation reprend appareil, panne, prix et client", () => {
    const input = leadToRepairInput(lead(), "c1");
    expect(input).toMatchObject({
      customerId: "c1",
      deviceModel: "iPhone 13",
      device: "Apple iPhone 13",
      issue: "Écran cassé",
      status: "Reçu",
      amount: 129,
      total: 129,
    });
  });

  it("rendez-vous reprend créneau et technicien optionnel", () => {
    expect(leadToAppointmentInput(lead(), "c1", { date: "2026-07-20", time: "10:00" })).not.toHaveProperty(
      "technician",
    );
    const withTech = leadToAppointmentInput(lead(), "c1", { date: "2026-07-20", time: "10:00", technician: "Karim" });
    expect(withTech).toMatchObject({ date: "2026-07-20", time: "10:00", technician: "Karim", customerPrice: 129 });
  });

  it("devis ajoute une ligne quand un prix est affiché, sinon vide", () => {
    expect(leadToQuoteInput(lead(), "c1").lines).toHaveLength(1);
    expect(leadToQuoteInput(lead({ displayed_price: null }), "c1").lines).toHaveLength(0);
  });
});

describe("matchesLeadSearch — recherche intelligente", () => {
  it("trouve par téléphone (avec ou sans espaces/format)", () => {
    expect(matchesLeadSearch(lead(), "0612345678")).toBe(true);
    expect(matchesLeadSearch(lead(), "06 12 34")).toBe(true);
  });
  it("trouve par nom, email et numéro de demande", () => {
    expect(matchesLeadSearch(lead(), "sarah")).toBe(true);
    expect(matchesLeadSearch(lead(), "sarah@mail.fr")).toBe(true);
    expect(matchesLeadSearch(lead(), "lead_1")).toBe(true);
  });
  it("ne matche pas une requête vide ou étrangère", () => {
    expect(matchesLeadSearch(lead(), "")).toBe(false);
    expect(matchesLeadSearch(lead(), "zzzz")).toBe(false);
  });
});
