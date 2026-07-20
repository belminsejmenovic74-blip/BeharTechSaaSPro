<script lang="ts">
	import GuidesLayout from '$lib/components/guides/GuidesLayout.svelte';
	import Breadcrumb from '$lib/components/guides/Breadcrumb.svelte';
	import SeoHead from '$lib/components/guides/SeoHead.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import { faqJsonLd, breadcrumbJsonLd } from '$lib/guides/jsonld';
	import { faqUrl, ORG } from '$lib/guides/config';
	import type { PageData } from './$types';

	export let data: PageData;

	const title = 'Questions fréquentes — Behar Tech Pro';
	const description =
		'Les réponses aux questions fréquentes sur Behar Tech Pro, le logiciel de gestion pour ateliers de réparation de smartphones.';
</script>

<SeoHead {title} {description} canonical={faqUrl()} image={ORG.logo} imageAlt={ORG.name} />
<JsonLd data={faqJsonLd(data.faq)} />
<JsonLd
	data={breadcrumbJsonLd([{ name: 'Accueil', url: ORG.url }, { name: 'FAQ' }])}
/>

<GuidesLayout>
	<div class="wrap">
		<Breadcrumb items={[{ name: 'Accueil', href: '/' }, { name: 'FAQ' }]} />
		<header class="hero">
			<h1>Questions fréquentes</h1>
			<p class="lede">{description}</p>
		</header>

		<section class="list">
			{#each data.faq as item}
				<details>
					<summary>{item.question}</summary>
					<p>{item.answer}</p>
				</details>
			{/each}
		</section>
	</div>
</GuidesLayout>

<style>
	.wrap {
		max-width: 720px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
	.hero {
		text-align: center;
		margin: 1.5rem 0 2.5rem;
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
		font-size: 18px;
		color: var(--text-muted);
	}
	.list details {
		border-bottom: 1px solid var(--border);
		padding: 1.1rem 0;
	}
	.list summary {
		font-weight: 600;
		font-size: 17px;
		cursor: pointer;
	}
	.list details p {
		margin: 0.75rem 0 0;
		color: var(--text-muted);
	}
</style>
