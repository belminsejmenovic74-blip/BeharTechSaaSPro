<script lang="ts">
	import GuidesLayout from '$lib/components/guides/GuidesLayout.svelte';
	import Breadcrumb from '$lib/components/guides/Breadcrumb.svelte';
	import SeoHead from '$lib/components/guides/SeoHead.svelte';
	import { ORG } from '$lib/guides/config';

	export let title: string;
	export let description: string;
	export let canonical: string;
	export let crumb: string;
</script>

<SeoHead {title} {description} {canonical} image={ORG.logo} imageAlt={ORG.name} />

<GuidesLayout>
	<div class="legal">
		<Breadcrumb items={[{ name: 'Accueil', href: '/' }, { name: crumb }]} />
		<slot />
	</div>
</GuidesLayout>

<style>
	.legal {
		max-width: 720px;
		margin: 0 auto;
		padding: 0 1.5rem;
		font-size: 16px;
		line-height: 1.7;
		color: var(--text);
	}
	.legal :global(h1) {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(30px, 5vw, 44px);
		line-height: 1.15;
		margin: 1.5rem 0 0.5rem;
	}
	.legal :global(.updated) {
		color: var(--text-muted);
		font-size: 14px;
		margin: 0 0 2rem;
	}
	.legal :global(h2) {
		font-size: 22px;
		font-weight: 600;
		margin: 2.25rem 0 0.75rem;
	}
	.legal :global(p),
	.legal :global(li) {
		color: var(--text);
	}
	.legal :global(p) {
		margin: 0 0 1rem;
	}
	.legal :global(ul) {
		margin: 0 0 1rem;
		padding-left: 1.4rem;
	}
	.legal :global(li) {
		margin: 0.35rem 0;
	}
	.legal :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.legal :global(strong) {
		font-weight: 600;
	}
	.legal :global(.note) {
		background: var(--accent-soft);
		border-radius: 12px;
		padding: 14px 18px;
		font-size: 15px;
		margin: 1.5rem 0;
	}
</style>
