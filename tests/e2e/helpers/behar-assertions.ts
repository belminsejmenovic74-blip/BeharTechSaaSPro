import type { Page } from "@playwright/test";

import { snap } from "./behar-actions";
import { type Checkpoint, Report, type Severity, type Status } from "./behar-report";

/**
 * Exécute une assertion sans interrompre la suite : capture toute exception,
 * la stocke dans le rapport sous forme de checkpoint, puis continue.
 */
export async function check(
  page: Page | null,
  cp: Omit<Checkpoint, "status"> & { severity?: Severity },
  fn: () => Promise<void> | void,
): Promise<Status> {
  const t0 = Date.now();
  try {
    await fn();
    Report.add({ ...cp, status: "OK", durationMs: Date.now() - t0 });
    return "OK";
  } catch (e: any) {
    const screenshot = page ? await snap(page, cp.id) : undefined;
    Report.add({
      ...cp,
      status: "FAIL",
      observed: cp.observed ?? (e?.message?.slice(0, 400) || "Exception non décrite"),
      screenshot,
      durationMs: Date.now() - t0,
    });
    return "FAIL";
  }
}

/** Marque un checkpoint comme BLOCKED (module absent, prérequis manquant). */
export function blocked(cp: Omit<Checkpoint, "status">): void {
  Report.add({ ...cp, status: "BLOCKED" });
}

/** Marque un checkpoint comme PARTIAL (a passé partiellement, à investiguer manuellement). */
export function partial(cp: Omit<Checkpoint, "status">): void {
  Report.add({ ...cp, status: "PARTIAL" });
}

export function ok(cp: Omit<Checkpoint, "status">): void {
  Report.add({ ...cp, status: "OK" });
}

export function fail(cp: Omit<Checkpoint, "status"> & { severity: Severity }): void {
  Report.add({ ...cp, status: "FAIL" });
}
