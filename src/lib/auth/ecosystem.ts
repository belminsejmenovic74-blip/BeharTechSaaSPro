import type { ClientProfile } from '$lib/auth/supabase';

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
	if (!profile.workshop_id) {
		throw new Error('Entreprise non provisionnée. Vérifiez votre adresse e-mail puis reconnectez-vous.');
	}
	const response = await fetch('/api/portal', { cache: 'no-store' });
	const body = (await response.json().catch(() => null)) as (PortalData & { error?: string }) | null;
	if (!response.ok || !body) {
		throw new Error(body?.error || 'Impossible de charger votre portail.');
	}
	return body;
}
