/**
 * Heuristiques pour extraire la gamme (série) d'un modèle d'appareil.
 * Regroupements pensés pour qu'un réparateur trouve un modèle sans deviner où il est.
 */
export function getDeviceSeries(brand: string, model: string): string {
  const b = (brand || "").toLowerCase();
  const m = (model || "").trim();
  const ml = m.toLowerCase();

  if (b.includes("apple") && !b.includes("ipad") && !b.includes("mac")) {
    if (ml.includes("iphone se")) return "iPhone SE";
    if (/iphone\s+(6|7|8)\b/.test(ml)) return "iPhone 6 / 6s / 7 / 8";
    if (/iphone\s+(x|xr|xs)\b/.test(ml)) return "iPhone X / XR / XS";
    if (/iphone\s+11\b/.test(ml)) return "iPhone 11";
    if (/iphone\s+12\b/.test(ml)) return "iPhone 12";
    if (/iphone\s+13\b/.test(ml)) return "iPhone 13";
    if (/iphone\s+14\b/.test(ml)) return "iPhone 14";
    if (/iphone\s+15\b/.test(ml)) return "iPhone 15";
    if (/iphone\s+16\b/.test(ml)) return "iPhone 16";
    if (/iphone\s+17\b/.test(ml)) return "iPhone 17";
    return "Autres iPhone";
  }

  if (b.includes("ipad")) {
    if (ml.includes("ipad pro")) return "iPad Pro";
    if (ml.includes("ipad air")) return "iPad Air";
    if (ml.includes("ipad mini")) return "iPad mini";
    return "iPad";
  }

  if (b.includes("mac")) {
    if (ml.includes("macbook pro")) return "MacBook Pro";
    if (ml.includes("macbook air")) return "MacBook Air";
    if (ml.includes("imac")) return "iMac";
    if (ml.includes("mac mini")) return "Mac mini";
    if (ml.includes("mac studio")) return "Mac Studio";
    if (ml.includes("mac pro")) return "Mac Pro";
    return "Autres Mac";
  }

  if (b.includes("samsung")) {
    if (ml.startsWith("galaxy tab")) return "Galaxy Tab";
    if (ml.startsWith("galaxy s")) return "Galaxy S";
    if (ml.startsWith("galaxy a")) return "Galaxy A";
    if (ml.startsWith("galaxy z flip")) return "Galaxy Z Flip";
    if (ml.startsWith("galaxy z fold")) return "Galaxy Z Fold";
    if (ml.startsWith("galaxy note")) return "Galaxy Note";
    if (ml.startsWith("galaxy m")) return "Galaxy M";
    if (ml.startsWith("galaxy j")) return "Galaxy J";
    return "Autres Galaxy";
  }

  if (b.includes("xiaomi")) {
    if (ml.startsWith("redmi note")) return "Redmi Note";
    if (ml.startsWith("redmi")) return "Redmi";
    if (ml.startsWith("poco")) return "Poco";
    if (/xiaomi\s+(1[1-9]|[2-9]\d)/i.test(ml)) {
      const year = ml.match(/xiaomi\s+(\d+)/i)?.[1];
      return year ? `Xiaomi ${year}` : "Xiaomi";
    }
    if (ml.startsWith("xiaomi") || ml.startsWith("mi ")) return "Xiaomi Mi";
    return "Autres Xiaomi";
  }

  if (b.includes("google")) {
    if (ml.includes("pixel")) return "Pixel";
    return "Autres Google";
  }

  if (b.includes("sony") && (ml.includes("playstation") || ml.includes("ps"))) {
    if (ml.includes("playstation 5") || ml.includes("ps5")) return "PlayStation 5";
    if (ml.includes("playstation 4") || ml.includes("ps4")) return "PlayStation 4";
    if (ml.includes("playstation 3") || ml.includes("ps3")) return "PlayStation 3";
    if (ml.includes("portal")) return "PlayStation Portal";
    return "PlayStation";
  }

  if (b.includes("sony")) {
    if (ml.includes("xperia")) return "Xperia";
    return "Autres Sony";
  }

  if (b.includes("nintendo")) {
    if (ml.includes("switch")) return "Switch";
    if (ml.includes("3ds") || ml.includes("2ds") || ml.includes("ds")) return "DS / 3DS";
    if (ml.includes("wii")) return "Wii";
    return "Autres Nintendo";
  }

  if (b.includes("microsoft") || b.includes("xbox")) {
    if (ml.includes("xbox series")) return "Xbox Series";
    if (ml.includes("xbox one")) return "Xbox One";
    if (ml.includes("xbox 360")) return "Xbox 360";
    if (ml.includes("surface")) return "Surface";
    return "Autres Xbox";
  }

  if (b.includes("pc") || b.includes("portable") || b.includes("laptop")) {
    if (ml.startsWith("lenovo")) return "Lenovo";
    if (ml.startsWith("dell")) return "Dell";
    if (ml.startsWith("hp")) return "HP";
    if (ml.startsWith("asus")) return "Asus";
    if (ml.startsWith("acer")) return "Acer";
    if (ml.startsWith("msi")) return "MSI";
    return "Autres PC portables";
  }

  return "Autres modèles";
}

/**
 * Recherche libre d'un modèle à travers TOUT le catalogue d'une marque.
 * Permet à un réparateur de taper "iPhone XR" ou "Switch OLED" sans deviner la gamme.
 */
export function findModelAcrossSeries(
  models: string[],
  query: string,
): { model: string; score: number } | null {
  const q = (query || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!q) return null;
  const tokens = q.split(" ").filter(Boolean);
  if (!tokens.length) return null;

  let best: { model: string; score: number } | null = null;
  for (const model of models) {
    const norm = model
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s+/g, " ");
    if (norm === q) return { model, score: 100 };
    const score = tokens.reduce((acc, t) => (norm.includes(t) ? acc + t.length : acc), 0);
    if (score > 0 && (!best || score > best.score)) best = { model, score };
  }
  return best;
}
