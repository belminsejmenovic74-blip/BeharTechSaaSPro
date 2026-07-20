import { error } from '@sveltejs/kit';
import { getPost, getPosts } from '$lib/blog/content';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

export const entries: EntryGenerator = () => getPosts().map((p) => ({ slug: p.frontmatter.slug }));

export const load: PageServerLoad = async ({ params }) => {
	const post = getPost(params.slug);
	if (!post) throw error(404, 'Article introuvable');

	// Suggestions : autres articles de la même catégorie, sinon les plus récents.
	const related = getPosts()
		.filter((p) => p.frontmatter.slug !== post.frontmatter.slug)
		.sort((a, b) => Number(b.frontmatter.category === post.frontmatter.category) - Number(a.frontmatter.category === post.frontmatter.category))
		.slice(0, 3)
		.map((p) => ({ frontmatter: p.frontmatter, readingMinutes: p.readingMinutes }));

	return {
		post: {
			frontmatter: post.frontmatter,
			html: post.html,
			toc: post.toc,
			readingMinutes: post.readingMinutes
		},
		related
	};
};
