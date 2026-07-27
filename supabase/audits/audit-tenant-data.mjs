#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const environmentArg = process.argv.find((value) => value.startsWith("--environment="));
const confirmArg = process.argv.find((value) => value.startsWith("--confirm="));
const outputArg = process.argv.find((value) => value.startsWith("--output="));
const environment = environmentArg?.split("=")[1] || "local";
const confirmation = confirmArg?.split("=")[1] || "";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = resolve(
  outputArg?.slice("--output=".length) || `supabase/audits/output/tenant-data-audit-${stamp}.json`,
);

if (apply && (environment !== "test" || confirmation !== "BEHAR_DELETE_PRECISE_TEST_ORPHANS")) {
  throw new Error(
    "Suppression refusée : --apply exige --environment=test --confirm=BEHAR_DELETE_PRECISE_TEST_ORPHANS.",
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.");

const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

async function allRows(table, select) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + 999);
    if (error) return { rows, error: error.message };
    rows.push(...(data || []));
    if ((data || []).length < 1000) return { rows };
  }
}

const [workshopsResult, repairsResult, messagesResult, eventsResult] = await Promise.all([
  allRows("workshops", "id"),
  allRows("repairs", "id,workshop_id,repair_number,public_token"),
  allRows("repair_messages", "id,workshop_id,repair_id,author_type,created_at"),
  allRows("repair_events", "id,workshop_id,repair_id,event_type,created_at"),
]);

const workshopIds = new Set(workshopsResult.rows.map((row) => row.id));
const repairs = new Map(repairsResult.rows.map((row) => [row.id, row]));
const orphanRepairs = repairsResult.rows.filter((row) => !workshopIds.has(row.workshop_id));
const mismatchedMessages = messagesResult.rows.filter((row) => {
  const repair = repairs.get(row.repair_id);
  return !repair || repair.workshop_id !== row.workshop_id;
});
const mismatchedEvents = eventsResult.rows.filter((row) => {
  const repair = repairs.get(row.repair_id);
  return !repair || repair.workshop_id !== row.workshop_id;
});

const tenantTables = [
  "clients",
  "quotes",
  "invoices",
  "payments",
  "sales",
  "documents",
  "stock_items",
  "purchases",
  "supplier_invoices",
  "workshop_snapshots",
];
const tableAudits = [];
for (const table of tenantTables) {
  const result = await allRows(table, "id,workshop_id");
  tableAudits.push({
    table,
    error: result.error,
    rowCount: result.rows.length,
    orphanWorkshopRows: result.rows.filter((row) => row.workshop_id && !workshopIds.has(row.workshop_id)),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: apply ? "apply-test-only" : "dry-run",
  environment,
  sourceHost: new URL(url).host,
  errors: {
    workshops: workshopsResult.error,
    repairs: repairsResult.error,
    repairMessages: messagesResult.error,
    repairEvents: eventsResult.error,
  },
  summary: {
    workshops: workshopIds.size,
    repairs: repairs.size,
    orphanRepairs: orphanRepairs.length,
    mismatchedMessages: mismatchedMessages.length,
    mismatchedEvents: mismatchedEvents.length,
    otherOrphans: tableAudits.reduce((sum, entry) => sum + entry.orphanWorkshopRows.length, 0),
  },
  targetedRecords: {
    orphanRepairs,
    mismatchedMessages,
    mismatchedEvents,
    tables: tableAudits,
  },
  deletion: { requested: apply, executed: false, deleted: {} },
};

await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (apply) {
  const deletionTargets = [
    ["repair_messages", mismatchedMessages.map((row) => row.id)],
    ["repair_events", mismatchedEvents.map((row) => row.id)],
  ];
  for (const [table, ids] of deletionTargets) {
    if (!ids.length) {
      report.deletion.deleted[table] = 0;
      continue;
    }
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) throw new Error(`Suppression ${table} échouée : ${error.message}`);
    report.deletion.deleted[table] = ids.length;
  }
  report.deletion.executed = true;
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({ outputPath, ...report.summary, deletion: report.deletion }, null, 2));
