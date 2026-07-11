import { describe, expect, it } from "vitest";

import {
  availabilityLabel,
  deriveWidgetAlerts,
  mapRemoteWidgetAppointment,
  upcomingStatusKey,
  WIDGET_UPCOMING_STATUSES,
  type RemoteWidgetAppointment,
} from "@/lib/widget/appointment-sync";

const customer = {
  id: "cust_1",
  shopId: "shop_atelier_belmin",
  name: "Sarah Martin",
  phone: "+33612345678",
  email: "sarah@example.fr",
};

function remote(over: Partial<RemoteWidgetAppointment> = {}): RemoteWidgetAppointment {
  return {
    id: "10000000-0000-4000-a000-000000000001",
    shop_id: "shop_b",
    client_id: null,
    appointment_number: "RDV-W-000000001",
    client_name: "Sarah Martin",
    client_phone: "+33612345678",
    client_email: "sarah@example.fr",
    device_type: "Smartphone",
    device_brand: "Apple",
    device_model: "iPhone 13",
    issue_description: "Écran cassé",
    intervention_label: "Remplacement écran",
    customer_price: 129,
    price_status: "confirmed",
    price_snapshot: {
      amount: 129,
      type: "exact",
      currency: "EUR",
      quality: "OLED",
      warranty: "12 mois",
      widgetVersion: 3,
    },
    appointment_date: "2026-07-20",
    appointment_time: "10:00",
    duration_minutes: 45,
    source: "Widget site internet",
    status: "pending",
    notes: "Rappel avant 12h svp",
    widget_lead_id: "20000000-0000-4000-a000-000000000002",
    assigned_technician_id: null,
    is_pre_intake: true,
    confirmation_status: "pending",
    stock_confirmation_required: false,
    price_confirmation_required: false,
    created_at: "2026-07-11T09:00:00.000Z",
    updated_at: "2026-07-11T09:00:00.000Z",
    quality_label: "OLED",
    displayed_stock: "Disponible",
    displayed_stock_snapshot: { mode: "simple", status: "available" },
    displayed_warranty: "12 mois",
    photos: ["w/tenant/wdg/sess/a.jpg", "w/tenant/wdg/sess/b.jpg"],
    ...over,
  };
}

describe("mapRemoteWidgetAppointment — récupération complète", () => {
  it("reprend identité, contact, appareil, problème, prestation, qualité, prix, stock, commentaire, photos et créneau", () => {
    const appointment = mapRemoteWidgetAppointment(remote(), customer);
    expect(appointment).toMatchObject({
      id: "10000000-0000-4000-a000-000000000001",
      externalSourceId: "10000000-0000-4000-a000-000000000001",
      widgetLeadId: "20000000-0000-4000-a000-000000000002",
      isPreIntake: true,
      customerId: "cust_1",
      clientName: "Sarah Martin",
      clientPhone: "+33612345678",
      clientEmail: "sarah@example.fr",
      deviceType: "Smartphone",
      deviceBrand: "Apple",
      deviceModel: "iPhone 13",
      device: "Apple iPhone 13",
      issueDescription: "Écran cassé",
      interventionLabel: "Remplacement écran",
      qualityLabel: "OLED",
      customerPrice: 129,
      availabilityLabel: "Disponible",
      warrantyLabel: "12 mois",
      notes: "Rappel avant 12h svp",
      source: "Widget site internet",
      date: "2026-07-20",
      time: "10:00",
      duration: "45 min",
    });
    expect(appointment.photos).toEqual(["w/tenant/wdg/sess/a.jpg", "w/tenant/wdg/sess/b.jpg"]);
    expect(appointment.widgetSnapshot).toMatchObject({ amount: 129, type: "exact", quality: "OLED" });
  });

  it("arrive « à confirmer » par défaut, « Confirmé » si le serveur l'a confirmé", () => {
    expect(mapRemoteWidgetAppointment(remote(), customer).status).toBe("En attente");
    expect(mapRemoteWidgetAppointment(remote({ confirmation_status: "confirmed" }), customer).status).toBe("Confirmé");
  });

  it("ne crée pas de réparation (repairId absent)", () => {
    expect(mapRemoteWidgetAppointment(remote(), customer).repairId).toBeUndefined();
  });
});

describe("availabilityLabel — jamais « disponible » par défaut", () => {
  it("préfère le libellé consulté", () => {
    expect(availabilityLabel(remote({ displayed_stock: "Disponible" }))).toBe("Disponible");
  });
  it("retombe sur « à confirmer » sans stock publié", () => {
    expect(availabilityLabel(remote({ displayed_stock: null, displayed_stock_snapshot: null }))).toBe(
      "Disponibilité à confirmer",
    );
    expect(availabilityLabel(remote({ displayed_stock: null, displayed_stock_snapshot: { mode: "hidden" } }))).toBe(
      "Disponibilité à confirmer",
    );
  });
  it("formate une quantité", () => {
    expect(
      availabilityLabel(remote({ displayed_stock: null, displayed_stock_snapshot: { mode: "quantity", quantity: 3 } })),
    ).toBe("3 en stock");
  });
});

describe("deriveWidgetAlerts", () => {
  it("signale prix et disponibilité à confirmer", () => {
    const alerts = deriveWidgetAlerts(
      remote({
        price_status: "to_confirm",
        customer_price: null,
        stock_confirmation_required: true,
        displayed_stock: null,
        displayed_stock_snapshot: { mode: "hidden" },
      }),
    );
    expect(alerts).toContain("Prix à confirmer");
    expect(alerts).toContain("Disponibilité à confirmer");
  });
  it("aucune alerte quand prix et stock sont fermes", () => {
    expect(deriveWidgetAlerts(remote())).toEqual([]);
  });
});

describe("statuts du panneau « À venir »", () => {
  it("expose les six statuts et leur mappage store", () => {
    expect(WIDGET_UPCOMING_STATUSES.map((s) => s.label)).toEqual([
      "À confirmer",
      "Confirmé",
      "Client arrivé",
      "Absent",
      "Annulé",
      "Réparation créée",
    ]);
    expect(upcomingStatusKey("En attente")).toBe("to_confirm");
    expect(upcomingStatusKey("Non venu")).toBe("no_show");
    expect(upcomingStatusKey("Réparation créée")).toBe("converted");
  });
});
