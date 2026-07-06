import { a as subscribe, s as setContext } from "../../chunks/lifecycle.js";
import { c as create_ssr_component, a as add_attribute, v as validate_component } from "../../chunks/ssr.js";
import { w as writable } from "../../chunks/index2.js";
import { t as themeStorageKey, m as modeStorageKey, d as disableTransitions, a as themeColors, b as darkClassNames, l as lightClassNames } from "../../chunks/stores.js";
function defineConfig(config) {
  return config;
}
function setInitialMode({ defaultMode, themeColors: themeColors2, darkClassNames: darkClassNames2 = ["dark"], lightClassNames: lightClassNames2 = [], defaultTheme = "" }) {
  const rootEl = document.documentElement;
  const mode = localStorage.getItem("mode-watcher-mode") || defaultMode;
  const theme = localStorage.getItem("mode-watcher-theme") || defaultTheme;
  const light = mode === "light" || mode === "system" && window.matchMedia("(prefers-color-scheme: light)").matches;
  if (light) {
    if (darkClassNames2.length)
      rootEl.classList.remove(...darkClassNames2);
    if (lightClassNames2.length)
      rootEl.classList.add(...lightClassNames2);
  } else {
    if (lightClassNames2.length)
      rootEl.classList.remove(...lightClassNames2);
    if (darkClassNames2.length)
      rootEl.classList.add(...darkClassNames2);
  }
  rootEl.style.colorScheme = light ? "light" : "dark";
  if (themeColors2) {
    const themeMetaEl = document.querySelector('meta[name="theme-color"]');
    if (themeMetaEl) {
      themeMetaEl.setAttribute("content", mode === "light" ? themeColors2.light : themeColors2.dark);
    }
  }
  if (theme) {
    rootEl.setAttribute("data-theme", theme);
    localStorage.setItem("mode-watcher-theme", theme);
  }
  localStorage.setItem("mode-watcher-mode", mode);
}
const Mode_watcher = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let trueNonce;
  let $$unsubscribe_themeStorageKeyStore;
  let $$unsubscribe_modeStorageKeyStore;
  $$unsubscribe_themeStorageKeyStore = subscribe(themeStorageKey, (value) => value);
  $$unsubscribe_modeStorageKeyStore = subscribe(modeStorageKey, (value) => value);
  let { track = true } = $$props;
  let { defaultMode = "system" } = $$props;
  let { themeColors: themeColors$1 = void 0 } = $$props;
  let { disableTransitions: disableTransitions$1 = true } = $$props;
  let { darkClassNames: darkClassNames$1 = ["dark"] } = $$props;
  let { lightClassNames: lightClassNames$1 = [] } = $$props;
  let { defaultTheme = "" } = $$props;
  let { nonce = "" } = $$props;
  let { themeStorageKey: themeStorageKey$1 = "mode-watcher-theme" } = $$props;
  let { modeStorageKey: modeStorageKey$1 = "mode-watcher-mode" } = $$props;
  const initConfig = defineConfig({
    defaultMode,
    themeColors: themeColors$1,
    darkClassNames: darkClassNames$1,
    lightClassNames: lightClassNames$1,
    defaultTheme,
    modeStorageKey: modeStorageKey$1,
    themeStorageKey: themeStorageKey$1
  });
  if ($$props.track === void 0 && $$bindings.track && track !== void 0) $$bindings.track(track);
  if ($$props.defaultMode === void 0 && $$bindings.defaultMode && defaultMode !== void 0) $$bindings.defaultMode(defaultMode);
  if ($$props.themeColors === void 0 && $$bindings.themeColors && themeColors$1 !== void 0) $$bindings.themeColors(themeColors$1);
  if ($$props.disableTransitions === void 0 && $$bindings.disableTransitions && disableTransitions$1 !== void 0) $$bindings.disableTransitions(disableTransitions$1);
  if ($$props.darkClassNames === void 0 && $$bindings.darkClassNames && darkClassNames$1 !== void 0) $$bindings.darkClassNames(darkClassNames$1);
  if ($$props.lightClassNames === void 0 && $$bindings.lightClassNames && lightClassNames$1 !== void 0) $$bindings.lightClassNames(lightClassNames$1);
  if ($$props.defaultTheme === void 0 && $$bindings.defaultTheme && defaultTheme !== void 0) $$bindings.defaultTheme(defaultTheme);
  if ($$props.nonce === void 0 && $$bindings.nonce && nonce !== void 0) $$bindings.nonce(nonce);
  if ($$props.themeStorageKey === void 0 && $$bindings.themeStorageKey && themeStorageKey$1 !== void 0) $$bindings.themeStorageKey(themeStorageKey$1);
  if ($$props.modeStorageKey === void 0 && $$bindings.modeStorageKey && modeStorageKey$1 !== void 0) $$bindings.modeStorageKey(modeStorageKey$1);
  {
    disableTransitions.set(disableTransitions$1);
  }
  {
    themeColors.set(themeColors$1);
  }
  {
    darkClassNames.set(darkClassNames$1);
  }
  {
    lightClassNames.set(lightClassNames$1);
  }
  {
    modeStorageKey.set(modeStorageKey$1);
  }
  {
    themeStorageKey.set(themeStorageKey$1);
  }
  trueNonce = typeof window === "undefined" ? nonce : "";
  $$unsubscribe_themeStorageKeyStore();
  $$unsubscribe_modeStorageKeyStore();
  return `${$$result.head += `<!-- HEAD_svelte-1nen96w_START -->${themeColors$1 ? `   <meta name="theme-color"${add_attribute("content", themeColors$1.dark, 0)}>` : ``}${trueNonce ? ` <!-- HTML_TAG_START -->${`<script nonce=${trueNonce}>(` + setInitialMode.toString() + `)(` + JSON.stringify(initConfig) + `);<\/script>`}<!-- HTML_TAG_END -->` : ` <!-- HTML_TAG_START -->${`<script>(` + setInitialMode.toString() + `)(` + JSON.stringify(initConfig) + `);<\/script>`}<!-- HTML_TAG_END -->`}<!-- HEAD_svelte-1nen96w_END -->`, ""}`;
});
function hexToHslTriplet(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return "0 0% 100%";
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = (g - b) / d % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
const SHADOWS = {
  none: "none",
  soft: "0 24px 80px rgba(26,25,22,0.08), 0 8px 24px rgba(26,25,22,0.06)",
  medium: "0 30px 90px rgba(26,25,22,0.12), 0 10px 28px rgba(26,25,22,0.08)",
  strong: "0 40px 100px rgba(26,25,22,0.18), 0 14px 34px rgba(26,25,22,0.10)"
};
const FLOAT_SHADOWS = {
  none: "none",
  soft: "drop-shadow(0 26px 60px rgba(26,25,22,0.12)) drop-shadow(0 8px 20px rgba(26,25,22,0.05))",
  medium: "drop-shadow(0 30px 64px rgba(26,25,22,0.14)) drop-shadow(0 10px 24px rgba(26,25,22,0.06))",
  strong: "drop-shadow(0 40px 80px rgba(26,25,22,0.18)) drop-shadow(0 14px 30px rgba(26,25,22,0.08))"
};
function themeToCssVars(theme) {
  return [
    `--background:${hexToHslTriplet(theme.background)}`,
    `--foreground:${hexToHslTriplet(theme.text)}`,
    `--bt-bg:${theme.background}`,
    `--bt-text:${theme.text}`,
    `--bt-muted:${theme.muted}`,
    `--bt-accent:${theme.accent}`,
    `--bt-button:${theme.button}`,
    `--bt-card:${theme.card}`,
    `--bt-radius:${theme.radius}px`,
    `--bt-shadow:${SHADOWS[theme.shadow]}`,
    `--bt-shadow-float:${FLOAT_SHADOWS[theme.shadow]}`,
    `--bt-glass-blur:${theme.glass ? "12px" : "0px"}`,
    `--bt-glass-bg:${theme.glass ? "rgba(255,255,255,0.72)" : theme.background}`
  ].join(";");
}
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let styleVars;
  let { data } = $$props;
  const content = writable(data.content);
  setContext("cms", content);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  {
    content.set(data.content);
  }
  styleVars = `${themeToCssVars(data.content.theme)};display:contents`;
  return `${validate_component(Mode_watcher, "ModeWatcher").$$render($$result, {}, {}, {})} <div${add_attribute("style", styleVars, 0)}>${slots.default ? slots.default({}) : ``}</div>`;
});
export {
  Layout as default
};
