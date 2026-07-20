<script lang="ts">
	import PilierBadge from './PilierBadge.svelte';
	import { articleUrl, pilierUrl } from '$lib/guides/config';
	import type { Article } from '$lib/guides/content';

	export let article: Article;
	export let pilierLabel: string | undefined = undefined;

	$: fm = article.frontmatter;
	$: dateLabel = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(new Date(fm.datePublished));
</script>

<article class="card">
	<PilierBadge label={pilierLabel ?? fm.pilier} href={pilierUrl(fm.pilier)} />
	<h3 class="title">
		<a href={articleUrl(fm.slug)}>{fm.title}</a>
	</h3>
	<p class="excerpt">{fm.metaDescription}</p>
	<p class="meta">
		<time datetime={fm.datePublished}>{dateLabel}</time> · {article.readingMinutes} min de lecture
	</p>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 24px;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease;
	}
	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 32px rgba(29, 29, 31, 0.08);
	}
	.title {
		font-size: 19px;
		font-weight: 600;
		line-height: 1.35;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.title a {
		color: var(--text);
		text-decoration: none;
	}
	.title a:hover {
		color: var(--accent);
	}
	.excerpt {
		font-size: 15px;
		color: var(--text-muted);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.meta {
		font-size: 13px;
		color: var(--text-muted);
		margin: 0;
		margin-top: auto;
	}
</style>
