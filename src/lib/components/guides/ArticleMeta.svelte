<script lang="ts">
	// Ligne auteur · dates réelles visibles (exigence GEO §6) · temps de lecture.
	export let author: string;
	export let datePublished: string;
	export let dateModified: string;
	export let readingMinutes: number;

	const fmt = (iso: string) =>
		new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
			new Date(iso)
		);
	$: published = fmt(datePublished);
	$: modified = fmt(dateModified);
	$: showModified = datePublished.slice(0, 10) !== dateModified.slice(0, 10);
</script>

<p class="meta">
	<span class="author">{author}</span>
	<span class="dot">·</span>
	<span>Publié le <time datetime={datePublished}>{published}</time></span>
	{#if showModified}
		<span class="dot">·</span>
		<span>Mis à jour le <time datetime={dateModified}>{modified}</time></span>
	{/if}
	<span class="dot">·</span>
	<span>{readingMinutes} min de lecture</span>
</p>

<style>
	.meta {
		font-size: 14px;
		color: var(--text-muted);
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: center;
		margin: 1rem 0 0;
	}
	.author {
		font-weight: 600;
		color: var(--text);
	}
	.dot {
		color: var(--border);
	}
</style>
