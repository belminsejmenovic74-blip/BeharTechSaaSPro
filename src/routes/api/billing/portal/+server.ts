import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import { stripeClient } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.user?.email_confirmed_at) return json({ error: 'Connexion requise.' }, { status: 401 });
	const admin = getSupabaseAdmin();
	const { data: member } = await admin.from('organization_members').select('workshop_id,role').eq('clerk_user_id', locals.user.id).eq('status', 'active').limit(1).maybeSingle();
	if (!member || !['owner', 'admin'].includes(member.role)) return json({ error: 'Accès refusé.' }, { status: 403 });
	const { data: subscription } = await admin.from('subscriptions').select('stripe_customer_id').eq('workshop_id', member.workshop_id).maybeSingle();
	if (!subscription?.stripe_customer_id) return json({ error: 'Aucun compte de facturation Stripe n’est associé.' }, { status: 404 });
	const session = await stripeClient().billingPortal.sessions.create({ customer: subscription.stripe_customer_id, return_url: `${url.origin}/client` });
	return json({ url: session.url }, { headers: { 'cache-control': 'no-store' } });
};
