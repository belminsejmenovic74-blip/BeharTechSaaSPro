import { a as readContent } from "../../chunks/server.js";
const load = async ({ locals }) => {
  return {
    content: await readContent(),
    admin: locals.admin
  };
};
export {
  load
};
