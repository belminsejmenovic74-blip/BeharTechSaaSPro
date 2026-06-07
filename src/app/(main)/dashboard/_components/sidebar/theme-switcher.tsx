"use client";

import { Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

export function ThemeSwitcher() {
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

  const enforceLightTheme = () => {
    setThemeMode("light");
    void persistPreference("theme_mode", "light");
  };

  return (
    <Button size="icon" onClick={enforceLightTheme} aria-label="Theme: light">
      <Sun className="size-4" />
    </Button>
  );
}
