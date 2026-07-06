// @ts-nocheck
import { readContent } from '$lib/cms/server';

import type { LayoutServerLoad } from './$types';

export const load = async ({ locals }: Parameters<LayoutServerLoad>[0]) => {
	return {
		content: await readContent(),
		admin: locals.admin
	};
};
