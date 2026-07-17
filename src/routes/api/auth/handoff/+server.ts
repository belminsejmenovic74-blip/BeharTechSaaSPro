import { json } from '@sveltejs/kit';

import { getSupabaseAdmin } from '$lib/server/supabase-admin';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user?.id || !user.email_confirmed_at) {
		return json({ error: 'Session Clerk requise.' }, { status: 401 });
	}

	try {
		const admin = getSupabaseAdmin();
		const { data, error } = await admin.rpc('admin_create_workshop_handoff', {
			p_clerk_user_id: user.id
		});
		if (error) throw error;
		if (typeof data !== 'string' || !data) {
			return json(
				{ error: 'Aucune licence active n’est rattachée à votre compte.' },
				{ status: 409 }
			);
		}
		return json({ code: data }, { headers: { 'cache-control': 'no-store' } });
	} catch (error) {
		console.error('[clerk-handoff]', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Transfert vers le logiciel impossible.' },
			{ status: 500 }
		);
	}
};
