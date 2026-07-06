// @ts-nocheck
import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';

import { COOKIE, sessionToken, verifyPassword } from '$lib/server/auth';

import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies }: import('./$types').RequestEvent) => {
		const data = await request.formData();
		const password = String(data.get('password') ?? '');

		if (!verifyPassword(password)) {
			return fail(401, { error: 'Mot de passe incorrect.' });
		}

		cookies.set(COOKIE, sessionToken(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, '/admin');
	}
};
;null as any as Actions;