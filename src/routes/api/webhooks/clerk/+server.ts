import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resend } from '$lib/server/resend';
import { RESEND_FROM_EMAIL, RESEND_REPLY_TO, RESEND_TEMPLATE_ID, RESEND_ADMIN_EMAIL } from '$env/static/private';
import { CLERK_WEBHOOK_SIGNING_SECRET } from '$env/static/private';
import { Webhook } from 'svix';

export const POST: RequestHandler = async ({ request }) => {
  // Verifier la signature du webhook Clerk
  const svix_id = request.headers.get('svix-id');
  const svix_timestamp = request.headers.get('svix-timestamp');
  const svix_signature = request.headers.get('svix-signature');

  // Si aucun des headers n'est présent, retourner une erreur
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return json({ error: 'Missing Svix headers' }, { status: 400 });
  }

  // Obtenir le corps de la requête
  const payload = await request.json();
  const body = JSON.stringify(payload);

  try {
    // Créer une instance Svix Webhook avec le secret de signature
    const wh = new Webhook(CLERK_WEBHOOK_SIGNING_SECRET);

    // Verifier la signature
    wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    });
  } catch (err) {
    console.error('Error verifying webhook signature:', err);
    return json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Traiter seulement l'evenement user.created
  if (payload.type === 'user.created') {
    const { data } = payload;
    const clerkUserId = data.id;
    const emailAddress = data.email_addresses.find(
      (email: any) => email.id === data.primary_email_address_id
    )?.email_address;
    const firstName = data.first_name || '';
    const createdAt = data.created_at;

    // Extraire les metadonnees si disponibles (source, partner code)
    const metadata = data.unsafe_metadata || {};
    const source = metadata.signup_source || 'Non spécifiée';
    const partnerCode = metadata.partner_code || 'Aucun';

    if (!emailAddress) {
      console.error('No email address found in Clerk webhook payload');
      // Retourner 2xx pour ne pas déclencher de nouvelles tentatives
      return json({ success: true }, { status: 200 });
    }

    try {
      // Envoyer l'email de confirmation a l'utilisateur
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: [emailAddress],
        replyTo: RESEND_REPLY_TO,
        subject: 'Votre inscription à Behar Tech Pro est confirmée',
        template: {
          id: RESEND_TEMPLATE_ID
        },
        tags: [
          { name: 'category', value: 'signup_confirmation' }
        ],
        idempotencyKey: `signup-confirmation/${clerkUserId}`
      });

      if (emailError) {
        console.error('Resend confirmation email error:', emailError);
        // Ne pas bloquer le webhook, continuer avec la notification interne
      }

      // Envoyer la notification interne a l'equipe Behar Tech Pro
      const timestamp = new Date().toISOString();
      const adminContent = `
      <h2>Nouvelle inscription Behar Tech Pro</h2>
      <p><strong>Email :</strong> ${emailAddress}</p>
      <p><strong>Prénom :</strong> ${firstName || 'Non spécifié'}</p>
      <p><strong>ID utilisateur Clerk :</strong> ${clerkUserId}</p>
      <p><strong>Date et heure d'inscription :</strong> ${timestamp}</p>
      <p><strong>Source d'inscription :</strong> ${source}</p>
      <p><strong>Code partenaire :</strong> ${partnerCode}</p>
      <p>Vous pouvez consulter l'espace d'administration pour gérer ce prospect.</p>
      `.trim();

      const { data: adminData, error: adminError } = await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: [RESEND_ADMIN_EMAIL],
        subject: `Nouvelle inscription Behar Tech Pro — ${emailAddress}`,
        html: adminContent,
        tags: [
          { name: 'category', value: 'admin_notification' }
        ],
        idempotencyKey: `signup-admin-notification/${clerkUserId}`
      });

      if (adminError) {
        console.error('Resend admin notification error:', adminError);
      }

      return json({ success: true }, { status: 200 });
    } catch (err) {
      console.error('Unexpected error in Clerk webhook handler:', err);
      // Toujours retourner 2xx pour acknowleder le webhook et eviter les retries
      return json({ success: true }, { status: 200 });
    }
  }

  // Pour tous les autres types d'evenements, retourner 200
  return json({ success: true }, { status: 200 });
};