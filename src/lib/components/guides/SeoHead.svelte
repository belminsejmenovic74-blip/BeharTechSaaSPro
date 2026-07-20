<script lang="ts">
	import { ORG } from '$lib/guides/config';
	// En-tête SEO commun : title/description uniques, canonical absolu,
	// Open Graph complet + Twitter Card. lang="fr" est fixé dans app.html.
	export let title: string;
	export let description: string;
	export let canonical: string;
	export let image: string;
	export let imageAlt = '';
	export let type: 'website' | 'article' = 'website';
	export let publishedTime: string | undefined = undefined;
	export let modifiedTime: string | undefined = undefined;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	{#if imageAlt}<meta property="og:image:alt" content={imageAlt} />{/if}
	<meta property="og:url" content={canonical} />
	<meta property="og:locale" content="fr_FR" />
	<meta property="og:site_name" content={ORG.name} />
	{#if publishedTime}<meta property="article:published_time" content={publishedTime} />{/if}
	{#if modifiedTime}<meta property="article:modified_time" content={modifiedTime} />{/if}

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
