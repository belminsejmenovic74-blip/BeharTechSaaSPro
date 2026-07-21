<script lang="ts">
	import LegalLayout from '$lib/components/legal/LegalLayout.svelte';
	import { absUrl } from '$lib/guides/config';
</script>

<LegalLayout
	title="Politique de confidentialité — Behar Tech Pro"
	description="Comment Behar Tech Pro collecte, utilise et protège vos données personnelles, conformément au RGPD."
	canonical={absUrl('/confidentialite')}
	crumb="Confidentialité"
>
	<h1>Politique de confidentialité</h1>
	<p class="updated">Dernière mise à jour : juillet 2026</p>

	<p>
		Cette politique explique quelles données personnelles Behar Tech Pro collecte, pourquoi, et
		quels sont vos droits. Elle s'applique au site behartechpro.fr, en accès anticipé avant le
		lancement du 15 août 2026.
	</p>

	<h2>Responsable du traitement</h2>
	<p>
		Behar Tech Pro (Belmin Sejmenovic). Contact :
		<a href="mailto:belmin.sejmenovic74@gmail.com">belmin.sejmenovic74@gmail.com</a>.
	</p>

	<h2>Quelles données collectons-nous ?</h2>
	<ul>
		<li>
			<strong>Formulaire de réservation :</strong> prénom, nom, nom de la boutique, e-mail et
			téléphone que vous nous communiquez volontairement.
		</li>
		<li>
			<strong>Données de navigation :</strong> statistiques d'usage anonymisées (pages vues,
			appareil) via nos outils de mesure d'audience.
		</li>
	</ul>

	<h2>Pourquoi ?</h2>
	<ul>
		<li>Vous recontacter au sujet de l'accès anticipé et du lancement.</li>
		<li>Vous envoyer un e-mail de confirmation de votre réservation.</li>
		<li>Améliorer le site et le produit.</li>
	</ul>
	<p>
		Base légale : votre <strong>consentement</strong> (envoi du formulaire) et notre
		<strong>intérêt légitime</strong> à développer le service.
	</p>

	<h2>Qui a accès à vos données ?</h2>
	<p>
		Uniquement l'équipe Behar Tech Pro et nos prestataires techniques, strictement pour fournir le
		service : envoi d'e-mails (Resend), hébergement (Vercel), base de données et authentification
		(Supabase, Clerk), mesure d'audience (PostHog), paiement lorsqu'il sera activé (Stripe). Nous ne
		vendons jamais vos données.
	</p>

	<h2>Combien de temps ?</h2>
	<p>
		Vos données de contact sont conservées le temps de la relation prévente puis, au maximum, 3 ans
		après le dernier contact, sauf demande de suppression de votre part.
	</p>

	<h2>Vos droits</h2>
	<p>
		Vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité
		de vos données. Écrivez à
		<a href="mailto:belmin.sejmenovic74@gmail.com">belmin.sejmenovic74@gmail.com</a>. Vous pouvez
		aussi introduire une réclamation auprès de la CNIL (<a
			href="https://www.cnil.fr"
			rel="noopener"
			target="_blank">cnil.fr</a
		>).
	</p>

	<h2>Cookies</h2>
	<p>
		Le site utilise des cookies de mesure d'audience pour comprendre son utilisation. Vous pouvez
		les refuser via les réglages de votre navigateur.
	</p>
</LegalLayout>
