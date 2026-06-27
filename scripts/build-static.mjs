// Build statique pour Netlify (drag & drop du dossier `out/`).
//
// Les routes `src/app/api/**` sont en `force-dynamic` (runtime serveur) et sont
// incompatibles avec `output: export`. On les déplace temporairement le temps du
// build, puis on les remet — quoi qu'il arrive (succès, erreur, Ctrl+C).
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = resolve(root, "src/app/api");
const apiStash = resolve(root, ".api.stash");

const telechargerDir = resolve(root, "src/app/(external)/telecharger/[token]");
const telechargerStash = resolve(root, ".telecharger.stash");

const formationDir = resolve(root, "src/app/formation/[slug]");
const formationStash = resolve(root, ".formation.stash");

const cmsEditDir = resolve(root, "src/app/(main)/admin/cms/edit/[id]");
const cmsEditStash = resolve(root, ".cmsedit.stash");

const licensesDir = resolve(root, "src/app/(main)/admin/licenses");
const licensesStash = resolve(root, ".licenses.stash");

function restore() {
  if (existsSync(apiStash)) renameSync(apiStash, apiDir);
  if (existsSync(telechargerStash)) renameSync(telechargerStash, telechargerDir);
  if (existsSync(formationStash)) renameSync(formationStash, formationDir);
  if (existsSync(cmsEditStash)) renameSync(cmsEditStash, cmsEditDir);
  if (existsSync(licensesStash)) renameSync(licensesStash, licensesDir);
}

process.on("SIGINT", () => {
  restore();
  process.exit(1);
});

try {
  if (existsSync(apiDir)) renameSync(apiDir, apiStash);
  if (existsSync(telechargerDir)) renameSync(telechargerDir, telechargerStash);
  if (existsSync(formationDir)) renameSync(formationDir, formationStash);
  if (existsSync(cmsEditDir)) renameSync(cmsEditDir, cmsEditStash);
  if (existsSync(licensesDir)) renameSync(licensesDir, licensesStash);

  const res = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "true" },
    shell: true,
  });

  process.exitCode = res.status ?? 1;
} finally {
  restore();
}
