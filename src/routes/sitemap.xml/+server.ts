import { getArticles, getPiliers } from '$lib/guides/content';
import { getPosts } from '$lib/blog/content';
import { hubUrl, faqUrl, articleUrl, pilierUrl, blogHubUrl, blogUrl, absUrl } from '$lib/guides/config';

export const prerender = true;

type Url = { loc: string; lastmod?: string };

export function GET() {
	const urls: Url[] = [
		{ loc: absUrl('/') },
		{ loc: hubUrl() },
		{ loc: blogHubUrl() },
		{ loc: faqUrl() }
	];

	for (const p of getPiliers()) {
		urls.push({ loc: pilierUrl(p.frontmatter.slug) });
	}
	// getArticles() / getPosts() excluent déjà les drafts en prod.
	for (const a of getArticles()) {
		urls.push({ loc: articleUrl(a.frontmatter.slug), lastmod: a.frontmatter.dateModified });
	}
	for (const p of getPosts()) {
		urls.push({ loc: blogUrl(p.frontmatter.slug), lastmod: p.frontmatter.dateModified });
	}

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		urls
			.map(
				(u) =>
					`  <url>\n    <loc>${u.loc}</loc>\n` +
					(u.lastmod ? `    <lastmod>${u.lastmod.slice(0, 10)}</lastmod>\n` : '') +
					`  </url>`
			)
			.join('\n') +
		`\n</urlset>\n`;

	return new Response(body, {
		headers: { 'content-type': 'application/xml' }
	});
}
