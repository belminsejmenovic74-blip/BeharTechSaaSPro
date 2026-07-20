<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import type { PageSection } from '$lib/cms/types';
	import { DEFAULT_CONTENT } from '$lib/cms/default-content';

	import HeroSection from '$lib/components/landing/HeroSection.svelte';
	import ClientSection from '$lib/components/landing/ClientSection.svelte';
	import CtaSection from '$lib/components/landing/CtaSection.svelte';
	import PricingSection from '$lib/components/landing/PricingSection.svelte';
	import ShowcaseCarousel from '$lib/components/landing/ShowcaseCarousel.svelte';
	import FaqSection from '$lib/components/landing/FaqSection.svelte';
	import SphereMask from '$lib/components/magic/SphereMask/SphereMask.svelte';

	export let section: PageSection;

	// Initialisation du store local pour intercepter l'accès de `getCms()` par les enfants
	const localStore = writable(structuredClone(DEFAULT_CONTENT));
	setContext('cms', localStore);

	// Réactivité : quand la section change, on met à jour le store
	$: {
		const mockContent = structuredClone(DEFAULT_CONTENT);
		if (section.type === 'hero') mockContent.hero = section.content;
		else if (section.type === 'stats') mockContent.stats = section.content;
		else if (section.type === 'integrations') mockContent.integrations = section.content;
		else if (section.type === 'pricing') mockContent.pricing = section.content;
		else if (section.type === 'faq') mockContent.faq = section.content;
		else if (section.type.startsWith('showcase')) {
			const key = section.type.replace('showcase', '') as 'A' | 'B' | 'C';
			if (mockContent.showcases[key]) {
				mockContent.showcases[key] = section.content;
			}
		}
		localStore.set(mockContent);
	}
</script>

{#if section.type === 'hero'}
	<HeroSection />
{:else if section.type === 'stats'}
	<ClientSection />
{:else if section.type === 'showcaseA'}
	<SphereMask />
	<ShowcaseCarousel id="pense" config={section.content} />
{:else if section.type.startsWith('showcase')}
	<ShowcaseCarousel config={section.content} />
{:else if section.type === 'integrations'}
	<CtaSection />
{:else if section.type === 'pricing'}
	<PricingSection />
{:else if section.type === 'faq'}
	<FaqSection />
{/if}
