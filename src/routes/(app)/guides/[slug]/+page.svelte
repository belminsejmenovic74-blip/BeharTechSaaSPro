<script lang="ts">
	import GuidesLayout from '$lib/components/guides/GuidesLayout.svelte';
	import Breadcrumb from '$lib/components/guides/Breadcrumb.svelte';
	import SeoHead from '$lib/components/guides/SeoHead.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import PilierBadge from '$lib/components/guides/PilierBadge.svelte';
	import ArticleCard from '$lib/components/guides/ArticleCard.svelte';
	import ArticleMeta from '$lib/components/guides/ArticleMeta.svelte';
	import Essentiel from '$lib/components/guides/Essentiel.svelte';
	import Toc from '$lib/components/guides/Toc.svelte';
	import Prose from '$lib/components/guides/Prose.svelte';
	import Cta from '$lib/components/guides/Cta.svelte';
	import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '$lib/guides/jsonld';
	import { articleUrl, pilierUrl, hubUrl, absUrl, ORG } from '$lib/guides/config';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

{#if data.kind === 'pilier'}
	{@const fm = data.pilier.frontmatter}
	<SeoHead
		title={fm.metaTitle}
		description={fm.metaDescription}
		canonical={pilierUrl(fm.slug)}
		image={ORG.logo}
		imageAlt={ORG.name}
	/>
	<JsonLd
		data={breadcrumbJsonLd([
			{ name: 'Accueil', url: ORG.url },
			{ name: 'Guides', url: hubUrl() },
			{ name: fm.title }
		])}
	/>

	<GuidesLayout wide>
		<div class="container">
			<Breadcrumb
				items={[{ name: 'Accueil', href: '/' }, { name: 'Guides', href: '/guides/' }, { name: fm.title }]}
			/>
			<header class="hero">
				<p class="kicker">{fm.kicker}</p>
				<h1>{fm.title}</h1>
			</header>

			<div class="intro">
				<Prose html={data.pilier.introHtml} />
			</div>

			{#if data.articles.length}
				<div class="grid">
					{#each data.articles as a}
						<ArticleCard
							article={{ ...a, html: '', toc: [], file: '' }}
							pilierLabel={fm.kicker}
						/>
					{/each}
				</div>
			{:else}
				<p class="empty">Les guides de ce pilier arrivent bientôt.</p>
			{/if}
		</div>
	</GuidesLayout>
{:else}
	{@const fm = data.article.frontmatter}
	<SeoHead
		title={fm.metaTitle}
		description={fm.metaDescription}
		canonical={articleUrl(fm.slug)}
		image={absUrl(fm.image)}
		imageAlt={fm.imageAlt}
		type="article"
		publishedTime={fm.datePublished}
		modifiedTime={fm.dateModified}
	/>
	<JsonLd data={articleJsonLd({ frontmatter: fm, html: '', toc: [], readingMinutes: data.article.readingMinutes, file: '' })} />
	<JsonLd
		data={breadcrumbJsonLd([
			{ name: 'Accueil', url: ORG.url },
			{ name: 'Guides', url: hubUrl() },
			{ name: data.pilierTitle, url: pilierUrl(fm.pilier) },
			{ name: fm.title }
		])}
	/>
	{#if fm.faq && fm.faq.length}
		<JsonLd data={faqJsonLd(fm.faq)} />
	{/if}

	<GuidesLayout>
		<article class="article">
			<Breadcrumb
				items={[
					{ name: 'Accueil', href: '/' },
					{ name: 'Guides', href: '/guides/' },
					{ name: data.pilierTitle, href: pilierUrl(fm.pilier) },
					{ name: fm.title }
				]}
			/>

			<header class="head">
				<p class="kicker">{data.pilierKicker}</p>
				<h1>{fm.title}</h1>
				<p class="chapo">{fm.chapo}</p>
				<ArticleMeta
					author={fm.author}
					datePublished={fm.datePublished}
					dateModified={fm.dateModified}
					readingMinutes={data.article.readingMinutes}
				/>
			</header>

			<img
				class="hero-img"
				src={fm.image}
				alt={fm.imageAlt}
				width="1200"
				height="630"
				loading="eager"
				fetchpriority="high"
			/>

			<Essentiel points={fm.essentiel} />
			<Toc items={data.article.toc} />
			<Prose html={data.article.html} />

			{#if fm.faq && fm.faq.length}
				<section class="faq">
					<h2 id="faq">Questions fréquentes</h2>
					{#each fm.faq as item}
						<details>
							<summary>{item.question}</summary>
							<p>{item.answer}</p>
						</details>
					{/each}
				</section>
			{/if}

			<Cta variant={fm.cta} />

			<footer class="author-box">
				<p class="author-name">{fm.author}</p>
				<p class="author-role">Fondateur de {ORG.name} — {ORG.tagline}</p>
			</footer>

			{#if data.related.length}
				<section class="related">
					<h2>Articles du même pilier</h2>
					<div class="grid">
						{#each data.related as a}
							<ArticleCard
								article={{ ...a, html: '', toc: [], file: '' }}
								pilierLabel={data.pilierKicker}
							/>
						{/each}
					</div>
				</section>
			{/if}
		</article>
	</GuidesLayout>
{/if}

<style>
	.container {
		max-width: 1080px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
	.article {
		max-width: 720px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
	.kicker {
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent);
		font-weight: 600;
		margin: 1.5rem 0 0.5rem;
	}
	.hero,
	.head {
		text-align: center;
		margin-bottom: 2rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(30px, 5vw, 52px);
		line-height: 1.15;
		letter-spacing: -0.01em;
		margin: 0.25rem 0 1rem;
	}
	.chapo {
		font-size: 20px;
		color: var(--text-muted);
		line-height: 1.5;
		margin: 0 auto;
		max-width: 40rem;
	}
	.intro {
		max-width: 720px;
		margin: 0 auto 3rem;
	}
	.hero-img {
		width: 100%;
		height: auto;
		aspect-ratio: 1200 / 630;
		object-fit: cover;
		border-radius: 12px;
		border: 1px solid var(--border);
		margin: 1.5rem 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}
	.related,
	.faq {
		margin-top: 3rem;
	}
	.related h2,
	.faq h2 {
		font-size: 24px;
		font-weight: 600;
		margin-bottom: 1.25rem;
		scroll-margin-top: calc(var(--navigation-height, 3.5rem) + 1.5rem);
	}
	.faq details {
		border-bottom: 1px solid var(--border);
		padding: 1rem 0;
	}
	.faq summary {
		font-weight: 600;
		cursor: pointer;
	}
	.faq details p {
		margin: 0.75rem 0 0;
		color: var(--text-muted);
	}
	.author-box {
		background: var(--accent-soft);
		border-radius: 12px;
		padding: 20px 24px;
		margin: 2rem 0;
	}
	.author-name {
		font-weight: 600;
		margin: 0;
	}
	.author-role {
		font-size: 14px;
		color: var(--text-muted);
		margin: 0.25rem 0 0;
	}
	.empty {
		text-align: center;
		color: var(--text-muted);
	}
</style>
