import { browser } from '$app/environment';

import { DEFAULT_CONTENT } from './default-content';
import { supabase } from './supabase';
import type { LocalDbSchema, Page, PageSection, SiteContent } from './types';

const DB_DRAFT_KEY = 'bt_cms_db_draft';
const DB_PUBLISHED_KEY = 'bt_cms_db_published';

const HOME_PAGE_ID = '00000000-0000-4000-8000-000000000001';
const SECTION_IDS = [
	'00000000-0000-4000-8000-000000000101',
	'00000000-0000-4000-8000-000000000102',
	'00000000-0000-4000-8000-000000000103',
	'00000000-0000-4000-8000-000000000104',
	'00000000-0000-4000-8000-000000000105',
	'00000000-0000-4000-8000-000000000106',
	'00000000-0000-4000-8000-000000000107',
	'00000000-0000-4000-8000-000000000108',
	'00000000-0000-4000-8000-000000000109',
	'00000000-0000-4000-8000-000000000110',
	'00000000-0000-4000-8000-000000000111',
	'00000000-0000-4000-8000-000000000112'
];

function now() {
	return new Date().toISOString();
}

export function newCmsId() {
	return crypto.randomUUID();
}

export function createDefaultDb(): LocalDbSchema {
	const homePage: Page = {
		id: HOME_PAGE_ID,
		slug: '/',
		title: 'Accueil',
		seo_title: DEFAULT_CONTENT.seo.title,
		seo_description: DEFAULT_CONTENT.seo.description,
		status: 'published',
		created_at: now(),
		updated_at: now()
	};

	const sections: PageSection[] = [];
	const types = [
		'header',
		'hero',
		'stats',
		'showcaseA',
		'showcaseB',
		'showcaseC',
		'integrations',
		'pricing',
		'faq',
		'widget',
		'cta',
		'footer'
	];

	types.forEach((type, index) => {
		let content = (DEFAULT_CONTENT as any)[type];
		if (type.startsWith('showcase')) {
			content = (DEFAULT_CONTENT.showcases as any)[type.replace('showcase', '')];
		}

		const ref = DEFAULT_CONTENT.sections.find((s) => s.id === type);
		const visible = ref ? ref.visible : true;

		sections.push({
			id: SECTION_IDS[index],
			page_id: homePage.id,
			type,
			order: index,
			content: structuredClone(content),
			settings: { visible },
			created_at: now(),
			updated_at: now()
		});
	});

	return {
		pages: [homePage],
		page_sections: sections,
		theme: structuredClone(DEFAULT_CONTENT.theme)
	};
}

function normalizePage(page: any): Page {
	return {
		id: String(page?.id || newCmsId()),
		slug: String(page?.slug || '/'),
		title: String(page?.title || 'Accueil'),
		seo_title: String(page?.seo_title ?? DEFAULT_CONTENT.seo.title),
		seo_description: String(page?.seo_description ?? DEFAULT_CONTENT.seo.description),
		status: page?.status === 'draft' ? 'draft' : 'published',
		created_at: String(page?.created_at || now()),
		updated_at: String(page?.updated_at || now())
	};
}

function normalizeSection(section: any, index: number, pageId: string): PageSection {
	return {
		id: String(section?.id || newCmsId()),
		page_id: String(section?.page_id || pageId),
		type: String(section?.type || 'hero'),
		order: Number(section?.order ?? section?.sort_order ?? index),
		content: section?.content && typeof section.content === 'object' ? section.content : {},
		settings:
			section?.settings && typeof section.settings === 'object'
				? section.settings
				: { visible: true },
		created_at: String(section?.created_at || now()),
		updated_at: String(section?.updated_at || now())
	};
}

