import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';

const templatesSchema = z.record(z.string().max(80), z.string().max(5000));
const offerSchema = z.object({
	id: z.string().max(80), title: z.string().max(120), description: z.string().max(500).optional(), conditionText: z.string().max(300).optional(),
	displayMode: z.enum(['image', 'icon', 'text']), behavior: z.enum(['selectable', 'validation', 'informational', 'hidden']),
	fixedDiscount: z.number().optional(), percentageDiscount: z.number().optional(), originalPrice: z.number().optional(), promotionalPrice: z.number().optional(),
	isPublished: z.boolean(), displayOrder: z.number()
});
const inputSchema = z.discriminatedUnion('operation', [
	z.object({ operation: z.literal('company'), name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(200), phone: z.string().trim().max(40), address: z.string().trim().max(300), postalCode: z.string().trim().max(20), city: z.string().trim().max(120), website: z.string().trim().max(300), country: z.enum(['FR', 'CH']), businessHours: z.string().trim().max(1000), legalMentions: z.string().trim().max(5000), warrantyTerms: z.string().trim().max(5000) }),
	z.object({ operation: z.literal('communications'), senderName: z.string().trim().max(160), replyTo: z.union([z.literal(''), z.string().trim().email().max(200)]), emailSignature: z.string().trim().max(2000), brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), smsTemplates: templatesSchema, emailTemplates: templatesSchema, automations: z.record(z.string().max(80), z.object({ sms: z.boolean(), email: z.boolean() })) }),
	z.object({ operation: z.literal('widget'), active: z.boolean(), allowedDomains: z.array(z.string().trim().min(1).max(255)).max(20), commercialName: z.string().trim().max(160), phone: z.string().trim().max(40), address: z.string().trim().max(300), primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), logoUrl: z.union([z.literal(''), z.string().trim().url().max(1000)]), title: z.string().trim().min(2).max(120), introduction: z.string().trim().max(300), deviceTitle: z.string().trim().max(120), issueTitle: z.string().trim().max(120), contactTitle: z.string().trim().max(120), submitLabel: z.string().trim().max(80), features: z.object({ priceEstimate: z.boolean(), stockAvailability: z.boolean(), booking: z.boolean(), photos: z.boolean(), callbackRequest: z.boolean(), summarySidebar: z.boolean() }), offers: z.array(offerSchema).max(20) })
]);

function cleanDomain(value: string) {
	const wildcard = value.trim().toLowerCase().startsWith('*.');
	const raw = wildcard ? value.trim().slice(2) : value.trim();
	try { const host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/^www\./, ''); return host ? `${wildcard ? '*.' : ''}${host}` : ''; } catch { return ''; }
}

async function context(locals: App.Locals) {
	if (!locals.user?.email_confirmed_at) return null;
	const admin = getSupabaseAdmin();
	const { data: member } = await admin.from('organization_members').select('workshop_id,role,status').eq('clerk_user_id', locals.user.id).eq('status', 'active').order('created_at').limit(1).maybeSingle();
	return member ? { admin, member } : null;
}

