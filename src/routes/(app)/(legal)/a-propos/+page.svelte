<script lang="ts">
	import LegalLayout from '$lib/components/legal/LegalLayout.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import { absUrl, ORG } from '$lib/guides/config';

	const personLd = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: 'Belmin Sejmenovic',
		jobTitle: 'Fondateur',
		worksFor: { '@type': 'Organization', name: ORG.name, url: ORG.url },
		url: absUrl('/a-propos')
	};
</script>

<JsonLd data={personLd} />

<LegalLayout
	title="À propos — Behar Tech Pro"
	description="Behar Tech Pro, le logiciel pensé par et pour les réparateurs de téléphones. Notre mission : l'atelier dans la poche."
	canonical={absUrl('/a-propos')}
	crumb="À propos"
>
	<h1>À propos de Behar Tech Pro</h1>
	<p class="updated">L'atelier dans la poche.</p>

	<p>
		Behar Tech Pro est un logiciel de gestion pensé pour les <strong>ateliers de réparation de
		téléphones</strong>. L'objectif est simple : réunir dans un seul outil le suivi client, les
		devis et factures, le suivi des réparations, le reconditionnement et l'encaissement — pour que
		les réparateurs passent moins de temps sur l'administratif et plus de temps sur leur métier.
	</p>

	<h2>Pourquoi ce projet ?</h2>
	<p>
		La plupart des ateliers jonglent entre un carnet, un tableur et leur téléphone. Chaque outil
		détient une partie de l'information, et personne n'a la vue d'ensemble. Behar Tech Pro est né de
		ce constat : centraliser, simplifier, et rendre le suivi client aussi professionnel que dans un
		service premium.
	</p>

	<h2>Qui est derrière ?</h2>
	<p>
		Le projet est porté par <strong>Belmin Sejmenovic</strong>, fondateur de Behar Tech Pro. Il
		conçoit le produit au contact direct des réparateurs pour coller à leur réalité de terrain.
	</p>

	<h2>Où en est-on ?</h2>
	<div class="note">
		Behar Tech Pro est en <strong>accès anticipé</strong>. Le lancement officiel est prévu le
		<strong>15 août 2026</strong>. Vous pouvez <a href="/#cta">réserver votre place</a> dès
		maintenant, sans engagement.
	</div>

	<p>
		Une question ? Écrivez-nous :
		<a href="mailto:belmin.sejmenovic74@gmail.com">belmin.sejmenovic74@gmail.com</a>.
	</p>
</LegalLayout>
