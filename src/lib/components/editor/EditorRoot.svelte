<script lang="ts">
	import '$lib/editor/editor.css';
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { getCms } from '$lib/cms/context';
	import { getAdminSession } from '$lib/cms/local';
	import { loadDraftSiteContent } from '$lib/cms/db';
	import { bindCms, editMode, redo, selectedId, undo } from '$lib/editor/store';

	import EditModeToggle from './EditModeToggle.svelte';
	import SaveBar from './SaveBar.svelte';
	import SelectionFrame from './SelectionFrame.svelte';
	import PropertiesPanel from './PropertiesPanel.svelte';
	import HistoryDrawer from './HistoryDrawer.svelte';
	import AutoCanvas from './AutoCanvas.svelte';

	const cms = getCms();
	let isAdmin = false;
	let draftLoaded = false;
	let showHistory = false;

	onMount(() => {
		isAdmin = Boolean(getAdminSession());
		if (isAdmin) {
			bindCms(cms);
			// Activation directe depuis /admin via ?edit=1
			if (new URLSearchParams(window.location.search).get('edit') === '1') {
				editMode.set(true);
			}
		}
	});

	// À la première activation du mode édition : charger le brouillon Supabase.
	async function loadDraftOnce() {
		if (draftLoaded) return;
		draftLoaded = true;
		const token = getAdminSession();
		if (!token) return;
		try {
			const draft = await loadDraftSiteContent(token, get(cms));
			cms.set(draft);
		} catch (e) {
			console.error('[cms] load draft failed', e);
		}
	}

	const unsubEdit = editMode.subscribe((on) => {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('cms-edit-active', on);
		if (on) loadDraftOnce();
		else selectedId.set(null);
	});

	function isTextEditing() {
		const el = document.activeElement as HTMLElement | null;
		return !!el && (el.isContentEditable || el.dataset.editing === 'true');
	}

	function onKeydown(e: KeyboardEvent) {
		if (!get(editMode)) return;
		if (e.key === 'Escape') {
			selectedId.set(null);
			return;
		}
		if (isTextEditing()) return;
		const mod = e.metaKey || e.ctrlKey;
		if (mod && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
		}
		if (mod && e.key.toLowerCase() === 'y') {
			e.preventDefault();
			redo();
		}
	}

	// Désélection au clic dans le vide (hors éléments éditables / chrome).
	function onDocClick(e: MouseEvent) {
		if (!get(editMode)) return;
		const t = e.target as HTMLElement;
		if (t.closest('[data-el]') || t.closest('[data-cms-chrome]')) return;
		selectedId.set(null);
	}

	onDestroy(() => {
		unsubEdit();
		if (typeof document !== 'undefined')
			document.documentElement.classList.remove('cms-edit-active');
	});
</script>

<svelte:window on:keydown={onKeydown} on:click|capture={onDocClick} />

{#if isAdmin}
	<AutoCanvas />
	<div data-cms-chrome>
		<EditModeToggle />

		{#if $editMode}
			<SaveBar onOpenHistory={() => (showHistory = true)} />
			<SelectionFrame />
			<PropertiesPanel />
			<HistoryDrawer open={showHistory} onClose={() => (showHistory = false)} />
		{/if}
	</div>
{/if}
