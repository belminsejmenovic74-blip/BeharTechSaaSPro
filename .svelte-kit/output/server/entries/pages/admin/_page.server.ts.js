import { r as redirect } from "../../../chunks/index.js";
import { C as COOKIE } from "../../../chunks/auth.js";
const actions = {
  logout: async ({ cookies }) => {
    cookies.delete(COOKIE, { path: "/" });
    throw redirect(303, "/admin/login");
  }
};
export {
  actions
};
