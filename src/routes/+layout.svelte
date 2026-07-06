<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { themeToCssVars } from '$lib/cms/theme';
	import type { SiteContent } from '$lib/cms/types';

	export let data: { content: SiteContent; admin: boolean };

	// Contenu partagé à toute l'app via contexte (les composants lisent `cms`).
	const content = writable<SiteContent>(data.content);
	$: content.set(data.content);
	setContext('cms', content);

	// Variables de thème appliquées sur un wrapper display:contents (héritées par
	// tous les descendants, sans boîte supplémentaire).
	$: styleVars = `${themeToCssVars(data.content.theme)};display:contents`;
</script>

<ModeWatcher />

<div style={styleVars}>
	<slot></slot>
</div>
