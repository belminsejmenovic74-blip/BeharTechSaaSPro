import { describe, expect, it } from "vitest";

import {
  mapCustomerToErpNext,
  mapDraftInvoiceToErpNext,
  mapItemToErpNext,
  mapSupplierToErpNext,
  VAT_EXEMPTION_MENTION,
} from "./mappers";

describe("mappages ERPNext", () => {
  it("lie un client à son identifiant SaaS et à la boutique réelle", () => {
    expect(
      mapCustomerToErpNext({ id: "customer-1", name: "Jean Dupont", shopName: "Boutique principale" }),
    ).toMatchObject({
      customer_name: "Jean Dupont",
      customer_type: "Individual",
      custom_identifiant_client_behar_tech_pro: "customer-1",
      custom_boutique_rattachee: "Boutique principale",
      custom_consentement_marketing: 0,
    });
  });

  it("n’invente ni SIRET ni TVA fournisseur lorsqu’ils sont absents", () => {
    const document = mapSupplierToErpNext({ id: "supplier-1", name: "Pièces Pro" });
    expect(document.custom_siret).toBeUndefined();
    expect(document.custom_tva_intracommunautaire).toBeUndefined();
  });

  it("mappe un article sans transformer son stock courant en stock d’ouverture", () => {
    const document = mapItemToErpNext({
      id: "item-1",
      sku: "ECR-IP15-OLED",
      name: "Écran iPhone 15 OLED",
      itemGroup: "Pièces détachées",
      quality: "OLED",
      compatibleModels: ["iPhone 15", "iPhone 15 Pro"],
    });
    expect(document).toMatchObject({
      item_code: "ECR-IP15-OLED",
      custom_qualite: "OLED",
      custom_compatibilite: "iPhone 15\niPhone 15 Pro",
      is_stock_item: 1,
    });
    expect(document.opening_stock).toBeUndefined();
  });
});

describe("garde-fous de facturation", () => {
  const invoice = {
    legalInvoicingEnabled: true,
    company: "BEHAR TECH PRO",
    customerErpNextName: "CLI-0001",
    externalId: "invoice-1",
    shopName: "Boutique principale",
    postingDate: "2026-07-19",
    paymentProvider: "Lien de paiement Stripe",
    lines: [{ itemCode: "SERVICE-REPARATION", quantity: 1, unitPrice: 99 }],
  };

  it("bloque toute facture lorsque l’immatriculation n’est pas confirmée", () => {
    expect(() => mapDraftInvoiceToErpNext({ ...invoice, legalInvoicingEnabled: false })).toThrow(/immatriculée/);
  });

  it("ne produit qu’un brouillon sans mouvement de stock et avec la mention 293 B", () => {
    const document = mapDraftInvoiceToErpNext(invoice);
    expect(document).toMatchObject({
      docstatus: 0,
      update_stock: 0,
      terms: VAT_EXEMPTION_MENTION,
      custom_paiement_effectue_hors_behar_tech_pro: 1,
      custom_prestataire_de_paiement_externe: "Stripe",
    });
  });

  it("refuse les lignes sans code article", () => {
    expect(() =>
      mapDraftInvoiceToErpNext({ ...invoice, lines: [{ itemCode: " ", quantity: 1, unitPrice: 99 }] }),
    ).toThrow(/code article/);
  });
});
