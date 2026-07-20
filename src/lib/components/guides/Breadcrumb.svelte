<script lang="ts">
	// Fil d'Ariane visible (charte §3). Le dernier élément n'est pas cliquable.
	export let items: { name: string; href?: string }[];
</script>

<nav class="crumbs" aria-label="Fil d'Ariane">
	{#each items as item, i}
		{#if item.href && i < items.length - 1}
			<a href={item.href}>{item.name}</a><span class="sep" aria-hidden="true">›</span>
		{:else}
			<span class="current" aria-current="page">{item.name}</span>
		{/if}
	{/each}
</nav>

<style>
	.crumbs {
		font-size: 14px;
		color: var(--text-muted);
	}
	.crumbs a {
		color: var(--text-muted);
	}
	.crumbs a:hover {
		color: var(--accent);
	}
	.sep {
		margin: 0 0.5rem;
		color: var(--text-muted);
	}
	.current {
		color: var(--text);
	}
</style>
