import { a as verifySession, C as COOKIE } from "./auth.js";
const handle = async ({ event, resolve }) => {
  event.locals.admin = verifySession(event.cookies.get(COOKIE));
  return resolve(event);
};
export {
  handle
};
