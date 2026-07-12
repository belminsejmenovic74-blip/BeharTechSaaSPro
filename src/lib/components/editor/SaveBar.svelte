<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import {
		Undo2,
		Redo2,
		Monitor,
		Tablet,
		Smartphone,
		Check,
		Loader2,
		History,
		ExternalLink
	} from 'lucide-svelte';
	import {
		breakpoint,
		canRedo,
		canUndo,
		editMode,
		getCmsStore,
		isDirty,
		redo,
		undo
	} from '$lib/editor/store';
	import type { Breakpoint } from '$lib/cms/types';
	import { publishSiteContent, saveDraftSiteContent } from '$lib/cms/db';
	import { getAdminSession } from '$lib/cms/local';

	export let onOpenHistory: () => void;

	let saving = false;
	let publishing = false;
	let savedAt: number | null = null;
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

	const bps: { id: Breakpoint; icon: typeof Monitor; label: string }[] = [
		{ id: 'desktop', icon: Monitor, label: 'Desktop' },
		{ id: 'tablet', icon: Tablet, label: 'Tablette' },
		{ id: 'mobile', icon: Smartphone, label: 'Mobile' }
	];

	async function doSave(silent = false) {
		const store = getCmsStore();
		const token = getAdminSession();
		if (!store || !token) return;
		if (!silent) saving = true;
		try {
			await saveDraftSiteContent(get(store), token);
			isDirty.set(false);
			savedAt = Date.now();
		} catch (e) {
			console.error('[cms] save draft failed', e);
			if (!silent) alert('Enregistrement impossible : ' + (e instanceof Error ? e.message : e));
		} finally {
			saving = false;
		}
	}

	async function doPublish() {
		const store = getCmsStore();
		const token = getAdminSession();
		if (!store || !token) return;
		publishing = true;
		try {
			await publishSiteContent(get(store), token);
			isDirty.set(false);
			savedAt = Date.now();
		} catch (e) {
			console.error('[cms] publish failed', e);
			alert('Publication impossible : ' + (e instanceof Error ? e.message : e));
		} finally {
			publishing = false;
		}
	}

	// Autosave débouncé quand le brouillon est « sale ».
	const unsubDirty = isDirty.subscribe((dirty) => {
		if (!dirty || !get(editMode)) return;
		if (autosaveTimer) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => doSave(true), 1800);
	});

	onDestroy(() => {
		unsubDirty();
		if (autosaveTimer) clearTimeout(autosaveTimer);
	});

	$: statusLabel = saving
		? 'Enregistrement…'
		: $isDirty
			? 'Modifications non enregistrées'
			: savedAt
				? 'Enregistré ✓'
				: 'À jour';
</script>

<div class="cms-savebar">
	<div class="group">
		<span class="brand">
			<span class="dot"></span> Mode édition
		</span>

		<div class="divider"></div>

		<div class="seg">
			{#each bps as b}
				<button class:on={$breakpoint === b.id} on:click={() => breakpoint.set(b.id)} title={b.label}>
					<svelte:component this={b.icon} class="size-4" />
				</button>
			{/each}
		</div>

		<div class="divider"></div>

		<button class="icon" disabled={!$canUndo} on:click={undo} title="Annuler (Cmd+Z)">
			<Undo2 class="size-4" />
		</button>
		<button class="icon" disabled={!$canRedo} on:click={redo} title="Rétablir (Cmd+Maj+Z)">
			<Redo2 class="size-4" />
		</button>
	</div>

	<div class="group">
		<span class="status" class:dirty={$isDirty && !saving}>
			{#if saving}<Loader2 class="size-3.5 spin" />{:else if !$isDirty}<Check class="size-3.5" />{/if}
			{statusLabel}
		</span>

		<button class="icon" on:click={onOpenHistory} title="Historique des versions">
			<History class="size-4" />
		</button>

		<a class="ghost" href="/" target="_blank" title="Voir le site publié">
			<ExternalLink class="size-3.5" />
		</a>

		<button class="btn secondary" on:click={() => doSave(false)} disabled={saving}>
			{saving ? 'Enregistrement…' : 'Enregistrer'}
		</button>

		<button class="btn primary" on:click={doPublish} disabled={publishing}>
			{publishing ? 'Publication…' : 'Publier'}
		</button>
	</div>
</div>

<style>
	.cms-savebar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 52px;
		z-index: 2147483100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 14px;
		background: rgba(255, 255, 255, 0.92);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid rgba(26, 25, 22, 0.08);
		box-shadow: 0 6px 24px rgba(26, 25, 22, 0.05);
	}
	.group {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 700;
		color: #1a1916;
		padding-left: 4px;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #2a9d8f;
		box-shadow: 0 0 0 3px rgba(42, 157, 143, 0.2);
	}
	.divider {
		width: 1px;
		height: 22px;
		background: rgba(26, 25, 22, 0.1);
		margin: 0 4px;
	}
	.seg {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: rgba(26, 25, 22, 0.05);
		border-radius: 9px;
	}
	.seg button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 26px;
		border-radius: 6px;
		color: #6b6b6b;
		cursor: pointer;
	}
	.seg button.on {
		background: #fff;
		color: #1a1916;
		box-shadow: 0 1px 3px rgba(26, 25, 22, 0.12);
	}
	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		color: #6b6b6b;
		cursor: pointer;
	}
	.icon:hover:not(:disabled) {
		background: rgba(26, 25, 22, 0.06);
		color: #1a1916;
	}
	.icon:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		color: #6b6b6b;
	}
	.ghost:hover {
		background: rgba(26, 25, 22, 0.06);
		color: #1a1916;
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 600;
		color: #2a9d8f;
		padding: 0 8px;
	}
	.status.dirty {
		color: #b08900;
	}
	.btn {
		height: 34px;
		padding: 0 16px;
		border-radius: 9px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.btn.secondary {
		background: #fff;
		border: 1px solid rgba(26, 25, 22, 0.14);
		color: #1a1916;
	}
	.btn.secondary:hover:not(:disabled) {
		background: rgba(26, 25, 22, 0.03);
	}
	.btn.primary {
		background: #2a9d8f;
		color: #fff;
		border: none;
	}
	.btn.primary:hover:not(:disabled) {
		background: #248b7f;
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	:global(.cms-savebar .spin) {
		animation: cms-spin 0.8s linear infinite;
	}
	@keyframes cms-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
