export const THEME_MODE_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
] as const;

export const THEME_MODE_VALUES = THEME_MODE_OPTIONS.map((o) => o.value);
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];
export type ResolvedThemeMode = "light" | "dark";

// --- generated:themePresets:start ---

export const THEME_PRESET_OPTIONS = [
  {
    label: "Default",
    value: "default",
    primary: {
      light: "#2a9d8f",
      dark: "#ededed",
    },
  },
  {
    label: "Brutalist",
    value: "brutalist",
    primary: {
      light: "#000000",
      dark: "#ffffff",
    },
  },
  {
    label: "Soft Pop",
    value: "soft-pop",
    primary: {
      light: "#888888",
      dark: "#888888",
    },
  },
  {
    label: "Tangerine",
    value: "tangerine",
    primary: {
      light: "#f4a261",
      dark: "#f4a261",
    },
  },
] as const;

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map((p) => p.value);

export type ThemePreset = (typeof THEME_PRESET_OPTIONS)[number]["value"];

// --- generated:themePresets:end ---
