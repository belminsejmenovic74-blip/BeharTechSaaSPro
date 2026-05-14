const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const excelFile = path.join(__dirname, "../catalogue_import_GLOBAL.xlsx");
const outputJson = path.join(__dirname, "../public/catalogues/global.json");

const DEVICE_LABELS = {
  smartphone: "Smartphone",
  tablet: "Tablette",
  computer: "Ordinateur",
  console: "Console",
  other: "Autre",
};

try {
  if (!fs.existsSync(excelFile)) {
    console.error("Fichier introuvable:", excelFile);
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelFile);

  let sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes("import behar tech"));
  if (!sheetName) sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const validLines = [];

  rows.forEach((row) => {
    const getVal = (keys) => {
      const key = Object.keys(row).find((k) => keys.includes(k.toLowerCase().trim()));
      return key ? String(row[key]) : "";
    };

    const typeAppareilRaw = getVal(["typeappareil", "type appareil", "type"]);
    const typeAppareil = Object.keys(DEVICE_LABELS).includes(typeAppareilRaw.toLowerCase())
      ? typeAppareilRaw.toLowerCase()
      : "smartphone";

    const marque = getVal(["marque"]);
    const modele = getVal(["modèle", "modele"]);
    const reparation = getVal(["réparation", "reparation"]);
    const piece = getVal(["pièce", "piece"]);
    const qualite = getVal(["qualité", "qualite"]) || "Standard";
    const sku = getVal(["sku", "référence", "reference"]);
    const fournisseur = getVal(["fournisseur"]);

    const parsePrice = (v) => Number.parseFloat(v.replace(",", ".")) || 0;
    const prixAchat = parsePrice(getVal(["prix achat", "prix d'achat", "prixachat"]));
    const prixVentePiece = parsePrice(getVal(["prix vente", "prix de vente", "prixventepiece"]));
    const mainOeuvre = parsePrice(getVal(["main oeuvre", "main-d'œuvre", "mainoeuvre", "m.o."]));
    const stockDisponibleRaw = getVal(["stock", "stock disponible", "stockdisponible"]);
    const stockDisponible = stockDisponibleRaw ? Number.parseFloat(stockDisponibleRaw) : undefined;
    const notes = getVal(["notes", "remarques"]);

    if (!marque || !modele || !reparation || !piece) {
      return;
    }

    // On pré-calcule les marges et totaux pour alléger le client
    const prixClientTotal = Math.round((prixVentePiece + mainOeuvre) * 100) / 100;
    const marge = Math.round((prixClientTotal - prixAchat) * 100) / 100;
    const margePourcentage = prixClientTotal > 0 ? Math.round((marge / prixClientTotal) * 10000) / 100 : 0;

    validLines.push({
      // Un ID unique pseudo-aléatoire
      id: `pre_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: "preloaded",
      typeAppareil,
      marque,
      modele,
      reparation,
      piece,
      qualite,
      sku: sku || undefined,
      prixAchat,
      mainOeuvre,
      prixVentePiece,
      prixClientTotal,
      marge,
      margePourcentage,
      fournisseur: fournisseur || undefined,
      stockDisponible,
      notes: notes || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  fs.writeFileSync(outputJson, JSON.stringify(validLines), "utf8");
  console.log(`Succès: ${validLines.length} lignes converties et sauvegardées dans ${outputJson}`);
} catch (err) {
  console.error("Erreur lors de la conversion", err);
  process.exit(1);
}
