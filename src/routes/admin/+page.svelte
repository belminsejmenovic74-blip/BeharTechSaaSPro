<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import posthog from 'posthog-js';
	import {
		ExternalLink,
		RotateCcw,
		Save,
		LogOut,
		Download,
		Plus,
		LayoutTemplate,
		Layers,
		Wand2
	} from 'lucide-svelte';

	import type { LocalDbSchema, PageSection } from '$lib/cms/types';
	import {
		cacheDraftDb,
		clearDb,
		createDefaultDb,
		loadDraftDb,
		logoutAdmin,
		newCmsId,
		publishDb,
		saveDraftDb
	} from '$lib/cms/db';
	import { DEFAULT_CONTENT } from '$lib/cms/default-content';
	import { clearAdminSession, getAdminSession } from '$lib/cms/local';

	import VisualEditor from './VisualEditor.svelte';
	import RightPanel from '$lib/components/admin/cms/RightPanel.svelte';
	import BlockLibraryModal from '$lib/components/admin/cms/BlockLibraryModal.svelte';

	let isMounted = false;
	const db = writable<LocalDbSchema>({
		pages: [],
		page_sections: [],
		theme: DEFAULT_CONTENT.theme
	});
	let adminSession = '';
	let loadingCms = true;
	let loadingError = '';
	let saving = false;
	let publishing = false;

	onMount(() => {
		adminSession = getAdminSession();
		if (!adminSession) {
			goto('/admin/login');
			return;
		}

		loadDraftDb(adminSession)
			.then((loaded) => {
				db.set(loaded);
			})
			.catch((error) => {
				loadingError = error instanceof Error ? error.message : 'Chargement Supabase impossible.';
				db.set(createDefaultDb());
			})
			.finally(() => {
				loadingCms = false;
				isMounted = true;
			});
	});

	let activeSectionId: string | null = null;
	$: activeSection = $db.page_sections.find((s) => s.id === activeSectionId) || null;

	let showBlockLibrary = false;

	// Actions sur les sections
	function handleSelect(id: string | null) {
		activeSectionId = id;
	}

	function handleMoveUp(id: string) {
		const idx = $db.page_sections.findIndex((s) => s.id === id);
		if (idx > 0) {
			const sections = [...$db.page_sections];
			const temp = sections[idx - 1];
			sections[idx - 1] = sections[idx];
			sections[idx] = temp;
			// Réassigner les ordres
			sections.forEach((s, i) => (s.order = i));
			$db.page_sections = sections;
			touch();
		}
	}

	function handleMoveDown(id: string) {
		const idx = $db.page_sections.findIndex((s) => s.id === id);
		if (idx > -1 && idx < $db.page_sections.length - 1) {
			const sections = [...$db.page_sections];
			const temp = sections[idx + 1];
			sections[idx + 1] = sections[idx];
			sections[idx] = temp;
			// Réassigner les ordres
			sections.forEach((s, i) => (s.order = i));
			$db.page_sections = sections;
			touch();
		}
	}

	function handleDuplicate(id: string) {
		const idx = $db.page_sections.findIndex((s) => s.id === id);
		if (idx > -1) {
			const original = $db.page_sections[idx];
			const clone: PageSection = {
				...structuredClone(original),
				id: newCmsId(),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};
			const sections = [...$db.page_sections];
			sections.splice(idx + 1, 0, clone);
			sections.forEach((s, i) => (s.order = i));
			$db.page_sections = sections;
			activeSectionId = clone.id;
			toast.success('Section dupliquée');
			touch();
		}
	}

	function handleDelete(id: string) {
		if (confirm('Voulez-vous vraiment supprimer cette section ?')) {
			const sections = $db.page_sections.filter((s) => s.id !== id);
			sections.forEach((s, i) => (s.order = i));
			$db.page_sections = sections;
			activeSectionId = null;
			toast.success('Section supprimée');
			touch();
		}
	}

	function handleAddSection(type: string) {
		let content = (DEFAULT_CONTENT as any)[type];
		if (type.startsWith('showcase')) {
			content = (DEFAULT_CONTENT.showcases as any)[type.replace('showcase', '')];
		}

		const newSection: PageSection = {
			id: newCmsId(),
			page_id: $db.pages[0].id, // fallback page d'accueil
			type: type,
			order: $db.page_sections.length,
			content: structuredClone(content),
			settings: { visible: true },
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		$db.page_sections = [...$db.page_sections, newSection];
		showBlockLibrary = false;
		activeSectionId = newSection.id;
		toast.success('Section ajoutée');
		touch();
	}

	// Sauvegarde & Publication
	function touch() {
		// Appelé pour forcer la réactivité et la sauvegarde brouillon
		$db = $db;
		cacheDraftDb($db);
	}

	async function saveDraft() {
		if (!adminSession) {
			toast.error('Session admin expirée.');
			goto('/admin/login');
			return;
		}
		saving = true;
		try {
			await saveDraftDb($db, adminSession);
			posthog.capture('admin_draft_saved');
			toast.success('Brouillon enregistré dans Supabase');
		} catch (error) {
			toast.error('Enregistrement impossible', {
				description: error instanceof Error ? error.message : 'Erreur Supabase.'
			});
		} finally {
			saving = false;
		}
	}

	async function publish() {
		if (!adminSession) {
			toast.error('Session admin expirée.');
			goto('/admin/login');
			return;
		}
		publishing = true;
		try {
			await publishDb($db, adminSession);
			posthog.capture('admin_published');
			toast.success('Site publié avec succès !', {
				description: 'Les modifications publiées sont maintenant enregistrées dans Supabase.'
			});
		} catch (error) {
			toast.error('Publication impossible', {
				description: error instanceof Error ? error.message : 'Erreur Supabase.'
			});
		} finally {
			publishing = false;
		}
	}

	async function reset() {
		if (
			!confirm(
				"Réinitialiser tout le contenu (brouillon et publié) sur la version d'origine Behar Tech Pro ?"
			)
		)
			return;
		await clearDb(adminSession);
		db.set(createDefaultDb());
		toast.success('Brouillon réinitialisé');
	}

	function exportJson() {
		// Exporte la version publiée
		const blob = new Blob([JSON.stringify($db, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'database.json';
		a.click();
		URL.revokeObjectURL(a.href);
		posthog.capture('admin_content_exported');
		toast.success('Fichier JSON exporté !', {
			description: 'Commitez ce fichier dans votre dépôt Git pour que Vercel le mette en ligne.'
		});
	}

	async function logout() {
		if (adminSession) await logoutAdmin(adminSession);
		clearAdminSession();
		goto('/admin/login');
	}
</script>

<svelte:head><title>Admin · Visual CMS</title></svelte:head>

{#if loadingCms}
	<div class="flex h-screen items-center justify-center bg-[#FAFAF8] text-sm text-slate-500">
		Chargement du CMS Supabase…
	</div>
{:else if isMounted}
	<div class="flex h-screen flex-col overflow-hidden bg-white">
		<!-- Topbar -->
		<header
			class="z-[60] flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-sm"
		>
			<div class="flex items-center gap-2 font-semibold">
				<span
					class="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-sm text-white shadow-inner"
					>BT</span
				>
				<span class="text-slate-800">Visual CMS</span>
				<span
					class="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500"
					>Pro</span
				>
			</div>
			<div class="flex items-center gap-3">
				<a
					href="/?edit=1"
					class="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
				>
					<Wand2 class="size-4" /> <span>Mode édition (site)</span>
				</a>

				<a
					href="/"
					target="_blank"
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
				>
					<ExternalLink class="size-4" /> <span class="hidden sm:inline">Voir le site public</span>
				</a>

				<div class="mx-1 h-4 w-px bg-slate-200"></div>

				<button
					type="button"
					on:click={() => (showBlockLibrary = true)}
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					<Plus class="size-4" /> <span class="hidden sm:inline">Ajouter section</span>
				</button>

				<button
					type="button"
					on:click={saveDraft}
					class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
				>
					{saving ? 'Enregistrement…' : 'Enregistrer brouillon'}
				</button>

				<button
					type="button"
					on:click={publish}
					class="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
				>
					<Save class="size-4" />
					{publishing ? 'Publication…' : 'Publier'}
				</button>

				<div class="mx-1 h-4 w-px bg-slate-200"></div>

				<button
					type="button"
					on:click={exportJson}
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50"
					title="Exporter pour Vercel"
				>
					<Download class="size-4" /> <span class="hidden sm:inline">Exporter (Vercel)</span>
				</button>

				<button
					type="button"
					on:click={logout}
					title="Déconnexion"
					class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
				>
					<LogOut class="size-4" />
				</button>
			</div>
		</header>

		<div class="relative flex min-h-0 flex-1">
			{#if loadingError}
				<div
					class="absolute left-1/2 top-4 z-[90] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 shadow-sm"
				>
					{loadingError}
				</div>
			{/if}
			<!-- Sidebar Gauche (Pages - Optionnel pour l'instant) -->
			<aside
				class="z-50 hidden w-16 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex md:w-56"
			>
				<div class="border-b border-slate-100 p-3">
					<div
						class="mb-2 ml-2 hidden text-xs font-semibold uppercase tracking-wider text-slate-400 md:block"
					>
						Pages
					</div>
					<button
						class="flex w-full items-center gap-3 rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 transition"
					>
						<LayoutTemplate class="size-4" /> <span class="hidden md:inline">Accueil</span>
					</button>
				</div>
				<div class="flex-1 p-3">
					<div
						class="mb-2 ml-2 hidden text-xs font-semibold uppercase tracking-wider text-slate-400 md:block"
					>
						Structure
					</div>
					{#each $db.page_sections as sec}
						<button
							class="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition {activeSectionId ===
							sec.id
								? 'bg-slate-100 font-medium text-slate-900'
								: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}"
							on:click={() => handleSelect(sec.id)}
						>
							<Layers class="size-3.5 opacity-70" />
							<span class="hidden truncate capitalize md:inline"
								>{sec.type.replace('showcase', 'Showcase ')}</span
							>
							{#if !sec.settings.visible}
								<span class="ml-auto flex size-2 rounded-full bg-slate-300"></span>
							{/if}
						</button>
					{/each}
				</div>
				<div class="mt-auto border-t border-slate-100 p-4">
					<button
						type="button"
						on:click={reset}
						class="flex w-full items-center gap-2 text-xs text-slate-400 transition hover:text-red-500"
					>
						<RotateCcw class="size-3.5" /> <span class="hidden md:inline">Réinitialiser</span>
					</button>
				</div>
			</aside>

			<!-- Éditeur Visuel (Workspace) -->
			<main
				class="relative min-w-0 flex-1 overflow-hidden bg-slate-50 shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]"
			>
				<VisualEditor
					{db}
					{activeSectionId}
					onSelect={handleSelect}
					onMoveUp={handleMoveUp}
					onMoveDown={handleMoveDown}
					onDuplicate={handleDuplicate}
					onDelete={handleDelete}
					onAddSection={() => (showBlockLibrary = true)}
				/>
			</main>

			<!-- Panneau Droit (Propriétés) -->
			<RightPanel
				section={activeSection}
				theme={$db.theme}
				onClose={() => (activeSectionId = null)}
				onChange={touch}
			/>
		</div>
	</div>

	<BlockLibraryModal
		show={showBlockLibrary}
		onClose={() => (showBlockLibrary = false)}
		onSelect={handleAddSection}
	/>
{/if}
