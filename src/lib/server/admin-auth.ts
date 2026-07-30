import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Session de la console super-admin.
 *
 * Le secret est partagé (`ADMIN_ACCESS_TOKEN`) : il authentifie l'accès, pas une
 * personne. Le journal d'audit ne peut donc pas distinguer les opérateurs.
 */
export const ADMIN_COOKIE = "btp_admin";

function sha256(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function adminSessionHash(): string | null {
  const secret = process.env.ADMIN_ACCESS_TOKEN;
  if (!secret) return null;
  return sha256(`btp-admin:${secret}`);
}

export async function isAdminSession(): Promise<boolean> {
  const expected = adminSessionHash();
  if (!expected) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === expected;
}

export async function openAdminSession(password: string): Promise<{ success: boolean; message?: string }> {
  const secret = process.env.ADMIN_ACCESS_TOKEN;
  if (!secret) return { success: false, message: "Accès administrateur non configuré sur le serveur." };
  const provided = Buffer.from(sha256((password || "").trim()));
  const expected = Buffer.from(sha256(secret));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { success: false, message: "Mot de passe incorrect." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, sha256(`btp-admin:${secret}`), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return { success: true };
}

/** Libellé d'acteur écrit dans le journal d'audit. */
export const ADMIN_ACTOR = "super-admin";
