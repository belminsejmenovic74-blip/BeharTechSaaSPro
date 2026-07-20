<script lang="ts">
	import GuidesLayout from '$lib/components/guides/GuidesLayout.svelte';
	import Breadcrumb from '$lib/components/guides/Breadcrumb.svelte';
	import SeoHead from '$lib/components/guides/SeoHead.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import PilierBadge from '$lib/components/guides/PilierBadge.svelte';
	import ArticleMeta from '$lib/components/guides/ArticleMeta.svelte';
	import Essentiel from '$lib/components/guides/Essentiel.svelte';
	import Toc from '$lib/components/guides/Toc.svelte';
	import Prose from '$lib/components/guides/Prose.svelte';
	import Cta from '$lib/components/guides/Cta.svelte';
	import { breadcrumbJsonLd, faqJsonLd } from '$lib/guides/jsonld';
	import { blogHubUrl, blogUrl, absUrl, ORG } from '$lib/guides/config';
	import type { PageData } from './$types';

	export let data: PageData;
	$: fm = data.post.frontmatter;
	$: url = blogUrl(fm.slug);

	$: articleLd = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: fm.title,
		description: fm.metaDescription,
		image: absUrl(fm.image),
		author: { '@type': 'Person', name: fm.author },
		publisher: {
			'@type': 'Organization',
			name: ORG.name,
			logo: { '@type': 'ImageObject', url: ORG.logo }
		},
		datePublished: fm.datePublished,
		dateModified: fm.dateModified,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		inLanguage: 'fr',
		url
	};

	const fmtDate = (iso: string) =>
		new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
			new Date(iso)
		);
</script>

<SeoHead
	title={fm.metaTitle}
	description={fm.metaDescription}
	canonical={url}
	image={absUrl(fm.image)}
	imageAlt={fm.imageAlt}
	type="article"
	publishedTime={fm.datePublished}
	modifiedTime={fm.dateModified}
/>
<JsonLd data={articleLd} />
<JsonLd
	data={breadcrumbJsonLd([
		{ name: 'Accueil', url: ORG.url },
		{ name: 'Blog', url: blogHubUrl() },
		{ name: fm.title }
	])}
/>
{#if fm.faq && fm.faq.length}
	<JsonLd data={faqJsonLd(fm.faq)} />
{/if}

<GuidesLayout>
	<article class="article">
		<Breadcrumb
			items={[{ name: 'Accueil', href: '/' }, { name: 'Blog', href: '/blog/' }, { name: fm.title }]}
		/>

		<header class="head">
			<p class="kicker">{fm.category}</p>
			<h1>{fm.title}</h1>
			<p class="chapo">{fm.chapo}</p>
			<ArticleMeta
				author={fm.author}
				datePublished={fm.datePublished}
				dateModified={fm.dateModified}
				readingMinutes={data.post.readingMinutes}
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
		<Toc items={data.post.toc} />
		<Prose html={data.post.html} />

		{#if fm.faq && fm.faq.length}
			<section class="faq">
				<h2 id="faq">Questions fréquentes</h2>
				{#each fm.faq as item}
					<details><summary>{item.question}</summary><p>{item.answer}</p></details>
				{/each}
			</section>
		{/if}

		<Cta variant={fm.cta} />

		{#if data.related.length}
			<section class="related">
				<h2>À lire aussi</h2>
				<div class="grid">
					{#each data.related as p}
						<a class="card" href={blogUrl(p.frontmatter.slug)}>
							<PilierBadge label={p.frontmatter.category} />
							<span class="card-title">{p.frontmatter.title}</span>
							<span class="card-meta">
								<time datetime={p.frontmatter.datePublished}>{fmtDate(p.frontmatter.datePublished)}</time>
								· {p.readingMinutes} min
							</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	</article>
</GuidesLayout>

<style>
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
	.hero-img {
		width: 100%;
		height: auto;
		aspect-ratio: 1200 / 630;
		object-fit: cover;
		border-radius: 12px;
		border: 1px solid var(--border);
		margin: 1.5rem 0;
	}
	.related {
		margin-top: 3rem;
	}
	.related h2,
	.faq h2 {
		font-size: 24px;
		font-weight: 600;
		margin-bottom: 1.25rem;
		scroll-margin-top: calc(var(--navigation-height, 3.5rem) + 1.5rem);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1.5rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 20px;
		text-decoration: none;
	}
	.card-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text);
	}
	.card-meta {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: auto;
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
</style>
