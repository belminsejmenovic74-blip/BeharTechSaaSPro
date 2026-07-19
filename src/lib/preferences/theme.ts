export const THEME_MODE_OPTIONS = [{ label: "Light", value: "light" }] as const;

export const THEME_MODE_VALUES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];
export type ResolvedThemeMode = "light";

// --- generated:themePresets:start ---

export const THEME_PRESET_OPTIONS = [
  {
    label: "Default",
    value: "default",
    primary: {
      light: "#2a9d8f",
      dark: "#2a9d8f",
    },
  },
  {
    label: "Brutalist",
    value: "brutalist",
    primary: {
      light: "#101828",
      dark: "#ffffff",
    },
  },
  {
    label: "Soft Pop",
    value: "soft-pop",
    primary: {
      light: "#ffffff",
      dark: "#ffffff",
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

/**
 * Presets exposés dans l'UI en production. Exigence premium (réf. Apple/Stripe/Linear) :
 * on masque les thèmes non premium (`tangerine` orange, `brutalist`, `soft-pop`) qui
 * cassent la cohérence visuelle. Le type reste complet pour ne rien casser côté runtime.
 */
export const PREMIUM_THEME_PRESET_VALUES: ThemePreset[] = ["default"];
export const PREMIUM_THEME_PRESET_OPTIONS = THEME_PRESET_OPTIONS.filter((preset) =>
  PREMIUM_THEME_PRESET_VALUES.includes(preset.value),
);
