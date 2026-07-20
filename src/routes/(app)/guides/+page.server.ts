import { getPiliers, getArticlesByPilier } from '$lib/guides/content';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

export const load: PageServerLoad = async () => {
	const piliers = getPiliers().map((p) => ({
		slug: p.frontmatter.slug,
		title: p.frontmatter.title,
		kicker: p.frontmatter.kicker,
		description: p.frontmatter.metaDescription,
		count: getArticlesByPilier(p.frontmatter.slug).length
	}));
	return { piliers };
};
