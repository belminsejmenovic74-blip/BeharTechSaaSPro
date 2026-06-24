// marketData — Donnees marche occasion par modele (smartphones, tablettes, ordinateurs, consoles).
// Genere depuis les bots Leboncoin (donnees reelles) + modele d'estimation Behar Tech.
// source: "reel" = mesure par scraping (echantillon >=50 annonces) ; "estime" = approxime.
// Ces valeurs sont des DEFAULTS prechargees : surchargeables par le reparateur (Parametres).
// Genere le 2026-06-09. Devise: EUR. Reference temporelle: 2026.

import type { DeviceCategory } from "@/data/deviceCatalog";

export type MarketDataSource = "reel" | "estime" | "manuel";

export type ModelMarketData = {
  brand: string;
  model: string;
  category: DeviceCategory;
  /** Prix moyen occasion observe/estime sur Leboncoin (EUR). */
  prixMoyen: number;
  /** Bas de fourchette de prix (EUR). */
  prixMin: number;
  /** Haut de fourchette de prix (EUR). */
  prixMax: number;
  /** Prix median reconditionne chez les concurrents internet (BackMarket, etc.), null si non mesure. */
  prixInternet: number | null;
  /** Part des annonces vendues sur la periode (%). */
  tauxVente: number;
  /** Temps moyen avant vente (jours). */
  joursMoyenVente: number;
  /** Score de demande synthetique 0-100 (plus c'est haut, plus ca se vend vite et souvent). */
  scoreDemande: number;
  /** Origine de la donnee. */
  source: MarketDataSource;
};

