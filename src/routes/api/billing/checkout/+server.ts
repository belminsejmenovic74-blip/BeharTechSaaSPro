import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import { stripeClient, stripePriceId } from '$lib/server/stripe';

const inputSchema = z.object({ plan: z.enum(['starter', 'pro', 'business']), interval: z.enum(['month', 'year']).default('month') });

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user?.email_confirmed_at) return json({ error: 'Adresse e-mail non vérifiée.' }, { status: 401 });
	const parsed = inputSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'Offre invalide.' }, { status: 400 });
	const admin = getSupabaseAdmin();
	const { data: member } = await admin.from('organization_members').select('workshop_id,role,status').eq('user_id', locals.user.id).eq('status', 'active').order('created_at').limit(1).maybeSingle();
	if (!member || !['owner', 'admin'].includes(member.role)) return json({ error: 'Vous ne pouvez pas gérer cet abonnement.' }, { status: 403 });
	const { data: subscription } = await admin.from('subscriptions').select('stripe_customer_id').eq('workshop_id', member.workshop_id).maybeSingle();
	const stripe = stripeClient();
	let customerId = subscription?.stripe_customer_id || null;
	if (!customerId) {
		const customer = await stripe.customers.create({ email: locals.user.email, metadata: { workshop_id: member.workshop_id, user_id: locals.user.id } });
		customerId = customer.id;
		await admin.from('subscriptions').upsert({ workshop_id: member.workshop_id, stripe_customer_id: customerId, plan: 'free', status: 'free' }, { onConflict: 'workshop_id' });
	}
	const session = await stripe.checkout.sessions.create({
		mode: 'subscription', customer: customerId,
		line_items: [{ price: stripePriceId(parsed.data.plan, parsed.data.interval), quantity: 1 }],
		allow_promotion_codes: true,
		success_url: `${url.origin}/client?billing=success`, cancel_url: `${url.origin}/client?billing=cancelled`,
		client_reference_id: member.workshop_id,
		metadata: { workshop_id: member.workshop_id, user_id: locals.user.id, plan: parsed.data.plan },
		subscription_data: { metadata: { workshop_id: member.workshop_id, user_id: locals.user.id, plan: parsed.data.plan } }
	});
	return json({ url: session.url }, { headers: { 'cache-control': 'no-store' } });
};
