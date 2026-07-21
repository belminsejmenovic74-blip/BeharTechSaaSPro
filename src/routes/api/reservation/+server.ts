import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { sendTransactionalEmail, transactionalEmailConfigured } from '$lib/server/transactional-email';
import { googleCalendarConfigured, createCalendarEvent } from '$lib/server/google-calendar';
import type { RequestHandler } from './$types';

export const prerender = false;

const schema = z
	.object({
		firstName: z.string().trim().min(1, 'Prénom requis').max(80),
		lastName: z.string().trim().min(1, 'Nom requis').max(80),
		email: z.string().trim().email('E-mail invalide').max(160),
		phone: z.string().trim().min(6, 'Téléphone requis').max(30),
		shopName: z.string().trim().min(1, 'Nom de la boutique requis').max(120),
		// Créneau OPTIONNEL : les deux ou aucun.
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
		time: z
			.string()
			.regex(/^([01]\d|2[0-3]):[0-5]\d$/)
			.optional(),
		company: z.string().max(0).optional().default('') // honeypot
	})
	.refine((d) => Boolean(d.date) === Boolean(d.time), {
		message: 'Choisissez une date ET une heure, ou aucune.'
	});

function esc(v: unknown) {
	return String(v ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}
function icsEsc(v: string) {
	return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function addrOf(v: string | undefined, fallback: string) {
	if (!v) return fallback;
	const m = v.match(/<([^>]+)>/);
	return (m ? m[1] : v).trim() || fallback;
}
function addMinutes(time: string, mins: number) {
	const [h, m] = time.split(':').map(Number);
	const total = h * 60 + m + mins;
	return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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
	const hasSlot = Boolean(date && time);

	let whenLabel = '';
	if (hasSlot) {
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
		whenLabel = `${dateLabel} à ${time}`;
	}

	if (!transactionalEmailConfigured()) {
		console.warn('[reservation] e-mail non configuré — lead non envoyé:', {
			fullName,
			email,
			phone,
			shopName,
			when: whenLabel || 'sans créneau'
		});
		return json({ ok: true, delivered: false });
	}

	const leadsTo = env.LEADS_EMAIL || env.EMAIL_REPLY_TO;
	const idBase = `${email}-${date ?? 'noslot'}-${time ?? ''}`.replace(/[^a-zA-Z0-9@._-]/g, '');

	// ── Créneau : Google Calendar (auto) sinon invitation .ics ────────────────
	const attachments: { filename: string; content: string; contentType?: string }[] = [];
	let calendarNote = '';
	if (hasSlot) {
		const startLocal = `${date}T${time}:00`;
		const endLocal = `${date}T${addMinutes(time as string, 30)}:00`;
		const summary = `Appel prévente — ${fullName} (${shopName})`;
		const description = `Rendez-vous prévente Behar Tech Pro.\nBoutique : ${shopName}\nE-mail : ${email}\nTéléphone : ${phone}`;

		let addedToGoogle = false;
		if (googleCalendarConfigured()) {
			try {
				await createCalendarEvent({
					summary,
					description,
					startLocal,
					endLocal,
					attendeeEmail: email,
					attendeeName: fullName,
					location: `Téléphone ${phone}`
				});
				addedToGoogle = true;
				calendarNote = 'Rendez-vous ajouté à votre Google Agenda.';
			} catch (e) {
				console.error('[reservation] Google Calendar échec, repli .ics:', e instanceof Error ? e.message : e);
			}
		}

		if (!addedToGoogle) {
			const dt = (t: string) => `${(date as string).replace(/-/g, '')}T${t.replace(':', '')}00`;
			const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
			const organizer = addrOf(env.EMAIL_FROM, 'noreply@behartechpro.fr');
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
				`DTSTART;TZID=Europe/Paris:${dt(time as string)}`,
				`DTEND;TZID=Europe/Paris:${dt(addMinutes(time as string, 30))}`,
				`SUMMARY:${icsEsc(summary)}`,
				`DESCRIPTION:${icsEsc(description)}`,
				`LOCATION:${icsEsc(`Téléphone ${phone}`)}`,
				`ORGANIZER;CN=Behar Tech Pro:mailto:${organizer}`,
				...attendees,
				'STATUS:CONFIRMED',
				'END:VEVENT',
				'END:VCALENDAR'
			].join('\r\n');
			attachments.push({
				filename: 'rendez-vous-behar-tech-pro.ics',
				content: Buffer.from(ics, 'utf-8').toString('base64'),
				contentType: 'text/calendar; method=REQUEST'
			});
			calendarNote = "Invitation calendrier jointe à l'e-mail.";
		}
	}

	// ── E-mails : confirmation prospect + notification interne ────────────────
	const slotBlock = hasSlot
		? `<div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#eef8f6;border:1px solid #cfe9e4;line-height:1.8;color:#33413e"><div style="font-size:18px;font-weight:700">${esc(whenLabel)}</div><div><strong>Boutique :</strong> ${esc(shopName)}</div><div><strong>On vous appelle au :</strong> ${esc(phone)}</div></div>`
		: `<div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#f4f4f1;border:1px solid #e8e8e4;line-height:1.8;color:#33413e"><div><strong>Boutique :</strong> ${esc(shopName)}</div><div><strong>Téléphone :</strong> ${esc(phone)}</div><div style="margin-top:6px;color:#6b6b6b">Nous vous recontacterons très vite pour convenir d'un créneau.</div></div>`;

	try {
		await sendTransactionalEmail({
			to: email,
			subject: hasSlot ? `Rendez-vous confirmé — ${whenLabel}` : 'Votre place est réservée — Behar Tech Pro',
			idempotencyKey: `reservation-confirm/${idBase}`,
			attachments,
			text: `Bonjour ${firstName},\n\n${hasSlot ? `Votre rendez-vous prévente est enregistré : ${whenLabel}.` : 'Votre place pour le lancement est réservée.'}\n\nBoutique : ${shopName}\nTéléphone : ${phone}\n\nLa démo : https://behartechpro.fr/exemple\n\nL'équipe Behar Tech Pro`,
			html: shell(
				`<h1 style="margin:0;font-size:26px;line-height:1.25">${hasSlot ? 'Votre rendez-vous est confirmé 🎉' : 'Votre place est réservée 🎉'}</h1>
				<p style="margin:16px 0 0;line-height:1.7;color:#5f625f">Bonjour ${esc(firstName)}, merci !</p>
				${slotBlock}
				<p style="margin:0 0 20px;line-height:1.7;color:#5f625f">En attendant, découvrez la démo :</p>
				<a href="https://behartechpro.fr/exemple" style="display:inline-block;border-radius:12px;background:#2a9d8f;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px">Voir la démo</a>`
			)
		});

		if (leadsTo) {
			await sendTransactionalEmail({
				to: leadsTo,
				subject: hasSlot
					? `RDV prévente — ${whenLabel} — ${fullName} (${shopName})`
					: `Nouveau lead prévente — ${fullName} (${shopName})`,
				idempotencyKey: `reservation-lead/${idBase}`,
				attachments,
				text: `${hasSlot ? `RDV : ${whenLabel}\n` : 'Nouveau lead (sans créneau)\n'}Nom : ${fullName}\nBoutique : ${shopName}\nE-mail : ${email}\nTéléphone : ${phone}\n${calendarNote}`,
				html: shell(
					`<h1 style="margin:0;font-size:22px">${hasSlot ? 'Nouveau rendez-vous prévente' : 'Nouveau lead prévente'}</h1>
					<div style="margin:18px 0 0;line-height:1.9;color:#33413e">
						${hasSlot ? `<div><strong>Quand :</strong> ${esc(whenLabel)}</div>` : ''}
						<div><strong>Nom :</strong> ${esc(fullName)}</div>
						<div><strong>Boutique :</strong> ${esc(shopName)}</div>
						<div><strong>E-mail :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></div>
						<div><strong>Téléphone :</strong> <a href="tel:${esc(phone)}">${esc(phone)}</a></div>
					</div>
					${calendarNote ? `<p style="margin:16px 0 0;font-size:13px;color:#777b77">${esc(calendarNote)}</p>` : ''}`
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

	return json({ ok: true, delivered: true, slot: hasSlot });
};
