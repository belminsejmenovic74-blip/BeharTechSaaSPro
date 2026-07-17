import { json } from '@sveltejs/kit';

import { getSupabaseAdmin } from '$lib/server/supabase-admin';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user?.id || !user.email_confirmed_at) {
		return json({ error: 'Session Clerk requise.' }, { status: 401 });
	}

	try {
		const admin = getSupabaseAdmin();
		const [profileResult, membershipResult] = await Promise.all([
			admin.from('client_profiles').select('*').eq('clerk_user_id', user.id).single(),
			admin
				.from('organization_members')
				.select('workshop_id,role,status')
				.eq('clerk_user_id', user.id)
				.eq('status', 'active')
				.order('created_at')
				.limit(1)
				.single()
		]);
		if (profileResult.error) throw profileResult.error;
		if (membershipResult.error) throw membershipResult.error;

		const profile = profileResult.data;
		const membership = membershipResult.data;
		if (!profile.workshop_id || profile.workshop_id !== membership.workshop_id) {
			return json({ error: 'Votre compte n’est rattaché à aucun espace actif.' }, { status: 403 });
		}

		const workshopId = membership.workshop_id;
		const periodStart = new Date();
		periodStart.setUTCDate(1);
		const period = periodStart.toISOString().slice(0, 10);
		const [workshop, subscription, license, usage, widget, repairs, appointments, leads] =
			await Promise.all([
				admin.from('workshops').select('*').eq('id', workshopId).maybeSingle(),
				admin.from('subscriptions').select('*').eq('workshop_id', workshopId).maybeSingle(),
				admin
					.from('license_keys')
					.select('id,status,plan,max_devices,used_devices,activated_at,expires_at,limits')
					.eq('workshop_id', workshopId)
					.maybeSingle(),
				admin
					.from('usage_counters')
					.select('*')
					.eq('workshop_id', workshopId)
					.eq('period_start', period)
					.maybeSingle(),
				admin
					.from('widget_settings')
					.select('id,public_widget_id,active,published_version,published_at,allowed_domains')
					.eq('tenant_id', workshopId)
					.maybeSingle(),
				admin
					.from('repairs')
					.select('id,repair_number,device_brand,device_model,issue_description,status,updated_at,clients(full_name,phone)')
					.eq('workshop_id', workshopId)
					.order('updated_at', { ascending: false })
					.limit(50),
				admin
					.from('appointments')
					.select('id,appointment_number,client_name,device_model,status,appointment_date,appointment_time')
					.eq('workshop_id', workshopId)
					.order('appointment_date', { ascending: true })
					.limit(50),
				admin
					.from('widget_leads')
					.select('id,first_name,last_name,phone,model,issue,status,created_at')
					.eq('tenant_id', workshopId)
					.order('created_at', { ascending: false })
					.limit(30)
			]);

		const results = { workshop, subscription, license, usage, widget, repairs, appointments, leads };
		const failure = Object.entries(results).find(([, result]) => result.error);
		if (failure) {
			console.error(`[client-portal:${failure[0]}]`, failure[1].error);
			return json({ error: 'Impossible de charger les données de votre espace.' }, { status: 503 });
		}

		return json(
			{
				profile,
				workshop: workshop.data,
				subscription: subscription.data,
				license: license.data,
				usage: usage.data,
				widget: widget.data,
				repairs: repairs.data ?? [],
				appointments: appointments.data ?? [],
				leads: leads.data ?? []
			},
			{ headers: { 'cache-control': 'no-store' } }
		);
	} catch (error) {
		console.error('[client-portal]', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Impossible de charger votre portail.' },
			{ status: 503 }
		);
	}
};
