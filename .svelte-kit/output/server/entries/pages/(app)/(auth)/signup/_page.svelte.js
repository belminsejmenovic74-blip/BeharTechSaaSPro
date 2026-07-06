import { a as subscribe } from "../../../../../chunks/lifecycle.js";
import { c as create_ssr_component, v as validate_component, a as add_attribute } from "../../../../../chunks/ssr.js";
import { C as Chevron_left, F as Form_field, a as Control, b as Form_field_errors, c as Form_button, L as Loader, G as GitHubSvg } from "../../../../../chunks/index3.js";
import { B as Button } from "../../../../../chunks/button.js";
import { I as Input } from "../../../../../chunks/input.js";
import { s as superForm, z as zodClient, f as formSchema } from "../../../../../chunks/zod.js";
import "../../../../../chunks/client.js";
import "just-clone";
import "ts-deepmerge";
import "../../../../../chunks/index.js";
import "devalue";
import "memoize-weak";
import { a as toast } from "../../../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $formData, $$unsubscribe_formData;
  let { data } = $$props;
  let dataForm = data.form;
  let form = superForm(dataForm, {
    validators: zodClient(formSchema),
    onSubmit: () => {
      isFormLoading = true;
    },
    onUpdate: ({ result }) => {
      isFormLoading = false;
      if (result.status === 200) {
        toast.success("Consultez votre e-mail", {
          description: "Nous vous avons envoyé un lien de connexion. Pensez à vérifier vos spams."
        });
      } else {
        toast.error("Une erreur est survenue", {
          description: "Votre demande d’inscription a échoué. Veuillez réessayer."
        });
      }
    }
  });
  const { form: formData, enhance } = form;
  $$unsubscribe_formData = subscribe(formData, (value) => $formData = value);
  let loading = false;
  let isFormLoading = false;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-10r9im3_START -->${$$result.title = `<title>Inscription | Behar Tech Pro</title>`, ""}<meta name="description" content="Inscription à Behar Tech Pro"><!-- HEAD_svelte-10r9im3_END -->`, ""} <div class="container flex h-screen w-screen flex-col items-center justify-center">${validate_component(Button, "Button").$$render(
      $$result,
      {
        variant: "ghost",
        href: "/",
        class: "absolute left-4 top-4 md:left-8 md:top-8"
      },
      {},
      {
        default: () => {
          return `${validate_component(Chevron_left, "ChevronLeftIcon").$$render($$result, { class: "mr-2 size-4" }, {}, {})}
		Retour`;
        }
      }
    )} <div class="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[350px]"><div class="flex flex-col gap-2 text-center" data-svelte-h="svelte-1c5bnp8"> <h1 class="text-2xl font-semibold tracking-tight">Bienvenue sur Behar Tech Pro</h1> <p class="text-sm text-muted-foreground">Créez votre compte</p></div>  <form method="POST">${validate_component(Form_field, "Form.Field").$$render($$result, { form, name: "email", class: "mb-4" }, {}, {
      default: () => {
        return `${validate_component(Control, "Form.Control").$$render($$result, {}, {}, {
          default: ({ attrs }) => {
            return `${validate_component(Input, "Input").$$render(
              $$result,
              Object.assign({}, { placeholder: "nom@exemple.com" }, attrs, { value: $formData.email }),
              {
                value: ($$value) => {
                  $formData.email = $$value;
                  $$settled = false;
                }
              },
              {}
            )}`;
          }
        })}  ${validate_component(Form_field_errors, "Form.FieldErrors").$$render($$result, {}, {}, {})}`;
      }
    })} ${validate_component(Form_button, "Form.Button").$$render(
      $$result,
      {
        size: "sm",
        class: "w-full",
        disabled: isFormLoading
      },
      {},
      {
        default: () => {
          return `${isFormLoading ? `${validate_component(Loader, "Loader").$$render($$result, { class: "mr-2 size-4 animate-spin" }, {}, {})}` : ``}
				S’inscrire par e-mail`;
        }
      }
    )}</form>  <div class="relative" data-svelte-h="svelte-1i1fe0v"><div class="absolute inset-0 flex items-center"><span class="w-full border-t"></span></div> <div class="relative flex justify-center text-xs uppercase"><span class="bg-background px-2 text-muted-foreground">Ou continuer avec</span></div></div> ${validate_component(Button, "Button").$$render($$result, { variant: "outline", disabled: loading }, {}, {
      default: () => {
        return `${`<img${add_attribute("src", GitHubSvg, 0)} alt="github" class="mr-2 size-4">`}
			Github`;
      }
    })} <p class="px-8 text-center text-sm text-muted-foreground" data-svelte-h="svelte-q2nd0c"><a href="/signin" class="hover:text-brand underline underline-offset-4">Vous avez déjà un compte ? Connectez-vous</a></p></div></div>`;
  } while (!$$settled);
  $$unsubscribe_formData();
  return $$rendered;
});
export {
  Page as default
};
