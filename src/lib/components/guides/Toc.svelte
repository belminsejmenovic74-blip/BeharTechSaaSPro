<script lang="ts">
	import type { TocItem } from '$lib/guides/markdown';
	// Sommaire auto-généré depuis les H2 (charte §3). Replié en accordéon sur mobile.
	export let items: TocItem[];
</script>

{#if items.length}
	<nav class="toc" aria-label="Sommaire">
		<details open>
			<summary>Sommaire</summary>
			<ul>
				{#each items as item}
					<li><a href={`#${item.id}`}>{item.label}</a></li>
				{/each}
			</ul>
		</details>
	</nav>
{/if}

<style>
	.toc {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 20px;
		margin: 2rem 0;
		font-size: 15px;
	}
	summary {
		font-weight: 600;
		cursor: pointer;
		color: var(--text);
	}
	ul {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.toc a {
		color: var(--text-muted);
	}
	.toc a:hover {
		color: var(--accent);
	}
</style>
