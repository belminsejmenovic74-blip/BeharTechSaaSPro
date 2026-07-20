<script lang="ts">
	import GuidesLayout from '$lib/components/guides/GuidesLayout.svelte';
	import Breadcrumb from '$lib/components/guides/Breadcrumb.svelte';
	import SeoHead from '$lib/components/guides/SeoHead.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import PilierBadge from '$lib/components/guides/PilierBadge.svelte';
	import { breadcrumbJsonLd } from '$lib/guides/jsonld';
	import { blogHubUrl, blogUrl, ORG } from '$lib/guides/config';
	import type { PageData } from './$types';

	export let data: PageData;

	const title = 'Blog — conseils pour ateliers de réparation | Behar Tech Pro';
	const description =
		'Conseils, méthodes et actualités pour créer, gérer et développer votre atelier de réparation de smartphones.';

	const fmtDate = (iso: string) =>
		new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
			new Date(iso)
		);
</script>

<SeoHead {title} {description} canonical={blogHubUrl()} image={ORG.logo} imageAlt={ORG.name} />
<JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', url: ORG.url }, { name: 'Blog' }])} />

<GuidesLayout wide>
	<div class="container">
		<Breadcrumb items={[{ name: 'Accueil', href: '/' }, { name: 'Blog' }]} />
		<header class="hero">
			<p class="kicker">Blog</p>
			<h1>Conseils pour votre atelier de réparation</h1>
			<p class="lede">{description}</p>
		</header>

		{#if data.posts.length}
			<div class="grid">
				{#each data.posts as post}
					<article class="card">
						<PilierBadge label={post.category} />
						<h2 class="card-title"><a href={blogUrl(post.slug)}>{post.title}</a></h2>
						<p class="excerpt">{post.description}</p>
						<p class="meta">
							<time datetime={post.datePublished}>{fmtDate(post.datePublished)}</time> · {post.readingMinutes}
							min de lecture
						</p>
					</article>
				{/each}
			</div>
		{:else}
			<p class="empty">
				Nos premiers articles arrivent avec le lancement. En attendant, consultez nos
				<a href="/guides/">guides pratiques</a>.
			</p>
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
	.kicker {
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent);
		font-weight: 600;
		margin: 0 0 0.5rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(30px, 5vw, 52px);
		line-height: 1.15;
		letter-spacing: -0.01em;
		margin: 0.25rem 0 1rem;
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
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 24px;
	}
	.card-title {
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}
	.card-title a {
		color: var(--text);
		text-decoration: none;
	}
	.card-title a:hover {
		color: var(--accent);
	}
	.excerpt {
		font-size: 15px;
		color: var(--text-muted);
		margin: 0;
	}
	.meta {
		font-size: 13px;
		color: var(--text-muted);
		margin: auto 0 0;
	}
	.empty {
		text-align: center;
		color: var(--text-muted);
	}
</style>
