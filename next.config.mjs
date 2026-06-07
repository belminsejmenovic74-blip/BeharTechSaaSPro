import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export statique (dossier `out/` à glisser sur Netlify) uniquement quand
  // STATIC_EXPORT=true (cf. `npm run build:static`). Sinon : runtime serveur.
  ...(process.env.STATIC_EXPORT === "true" ? { output: "export" } : {}),
  outputFileTracingRoot: projectRoot,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Déploiement runtime serveur (Vercel/Netlify Next runtime) : requis pour les API publiques Supabase.
  trailingSlash: true,

  images: {
    unoptimized: true,
  },

  /* Désactivé en dev : le compilateur React peut fortement ralentir le serveur / le hot reload */
  reactCompiler: process.env.NODE_ENV === "production",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
