import { env } from '$env/dynamic/private';

type EmailAttachment = {
	filename: string;
	/** Contenu encodé en base64. */
	content: string;
	contentType?: string;
};

type SendEmailInput = {
	to: string;
	subject: string;
	html: string;
	text: string;
	idempotencyKey: string;
	attachments?: EmailAttachment[];
};

type LicenseEmailInput = {
	to: string;
	firstName?: string | null;
	licenseKey: string;
	plan: string;
	idempotencyKey: string;
	paid?: boolean;
};

function escapeHtml(value: unknown) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

/** Adresse expéditeur : accepte EMAIL_FROM ou RESEND_FROM_EMAIL (deux conventions). */
function fromAddress() {
	return env.EMAIL_FROM || env.RESEND_FROM_EMAIL || '';
}
function replyToAddress() {
	return env.EMAIL_REPLY_TO || env.RESEND_REPLY_TO || '';
}

export function transactionalEmailConfigured() {
	return Boolean(env.RESEND_API_KEY && fromAddress());
}

export async function sendTransactionalEmail(input: SendEmailInput) {
	if (!transactionalEmailConfigured()) {
		return { sent: false as const, reason: 'not_configured' as const };
	}

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${env.RESEND_API_KEY}`,
			'content-type': 'application/json',
			'Idempotency-Key': input.idempotencyKey.slice(0, 256)
		},
		body: JSON.stringify({
			from: fromAddress(),
			to: [input.to],
			subject: input.subject,
			html: input.html,
			text: input.text,
			...(replyToAddress() ? { reply_to: replyToAddress() } : {}),
			...(input.attachments?.length
				? {
						attachments: input.attachments.map((a) => ({
							filename: a.filename,
							content: a.content,
							...(a.contentType ? { content_type: a.contentType } : {})
						}))
					}
				: {})
		})
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(typeof payload?.message === 'string' ? payload.message : 'Envoi de l’e-mail impossible.');
	}
	return { sent: true as const, id: typeof payload?.id === 'string' ? payload.id : null };
}

export async function sendLicenseEmail(input: LicenseEmailInput) {
	const firstName = escapeHtml(input.firstName || '');
	const licenseKey = escapeHtml(input.licenseKey);
	const plan = escapeHtml(input.plan || 'free');
	const portalUrl = 'https://behartechpro.fr/client';
	const saasUrl = 'https://app.behartechpro.fr/accueil';
	const title = input.paid ? 'Votre abonnement Behar Tech Pro est actif' : 'Bienvenue sur Behar Tech Pro';
	const intro = input.paid
		? `Votre abonnement ${plan} est confirmé et votre licence est active.`
		: `Votre espace a été créé avec l’offre ${plan}.`;

	return sendTransactionalEmail({
		to: input.to,
		subject: `${title} — votre clé de licence`,
		idempotencyKey: input.idempotencyKey,
		text: `${firstName ? `Bonjour ${firstName},\n\n` : ''}${intro}\n\nVotre clé de licence : ${input.licenseKey}\n\nPortail : ${portalUrl}\nSaaS : ${saasUrl}\n\nL’équipe Behar Tech Pro`,
		html: `
			<div style="margin:0;background:#f6f7f5;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#1a1916">
				<div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e8e8e5;border-radius:22px;overflow:hidden">
					<div style="padding:28px 32px;border-bottom:1px solid #eeeeea">
						<div style="font-size:13px;font-weight:800;letter-spacing:.08em">BEHAR <span style="color:#2a9d8f">•</span> TECH <span style="color:#2a9d8f">PRO</span></div>
					</div>
					<div style="padding:32px">
						<h1 style="margin:0;font-size:26px;line-height:1.25">${title}</h1>
						<p style="margin:16px 0 0;line-height:1.7;color:#5f625f">${firstName ? `Bonjour ${firstName}, ` : ''}${intro}</p>
						<div style="margin:26px 0;padding:20px;border-radius:16px;background:#eef8f6;border:1px solid #cfe9e4">
							<div style="font-size:12px;color:#58716c;text-transform:uppercase;letter-spacing:.08em">Votre clé de licence</div>
							<div style="margin-top:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:21px;font-weight:800;letter-spacing:.04em;word-break:break-all">${licenseKey}</div>
						</div>
						<a href="${portalUrl}" style="display:inline-block;border-radius:12px;background:#2a9d8f;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px">Ouvrir mon espace</a>
						<a href="${saasUrl}" style="display:inline-block;margin-left:8px;border-radius:12px;border:1px solid #dfe2de;color:#1a1916;text-decoration:none;font-weight:700;padding:12px 20px">Ouvrir le SaaS</a>
						<p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#777b77">Conservez cette clé en lieu sûr. Elle permet de connecter les appareils de votre atelier.</p>
					</div>
				</div>
			</div>`
	});
}
