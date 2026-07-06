<script lang="ts">
	import { Plus, X } from 'lucide-svelte';

	export let items: string[] = [];
	export let placeholder = 'Élément…';
	export let addLabel = 'Ajouter';
</script>

<div class="flex flex-col gap-2">
	{#each items as _, i}
		<div class="flex items-center gap-2">
			<input
				bind:value={items[i]}
				{placeholder}
				class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
			/>
			<button
				type="button"
				on:click={() => (items = items.filter((_, j) => j !== i))}
				class="rounded-md p-1.5 text-red-500 hover:bg-red-50"
				title="Supprimer"
			>
				<X class="size-4" />
			</button>
		</div>
	{/each}
	<button
		type="button"
		on:click={() => (items = [...items, ''])}
		class="inline-flex w-fit items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
	>
		<Plus class="size-3.5" />
		{addLabel}
	</button>
</div>
