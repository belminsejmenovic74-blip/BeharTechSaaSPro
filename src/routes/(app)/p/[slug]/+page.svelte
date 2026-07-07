<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { SiteContent } from '$lib/cms/types';
	import BlockRender from '$lib/components/builder/BlockRender.svelte';

	const content = getContext<Writable<SiteContent>>('cms');

	$: slug = $page.params.slug;
	$: pg = $content.pages?.find((p) => p.slug === slug) ?? null;
	$: pageTitle = pg ? `${pg.title} — ${$content.seo.title}` : 'Page introuvable';
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#if pg}
	<section class="min-h-[60vh] py-12" style="background:{pg.bg};">
		<div class="mx-auto px-4" style="max-width:{pg.maxWidth}px;">
			{#each pg.blocks as block (block.id)}
				<BlockRender {block} />
			{/each}
		</div>
	</section>
{:else}
	<section class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold" style="color:var(--bt-text);">404</h1>
			<p class="text-lg" style="color:var(--bt-muted);">Cette page n'existe pas.</p>
			<a href="/" class="mt-4 inline-block rounded-lg px-6 py-2 text-sm font-semibold text-white"
				style="background:var(--bt-accent);">
				Retour à l'accueil
			</a>
		</div>
	</section>
{/if}
