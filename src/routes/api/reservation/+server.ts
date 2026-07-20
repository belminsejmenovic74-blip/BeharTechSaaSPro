import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { sendTransactionalEmail, transactionalEmailConfigured } from '$lib/server/transactional-email';
import type { RequestHandler } from './$types';

export const prerender = false;

const CONTACT_PREFS: Record<string, string> = {
	matin: 'le matin',
	'apres-midi': "l'après-midi",
	soir: 'en soirée',
	'peu-importe': 'à tout moment'
};

const schema = z.object({
	firstName: z.string().trim().min(1, 'Prénom requis').max(80),
	lastName: z.string().trim().min(1, 'Nom requis').max(80),
	email: z.string().trim().email('E-mail invalide').max(160),
	phone: z.string().trim().min(6, 'Téléphone requis').max(30),
	shopName: z.string().trim().min(1, 'Nom de la boutique requis').max(120),
	contactPref: z.enum(['matin', 'apres-midi', 'soir', 'peu-importe']).default('peu-importe'),
	// Honeypot anti-spam : doit rester vide.
	company: z.string().max(0).optional().default('')
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
		// Honeypot rempli → on fait comme si tout allait bien (piège les bots).
		if ((body as { company?: string })?.company) return json({ ok: true });
		return json(
			{ ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' },
			{ status: 422 }
		);
	}

	const { firstName, lastName, email, phone, shopName, contactPref } = parsed.data;
	const prefLabel = CONTACT_PREFS[contactPref];
	const fullName = `${firstName} ${lastName}`.trim();

	// Sans configuration e-mail (dev), on ne bloque pas l'UX.
	if (!transactionalEmailConfigured()) {
		console.warn('[reservation] e-mail non configuré (RESEND_API_KEY / EMAIL_FROM) — lead non envoyé:', {
			fullName,
			email,
			phone,
			shopName,
			contactPref
		});
		return json({ ok: true, delivered: false });
	}

	const leadsTo = env.LEADS_EMAIL || env.EMAIL_REPLY_TO;
	const idBase = `${email}-${Date.now()}`;

	try {
		// 1) Confirmation au prospect.
		await sendTransactionalEmail({
			to: email,
			subject: 'Votre place est réservée — Behar Tech Pro',
			idempotencyKey: `reservation-confirm/${idBase}`,
			text: `Bonjour ${firstName},\n\nMerci d'avoir réservé votre place pour le lancement de Behar Tech Pro (15 août 2026).\n\nNous avons bien noté votre boutique « ${shopName} » et nous vous recontacterons ${prefLabel} au ${phone}.\n\nEn attendant, découvrez le suivi client en démo : https://behartechpro.fr/exemple\n\nÀ très vite,\nL'équipe Behar Tech Pro`,
			html: shell(
				`<h1 style="margin:0;font-size:26px;line-height:1.25">Votre place est réservée 🎉</h1>
				<p style="margin:16px 0 0;line-height:1.7;color:#5f625f">Bonjour ${esc(firstName)}, merci d'avoir réservé votre place pour le lancement de <strong>Behar Tech Pro</strong> (15 août 2026).</p>
				<div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#eef8f6;border:1px solid #cfe9e4;line-height:1.8;color:#33413e">
					<div><strong>Boutique :</strong> ${esc(shopName)}</div>
					<div><strong>On vous recontacte :</strong> ${esc(prefLabel)} au ${esc(phone)}</div>
				</div>
				<p style="margin:0 0 20px;line-height:1.7;color:#5f625f">En attendant, découvrez à quoi ressemble le suivi client côté atelier :</p>
				<a href="https://behartechpro.fr/exemple" style="display:inline-block;border-radius:12px;background:#2a9d8f;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px">Voir la démo</a>
				<p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#777b77">Vous recevez cet e-mail car vous avez réservé votre place sur behartechpro.fr. Répondez-y directement pour toute question.</p>`
			)
		});

		// 2) Notification interne (si une adresse est configurée).
		if (leadsTo) {
			await sendTransactionalEmail({
				to: leadsTo,
				subject: `Nouveau lead prévente — ${fullName} (${shopName})`,
				idempotencyKey: `reservation-lead/${idBase}`,
				text: `Nouveau lead prévente\n\nNom : ${fullName}\nBoutique : ${shopName}\nE-mail : ${email}\nTéléphone : ${phone}\nContact souhaité : ${prefLabel}`,
				html: shell(
					`<h1 style="margin:0;font-size:22px">Nouveau lead prévente</h1>
					<div style="margin:18px 0 0;line-height:1.9;color:#33413e">
						<div><strong>Nom :</strong> ${esc(fullName)}</div>
						<div><strong>Boutique :</strong> ${esc(shopName)}</div>
						<div><strong>E-mail :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></div>
						<div><strong>Téléphone :</strong> <a href="tel:${esc(phone)}">${esc(phone)}</a></div>
						<div><strong>Contact souhaité :</strong> ${esc(prefLabel)}</div>
					</div>`
				)
			});
		}
	} catch (e) {
		console.error('[reservation] envoi e-mail échoué:', e instanceof Error ? e.message : e);
		return json(
			{ ok: false, error: "Impossible d'envoyer la confirmation pour le moment. Réessayez." },
			{ status: 502 }
		);
	}

	return json({ ok: true, delivered: true });
};
