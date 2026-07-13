import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export type PaidPlan = 'starter' | 'pro' | 'business';
export type BillingInterval = 'month' | 'year';

export function stripeClient() {
	if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe n’est pas configuré.');
	return new Stripe(env.STRIPE_SECRET_KEY);
}

export function stripePriceId(plan: PaidPlan, interval: BillingInterval) {
	const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval === 'year' ? 'YEARLY' : 'MONTHLY'}`;
	const priceId = env[key];
	if (!priceId) throw new Error(`Le Price ID Stripe ${key} manque dans l’environnement.`);
	return priceId;
}

export function planForPrice(priceId: string | null | undefined): 'free' | PaidPlan | null {
	if (!priceId) return null;
	for (const plan of ['starter', 'pro', 'business'] as const) {
		for (const interval of ['MONTHLY', 'YEARLY'] as const) {
			if (env[`STRIPE_PRICE_${plan.toUpperCase()}_${interval}`] === priceId) return plan;
		}
	}
	return null;
}

export const PLAN_LIMITS = {
	free: { devices: 1, repairs_per_month: 10, sms_per_month: 10 },
	starter: { devices: 2, repairs_per_month: null, sms_per_month: 30 },
	pro: { devices: 4, repairs_per_month: null, sms_per_month: 150 },
	business: { devices: null, repairs_per_month: null, sms_per_month: 250 }
} as const;
