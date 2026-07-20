// ══════════════════════════════════════════════════════════════════════════
//  Pipeline blog : Markdown + frontmatter → objets validés (SERVEUR / BUILD).
//  Ajouter un article de blog = ajouter un .md dans src/content/blog/.
//  Réutilise le rendu Markdown des guides. Build échoue si frontmatter invalide.
// ══════════════════════════════════════════════════════════════════════════
import matter from 'gray-matter';
import { dev } from '$app/environment';
import { postFrontmatter, formatIssues, type PostFrontmatter } from './schema';
import { renderMarkdown, readingTime, type TocItem } from '$lib/guides/markdown';

export type Post = {
	frontmatter: PostFrontmatter;
	html: string;
	toc: TocItem[];
	readingMinutes: number;
	file: string;
};

const FILES = import.meta.glob('/src/content/blog/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

let _posts: Post[] | null = null;

function parsePosts(): Post[] {
	if (_posts) return _posts;
	const out: Post[] = [];
	for (const [file, raw] of Object.entries(FILES)) {
		const { data, content } = matter(raw);
		const parsed = postFrontmatter.safeParse(data);
		if (!parsed.success) throw new Error(formatIssues(file, parsed.error));

		const base = file.split('/').pop()!.replace(/\.md$/, '');
		if (base !== parsed.data.slug) {
			throw new Error(`Slug incohérent dans ${file} : « ${base} » ≠ slug « ${parsed.data.slug} »`);
		}
		const { html, toc } = renderMarkdown(content);
		out.push({ frontmatter: parsed.data, html, toc, readingMinutes: readingTime(content), file });
	}
	_posts = out;
	return out;
}

const isVisible = (draft: boolean | undefined) => dev || !draft;

/** Articles publiés (draft exclu en prod), les plus récents d'abord. */
export function getPosts(): Post[] {
	return parsePosts()
		.filter((p) => isVisible(p.frontmatter.draft))
		.sort((a, b) => (a.frontmatter.datePublished < b.frontmatter.datePublished ? 1 : -1));
}

export function getPost(slug: string): Post | undefined {
	return parsePosts().find((p) => p.frontmatter.slug === slug && isVisible(p.frontmatter.draft));
}
