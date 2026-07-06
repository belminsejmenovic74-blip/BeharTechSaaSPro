import { redirect } from '@sveltejs/kit';

import { readContent } from '$lib/cms/server';
import { listMedia } from '$lib/server/media';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isLogin = url.pathname.startsWith('/admin/login');
	if (!locals.admin && !isLogin) throw redirect(303, '/admin/login');
	if (locals.admin && isLogin) throw redirect(303, '/admin');

	return {
		content: await readContent(),
		admin: locals.admin,
		media: locals.admin ? await listMedia() : []
	};
};