export const GET: RequestHandler = async ({ locals }) => {
	const ctx = await context(locals);
	if (!ctx) return json({ error: 'Session entreprise requise.' }, { status: 401 });
	const { admin, member } = ctx;
	const workshopId = member.workshop_id;
	const [workshop, communication, document, subscription, license, profile, widget] = await Promise.all([
		admin.from('workshops').select('*').eq('id', workshopId).single(),
		admin.from('communication_settings').select('*').eq('workshop_id', workshopId).maybeSingle(),
		admin.from('document_settings').select('*').eq('workshop_id', workshopId).maybeSingle(),
		admin.from('subscriptions').select('*').eq('workshop_id', workshopId).maybeSingle(),
		admin.from('license_keys').select('id,status,plan,max_devices,used_devices,limits,activated_at,expires_at').eq('workshop_id', workshopId).maybeSingle(),
		admin.from('client_profiles').select('activation_key,plan,subscription_status').eq('clerk_user_id', locals.user!.id).maybeSingle(),
		admin.from('widget_settings').select('id,public_widget_id,active,allowed_domains,published_config,published_version,published_at').eq('tenant_id', workshopId).order('created_at').limit(1).maybeSingle()
	]);
	const failure = [workshop, communication, document, subscription, license, profile, widget].find((entry) => entry.error);
	if (failure?.error) return json({ error: 'Chargement des paramètres impossible.' }, { status: 503 });
	return json({ workshopId, role: member.role, workshop: workshop.data, communication: communication.data, document: document.data, subscription: subscription.data, license: { ...license.data, activationKey: profile.data?.activation_key }, widget: widget.data }, { headers: { 'cache-control': 'no-store' } });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const ctx = await context(locals);
	if (!ctx) return json({ error: 'Session entreprise requise.' }, { status: 401 });
	if (!['owner', 'admin'].includes(ctx.member.role)) return json({ error: 'Action réservée au gérant.' }, { status: 403 });
	const parsed = inputSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Paramètres invalides.' }, { status: 400 });
	const { admin, member } = ctx;
	const workshopId = member.workshop_id;
	if (parsed.data.operation === 'company') {
		const value = parsed.data;
		const { error } = await admin.from('workshops').update({ name: value.name, commercial_name: value.name, email: value.email, phone: value.phone, address: value.address, postal_code: value.postalCode, city: value.city, website: value.website || null, country: value.country, currency: value.country === 'CH' ? 'CHF' : 'EUR', business_hours: value.businessHours, legal_mentions: value.legalMentions, warranty_terms: value.warrantyTerms, updated_at: new Date().toISOString() }).eq('id', workshopId);
		if (error) return json({ error: 'Enregistrement de l’entreprise impossible.' }, { status: 503 });
		await admin.from('client_profiles').update({ company_name: value.name, company_city: value.city, company_country: value.country === 'CH' ? 'Suisse' : 'France', company_phone: value.phone, company_website: value.website, postal_code: value.postalCode, updated_at: new Date().toISOString() }).eq('workshop_id', workshopId);
		return json({ ok: true });
	}
	if (parsed.data.operation === 'communications') {
		const value = parsed.data;
		const { error } = await admin.from('communication_settings').upsert({ workshop_id: workshopId, sender_name: value.senderName, reply_to: value.replyTo || null, email_signature: value.emailSignature, brand_color: value.brandColor, sms_templates: value.smsTemplates, email_templates: value.emailTemplates, automations: value.automations, updated_at: new Date().toISOString() }, { onConflict: 'workshop_id' });
		return error ? json({ error: 'Enregistrement des messages impossible.' }, { status: 503 }) : json({ ok: true });
	}
	const value = parsed.data;
	const { data: widget, error: widgetError } = await admin.from('widget_settings').select('id,published_config').eq('tenant_id', workshopId).order('created_at').limit(1).maybeSingle();
	if (widgetError || !widget) return json({ error: 'Widget non provisionné.' }, { status: 503 });
	const current = (widget.published_config || {}) as Record<string, any>;
	const config = { ...current, active: value.active, displayMode: String(current.displayMode || 'inline'), internalName: String(current.internalName || 'Widget client principal'), general: { ...(current.general || {}), commercialName: value.commercialName, phone: value.phone, address: value.address }, visual: { ...(current.visual || {}), primaryColor: value.primaryColor, buttonColor: value.buttonColor, backgroundColor: value.backgroundColor, logoUrl: value.logoUrl }, texts: { ...(current.texts || {}), title: value.title, introduction: value.introduction, deviceTitle: value.deviceTitle, issueTitle: value.issueTitle, contactTitle: value.contactTitle, submitLabel: value.submitLabel }, features: { ...(current.features || {}), deviceSearch: true, ...value.features }, offers: { enabled: true, title: 'Offres et avantages', subtitle: 'Ajoutez une option à votre réparation', introduction: 'Sélectionnez uniquement ce qui vous intéresse.', layout: 'grid', columns: 2, offers: value.offers } };
	const { error } = await admin.rpc('publish_widget_config', { p_tenant_id: workshopId, p_widget_id: widget.id, p_configuration: config, p_display_mode: config.displayMode, p_internal_name: config.internalName, p_active: value.active, p_created_by: null });
	if (error) return json({ error: 'Publication du widget impossible.' }, { status: 503 });
	const domains = [...new Set(value.allowedDomains.map(cleanDomain).filter(Boolean))];
	await admin.from('widget_settings').update({ allowed_domains: domains }).eq('tenant_id', workshopId).eq('id', widget.id);
	return json({ ok: true });
};
