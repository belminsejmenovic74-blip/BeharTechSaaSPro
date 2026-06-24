// Normalisation des dates « libres » utilisées par le store.
// Les paiements/ventes stockent souvent un libellé humain (`nowLabel()`)
// du type "09 juin 2026, 14:32" — surtout pas un ISO. Plusieurs vues
// (CA du jour, ventes du jour, graphe de CA) doivent pouvoir comparer ces
// libellés à une date locale YYYY-MM-DD : ce module centralise ce parsing
// pour éviter les divergences (cf. bug « CA du jour » qui ne comptait pas
// les règlements créés via l'app).

const FR_MONTHS: Record<string, number> = {
  janv: 0,
  "janv.": 0,
  janvier: 0,
  févr: 1,
  "févr.": 1,
  fevr: 1,
  "fevr.": 1,
  février: 1,
  fevrier: 1,
  mars: 2,
  avr: 3,
  "avr.": 3,
  avril: 3,
  mai: 4,
  juin: 5,
  juil: 6,
  "juil.": 6,
  juillet: 6,
  août: 7,
  aout: 7,
  sept: 8,
  "sept.": 8,
  septembre: 8,
  oct: 9,
  "oct.": 9,
  octobre: 9,
  nov: 10,
  "nov.": 10,
  novembre: 10,
  déc: 11,
  "déc.": 11,
  dec: 11,
  "dec.": 11,
  décembre: 11,
  decembre: 11,
};

/** Date locale au format YYYY-MM-DD (pas d'UTC, pour coller au fuseau de la boutique). */
export function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DD du jour (date locale). */
export function todayLocalIso(): string {
  return toLocalIso(new Date());
}

/**
 * Tente d'extraire une date locale YYYY-MM-DD depuis le format libre des
 * dates store. Formats gérés : "17 mai 2026, 14:30", "Aujourd'hui, 14:30",
 * "Hier, 10:00", "2026-05-17", "2026-05-17T…", "17/05/2026".
 * Renvoie null si rien d'exploitable.
 */
export function paymentDateToIso(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  // "Aujourd'hui" / "Hier"
  if (/^aujourd['’]hui/i.test(value)) return toLocalIso(new Date());
  if (/^hier/i.test(value)) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return toLocalIso(y);
  }
  // ISO direct : "2026-05-17" ou "2026-05-17T..."
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // jj/mm/aaaa
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`;
  }
  // "17 mai 2026" / "17 mai 2026, 14:30" / "17 mai. 2026"
  const frMatch = value.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})/);
  if (frMatch) {
    const day = Number(frMatch[1]);
    const monthKey = frMatch[2].toLowerCase();
    const month = FR_MONTHS[monthKey];
    if (month !== undefined && Number.isFinite(day)) {
      return `${frMatch[3]}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  // Fallback : tentative Date()
  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) return toLocalIso(fallback);
  return null;
}

/** Vrai si la date libre tombe le jour local indiqué (par défaut aujourd'hui). */
export function isSameLocalDay(raw: string | undefined | null, iso: string = todayLocalIso()): boolean {
  return paymentDateToIso(raw) === iso;
}
