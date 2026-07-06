import { r as redirect } from "../../../chunks/index.js";
import { a as readContent } from "../../../chunks/server.js";
import { l as listMedia } from "../../../chunks/media.js";
const load = async ({ locals, url }) => {
  const isLogin = url.pathname.startsWith("/admin/login");
  if (!locals.admin && !isLogin) throw redirect(303, "/admin/login");
  if (locals.admin && isLogin) throw redirect(303, "/admin");
  return {
    content: await readContent(),
    admin: locals.admin,
    media: locals.admin ? await listMedia() : []
  };
};
export {
  load
};
