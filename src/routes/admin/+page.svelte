<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import {
		Palette, LayoutList, PanelTop, Sparkles, BarChart3, LayoutGrid, Puzzle,
		CreditCard, PanelBottom, Search, ExternalLink, RotateCcw, Save, LogOut, Download
	} from 'lucide-svelte';
	import type { SiteContent } from '$lib/cms/types';
	import { DEFAULT_CONTENT } from '$lib/cms/default-content';
	import { clearLocalContent, loadLocalContent, saveLocalContent, setAuthed } from '$lib/cms/local';

	import AdminThemeEditor from '$lib/components/admin/editors/AdminThemeEditor.svelte';
	import AdminSectionsEditor from '$lib/components/admin/editors/AdminSectionsEditor.svelte';
	import AdminHeaderEditor from '$lib/components/admin/editors/AdminHeaderEditor.svelte';
	import AdminHeroEditor from '$lib/components/admin/editors/AdminHeroEditor.svelte';
	import AdminStatsEditor from '$lib/components/admin/editors/AdminStatsEditor.svelte';
	import AdminShowcaseEditor from '$lib/components/admin/editors/AdminShowcaseEditor.svelte';
	import AdminIntegrationsEditor from '$lib/components/admin/editors/AdminIntegrationsEditor.svelte';
	import AdminPricingEditor from '$lib/components/admin/editors/AdminPricingEditor.svelte';
	import AdminFooterEditor from '$lib/components/admin/editors/AdminFooterEditor.svelte';
	import AdminSeoEditor from '$lib/components/admin/editors/AdminSeoEditor.svelte';
	import LivePreview from './LivePreview.svelte';

	export let data: { content: SiteContent };

	let content: SiteContent = loadLocalContent(data.content);
	const preview = writable<SiteContent>(content);
	// Chaque édition rafraîchit l'aperçu live (nouvelle réf top → réactivité).
	const touch = () => preview.set({ ...content });

	const MEDIA = [
		'/imgs/mockup-dashboard.png', '/imgs/mockup-comptoir.png', '/imgs/mockup-a-mobile.png',
		'/imgs/mockup-a-atelier.png', '/imgs/mockup-b-ocr.png', '/imgs/mockup-b-rachat.png',
		'/imgs/mockup-b-suivi.png', '/imgs/mockup-b-widget.png', '/imgs/mockup-c-suivi.png',
		'/imgs/mockup-c-recond.png', '/imgs/mockup-c-sms.png', '/imgs/mockup-c-avis.png',
		'/imgs/amazon-logo.png', '/imgs/beevo-sms-logo.png', '/imgs/beevo-email-logo.png',
		'/imgs/label-quali-repar-logo.png', '/imgs/stripe-logo.png', '/imgs/sumup-logo.png'
	];

	const groups = [
		{ id: 'apparence', label: 'Apparence', icon: Palette },
		{ id: 'sections', label: 'Sections', icon: LayoutList },
		{ id: 'header', label: 'En-tête', icon: PanelTop },
		{ id: 'hero', label: 'Hero', icon: Sparkles },
		{ id: 'stats', label: 'Chiffres', icon: BarChart3 },
		{ id: 'showcaseA', label: 'Écrans boutique', icon: LayoutGrid },
		{ id: 'showcaseB', label: 'Services', icon: LayoutGrid },
		{ id: 'showcaseC', label: 'Clients', icon: LayoutGrid },
		{ id: 'integrations', label: 'Intégrations', icon: Puzzle },
		{ id: 'pricing', label: 'Tarifs', icon: CreditCard },
		{ id: 'footer', label: 'Pied de page', icon: PanelBottom },
		{ id: 'seo', label: 'SEO', icon: Search }
	] as const;

	let tab: string = 'apparence';

	function save() {
		saveLocalContent(content);
		toast.success('Enregistré — visible sur le site dans ce navigateur');
	}
	function exportJson() {
		const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'site-content.json';
		a.click();
		URL.revokeObjectURL(a.href);
		toast.success('site-content.json exporté — committe-le pour la prod');
	}
	function reset() {
		if (!confirm('Réinitialiser tout le contenu sur la DA Behar Tech Pro ?')) return;
		content = structuredClone(DEFAULT_CONTENT);
		clearLocalContent();
		preview.set({ ...content });
		toast.success('Contenu réinitialisé');
	}
	function logout() {
		setAuthed(false);
		goto('/admin/login');
	}
