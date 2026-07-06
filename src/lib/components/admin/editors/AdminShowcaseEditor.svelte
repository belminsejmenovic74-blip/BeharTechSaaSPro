<script lang="ts">
	import { Plus, X } from 'lucide-svelte';
	import type { ShowcaseContent } from '$lib/cms/types';
	import { ICON_NAMES } from '$lib/cms/icons';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';
	import Area from '../Area.svelte';
	import Toggle from '../Toggle.svelte';
	import CardShell from '../CardShell.svelte';
	import StringList from '../StringList.svelte';
	import MediaPicker from '../MediaPicker.svelte';

	export let showcase: ShowcaseContent;
	export let media: string[] = [];

	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= showcase.slides.length) return;
		[showcase.slides[i], showcase.slides[j]] = [showcase.slides[j], showcase.slides[i]];
		showcase.slides = showcase.slides;
	}
	function addSlide() {
		showcase.slides = [
			...showcase.slides,
			{
				id: `slide-${Date.now()}`,
				tab: 'Nouvel onglet',
				tabIcon: '',
				img: '',
				device: false,
				portrait: false,
				bullets: [],
				visible: true,
				cards: []
			}
		];
	}
</script>

<div class="grid gap-4">
	<Field label="Titre (une ligne par saut)"><StringList bind:items={showcase.titleLines} addLabel="Ajouter une ligne" /></Field>
	{#if showcase.layout === 'screen'}
		<Field label="Sous-titre"><Area bind:value={showcase.subtitle} rows={2} /></Field>
	{:else}
		<Field label="Sous-titre accent (teal)"><Txt bind:value={showcase.subtitleTeal} /></Field>
		<Field label="Description"><Area bind:value={showcase.description} rows={2} /></Field>
	{/if}
	<Field label="Titre de la colonne d’avantages (gauche)" hint="Laisser vide pour utiliser le titre de l’onglet"><Txt bind:value={showcase.sideTitle} /></Field>

	<div class="mt-2 grid gap-3">
		{#each showcase.slides as slide, i (slide.id)}
			<CardShell
				title={slide.tab}
				bind:visible={slide.visible}
				canUp={i > 0}
				canDown={i < showcase.slides.length - 1}
				onUp={() => move(i, -1)}
				onDown={() => move(i, 1)}
				onToggle={() => (slide.visible = !slide.visible)}
				onRemove={() => (showcase.slides = showcase.slides.filter((_, j) => j !== i))}
			>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label="Onglet"><Txt bind:value={slide.tab} /></Field>
					{#if showcase.tabStyle === 'filled'}
						<Field label="Icône onglet">
							<select bind:value={slide.tabIcon} class="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
								<option value="">— aucune —</option>
								{#each ICON_NAMES as name}<option value={name}>{name}</option>{/each}
							</select>
						</Field>
					{/if}
				</div>
				<Field label="Image / mockup"><MediaPicker bind:value={slide.img} {media} /></Field>
				<div class="flex flex-wrap gap-6">
					<Field label="Appareil détouré (flotte + ombre)"><Toggle bind:checked={slide.device} label={slide.device ? 'Oui' : 'Non'} /></Field>
					<Field label="Portrait"><Toggle bind:checked={slide.portrait} label={slide.portrait ? 'Oui' : 'Non'} /></Field>
				</div>
				<Field label="Avantages (liste de gauche)"><StringList bind:items={slide.bullets} addLabel="Ajouter un avantage" /></Field>

				{#if showcase.layout === 'phone'}
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
						<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cartes flottantes</div>
						<div class="flex flex-col gap-2">
							{#each slide.cards ?? [] as card, ci}
								<div class="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
									<select bind:value={card.icon} class="h-8 w-28 shrink-0 rounded-md border border-slate-300 bg-white px-1 text-xs">
										{#each ICON_NAMES as name}<option value={name}>{name}</option>{/each}
									</select>
									<div class="flex flex-1 flex-col gap-1">
										<input bind:value={card.title} placeholder="Titre" class="h-8 w-full rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-emerald-500" />
										<input bind:value={card.text} placeholder="Texte" class="h-8 w-full rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-emerald-500" />
									</div>
									<button type="button" on:click={() => (slide.cards = (slide.cards ?? []).filter((_, j) => j !== ci))} class="rounded-md p-1.5 text-red-500 hover:bg-red-50"><X class="size-4" /></button>
								</div>
							{/each}
							<button type="button" on:click={() => (slide.cards = [...(slide.cards ?? []), { id: `card-${Date.now()}`, icon: 'check', title: 'Titre', text: 'Texte', visible: true }])} class="inline-flex w-fit items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50">
								<Plus class="size-3.5" /> Ajouter une carte
							</button>
						</div>
					</div>
				{/if}
			</CardShell>
		{/each}
	</div>

	<button type="button" on:click={addSlide} class="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">
		<Plus class="size-4" /> Ajouter un écran
	</button>
</div>
