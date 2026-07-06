<script lang="ts">
	import { seo } from '$lib';
	import ClientSection from '$lib/components/landing/ClientSection.svelte';
	import CtaSection from '$lib/components/landing/CtaSection.svelte';
	import HeroSection from '$lib/components/landing/HeroSection.svelte';
	import PricingSection from '$lib/components/landing/PricingSection.svelte';
	import ShowcaseCarousel from '$lib/components/landing/ShowcaseCarousel.svelte';
	import SphereMask from '$lib/components/magic/SphereMask/SphereMask.svelte';
	import type { SiteContent } from '$lib/cms/types';

	export let data: { content: SiteContent };
	$: content = data.content;
</script>

<svelte:head>
	<title>{content.seo.title || seo.title}</title>
	<meta name="description" content={content.seo.description} />
	<meta name="keywords" content={content.seo.keywords} />

	<meta property="og:title" content={content.seo.title} />
	<meta property="og:description" content={content.seo.description} />
	<meta property="og:image" content={content.seo.image} />
	<meta property="og:site_name" content={content.seo.title} />
	<meta property="og:url" content={content.seo.url} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={content.seo.title} />
	<meta name="twitter:description" content={content.seo.description} />
	<meta name="twitter:image" content={content.seo.image} />
</svelte:head>

{#each content.sections as section (section.id)}
	{#if section.visible}
		{#if section.id === 'hero'}
			<HeroSection />
		{:else if section.id === 'stats'}
			<ClientSection />
		{:else if section.id === 'showcaseA'}
			<SphereMask />
			<ShowcaseCarousel id="pense" config={content.showcases.A} />
		{:else if section.id === 'showcaseB'}
			<ShowcaseCarousel config={content.showcases.B} />
		{:else if section.id === 'showcaseC'}
			<ShowcaseCarousel config={content.showcases.C} />
		{:else if section.id === 'integrations'}
			<CtaSection />
		{:else if section.id === 'pricing'}
			<PricingSection />
		{/if}
	{/if}
{/each}
