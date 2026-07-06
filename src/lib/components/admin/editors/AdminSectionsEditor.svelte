<script lang="ts">
	import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-svelte';
	import type { SectionRef } from '$lib/cms/types';

	export let sections: SectionRef[];

	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= sections.length) return;
		[sections[i], sections[j]] = [sections[j], sections[i]];
		sections = sections;
	}
</script>

<p class="mb-4 text-sm text-slate-500">
	Glissez l’ordre avec les flèches et masquez les sections que vous ne voulez pas afficher.
	Le Hero et le pied de page restent en place.
</p>

<div class="flex flex-col gap-2">
	{#each sections as section, i (section.id)}
		<div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 {section.visible ? '' : 'opacity-60'}">
			<div class="flex items-center gap-3">
				<span class="flex size-6 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500">{i + 1}</span>
				<span class="text-sm font-medium text-slate-700">{section.label}</span>
			</div>
			<div class="flex items-center gap-1">
				<button type="button" title="Visible / masqué" on:click={() => (section.visible = !section.visible)} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
					{#if section.visible}<Eye class="size-4" />{:else}<EyeOff class="size-4" />{/if}
				</button>
				<button type="button" title="Monter" disabled={i === 0} on:click={() => move(i, -1)} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
					<ChevronUp class="size-4" />
				</button>
				<button type="button" title="Descendre" disabled={i === sections.length - 1} on:click={() => move(i, 1)} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
					<ChevronDown class="size-4" />
				</button>
			</div>
		</div>
	{/each}
</div>
