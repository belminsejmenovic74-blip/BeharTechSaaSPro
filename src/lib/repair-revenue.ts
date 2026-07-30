import type { Repair } from "@/lib/behar-store";

/**
 * Recettes d'un atelier sans capacité de facturation.
 *
 * Un atelier immatriculé mesure son activité sur ses factures et ses règlements
 * déclarés. Sans facturation, ces objets n'existent pas : la seule trace d'une
 * affaire conclue est un dossier restitué, valorisé par son montant interne.
 */

/** Jour ISO local, n jours en arrière. */
export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Accepte l'ISO et les libellés français produits par le store. */
export function toIsoDay(value: unknown): string | null {
  const source = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(source)) return source.slice(0, 10);
  const french = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(source);
  if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
  return null;
}

/** Montant client du dossier, dans l'ordre de priorité utilisé par l'app. */
export function repairInternalTotal(repair: { total?: number | null; amount?: number | null }): number {
  const total = typeof repair.total === "number" ? repair.total : (repair.amount ?? 0);
  return Number.isFinite(total) && total > 0 ? total : 0;
}

/** Jour de restitution, seul marqueur de conclusion sans facturation. */
export function repairReturnedIsoDay(repair: Pick<Repair, "returnedAt" | "closedAt" | "status">): string | null {
  if (repair.status !== "Rendu") return null;
  return toIsoDay(repair.returnedAt) ?? toIsoDay(repair.closedAt);
}

/** Somme des dossiers restitués sur une fenêtre [from, to[ en jours ISO. */
export function repairRevenueBetween(repairs: Repair[], from: string, to?: string): number {
  let sum = 0;
  for (const repair of repairs) {
    const iso = repairReturnedIsoDay(repair);
    if (!iso || iso < from || (to && iso >= to)) continue;
    sum += repairInternalTotal(repair);
  }
  return sum;
}

/** Nombre de dossiers restitués sur la même fenêtre. */
export function repairReturnedCountBetween(repairs: Repair[], from: string, to?: string): number {
  let count = 0;
  for (const repair of repairs) {
    const iso = repairReturnedIsoDay(repair);
    if (!iso || iso < from || (to && iso >= to)) continue;
    count += 1;
  }
  return count;
}
