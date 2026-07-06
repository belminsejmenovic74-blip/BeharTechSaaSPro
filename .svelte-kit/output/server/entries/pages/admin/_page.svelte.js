import { c as create_ssr_component, v as validate_component, e as escape, a as add_attribute, b as each, m as missing_component } from "../../../chunks/ssr.js";
import "../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { S as Sparkles } from "../../../chunks/sparkles.js";
const Chart_column = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "M3 3v16a2 2 0 0 0 2 2h16" }],
    ["path", { "d": "M18 17V9" }],
    ["path", { "d": "M13 17V5" }],
    ["path", { "d": "M8 17v-3" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "chart-column" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Credit_card = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "20",
        "height": "14",
        "x": "2",
        "y": "5",
        "rx": "2"
      }
    ],
    [
      "line",
      {
        "x1": "2",
        "x2": "22",
        "y1": "10",
        "y2": "10"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "credit-card" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const External_link = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "M15 3h6v6" }],
    ["path", { "d": "M10 14 21 3" }],
    [
      "path",
      {
        "d": "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "external-link" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Images = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "M18 22H4a2 2 0 0 1-2-2V6" }],
    [
      "path",
      {
        "d": "m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"
      }
    ],
    ["circle", { "cx": "12", "cy": "8", "r": "2" }],
    [
      "rect",
      {
        "width": "16",
        "height": "16",
        "x": "6",
        "y": "2",
        "rx": "2"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "images" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Layout_grid = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "7",
        "height": "7",
        "x": "3",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "7",
        "height": "7",
        "x": "14",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "7",
        "height": "7",
        "x": "14",
        "y": "14",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "7",
        "height": "7",
        "x": "3",
        "y": "14",
        "rx": "1"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "layout-grid" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Layout_list = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "7",
        "height": "7",
        "x": "3",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "7",
        "height": "7",
        "x": "3",
        "y": "14",
        "rx": "1"
      }
    ],
    ["path", { "d": "M14 4h7" }],
    ["path", { "d": "M14 9h7" }],
    ["path", { "d": "M14 15h7" }],
    ["path", { "d": "M14 20h7" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "layout-list" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Log_out = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
      }
    ],
    ["polyline", { "points": "16 17 21 12 16 7" }],
    [
      "line",
      {
        "x1": "21",
        "x2": "9",
        "y1": "12",
        "y2": "12"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "log-out" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Palette = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "circle",
      {
        "cx": "13.5",
        "cy": "6.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "17.5",
        "cy": "10.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "8.5",
        "cy": "7.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "6.5",
        "cy": "12.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "path",
      {
        "d": "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "palette" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Panel_bottom = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2"
      }
    ],
    ["path", { "d": "M3 15h18" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "panel-bottom" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Panel_top = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2"
      }
    ],
    ["path", { "d": "M3 9h18" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "panel-top" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Puzzle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "puzzle" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Rotate_ccw = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
      }
    ],
    ["path", { "d": "M3 3v5h5" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "rotate-ccw" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Save = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
      }
    ],
    [
      "path",
      {
        "d": "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"
      }
    ],
    ["path", { "d": "M7 3v4a1 1 0 0 0 1 1h7" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "save" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Search = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["circle", { "cx": "11", "cy": "11", "r": "8" }],
    ["path", { "d": "m21 21-4.3-4.3" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "search" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Field = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { label = "" } = $$props;
  let { hint = "" } = $$props;
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  if ($$props.hint === void 0 && $$bindings.hint && hint !== void 0) $$bindings.hint(hint);
  return `<label class="flex flex-col gap-1.5">${label ? `<span class="text-xs font-semibold uppercase tracking-wide text-slate-500">${escape(label)}</span>` : ``} ${slots.default ? slots.default({}) : ``} ${hint ? `<span class="text-xs text-slate-400">${escape(hint)}</span>` : ``}</label>`;
});
const Color = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { value = "#000000" } = $$props;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  return `<div class="flex items-center gap-2"><input type="color" class="size-9 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"${add_attribute("value", value, 0)}> <input type="text" class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"${add_attribute("value", value, 0)}></div>`;
});
const Toggle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { checked = false } = $$props;
  let { label = "" } = $$props;
  if ($$props.checked === void 0 && $$bindings.checked && checked !== void 0) $$bindings.checked(checked);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  return `<button type="button" role="switch"${add_attribute("aria-checked", checked, 0)} class="inline-flex items-center gap-2"><span class="${"relative h-5 w-9 shrink-0 rounded-full transition-colors " + escape(checked ? "bg-emerald-600" : "bg-slate-300", true)}"><span class="${"absolute top-0.5 size-4 rounded-full bg-white transition-all " + escape(checked ? "left-4" : "left-0.5", true)}"></span></span> ${label ? `<span class="text-sm text-slate-600">${escape(label)}</span>` : ``}</button>`;
});
const AdminThemeEditor = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { theme } = $$props;
  const shadows = ["none", "soft", "medium", "strong"];
  if ($$props.theme === void 0 && $$bindings.theme && theme !== void 0) $$bindings.theme(theme);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="grid gap-5 sm:grid-cols-2">${validate_component(Field, "Field").$$render($$result, { label: "Fond général" }, {}, {
      default: () => {
        return `${validate_component(Color, "Color").$$render(
          $$result,
          { value: theme.background },
          {
            value: ($$value) => {
              theme.background = $$value;
              $$settled = false;
            }
          },
          {}
        )}`;
      }
    })} ${validate_component(Field, "Field").$$render($$result, { label: "Texte principal" }, {}, {
      default: () => {
        return `${validate_component(Color, "Color").$$render(
          $$result,
          { value: theme.text },
          {
            value: ($$value) => {
              theme.text = $$value;
              $$settled = false;
            }
          },
          {}
        )}`;
      }
    })} ${validate_component(Field, "Field").$$render($$result, { label: "Texte secondaire" }, {}, {
      default: () => {
        return `${validate_component(Color, "Color").$$render(
          $$result,
          { value: theme.muted },
          {
            value: ($$value) => {
              theme.muted = $$value;
              $$settled = false;
            }
          },
          {}
        )}`;
      }
    })} ${validate_component(Field, "Field").$$render($$result, { label: "Accent" }, {}, {
      default: () => {
        return `${validate_component(Color, "Color").$$render(
          $$result,
          { value: theme.accent },
          {
            value: ($$value) => {
              theme.accent = $$value;
              $$settled = false;
            }
          },
          {}
        )}`;
      }
    })} ${validate_component(Field, "Field").$$render($$result, { label: "Boutons" }, {}, {
      default: () => {
        return `${validate_component(Color, "Color").$$render(
          $$result,
          { value: theme.button },
          {
            value: ($$value) => {
              theme.button = $$value;
              $$settled = false;
            }
          },
          {}
        )}`;
      }
    })} ${validate_component(Field, "Field").$$render($$result, { label: "Cartes" }, {}, {
      default: () => {
        return `${validate_component(Color, "Color").$$render(
          $$result,
          { value: theme.card },
          {
            value: ($$value) => {
              theme.card = $$value;
              $$settled = false;
            }
          },
          {}
        )}`;
      }
    })} ${validate_component(Field, "Field").$$render(
      $$result,
      {
        label: "Rayon des cartes (" + theme.radius + "px)"
      },
      {},
      {
        default: () => {
          return `<input type="range" min="0" max="40" class="w-full accent-emerald-600"${add_attribute("value", theme.radius, 0)}>`;
        }
      }
    )} ${validate_component(Field, "Field").$$render($$result, { label: "Intensité des ombres" }, {}, {
      default: () => {
        return `<div class="flex gap-2">${each(shadows, (s) => {
          return `<button type="button" class="${"flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize transition " + escape(
            theme.shadow === s ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-500 hover:bg-slate-50",
            true
          )}">${escape(s)} </button>`;
        })}</div>`;
      }
    })} <div class="sm:col-span-2">${validate_component(Field, "Field").$$render($$result, { label: "Effet glass léger (header)" }, {}, {
      default: () => {
        return `${validate_component(Toggle, "Toggle").$$render(
          $$result,
          {
            label: theme.glass ? "Activé" : "Désactivé",
            checked: theme.glass
          },
          {
            checked: ($$value) => {
              theme.glass = $$value;
              $$settled = false;
            }
          },
          {}
        )}`;
      }
    })}</div></div> <p class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700" data-svelte-h="svelte-13he047">Astuce : « Réinitialiser » (en haut) restaure la DA Behar Tech Pro par défaut
	(#FAFAF8 / #1A1916 / #6B6B6B / accent #2A9D8F).</p>`;
  } while (!$$settled);
  return $$rendered;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  let content = structuredClone(data.content);
  [...data.media];
  const groups = [
    {
      id: "apparence",
      label: "Apparence",
      icon: Palette
    },
    {
      id: "sections",
      label: "Sections",
      icon: Layout_list
    },
    {
      id: "header",
      label: "En-tête",
      icon: Panel_top
    },
    {
      id: "hero",
      label: "Hero",
      icon: Sparkles
    },
    {
      id: "stats",
      label: "Chiffres",
      icon: Chart_column
    },
    {
      id: "showcaseA",
      label: "Écrans boutique",
      icon: Layout_grid
    },
    {
      id: "showcaseB",
      label: "Services",
      icon: Layout_grid
    },
    {
      id: "showcaseC",
      label: "Clients",
      icon: Layout_grid
    },
    {
      id: "integrations",
      label: "Intégrations",
      icon: Puzzle
    },
    {
      id: "pricing",
      label: "Tarifs",
      icon: Credit_card
    },
    {
      id: "footer",
      label: "Pied de page",
      icon: Panel_bottom
    },
    { id: "seo", label: "SEO", icon: Search },
    {
      id: "medias",
      label: "Médias",
      icon: Images
    }
  ];
  let tab = "apparence";
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-xuczb2_START -->${$$result.title = `<title>Admin · Behar Tech Pro</title>`, ""}<!-- HEAD_svelte-xuczb2_END -->`, ""} <div class="flex min-h-screen"> <aside class="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"><div class="flex h-16 items-center gap-2 border-b border-slate-200 px-5 font-semibold" data-svelte-h="svelte-1hq8d5j"><span class="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-xs text-white">BT</span>
			Behar CMS</div> <nav class="flex-1 overflow-auto p-3">${each(groups, (g) => {
      return `<button type="button" class="${"mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition " + escape(
        tab === g.id ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-600 hover:bg-slate-50",
        true
      )}">${validate_component(g.icon || missing_component, "svelte:component").$$render($$result, { class: "size-4" }, {}, {})} ${escape(g.label)} </button>`;
    })}</nav></aside>  <div class="flex min-w-0 flex-1 flex-col"> <header class="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-5 backdrop-blur"><div class="flex items-center gap-2"> <select class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm lg:hidden">${each(groups, (g) => {
      return `<option${add_attribute("value", g.id, 0)}>${escape(g.label)}</option>`;
    })}</select> <span class="hidden text-sm font-medium text-slate-700 lg:block">${escape(groups.find((g) => g.id === tab)?.label)}</span> ${``}</div> <div class="flex items-center gap-2"><a href="/" target="_blank" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">${validate_component(External_link, "ExternalLink").$$render($$result, { class: "size-4" }, {}, {})} <span class="hidden sm:inline" data-svelte-h="svelte-136f1aq">Voir le site</span></a> <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">${validate_component(Rotate_ccw, "RotateCcw").$$render($$result, { class: "size-4" }, {}, {})} <span class="hidden sm:inline" data-svelte-h="svelte-91bks4">Réinitialiser</span></button> <button type="button" ${"disabled"} class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">${validate_component(Save, "Save").$$render($$result, { class: "size-4" }, {}, {})} ${escape("Enregistrer")}</button> <form method="POST" action="?/logout"><button type="submit" title="Déconnexion" class="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50">${validate_component(Log_out, "LogOut").$$render($$result, { class: "size-4" }, {}, {})}</button></form></div></header>  <main class="flex-1 overflow-auto p-5 lg:p-8"><div class="mx-auto max-w-3xl">${`${validate_component(AdminThemeEditor, "AdminThemeEditor").$$render(
      $$result,
      { theme: content.theme },
      {
        theme: ($$value) => {
          content.theme = $$value;
          $$settled = false;
        }
      },
      {}
    )}`}</div></main></div></div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};
