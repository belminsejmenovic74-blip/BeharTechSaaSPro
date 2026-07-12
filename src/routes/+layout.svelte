<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import ThirdPartyScripts from '$lib/components/ThirdPartyScripts.svelte';
	import { themeToCssVars } from '$lib/cms/theme';
	import { loadPublishedSiteContent } from '$lib/cms/db';
	import EditorRoot from '$lib/components/editor/EditorRoot.svelte';
	import { breakpoint, editMode } from '$lib/editor/store';
	import type { SiteContent } from '$lib/cms/types';

	export let data: { content: SiteContent; admin: boolean };

	// Contenu partagé à toute l'app via contexte (les composants lisent `cms`).
	const content = writable<SiteContent>(data.content);
	$: if (!$page.url.pathname.startsWith('/admin')) content.set(data.content);
	setContext('cms', content);

	$: isPublic = !$page.url.pathname.startsWith('/admin');

	// Sur le site public : charge le SiteContent publié depuis Supabase (repli sur
	// le contenu prérendu). L'éditeur « Mode édition » gère ensuite le brouillon.
	onMount(() => {
		if (isPublic) {
			loadPublishedSiteContent(data.content)
				.then((published) => content.set(published))
				.catch((e) => console.error('[cms] load published failed', e));
		}
	});

	// Variables de thème appliquées sur un wrapper display:contents (héritées par
	// tous les descendants, sans boîte supplémentaire).
	$: styleVars = `${themeToCssVars($content.theme)};display:contents`;

	// Cadre responsive en mode édition (desktop = pleine largeur).
	$: stageBp = isPublic && $editMode && $breakpoint !== 'desktop' ? $breakpoint : 'full';
</script>

<ModeWatcher />
<ThirdPartyScripts />

<div style={styleVars}>
	<div class="cms-stage" data-bp={stageBp}>
		<slot></slot>
	</div>
</div>

{#if isPublic}
	<EditorRoot />
{/if}
