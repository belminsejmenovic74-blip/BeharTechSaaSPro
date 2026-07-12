<script lang="ts">
	import { ArrowUp, ArrowDown, Copy, Trash2, Settings } from 'lucide-svelte';

	export let onMoveUp: () => void;
	export let onMoveDown: () => void;
	export let onDuplicate: () => void;
	export let onDelete: () => void;
	export let onEdit: () => void;
	export let isFirst: boolean = false;
	export let isLast: boolean = false;
</script>

<!-- Toolbar rendue visible uniquement si la section a class="group" ou activée manuellement.
Ici on s'assure qu'elle flotte au-dessus du bloc cliqué -->
<div
	class="absolute right-4 top-4 z-50 flex items-center gap-1 rounded-lg border border-teal-100 bg-white/95 p-1 shadow-sm backdrop-blur-md"
	on:click|stopPropagation
>
	<button
		type="button"
		class="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
		on:click={onEdit}
		title="Modifier"
	>
		<Settings class="size-4" />
	</button>
	<div class="h-4 w-px bg-slate-200"></div>
	<button
		type="button"
		class="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
		on:click={onMoveUp}
		disabled={isFirst}
		title="Déplacer vers le haut"
	>
		<ArrowUp class="size-4" />
	</button>
	<button
		type="button"
		class="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
		on:click={onMoveDown}
		disabled={isLast}
		title="Déplacer vers le bas"
	>
		<ArrowDown class="size-4" />
	</button>
	<div class="h-4 w-px bg-slate-200"></div>
	<button
		type="button"
		class="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
		on:click={onDuplicate}
		title="Dupliquer"
	>
		<Copy class="size-4" />
	</button>
	<button
		type="button"
		class="flex size-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-600"
		on:click={onDelete}
		title="Supprimer"
	>
		<Trash2 class="size-4" />
	</button>
</div>