function normalizeDb(input: unknown): LocalDbSchema {
	const fallback = createDefaultDb();
	const raw = (input || {}) as Partial<LocalDbSchema>;
	const pages =
		Array.isArray(raw.pages) && raw.pages.length ? raw.pages.map(normalizePage) : fallback.pages;
	const pageId = pages[0]?.id || HOME_PAGE_ID;
	const pageSections =
		Array.isArray(raw.page_sections) && raw.page_sections.length
			? raw.page_sections
					.map((section, index) => normalizeSection(section, index, pageId))
					.sort((a, b) => a.order - b.order)
			: fallback.page_sections;

	return {
		pages,
		page_sections: pageSections,
		theme:
			raw.theme && typeof raw.theme === 'object'
				? { ...structuredClone(DEFAULT_CONTENT.theme), ...raw.theme }
				: fallback.theme
	};
}

function readCache(key: string): LocalDbSchema | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(key);
		return raw ? normalizeDb(JSON.parse(raw)) : null;
	} catch {
		return null;
	}
}

function writeCache(key: string, db: LocalDbSchema) {
	if (browser) localStorage.setItem(key, JSON.stringify(db));
}

export function cacheDraftDb(db: LocalDbSchema) {
	writeCache(DB_DRAFT_KEY, db);
}

export function getDraftDb(): LocalDbSchema {
	return readCache(DB_DRAFT_KEY) || readCache(DB_PUBLISHED_KEY) || createDefaultDb();
}

export function getPublishedDb(): LocalDbSchema {
	const cached = readCache(DB_PUBLISHED_KEY);
	if (cached) return cached;
	const fallback = createDefaultDb();
	writeCache(DB_PUBLISHED_KEY, fallback);
	return fallback;
}

export async function loginAdmin(passcode: string): Promise<string> {
	if (!supabase) throw new Error('Supabase n’est pas configuré.');
	const { data, error } = await supabase.rpc('cms_admin_login', { passcode });
	if (error) throw error;
	if (!data) throw new Error('Mot de passe incorrect.');
	return String(data);
}

export async function logoutAdmin(sessionToken: string) {
	if (!supabase || !sessionToken) return;
	await supabase.rpc('cms_admin_logout', { session_token: sessionToken });
}

export async function loadDraftDb(sessionToken: string): Promise<LocalDbSchema> {
	if (!supabase || !sessionToken) return getDraftDb();
	const { data, error } = await supabase.rpc('cms_get_draft', { session_token: sessionToken });
	if (error) throw error;

	const db = normalizeDb(data || createDefaultDb());
	cacheDraftDb(db);
	return db;
}

export async function loadPublishedDb(): Promise<LocalDbSchema> {
	if (!supabase) return getPublishedDb();
	const { data, error } = await supabase.rpc('cms_get_published', { page_slug: '/' });
	if (error) return getPublishedDb();

	const db = normalizeDb(data || createDefaultDb());
	writeCache(DB_PUBLISHED_KEY, db);
	return db;
}

export async function saveDraftDb(db: LocalDbSchema, sessionToken?: string) {
	cacheDraftDb(db);
	if (!supabase || !sessionToken) return;

	const { error } = await supabase.rpc('cms_save_draft', {
		session_token: sessionToken,
		payload: db
	});
	if (error) throw error;
}

export async function publishDb(db: LocalDbSchema, sessionToken?: string) {
	cacheDraftDb(db);
	writeCache(DB_PUBLISHED_KEY, db);
	if (!supabase || !sessionToken) return;

	const { error } = await supabase.rpc('cms_publish', {
		session_token: sessionToken,
		payload: db
	});
	if (error) throw error;
}

export async function clearDb(sessionToken?: string) {
	if (browser) {
		localStorage.removeItem(DB_DRAFT_KEY);
		localStorage.removeItem(DB_PUBLISHED_KEY);
	}

	if (!supabase || !sessionToken) return;
	const { error } = await supabase.rpc('cms_reset_draft', { session_token: sessionToken });
	if (error) throw error;
}

/* ══════════════════════════════════════════════════════════════════════════════
 *  Éditeur visuel « Mode édition » — persistance du SiteContent complet.
 *  On embarque le SiteContent dans le snapshot Supabase (champ `site_content`),
 *  à côté du squelette LocalDbSchema attendu par les RPC. Additif : n'altère pas
 *  l'éditeur /admin existant, et les champs supplémentaires sont conservés tels
 *  quels dans cms_versions.snapshot.
 * ════════════════════════════════════════════════════════════════════════════════
 */