</script>

<svelte:head><title>Admin · Behar Tech Pro</title></svelte:head>

<div class="flex h-screen flex-col">
	<!-- Topbar -->
	<header class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
		<div class="flex items-center gap-2 font-semibold">
			<span class="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-xs text-white">BT</span>
			Behar CMS
		</div>
		<div class="flex items-center gap-2">
			<a href="/" target="_blank" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
				<ExternalLink class="size-4" /> <span class="hidden sm:inline">Voir le site</span>
			</a>
			<button type="button" on:click={exportJson} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
				<Download class="size-4" /> <span class="hidden sm:inline">Exporter JSON</span>
			</button>
			<button type="button" on:click={reset} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
				<RotateCcw class="size-4" /> <span class="hidden sm:inline">Réinitialiser</span>
			</button>
			<button type="button" on:click={save} class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
				<Save class="size-4" /> Enregistrer
			</button>
			<button type="button" on:click={logout} title="Déconnexion" class="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50">
				<LogOut class="size-4" />
			</button>
		</div>
	</header>

	<div class="flex min-h-0 flex-1">
		<!-- Sidebar -->
		<aside class="hidden w-48 shrink-0 overflow-auto border-r border-slate-200 bg-white p-3 md:block">
			{#each groups as g}
				<button type="button" on:click={() => (tab = g.id)}
					class="mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition {tab === g.id ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}">
					<svelte:component this={g.icon} class="size-4" /> {g.label}
				</button>
			{/each}
		</aside>

		<!-- Éditeur -->
		<main class="w-full overflow-auto p-5 lg:w-[440px] lg:shrink-0" on:input={touch} on:change={touch} on:click={touch}>
			<select bind:value={tab} class="mb-4 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm md:hidden">
				{#each groups as g}<option value={g.id}>{g.label}</option>{/each}
			</select>
			{#if tab === 'apparence'}<AdminThemeEditor bind:theme={content.theme} />
			{:else if tab === 'sections'}<AdminSectionsEditor bind:sections={content.sections} />
			{:else if tab === 'header'}<AdminHeaderEditor bind:header={content.header} />
			{:else if tab === 'hero'}<AdminHeroEditor bind:hero={content.hero} media={MEDIA} />
			{:else if tab === 'stats'}<AdminStatsEditor bind:stats={content.stats} />
			{:else if tab === 'showcaseA'}<AdminShowcaseEditor bind:showcase={content.showcases.A} media={MEDIA} />
			{:else if tab === 'showcaseB'}<AdminShowcaseEditor bind:showcase={content.showcases.B} media={MEDIA} />
			{:else if tab === 'showcaseC'}<AdminShowcaseEditor bind:showcase={content.showcases.C} media={MEDIA} />
			{:else if tab === 'integrations'}<AdminIntegrationsEditor bind:integrations={content.integrations} media={MEDIA} />
			{:else if tab === 'pricing'}<AdminPricingEditor bind:pricing={content.pricing} />
			{:else if tab === 'footer'}<AdminFooterEditor bind:footer={content.footer} />
			{:else if tab === 'seo'}<AdminSeoEditor bind:seo={content.seo} media={MEDIA} />
			{/if}
		</main>

		<!-- Aperçu live -->
		<section class="hidden flex-1 flex-col bg-slate-100 p-4 lg:flex">
			<div class="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
				<span class="size-2 rounded-full bg-emerald-500"></span>
				Aperçu live — clique une zone du site pour l’éditer
			</div>
			<div class="min-h-0 flex-1">
				<LivePreview content={preview} activeTab={tab} onSelect={(t) => (tab = t)} />
			</div>
		</section>
	</div>
</div>
