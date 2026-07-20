<script lang="ts">
	import GuidesLayout from '$lib/components/guides/GuidesLayout.svelte';
	import Breadcrumb from '$lib/components/guides/Breadcrumb.svelte';
	import SeoHead from '$lib/components/guides/SeoHead.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import PilierBadge from '$lib/components/guides/PilierBadge.svelte';
	import { breadcrumbJsonLd } from '$lib/guides/jsonld';
	import { hubUrl, pilierUrl, ORG } from '$lib/guides/config';
	import type { PageData } from './$types';

	export let data: PageData;

	const title = 'Guides pour ateliers de réparation de smartphones';
	const description =
		'Guides pratiques pour créer, gérer et développer votre atelier de réparation de smartphones : budget, organisation, facturation et outils.';

	$: breadcrumb = breadcrumbJsonLd([
		{ name: 'Accueil', url: ORG.url },
		{ name: 'Guides' }
	]);
</script>

<SeoHead {title} {description} canonical={hubUrl()} image={ORG.logo} imageAlt={ORG.name} />
<JsonLd data={breadcrumb} />

<GuidesLayout wide>
	<div class="container">
		<Breadcrumb items={[{ name: 'Accueil', href: '/' }, { name: 'Guides' }]} />
		<header class="hero">
			<h1>{title}</h1>
			<p class="lede">{description}</p>
		</header>

		{#if data.piliers.length}
			<div class="grid">
				{#each data.piliers as pilier}
					<a class="pilier-card" href={pilierUrl(pilier.slug)}>
						<PilierBadge label={pilier.kicker} />
						<h2 class="pilier-title">{pilier.title}</h2>
						<p class="pilier-desc">{pilier.description}</p>
						<p class="pilier-count">
							{pilier.count} article{pilier.count > 1 ? 's' : ''}
						</p>
					</a>
				{/each}
			</div>
		{:else}
			<p class="empty">Les premiers guides arrivent très bientôt.</p>
		{/if}
	</div>
</GuidesLayout>

<style>
	.container {
		max-width: 1080px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
	.hero {
		text-align: center;
		margin: 1.5rem 0 3rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(30px, 5vw, 52px);
		line-height: 1.15;
		letter-spacing: -0.01em;
		margin: 0.5rem 0 1rem;
	}
	.lede {
		font-size: 19px;
		color: var(--text-muted);
		max-width: 640px;
		margin: 0 auto;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}
	.pilier-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 24px;
		text-decoration: none;
		color: var(--text);
		transition:
			transform 150ms ease,
			box-shadow 150ms ease;
	}
	.pilier-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 32px rgba(29, 29, 31, 0.08);
		text-decoration: none;
	}
	.pilier-title {
		font-size: 21px;
		font-weight: 600;
		margin: 0;
	}
	.pilier-desc {
		font-size: 15px;
		color: var(--text-muted);
		margin: 0;
	}
	.pilier-count {
		font-size: 13px;
		color: var(--accent);
		font-weight: 600;
		margin: auto 0 0;
	}
	.empty {
		text-align: center;
		color: var(--text-muted);
	}
</style>
