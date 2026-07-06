// @ts-nocheck
import { redirect } from '@sveltejs/kit';

import { COOKIE } from '$lib/server/auth';

import type { Actions } from './$types';

export const actions = {
	logout: async ({ cookies }: import('./$types').RequestEvent) => {
		cookies.delete(COOKIE, { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
;null as any as Actions;