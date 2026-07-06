<script lang="ts">
	import { setContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import ClientSection from '$lib/components/landing/ClientSection.svelte';
	import CtaSection from '$lib/components/landing/CtaSection.svelte';
	import HeroSection from '$lib/components/landing/HeroSection.svelte';
	import PricingSection from '$lib/components/landing/PricingSection.svelte';
	import ShowcaseCarousel from '$lib/components/landing/ShowcaseCarousel.svelte';
	import Header from '$lib/layout/Header.svelte';
	import Footer from '$lib/layout/Footer.svelte';
	import { themeToCssVars } from '$lib/cms/theme';
	import type { SiteContent } from '$lib/cms/types';

	export let content: Writable<SiteContent>;
	export let onSelect: (tab: string) => void;
	export let activeTab = '';

	// La preview lit le MÊME store que l'éditeur → tout est live.
	setContext('cms', content);

	// Thème appliqué localement à l'aperçu (les couleurs suivent l'édition).
	$: themeVars = themeToCssVars($content.theme);

	let paneWidth = 900;
	const DESIGN = 1280;
	$: scale = Math.min(1, paneWidth / DESIGN);

	// Section CMS → onglet éditeur.
	const map: Record<string, string> = {
		hero: 'hero',
		stats: 'stats',
		showcaseA: 'showcaseA',
		showcaseB: 'showcaseB',
		showcaseC: 'showcaseC',
		integrations: 'integrations',
		pricing: 'pricing'
	};
</script>

<div class="h-full overflow-auto rounded-xl border border-slate-200 bg-white" bind:clientWidth={paneWidth}>
	<div style="{themeVars}; width:{DESIGN}px; transform:scale({scale}); transform-origin:top left; background:var(--bt-bg);">
		<!-- Wrapper cliquable : chaque zone ouvre son éditeur -->
		<button type="button" class="block w-full text-left" class:bt-active={activeTab === 'header'} on:click={() => onSelect('header')}>
			<Header />
			<div style="height:80px"></div>
		</button>

		{#each $content.sections as section (section.id)}
			{#if section.visible}
				<button type="button" class="relative block w-full text-left" class:bt-active={activeTab === map[section.id]} on:click={() => onSelect(map[section.id])}>
					{#if section.id === 'hero'}<HeroSection />
					{:else if section.id === 'stats'}<ClientSection />
					{:else if section.id === 'showcaseA'}<ShowcaseCarousel id="pense" config={$content.showcases.A} />
					{:else if section.id === 'showcaseB'}<ShowcaseCarousel config={$content.showcases.B} />
					{:else if section.id === 'showcaseC'}<ShowcaseCarousel config={$content.showcases.C} />
					{:else if section.id === 'integrations'}<CtaSection />
					{:else if section.id === 'pricing'}<PricingSection />
					{/if}
				</button>
			{/if}
		{/each}

		<button type="button" class="block w-full text-left" class:bt-active={activeTab === 'footer'} on:click={() => onSelect('footer')}>
			<Footer />
		</button>
	</div>
</div>

<style>
	button {
		cursor: pointer;
		outline: 2px solid transparent;
		outline-offset: -2px;
		transition: outline-color 0.15s;
	}
	button:hover {
		outline-color: rgba(42, 157, 143, 0.4);
	}
	button.bt-active {
		outline-color: #2a9d8f;
	}
</style>
