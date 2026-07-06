// ══════════════════════════════════════════════════════════════════════════
//  Médias : liste et upload dans static/imgs (URLs publiques stables /imgs/*).
// ══════════════════════════════════════════════════════════════════════════
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'static', 'imgs');
const OK = /\.(png|jpe?g|webp|svg|gif|avif)$/i;

/** URLs publiques des médias disponibles (triées). */
export async function listMedia(): Promise<string[]> {
	try {
		const files = await fs.readdir(DIR);
		return files
			.filter((f) => OK.test(f))
			.sort()
			.map((f) => `/imgs/${f}`);
	} catch {
		return [];
	}
}

/** Enregistre un fichier uploadé et renvoie son URL publique. */
export async function saveMedia(name: string, data: Buffer): Promise<string> {
	await fs.mkdir(DIR, { recursive: true });
	const safe = name
		.toLowerCase()
		.replace(/[^a-z0-9.-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const finalName = safe || `media-${Date.now()}.png`;
	await fs.writeFile(path.join(DIR, finalName), data);
	return `/imgs/${finalName}`;
}
