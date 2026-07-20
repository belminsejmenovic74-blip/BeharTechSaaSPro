<script lang="ts">
	// Corps d'article : HTML issu du Markdown, colonne de lecture ≤720px (charte §2/§3).
	export let html: string;
</script>

<div class="prose">
	{@html html}
</div>

<style>
	.prose {
		font-size: 18px;
		line-height: 1.7;
		color: var(--text);
	}
	.prose :global(h2) {
		font-family: Inter, system-ui, sans-serif;
		font-size: 27px;
		font-weight: 600;
		line-height: 1.3;
		margin: 2.5rem 0 1rem;
		scroll-margin-top: calc(var(--navigation-height, 3.5rem) + 1.5rem);
	}
	.prose :global(h3) {
		font-family: Inter, system-ui, sans-serif;
		font-size: 20px;
		font-weight: 600;
		margin: 2rem 0 0.75rem;
		scroll-margin-top: calc(var(--navigation-height, 3.5rem) + 1.5rem);
	}
	.prose :global(p) {
		margin: 0 0 1.25rem;
	}
	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 1.25rem;
		padding-left: 1.4rem;
	}
	.prose :global(li) {
		margin: 0.35rem 0;
	}
	.prose :global(strong) {
		font-weight: 600;
	}
	.prose :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.prose :global(blockquote) {
		margin: 1.5rem 0;
		padding: 0.5rem 1.25rem;
		border-left: 3px solid var(--border);
		color: var(--text-muted);
	}
	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 15px;
		margin: 1.5rem 0;
		display: block;
		overflow-x: auto;
	}
	.prose :global(th),
	.prose :global(td) {
		border: 1px solid var(--border);
		padding: 8px 12px;
		text-align: left;
	}
	.prose :global(th) {
		background: var(--bg);
		font-weight: 600;
	}
	.prose :global(code) {
		font-family: 'SF Mono', 'JetBrains Mono', monospace;
		font-size: 0.9em;
		background: var(--accent-soft);
		padding: 0.1em 0.35em;
		border-radius: 4px;
	}
	.prose :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 12px;
	}
</style>
