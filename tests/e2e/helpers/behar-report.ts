/**
 * Collecteur de checkpoints QA + écriture du rapport final
 * (qa-results/behar-qa-report.md + .json).
 *
 * Conçu pour ne JAMAIS faire échouer le test — chaque checkpoint ajoute une
 * entrée, et on consolide à la fin. Une mission de QA doit produire un
 * rapport même si certaines étapes plantent.
 */

import fs from "node:fs";
import path from "node:path";

export type Severity = "P0" | "P1" | "P2";
export type Status = "OK" | "FAIL" | "PARTIAL" | "BLOCKED";

export interface Checkpoint {
  id: string;
  module: string;
  title: string;
  status: Status;
  severity?: Severity;
  expected?: string;
  observed?: string;
  steps?: string[];
  screenshot?: string;
  consoleError?: string;
  networkError?: string;
  businessImpact?: string;
  durationMs?: number;
  poste?: string;
}

const checkpoints: Checkpoint[] = [];
let startedAt = Date.now();
const counters: Record<string, number> = {
  customers: 0,
  stock: 0,
  repairs: 0,
  quotes: 0,
  invoices: 0,
  payments: 0,
  appointments: 0,
  intakes: 0,
};

export const Report = {
  reset(): void {
    checkpoints.length = 0;
    startedAt = Date.now();
    for (const k of Object.keys(counters)) counters[k] = 0;
  },
  add(cp: Checkpoint): void {
    checkpoints.push(cp);
    if (process.env.BEHAR_QA_VERBOSE) {
      // eslint-disable-next-line no-console
      console.log(`[${cp.status}${cp.severity ? `/${cp.severity}` : ""}] ${cp.id} — ${cp.title}`);
    }
  },
  bump(kind: keyof typeof counters, n = 1): void {
    counters[kind] += n;
  },
  count(kind: keyof typeof counters): number {
    return counters[kind];
  },
  list(): Readonly<Checkpoint[]> {
    return checkpoints;
  },
  write(outDir = "qa-results"): { md: string; json: string } {
    fs.mkdirSync(outDir, { recursive: true });
    const ok = checkpoints.filter((c) => c.status === "OK").length;
    const fail = checkpoints.filter((c) => c.status === "FAIL").length;
    const partial = checkpoints.filter((c) => c.status === "PARTIAL").length;
    const blocked = checkpoints.filter((c) => c.status === "BLOCKED").length;
    const p0 = checkpoints.filter((c) => c.severity === "P0" && c.status !== "OK");
    const p1 = checkpoints.filter((c) => c.severity === "P1" && c.status !== "OK");
    const p2 = checkpoints.filter((c) => c.severity === "P2" && c.status !== "OK");
    const total = checkpoints.length || 1;
    // Score : OK = 100%, PARTIAL = 50%, BLOCKED = 0%, FAIL = 0%
    const score = Math.round(((ok + partial * 0.5) / total) * 100);
    const durationMs = Date.now() - startedAt;

    const verdict =
      p0.length === 0 && fail < total * 0.1
        ? "Vendable pour les ateliers pilotes (sous réserve des P1 listés)."
        : p0.length > 0
          ? "PAS VENDABLE — bloqueurs P0 à corriger avant toute vente."
          : "Démo possible — non vendable en l'état.";

    const json = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      durationMs,
      summary: {
        score,
        total: checkpoints.length,
        ok,
        fail,
        partial,
        blocked,
        p0: p0.length,
        p1: p1.length,
        p2: p2.length,
      },
      verdict,
      counters,
      checkpoints,
    };
    const jsonPath = path.join(outDir, "behar-qa-report.json");
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8");

    const md = renderMarkdown({ ok, fail, partial, blocked, p0, p1, p2, score, durationMs, verdict });
    const mdPath = path.join(outDir, "behar-qa-report.md");
    fs.writeFileSync(mdPath, md, "utf8");
    return { md: mdPath, json: jsonPath };
  },
};

function renderMarkdown(s: {
  ok: number;
  fail: number;
  partial: number;
  blocked: number;
  p0: Checkpoint[];
  p1: Checkpoint[];
  p2: Checkpoint[];
  score: number;
  durationMs: number;
  verdict: string;
}): string {
  const fmt = (c: Checkpoint) =>
    [
      `### ${c.id} — ${c.title}`,
      `- **Module** : ${c.module}`,
      c.poste ? `- **Poste** : ${c.poste}` : "",
      `- **Statut** : ${c.status}${c.severity ? ` (${c.severity})` : ""}`,
      c.expected ? `- **Attendu** : ${c.expected}` : "",
      c.observed ? `- **Obtenu** : ${c.observed}` : "",
      c.steps?.length ? `- **Étapes** :\n${c.steps.map((s) => `  1. ${s}`).join("\n")}` : "",
      c.screenshot ? `- **Capture** : ${c.screenshot}` : "",
      c.consoleError ? `- **Console** : \`${c.consoleError.replace(/\n/g, " ")}\`` : "",
      c.networkError ? `- **Réseau** : \`${c.networkError.replace(/\n/g, " ")}\`` : "",
      c.businessImpact ? `- **Impact business** : ${c.businessImpact}` : "",
      "",
    ]
      .filter(Boolean)
      .join("\n");

  const top10 = [...s.p0, ...s.p1, ...s.p2].slice(0, 10);

  return `# Behar Tech Pro — Rapport QA Playwright complet

_Généré le ${new Date().toISOString()} — durée ${(s.durationMs / 1000).toFixed(1)} s_

## Résumé
- **Score global** : ${s.score}/100
- **Checkpoints** : ${s.ok + s.fail + s.partial + s.blocked}
- OK : ${s.ok}
- FAIL : ${s.fail}
- PARTIAL : ${s.partial}
- BLOCKED : ${s.blocked}
- P0 : ${s.p0.length}
- P1 : ${s.p1.length}
- P2 : ${s.p2.length}

## Verdict
${s.verdict}

## P0 (bloqueurs)
${s.p0.length === 0 ? "_Aucun P0 détecté._" : s.p0.map(fmt).join("\n")}

## P1 (importants)
${s.p1.length === 0 ? "_Aucun P1 détecté._" : s.p1.map(fmt).join("\n")}

## P2 (mineurs)
${s.p2.length === 0 ? "_Aucun P2 détecté._" : s.p2.map(fmt).join("\n")}

## Données créées
- Clients : ${counters.customers}
- Stock : ${counters.stock}
- Réparations : ${counters.repairs}
- Devis : ${counters.quotes}
- Factures : ${counters.invoices}
- Paiements : ${counters.payments}
- Rendez-vous : ${counters.appointments}
- Anti-litige : ${counters.intakes}

## Top 10 corrections prioritaires
${top10.length === 0 ? "_Aucune correction critique._" : top10.map((c, i) => `${i + 1}. **[${c.severity}]** ${c.title} — ${c.module}`).join("\n")}

## Conclusion
${s.verdict}
`;
}

export { counters as reportCounters };
