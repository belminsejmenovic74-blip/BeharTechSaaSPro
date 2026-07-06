import { c as create_ssr_component, e as escape, v as validate_component, b as each, a as add_attribute } from "../../../chunks/ssr.js";
import { a as subscribe } from "../../../chunks/lifecycle.js";
import { I as Input } from "../../../chunks/input.js";
import { B as Button, c as cn } from "../../../chunks/button.js";
import { g as getCms } from "../../../chunks/context.js";
import { I as Icon } from "../../../chunks/Icon.js";
const DiscordSvg = "data:image/svg+xml;base64,PHN2ZyByb2xlPSJpbWciIGZpbGw9JyNmZmYnIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RGlzY29yZDwvdGl0bGU+PHBhdGggZD0iTTIwLjMxNyA0LjM2OThhMTkuNzkxMyAxOS43OTEzIDAgMDAtNC44ODUxLTEuNTE1Mi4wNzQxLjA3NDEgMCAwMC0uMDc4NS4wMzcxYy0uMjExLjM3NTMtLjQ0NDcuODY0OC0uNjA4MyAxLjI0OTUtMS44NDQ3LS4yNzYyLTMuNjgtLjI3NjItNS40ODY4IDAtLjE2MzYtLjM5MzMtLjQwNTgtLjg3NDItLjYxNzctMS4yNDk1YS4wNzcuMDc3IDAgMDAtLjA3ODUtLjAzNyAxOS43MzYzIDE5LjczNjMgMCAwMC00Ljg4NTIgMS41MTUuMDY5OS4wNjk5IDAgMDAtLjAzMjEuMDI3N0MuNTMzNCA5LjA0NTgtLjMxOSAxMy41Nzk5LjA5OTIgMTguMDU3OGEuMDgyNC4wODI0IDAgMDAuMDMxMi4wNTYxYzIuMDUyOCAxLjUwNzYgNC4wNDEzIDIuNDIyOCA1Ljk5MjkgMy4wMjk0YS4wNzc3LjA3NzcgMCAwMC4wODQyLS4wMjc2Yy40NjE2LS42MzA0Ljg3MzEtMS4yOTUyIDEuMjI2LTEuOTk0MmEuMDc2LjA3NiAwIDAwLS4wNDE2LS4xMDU3Yy0uNjUyOC0uMjQ3Ni0xLjI3NDMtLjU0OTUtMS44NzIyLS44OTIzYS4wNzcuMDc3IDAgMDEtLjAwNzYtLjEyNzdjLjEyNTgtLjA5NDMuMjUxNy0uMTkyMy4zNzE4LS4yOTE0YS4wNzQzLjA3NDMgMCAwMS4wNzc2LS4wMTA1YzMuOTI3OCAxLjc5MzMgOC4xOCAxLjc5MzMgMTIuMDYxNCAwYS4wNzM5LjA3MzkgMCAwMS4wNzg1LjAwOTVjLjEyMDIuMDk5LjI0Ni4xOTgxLjM3MjguMjkyNGEuMDc3LjA3NyAwIDAxLS4wMDY2LjEyNzYgMTIuMjk4NiAxMi4yOTg2IDAgMDEtMS44NzMuODkxNC4wNzY2LjA3NjYgMCAwMC0uMDQwNy4xMDY3Yy4zNjA0LjY5OC43NzE5IDEuMzYyOCAxLjIyNSAxLjk5MzJhLjA3Ni4wNzYgMCAwMC4wODQyLjAyODZjMS45NjEtLjYwNjcgMy45NDk1LTEuNTIxOSA2LjAwMjMtMy4wMjk0YS4wNzcuMDc3IDAgMDAuMDMxMy0uMDU1MmMuNTAwNC01LjE3Ny0uODM4Mi05LjY3MzktMy41NDg1LTEzLjY2MDRhLjA2MS4wNjEgMCAwMC0uMDMxMi0uMDI4NnpNOC4wMiAxNS4zMzEyYy0xLjE4MjUgMC0yLjE1NjktMS4wODU3LTIuMTU2OS0yLjQxOSAwLTEuMzMzMi45NTU1LTIuNDE4OSAyLjE1Ny0yLjQxODkgMS4yMTA4IDAgMi4xNzU3IDEuMDk1MiAyLjE1NjggMi40MTkgMCAxLjMzMzItLjk1NTUgMi40MTg5LTIuMTU2OSAyLjQxODl6bTcuOTc0OCAwYy0xLjE4MjUgMC0yLjE1NjktMS4wODU3LTIuMTU2OS0yLjQxOSAwLTEuMzMzMi45NTU0LTIuNDE4OSAyLjE1NjktMi40MTg5IDEuMjEwOCAwIDIuMTc1NyAxLjA5NTIgMi4xNTY4IDIuNDE5IDAgMS4zMzMyLS45NDYgMi40MTg5LTIuMTU2OCAyLjQxODlaIi8+PC9zdmc+";
const TwitterSvg = "data:image/svg+xml;base64,PHN2ZyByb2xlPSJpbWciIGZpbGw9JyNmZmYnIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+WDwvdGl0bGU+PHBhdGggZD0iTTE4LjkwMSAxLjE1M2gzLjY4bC04LjA0IDkuMTlMMjQgMjIuODQ2aC03LjQwNmwtNS44LTcuNTg0LTYuNjM4IDcuNTg0SC40NzRsOC42LTkuODNMMCAxLjE1NGg3LjU5NGw1LjI0MyA2LjkzMlpNMTcuNjEgMjAuNjQ0aDIuMDM5TDYuNDg2IDMuMjRINC4yOThaIi8+PC9zdmc+";
const Footer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let footer;
  let $cms, $$unsubscribe_cms;
  const cms = getCms();
  $$unsubscribe_cms = subscribe(cms, (value) => $cms = value);
  const footerSocials = [
    {
      href: "",
      name: "Discord",
      icon: DiscordSvg
    },
    {
      href: "",
      name: "Twitter",
      icon: TwitterSvg
    }
  ];
  footer = $cms.footer;
  $$unsubscribe_cms();
  return `<footer><div class="mx-auto w-full max-w-screen-xl xl:pb-2"><div class="gap-4 p-4 px-8 py-16 sm:pb-16 md:flex md:justify-between"><div class="mb-12 flex flex-col gap-4"><a href="/" class="flex items-center gap-1.5 text-2xl font-semibold">${escape(footer.brand)}<span class="rounded-[5px] border px-1.5 py-0.5 text-[11px] font-bold uppercase leading-none tracking-wide" data-svelte-h="svelte-138is1">PRO</span></a> <p class="max-w-xs">${escape(footer.tagline)}</p> <div class="mt-2 flex max-w-xs flex-col gap-2"><h2 class="text-sm font-medium uppercase tracking-tighter text-gray-900">${escape(footer.newsletterTitle)}</h2> <form class="flex items-center gap-2">${validate_component(Input, "Input").$$render(
    $$result,
    {
      type: "email",
      placeholder: footer.newsletterPlaceholder,
      class: "h-9"
    },
    {},
    {}
  )} ${validate_component(Button, "Button").$$render($$result, { type: "submit", size: "sm" }, {}, {
    default: () => {
      return `${escape(footer.newsletterButton)}`;
    }
  })}</form></div></div> <div class="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">${each(footer.columns, (nav) => {
    return `<div><h2 class="mb-6 text-sm font-medium uppercase tracking-tighter text-gray-900">${escape(nav.label)}</h2> <ul class="grid gap-2">${each(nav.items, (item) => {
      return `<li><a${add_attribute("href", item.href, 0)} class="cursor-pointer text-sm font-[450] text-gray-400 duration-200 hover:text-gray-600">${escape(item.label)}</a> </li>`;
    })}</ul> </div>`;
  })}</div></div> <div class="flex flex-col gap-2 rounded-md border-neutral-700/20 px-8 py-4 sm:flex sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center space-x-5 sm:mt-0 sm:justify-center">${each(footerSocials, (social) => {
    return `<a${add_attribute("href", social.href, 0)} class="fill-gray-500 text-gray-500 hover:fill-gray-900 hover:text-gray-900"><img${add_attribute("src", social.icon, 0)} class="size-4"${add_attribute("alt", social.name, 0)}> <span class="sr-only">${escape(social.name)}</span> </a>`;
  })}</div> <span class="text-sm text-gray-500 sm:text-center">© ${escape((/* @__PURE__ */ new Date()).getFullYear())} <a href="/" class="cursor-pointer">${escape(footer.copyright)}</a>. Tous droits réservés.</span></div></div></footer>`;
});
const Align_justify = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "line",
      {
        "x1": "3",
        "x2": "21",
        "y1": "6",
        "y2": "6"
      }
    ],
    [
      "line",
      {
        "x1": "3",
        "x2": "21",
        "y1": "12",
        "y2": "12"
      }
    ],
    [
      "line",
      {
        "x1": "3",
        "x2": "21",
        "y1": "18",
        "y2": "18"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "align-justify" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let header;
  let $cms, $$unsubscribe_cms;
  const cms = getCms();
  $$unsubscribe_cms = subscribe(cms, (value) => $cms = value);
  let hamburgerMenuIsOpen = false;
  header = $cms.header;
  [
    ...header.nav,
    {
      label: header.loginLabel,
      href: header.loginHref
    },
    {
      label: header.ctaLabel,
      href: header.ctaHref
    }
  ];
  $$unsubscribe_cms();
  return `<header class="fixed left-0 top-0 z-50 w-full -translate-y-4 animate-fade-in border-b border-[rgba(26,25,22,0.08)] opacity-0" style="background: var(--bt-glass-bg); backdrop-filter: blur(var(--bt-glass-blur)); -webkit-backdrop-filter: blur(var(--bt-glass-blur));"><div class="container flex h-20 items-center justify-between"><a class="text-md flex items-center gap-1.5 font-semibold" href="/">${escape(header.brand)}<span class="rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide">${escape(header.badge)}</span></a> <div class="ml-auto hidden items-center gap-6 md:flex lg:gap-8">${each(header.nav, (item) => {
    return `<a${add_attribute("href", item.href, 0)} class="text-sm text-gray-600 transition hover:text-[#1A1916]">${escape(item.label)}</a>`;
  })} <a class="text-sm text-[#1A1916]"${add_attribute("href", header.loginHref, 0)}>${escape(header.loginLabel)}</a> <a class="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" style="background: var(--bt-button)"${add_attribute("href", header.ctaHref, 0)}>${escape(header.ctaLabel)}</a></div> <button class="ml-6 md:hidden"><span class="sr-only" data-svelte-h="svelte-zt9sly">Toggle menu</span> ${`${validate_component(Align_justify, "AlignJustify").$$render($$result, { strokeWidth: 1.4, class: "text-gray-400" }, {}, {})}`}</button></div></header> <nav${add_attribute(
    "class",
    cn(`fixed left-0 top-0 z-50 h-screen w-full overflow-auto `, {
      "pointer-events-none": !hamburgerMenuIsOpen,
      "bg-background/70 backdrop-blur-md": hamburgerMenuIsOpen
    }),
    0
  )}>${``}</nav>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="min-h-screen bg-background font-sans antialiased">${validate_component(Header, "Header").$$render($$result, {}, {}, {})} <div class="mx-auto flex-1 overflow-hidden">${slots.default ? slots.default({}) : ``}</div> ${validate_component(Footer, "Footer").$$render($$result, {}, {}, {})}</div>`;
});
export {
  Layout as default
};
