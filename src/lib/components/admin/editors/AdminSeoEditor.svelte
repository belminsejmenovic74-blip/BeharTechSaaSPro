<script lang="ts">
	import type { Seo } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';
	import Area from '../Area.svelte';
	import MediaPicker from '../MediaPicker.svelte';

	export let seo: Seo;
	export let media: string[] = [];
</script>

<div class="grid gap-5">
	<Field label="Titre (onglet + partage)"><Txt bind:value={seo.title} /></Field>
	<Field label="Description"><Area bind:value={seo.description} rows={3} /></Field>
	<Field label="Mots-clés"><Area bind:value={seo.keywords} rows={2} /></Field>
	<Field label="URL du site"><Txt bind:value={seo.url} type="url" /></Field>
	<Field label="Image de partage (Open Graph)"><MediaPicker bind:value={seo.image} {media} /></Field>
</div>
