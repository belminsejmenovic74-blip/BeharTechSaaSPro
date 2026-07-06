<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { themeToCssVars } from '$lib/cms/theme';
	import { loadLocalContent } from '$lib/cms/local';
	import type { SiteContent } from '$lib/cms/types';

	export let data: { content: SiteContent; admin: boolean };

	// Contenu partagé à toute l'app via contexte (les composants lisent `cms`).
	const content = writable<SiteContent>(data.content);
	$: if (!$page.url.pathname.startsWith('/admin')) content.set(data.content);
	setContext('cms', content);

	// Site statique : sur le site public, applique les modifs enregistrées en local
	// (localStorage) → rendu immédiat dans le navigateur de l'éditeur. L'admin gère
	// son propre store, on ne le touche pas.
	onMount(() => {
		if (!$page.url.pathname.startsWith('/admin')) content.set(loadLocalContent(data.content));
	});

	// Variables de thème appliquées sur un wrapper display:contents (héritées par
	// tous les descendants, sans boîte supplémentaire).
	$: styleVars = `${themeToCssVars($content.theme)};display:contents`;
</script>

<ModeWatcher />

<div style={styleVars}>
	<slot></slot>
</div>
