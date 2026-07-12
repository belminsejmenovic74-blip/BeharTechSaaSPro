<script lang="ts">
	import { X, RotateCcw, FileClock, Loader2 } from 'lucide-svelte';
	import { get } from 'svelte/store';
	import { commit, getCmsStore } from '$lib/editor/store';
	import { listVersions, restoreVersion, type CmsVersion } from '$lib/cms/db';
	import { getAdminSession } from '$lib/cms/local';
	import { DEFAULT_CONTENT } from '$lib/cms/default-content';

	export let open = false;
	export let onClose: () => void;

	let versions: CmsVersion[] = [];
	let loading = false;
	let restoringId: string | null = null;

	$: if (open) refresh();

	async function refresh() {
		const token = getAdminSession();
		if (!token) return;
		loading = true;
		try {
			versions = await listVersions(token);
		} catch (e) {
			console.error('[cms] list versions failed', e);
		} finally {
			loading = false;
		}
	}

	async function restore(v: CmsVersion) {
		const token = getAdminSession();
		const store = getCmsStore();
		if (!token || !store) return;
		if (!confirm('Restaurer cette version dans votre brouillon ? Les modifications actuelles non enregistrées seront remplacées.')) return;
		restoringId = v.id;
		try {
			const sc = await restoreVersion(token, v.id, get(store));
			commit((c) => {
				const rec = c as unknown as Record<string, unknown>;
				for (const k of Object.keys(rec)) delete rec[k];
				Object.assign(c, structuredClone({ ...DEFAULT_CONTENT, ...sc }));
			});
			onClose();
		} catch (e) {
			console.error('[cms] restore failed', e);
			alert('Restauration impossible : ' + (e instanceof Error ? e.message : e));
		} finally {
			restoringId = null;
		}
	}

	function fmt(iso: string) {
		return new Date(iso).toLocaleString('fr-FR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

{#if open}
	<div class="cms-hist-backdrop" on:click={onClose} role="presentation"></div>
	<aside class="cms-hist">
		<div class="head">
			<div class="title"><FileClock class="size-4" /> Historique</div>
			<button class="icon" on:click={onClose}><X class="size-4" /></button>
		</div>
		<div class="body">
			{#if loading}
				<div class="empty"><Loader2 class="size-4 spin" /> Chargement…</div>
			{:else if versions.length === 0}
				<div class="empty">Aucune version enregistrée pour l'instant.</div>
			{:else}
				{#each versions as v (v.id)}
					<div class="row">
						<div>
							<span class="badge" class:pub={v.version_type === 'published'}>
								{v.version_type === 'published' ? 'Publié' : 'Brouillon'}
							</span>
							<span class="date">{fmt(v.created_at)}</span>
						</div>
						<button class="restore" on:click={() => restore(v)} disabled={restoringId === v.id}>
							{#if restoringId === v.id}<Loader2 class="size-3.5 spin" />{:else}<RotateCcw class="size-3.5" />{/if}
							Restaurer
						</button>
					</div>
				{/each}
			{/if}
		</div>
	</aside>
{/if}

<style>
	.cms-hist-backdrop {
		position: fixed;
		inset: 0;
		z-index: 2147483200;
		background: rgba(26, 25, 22, 0.2);
	}
	.cms-hist {
		position: fixed;
		top: 0;
		right: 0;
		height: 100vh;
		width: 340px;
		z-index: 2147483300;
		display: flex;
		flex-direction: column;
		background: #fff;
		border-left: 1px solid rgba(26, 25, 22, 0.08);
		box-shadow: -16px 0 48px rgba(26, 25, 22, 0.14);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid rgba(26, 25, 22, 0.07);
	}
	.title {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 700;
		color: #1a1916;
	}
	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		color: #6b6b6b;
		cursor: pointer;
	}
	.icon:hover {
		background: rgba(26, 25, 22, 0.06);
	}
	.body {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}
	.empty {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: center;
		padding: 40px 16px;
		color: #9a9a95;
		font-size: 13px;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 8px;
		border-radius: 10px;
	}
	.row:hover {
		background: rgba(26, 25, 22, 0.03);
	}
	.badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		background: rgba(26, 25, 22, 0.06);
		color: #6b6b6b;
	}
	.badge.pub {
		background: rgba(42, 157, 143, 0.12);
		color: #2a9d8f;
	}
	.date {
		margin-left: 8px;
		font-size: 12px;
		color: #6b6b6b;
	}
	.restore {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 30px;
		padding: 0 10px;
		border-radius: 8px;
		border: 1px solid rgba(26, 25, 22, 0.12);
		font-size: 12px;
		font-weight: 600;
		color: #1a1916;
		cursor: pointer;
	}
	.restore:hover:not(:disabled) {
		border-color: rgba(42, 157, 143, 0.4);
		color: #2a9d8f;
	}
	:global(.cms-hist .spin) {
		animation: cms-spin 0.8s linear infinite;
	}
</style>
