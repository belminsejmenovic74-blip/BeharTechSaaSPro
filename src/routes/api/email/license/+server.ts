import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import { sendLicenseEmail } from '$lib/server/transactional-email';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user?.email || !locals.user.email_confirmed_at) {
		return json({ error: 'Adresse e-mail non vérifiée.' }, { status: 401 });
	}

	const admin = getSupabaseAdmin();
	const { data: profile, error } = await admin
		.from('client_profiles')
		.select('first_name,activation_key,plan,onboarding_completed')
		.eq('clerk_user_id', locals.user.id)
		.maybeSingle();
	if (error || !profile?.activation_key) {
		return json({ error: 'Licence encore en cours de préparation.' }, { status: 409 });
	}
	if (!profile.onboarding_completed) {
		return json({ error: 'Terminez la configuration de votre atelier.' }, { status: 409 });
	}

	try {
		const result = await sendLicenseEmail({
			to: locals.user.email,
			firstName: profile.first_name,
			licenseKey: profile.activation_key,
			plan: profile.plan || 'free',
			idempotencyKey: `welcome-license/${locals.user.id}`
		});
		if (!result.sent) return json({ error: 'Service e-mail non configuré.' }, { status: 503 });
		return json({ sent: true });
	} catch (sendError) {
		console.error('[license-email]', sendError instanceof Error ? sendError.message : 'send failed');
		return json({ error: 'Envoi de l’e-mail impossible.' }, { status: 502 });
	}
};
