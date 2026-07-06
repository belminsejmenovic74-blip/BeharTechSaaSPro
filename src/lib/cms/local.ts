// ══════════════════════════════════════════════════════════════════════════
//  Persistance CLIENT du CMS (site statique Vercel : pas de serveur).
//  Les modifs vivent dans localStorage + export JSON à committer pour la prod.
// ══════════════════════════════════════════════════════════════════════════
import { browser } from '$app/environment';

import { DEFAULT_CONTENT } from './default-content';
import type { SiteContent } from './types';

const KEY = 'bt_content';
export const AUTH_KEY = 'bt_admin_ok';
export const ADMIN_PASSWORD = 'behar-admin';

export function loadLocalContent(fallback: SiteContent = DEFAULT_CONTENT): SiteContent {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? { ...structuredClone(DEFAULT_CONTENT), ...JSON.parse(raw) } : fallback;
	} catch {
		return fallback;
	}
}

export function saveLocalContent(content: SiteContent): void {
	if (browser) localStorage.setItem(KEY, JSON.stringify(content));
}

export function clearLocalContent(): void {
	if (browser) localStorage.removeItem(KEY);
}

export function isAuthed(): boolean {
	return browser && sessionStorage.getItem(AUTH_KEY) === '1';
}

export function setAuthed(ok: boolean): void {
	if (!browser) return;
	if (ok) sessionStorage.setItem(AUTH_KEY, '1');
	else sessionStorage.removeItem(AUTH_KEY);
}
