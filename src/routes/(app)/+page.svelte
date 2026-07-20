<script lang="ts">
	import { seo } from '$lib';
	import type { SiteContent } from '$lib/cms/types';
	import { createDefaultDb } from '$lib/cms/db';
	import SectionRenderer from '$lib/components/landing/SectionRenderer.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import { organizationJsonLd } from '$lib/guides/jsonld';

	export let data: { content: SiteContent };
	$: seoContent = data.content.seo;

	// Le site public affiche TOUJOURS DEFAULT_CONTENT (source de vérité depuis
	// 44364e9), admin ou non. Le contenu publié Supabase (obsolète) n'écrase plus
	// la landing. L'éditeur « Mode édition » charge le brouillon de son côté.
	let db = createDefaultDb();

	// Trier les sections selon l'ordre défini par l'admin
	$: sections = db.page_sections.sort((a, b) => a.order - b.order);
</script>

<svelte:head>
	<title>{seoContent.title || seo.title}</title>
	<meta name="description" content={seoContent.description} />
	<meta name="keywords" content={seoContent.keywords} />
	<link rel="canonical" href="https://behartechpro.fr/" />

	<meta property="og:type" content="website" />
	<meta property="og:locale" content="fr_FR" />
	<meta property="og:title" content={seoContent.title} />
	<meta property="og:description" content={seoContent.description} />
	<meta property="og:image" content={seoContent.image} />
	<meta property="og:site_name" content="Behar Tech Pro" />
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
