import { c as create_ssr_component, v as validate_component } from "../../../../chunks/ssr.js";
import { T as Toaster } from "../../../../chunks/Toaster.js";
import "../../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Toaster, "Toaster").$$render($$result, { theme: "dark" }, {}, {})} ${slots.default ? slots.default({}) : ``}`;
});
export {
  Layout as default
};
