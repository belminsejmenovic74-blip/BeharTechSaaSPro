import { getPosts } from '$lib/blog/content';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

export const load: PageServerLoad = async () => {
	const posts = getPosts().map((p) => ({
		slug: p.frontmatter.slug,
		title: p.frontmatter.title,
		category: p.frontmatter.category,
		description: p.frontmatter.metaDescription,
		datePublished: p.frontmatter.datePublished,
		readingMinutes: p.readingMinutes
	}));
	return { posts };
};
