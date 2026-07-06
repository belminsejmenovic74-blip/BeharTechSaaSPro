<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import type { IntegrationsContent } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';
	import Area from '../Area.svelte';
	import CardShell from '../CardShell.svelte';
	import MediaPicker from '../MediaPicker.svelte';

	export let integrations: IntegrationsContent;
	export let media: string[] = [];

	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= integrations.items.length) return;
		[integrations.items[i], integrations.items[j]] = [integrations.items[j], integrations.items[i]];
		integrations.items = integrations.items;
	}
	function add() {
		integrations.items = [
			...integrations.items,
			{ id: `int-${Date.now()}`, name: 'Nouvelle intégration', desc: 'Description', logo: '', visible: true }
		];
	}
</script>

<div class="grid gap-4">
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Sur-titre (kicker)"><Txt bind:value={integrations.kicker} /></Field>
		<Field label="Titre — partie forte"><Txt bind:value={integrations.titleStrong} /></Field>
		<Field label="Titre — partie grise"><Txt bind:value={integrations.titleMuted} /></Field>
	</div>
	<Field label="Sous-titre"><Area bind:value={integrations.subtitle} rows={2} /></Field>

	<div class="mt-2 grid gap-3">
		{#each integrations.items as item, i (item.id)}
			<CardShell
				title={item.name}
				bind:visible={item.visible}
				canUp={i > 0}
				canDown={i < integrations.items.length - 1}
				onUp={() => move(i, -1)}
				onDown={() => move(i, 1)}
				onToggle={() => (item.visible = !item.visible)}
				onRemove={() => (integrations.items = integrations.items.filter((_, j) => j !== i))}
			>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label="Nom"><Txt bind:value={item.name} /></Field>
					<Field label="Description"><Txt bind:value={item.desc} /></Field>
				</div>
				<Field label="Logo"><MediaPicker bind:value={item.logo} {media} /></Field>
			</CardShell>
		{/each}
	</div>

	<button type="button" on:click={add} class="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">
		<Plus class="size-4" /> Ajouter une intégration
	</button>
</div>
