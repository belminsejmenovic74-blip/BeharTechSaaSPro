// ══════════════════════════════════════════════════════════════════════════
//  Rendu Markdown → HTML + extraction du sommaire (H2) et temps de lecture.
//  Ancres id stables slugifiées depuis le texte du titre (H2/H3), sans saut
//  de niveau imposé par le style (cf. §3). Exécuté côté serveur / au build.
// ══════════════════════════════════════════════════════════════════════════
import { Marked, type Tokens } from 'marked';

export type TocItem = { id: string; label: string };

/** Slug ASCII stable : minuscules, sans accent, tirets. */
export function slugify(input: string): string {
	return input
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

/** Rend le Markdown et collecte le sommaire depuis les H2. */
export function renderMarkdown(src: string): { html: string; toc: TocItem[] } {
	const toc: TocItem[] = [];
	const seen = new Set<string>();
	const marked = new Marked();

	marked.use({
		renderer: {
			heading(token: Tokens.Heading) {
				const inner = this.parser.parseInline(token.tokens);
				const depth = token.depth;
				if (depth === 2 || depth === 3) {
					let id = slugify(token.text);
					// Garantit l'unicité des ancres.
					let n = 2;
					const base = id;
					while (seen.has(id)) id = `${base}-${n++}`;
					seen.add(id);
					if (depth === 2) toc.push({ id, label: token.text });
					return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
				}
				return `<h${depth}>${inner}</h${depth}>\n`;
			}
		}
	});

	const html = marked.parse(src, { async: false }) as string;
	return { html, toc };
}

/** Temps de lecture en minutes (≈200 mots/min), plancher à 1. */
export function readingTime(markdown: string): number {
	const words = markdown.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}
