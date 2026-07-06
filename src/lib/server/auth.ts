// ══════════════════════════════════════════════════════════════════════════
//  Auth admin minimale : mot de passe via variable d'environnement,
//  session par cookie signé HMAC. Aucun secret en dur dans le code.
// ══════════════════════════════════════════════════════════════════════════
import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '$env/dynamic/private';

export const COOKIE = 'bt_admin';

// Repli de dev pour que /admin soit testable sans .env (à surcharger en prod).
const DEV_PASSWORD = 'behar-admin';

function adminPassword(): string {
	return env.ADMIN_PASSWORD || DEV_PASSWORD;
}

function secret(): string {
	return env.ADMIN_SECRET || adminPassword() || 'behar-dev-secret';
}

/** Jeton de session déterministe (dépend du secret serveur). */
export function sessionToken(): string {
	return createHmac('sha256', secret()).update('bt-admin-session-v1').digest('hex');
}

/** Comparaison à temps constant du mot de passe fourni. */
export function verifyPassword(input: string): boolean {
	const a = Buffer.from(input || '');
	const b = Buffer.from(adminPassword());
	return a.length === b.length && timingSafeEqual(a, b);
}

/** Un cookie de session est-il valide ? */
export function verifySession(token: string | undefined): boolean {
	if (!token) return false;
	const a = Buffer.from(token);
	const b = Buffer.from(sessionToken());
	return a.length === b.length && timingSafeEqual(a, b);
}
