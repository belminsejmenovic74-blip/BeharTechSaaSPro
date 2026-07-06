<script lang="ts">
	export let value = '';
	export let placeholder = '';
	export let type: 'text' | 'number' | 'url' = 'text';

	const cls =
		'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
</script>

{#if type === 'number'}
	<input type="number" bind:value {placeholder} class={cls} />
{:else if type === 'url'}
	<input type="url" bind:value {placeholder} class={cls} />
{:else}
	<input type="text" bind:value {placeholder} class={cls} />
{/if}
