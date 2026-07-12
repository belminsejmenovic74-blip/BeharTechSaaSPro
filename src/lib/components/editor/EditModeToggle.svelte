<script lang="ts">
	import { MousePointerClick, X } from 'lucide-svelte';
	import { editMode } from '$lib/editor/store';

	function toggle() {
		editMode.update((v) => !v);
	}
</script>

<button
	type="button"
	on:click={toggle}
	class="cms-toggle"
	class:active={$editMode}
	title={$editMode ? 'Quitter le mode édition' : 'Activer le mode édition'}
>
	{#if $editMode}
		<X class="size-4" />
		<span>Quitter l'édition</span>
	{:else}
		<MousePointerClick class="size-4" />
		<span>Mode édition</span>
	{/if}
</button>

<style>
	.cms-toggle {
		position: fixed;
		left: 20px;
		bottom: 20px;
		z-index: 2147483000;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: 999px;
		border: 1px solid rgba(26, 25, 22, 0.08);
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(12px);
		color: #1a1916;
		font-size: 13px;
		font-weight: 600;
		box-shadow:
			0 10px 30px rgba(26, 25, 22, 0.12),
			0 2px 8px rgba(26, 25, 22, 0.06);
		cursor: pointer;
		transition:
			transform 120ms ease,
			box-shadow 120ms ease,
			background 120ms ease;
	}
	.cms-toggle:hover {
		transform: translateY(-1px);
		box-shadow: 0 14px 36px rgba(26, 25, 22, 0.16);
	}
	.cms-toggle.active {
		background: #2a9d8f;
		color: #fff;
		border-color: transparent;
	}
</style>
