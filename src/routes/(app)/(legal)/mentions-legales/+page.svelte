<script lang="ts">
	import LegalLayout from '$lib/components/legal/LegalLayout.svelte';
	import { absUrl } from '$lib/guides/config';
</script>

<LegalLayout
	title="Mentions légales — Behar Tech Pro"
	description="Mentions légales du site behartechpro.fr, logiciel de gestion pour ateliers de réparation de téléphones (accès anticipé)."
	canonical={absUrl('/mentions-legales')}
	crumb="Mentions légales"
>
	<h1>Mentions légales</h1>
	<p class="updated">Dernière mise à jour : juillet 2026</p>

	<div class="note">
		Behar Tech Pro est actuellement en <strong>accès anticipé</strong>, avant son lancement officiel
		prévu le 15 août 2026.
	</div>

	<h2>Éditeur du site</h2>
	<p>
		Le site <strong>behartechpro.fr</strong> est édité par <strong>Behar Tech Pro</strong>, projet
		porté par <strong>Belmin Sejmenovic</strong>, entreprise en cours d'immatriculation.
	</p>
	<p>
		Contact : <a href="mailto:belmin.sejmenovic74@gmail.com">belmin.sejmenovic74@gmail.com</a>
	</p>
	<p>
		Les informations légales complètes (numéro d'identification, adresse) seront publiées ici dès
		l'immatriculation de l'entreprise.
	</p>

	<h2>Directeur de la publication</h2>
	<p>Belmin Sejmenovic.</p>

	<h2>Hébergement</h2>
	<p>
		Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789,
		États-Unis — <a href="https://vercel.com" rel="noopener" target="_blank">vercel.com</a>.
	</p>

	<h2>Propriété intellectuelle</h2>
	<p>
		L'ensemble des contenus présents sur ce site (textes, visuels, logo, interface) est la propriété
		de Behar Tech Pro, sauf mention contraire. Toute reproduction ou utilisation sans autorisation
		préalable est interdite.
	</p>

	<h2>Données personnelles</h2>
	<p>
		Le traitement de vos données est décrit dans notre
		<a href="/confidentialite/">politique de confidentialité</a>. Conformément au RGPD, vous disposez
		d'un droit d'accès, de rectification et de suppression de vos données en écrivant à l'adresse de
		contact ci-dessus.
	</p>
</LegalLayout>