export const marketData: ModelMarketData[] = [
  { brand: "Apple", model: "iPhone SE 1re génération", category: "smartphone", prixMoyen: 40, prixMin: 25, prixMax: 58, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone SE 2e génération", category: "smartphone", prixMoyen: 85, prixMin: 53, prixMax: 123, prixInternet: null, tauxVente: 49, joursMoyenVente: 11.4, scoreDemande: 41, source: "estime" },
  { brand: "Apple", model: "iPhone SE 3e génération", category: "smartphone", prixMoyen: 130, prixMin: 81, prixMax: 188, prixInternet: null, tauxVente: 60, joursMoyenVente: 6.2, scoreDemande: 61, source: "estime" },
  { brand: "Apple", model: "iPhone 6", category: "smartphone", prixMoyen: 35, prixMin: 22, prixMax: 51, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone 6 Plus", category: "smartphone", prixMoyen: 40, prixMin: 25, prixMax: 58, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone 6s", category: "smartphone", prixMoyen: 35, prixMin: 22, prixMax: 51, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone 6s Plus", category: "smartphone", prixMoyen: 40, prixMin: 25, prixMax: 58, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone 7", category: "smartphone", prixMoyen: 60, prixMin: 37, prixMax: 87, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone 7 Plus", category: "smartphone", prixMoyen: 68, prixMin: 42, prixMax: 99, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone 8", category: "smartphone", prixMoyen: 80, prixMin: 50, prixMax: 116, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Apple", model: "iPhone 8 Plus", category: "smartphone", prixMoyen: 90, prixMin: 56, prixMax: 130, prixInternet: null, tauxVente: 33, joursMoyenVente: 18.8, scoreDemande: 11, source: "estime" },
  { brand: "Apple", model: "iPhone X", category: "smartphone", prixMoyen: 120, prixMin: 74, prixMax: 174, prixInternet: null, tauxVente: 33, joursMoyenVente: 18.8, scoreDemande: 11, source: "estime" },
  { brand: "Apple", model: "iPhone XR", category: "smartphone", prixMoyen: 95, prixMin: 59, prixMax: 138, prixInternet: 127, tauxVente: 38, joursMoyenVente: 16.5, scoreDemande: 20, source: "estime" },
  { brand: "Apple", model: "iPhone XS", category: "smartphone", prixMoyen: 120, prixMin: 74, prixMax: 174, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.5, scoreDemande: 20, source: "estime" },
  { brand: "Apple", model: "iPhone XS Max", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.5, scoreDemande: 20, source: "estime" },
  { brand: "Apple", model: "iPhone 11", category: "smartphone", prixMoyen: 124, prixMin: 40, prixMax: 200, prixInternet: 145, tauxVente: 44, joursMoyenVente: 5, scoreDemande: 51, source: "reel" },
  { brand: "Apple", model: "iPhone 11 Pro", category: "smartphone", prixMoyen: 175, prixMin: 108, prixMax: 254, prixInternet: null, tauxVente: 43, joursMoyenVente: 14.2, scoreDemande: 30, source: "estime" },
  { brand: "Apple", model: "iPhone 11 Pro Max", category: "smartphone", prixMoyen: 196, prixMin: 122, prixMax: 284, prixInternet: null, tauxVente: 43, joursMoyenVente: 14.2, scoreDemande: 30, source: "estime" },
  { brand: "Apple", model: "iPhone 12 mini", category: "smartphone", prixMoyen: 149, prixMin: 92, prixMax: 216, prixInternet: null, tauxVente: 49, joursMoyenVente: 11.4, scoreDemande: 41, source: "estime" },
  { brand: "Apple", model: "iPhone 12", category: "smartphone", prixMoyen: 166, prixMin: 50, prixMax: 240, prixInternet: 175, tauxVente: 46, joursMoyenVente: 4.6, scoreDemande: 53, source: "reel" },
  { brand: "Apple", model: "iPhone 12 Pro", category: "smartphone", prixMoyen: 234, prixMin: 145, prixMax: 339, prixInternet: null, tauxVente: 47, joursMoyenVente: 12.3, scoreDemande: 37, source: "estime" },
  { brand: "Apple", model: "iPhone 12 Pro Max", category: "smartphone", prixMoyen: 262, prixMin: 162, prixMax: 380, prixInternet: null, tauxVente: 47, joursMoyenVente: 12.3, scoreDemande: 37, source: "estime" },
  { brand: "Apple", model: "iPhone 13 mini", category: "smartphone", prixMoyen: 204, prixMin: 126, prixMax: 296, prixInternet: null, tauxVente: 53, joursMoyenVente: 9.4, scoreDemande: 48, source: "estime" },
  { brand: "Apple", model: "iPhone 13", category: "smartphone", prixMoyen: 227, prixMin: 60, prixMax: 310, prixInternet: 282, tauxVente: 64, joursMoyenVente: 5.3, scoreDemande: 66, source: "reel" },
  { brand: "Apple", model: "iPhone 13 Pro", category: "smartphone", prixMoyen: 320, prixMin: 198, prixMax: 464, prixInternet: 333, tauxVente: 53, joursMoyenVente: 9.4, scoreDemande: 48, source: "estime" },
  { brand: "Apple", model: "iPhone 13 Pro Max", category: "smartphone", prixMoyen: 359, prixMin: 223, prixMax: 521, prixInternet: null, tauxVente: 53, joursMoyenVente: 9.4, scoreDemande: 48, source: "estime" },
  { brand: "Apple", model: "iPhone 14", category: "smartphone", prixMoyen: 282, prixMin: 80, prixMax: 380, prixInternet: 300, tauxVente: 50, joursMoyenVente: 4.4, scoreDemande: 57, source: "reel" },
  { brand: "Apple", model: "iPhone 14 Plus", category: "smartphone", prixMoyen: 319, prixMin: 198, prixMax: 463, prixInternet: null, tauxVente: 57, joursMoyenVente: 7.2, scoreDemande: 56, source: "estime" },
  { brand: "Apple", model: "iPhone 14 Pro", category: "smartphone", prixMoyen: 398, prixMin: 247, prixMax: 577, prixInternet: 440, tauxVente: 57, joursMoyenVente: 7.2, scoreDemande: 56, source: "estime" },
  { brand: "Apple", model: "iPhone 14 Pro Max", category: "smartphone", prixMoyen: 446, prixMin: 277, prixMax: 647, prixInternet: 487, tauxVente: 51, joursMoyenVente: 10.1, scoreDemande: 45, source: "estime" },
  { brand: "Apple", model: "iPhone 15", category: "smartphone", prixMoyen: 374, prixMin: 100, prixMax: 460, prixInternet: 415, tauxVente: 46, joursMoyenVente: 5.2, scoreDemande: 52, source: "reel" },
  { brand: "Apple", model: "iPhone 15 Plus", category: "smartphone", prixMoyen: 423, prixMin: 262, prixMax: 613, prixInternet: 467, tauxVente: 53, joursMoyenVente: 9.1, scoreDemande: 49, source: "estime" },
  { brand: "Apple", model: "iPhone 15 Pro", category: "smartphone", prixMoyen: 527, prixMin: 150, prixMax: 600, prixInternet: 529, tauxVente: 36, joursMoyenVente: 4.9, scoreDemande: 44, source: "reel" },
  { brand: "Apple", model: "iPhone 15 Pro Max", category: "smartphone", prixMoyen: 601, prixMin: 200, prixMax: 750, prixInternet: 645, tauxVente: 40, joursMoyenVente: 4.6, scoreDemande: 48, source: "reel" },
  { brand: "Apple", model: "iPhone 16", category: "smartphone", prixMoyen: 484, prixMin: 150, prixMax: 630, prixInternet: 595, tauxVente: 28, joursMoyenVente: 4.9, scoreDemande: 38, source: "reel" },
  { brand: "Apple", model: "iPhone 16 Plus", category: "smartphone", prixMoyen: 547, prixMin: 339, prixMax: 793, prixInternet: null, tauxVente: 53, joursMoyenVente: 9.1, scoreDemande: 49, source: "estime" },
  { brand: "Apple", model: "iPhone 16 Pro", category: "smartphone", prixMoyen: 682, prixMin: 423, prixMax: 989, prixInternet: 747, tauxVente: 47, joursMoyenVente: 12.4, scoreDemande: 37, source: "estime" },
  { brand: "Apple", model: "iPhone 16 Pro Max", category: "smartphone", prixMoyen: 742, prixMin: 300, prixMax: 950, prixInternet: 847, tauxVente: 40, joursMoyenVente: 6, scoreDemande: 45, source: "reel" },
  { brand: "Apple", model: "iPhone 17", category: "smartphone", prixMoyen: 600, prixMin: 372, prixMax: 870, prixInternet: 879, tauxVente: 49, joursMoyenVente: 11.4, scoreDemande: 41, source: "estime" },
  { brand: "Apple", model: "iPhone 17 Plus", category: "smartphone", prixMoyen: 678, prixMin: 420, prixMax: 983, prixInternet: null, tauxVente: 43, joursMoyenVente: 14.2, scoreDemande: 30, source: "estime" },
  { brand: "Apple", model: "iPhone 17 Pro", category: "smartphone", prixMoyen: 846, prixMin: 525, prixMax: 1227, prixInternet: 1231, tauxVente: 43, joursMoyenVente: 14.2, scoreDemande: 30, source: "estime" },
  { brand: "Apple", model: "iPhone 17 Pro Max", category: "smartphone", prixMoyen: 948, prixMin: 588, prixMax: 1375, prixInternet: 1313, tauxVente: 37, joursMoyenVente: 16.9, scoreDemande: 19, source: "estime" },
  { brand: "Apple", model: "iPhone 17 Air", category: "smartphone", prixMoyen: 780, prixMin: 484, prixMax: 1131, prixInternet: null, tauxVente: 43, joursMoyenVente: 14.2, scoreDemande: 30, source: "estime" },
  { brand: "Samsung", model: "Galaxy S24 Ultra", category: "smartphone", prixMoyen: 731, prixMin: 453, prixMax: 1060, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.2, scoreDemande: 26, source: "estime" },
  { brand: "Samsung", model: "Galaxy S24+", category: "smartphone", prixMoyen: 486, prixMin: 301, prixMax: 705, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Samsung", model: "Galaxy S24", category: "smartphone", prixMoyen: 430, prixMin: 267, prixMax: 624, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Samsung", model: "Galaxy S23 Ultra", category: "smartphone", prixMoyen: 561, prixMin: 348, prixMax: 813, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Samsung", model: "Galaxy S23+", category: "smartphone", prixMoyen: 373, prixMin: 231, prixMax: 541, prixInternet: null, tauxVente: 51, joursMoyenVente: 10.1, scoreDemande: 45, source: "estime" },
  { brand: "Samsung", model: "Galaxy S23", category: "smartphone", prixMoyen: 330, prixMin: 205, prixMax: 478, prixInternet: null, tauxVente: 51, joursMoyenVente: 10.1, scoreDemande: 45, source: "estime" },
  { brand: "Samsung", model: "Galaxy S22 Ultra", category: "smartphone", prixMoyen: 425, prixMin: 264, prixMax: 616, prixInternet: null, tauxVente: 45, joursMoyenVente: 13.3, scoreDemande: 33, source: "estime" },
  { brand: "Samsung", model: "Galaxy S22+", category: "smartphone", prixMoyen: 282, prixMin: 175, prixMax: 409, prixInternet: null, tauxVente: 50, joursMoyenVente: 11, scoreDemande: 42, source: "estime" },
  { brand: "Samsung", model: "Galaxy S22", category: "smartphone", prixMoyen: 250, prixMin: 155, prixMax: 362, prixInternet: null, tauxVente: 50, joursMoyenVente: 11, scoreDemande: 42, source: "estime" },
  { brand: "Samsung", model: "Galaxy S21 Ultra", category: "smartphone", prixMoyen: 357, prixMin: 221, prixMax: 518, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy S21+", category: "smartphone", prixMoyen: 237, prixMin: 147, prixMax: 344, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy S21", category: "smartphone", prixMoyen: 210, prixMin: 130, prixMax: 304, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy S21 FE", category: "smartphone", prixMoyen: 151, prixMin: 94, prixMax: 219, prixInternet: null, tauxVente: 47, joursMoyenVente: 12, scoreDemande: 38, source: "estime" },
  { brand: "Samsung", model: "Galaxy S20 Ultra", category: "smartphone", prixMoyen: 289, prixMin: 179, prixMax: 419, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "Samsung", model: "Galaxy S20+", category: "smartphone", prixMoyen: 192, prixMin: 119, prixMax: 278, prixInternet: null, tauxVente: 42, joursMoyenVente: 14.4, scoreDemande: 28, source: "estime" },
  { brand: "Samsung", model: "Galaxy S20", category: "smartphone", prixMoyen: 170, prixMin: 105, prixMax: 246, prixInternet: null, tauxVente: 42, joursMoyenVente: 14.4, scoreDemande: 28, source: "estime" },
  { brand: "Samsung", model: "Galaxy S20 FE", category: "smartphone", prixMoyen: 122, prixMin: 76, prixMax: 177, prixInternet: null, tauxVente: 42, joursMoyenVente: 14.4, scoreDemande: 28, source: "estime" },
  { brand: "Samsung", model: "Galaxy S10+", category: "smartphone", prixMoyen: 147, prixMin: 91, prixMax: 213, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.7, scoreDemande: 20, source: "estime" },
  { brand: "Samsung", model: "Galaxy S10", category: "smartphone", prixMoyen: 130, prixMin: 81, prixMax: 188, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.7, scoreDemande: 20, source: "estime" },
  { brand: "Samsung", model: "Galaxy S10e", category: "smartphone", prixMoyen: 130, prixMin: 81, prixMax: 188, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.7, scoreDemande: 20, source: "estime" },
  { brand: "Samsung", model: "Galaxy S9+", category: "smartphone", prixMoyen: 107, prixMin: 66, prixMax: 155, prixInternet: null, tauxVente: 34, joursMoyenVente: 18.6, scoreDemande: 13, source: "estime" },
  { brand: "Samsung", model: "Galaxy S9", category: "smartphone", prixMoyen: 95, prixMin: 59, prixMax: 138, prixInternet: null, tauxVente: 34, joursMoyenVente: 18.6, scoreDemande: 13, source: "estime" },
  { brand: "Samsung", model: "Galaxy S8+", category: "smartphone", prixMoyen: 79, prixMin: 49, prixMax: 115, prixInternet: null, tauxVente: 27, joursMoyenVente: 22, scoreDemande: 5, source: "estime" },
  { brand: "Samsung", model: "Galaxy S8", category: "smartphone", prixMoyen: 70, prixMin: 43, prixMax: 102, prixInternet: null, tauxVente: 27, joursMoyenVente: 22, scoreDemande: 5, source: "estime" },
  { brand: "Samsung", model: "Galaxy Note 20 Ultra", category: "smartphone", prixMoyen: 360, prixMin: 223, prixMax: 522, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "Samsung", model: "Galaxy Note 20", category: "smartphone", prixMoyen: 230, prixMin: 143, prixMax: 334, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "Samsung", model: "Galaxy Note 10+", category: "smartphone", prixMoyen: 195, prixMin: 121, prixMax: 283, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.7, scoreDemande: 20, source: "estime" },
  { brand: "Samsung", model: "Galaxy Note 10", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.7, scoreDemande: 20, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Fold 6", category: "smartphone", prixMoyen: 880, prixMin: 546, prixMax: 1276, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.2, scoreDemande: 26, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Fold 5", category: "smartphone", prixMoyen: 650, prixMin: 403, prixMax: 942, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Fold 4", category: "smartphone", prixMoyen: 440, prixMin: 273, prixMax: 638, prixInternet: null, tauxVente: 45, joursMoyenVente: 13.3, scoreDemande: 33, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Fold 3", category: "smartphone", prixMoyen: 320, prixMin: 198, prixMax: 464, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Flip 6", category: "smartphone", prixMoyen: 540, prixMin: 335, prixMax: 783, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Flip 5", category: "smartphone", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 51, joursMoyenVente: 10.1, scoreDemande: 45, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Flip 4", category: "smartphone", prixMoyen: 260, prixMin: 161, prixMax: 377, prixInternet: null, tauxVente: 50, joursMoyenVente: 11, scoreDemande: 42, source: "estime" },
  { brand: "Samsung", model: "Galaxy Z Flip 3", category: "smartphone", prixMoyen: 175, prixMin: 108, prixMax: 254, prixInternet: null, tauxVente: 47, joursMoyenVente: 12, scoreDemande: 38, source: "estime" },
  { brand: "Samsung", model: "Galaxy A55", category: "smartphone", prixMoyen: 270, prixMin: 167, prixMax: 392, prixInternet: null, tauxVente: 44, joursMoyenVente: 13.6, scoreDemande: 32, source: "estime" },
  { brand: "Samsung", model: "Galaxy A54", category: "smartphone", prixMoyen: 220, prixMin: 136, prixMax: 319, prixInternet: null, tauxVente: 44, joursMoyenVente: 13.6, scoreDemande: 32, source: "estime" },
  { brand: "Samsung", model: "Galaxy A53", category: "smartphone", prixMoyen: 180, prixMin: 112, prixMax: 261, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A52s", category: "smartphone", prixMoyen: 170, prixMin: 105, prixMax: 246, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A52", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A35", category: "smartphone", prixMoyen: 250, prixMin: 155, prixMax: 362, prixInternet: null, tauxVente: 44, joursMoyenVente: 13.6, scoreDemande: 32, source: "estime" },
  { brand: "Samsung", model: "Galaxy A34", category: "smartphone", prixMoyen: 200, prixMin: 124, prixMax: 290, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A33", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A15", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A14", category: "smartphone", prixMoyen: 120, prixMin: 74, prixMax: 174, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A13", category: "smartphone", prixMoyen: 100, prixMin: 62, prixMax: 145, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung", model: "Galaxy A05s", category: "smartphone", prixMoyen: 90, prixMin: 56, prixMax: 130, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Google", model: "Pixel 9 Pro XL", category: "smartphone", prixMoyen: 780, prixMin: 484, prixMax: 1131, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.7, scoreDemande: 20, source: "estime" },
  { brand: "Google", model: "Pixel 9 Pro", category: "smartphone", prixMoyen: 700, prixMin: 434, prixMax: 1015, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.7, scoreDemande: 20, source: "estime" },
  { brand: "Google", model: "Pixel 9", category: "smartphone", prixMoyen: 520, prixMin: 322, prixMax: 754, prixInternet: null, tauxVente: 42, joursMoyenVente: 14.4, scoreDemande: 28, source: "estime" },
  { brand: "Google", model: "Pixel 9 Pro Fold", category: "smartphone", prixMoyen: 1350, prixMin: 837, prixMax: 1958, prixInternet: null, tauxVente: 33, joursMoyenVente: 18.9, scoreDemande: 11, source: "estime" },
  { brand: "Google", model: "Pixel 8 Pro", category: "smartphone", prixMoyen: 490, prixMin: 304, prixMax: 710, prixInternet: null, tauxVente: 42, joursMoyenVente: 14.4, scoreDemande: 28, source: "estime" },
  { brand: "Google", model: "Pixel 8", category: "smartphone", prixMoyen: 360, prixMin: 223, prixMax: 522, prixInternet: null, tauxVente: 47, joursMoyenVente: 12.3, scoreDemande: 37, source: "estime" },
  { brand: "Google", model: "Pixel 8a", category: "smartphone", prixMoyen: 330, prixMin: 205, prixMax: 478, prixInternet: null, tauxVente: 47, joursMoyenVente: 12.3, scoreDemande: 37, source: "estime" },
  { brand: "Google", model: "Pixel 7 Pro", category: "smartphone", prixMoyen: 350, prixMin: 217, prixMax: 508, prixInternet: null, tauxVente: 45, joursMoyenVente: 13.1, scoreDemande: 34, source: "estime" },
  { brand: "Google", model: "Pixel 7", category: "smartphone", prixMoyen: 260, prixMin: 161, prixMax: 377, prixInternet: null, tauxVente: 45, joursMoyenVente: 13.1, scoreDemande: 34, source: "estime" },
  { brand: "Google", model: "Pixel 7a", category: "smartphone", prixMoyen: 250, prixMin: 155, prixMax: 362, prixInternet: null, tauxVente: 45, joursMoyenVente: 13.1, scoreDemande: 34, source: "estime" },
  { brand: "Google", model: "Pixel 6 Pro", category: "smartphone", prixMoyen: 270, prixMin: 167, prixMax: 392, prixInternet: null, tauxVente: 42, joursMoyenVente: 14.6, scoreDemande: 28, source: "estime" },
  { brand: "Google", model: "Pixel 6", category: "smartphone", prixMoyen: 200, prixMin: 124, prixMax: 290, prixInternet: null, tauxVente: 43, joursMoyenVente: 13.9, scoreDemande: 30, source: "estime" },
  { brand: "Google", model: "Pixel 6a", category: "smartphone", prixMoyen: 180, prixMin: 112, prixMax: 261, prixInternet: null, tauxVente: 43, joursMoyenVente: 13.9, scoreDemande: 30, source: "estime" },
  { brand: "Google", model: "Pixel 5", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 39, joursMoyenVente: 16.1, scoreDemande: 22, source: "estime" },
  { brand: "Google", model: "Pixel 4 XL", category: "smartphone", prixMoyen: 115, prixMin: 71, prixMax: 167, prixInternet: null, tauxVente: 35, joursMoyenVente: 18.1, scoreDemande: 15, source: "estime" },
  { brand: "Google", model: "Pixel 4", category: "smartphone", prixMoyen: 90, prixMin: 56, prixMax: 130, prixInternet: null, tauxVente: 35, joursMoyenVente: 18.1, scoreDemande: 15, source: "estime" },
  { brand: "Google", model: "Pixel 4a", category: "smartphone", prixMoyen: 90, prixMin: 56, prixMax: 130, prixInternet: null, tauxVente: 35, joursMoyenVente: 18.1, scoreDemande: 15, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 14 Ultra", category: "smartphone", prixMoyen: 720, prixMin: 446, prixMax: 1044, prixInternet: null, tauxVente: 32, joursMoyenVente: 19.4, scoreDemande: 9, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 14", category: "smartphone", prixMoyen: 480, prixMin: 298, prixMax: 696, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 13 Ultra", category: "smartphone", prixMoyen: 560, prixMin: 347, prixMax: 812, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 13 Pro", category: "smartphone", prixMoyen: 430, prixMin: 267, prixMax: 624, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 13", category: "smartphone", prixMoyen: 330, prixMin: 205, prixMax: 478, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 13T Pro", category: "smartphone", prixMoyen: 350, prixMin: 217, prixMax: 508, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 13T", category: "smartphone", prixMoyen: 280, prixMin: 174, prixMax: 406, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 12 Pro", category: "smartphone", prixMoyen: 300, prixMin: 186, prixMax: 435, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Xiaomi 12", category: "smartphone", prixMoyen: 230, prixMin: 143, prixMax: 334, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Redmi Note 13 Pro+", category: "smartphone", prixMoyen: 290, prixMin: 180, prixMax: 420, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Redmi Note 13 Pro", category: "smartphone", prixMoyen: 220, prixMin: 136, prixMax: 319, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Redmi Note 13", category: "smartphone", prixMoyen: 160, prixMin: 99, prixMax: 232, prixInternet: null, tauxVente: 40, joursMoyenVente: 15.3, scoreDemande: 25, source: "estime" },
  { brand: "Xiaomi", model: "Redmi Note 12 Pro", category: "smartphone", prixMoyen: 180, prixMin: 112, prixMax: 261, prixInternet: null, tauxVente: 40, joursMoyenVente: 15.3, scoreDemande: 25, source: "estime" },
  { brand: "Xiaomi", model: "Redmi Note 12", category: "smartphone", prixMoyen: 130, prixMin: 81, prixMax: 188, prixInternet: null, tauxVente: 40, joursMoyenVente: 15.3, scoreDemande: 25, source: "estime" },
  { brand: "Xiaomi", model: "Redmi 13C", category: "smartphone", prixMoyen: 90, prixMin: 56, prixMax: 130, prixInternet: null, tauxVente: 40, joursMoyenVente: 15.3, scoreDemande: 25, source: "estime" },
  { brand: "Xiaomi", model: "Redmi 12", category: "smartphone", prixMoyen: 110, prixMin: 68, prixMax: 160, prixInternet: null, tauxVente: 40, joursMoyenVente: 15.3, scoreDemande: 25, source: "estime" },
  { brand: "Xiaomi", model: "Poco F6 Pro", category: "smartphone", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Poco F6", category: "smartphone", prixMoyen: 300, prixMin: 186, prixMax: 435, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Poco X6 Pro", category: "smartphone", prixMoyen: 250, prixMin: 155, prixMax: 362, prixInternet: null, tauxVente: 39, joursMoyenVente: 16, scoreDemande: 22, source: "estime" },
  { brand: "Xiaomi", model: "Poco M6 Pro", category: "smartphone", prixMoyen: 180, prixMin: 112, prixMax: 261, prixInternet: null, tauxVente: 40, joursMoyenVente: 15.3, scoreDemande: 25, source: "estime" },
  { brand: "Huawei", model: "P60 Pro", category: "smartphone", prixMoyen: 420, prixMin: 260, prixMax: 609, prixInternet: null, tauxVente: 33, joursMoyenVente: 19, scoreDemande: 11, source: "estime" },
  { brand: "Huawei", model: "P50 Pro", category: "smartphone", prixMoyen: 280, prixMin: 174, prixMax: 406, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Huawei", model: "Mate 50 Pro", category: "smartphone", prixMoyen: 350, prixMin: 217, prixMax: 508, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Huawei", model: "P40 Pro", category: "smartphone", prixMoyen: 220, prixMin: 136, prixMax: 319, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Huawei", model: "P40", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 37, joursMoyenVente: 17.1, scoreDemande: 18, source: "estime" },
  { brand: "Huawei", model: "P30 Pro", category: "smartphone", prixMoyen: 140, prixMin: 87, prixMax: 203, prixInternet: null, tauxVente: 37, joursMoyenVente: 17.1, scoreDemande: 18, source: "estime" },
  { brand: "Huawei", model: "P30", category: "smartphone", prixMoyen: 110, prixMin: 68, prixMax: 160, prixInternet: null, tauxVente: 37, joursMoyenVente: 17.1, scoreDemande: 18, source: "estime" },
  { brand: "Huawei", model: "P30 Lite", category: "smartphone", prixMoyen: 70, prixMin: 43, prixMax: 102, prixInternet: null, tauxVente: 32, joursMoyenVente: 19.3, scoreDemande: 10, source: "estime" },
  { brand: "Huawei", model: "Nova 11", category: "smartphone", prixMoyen: 200, prixMin: 124, prixMax: 290, prixInternet: null, tauxVente: 37, joursMoyenVente: 17.1, scoreDemande: 18, source: "estime" },
  { brand: "Huawei", model: "Nova 10", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 37, joursMoyenVente: 17.1, scoreDemande: 18, source: "estime" },
  { brand: "Sony", model: "Xperia 1 VI", category: "smartphone", prixMoyen: 700, prixMin: 434, prixMax: 1015, prixInternet: null, tauxVente: 30, joursMoyenVente: 20.6, scoreDemande: 5, source: "estime" },
  { brand: "Sony", model: "Xperia 1 V", category: "smartphone", prixMoyen: 480, prixMin: 298, prixMax: 696, prixInternet: null, tauxVente: 33, joursMoyenVente: 19, scoreDemande: 11, source: "estime" },
  { brand: "Sony", model: "Xperia 5 V", category: "smartphone", prixMoyen: 430, prixMin: 267, prixMax: 624, prixInternet: null, tauxVente: 33, joursMoyenVente: 19, scoreDemande: 11, source: "estime" },
  { brand: "Sony", model: "Xperia 10 VI", category: "smartphone", prixMoyen: 280, prixMin: 174, prixMax: 406, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Sony", model: "Xperia 10 V", category: "smartphone", prixMoyen: 220, prixMin: 136, prixMax: 319, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "OnePlus", model: "OnePlus 12", category: "smartphone", prixMoyen: 560, prixMin: 347, prixMax: 812, prixInternet: null, tauxVente: 37, joursMoyenVente: 16.9, scoreDemande: 19, source: "estime" },
  { brand: "OnePlus", model: "OnePlus 12R", category: "smartphone", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "OnePlus", model: "OnePlus Open", category: "smartphone", prixMoyen: 900, prixMin: 558, prixMax: 1305, prixInternet: null, tauxVente: 34, joursMoyenVente: 18.3, scoreDemande: 13, source: "estime" },
  { brand: "OnePlus", model: "OnePlus 11", category: "smartphone", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "OnePlus", model: "OnePlus 10 Pro", category: "smartphone", prixMoyen: 280, prixMin: 174, prixMax: 406, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "OnePlus", model: "OnePlus Nord 4", category: "smartphone", prixMoyen: 350, prixMin: 217, prixMax: 508, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "OnePlus", model: "OnePlus Nord 3", category: "smartphone", prixMoyen: 270, prixMin: 167, prixMax: 392, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "OnePlus", model: "OnePlus Nord CE 4", category: "smartphone", prixMoyen: 230, prixMin: 143, prixMax: 334, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.1, scoreDemande: 26, source: "estime" },
  { brand: "Oppo", model: "Find X7 Ultra", category: "smartphone", prixMoyen: 750, prixMin: 465, prixMax: 1088, prixInternet: null, tauxVente: 30, joursMoyenVente: 20.3, scoreDemande: 6, source: "estime" },
  { brand: "Oppo", model: "Find X6 Pro", category: "smartphone", prixMoyen: 480, prixMin: 298, prixMax: 696, prixInternet: null, tauxVente: 33, joursMoyenVente: 18.7, scoreDemande: 12, source: "estime" },
  { brand: "Oppo", model: "Find N3", category: "smartphone", prixMoyen: 850, prixMin: 527, prixMax: 1232, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "Oppo", model: "Find N3 Flip", category: "smartphone", prixMoyen: 580, prixMin: 360, prixMax: 841, prixInternet: null, tauxVente: 33, joursMoyenVente: 18.7, scoreDemande: 12, source: "estime" },
  { brand: "Oppo", model: "Reno 12 Pro", category: "smartphone", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 37, joursMoyenVente: 17.2, scoreDemande: 18, source: "estime" },
  { brand: "Oppo", model: "Reno 11", category: "smartphone", prixMoyen: 280, prixMin: 174, prixMax: 406, prixInternet: null, tauxVente: 37, joursMoyenVente: 17.2, scoreDemande: 18, source: "estime" },
  { brand: "Oppo", model: "A98", category: "smartphone", prixMoyen: 200, prixMin: 124, prixMax: 290, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.6, scoreDemande: 20, source: "estime" },
  { brand: "Oppo", model: "A78", category: "smartphone", prixMoyen: 150, prixMin: 93, prixMax: 218, prixInternet: null, tauxVente: 38, joursMoyenVente: 16.6, scoreDemande: 20, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad Pro 13 (M4)", category: "tablet", prixMoyen: 950, prixMin: 589, prixMax: 1378, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad Pro 11 (M4)", category: "tablet", prixMoyen: 720, prixMin: 446, prixMax: 1044, prixInternet: null, tauxVente: 41, joursMoyenVente: 15.2, scoreDemande: 26, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad Pro 12.9 (6e gén)", category: "tablet", prixMoyen: 720, prixMin: 446, prixMax: 1044, prixInternet: null, tauxVente: 39, joursMoyenVente: 15.8, scoreDemande: 23, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad Pro 11 (4e gén)", category: "tablet", prixMoyen: 560, prixMin: 347, prixMax: 812, prixInternet: null, tauxVente: 45, joursMoyenVente: 13.3, scoreDemande: 33, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad Air 13 (M2)", category: "tablet", prixMoyen: 620, prixMin: 384, prixMax: 899, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad Air 11 (M2)", category: "tablet", prixMoyen: 480, prixMin: 298, prixMax: 696, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad Air (5e gén)", category: "tablet", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 50, joursMoyenVente: 11, scoreDemande: 42, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad (10e gén)", category: "tablet", prixMoyen: 280, prixMin: 174, prixMax: 406, prixInternet: null, tauxVente: 50, joursMoyenVente: 11, scoreDemande: 42, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad (9e gén)", category: "tablet", prixMoyen: 210, prixMin: 130, prixMax: 304, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Apple (iPad)", model: "iPad mini (6e gén)", category: "tablet", prixMoyen: 360, prixMin: 223, prixMax: 522, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.8, scoreDemande: 35, source: "estime" },
  { brand: "Samsung (Tab)", model: "Galaxy Tab S9 Ultra", category: "tablet", prixMoyen: 750, prixMin: 465, prixMax: 1088, prixInternet: null, tauxVente: 29, joursMoyenVente: 20.9, scoreDemande: 5, source: "estime" },
  { brand: "Samsung (Tab)", model: "Galaxy Tab S9+", category: "tablet", prixMoyen: 600, prixMin: 372, prixMax: 870, prixInternet: null, tauxVente: 32, joursMoyenVente: 19.5, scoreDemande: 9, source: "estime" },
  { brand: "Samsung (Tab)", model: "Galaxy Tab S9", category: "tablet", prixMoyen: 480, prixMin: 298, prixMax: 696, prixInternet: null, tauxVente: 32, joursMoyenVente: 19.5, scoreDemande: 9, source: "estime" },
  { brand: "Samsung (Tab)", model: "Galaxy Tab S9 FE", category: "tablet", prixMoyen: 330, prixMin: 205, prixMax: 478, prixInternet: null, tauxVente: 35, joursMoyenVente: 18.1, scoreDemande: 15, source: "estime" },
  { brand: "Samsung (Tab)", model: "Galaxy Tab S8 Ultra", category: "tablet", prixMoyen: 580, prixMin: 360, prixMax: 841, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "Samsung (Tab)", model: "Galaxy Tab A9+", category: "tablet", prixMoyen: 200, prixMin: 124, prixMax: 290, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Samsung (Tab)", model: "Galaxy Tab A8", category: "tablet", prixMoyen: 130, prixMin: 81, prixMax: 188, prixInternet: null, tauxVente: 32, joursMoyenVente: 19.2, scoreDemande: 10, source: "estime" },
  { brand: "Apple (Mac)", model: "MacBook Pro 14 (M3)", category: "computer", prixMoyen: 1450, prixMin: 899, prixMax: 2102, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Apple (Mac)", model: "MacBook Pro 16 (M3)", category: "computer", prixMoyen: 1850, prixMin: 1147, prixMax: 2682, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Apple (Mac)", model: "MacBook Air 13 (M3)", category: "computer", prixMoyen: 950, prixMin: 589, prixMax: 1378, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Apple (Mac)", model: "MacBook Air 15 (M3)", category: "computer", prixMoyen: 1150, prixMin: 713, prixMax: 1668, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Apple (Mac)", model: "MacBook Pro 14 (M2)", category: "computer", prixMoyen: 1150, prixMin: 713, prixMax: 1668, prixInternet: null, tauxVente: 35, joursMoyenVente: 18.1, scoreDemande: 15, source: "estime" },
  { brand: "Apple (Mac)", model: "MacBook Pro 16 (M2)", category: "computer", prixMoyen: 1550, prixMin: 961, prixMax: 2248, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Apple (Mac)", model: "MacBook Air (M2)", category: "computer", prixMoyen: 780, prixMin: 484, prixMax: 1131, prixInternet: null, tauxVente: 39, joursMoyenVente: 15.8, scoreDemande: 23, source: "estime" },
  { brand: "Apple (Mac)", model: "iMac 24 (M3)", category: "computer", prixMoyen: 1150, prixMin: 713, prixMax: 1668, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "Apple (Mac)", model: "Mac mini (M2)", category: "computer", prixMoyen: 480, prixMin: 298, prixMax: 696, prixInternet: null, tauxVente: 46, joursMoyenVente: 12.5, scoreDemande: 36, source: "estime" },
  { brand: "Apple (Mac)", model: "Mac Studio (M2)", category: "computer", prixMoyen: 1400, prixMin: 868, prixMax: 2030, prixInternet: null, tauxVente: 36, joursMoyenVente: 17.6, scoreDemande: 16, source: "estime" },
  { brand: "PC Portable", model: "Dell XPS 13", category: "computer", prixMoyen: 600, prixMin: 372, prixMax: 870, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "PC Portable", model: "Dell XPS 15", category: "computer", prixMoyen: 850, prixMin: 527, prixMax: 1232, prixInternet: null, tauxVente: 28, joursMoyenVente: 21.3, scoreDemande: 5, source: "estime" },
  { brand: "PC Portable", model: "HP Spectre x360", category: "computer", prixMoyen: 650, prixMin: 403, prixMax: 942, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "PC Portable", model: "HP Envy", category: "computer", prixMoyen: 480, prixMin: 298, prixMax: 696, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "PC Portable", model: "Asus Zenbook", category: "computer", prixMoyen: 550, prixMin: 341, prixMax: 798, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "PC Portable", model: "Asus ROG", category: "computer", prixMoyen: 950, prixMin: 589, prixMax: 1378, prixInternet: null, tauxVente: 25, joursMoyenVente: 22.6, scoreDemande: 5, source: "estime" },
  { brand: "PC Portable", model: "Lenovo Yoga", category: "computer", prixMoyen: 520, prixMin: 322, prixMax: 754, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "PC Portable", model: "Lenovo ThinkPad", category: "computer", prixMoyen: 600, prixMin: 372, prixMax: 870, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "PC Portable", model: "Acer Swift", category: "computer", prixMoyen: 420, prixMin: 260, prixMax: 609, prixInternet: null, tauxVente: 31, joursMoyenVente: 19.9, scoreDemande: 7, source: "estime" },
  { brand: "PC Portable", model: "MSI Stealth", category: "computer", prixMoyen: 1100, prixMin: 682, prixMax: 1595, prixInternet: null, tauxVente: 25, joursMoyenVente: 22.6, scoreDemande: 5, source: "estime" },
  { brand: "Sony (PlayStation)", model: "PlayStation 5 Slim", category: "console", prixMoyen: 430, prixMin: 267, prixMax: 624, prixInternet: null, tauxVente: 41, joursMoyenVente: 14.9, scoreDemande: 26, source: "estime" },
  { brand: "Sony (PlayStation)", model: "PlayStation 5", category: "console", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 37, joursMoyenVente: 17, scoreDemande: 19, source: "estime" },
  { brand: "Sony (PlayStation)", model: "PlayStation 4 Pro", category: "console", prixMoyen: 180, prixMin: 112, prixMax: 261, prixInternet: null, tauxVente: 27, joursMoyenVente: 21.6, scoreDemande: 5, source: "estime" },
  { brand: "Sony (PlayStation)", model: "PlayStation 4 Slim", category: "console", prixMoyen: 130, prixMin: 81, prixMax: 188, prixInternet: null, tauxVente: 27, joursMoyenVente: 21.6, scoreDemande: 5, source: "estime" },
  { brand: "Sony (PlayStation)", model: "PlayStation 4", category: "console", prixMoyen: 110, prixMin: 68, prixMax: 160, prixInternet: null, tauxVente: 27, joursMoyenVente: 21.6, scoreDemande: 5, source: "estime" },
  { brand: "Sony (PlayStation)", model: "PlayStation Portal", category: "console", prixMoyen: 180, prixMin: 112, prixMax: 261, prixInternet: null, tauxVente: 47, joursMoyenVente: 12, scoreDemande: 38, source: "estime" },
  { brand: "Microsoft (Xbox)", model: "Xbox Series X", category: "console", prixMoyen: 380, prixMin: 236, prixMax: 551, prixInternet: null, tauxVente: 33, joursMoyenVente: 19, scoreDemande: 11, source: "estime" },
  { brand: "Microsoft (Xbox)", model: "Xbox Series S", category: "console", prixMoyen: 230, prixMin: 143, prixMax: 334, prixInternet: null, tauxVente: 33, joursMoyenVente: 19, scoreDemande: 11, source: "estime" },
  { brand: "Microsoft (Xbox)", model: "Xbox One X", category: "console", prixMoyen: 180, prixMin: 112, prixMax: 261, prixInternet: null, tauxVente: 25, joursMoyenVente: 22.7, scoreDemande: 5, source: "estime" },
  { brand: "Microsoft (Xbox)", model: "Xbox One S", category: "console", prixMoyen: 120, prixMin: 74, prixMax: 174, prixInternet: null, tauxVente: 25, joursMoyenVente: 22.7, scoreDemande: 5, source: "estime" },
  { brand: "Microsoft (Xbox)", model: "Xbox One", category: "console", prixMoyen: 90, prixMin: 56, prixMax: 130, prixInternet: null, tauxVente: 25, joursMoyenVente: 22.7, scoreDemande: 5, source: "estime" },
  { brand: "Nintendo", model: "Switch OLED", category: "console", prixMoyen: 250, prixMin: 155, prixMax: 362, prixInternet: null, tauxVente: 39, joursMoyenVente: 15.8, scoreDemande: 23, source: "estime" },
  { brand: "Nintendo", model: "Switch", category: "console", prixMoyen: 190, prixMin: 118, prixMax: 276, prixInternet: null, tauxVente: 27, joursMoyenVente: 22, scoreDemande: 5, source: "estime" },
  { brand: "Nintendo", model: "Switch Lite", category: "console", prixMoyen: 130, prixMin: 81, prixMax: 188, prixInternet: null, tauxVente: 33, joursMoyenVente: 18.9, scoreDemande: 11, source: "estime" },
  { brand: "Nintendo", model: "New 3DS XL", category: "console", prixMoyen: 110, prixMin: 68, prixMax: 160, prixInternet: null, tauxVente: 27, joursMoyenVente: 22, scoreDemande: 5, source: "estime" },
  { brand: "Nintendo", model: "2DS XL", category: "console", prixMoyen: 90, prixMin: 56, prixMax: 130, prixInternet: null, tauxVente: 27, joursMoyenVente: 22, scoreDemande: 5, source: "estime" },
];

const norm = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const marketIndex: Map<string, ModelMarketData> = new Map(
  marketData.map((item) => [norm(`${item.brand} ${item.model}`), item]),
);
const marketIndexByModel: Map<string, ModelMarketData> = new Map(
  marketData.map((item) => [norm(item.model), item]),
);

/** Recherche les donnees marche d'un modele (par 'Marque Modele' ou par modele seul). */
export function getMarketData(query: string): ModelMarketData | undefined {
  const key = norm(query);
  return marketIndex.get(key) ?? marketIndexByModel.get(key);
}

/** Top modeles par score de demande (optionnellement filtre par categorie). */
export function getTopDemande(limit = 20, category?: DeviceCategory): ModelMarketData[] {
  return marketData
    .filter((item) => !category || item.category === category)
    .slice()
    .sort((a, b) => b.scoreDemande - a.scoreDemande)
    .slice(0, limit);
}
