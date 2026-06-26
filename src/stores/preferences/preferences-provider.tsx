"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { type StoreApi, useStore } from "zustand";

import { BEHAR_FONT_KEYS } from "@/lib/fonts/registry";
import {
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  SIDEBAR_VARIANT_VALUES,
} from "@/lib/preferences/layout";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES } from "@/lib/preferences/theme";
import { applyThemeMode, subscribeToSystemTheme } from "@/lib/preferences/theme-utils";

import { createPreferencesStore, type PreferencesState } from "./preferences-store";

const PreferencesStoreContext = createContext<StoreApi<PreferencesState> | null>(null);

function getSafeValue<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  if (!raw) return undefined;
  return allowed.includes(raw as T) ? (raw as T) : undefined;
}

function readDomState(): Partial<PreferencesState> {
  const root = document.documentElement;

  const themeModeAttr = getSafeValue(root.getAttribute("data-theme-mode"), THEME_MODE_VALUES);
  const resolvedMode = "light";

  return {
    themeMode: themeModeAttr ?? "light",
    resolvedThemeMode: resolvedMode,
    themePreset:
      getSafeValue(root.getAttribute("data-theme-preset"), THEME_PRESET_VALUES) ?? PREFERENCE_DEFAULTS.theme_preset,
    font: getSafeValue(root.getAttribute("data-font"), BEHAR_FONT_KEYS) ?? PREFERENCE_DEFAULTS.font,
    contentLayout:
      getSafeValue(root.getAttribute("data-content-layout"), CONTENT_LAYOUT_VALUES) ??
      PREFERENCE_DEFAULTS.content_layout,
    navbarStyle:
      getSafeValue(root.getAttribute("data-navbar-style"), NAVBAR_STYLE_VALUES) ?? PREFERENCE_DEFAULTS.navbar_style,
    sidebarVariant:
      getSafeValue(root.getAttribute("data-sidebar-variant"), SIDEBAR_VARIANT_VALUES) ??
      PREFERENCE_DEFAULTS.sidebar_variant,
    sidebarCollapsible:
      getSafeValue(root.getAttribute("data-sidebar-collapsible"), SIDEBAR_COLLAPSIBLE_VALUES) ??
      PREFERENCE_DEFAULTS.sidebar_collapsible,
  };
}

export const PreferencesStoreProvider = ({
  children,
  themeMode,
  themePreset,
  font,
  contentLayout,
  navbarStyle,
}: {
  children: React.ReactNode;
  themeMode: PreferencesState["themeMode"];
  themePreset: PreferencesState["themePreset"];
  font: PreferencesState["font"];
  contentLayout: PreferencesState["contentLayout"];
  navbarStyle: PreferencesState["navbarStyle"];
}) => {
  const [store] = useState<StoreApi<PreferencesState>>(() =>
    createPreferencesStore({
      themeMode,
      themePreset,
      font,
      contentLayout,
      navbarStyle,
    }),
  );

  const domSnapshotRef = useRef<Partial<PreferencesState> | null>(null);

  useEffect(() => {
    const domState = readDomState();
    domSnapshotRef.current = domState;

    store.setState((prev) => ({
      ...prev,
      ...domState,
      isSynced: true,
    }));
  }, [store]);

  useEffect(() => {
    let unsubscribeMedia: (() => void) | undefined;

    const applyFromMode = (mode: PreferencesState["themeMode"]) => {
      unsubscribeMedia?.();
      const resolved = applyThemeMode(mode);
      store.setState((prev) => ({ ...prev, resolvedThemeMode: resolved }));

      if (mode === "system") {
        unsubscribeMedia = subscribeToSystemTheme(() => {
          const next = applyThemeMode("system");
          store.setState((prev) => ({ ...prev, resolvedThemeMode: next }));
        });
      }
    };

    const startMode = domSnapshotRef.current?.themeMode ?? store.getState().themeMode;
    applyFromMode(startMode);

    const unsubscribeStore = store.subscribe((s, p) => {
      if (s.themeMode !== p.themeMode) applyFromMode(s.themeMode);
    });

    return () => {
      unsubscribeMedia?.();
      unsubscribeStore();
    };
  }, [store]);

  return <PreferencesStoreContext.Provider value={store}>{children}</PreferencesStoreContext.Provider>;
};

export const usePreferencesStore = <T,>(selector: (state: PreferencesState) => T): T => {
  const store = useContext(PreferencesStoreContext);
  if (!store) throw new Error("Missing PreferencesStoreProvider");
  return useStore(store, selector);
};
