import { redirect } from '@sveltejs/kit';

import { COOKIE } from '$lib/server/auth';

import type { Actions } from './$types';

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete(COOKIE, { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
