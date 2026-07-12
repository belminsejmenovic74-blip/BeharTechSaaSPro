<script lang="ts">
	import { X } from 'lucide-svelte';
	import type { PageSection } from '$lib/cms/types';

	// Éditeurs existants
	import AdminHeaderEditor from '$lib/components/admin/editors/AdminHeaderEditor.svelte';
	import AdminHeroEditor from '$lib/components/admin/editors/AdminHeroEditor.svelte';
	import AdminStatsEditor from '$lib/components/admin/editors/AdminStatsEditor.svelte';
	import AdminShowcaseEditor from '$lib/components/admin/editors/AdminShowcaseEditor.svelte';
	import AdminIntegrationsEditor from '$lib/components/admin/editors/AdminIntegrationsEditor.svelte';
	import AdminPricingEditor from '$lib/components/admin/editors/AdminPricingEditor.svelte';
	import AdminFooterEditor from '$lib/components/admin/editors/AdminFooterEditor.svelte';
	import AdminThemeEditor from '$lib/components/admin/editors/AdminThemeEditor.svelte';
	import type { Theme } from '$lib/cms/types';

	export let section: PageSection | null;
	export let theme: Theme | null = null; // Si aucun section n'est sélectionnée, on peut éditer le thème global
	export let onClose: () => void;
	export let onChange: () => void; // Appelé quand le contenu change
	export let media: string[] = [];

	let tab: 'content' | 'style' | 'advanced' | 'seo' = 'content';
</script>

<div
	class="z-40 flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl md:w-96"
>
	{#if section}
		<!-- Header de Section -->
		<div class="flex items-center justify-between border-b border-slate-100 p-4">
			<div>
				<h3 class="font-medium capitalize text-slate-900">
					{section.type.replace('showcase', 'Showcase ')}
				</h3>
				<p class="text-xs text-slate-500">Modification de la section</p>
			</div>
			<button class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" on:click={onClose}>
				<X class="size-4" />
			</button>
		</div>

		<!-- Onglets -->
		<div class="flex border-b border-slate-100">
			<button
				class="flex-1 py-3 text-xs font-medium {tab === 'content'
					? 'border-b-2 border-teal-500 text-teal-600'
					: 'text-slate-500 hover:text-slate-700'}"
				on:click={() => (tab = 'content')}>Contenu</button
			>
			<button
				class="flex-1 py-3 text-xs font-medium {tab === 'style'
					? 'border-b-2 border-teal-500 text-teal-600'
					: 'text-slate-500 hover:text-slate-700'}"
				on:click={() => (tab = 'style')}>Style</button
			>
			<button
				class="flex-1 py-3 text-xs font-medium {tab === 'advanced'
					? 'border-b-2 border-teal-500 text-teal-600'
					: 'text-slate-500 hover:text-slate-700'}"
				on:click={() => (tab = 'advanced')}>Avancé</button
			>
		</div>

		<!-- Contenu d'édition -->
		<div
			class="flex-1 overflow-auto p-5"
			on:input={onChange}
			on:change={onChange}
			on:click={onChange}
		>
			{#if tab === 'content'}
				{#if section.type === 'header'}
					<AdminHeaderEditor bind:header={section.content} />
				{:else if section.type === 'hero'}
					<AdminHeroEditor bind:hero={section.content} {media} />
				{:else if section.type === 'stats'}
					<AdminStatsEditor bind:stats={section.content} />
				{:else if section.type.startsWith('showcase')}
					<AdminShowcaseEditor bind:showcase={section.content} {media} />
				{:else if section.type === 'integrations'}
					<AdminIntegrationsEditor bind:integrations={section.content} {media} />
				{:else if section.type === 'pricing'}
					<AdminPricingEditor bind:pricing={section.content} />
				{:else if section.type === 'footer'}
					<AdminFooterEditor bind:footer={section.content} />
				{:else}
					<div class="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
						Éditeur non disponible pour ce type ({section.type}).
					</div>
				{/if}
			{:else if tab === 'style'}
				<div class="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
					Les options de style locales arriveront bientôt. Actuellement pilotées par le thème
					global.
				</div>
			{:else if tab === 'advanced'}
				<div class="space-y-4">
					<label class="flex items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							bind:checked={section.settings.visible}
							on:change={onChange}
							class="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
						/>
						Section visible sur le site public
					</label>
				</div>
			{/if}
		</div>
	{:else if theme}
		<!-- Header Thème -->
		<div class="flex items-center justify-between border-b border-slate-100 p-4">
			<div>
				<h3 class="font-medium text-slate-900">Design Global</h3>
				<p class="text-xs text-slate-500">Apparence du site</p>
			</div>
			<button class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" on:click={onClose}>
				<X class="size-4" />
			</button>
		</div>
		<div class="flex-1 overflow-auto p-5" on:input={onChange} on:change={onChange}>
			<AdminThemeEditor bind:theme />
		</div>
	{:else}
		<!-- État vide -->
		<div class="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
			<div class="mb-4 rounded-full bg-slate-50 p-4">
				<svg class="size-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
					/>
				</svg>
			</div>
			<p class="text-sm font-medium text-slate-900">Rien n'est sélectionné</p>
			<p class="mt-1 text-xs text-slate-500">
				Cliquez sur une section dans la zone de prévisualisation pour la modifier.
			</p>
		</div>
	{/if}
</div>
