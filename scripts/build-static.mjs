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
const stash = resolve(root, ".api.stash");

function restore() {
  if (existsSync(stash)) renameSync(stash, apiDir);
}

process.on("SIGINT", () => {
  restore();
  process.exit(1);
});

try {
  if (existsSync(apiDir)) renameSync(apiDir, stash);

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
