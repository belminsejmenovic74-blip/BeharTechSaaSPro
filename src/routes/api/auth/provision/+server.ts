import { json } from '@sveltejs/kit';

import { getSupabaseAdmin } from '$lib/server/supabase-admin';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user?.id || !user.email) return json({ error: 'Session Clerk requise.' }, { status: 401 });

	try {
		const admin = getSupabaseAdmin();
		const { data, error } = await admin.rpc('admin_provision_clerk_user', {
			p_clerk_user_id: user.id,
			p_email: user.email,
			p_first_name: user.first_name,
			p_last_name: user.last_name
		});
		if (error) throw error;
		const { data: profile, error: profileError } = await admin
			.from('client_profiles')
			.select('*')
			.eq('clerk_user_id', user.id)
			.single();
		if (profileError) throw profileError;
		return json({ ok: true, account: data, profile }, { headers: { 'cache-control': 'no-store' } });
	} catch (error) {
		console.error('[clerk-provision]', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Provisionnement impossible.' },
			{ status: 500 }
		);
	}
};
