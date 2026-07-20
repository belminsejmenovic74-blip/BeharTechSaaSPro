import { getPiliers, getArticles } from '$lib/guides/content';
import { getPosts } from '$lib/blog/content';
import { ORG, hubUrl, faqUrl, pilierUrl, articleUrl, blogHubUrl, blogUrl } from '$lib/guides/config';

export const prerender = true;

// Présentation du site en Markdown pour les moteurs IA (PRD §F6, GEO §6).
// Régénéré au build en même temps que le sitemap.
export function GET() {
	const piliers = getPiliers();
	const lines: string[] = [];

	lines.push(`# ${ORG.name}`);
	lines.push('');
	lines.push(`> ${ORG.tagline}`);
	lines.push('');
	lines.push(
		`${ORG.name} est un logiciel de gestion pour ateliers de réparation de smartphones : suivi client, devis et factures, suivi des réparations, reconditionnement et encaissement dans un seul outil.`
	);
	lines.push('');
	lines.push('## Guides');
	lines.push('');
	lines.push(`- [Hub des guides](${hubUrl()})`);
	lines.push(`- [Blog](${blogHubUrl()})`);
	lines.push(`- [Questions fréquentes](${faqUrl()})`);
	lines.push('');

	if (piliers.length) {
		lines.push('## Piliers thématiques');
		lines.push('');
		for (const p of piliers) {
			lines.push(`### [${p.frontmatter.title}](${pilierUrl(p.frontmatter.slug)})`);
			lines.push('');
			lines.push(p.frontmatter.metaDescription);
			lines.push('');
		}
	}

	const articles = getArticles();
	if (articles.length) {
		lines.push('## Articles');
		lines.push('');
		for (const a of articles) {
			lines.push(
				`- [${a.frontmatter.title}](${articleUrl(a.frontmatter.slug)}) — ${a.frontmatter.metaDescription}`
			);
		}
		lines.push('');
	}

	const posts = getPosts();
	if (posts.length) {
		lines.push('## Blog');
		lines.push('');
		for (const p of posts) {
			lines.push(
				`- [${p.frontmatter.title}](${blogUrl(p.frontmatter.slug)}) — ${p.frontmatter.metaDescription}`
			);
		}
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}
