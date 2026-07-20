// ══════════════════════════════════════════════════════════════════════════
//  Pipeline contenu : Markdown + frontmatter → objets validés.
//  SERVEUR / BUILD uniquement (gray-matter, import.meta.glob raw).
//  Ajouter un article = ajouter un .md dans src/content/guides/ — zéro code.
//  Toute validation en échec lève une erreur → le build échoue (PRD §5).
// ══════════════════════════════════════════════════════════════════════════
import matter from 'gray-matter';
import { dev } from '$app/environment';
import { articleFrontmatter, pilierFrontmatter, formatIssues } from './schema';
import type { ArticleFrontmatter, PilierFrontmatter } from './schema';
import { renderMarkdown, readingTime, type TocItem } from './markdown';

export type Article = {
	frontmatter: ArticleFrontmatter;
	html: string;
	toc: TocItem[];
	readingMinutes: number;
	file: string;
};

export type Pilier = {
	frontmatter: PilierFrontmatter;
	introHtml: string;
	file: string;
};

// Raw Markdown chargé au build. Chemins absolus depuis la racine du projet.
const ARTICLE_FILES = import.meta.glob('/src/content/guides/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const PILIER_FILES = import.meta.glob('/src/content/piliers/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

let _articles: Article[] | null = null;
let _piliers: Pilier[] | null = null;

function parseArticles(): Article[] {
	if (_articles) return _articles;
	const out: Article[] = [];
	for (const [file, raw] of Object.entries(ARTICLE_FILES)) {
		const { data, content } = matter(raw);
		const parsed = articleFrontmatter.safeParse(data);
		if (!parsed.success) throw new Error(formatIssues(file, parsed.error));

		// Le nom de fichier doit correspondre au slug (cohérence + unicité).
		const base = file.split('/').pop()!.replace(/\.md$/, '');
		if (base !== parsed.data.slug) {
			throw new Error(`Slug incohérent dans ${file} : fichier « ${base} » ≠ slug « ${parsed.data.slug} »`);
		}
		const { html, toc } = renderMarkdown(content);
		out.push({
			frontmatter: parsed.data,
			html,
			toc,
			readingMinutes: readingTime(content),
			file
		});
	}
	_articles = out;
	return out;
}

function parsePiliers(): Pilier[] {
	if (_piliers) return _piliers;
	const out: Pilier[] = [];
	for (const [file, raw] of Object.entries(PILIER_FILES)) {
		const { data, content } = matter(raw);
		const parsed = pilierFrontmatter.safeParse(data);
		if (!parsed.success) throw new Error(formatIssues(file, parsed.error));
		const base = file.split('/').pop()!.replace(/\.md$/, '');
		if (base !== parsed.data.slug) {
			throw new Error(`Slug pilier incohérent dans ${file} : « ${base} » ≠ « ${parsed.data.slug} »`);
		}
		const { html } = renderMarkdown(content);
		out.push({ frontmatter: parsed.data, introHtml: html, file });
	}
	// Validation croisée : pilier référencé par un article + liens internes.
	validateReferences(parseAllArticlesRaw(), out);
	_piliers = out;
	return out;
}

// Articles bruts sans dépendre du cache pilier (évite la récursion).
function parseAllArticlesRaw(): Article[] {
	return parseArticles();
}

/** Vérifie que chaque pilier d'article existe et que chaque lien interne résout. */
function validateReferences(articles: Article[], piliers: Pilier[]): void {
	const pilierSlugs = new Set(piliers.map((p) => p.frontmatter.slug));
	const articleSlugs = new Set(articles.map((a) => a.frontmatter.slug));
	for (const a of articles) {
		if (!pilierSlugs.has(a.frontmatter.pilier)) {
			throw new Error(
				`${a.file} : pilier « ${a.frontmatter.pilier} » introuvable (piliers : ${[...pilierSlugs].join(', ') || 'aucun'})`
			);
		}
		for (const slug of a.frontmatter.liensInternes) {
			if (!articleSlugs.has(slug)) {
				throw new Error(`${a.file} : lien interne « ${slug} » ne correspond à aucun article`);
			}
		}
	}
}

/** true si l'élément doit être visible dans le build courant (draft exclu en prod). */
const isVisible = (draft: boolean | undefined) => dev || !draft;

// ── API publique ──────────────────────────────────────────────────────────

/** Tous les articles publiés (draft exclu en prod), les plus récents d'abord. */
export function getArticles(): Article[] {
	parsePiliers(); // déclenche la validation croisée
	return parseArticles()
		.filter((a) => isVisible(a.frontmatter.draft))
		.sort((a, b) => (a.frontmatter.datePublished < b.frontmatter.datePublished ? 1 : -1));
}

/** Recherche un article par slug (inclut les drafts en dev). */
export function getArticle(slug: string): Article | undefined {
	parsePiliers();
	return parseArticles().find((a) => a.frontmatter.slug === slug && isVisible(a.frontmatter.draft));
}

/** Tous les piliers visibles, triés par `order`. */
export function getPiliers(): Pilier[] {
	return parsePiliers()
		.filter((p) => isVisible(p.frontmatter.draft))
		.sort((a, b) => a.frontmatter.order - b.frontmatter.order);
}

/** Recherche un pilier par slug. */
export function getPilier(slug: string): Pilier | undefined {
	return parsePiliers().find((p) => p.frontmatter.slug === slug && isVisible(p.frontmatter.draft));
}

/** Articles rattachés à un pilier, les plus récents d'abord. */
export function getArticlesByPilier(pilier: string): Article[] {
	return getArticles().filter((a) => a.frontmatter.pilier === pilier);
}

/** Résout des slugs (liensInternes) en articles visibles, dans l'ordre donné. */
export function resolveLinks(slugs: string[]): Article[] {
	const all = getArticles();
	return slugs
		.map((s) => all.find((a) => a.frontmatter.slug === s))
		.filter((a): a is Article => Boolean(a));
}
