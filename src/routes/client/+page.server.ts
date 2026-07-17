import { env } from '$env/dynamic/public';
import { error as httpError, redirect } from '@sveltejs/kit';

import { getSupabaseAdmin } from '$lib/server/supabase-admin';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user?.id) redirect(303, '/connexion');
	if (!user.email_confirmed_at) {
		redirect(303, `/connexion?verification=required&email=${encodeURIComponent(user.email || '')}`);
	}

	const admin = getSupabaseAdmin();
	const { data, error } = await admin.rpc('admin_create_workshop_handoff', {
		p_clerk_user_id: user.id
	});
	if (error) {
		console.error('[client-redirect]', error);
		httpError(503, 'Impossible de préparer l’accès au logiciel.');
	}
	if (typeof data !== 'string' || !data) {
		httpError(409, 'Aucune licence active n’est rattachée à votre compte.');
	}

	const appOrigin = (env.PUBLIC_APP_URL || 'https://app.behartechpro.fr').replace(/\/+$/, '');
	const target = new URL('/client', `${appOrigin}/`);
	target.searchParams.set('bthk', data);
	redirect(303, target.toString());
};
