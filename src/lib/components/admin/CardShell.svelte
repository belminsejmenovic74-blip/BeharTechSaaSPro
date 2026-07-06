<script lang="ts">
	import { ChevronDown, ChevronUp, Trash2, Eye, EyeOff } from 'lucide-svelte';

	export let title = '';
	export let visible = true;
	export let canUp = true;
	export let canDown = true;
	export let onUp: () => void = () => {};
	export let onDown: () => void = () => {};
	export let onRemove: () => void = () => {};
	export let onToggle: () => void = () => {};
</script>

<div
	class="rounded-xl border border-slate-200 bg-white p-4 {visible ? '' : 'opacity-60'}"
>
	<div class="mb-3 flex items-center justify-between gap-2">
		<span class="truncate text-sm font-semibold text-slate-700">{title}</span>
		<div class="flex shrink-0 items-center gap-1">
			<button type="button" title="Visible / masqué" on:click={onToggle} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
				{#if visible}<Eye class="size-4" />{:else}<EyeOff class="size-4" />{/if}
			</button>
			<button type="button" title="Monter" disabled={!canUp} on:click={onUp} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
				<ChevronUp class="size-4" />
			</button>
			<button type="button" title="Descendre" disabled={!canDown} on:click={onDown} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
				<ChevronDown class="size-4" />
			</button>
			<button type="button" title="Supprimer" on:click={onRemove} class="rounded-md p-1.5 text-red-500 hover:bg-red-50">
				<Trash2 class="size-4" />
			</button>
		</div>
	</div>
	<div class="grid gap-3">
		<slot />
	</div>
</div>
