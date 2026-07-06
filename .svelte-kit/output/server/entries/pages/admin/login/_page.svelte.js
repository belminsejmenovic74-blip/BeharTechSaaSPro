import { c as create_ssr_component, v as validate_component, e as escape } from "../../../../chunks/ssr.js";
import "devalue";
import "../../../../chunks/client.js";
import { I as Icon } from "../../../../chunks/Icon.js";
const Lock = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "18",
        "height": "11",
        "x": "3",
        "y": "11",
        "rx": "2",
        "ry": "2"
      }
    ],
    ["path", { "d": "M7 11V7a5 5 0 0 1 10 0v4" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "lock" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { form = null } = $$props;
  if ($$props.form === void 0 && $$bindings.form && form !== void 0) $$bindings.form(form);
  return `${$$result.head += `<!-- HEAD_svelte-xuczb2_START -->${$$result.title = `<title>Admin · Behar Tech Pro</title>`, ""}<!-- HEAD_svelte-xuczb2_END -->`, ""} <div class="flex min-h-screen items-center justify-center px-6"><div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><div class="mb-6 flex flex-col items-center gap-3 text-center"><span class="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">${validate_component(Lock, "LockIcon").$$render($$result, { class: "size-5" }, {}, {})}</span> <div data-svelte-h="svelte-13sturh"><h1 class="text-lg font-semibold">Espace administrateur</h1> <p class="mt-1 text-sm text-slate-500">Behar Tech Pro — gestion du contenu</p></div></div> <form method="POST" class="flex flex-col gap-3"><label class="text-sm font-medium text-slate-700" for="password" data-svelte-h="svelte-1pi1zxd">Mot de passe</label> <input id="password" name="password" type="password" autocomplete="current-password" required class="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="••••••••"> ${form?.error ? `<p class="text-sm text-red-600">${escape(form.error)}</p>` : ``} <button type="submit" ${""} class="mt-2 h-10 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">${escape("Se connecter")}</button></form></div></div>`;
});
export {
  Page as default
};
