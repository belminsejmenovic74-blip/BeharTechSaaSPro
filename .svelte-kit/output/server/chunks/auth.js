import { createHmac, timingSafeEqual } from "node:crypto";
import { d as private_env } from "./shared-server.js";
const COOKIE = "bt_admin";
const DEV_PASSWORD = "behar-admin";
function adminPassword() {
  return private_env.ADMIN_PASSWORD || DEV_PASSWORD;
}
function secret() {
  return private_env.ADMIN_SECRET || adminPassword() || "behar-dev-secret";
}
function sessionToken() {
  return createHmac("sha256", secret()).update("bt-admin-session-v1").digest("hex");
}
function verifyPassword(input) {
  const a = Buffer.from(input || "");
  const b = Buffer.from(adminPassword());
  return a.length === b.length && timingSafeEqual(a, b);
}
function verifySession(token) {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(sessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
export {
  COOKIE as C,
  verifySession as a,
  sessionToken as s,
  verifyPassword as v
};
