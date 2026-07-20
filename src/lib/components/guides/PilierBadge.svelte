<script lang="ts">
	// Badge de pilier (charte §3) : --accent-soft + texte --accent.
	export let label: string;
	export let href: string | undefined = undefined;
</script>

{#if href}
	<a class="badge" {href}>{label}</a>
{:else}
	<span class="badge">{label}</span>
{/if}

<style>
	.badge {
		display: inline-block;
		padding: 4px 12px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
		line-height: 1.4;
		text-decoration: none;
	}
	a.badge:hover {
		color: var(--accent-hover);
		text-decoration: none;
	}
</style>
