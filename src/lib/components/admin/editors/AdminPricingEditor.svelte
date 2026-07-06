<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import type { PricingContent } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';
	import Area from '../Area.svelte';
	import Toggle from '../Toggle.svelte';
	import CardShell from '../CardShell.svelte';
	import StringList from '../StringList.svelte';

	export let pricing: PricingContent;

	// Prix affichés/édités en euros (le stockage reste en centimes).
	function euro(cents: number) {
		return Math.round(cents / 100);
	}
	function setEuro(plan: PricingContent['plans'][number], key: 'monthlyPrice' | 'yearlyPrice', v: number) {
		plan[key] = Math.round((v || 0) * 100);
		pricing = pricing;
	}

	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= pricing.plans.length) return;
		[pricing.plans[i], pricing.plans[j]] = [pricing.plans[j], pricing.plans[i]];
		pricing.plans = pricing.plans;
	}
	function add() {
		pricing.plans = [
			...pricing.plans,
			{
				id: `price_${Date.now()}`,
				name: 'Nouveau plan',
				description: '',
				buttonText: 'Choisir',
				buttonHref: '/dashboard',
				features: [],
				monthlyPrice: 0,
				yearlyPrice: 0,
				isMostPopular: false,
				visible: true
			}
		];
	}
</script>

<div class="grid gap-4">
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Sur-titre"><Txt bind:value={pricing.kicker} /></Field>
		<Field label="Badge économie (ex. 2 MOIS OFFERTS)"><Txt bind:value={pricing.intervalNote} /></Field>
	</div>
	<Field label="Titre"><Txt bind:value={pricing.title} /></Field>
	<Field label="Sous-titre"><Txt bind:value={pricing.subtitle} /></Field>

	<div class="mt-2 grid gap-3">
		{#each pricing.plans as plan, i (plan.id)}
			<CardShell
				title={plan.name}
				bind:visible={plan.visible}
				canUp={i > 0}
				canDown={i < pricing.plans.length - 1}
				onUp={() => move(i, -1)}
				onDown={() => move(i, 1)}
				onToggle={() => (plan.visible = !plan.visible)}
				onRemove={() => (pricing.plans = pricing.plans.filter((_, j) => j !== i))}
			>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label="Nom"><Txt bind:value={plan.name} /></Field>
					<Field label="Badge « populaire »">
						<Toggle bind:checked={plan.isMostPopular} label={plan.isMostPopular ? 'Recommandé' : 'Standard'} />
					</Field>
				</div>
				<Field label="Description"><Txt bind:value={plan.description} /></Field>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label="Prix / mois (€)">
						<input type="number" min="0" value={euro(plan.monthlyPrice)} on:input={(e) => setEuro(plan, 'monthlyPrice', +e.currentTarget.value)} class="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
					</Field>
					<Field label="Prix / an (€)">
						<input type="number" min="0" value={euro(plan.yearlyPrice)} on:input={(e) => setEuro(plan, 'yearlyPrice', +e.currentTarget.value)} class="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
					</Field>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label="Libellé bouton"><Txt bind:value={plan.buttonText} /></Field>
					<Field label="Lien bouton"><Txt bind:value={plan.buttonHref} /></Field>
				</div>
				<Field label="Fonctionnalités"><StringList bind:items={plan.features} addLabel="Ajouter une ligne" /></Field>
			</CardShell>
		{/each}
	</div>

	<button type="button" on:click={add} class="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">
		<Plus class="size-4" /> Ajouter un plan
	</button>

	<div class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
		<div class="mb-3 flex items-center justify-between">
			<span class="text-sm font-semibold text-slate-700">Encart « Setup Atelier »</span>
			<Toggle bind:checked={pricing.setup.visible} label={pricing.setup.visible ? 'Affiché' : 'Masqué'} />
		</div>
		<div class="grid gap-3">
			<div class="grid gap-3 sm:grid-cols-2">
				<Field label="Nom"><Txt bind:value={pricing.setup.name} /></Field>
				<Field label="Prix (libre)"><Txt bind:value={pricing.setup.price} /></Field>
			</div>
			<Field label="Description"><Txt bind:value={pricing.setup.description} /></Field>
			<div class="grid gap-3 sm:grid-cols-2">
				<Field label="Note (ex. paiement unique)"><Txt bind:value={pricing.setup.note} /></Field>
				<Field label="Libellé bouton"><Txt bind:value={pricing.setup.buttonText} /></Field>
			</div>
			<Field label="Lien bouton"><Txt bind:value={pricing.setup.buttonHref} /></Field>
			<Field label="Points inclus"><StringList bind:items={pricing.setup.features} addLabel="Ajouter un point" /></Field>
		</div>
	</div>
</div>
