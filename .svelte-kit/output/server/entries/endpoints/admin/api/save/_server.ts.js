import { e as error, j as json } from "../../../../../chunks/index.js";
import { w as writeContent } from "../../../../../chunks/server.js";
const POST = async ({ request, locals }) => {
  if (!locals.admin) throw error(401, "Non autorisé");
  const body = await request.json();
  await writeContent(body);
  return json({ ok: true });
};
export {
  POST
};
