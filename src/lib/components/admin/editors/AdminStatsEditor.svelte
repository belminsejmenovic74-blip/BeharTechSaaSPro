<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import type { StatsContent } from '$lib/cms/types';
	import { ICON_NAMES } from '$lib/cms/icons';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';
	import CardShell from '../CardShell.svelte';

	export let stats: StatsContent;

	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= stats.items.length) return;
		[stats.items[i], stats.items[j]] = [stats.items[j], stats.items[i]];
		stats.items = stats.items;
	}
	function add() {
		stats.items = [
			...stats.items,
			{ id: `st-${Date.now()}`, value: 'Nouveau', label: 'Description', visible: true }
		];
	}
</script>

<div class="grid gap-4">
	<Field label="Sur-titre (kicker)"><Txt bind:value={stats.kicker} /></Field>
	<Field label="Sous-titre"><Txt bind:value={stats.subtitle} /></Field>

	<div class="mt-2 grid gap-3">
		{#each stats.items as item, i (item.id)}
			<CardShell
				title={item.value}
				bind:visible={item.visible}
				canUp={i > 0}
				canDown={i < stats.items.length - 1}
				onUp={() => move(i, -1)}
				onDown={() => move(i, 1)}
				onToggle={() => (item.visible = !item.visible)}
				onRemove={() => (stats.items = stats.items.filter((_, j) => j !== i))}
			>
				<div class="grid gap-3 sm:grid-cols-3">
					<Field label="Valeur"><Txt bind:value={item.value} /></Field>
					<Field label="Libellé"><Txt bind:value={item.label} /></Field>
					<Field label="Icône">
						<select bind:value={item.icon} class="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
							<option value={undefined}>— aucune —</option>
							<option value="google">google (logo)</option>
							{#each ICON_NAMES as name}<option value={name}>{name}</option>{/each}
						</select>
					</Field>
				</div>
			</CardShell>
		{/each}
	</div>

	<button type="button" on:click={add} class="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">
		<Plus class="size-4" /> Ajouter un chiffre
	</button>
</div>
