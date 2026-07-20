<script lang="ts">
	import { seo } from '$lib';
	import { onMount } from 'svelte';
	import type { SiteContent } from '$lib/cms/types';
	import { createDefaultDb, loadPublishedDb } from '$lib/cms/db';
	import { getAdminSession } from '$lib/cms/local';
	import SectionRenderer from '$lib/components/landing/SectionRenderer.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import { organizationJsonLd } from '$lib/guides/jsonld';

	export let data: { content: SiteContent };
	$: seoContent = data.content.seo;

	let db = createDefaultDb();

	onMount(() => {
		// Le site public affiche DEFAULT_CONTENT (source de vérité depuis 44364e9).
		// On ne recharge le contenu publié Supabase que pour un admin connecté, pour
		// ne pas écraser la landing du code par une version publiée obsolète.
		if (getAdminSession()) {
			loadPublishedDb().then((published) => {
				db = published;
			});
		}
	});

	// Trier les sections selon l'ordre défini par l'admin
	$: sections = db.page_sections.sort((a, b) => a.order - b.order);
</script>

<svelte:head>
	<title>{seoContent.title || seo.title}</title>
	<meta name="description" content={seoContent.description} />
	<meta name="keywords" content={seoContent.keywords} />

	<meta property="og:title" content={seoContent.title} />
	<meta property="og:description" content={seoContent.description} />
	<meta property="og:image" content={seoContent.image} />
	<meta property="og:site_name" content={seoContent.title} />
	<meta property="og:url" content={seoContent.url} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seoContent.title} />
	<meta name="twitter:description" content={seoContent.description} />
	<meta name="twitter:image" content={seoContent.image} />
</svelte:head>

<JsonLd data={organizationJsonLd()} />

{#each sections as section (section.id)}
	{#if section.settings.visible}
		<SectionRenderer {section} />
	{/if}
{/each}
