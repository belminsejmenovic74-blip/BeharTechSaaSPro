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
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
	time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide'),
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

/** Échappe le texte pour un champ iCalendar. */
function icsEsc(v: string) {
	return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Extrait l'adresse d'un « Nom <email> ». */
function addrOf(v: string | undefined, fallback: string) {
	if (!v) return fallback;
	const m = v.match(/<([^>]+)>/);
	return (m ? m[1] : v).trim() || fallback;
}

function addMinutes(time: string, mins: number) {
	const [h, m] = time.split(':').map(Number);
	const total = h * 60 + m + mins;
	const nh = Math.floor(total / 60) % 24;
	const nm = total % 60;
	return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
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

	const { firstName, lastName, email, phone, shopName, date, time } = parsed.data;
	const fullName = `${firstName} ${lastName}`.trim();

	// Rendez-vous dans le futur uniquement.
	const when = new Date(`${date}T${time}:00`);
	if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
		return json({ ok: false, error: 'Choisissez une date et une heure à venir.' }, { status: 422 });
	}
	const dateLabel = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(new Date(`${date}T12:00:00`));
	const whenLabel = `${dateLabel} à ${time}`;

	if (!transactionalEmailConfigured()) {
		console.warn('[reservation] e-mail non configuré — RDV non envoyé:', {
			fullName,
			email,
			phone,
			shopName,
			when: whenLabel
		});
		return json({ ok: true, delivered: false });
	}

	const leadsTo = env.LEADS_EMAIL || env.EMAIL_REPLY_TO;
	const organizer = addrOf(env.EMAIL_FROM, 'noreply@behartechpro.fr');
	const idBase = `${email}-${date}-${time}`.replace(/[^a-zA-Z0-9@._-]/g, '');

	// Invitation iCalendar (Google Agenda la reconnaît dans Gmail).
	const dt = (t: string) => `${date.replace(/-/g, '')}T${t.replace(':', '')}00`;
	const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
	const desc = `Rendez-vous prévente Behar Tech Pro.\nBoutique : ${shopName}\nE-mail : ${email}\nTéléphone : ${phone}`;
	const attendees = [`ATTENDEE;CN=${icsEsc(fullName)};RSVP=TRUE:mailto:${email}`];
	if (leadsTo) attendees.push(`ATTENDEE;CN=Behar Tech Pro;RSVP=TRUE:mailto:${leadsTo}`);
	const ics = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Behar Tech Pro//Reservation//FR',
		'CALSCALE:GREGORIAN',
		'METHOD:REQUEST',
		'BEGIN:VEVENT',
		`UID:${idBase}@behartechpro.fr`,
		`DTSTAMP:${dtstamp}`,
		`DTSTART;TZID=Europe/Paris:${dt(time)}`,
		`DTEND;TZID=Europe/Paris:${dt(addMinutes(time, 30))}`,
		`SUMMARY:${icsEsc(`Appel prévente — ${fullName} (${shopName})`)}`,
		`DESCRIPTION:${icsEsc(desc)}`,
		`LOCATION:${icsEsc(`Téléphone ${phone}`)}`,
		`ORGANIZER;CN=Behar Tech Pro:mailto:${organizer}`,
		...attendees,
		'STATUS:CONFIRMED',
		'END:VEVENT',
		'END:VCALENDAR'
	].join('\r\n');
	const icsB64 = Buffer.from(ics, 'utf-8').toString('base64');
	const icsAttachment = {
		filename: 'rendez-vous-behar-tech-pro.ics',
		content: icsB64,
		contentType: 'text/calendar; method=REQUEST'
	};

	try {
		// 1) Confirmation au prospect (avec l'invitation calendrier).
		await sendTransactionalEmail({
			to: email,
			subject: `Rendez-vous confirmé — ${whenLabel}`,
			idempotencyKey: `reservation-confirm/${idBase}`,
			attachments: [icsAttachment],
			text: `Bonjour ${firstName},\n\nMerci ! Votre rendez-vous prévente Behar Tech Pro est enregistré :\n${whenLabel}\n\nNous vous appellerons au ${phone} pour votre boutique « ${shopName} ». L'invitation est jointe à cet e-mail (ajoutez-la à votre agenda).\n\nEn attendant, la démo : https://behartechpro.fr/exemple\n\nÀ très vite,\nL'équipe Behar Tech Pro`,
			html: shell(
				`<h1 style="margin:0;font-size:26px;line-height:1.25">Votre rendez-vous est confirmé 🎉</h1>
				<p style="margin:16px 0 0;line-height:1.7;color:#5f625f">Bonjour ${esc(firstName)}, merci ! Voici votre créneau prévente :</p>
				<div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#eef8f6;border:1px solid #cfe9e4;line-height:1.8;color:#33413e">
					<div style="font-size:18px;font-weight:700">${esc(whenLabel)}</div>
					<div><strong>Boutique :</strong> ${esc(shopName)}</div>
					<div><strong>On vous appelle au :</strong> ${esc(phone)}</div>
				</div>
				<p style="margin:0 0 20px;line-height:1.7;color:#5f625f">L'invitation est en pièce jointe (ajoutez-la à votre agenda). En attendant, la démo :</p>
				<a href="https://behartechpro.fr/exemple" style="display:inline-block;border-radius:12px;background:#2a9d8f;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px">Voir la démo</a>`
			)
		});

		// 2) Notification interne + invitation (arrive dans ton Google Agenda).
		if (leadsTo) {
			await sendTransactionalEmail({
				to: leadsTo,
				subject: `RDV prévente — ${whenLabel} — ${fullName} (${shopName})`,
				idempotencyKey: `reservation-lead/${idBase}`,
				attachments: [icsAttachment],
				text: `Nouveau rendez-vous prévente\n\nQuand : ${whenLabel}\nNom : ${fullName}\nBoutique : ${shopName}\nE-mail : ${email}\nTéléphone : ${phone}\n\nInvitation calendrier jointe.`,
				html: shell(
					`<h1 style="margin:0;font-size:22px">Nouveau rendez-vous prévente</h1>
					<div style="margin:18px 0 0;line-height:1.9;color:#33413e">
						<div><strong>Quand :</strong> ${esc(whenLabel)}</div>
						<div><strong>Nom :</strong> ${esc(fullName)}</div>
						<div><strong>Boutique :</strong> ${esc(shopName)}</div>
						<div><strong>E-mail :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></div>
						<div><strong>Téléphone :</strong> <a href="tel:${esc(phone)}">${esc(phone)}</a></div>
					</div>
					<p style="margin:18px 0 0;font-size:13px;color:#777b77">Invitation calendrier jointe — ouvrez-la pour l'ajouter à Google Agenda.</p>`
				)
			});
		}
	} catch (e) {
		console.error('[reservation] envoi e-mail échoué:', e instanceof Error ? e.message : e);
		return json(
			{ ok: false, error: "Impossible d'enregistrer le rendez-vous pour le moment. Réessayez." },
			{ status: 502 }
		);
	}

	return json({ ok: true, delivered: true });
};
