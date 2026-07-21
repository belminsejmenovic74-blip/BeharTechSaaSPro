<script lang="ts">
	import LegalLayout from '$lib/components/legal/LegalLayout.svelte';
	import { absUrl } from '$lib/guides/config';
</script>

<LegalLayout
	title="Contact — Behar Tech Pro"
	description="Contactez l'équipe Behar Tech Pro pour toute question sur l'accès anticipé, le produit ou la prévente."
	canonical={absUrl('/contact')}
	crumb="Contact"
>
	<h1>Nous contacter</h1>
	<p class="updated">On vous répond vite.</p>

	<p>
		Une question sur le produit, l'accès anticipé ou votre réservation ? Écrivez-nous, nous sommes à
		votre écoute.
	</p>

	<h2>Par e-mail</h2>
	<p>
		<a href="mailto:belmin.sejmenovic74@gmail.com">belmin.sejmenovic74@gmail.com</a>
	</p>

	<h2>Réserver votre place</h2>
	<p>
		Behar Tech Pro est en accès anticipé. Pour être recontacté et rejoindre le lancement du 15 août
		2026, <a href="/#cta">réservez votre place</a> — c'est sans engagement et sans paiement.
	</p>

	<h2>Voir le produit</h2>
	<p>
		Découvrez le suivi client côté atelier avec notre <a href="/exemple">démo du widget</a>, ou
		parcourez nos <a href="/guides/">guides pratiques</a>.
	</p>
</LegalLayout>
