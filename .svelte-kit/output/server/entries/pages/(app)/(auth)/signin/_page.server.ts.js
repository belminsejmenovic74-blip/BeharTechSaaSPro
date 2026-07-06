import { a as zod, f as formSchema } from "../../../../../chunks/zod.js";
import "../../../../../chunks/client.js";
import "just-clone";
import "ts-deepmerge";
import "../../../../../chunks/index.js";
import "devalue";
import { s as superValidate, f as fail } from "../../../../../chunks/superValidate.js";
import "memoize-weak";
const load = async () => {
  return {
    form: await superValidate(zod(formSchema))
  };
};
const actions = {
  default: async (event) => {
    const form = await superValidate(event, zod(formSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      form
    };
  }
};
export {
  actions,
  load
};
