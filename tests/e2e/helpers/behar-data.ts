/**
 * Catalogues de données pour la suite QA Behar Tech Pro.
 * Tous les enregistrements sont déterministes (pas de Math.random) pour que
 * deux runs produisent les mêmes datasets et que les assertions soient stables.
 */

export const LICENSES = {
  primary: "BHT-2026-PRO-002",
  others: [
    "BHT-2026-PRO-001",
    "BHT-PILOT-ANNEMASSE",
    "BHT-BEHAR-TECH-PRO",
    "BHT-PILOT-EXCLUSIF",
  ] as const,
} as const;

export const LICENSE_MAIN = (process.env.BEHAR_QA_LICENSE || LICENSES.primary).toUpperCase().trim();
export const LICENSE_ISOLATION = "BHT-PILOT-ANNEMASSE";

export const STORAGE_KEY = "behar-tech-local-demo-v3";

export function runId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `QA-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ── Clients (30) ───────────────────────────────────────────────────────────
export const SEED_CUSTOMERS: { name: string; phone: string; email: string; address: string }[] = [
  ["Dupont Jean", "06 11 11 11 01", "jean.dupont@mail.fr", "1 rue Lafayette, Annemasse"],
  ["Martin Sophie", "06 11 11 11 02", "sophie.martin@mail.fr", "5 rue de la Paix, Annemasse"],
  ["Bernard Paul", "06 11 11 11 03", "paul.bernard@mail.fr", "8 rue des Lilas, Annemasse"],
  ["Petit Marie", "06 11 11 11 04", "marie.petit@mail.fr", "12 avenue du Mont, Annemasse"],
  ["Robert Luc", "06 11 11 11 05", "luc.robert@mail.fr", "3 chemin du Lac, Annemasse"],
  ["Richard Anne", "06 11 11 11 06", "anne.richard@mail.fr", "9 rue Carnot, Annemasse"],
  ["Durand Pierre", "06 11 11 11 07", "pierre.durand@mail.fr", "14 boulevard Gambetta, Annemasse"],
  ["Moreau Claire", "06 11 11 11 08", "claire.moreau@mail.fr", "22 rue Voltaire, Annemasse"],
  ["Laurent Hugo", "06 11 11 11 09", "hugo.laurent@mail.fr", "2 rue Rousseau, Annemasse"],
  ["Simon Léa", "06 11 11 11 10", "lea.simon@mail.fr", "6 rue Diderot, Annemasse"],
  ["Michel Alex", "06 11 11 11 11", "alex.michel@mail.fr", "17 rue Hugo, Annemasse"],
  ["Garcia Inès", "06 11 11 11 12", "ines.garcia@mail.fr", "21 rue Zola, Annemasse"],
  ["David Tom", "06 11 11 11 13", "tom.david@mail.fr", "4 rue Foch, Annemasse"],
  ["Bertrand Eva", "06 11 11 11 14", "eva.bertrand@mail.fr", "11 rue Joffre, Annemasse"],
  ["Roux Maxime", "06 11 11 11 15", "max.roux@mail.fr", "19 rue Pasteur, Annemasse"],
  ["Vincent Julie", "06 11 11 11 16", "julie.vincent@mail.fr", "7 rue Curie, Annemasse"],
  ["Fournier Sam", "06 11 11 11 17", "sam.fournier@mail.fr", "16 rue Branly, Annemasse"],
  ["Morel Lola", "06 11 11 11 18", "lola.morel@mail.fr", "13 rue Renoir, Annemasse"],
  ["Girard Noah", "06 11 11 11 19", "noah.girard@mail.fr", "20 rue Monet, Annemasse"],
  ["Andre Lina", "06 11 11 11 20", "lina.andre@mail.fr", "23 rue Degas, Annemasse"],
  ["Lefevre Théo", "06 11 11 11 21", "theo.lefevre@mail.fr", "26 rue Cézanne, Annemasse"],
  ["Mercier Mia", "06 11 11 11 22", "mia.mercier@mail.fr", "28 rue Gauguin, Annemasse"],
  ["Dupuis Adam", "06 11 11 11 23", "adam.dupuis@mail.fr", "31 rue Matisse, Annemasse"],
  ["Lambert Zoé", "06 11 11 11 24", "zoe.lambert@mail.fr", "33 rue Chagall, Annemasse"],
  ["Bonnet Léo", "06 11 11 11 25", "leo.bonnet@mail.fr", "36 rue Dalí, Annemasse"],
  ["François Nina", "06 11 11 11 26", "nina.francois@mail.fr", "38 rue Picasso, Annemasse"],
  ["Martinez Liam", "06 11 11 11 27", "liam.martinez@mail.fr", "41 rue Klee, Annemasse"],
  ["Legrand Eva", "06 11 11 11 28", "eva.legrand@mail.fr", "43 rue Miro, Annemasse"],
  ["Garnier Owen", "06 11 11 11 29", "owen.garnier@mail.fr", "46 rue Magritte, Annemasse"],
  ["Faure Camille", "06 11 11 11 30", "camille.faure@mail.fr", "49 rue Bonnard, Annemasse"],
].map(([name, phone, email, address]) => ({ name, phone, email, address }));

// ── Stock (100) ────────────────────────────────────────────────────────────
const stockCategories: { prefix: string; name: string; supplier: string; purchase: number; sale: number; threshold: number }[] = [
  { prefix: "SCR-IP", name: "Écran iPhone", supplier: "Mobilax", purchase: 35, sale: 80, threshold: 3 },
  { prefix: "BAT-IP", name: "Batterie iPhone", supplier: "Mobilax", purchase: 12, sale: 35, threshold: 5 },
  { prefix: "CHG-IP", name: "Connecteur charge iPhone", supplier: "Wholesale GSM", purchase: 8, sale: 25, threshold: 4 },
  { prefix: "HDMI-PS5", name: "Port HDMI PS5", supplier: "Console Parts", purchase: 18, sale: 55, threshold: 2 },
  { prefix: "JOY-PS5", name: "Joystick PS5", supplier: "Console Parts", purchase: 9, sale: 30, threshold: 3 },
  { prefix: "BAT-MBK", name: "Batterie MacBook", supplier: "Apple Parts EU", purchase: 60, sale: 140, threshold: 2 },
  { prefix: "SCR-IPAD", name: "Écran iPad", supplier: "Apple Parts EU", purchase: 70, sale: 160, threshold: 2 },
  { prefix: "SCR-SAM", name: "Écran Samsung", supplier: "Samsung Pro", purchase: 50, sale: 120, threshold: 3 },
  { prefix: "SCR-XIA", name: "Écran Xiaomi", supplier: "Asia GSM", purchase: 28, sale: 75, threshold: 3 },
  { prefix: "GEN-MIX", name: "Pièce générique", supplier: "Local", purchase: 4, sale: 15, threshold: 6 },
];

export const SEED_STOCK = Array.from({ length: 100 }, (_, i) => {
  const cat = stockCategories[i % stockCategories.length];
  const variant = Math.floor(i / stockCategories.length) + 1;
  return {
    name: `${cat.name} #${variant.toString().padStart(2, "0")}`,
    sku: `${cat.prefix}-${variant.toString().padStart(3, "0")}`,
    supplier: cat.supplier,
    purchasePrice: cat.purchase + (variant - 1) * 2,
    salePrice: cat.sale + (variant - 1) * 3,
    quantity: 10 + (i % 5),
    threshold: cat.threshold,
  };
});

