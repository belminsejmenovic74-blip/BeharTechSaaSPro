<script lang="ts">
	import { Plus, X } from 'lucide-svelte';
	import type { FooterContent } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';

	export let footer: FooterContent;
</script>

<div class="grid gap-5">
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Marque"><Txt bind:value={footer.brand} /></Field>
		<Field label="Copyright"><Txt bind:value={footer.copyright} /></Field>
	</div>
	<Field label="Accroche"><Txt bind:value={footer.tagline} /></Field>
	<div class="grid gap-4 sm:grid-cols-3">
		<Field label="Titre newsletter"><Txt bind:value={footer.newsletterTitle} /></Field>
		<Field label="Placeholder e-mail"><Txt bind:value={footer.newsletterPlaceholder} /></Field>
		<Field label="Bouton newsletter"><Txt bind:value={footer.newsletterButton} /></Field>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		{#each footer.columns as col, ci}
			<div class="rounded-xl border border-slate-200 bg-white p-3">
				<input bind:value={col.label} class="mb-2 h-8 w-full rounded-md border border-slate-300 px-2 text-sm font-semibold outline-none focus:border-emerald-500" />
				<div class="flex flex-col gap-2">
					{#each col.items as _, ii}
						<div class="flex items-center gap-1.5">
							<input bind:value={col.items[ii].label} placeholder="Libellé" class="h-8 w-1/2 rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-emerald-500" />
							<input bind:value={col.items[ii].href} placeholder="/lien" class="h-8 w-1/2 rounded-md border border-slate-300 px-2 font-mono text-[11px] outline-none focus:border-emerald-500" />
							<button type="button" on:click={() => (col.items = col.items.filter((_, j) => j !== ii))} class="rounded p-1 text-red-500 hover:bg-red-50"><X class="size-3.5" /></button>
						</div>
					{/each}
					<button type="button" on:click={() => (col.items = [...col.items, { label: 'Lien', href: '/' }])} class="inline-flex w-fit items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50">
						<Plus class="size-3" /> Lien
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>
