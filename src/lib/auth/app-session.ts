import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const APP_SESSION_COOKIE = "btp_app_session";

export type AppSession = {
  userId: string;
  workshopId: string;
  licenseId: string;
  role: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("APP_SESSION_SECRET doit contenir au moins 32 caracteres.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAppSession(input: Omit<AppSession, "expiresAt">, lifetimeSeconds = 60 * 60 * 8) {
  const session: AppSession = { ...input, expiresAt: Math.floor(Date.now() / 1000) + lifetimeSeconds };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAppSession(token: string | null | undefined): AppSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!(payload && signature)) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AppSession;
    if (!parsed.userId || !parsed.workshopId || parsed.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentAppSession(): Promise<AppSession | null> {
  return verifyAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
}
