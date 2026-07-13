import { supabase, type ClientProfile } from '$lib/auth/supabase';

export type PortalRepair = {
	id: string;
	repair_number: string;
	device_brand: string | null;
	device_model: string | null;
	issue_description: string;
	status: string;
	updated_at: string;
	clients: { full_name: string; phone: string | null } | null;
};

export type PortalAppointment = {
	id: string;
	appointment_number: string | null;
	client_name: string | null;
	device_model: string | null;
	status: string;
	appointment_date: string | null;
	appointment_time: string | null;
};

export type PortalLead = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	phone: string | null;
	model: string;
	issue: string;
	status: string;
	created_at: string;
};

export type PortalData = {
	profile: ClientProfile;
	workshop: Record<string, unknown> | null;
	subscription: Record<string, unknown> | null;
	license: Record<string, unknown> | null;
	usage: Record<string, unknown> | null;
	widget: Record<string, unknown> | null;
	repairs: PortalRepair[];
	appointments: PortalAppointment[];
	leads: PortalLead[];
};

export async function loadPortalData(profile: ClientProfile): Promise<PortalData> {
	if (!supabase || !profile.workshop_id) throw new Error('Entreprise non provisionnée. Vérifiez votre adresse e-mail puis reconnectez-vous.');
	const workshopId = profile.workshop_id;
	const periodStart = new Date();
	periodStart.setUTCDate(1);
	const period = periodStart.toISOString().slice(0, 10);
	const [workshop, subscription, license, usage, widget, repairs, appointments, leads] = await Promise.all([
		supabase.from('workshops').select('*').eq('id', workshopId).maybeSingle(),
		supabase.from('subscriptions').select('*').eq('workshop_id', workshopId).maybeSingle(),
		supabase.from('license_keys').select('id,status,plan,max_devices,used_devices,activated_at,expires_at,limits').eq('workshop_id', workshopId).maybeSingle(),
		supabase.from('usage_counters').select('*').eq('workshop_id', workshopId).eq('period_start', period).maybeSingle(),
		supabase.from('widget_settings').select('id,public_widget_id,active,published_version,published_at,allowed_domains').eq('tenant_id', workshopId).maybeSingle(),
		supabase.from('repairs').select('id,repair_number,device_brand,device_model,issue_description,status,updated_at,clients(full_name,phone)').eq('workshop_id', workshopId).order('updated_at', { ascending: false }).limit(50),
		supabase.from('appointments').select('id,appointment_number,client_name,device_model,status,appointment_date,appointment_time').eq('workshop_id', workshopId).order('appointment_date', { ascending: true }).limit(50),
		supabase.from('widget_leads').select('id,first_name,last_name,phone,model,issue,status,created_at').eq('tenant_id', workshopId).order('created_at', { ascending: false }).limit(30)
	]);
	const failed = [workshop, subscription, license, usage, widget, repairs, appointments, leads].find((result) => result.error);
	if (failed?.error) throw failed.error;
	return {
		profile,
		workshop: workshop.data,
		subscription: subscription.data,
		license: license.data,
		usage: usage.data,
		widget: widget.data,
		repairs: (repairs.data ?? []) as unknown as PortalRepair[],
		appointments: (appointments.data ?? []) as PortalAppointment[],
		leads: (leads.data ?? []) as PortalLead[]
	};
}
