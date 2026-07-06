import { promises } from "node:fs";
import path from "node:path";
const DIR = path.join(process.cwd(), "static", "imgs");
const OK = /\.(png|jpe?g|webp|svg|gif|avif)$/i;
async function listMedia() {
  try {
    const files = await promises.readdir(DIR);
    return files.filter((f) => OK.test(f)).sort().map((f) => `/imgs/${f}`);
  } catch {
    return [];
  }
}
async function saveMedia(name, data) {
  await promises.mkdir(DIR, { recursive: true });
  const safe = name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "");
  const finalName = safe || `media-${Date.now()}.png`;
  await promises.writeFile(path.join(DIR, finalName), data);
  return `/imgs/${finalName}`;
}
export {
  listMedia as l,
  saveMedia as s
};
