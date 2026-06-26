import type { ResolvedThemeMode, ThemeMode } from "./theme";

export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  void mode;
  return "light";
}

export function applyThemeMode(mode: ThemeMode): ResolvedThemeMode {
  const resolved = resolveThemeMode(mode);
  const doc = document.documentElement;
  doc.setAttribute("data-theme-mode", "light");
  doc.classList.add("disable-transitions");
  doc.classList.remove("dark");
  doc.style.colorScheme = "light";
  requestAnimationFrame(() => {
    doc.classList.remove("disable-transitions");
  });
  return resolved;
}

export function applyThemePreset(value: string) {
  void value;
  document.documentElement.setAttribute("data-theme-preset", "default");
}

export function subscribeToSystemTheme(onChange: (mode: ResolvedThemeMode) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  onChange("light");
  return () => undefined;
}
