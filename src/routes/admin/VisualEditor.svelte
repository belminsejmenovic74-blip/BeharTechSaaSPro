<script lang="ts">
	import { setContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { LocalDbSchema, PageSection } from '$lib/cms/types';
	import { themeToCssVars } from '$lib/cms/theme';
	import SectionRenderer from '$lib/components/landing/SectionRenderer.svelte';
	import FloatingToolbar from '$lib/components/admin/cms/FloatingToolbar.svelte';
	import Header from '$lib/layout/Header.svelte';
	import Footer from '$lib/layout/Footer.svelte';
	import { Plus } from 'lucide-svelte';

	export let db: Writable<LocalDbSchema>;
	export let activeSectionId: string | null = null;
	export let onSelect: (id: string | null) => void;
	export let onMoveUp: (id: string) => void;
	export let onMoveDown: (id: string) => void;
	export let onDuplicate: (id: string) => void;
	export let onDelete: (id: string) => void;
	export let onAddSection: () => void;

	// Pour compatibilité avec les composants qui font getCms()
	// On simule un store SiteContent basique
	import { derived } from 'svelte/store';
	import { DEFAULT_CONTENT } from '$lib/cms/default-content';

	const mockCmsStore = derived(db, ($db) => {
		let content = structuredClone(DEFAULT_CONTENT);
		content.theme = $db.theme;
		// On pourrait réhydrater hero, stats etc. depuis page_sections
		// mais SectionRenderer va passer les props directement
		return content;
	});
	setContext('cms', mockCmsStore);

	$: themeVars = themeToCssVars($db.theme);

	let paneWidth = 900;
	const DESIGN = 1280;
	$: scale = Math.min(1, paneWidth / DESIGN);

	$: sections = $db.page_sections.sort((a, b) => a.order - b.order);
</script>

<div class="flex h-full flex-col bg-slate-50" on:click={() => onSelect(null)}>
	<div class="flex-1 overflow-auto p-4 md:p-8" bind:clientWidth={paneWidth}>
		<div
			class="mx-auto overflow-hidden rounded-xl shadow-2xl transition-all"
			style="{themeVars}; width:{DESIGN}px; transform:scale({scale}); transform-origin:top center; background:var(--bt-bg);"
		>
			<!-- Header Statique (pour la démo) -->
			<div class="pointer-events-none opacity-50">
				<Header />
			</div>

			<!-- Dynamic Sections -->
			{#each sections as section, i (section.id)}
				{#if section.settings.visible}
					<div
						class="group relative cursor-pointer border-y-2 border-transparent transition-all hover:border-teal-300 {activeSectionId ===
						section.id
							? 'z-10 !border-teal-500'
							: ''}"
						on:click|stopPropagation={() => onSelect(section.id)}
					>
						{#if activeSectionId === section.id}
							<FloatingToolbar
								isFirst={i === 0}
								isLast={i === sections.length - 1}
								onEdit={() => onSelect(section.id)}
								onMoveUp={() => onMoveUp(section.id)}
								onMoveDown={() => onMoveDown(section.id)}
								onDuplicate={() => onDuplicate(section.id)}
								onDelete={() => onDelete(section.id)}
							/>
						{/if}

						<!-- Rendu du bloc avec un calque pour intercepter le clic et éviter la navigation -->
						<div class="pointer-events-none">
							<SectionRenderer {section} />
						</div>
					</div>
				{/if}
			{/each}

			<!-- Bouton Ajouter -->
			<div class="flex items-center justify-center bg-slate-50/50 p-8">
				<button
					type="button"
					class="flex items-center gap-2 rounded-full border border-teal-100 bg-white px-6 py-3 text-sm font-medium text-teal-600 shadow-sm transition-all hover:bg-teal-50 hover:shadow-md"
					on:click|stopPropagation={onAddSection}
				>
					<Plus class="size-4" /> Ajouter une section
				</button>
			</div>

			<!-- Footer Statique -->
			<div class="pointer-events-none opacity-50">
				<Footer />
			</div>
		</div>
	</div>
</div>
