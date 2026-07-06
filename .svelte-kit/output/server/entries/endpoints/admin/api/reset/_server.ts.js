import { e as error, j as json } from "../../../../../chunks/index.js";
import { r as resetContent } from "../../../../../chunks/server.js";
const POST = async ({ locals }) => {
  if (!locals.admin) throw error(401, "Non autorisé");
  const content = await resetContent();
  return json({ ok: true, content });
};
export {
  POST
};