function siteContentPayload(content: SiteContent) {
	const skeleton = createDefaultDb();
	return { ...skeleton, site_content: content };
}

function extractSiteContent(snapshot: unknown, fallback: SiteContent): SiteContent {
	const sc = (snapshot as { site_content?: unknown } | null)?.site_content;
	if (sc && typeof sc === 'object') {
		return { ...structuredClone(DEFAULT_CONTENT), ...(sc as Partial<SiteContent>) } as SiteContent;
	}
	return fallback;
}

/** Charge le brouillon SiteContent (repli sur `fallback` si Supabase absent). */
export async function loadDraftSiteContent(
	sessionToken: string,
	fallback: SiteContent
): Promise<SiteContent> {
	if (!supabase || !sessionToken) return fallback;
	const { data, error } = await supabase.rpc('cms_get_draft', { session_token: sessionToken });
	if (error) throw error;
	return extractSiteContent(data, fallback);
}

/** Charge le SiteContent publié (repli silencieux sur `fallback`). */
export async function loadPublishedSiteContent(fallback: SiteContent): Promise<SiteContent> {
	if (!supabase) return fallback;
	const { data, error } = await supabase.rpc('cms_get_published', { page_slug: '/' });
	if (error || !data) return fallback;
	return extractSiteContent(data, fallback);
}

export async function saveDraftSiteContent(content: SiteContent, sessionToken?: string) {
	if (!supabase || !sessionToken) return;
	const { error } = await supabase.rpc('cms_save_draft', {
		session_token: sessionToken,
		payload: siteContentPayload(content)
	});
	if (error) throw error;
}

export async function publishSiteContent(content: SiteContent, sessionToken?: string) {
	if (!supabase || !sessionToken) return;
	const { error } = await supabase.rpc('cms_publish', {
		session_token: sessionToken,
		payload: siteContentPayload(content)
	});
	if (error) throw error;
}

export interface CmsVersion {
	id: string;
	version_type: 'draft' | 'published';
	created_at: string;
}

/** Liste l'historique des versions (brouillons + publications). */
export async function listVersions(sessionToken: string): Promise<CmsVersion[]> {
	if (!supabase || !sessionToken) return [];
	const { data, error } = await supabase.rpc('cms_list_versions', { session_token: sessionToken });
	if (error) throw error;
	return Array.isArray(data) ? (data as CmsVersion[]) : [];
}

/** Restaure une version : renvoie son SiteContent (sans publier). */
export async function restoreVersion(
	sessionToken: string,
	versionId: string,
	fallback: SiteContent
): Promise<SiteContent> {
	if (!supabase || !sessionToken) return fallback;
	const { data, error } = await supabase.rpc('cms_restore_version', {
		session_token: sessionToken,
		version_id: versionId
	});
	if (error) throw error;
	return extractSiteContent(data, fallback);
}

async function sha256Hex(value: string) {
	const bytes = new TextEncoder().encode(value);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadCmsAsset(file: File, sessionToken: string, alt = '') {
	if (!supabase) throw new Error('Supabase n’est pas configuré.');
	if (!sessionToken) throw new Error('Session admin manquante.');

	const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
	const tokenHash = await sha256Hex(sessionToken);
	const path = `admin/${tokenHash}/${Date.now()}-${newCmsId()}.${ext}`;
	const uploaded = await supabase.storage.from('cms-assets').upload(path, file, {
		cacheControl: '31536000',
		upsert: false
	});
	if (uploaded.error) throw uploaded.error;

	const publicUrl = supabase.storage.from('cms-assets').getPublicUrl(path).data.publicUrl;
	await supabase.rpc('cms_record_asset', {
		session_token: sessionToken,
		asset_url: publicUrl,
		asset_path: path,
		asset_alt: alt || file.name,
		asset_type: file.type || 'application/octet-stream',
		asset_size: file.size
	});

	return publicUrl;
}