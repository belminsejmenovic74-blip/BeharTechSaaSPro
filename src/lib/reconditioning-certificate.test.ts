import { describe, expect, it } from "vitest";

import {
  buildCertificateData,
  decodeCertificate,
  encodeCertificate,
  maskImeiForPublic,
  publicTokenForReconditioningFile,
} from "@/lib/reconditioning-certificate";
import { createBlankFile, DEFAULT_PUBLIC_SETTINGS, type ReconditioningFile } from "@/lib/reconditioning-store";

function makeFile(patch: Partial<ReconditioningFile> = {}): ReconditioningFile {
  return {
    ...createBlankFile(1),
    brand: "Apple",
    model: "iPhone 12 Pro",
    storage: "64 Go",
    color: "Blanc",
    imei: "353915102643210",
    cosmeticGrade: "C",
    prixAchat: 40,
    prixVentePrevu: 250,
    batteryHealth: 82,
    warrantyMonths: 12,
    testComment: "Note interne : oxydation légère près du connecteur",
    functionalTests: { Écran: "OK", Batterie: "Défaut" },
    physicalChecks: { Rayures: "Léger" },
    ...patch,
  };
}

describe("certificat public — masquage des données internes", () => {
  it("n'expose jamais l'IMEI brut dans le payload encodé", () => {
    const file = makeFile({ publicSettings: { ...DEFAULT_PUBLIC_SETTINGS, showMaskedImei: true } });
    const encoded = encodeCertificate(buildCertificateData(file));
    const decoded = decodeCertificate(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.imei).toBe(maskImeiForPublic(file.imei));
    expect(decoded?.imei).not.toBe(file.imei);
    // Le payload lui-même (décodé en clair) ne doit pas contenir l'IMEI complet.
    const raw = Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    expect(raw).not.toContain(file.imei);
  });

  it("masque l'IMEI de façon idempotente (double masquage stable)", () => {
    const once = maskImeiForPublic("353915102643210");
    expect(maskImeiForPublic(once)).toBe(once);
  });

  it("omet l'IMEI quand showMaskedImei est désactivé", () => {
    const file = makeFile({ publicSettings: { ...DEFAULT_PUBLIC_SETTINGS, showMaskedImei: false } });
    const decoded = decodeCertificate(encodeCertificate(buildCertificateData(file)));
    expect(decoded?.imei).toBe("");
  });

  it("n'encode pas les défauts (ni le commentaire interne) quand showPublicComment est désactivé", () => {
    const file = makeFile({ publicSettings: { ...DEFAULT_PUBLIC_SETTINGS, showPublicComment: false } });
    const encoded = encodeCertificate(buildCertificateData(file));
    const decoded = decodeCertificate(encoded);
    expect(decoded?.defects).toEqual([]);
    const raw = Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    expect(raw).not.toContain("Note interne");
  });

  it("encode les défauts quand showPublicComment est activé", () => {
    const file = makeFile({ publicSettings: { ...DEFAULT_PUBLIC_SETTINGS, showPublicComment: true } });
    const decoded = decodeCertificate(encodeCertificate(buildCertificateData(file)));
    expect(decoded?.defects.length).toBeGreaterThan(0);
  });

  it("respecte les toggles prix / grade / batterie / référence dans le payload", () => {
    const file = makeFile({
      publicSettings: {
        ...DEFAULT_PUBLIC_SETTINGS,
        showPrice: false,
        showGrade: false,
        showBattery: false,
        showReference: false,
      },
    });
    const decoded = decodeCertificate(encodeCertificate(buildCertificateData(file)));
    expect(decoded?.price).toBe(0);
    expect(decoded?.grade).toBe("");
    expect(decoded?.batteryHealth).toBeNull();
    expect(decoded?.ref).toBe("");
  });

  it("ne contient jamais prix d'achat, marge ou fournisseur", () => {
    const file = makeFile({ supplierName: "LDLC Pro", supplierInvoice: "FAC-2026-118" });
    const encoded = encodeCertificate(buildCertificateData(file));
    const raw = Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    expect(raw).not.toContain("LDLC");
    expect(raw).not.toContain("FAC-2026-118");
    expect(raw).not.toContain("prixAchat");
  });

  it("décode proprement un payload corrompu (pas de crash, retour null)", () => {
    expect(decodeCertificate("pas-un-payload-valide!!!")).toBeNull();
  });

  it("génère un token public stable dérivé de la référence", () => {
    const file = makeFile();
    const token = publicTokenForReconditioningFile(file);
    expect(token).toMatch(/^rd-acq-\d{4}-\d{6}$/);
    expect(publicTokenForReconditioningFile(file)).toBe(token);
  });
});
