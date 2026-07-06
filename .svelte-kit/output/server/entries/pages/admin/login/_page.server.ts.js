import { d as dev } from "../../../../chunks/index4.js";
import { f as fail, r as redirect } from "../../../../chunks/index.js";
import { v as verifyPassword, C as COOKIE, s as sessionToken } from "../../../../chunks/auth.js";
const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const password = String(data.get("password") ?? "");
    if (!verifyPassword(password)) {
      return fail(401, { error: "Mot de passe incorrect." });
    }
    cookies.set(COOKIE, sessionToken(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: !dev,
      maxAge: 60 * 60 * 24 * 30
    });
    throw redirect(303, "/admin");
  }
};
export {
  actions
};
