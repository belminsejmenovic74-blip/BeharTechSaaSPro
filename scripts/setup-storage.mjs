// Crée le bucket Supabase Storage `repair-photos` (idempotent) avec la service-role key.
// Équivalent fonctionnel de la migration 0007 pour la partie bucket.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Charge .env.local manuellement (un script node standalone ne le fait pas).
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ Clés Supabase manquantes dans .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const buckets = [
  {
    id: "repair-photos",
    opts: {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
    },
  },
  {
    id: "repair-documents",
    opts: {
      public: true,
      fileSizeLimit: 15 * 1024 * 1024,
      allowedMimeTypes: ["application/pdf"],
    },
  },
];

for (const { id, opts } of buckets) {
  const { error } = await admin.storage.createBucket(id, opts);
  if (error && !/already exists/i.test(error.message)) {
    console.error(`❌ Échec création bucket ${id} :`, error.message);
    process.exit(1);
  }
  if (error) {
    const { error: upErr } = await admin.storage.updateBucket(id, opts);
    if (upErr) {
      console.error(`❌ Échec maj bucket ${id} :`, upErr.message);
      process.exit(1);
    }
    console.log(`✅ Bucket '${id}' déjà présent — configuration mise à jour.`);
  } else {
    console.log(`✅ Bucket '${id}' créé (public).`);
  }
}

const { data: list } = await admin.storage.listBuckets();
console.log("Buckets actuels :", list?.map((b) => `${b.name}${b.public ? " (public)" : ""}`).join(", "));
