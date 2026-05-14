export type DeviceCategory = "smartphone" | "tablet" | "computer" | "console";

export type DeviceBrand = {
  brand: string;
  aliases: string[];
  category: DeviceCategory;
  models: string[];
};

export type DeviceSearchResult = {
  brand: string;
  model: string;
  category: DeviceCategory;
  label: string;
};

export const deviceCatalog: DeviceBrand[] = [
  {
    brand: "Apple",
    aliases: ["apple", "iphone", "iphone air", "iphone 17 air", "17 air", "air", "ios", "i phone"],
    category: "smartphone",
    models: [
      "iPhone SE 1re génération",
      "iPhone SE 2e génération",
      "iPhone SE 3e génération",
      "iPhone 6",
      "iPhone 6 Plus",
      "iPhone 6s",
      "iPhone 6s Plus",
      "iPhone 7",
      "iPhone 7 Plus",
      "iPhone 8",
      "iPhone 8 Plus",
      "iPhone X",
      "iPhone XR",
      "iPhone XS",
      "iPhone XS Max",
      "iPhone 11",
      "iPhone 11 Pro",
      "iPhone 11 Pro Max",
      "iPhone 12 mini",
      "iPhone 12",
      "iPhone 12 Pro",
      "iPhone 12 Pro Max",
      "iPhone 13 mini",
      "iPhone 13",
      "iPhone 13 Pro",
      "iPhone 13 Pro Max",
      "iPhone 14",
      "iPhone 14 Plus",
      "iPhone 14 Pro",
      "iPhone 14 Pro Max",
      "iPhone 15",
      "iPhone 15 Plus",
      "iPhone 15 Pro",
      "iPhone 15 Pro Max",
      "iPhone 16",
      "iPhone 16 Plus",
      "iPhone 16 Pro",
      "iPhone 16 Pro Max",
      "iPhone 17",
      "iPhone 17 Plus",
      "iPhone 17 Pro",
      "iPhone 17 Pro Max",
      "iPhone 17 Air",
    ],
  },
  {
    brand: "Samsung",
    aliases: ["samsung", "galaxy", "samsung galaxy"],
    category: "smartphone",
    models: [
      "Galaxy S24 Ultra",
      "Galaxy S24+",
      "Galaxy S24",
      "Galaxy S23 Ultra",
      "Galaxy S23+",
      "Galaxy S23",
      "Galaxy S22 Ultra",
      "Galaxy S22+",
      "Galaxy S22",
      "Galaxy S21 Ultra",
      "Galaxy S21+",
      "Galaxy S21",
      "Galaxy S21 FE",
      "Galaxy S20 Ultra",
      "Galaxy S20+",
      "Galaxy S20",
      "Galaxy S20 FE",
      "Galaxy S10+",
      "Galaxy S10",
      "Galaxy S10e",
      "Galaxy S9+",
      "Galaxy S9",
      "Galaxy S8+",
      "Galaxy S8",
      "Galaxy Note 20 Ultra",
      "Galaxy Note 20",
      "Galaxy Note 10+",
      "Galaxy Note 10",
      "Galaxy Z Fold 6",
      "Galaxy Z Fold 5",
      "Galaxy Z Fold 4",
      "Galaxy Z Fold 3",
      "Galaxy Z Flip 6",
      "Galaxy Z Flip 5",
      "Galaxy Z Flip 4",
      "Galaxy Z Flip 3",
      "Galaxy A55",
      "Galaxy A54",
      "Galaxy A53",
      "Galaxy A52s",
      "Galaxy A52",
      "Galaxy A35",
      "Galaxy A34",
      "Galaxy A33",
      "Galaxy A15",
      "Galaxy A14",
      "Galaxy A13",
      "Galaxy A05s",
    ],
  },
  {
    brand: "Google",
    aliases: ["google", "pixel"],
    category: "smartphone",
    models: [
      "Pixel 9 Pro XL",
      "Pixel 9 Pro",
      "Pixel 9",
      "Pixel 9 Pro Fold",
      "Pixel 8 Pro",
      "Pixel 8",
      "Pixel 8a",
      "Pixel 7 Pro",
      "Pixel 7",
      "Pixel 7a",
      "Pixel 6 Pro",
      "Pixel 6",
      "Pixel 6a",
      "Pixel 5",
      "Pixel 4 XL",
      "Pixel 4",
      "Pixel 4a",
    ],
  },
  {
    brand: "Xiaomi",
    aliases: ["xiaomi", "redmi", "poco", "mi"],
    category: "smartphone",
    models: [
      "Xiaomi 14 Ultra",
      "Xiaomi 14",
      "Xiaomi 13 Ultra",
      "Xiaomi 13 Pro",
      "Xiaomi 13",
      "Xiaomi 13T Pro",
      "Xiaomi 13T",
      "Xiaomi 12 Pro",
      "Xiaomi 12",
      "Redmi Note 13 Pro+",
      "Redmi Note 13 Pro",
      "Redmi Note 13",
      "Redmi Note 12 Pro",
      "Redmi Note 12",
      "Redmi 13C",
      "Redmi 12",
      "Poco F6 Pro",
      "Poco F6",
      "Poco X6 Pro",
      "Poco M6 Pro",
    ],
  },
  {
    brand: "Huawei",
    aliases: ["huawei", "honor"],
    category: "smartphone",
    models: ["P60 Pro", "P50 Pro", "Mate 50 Pro", "P40 Pro", "P40", "P30 Pro", "P30", "P30 Lite", "Nova 11", "Nova 10"],
  },
  {
    brand: "Sony",
    aliases: ["sony", "xperia"],
    category: "smartphone",
    models: ["Xperia 1 VI", "Xperia 1 V", "Xperia 5 V", "Xperia 10 VI", "Xperia 10 V"],
  },
  {
    brand: "OnePlus",
    aliases: ["oneplus", "1+"],
    category: "smartphone",
    models: [
      "OnePlus 12",
      "OnePlus 12R",
      "OnePlus Open",
      "OnePlus 11",
      "OnePlus 10 Pro",
      "OnePlus Nord 4",
      "OnePlus Nord 3",
      "OnePlus Nord CE 4",
    ],
  },
  {
    brand: "Oppo",
    aliases: ["oppo", "find", "reno"],
    category: "smartphone",
    models: ["Find X7 Ultra", "Find X6 Pro", "Find N3", "Find N3 Flip", "Reno 12 Pro", "Reno 11", "A98", "A78"],
  },
  {
    brand: "Apple (iPad)",
    aliases: ["ipad", "apple tablet", "ipad pro", "ipad air", "ipad mini"],
    category: "tablet",
    models: [
      "iPad Pro 13 (M4)",
      "iPad Pro 11 (M4)",
      "iPad Pro 12.9 (6e gén)",
      "iPad Pro 11 (4e gén)",
      "iPad Air 13 (M2)",
      "iPad Air 11 (M2)",
      "iPad Air (5e gén)",
      "iPad (10e gén)",
      "iPad (9e gén)",
      "iPad mini (6e gén)",
    ],
  },
  {
    brand: "Samsung (Tab)",
    aliases: ["samsung tab", "galaxy tab"],
    category: "tablet",
    models: [
      "Galaxy Tab S9 Ultra",
      "Galaxy Tab S9+",
      "Galaxy Tab S9",
      "Galaxy Tab S9 FE",
      "Galaxy Tab S8 Ultra",
      "Galaxy Tab A9+",
      "Galaxy Tab A8",
    ],
  },
  {
    brand: "Apple (Mac)",
    aliases: ["macbook", "imac", "mac mini", "mac pro", "apple computer"],
    category: "computer",
    models: [
      "MacBook Pro 14 (M3)",
      "MacBook Pro 16 (M3)",
      "MacBook Air 13 (M3)",
      "MacBook Air 15 (M3)",
      "MacBook Pro 14 (M2)",
      "MacBook Pro 16 (M2)",
      "MacBook Air (M2)",
      "iMac 24 (M3)",
      "Mac mini (M2)",
      "Mac Studio (M2)",
    ],
  },
  {
    brand: "PC Portable",
    aliases: ["laptop", "pc", "dell", "hp", "asus", "lenovo", "acer", "msi"],
    category: "computer",
    models: [
      "Dell XPS 13",
      "Dell XPS 15",
      "HP Spectre x360",
      "HP Envy",
      "Asus Zenbook",
      "Asus ROG",
      "Lenovo Yoga",
      "Lenovo ThinkPad",
      "Acer Swift",
      "MSI Stealth",
    ],
  },
  {
    brand: "Sony (PlayStation)",
    aliases: ["ps5", "ps4", "playstation", "ps3"],
    category: "console",
    models: [
      "PlayStation 5 Slim",
      "PlayStation 5",
      "PlayStation 4 Pro",
      "PlayStation 4 Slim",
      "PlayStation 4",
      "PlayStation Portal",
    ],
  },
  {
    brand: "Microsoft (Xbox)",
    aliases: ["xbox", "xbox series", "xbox one"],
    category: "console",
    models: ["Xbox Series X", "Xbox Series S", "Xbox One X", "Xbox One S", "Xbox One"],
  },
  {
    brand: "Nintendo",
    aliases: ["switch", "nintendo switch", "ds", "3ds", "wii"],
    category: "console",
    models: ["Switch OLED", "Switch", "Switch Lite", "New 3DS XL", "2DS XL"],
  },
];

export function getDeviceBrands(category?: DeviceCategory): DeviceBrand[] {
  if (!category) return deviceCatalog;
  return deviceCatalog.filter((item) => item.category === category);
}

export function getModelsByBrand(brandName: string, category?: DeviceCategory): string[] {
  const brand = deviceCatalog.find(
    (item) => item.brand.toLowerCase() === brandName.toLowerCase() && (!category || item.category === category),
  );
  return brand ? brand.models : [];
}

export function searchDevices(query: string): DeviceSearchResult[] {
  const results: DeviceSearchResult[] = [];
  const lowQuery = query.toLowerCase();

  for (const item of deviceCatalog) {
    const brandMatch =
      item.brand.toLowerCase().includes(lowQuery) ||
      item.aliases.some((alias) => alias.toLowerCase().includes(lowQuery));

    for (const model of item.models) {
      if (brandMatch || model.toLowerCase().includes(lowQuery)) {
        results.push({
          brand: item.brand,
          model: model,
          category: item.category,
          label: `${item.brand} ${model}`,
        });
      }
    }
  }

  return results.slice(0, 10);
}
