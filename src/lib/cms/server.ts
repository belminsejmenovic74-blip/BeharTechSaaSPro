// ══════════════════════════════════════════════════════════════════════════
//  Persistance CMS (serveur) — lit/écrit data/site-content.json.
//  Repli automatique sur DEFAULT_CONTENT si le fichier manque ou est partiel,
//  pour que le site public ne casse jamais.
// ══════════════════════════════════════════════════════════════════════════
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { DEFAULT_CONTENT } from './default-content';
import type { SiteContent } from './types';

const FILE = path.join(process.cwd(), 'data', 'site-content.json');

/** Fusion profonde : les clés absentes du JSON héritent des valeurs par défaut.
 *  Les tableaux sont remplacés tels quels (pas de fusion élément par élément). */
function deepMerge<T>(base: T, override: unknown): T {
	if (Array.isArray(base)) {
		return (Array.isArray(override) ? override : base) as T;
	}
	if (base && typeof base === 'object') {
		const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
		const ov = (override ?? {}) as Record<string, unknown>;
		for (const key of Object.keys(out)) {
			if (key in ov) out[key] = deepMerge((base as Record<string, unknown>)[key], ov[key]);
		}
		return out as T;
	}
	return (override === undefined ? base : (override as T));
}

let cache: SiteContent | null = null;

/** Contenu courant du site (JSON disque fusionné avec les défauts). */
export async function readContent(): Promise<SiteContent> {
	if (cache) return cache;
	try {
		const raw = await fs.readFile(FILE, 'utf-8');
		cache = deepMerge(DEFAULT_CONTENT, JSON.parse(raw));
	} catch {
		cache = DEFAULT_CONTENT;
	}
	return cache;
}

/** Écrit le contenu sur disque et invalide le cache. */
export async function writeContent(content: SiteContent): Promise<void> {
	await fs.mkdir(path.dirname(FILE), { recursive: true });
	const merged = deepMerge(DEFAULT_CONTENT, content);
	await fs.writeFile(FILE, JSON.stringify(merged, null, 2), 'utf-8');
	cache = merged;
}

/** Réinitialise sur la DA Behar Tech Pro par défaut. */
export async function resetContent(): Promise<SiteContent> {
	await writeContent(DEFAULT_CONTENT);
	return DEFAULT_CONTENT;
}
