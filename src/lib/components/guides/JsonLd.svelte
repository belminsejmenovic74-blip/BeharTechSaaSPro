<script lang="ts">
	// Injecte un objet JSON-LD dans <svelte:head>. Échappe « < » pour ne jamais
	// casser la balise script, même si un contenu contient du HTML.
	export let data: unknown;
	$: json = JSON.stringify(data).replace(/</g, '\\u003c');
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${json}<` + `/script>`}
</svelte:head>
