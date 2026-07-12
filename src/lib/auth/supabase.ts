import { browser } from '$app/environment';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

type ClientProfile = {
	id: string;
	user_id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	phone: string | null;
	postal_code: string | null;
	company_name: string | null;
	company_city: string | null;
	company_country: string | null;
	company_phone: string | null;
	company_website: string | null;
	team_size: string | null;
	acquisition_source: string | null;
	onboarding_completed: boolean;
	plan: string;
	subscription_status: string;
	activation_key: string;
	repairs_limit: number;
	repairs_used: number;
	sms_limit: number;
	sms_used: number;
	devices_limit: number;
	devices_used: number;
	renewal_date: string | null;
	created_at: string;
	updated_at: string;
};

type ClientProfilePatch = Partial<
	Pick<
		ClientProfile,
		| 'first_name'
		| 'last_name'
		| 'phone'
		| 'postal_code'
		| 'company_name'
		| 'company_city'
		| 'company_country'
		| 'company_phone'
		| 'company_website'
		| 'team_size'
		| 'acquisition_source'
		| 'onboarding_completed'
	>
>;

type TeamInvitationInput = {
	email: string;
	role: 'Admin' | 'Atelier' | 'Comptoir' | 'Lecture seule';
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null =
	browser && supabaseUrl && supabaseKey
		? createClient(supabaseUrl, supabaseKey, {
				auth: {
					autoRefreshToken: true,
					detectSessionInUrl: true,
					flowType: 'implicit',
					persistSession: true
				}
			})
		: null;

export function hasSupabase() {
	return Boolean(supabase);
}

export function generateActivationKey() {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const group = () =>
		Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
	return `BTP-${group()}-${group()}-${group()}`;
}

function defaultProfileFor(user: User) {
	const renewal = new Date();
	renewal.setDate(renewal.getDate() + 30);

	return {
		user_id: user.id,
		email: user.email || '',
		plan: 'free',
		subscription_status: 'active',
		activation_key: generateActivationKey(),
		repairs_limit: 10,
		repairs_used: 0,
		sms_limit: 10,
		sms_used: 0,
		devices_limit: 1,
		devices_used: 0,
		renewal_date: renewal.toISOString()
	};
}

function normalizeProfile(profile: ClientProfile): ClientProfile {
	return {
		...profile,
		plan: profile.plan || 'Starter',
		subscription_status: profile.subscription_status || 'active',
		repairs_limit: profile.repairs_limit ?? 10,
		repairs_used: profile.repairs_used ?? 0,
		sms_limit: profile.sms_limit ?? 10,
		sms_used: profile.sms_used ?? 0,
		devices_limit: profile.devices_limit ?? 1,
		devices_used: profile.devices_used ?? 0
	};
}

export async function ensureClientProfile(user: User): Promise<ClientProfile | null> {
	if (!supabase) return null;

	const existing = await supabase
		.from('client_profiles')
		.select('*')
		.eq('user_id', user.id)
		.maybeSingle();
	if (existing.error) throw existing.error;
	if (existing.data) return normalizeProfile(existing.data as ClientProfile);

	for (let attempt = 0; attempt < 3; attempt += 1) {
		const created = await supabase
			.from('client_profiles')
			.insert(defaultProfileFor(user))
			.select('*')
			.single();

		if (!created.error) return normalizeProfile(created.data as ClientProfile);
		if (!created.error.message.toLowerCase().includes('activation')) throw created.error;
	}

	throw new Error('Impossible de générer une clé d’activation unique.');
}

export async function updateClientProfile(userId: string, patch: ClientProfilePatch) {
	if (!supabase) return null;

	const updated = await supabase
		.from('client_profiles')
		.update({ ...patch, updated_at: new Date().toISOString() })
		.eq('user_id', userId)
		.select('*')
		.single();

	if (updated.error) throw updated.error;
	return normalizeProfile(updated.data as ClientProfile);
}

export async function createTeamInvitations(
	ownerUserId: string,
	invitations: TeamInvitationInput[]
) {
	if (!supabase) return;

	const rows = invitations
		.map((invitation) => ({
			owner_user_id: ownerUserId,
			email: invitation.email.trim().toLowerCase(),
			role: invitation.role
		}))
		.filter((invitation) => invitation.email);

	if (!rows.length) return;
	const created = await supabase.from('team_invitations').insert(rows);
	if (created.error) throw created.error;
}

export async function getCurrentUser() {
	if (!supabase) return null;
	const { data, error } = await supabase.auth.getUser();
	if (error) return null;
	return data.user;
}

export async function getCurrentProfile() {
	const user = await getCurrentUser();
	if (!user) return { user: null, profile: null };
	return { user, profile: await ensureClientProfile(user) };
}

export function nextOnboardingStep(profile: ClientProfile | null) {
	if (!profile) return 1;
	if (profile.onboarding_completed) return 7;
	if (!profile.first_name || !profile.last_name || !profile.phone || !profile.postal_code) return 2;
	if (!profile.company_name || !profile.company_city || !profile.company_phone) return 3;
	if (!profile.team_size) return 4;
	if (!profile.acquisition_source) return 5;
	return 6;
}

export type { ClientProfile, ClientProfilePatch, TeamInvitationInput };
