import { DM_Sans, Geist, Inter, Public_Sans } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const fontRegistry = {
  geist: {
    label: "Geist",
    font: geist,
  },
  inter: {
    label: "Inter",
    font: inter,
  },
  dmSans: {
    label: "DM Sans",
    font: dmSans,
  },
  publicSans: {
    label: "Public Sans",
    font: publicSans,
  },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const BEHAR_FONT_KEYS = ["geist", "inter", "dmSans", "publicSans"] as const satisfies readonly FontKey[];

export const fontVars = (Object.values(fontRegistry) as Array<(typeof fontRegistry)[FontKey]>)
  .map((f) => f.font.variable)
  .join(" ");

export const fontOptions = BEHAR_FONT_KEYS.map((key) => {
  const f = fontRegistry[key];
  return {
    key,
    label: f.label,
    variable: f.font.variable,
  };
});
