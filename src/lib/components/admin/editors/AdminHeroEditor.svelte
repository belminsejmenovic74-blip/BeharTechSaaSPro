<script lang="ts">
	import type { HeroContent } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';
	import Area from '../Area.svelte';
	import Toggle from '../Toggle.svelte';
	import MediaPicker from '../MediaPicker.svelte';

	export let hero: HeroContent;
	export let media: string[] = [];
</script>

<div class="grid gap-5">
	<Field label="Badge (au-dessus du titre)"><Txt bind:value={hero.badge} /></Field>
	<Field label="Titre"><Txt bind:value={hero.title} /></Field>
	<Field label="Sous-titre" hint="Un saut de ligne = un retour à la ligne à l’écran">
		<Area bind:value={hero.subtitle} rows={2} />
	</Field>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Libellé bouton"><Txt bind:value={hero.ctaLabel} /></Field>
		<Field label="Lien bouton"><Txt bind:value={hero.ctaHref} /></Field>
	</div>
	<Field label="Afficher un visuel sous le hero">
		<Toggle bind:checked={hero.showImage} label={hero.showImage ? 'Oui' : 'Non'} />
	</Field>
	{#if hero.showImage}
		<Field label="Image du hero"><MediaPicker bind:value={hero.image} {media} /></Field>
	{/if}
</div>
