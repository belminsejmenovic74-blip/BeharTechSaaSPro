import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { sendTransactionalEmail, transactionalEmailConfigured } from '$lib/server/transactional-email';
import type { RequestHandler } from './$types';

export const prerender = false;

const schema = z.object({
	firstName: z.string().trim().min(1, 'Prénom requis').max(80),
	lastName: z.string().trim().min(1, 'Nom requis').max(80),
	email: z.string().trim().email('E-mail invalide').max(160),
	phone: z.string().trim().min(6, 'Téléphone requis').max(30),
	shopName: z.string().trim().min(1, 'Nom de la boutique requis').max(120),
	company: z.string().max(0).optional().default('') // honeypot
});

function esc(v: unknown) {
	return String(v ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

const brandHeader = `<div style="padding:24px 32px;border-bottom:1px solid #eeeeea"><div style="font-size:13px;font-weight:800;letter-spacing:.08em">BEHAR <span style="color:#2a9d8f">•</span> TECH <span style="color:#2a9d8f">PRO</span></div></div>`;
const shell = (inner: string) =>
	`<div style="margin:0;background:#f6f7f5;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#1a1916"><div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e8e8e5;border-radius:22px;overflow:hidden">${brandHeader}<div style="padding:32px">${inner}</div></div></div>`;

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: 'Requête invalide.' }, { status: 400 });
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		if ((body as { company?: string })?.company) return json({ ok: true });
		return json(
			{ ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' },
			{ status: 422 }
		);
	}

	const { firstName, lastName, email, phone, shopName } = parsed.data;
	const fullName = `${firstName} ${lastName}`.trim();

	if (!transactionalEmailConfigured()) {
		console.warn('[reservation] e-mail non configuré (RESEND_API_KEY + EMAIL_FROM manquants) — lead:', {
			fullName,
			email,
			phone,
			shopName
		});
		return json({ ok: true, delivered: false });
	}

	const leadsTo = env.LEADS_EMAIL || env.RESEND_ADMIN_EMAIL || env.EMAIL_REPLY_TO || env.RESEND_REPLY_TO;
	const idBase = `${email}-${Date.now()}`.replace(/[^a-zA-Z0-9@._-]/g, '');

	try {
		// Confirmation au prospect.
		await sendTransactionalEmail({
			to: email,
			subject: 'Votre place est réservée — Behar Tech Pro',
			idempotencyKey: `reservation-confirm/${idBase}`,
			text: `Bonjour ${firstName},\n\nMerci ! Votre place pour l'accès anticipé de Behar Tech Pro est réservée.\n\nBoutique : ${shopName}\nTéléphone : ${phone}\n\nNous vous recontacterons très vite. En attendant, la démo : https://behartechpro.fr/exemple\n\nL'équipe Behar Tech Pro`,
			html: shell(
				`<h1 style="margin:0;font-size:26px;line-height:1.25">Votre place est réservée 🎉</h1>
				<p style="margin:16px 0 0;line-height:1.7;color:#5f625f">Bonjour ${esc(firstName)}, merci ! Votre place pour l'accès anticipé de <strong>Behar Tech Pro</strong> est réservée.</p>
				<div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#eef8f6;border:1px solid #cfe9e4;line-height:1.8;color:#33413e">
					<div><strong>Boutique :</strong> ${esc(shopName)}</div>
					<div><strong>Téléphone :</strong> ${esc(phone)}</div>
				</div>
				<p style="margin:0 0 20px;line-height:1.7;color:#5f625f">Nous vous recontacterons très vite. En attendant, découvrez la démo :</p>
				<a href="https://behartechpro.fr/exemple" style="display:inline-block;border-radius:12px;background:#2a9d8f;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px">Voir la démo</a>`
			)
		});

		// Notification interne.
		if (leadsTo) {
			await sendTransactionalEmail({
				to: leadsTo,
				subject: `Nouveau lead prévente — ${fullName} (${shopName})`,
				idempotencyKey: `reservation-lead/${idBase}`,
				text: `Nouveau lead prévente\n\nNom : ${fullName}\nBoutique : ${shopName}\nE-mail : ${email}\nTéléphone : ${phone}`,
				html: shell(
					`<h1 style="margin:0;font-size:22px">Nouveau lead prévente</h1>
					<div style="margin:18px 0 0;line-height:1.9;color:#33413e">
						<div><strong>Nom :</strong> ${esc(fullName)}</div>
						<div><strong>Boutique :</strong> ${esc(shopName)}</div>
						<div><strong>E-mail :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></div>
						<div><strong>Téléphone :</strong> <a href="tel:${esc(phone)}">${esc(phone)}</a></div>
					</div>`
				)
			});
		}
	} catch (e) {
		console.error('[reservation] envoi e-mail échoué:', e instanceof Error ? e.message : e);
		return json(
			{ ok: false, error: "Impossible d'enregistrer pour le moment. Réessayez." },
			{ status: 502 }
		);
	}

	return json({ ok: true, delivered: true });
};
