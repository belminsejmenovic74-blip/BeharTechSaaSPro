<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		Palette,
		LayoutList,
		PanelTop,
		Sparkles,
		BarChart3,
		LayoutGrid,
		Puzzle,
		CreditCard,
		PanelBottom,
		Search,
		Images,
		ExternalLink,
		RotateCcw,
		Save,
		LogOut,
		UploadCloud
	} from 'lucide-svelte';
	import type { SiteContent } from '$lib/cms/types';

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

	export let data: { content: SiteContent; media: string[] };

	// Copie de travail éditable (isolée de la donnée serveur).
	let content: SiteContent = structuredClone(data.content);
	let mediaList: string[] = [...data.media];

	let dirty = false;
	let saving = false;
	const markDirty = () => (dirty = true);

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
		{ id: 'seo', label: 'SEO', icon: Search },
		{ id: 'medias', label: 'Médias', icon: Images }
	] as const;

	let tab: (typeof groups)[number]['id'] = 'apparence';

	async function save() {
		saving = true;
		try {
			const res = await fetch('/admin/api/save', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(content)
			});
			if (!res.ok) throw new Error();
			dirty = false;
			toast.success('Modifications enregistrées');
		} catch {
			toast.error('Échec de l’enregistrement');
		} finally {
			saving = false;
		}
	}

	async function reset() {
		if (!confirm('Réinitialiser tout le contenu sur la DA Behar Tech Pro par défaut ?')) return;
		const res = await fetch('/admin/api/reset', { method: 'POST' });
		const json = await res.json();
		if (json.ok) {
			content = structuredClone(json.content);
			dirty = false;
			toast.success('Contenu réinitialisé');
		}
	}

	async function uploadMedia(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const fd = new FormData();
		fd.append('file', file);
		const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
		const json = await res.json();
		if (json.ok) {
			if (!mediaList.includes(json.url)) mediaList = [...mediaList, json.url];
			toast.success('Image importée');
		} else toast.error('Échec de l’import');
		input.value = '';
	}
</script>

<svelte:head><title>Admin · Behar Tech Pro</title></svelte:head>

<div class="flex min-h-screen">
	<!-- Sidebar -->
	<aside class="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
		<div class="flex h-16 items-center gap-2 border-b border-slate-200 px-5 font-semibold">
			<span class="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-xs text-white">BT</span>
			Behar CMS
		</div>
		<nav class="flex-1 overflow-auto p-3">
			{#each groups as g}
				<button
					type="button"
					on:click={() => (tab = g.id)}
					class="mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition {tab === g.id
						? 'bg-emerald-50 font-medium text-emerald-700'
						: 'text-slate-600 hover:bg-slate-50'}"
				>
					<svelte:component this={g.icon} class="size-4" />
					{g.label}
				</button>
			{/each}
		</nav>
	</aside>

	<!-- Main -->
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Topbar -->
		<header class="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-5 backdrop-blur">
			<div class="flex items-center gap-2">
				<!-- Sélecteur mobile -->
				<select bind:value={tab} class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm lg:hidden">
					{#each groups as g}<option value={g.id}>{g.label}</option>{/each}
				</select>
				<span class="hidden text-sm font-medium text-slate-700 lg:block">
					{groups.find((g) => g.id === tab)?.label}
				</span>
				{#if dirty}
					<span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
						<span class="size-1.5 rounded-full bg-amber-500"></span> non enregistré
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<a href="/" target="_blank" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
					<ExternalLink class="size-4" /> <span class="hidden sm:inline">Voir le site</span>
				</a>
				<button type="button" on:click={reset} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
					<RotateCcw class="size-4" /> <span class="hidden sm:inline">Réinitialiser</span>
				</button>
				<button type="button" on:click={save} disabled={saving || !dirty} class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
					<Save class="size-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
				</button>
				<form method="POST" action="?/logout">
					<button type="submit" title="Déconnexion" class="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50">
						<LogOut class="size-4" />
					</button>
				</form>
			</div>
		</header>

		<!-- Editors -->
		<main class="flex-1 overflow-auto p-5 lg:p-8" on:input={markDirty} on:change={markDirty} on:click={markDirty}>
			<div class="mx-auto max-w-3xl">
				{#if tab === 'apparence'}
					<AdminThemeEditor bind:theme={content.theme} />
				{:else if tab === 'sections'}
					<AdminSectionsEditor bind:sections={content.sections} />
				{:else if tab === 'header'}
					<AdminHeaderEditor bind:header={content.header} />
				{:else if tab === 'hero'}
					<AdminHeroEditor bind:hero={content.hero} media={mediaList} />
				{:else if tab === 'stats'}
					<AdminStatsEditor bind:stats={content.stats} />
				{:else if tab === 'showcaseA'}
					<AdminShowcaseEditor bind:showcase={content.showcases.A} media={mediaList} />
				{:else if tab === 'showcaseB'}
					<AdminShowcaseEditor bind:showcase={content.showcases.B} media={mediaList} />
				{:else if tab === 'showcaseC'}
					<AdminShowcaseEditor bind:showcase={content.showcases.C} media={mediaList} />
				{:else if tab === 'integrations'}
					<AdminIntegrationsEditor bind:integrations={content.integrations} media={mediaList} />
				{:else if tab === 'pricing'}
					<AdminPricingEditor bind:pricing={content.pricing} />
				{:else if tab === 'footer'}
					<AdminFooterEditor bind:footer={content.footer} />
				{:else if tab === 'seo'}
					<AdminSeoEditor bind:seo={content.seo} media={mediaList} />
				{:else if tab === 'medias'}
					<div class="grid gap-4">
						<label class="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
							<UploadCloud class="size-4" /> Importer une image
							<input type="file" accept="image/*" class="hidden" on:change={uploadMedia} />
						</label>
						<div class="grid grid-cols-3 gap-3 sm:grid-cols-5">
							{#each mediaList as m}
								<div class="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-2">
									<div class="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-slate-50">
										<img src={m} alt="" class="max-h-full max-w-full object-contain" />
									</div>
									<span class="w-full truncate text-center text-[10px] text-slate-400">{m.replace('/imgs/', '')}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>
