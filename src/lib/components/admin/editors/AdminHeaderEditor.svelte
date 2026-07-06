<script lang="ts">
	import { Plus, X } from 'lucide-svelte';
	import type { HeaderContent } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';

	export let header: HeaderContent;
</script>

<div class="grid gap-5">
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Marque"><Txt bind:value={header.brand} /></Field>
		<Field label="Badge"><Txt bind:value={header.badge} /></Field>
		<Field label="Libellé connexion"><Txt bind:value={header.loginLabel} /></Field>
		<Field label="Lien connexion"><Txt bind:value={header.loginHref} /></Field>
		<Field label="Libellé bouton CTA"><Txt bind:value={header.ctaLabel} /></Field>
		<Field label="Lien bouton CTA"><Txt bind:value={header.ctaHref} /></Field>
	</div>

	<div>
		<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Liens de navigation</div>
		<div class="flex flex-col gap-2">
			{#each header.nav as _, i}
				<div class="flex items-center gap-2">
					<input bind:value={header.nav[i].label} placeholder="Libellé" class="h-9 w-1/2 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
					<input bind:value={header.nav[i].href} placeholder="#ancre ou /lien" class="h-9 w-1/2 rounded-lg border border-slate-300 px-3 font-mono text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
					<button type="button" on:click={() => (header.nav = header.nav.filter((_, j) => j !== i))} class="rounded-md p-1.5 text-red-500 hover:bg-red-50"><X class="size-4" /></button>
				</div>
			{/each}
			<button type="button" on:click={() => (header.nav = [...header.nav, { label: 'Nouveau', href: '#' }])} class="inline-flex w-fit items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50">
				<Plus class="size-3.5" /> Ajouter un lien
			</button>
		</div>
	</div>
</div>
