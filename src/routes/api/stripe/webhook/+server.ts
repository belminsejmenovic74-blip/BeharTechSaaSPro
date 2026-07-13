import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import { PLAN_LIMITS, planForPrice, stripeClient } from '$lib/server/stripe';
import { sendLicenseEmail } from '$lib/server/transactional-email';

const iso = (seconds: number | null | undefined) => seconds ? new Date(seconds * 1000).toISOString() : null;
const normalizedSubscriptionStatus = (status: Stripe.Subscription.Status) => {
	if (status === 'incomplete') return 'pending';
	if (status === 'incomplete_expired') return 'canceled';
	return status;
};

export const POST: RequestHandler = async ({ request }) => {
	if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook Stripe non configuré.' }, { status: 503 });
	const signature = request.headers.get('stripe-signature');
	if (!signature) return json({ error: 'Signature manquante.' }, { status: 400 });
	let event: Stripe.Event;
	try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET); }
	catch { return json({ error: 'Signature invalide.' }, { status: 400 }); }

	const admin = getSupabaseAdmin();
	const { error: claimError } = await admin.from('subscription_events').insert({ stripe_event_id: event.id, event_type: event.type });
	if (claimError?.code === '23505') return json({ received: true, duplicate: true });
	if (claimError) return json({ error: 'Journal Stripe indisponible.' }, { status: 503 });
	try {
		let workshopId: string | null = null;
		let subscription: Stripe.Subscription | null = null;
		if (event.type.startsWith('customer.subscription.')) subscription = event.data.object as Stripe.Subscription;
		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session;
			workshopId = session.metadata?.workshop_id || session.client_reference_id || null;
			if (typeof session.subscription === 'string') subscription = await stripeClient().subscriptions.retrieve(session.subscription);
		}
		if (event.type === 'invoice.payment_failed' || event.type === 'invoice.paid') {
			const invoice = event.data.object as Stripe.Invoice;
			const subscriptionId = (invoice as any).parent?.subscription_details?.subscription;
			if (typeof subscriptionId === 'string') subscription = await stripeClient().subscriptions.retrieve(subscriptionId);
		}
		if (event.type === 'charge.refunded') {
			const charge = event.data.object as Stripe.Charge;
			const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
			if (customerId) {
				const { data } = await admin.from('subscriptions').select('workshop_id').eq('stripe_customer_id', customerId).maybeSingle();
				workshopId = data?.workshop_id || null;
			}
		}
		if (subscription) {
			workshopId ||= subscription.metadata?.workshop_id || null;
			if (!workshopId) {
				const { data } = await admin.from('subscriptions').select('workshop_id').eq('stripe_subscription_id', subscription.id).maybeSingle();
				workshopId = data?.workshop_id || null;
			}
			const item = subscription.items.data[0] as any;
			const priceId = item?.price?.id as string | undefined;
			const plan = planForPrice(priceId);
			if (!workshopId || !plan) throw new Error('Abonnement Stripe non rattaché à un atelier ou Price ID inconnu.');
			const status = event.type === 'invoice.payment_failed' ? 'past_due' : normalizedSubscriptionStatus(subscription.status);
			await admin.from('subscriptions').upsert({ workshop_id: workshopId, plan, status, stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id, stripe_subscription_id: subscription.id, stripe_price_id: priceId, current_period_start: iso(item.current_period_start), current_period_end: iso(item.current_period_end), cancel_at_period_end: subscription.cancel_at_period_end }, { onConflict: 'workshop_id' });
			const licenseStatus = ['active', 'trialing'].includes(status) ? 'active' : status === 'past_due' || status === 'unpaid' ? 'past_due' : status === 'canceled' ? 'canceled' : 'inactive';
			await admin.from('license_keys').update({ plan, status: licenseStatus, stripe_subscription_id: subscription.id, limits: PLAN_LIMITS[plan], activated_at: licenseStatus === 'active' ? new Date().toISOString() : undefined, expires_at: iso(item.current_period_end), max_devices: PLAN_LIMITS[plan].devices ?? 2147483647 }).eq('workshop_id', workshopId);
			await admin.from('client_profiles').update({ plan, subscription_status: status, repairs_limit: PLAN_LIMITS[plan].repairs_per_month ?? 2147483647, sms_limit: PLAN_LIMITS[plan].sms_per_month, devices_limit: PLAN_LIMITS[plan].devices ?? 2147483647, renewal_date: iso(item.current_period_end) }).eq('workshop_id', workshopId);
			if (licenseStatus === 'active') {
				const { data: owner } = await admin
					.from('client_profiles')
					.select('email,first_name,activation_key')
					.eq('workshop_id', workshopId)
					.order('created_at')
					.limit(1)
					.maybeSingle();
				if (owner?.email && owner.activation_key) {
					try {
						await sendLicenseEmail({
							to: owner.email,
							firstName: owner.first_name,
							licenseKey: owner.activation_key,
							plan,
							paid: true,
							idempotencyKey: `subscription-active/${subscription.id}/${item.current_period_start || 'initial'}`
						});
					} catch (emailError) {
						console.error('[stripe-license-email]', emailError instanceof Error ? emailError.message : 'send failed');
					}
				}
			}
		}
		if (event.type === 'charge.refunded' && workshopId) {
			await admin.from('subscriptions').update({ status: 'refunded' }).eq('workshop_id', workshopId);
			await admin.from('license_keys').update({ status: 'refunded' }).eq('workshop_id', workshopId);
		}
		await admin.from('subscription_events').update({ workshop_id: workshopId }).eq('stripe_event_id', event.id);
		return json({ received: true });
	} catch (error) {
		await admin.from('subscription_events').delete().eq('stripe_event_id', event.id);
		console.error('[stripe-webhook]', event.id, event.type, error instanceof Error ? error.message : 'processing error');
		return json({ error: 'Traitement Stripe échoué.' }, { status: 500 });
	}
};
