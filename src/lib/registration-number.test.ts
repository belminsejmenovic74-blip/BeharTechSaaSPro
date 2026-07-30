import { describe, expect, it } from "vitest";

import {
  isValidRegistrationNumber,
  isValidSiretFormat,
  isValidSwissUid,
  normalizeSiret,
  normalizeSwissUid,
  registrationNumberForStorage,
} from "@/lib/registration-number";

describe("SIRET", () => {
  it("accepte 14 chiffres, quelle que soit la ponctuation saisie", () => {
    expect(isValidSiretFormat("830 148 618 00017")).toBe(true);
    expect(normalizeSiret("830-148-618-00017")).toBe("83014861800017");
  });

  it("refuse une longueur incorrecte", () => {
    expect(isValidSiretFormat("8301486180001")).toBe(false);
    expect(isValidSiretFormat("")).toBe(false);
    expect(isValidSiretFormat(undefined)).toBe(false);
  });

  it("refuse les valeurs de test historiquement rejetées par les réglages", () => {
    expect(isValidSiretFormat("00000000000000")).toBe(false);
    expect(isValidSiretFormat("12333333333333")).toBe(false);
  });

  it("tronque au-delà de 14 chiffres au lieu d'accepter n'importe quelle longueur", () => {
    expect(normalizeSiret("8301486180001799999")).toBe("83014861800017");
  });
});

describe("IDE / UID suisse", () => {
  it("normalise vers la forme canonique", () => {
    expect(normalizeSwissUid("CHE123456789")).toBe("CHE-123.456.789");
    expect(normalizeSwissUid("che-123.456.789")).toBe("CHE-123.456.789");
  });

  it("refuse un nombre de chiffres incorrect et la valeur nulle", () => {
    expect(isValidSwissUid("CHE-123.456.78")).toBe(false);
    expect(isValidSwissUid("CHE-000.000.000")).toBe(false);
  });
});

describe("aiguillage par pays", () => {
  it("n'accepte pas un SIRET pour un atelier suisse, ni l'inverse", () => {
    expect(isValidRegistrationNumber("CH", "83014861800017")).toBe(false);
    expect(isValidRegistrationNumber("FR", "CHE-123.456.789")).toBe(false);
  });

  it("ne renvoie jamais une chaîne vide en base : null ou valeur valide", () => {
    expect(registrationNumberForStorage("FR", "")).toBeNull();
    expect(registrationNumberForStorage("FR", "830 148 618 00017")).toBe("83014861800017");
    expect(registrationNumberForStorage("CH", "CHE123456789")).toBe("CHE-123.456.789");
  });
});
