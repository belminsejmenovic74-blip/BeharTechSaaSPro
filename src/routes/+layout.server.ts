import { readContent } from '$lib/cms/server';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		content: await readContent(),
		admin: locals.admin,
		user: locals.user
	};
};