// ── Réparations critiques (financier) ──────────────────────────────────────
export const CRITICAL_REPAIRS = [
  { device: "Apple iPhone 11", brand: "Apple", model: "iPhone 11", issue: "Écran cassé", part: 90, labor: 29, total: 119 },
  { device: "Samsung Galaxy S22", brand: "Samsung", model: "Galaxy S22", issue: "Connecteur charge", part: 80, labor: 29, total: 109 },
  { device: "PlayStation 5", brand: "Sony", model: "PS5", issue: "Port HDMI", part: 120, labor: 49, total: 169 },
  { device: "MacBook Pro 13", brand: "Apple", model: "MacBook Pro 13", issue: "Batterie HS", part: 140, labor: 59, total: 199 },
  { device: "iPad Air", brand: "Apple", model: "iPad Air", issue: "Diagnostic", part: 0, labor: 0, total: 0 }, // bloquant
] as const;

export const REPAIR_STATUSES = ["Reçu", "Diagnostic", "Réparation", "Test final", "Prêt", "Livré"] as const;

// ── Rendez-vous (20) ───────────────────────────────────────────────────────
export const SEED_APPOINTMENTS = Array.from({ length: 20 }, (_, i) => ({
  customerIndex: i % SEED_CUSTOMERS.length,
  device: i % 2 === 0 ? "iPhone" : "Samsung Galaxy",
  issue: i % 2 === 0 ? "Diagnostic écran" : "Batterie faible",
  hourOffset: i + 1,
}));
