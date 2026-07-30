/**
 * Validation de format du numéro d'immatriculation, partagée client / serveur.
 *
 * Deux pays sont gérés par le produit : la France (SIRET, 14 chiffres) et la
 * Suisse (IDE / UID, CHE + 9 chiffres). Les deux atterrissent dans la même
 * colonne `workshops.siret`, que la couche capacités expose sous le nom
 * générique `registrationNumber`.
 *
 * Volontairement limitée au format. Aucune vérification d'existence n'est faite
 * ici : un numéro bien formé mais inexistant est accepté à ce stade.
 */

export type RegistrationCountry = "FR" | "CH";

export const SIRET_LENGTH = 14;
const SWISS_UID_DIGITS = 9;

/** Ne conserve que les chiffres, tronqués à la longueur d'un SIRET. */
export function normalizeSiret(value: unknown): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, SIRET_LENGTH);
}

/**
 * Reprend la règle déjà appliquée dans les réglages atelier : longueur exacte,
 * ni zéros seuls, ni séquence de test.
 */
export function isValidSiretFormat(value: unknown): boolean {
  const digits = normalizeSiret(value);
  if (digits.length !== SIRET_LENGTH) return false;
  if (/^0+$/.test(digits)) return false;
  if (/^123+$/.test(digits)) return false;
  return true;
}

/**
 * Forme canonique suisse : CHE-123.456.789.
 *
 * Le préfixe CHE est optionnel à la saisie, mais le nombre de chiffres doit être
 * exact : sans cela un SIRET de 14 chiffres serait tronqué à 9 et accepté comme
 * un UID suisse valide.
 */
export function normalizeSwissUid(value: unknown): string {
  const compact = String(value ?? "")
    .toUpperCase()
    .replace(/[\s.\-_]/g, "");
  const match = compact.match(/^(?:CHE)?(\d+)$/);
  const digits = match?.[1] ?? "";
  if (digits.length !== SWISS_UID_DIGITS) return "";
  return `CHE-${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}`;
}

export function isValidSwissUid(value: unknown): boolean {
  const canonical = normalizeSwissUid(value);
  if (!canonical) return false;
  return !/^CHE-000\.000\.000$/.test(canonical);
}

export function isValidRegistrationNumber(country: RegistrationCountry, value: unknown): boolean {
  return country === "CH" ? isValidSwissUid(value) : isValidSiretFormat(value);
}

/** Valeur à écrire en base, ou `null` si le format n'est pas valide. */
export function registrationNumberForStorage(country: RegistrationCountry, value: unknown): string | null {
  if (!isValidRegistrationNumber(country, value)) return null;
  return country === "CH" ? normalizeSwissUid(value) : normalizeSiret(value);
}
