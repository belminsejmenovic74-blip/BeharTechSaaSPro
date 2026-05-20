import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config — APK Android Behar Tech Pro.
 *
 * - `webDir: "out"` : Next.js avec `output: "export"` génère `out/` (pas `dist/`).
 * - Pas de `server.url` : l'APK doit utiliser les assets embarqués (mode hors ligne).
 * - `androidScheme: "https"` : recommandé pour éviter les problèmes de localStorage
 *   et de fetch sur le scheme `file://`.
 */
const config: CapacitorConfig = {
  appId: "fr.behartech.pro",
  appName: "Behar Tech Pro",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    // Couleur de l'écran de démarrage pour rester cohérent avec la DA (#FAFAF8).
    backgroundColor: "#FAFAF8",
  },
};

export default config;
