// ══════════════════════════════════════════════════════════════════════════
//  Persistance CLIENT du CMS (site statique Vercel : pas de serveur).
//  Les modifs vivent dans localStorage + export JSON à committer pour la prod.
// ══════════════════════════════════════════════════════════════════════════
import { browser } from '$app/environment';

import { DEFAULT_CONTENT } from './default-content';
import type { SiteContent } from './types';

const KEY = 'bt_content';
export const AUTH_KEY = 'bt_admin_ok';
export const ADMIN_SESSION_KEY = 'bt_cms_admin_session';

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
	return browser && Boolean(getAdminSession());
}

export function setAuthed(ok: boolean): void {
	if (!browser) return;
	if (!ok) {
		sessionStorage.removeItem(AUTH_KEY);
		clearAdminSession();
	}
}

export function getAdminSession(): string {
	return browser ? sessionStorage.getItem(ADMIN_SESSION_KEY) || '' : '';
}

export function setAdminSession(token: string): void {
	if (!browser) return;
	sessionStorage.setItem(ADMIN_SESSION_KEY, token);
	sessionStorage.setItem(AUTH_KEY, '1');
}

export function clearAdminSession(): void {
	if (!browser) return;
	sessionStorage.removeItem(ADMIN_SESSION_KEY);
	sessionStorage.removeItem(AUTH_KEY);
}
