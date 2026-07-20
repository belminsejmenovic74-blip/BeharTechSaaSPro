// ══════════════════════════════════════════════════════════════════════════
//  Google Calendar via compte de service (server-only).
//  Belmin partage son agenda Google avec l'e-mail du compte de service
//  (droit « Apporter des modifications aux événements »). On crée l'événement
//  directement sur son agenda (GOOGLE_CALENDAR_ID = son e-mail).
//  Auth : JWT RS256 signé avec la clé privée → jeton OAuth. Aucune dépendance.
// ══════════════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

export function googleCalendarConfigured() {
	return Boolean(env.GOOGLE_SA_EMAIL && env.GOOGLE_SA_PRIVATE_KEY && env.GOOGLE_CALENDAR_ID);
}

function b64url(input: Buffer | string) {
	return Buffer.from(input)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

async function getAccessToken(): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
	const claim = b64url(
		JSON.stringify({
			iss: env.GOOGLE_SA_EMAIL,
			scope: 'https://www.googleapis.com/auth/calendar.events',
			aud: 'https://oauth2.googleapis.com/token',
			iat: now,
			exp: now + 3600
		})
	);
	const signingInput = `${header}.${claim}`;
	// La clé privée est stockée avec des \n échappés dans l'env.
	const key = (env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n');
	const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(key);
	const jwt = `${signingInput}.${b64url(signature)}`;

	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: jwt
		})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.access_token) {
		throw new Error(data?.error_description || data?.error || 'Authentification Google échouée.');
	}
	return data.access_token as string;
}

/** Crée un événement sur l'agenda configuré. Renvoie le lien de l'événement. */
export async function createCalendarEvent(opts: {
	summary: string;
	description: string;
	/** Heure locale sans « Z », ex: 2026-08-20T14:30:00 */
	startLocal: string;
	endLocal: string;
	attendeeEmail: string;
	attendeeName?: string;
	location?: string;
}): Promise<{ htmlLink: string | null }> {
	const token = await getAccessToken();
	const calId = encodeURIComponent(env.GOOGLE_CALENDAR_ID as string);

	const res = await fetch(
		`https://www.googleapis.com/calendar/v3/calendars/${calId}/events?sendUpdates=none`,
		{
			method: 'POST',
			headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
			body: JSON.stringify({
				summary: opts.summary,
				description: opts.description,
				location: opts.location,
				start: { dateTime: opts.startLocal, timeZone: 'Europe/Paris' },
				end: { dateTime: opts.endLocal, timeZone: 'Europe/Paris' },
				attendees: [{ email: opts.attendeeEmail, displayName: opts.attendeeName }],
				reminders: { useDefault: true }
			})
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error?.message || "Création de l'événement Google Calendar échouée.");
	}
	return { htmlLink: typeof data?.htmlLink === 'string' ? data.htmlLink : null };
}
