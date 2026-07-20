import { error } from '@sveltejs/kit';
import {
	getArticle,
	getPilier,
	getArticles,
	getPiliers,
	getArticlesByPilier,
	resolveLinks
} from '$lib/guides/content';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

// Énumère les slugs à prérendre (piliers + articles publiés).
export const entries: EntryGenerator = () => {
	const piliers = getPiliers().map((p) => ({ slug: p.frontmatter.slug }));
	const articles = getArticles().map((a) => ({ slug: a.frontmatter.slug }));
	return [...piliers, ...articles];
};

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// 1) Le segment est-il un pilier ?
	const pilier = getPilier(slug);
	if (pilier) {
		const articles = getArticlesByPilier(slug).map((a) => ({
			frontmatter: a.frontmatter,
			readingMinutes: a.readingMinutes
		}));
		return {
			kind: 'pilier' as const,
			pilier: { frontmatter: pilier.frontmatter, introHtml: pilier.introHtml },
			articles
		};
	}

	// 2) Sinon, un article ?
	const article = getArticle(slug);
	if (article) {
		const pil = getPilier(article.frontmatter.pilier);
		const related = resolveLinks(article.frontmatter.liensInternes)
			.filter((a) => a.frontmatter.slug !== slug)
			.slice(0, 3)
			.map((a) => ({ frontmatter: a.frontmatter, readingMinutes: a.readingMinutes }));
		return {
			kind: 'article' as const,
			article: {
				frontmatter: article.frontmatter,
				html: article.html,
				toc: article.toc,
				readingMinutes: article.readingMinutes
			},
			pilierTitle: pil?.frontmatter.title ?? article.frontmatter.pilier,
			pilierKicker: pil?.frontmatter.kicker ?? article.frontmatter.pilier,
			related
		};
	}

	throw error(404, 'Guide introuvable');
};
