import { c as create_ssr_component, v as validate_component } from "../../../chunks/ssr.js";
import { c as compute_rest_props, a as subscribe } from "../../../chunks/lifecycle.js";
import { T as Toaster } from "../../../chunks/Toaster.js";
import "../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { c as derivedMode } from "../../../chunks/stores.js";
const Sonner_1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, []);
  let $mode, $$unsubscribe_mode;
  $$unsubscribe_mode = subscribe(derivedMode, (value) => $mode = value);
  $$unsubscribe_mode();
  return `${validate_component(Toaster, "Sonner").$$render(
    $$result,
    Object.assign(
      {},
      { theme: $mode },
      { class: "toaster group" },
      {
        toastOptions: {
          classes: {
            toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
          }
        }
      },
      $$restProps
    ),
    {},
    {}
  )}`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">${slots.default ? slots.default({}) : ``}</div> ${validate_component(Sonner_1, "Toaster").$$render($$result, {}, {}, {})}`;
});
export {
  Layout as default
};
