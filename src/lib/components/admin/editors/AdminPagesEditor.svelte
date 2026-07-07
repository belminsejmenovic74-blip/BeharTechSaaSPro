<script lang="ts">
	import {
		Plus, Trash2, ChevronUp, ChevronDown, Copy, FileStack,
		Type, AlignLeft, AlignCenter, AlignRight, Image, MousePointerClick,
		Minus, ArrowUpDown, Sparkles, Heading, PilcrowSquare
	} from 'lucide-svelte';
	import { ICON_NAMES, resolveIcon } from '$lib/cms/icons';
	import type { Block, BlockType, BuilderPage } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Txt from '../Txt.svelte';
	import Color from '../Color.svelte';
	import MediaPicker from '../MediaPicker.svelte';
	import BlockRender from '$lib/components/builder/BlockRender.svelte';

	export let pages: BuilderPage[];
	export let media: string[];

	// ── State ──────────────────────────────────────────────────────────────
	let activePageIdx: number | null = pages.length ? 0 : null;
	let activeBlockId: string | null = null;

	$: activePage = activePageIdx !== null ? pages[activePageIdx] : null;
	$: activeBlock = activePage && activeBlockId
		? activePage.blocks.find((b) => b.id === activeBlockId) ?? null
		: null;

	// ── Helpers ────────────────────────────────────────────────────────────
	function uid() {
		return 'b' + Math.random().toString(36).slice(2, 9);
	}
	function pid() {
		return 'p' + Math.random().toString(36).slice(2, 9);
	}
	function slugify(s: string) {
		return s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	// ── Page actions ──────────────────────────────────────────────────────
	function addPage() {
		const p: BuilderPage = {
			id: pid(),
			slug: 'nouvelle-page',
			title: 'Nouvelle page',
			bg: '#FAFAF8',
			maxWidth: 760,
			blocks: [
				{ id: uid(), type: 'heading', text: 'Ma page', fontSize: 42, fontWeight: 700, color: '#1A1916', align: 'center', paddingY: 32, paddingX: 16 },
				{ id: uid(), type: 'text', text: 'Clique sur un bloc pour le modifier.', fontSize: 17, color: '#6B6B6B', align: 'center', paddingY: 8, paddingX: 16 }
			]
		};
		pages = [...pages, p];
		activePageIdx = pages.length - 1;
		activeBlockId = null;
	}

	function removePage(i: number) {
		if (!confirm('Supprimer cette page ?')) return;
		pages = pages.filter((_, idx) => idx !== i);
		if (activePageIdx !== null && activePageIdx >= pages.length) {
			activePageIdx = pages.length ? pages.length - 1 : null;
		}
		activeBlockId = null;
	}

	function duplicatePage(i: number) {
		const src = pages[i];
		const clone: BuilderPage = {
			...structuredClone(src),
			id: pid(),
			slug: src.slug + '-copie',
			title: src.title + ' (copie)',
			blocks: src.blocks.map((b) => ({ ...structuredClone(b), id: uid() }))
		};
		pages = [...pages.slice(0, i + 1), clone, ...pages.slice(i + 1)];
		activePageIdx = i + 1;
		activeBlockId = null;
	}

	// ── Block actions ─────────────────────────────────────────────────────
	const BLOCK_DEFAULTS: Record<BlockType, Partial<Block>> = {
		heading: { text: 'Nouveau titre', fontSize: 36, fontWeight: 700, color: '#1A1916', align: 'center', paddingY: 20, paddingX: 16 },
		text: { text: 'Nouveau texte ici…', fontSize: 16, color: '#6B6B6B', align: 'left', paddingY: 8, paddingX: 16 },
		button: { text: 'Mon bouton', href: '#', bg: '#2A9D8F', color: '#FFFFFF', align: 'center', radius: 12, paddingY: 16, fontSize: 15 },
		image: { src: '', align: 'center', width: 100, radius: 12, paddingY: 12 },
		icon: { icon: 'sparkles', fontSize: 40, color: '#2A9D8F', align: 'center', paddingY: 16 },
		divider: { color: 'rgba(26,25,22,0.12)', paddingY: 16 },
		spacer: { height: 40 }
	};

	const BLOCK_LABELS: Record<BlockType, string> = {
		heading: 'Titre',
		text: 'Texte',
		button: 'Bouton',
		image: 'Image',
		icon: 'Icône',
		divider: 'Séparateur',
		spacer: 'Espace'
	};

	function addBlock(type: BlockType) {
		if (!activePage) return;
		const b: Block = { id: uid(), type, ...BLOCK_DEFAULTS[type] } as Block;
		activePage.blocks = [...activePage.blocks, b];
		activeBlockId = b.id;
		pages = pages; // trigger reactivity
	}

	function removeBlock(id: string) {
		if (!activePage) return;
		activePage.blocks = activePage.blocks.filter((b) => b.id !== id);
		if (activeBlockId === id) activeBlockId = null;
		pages = pages;
	}

	function moveBlock(id: string, dir: -1 | 1) {
		if (!activePage) return;
		const idx = activePage.blocks.findIndex((b) => b.id === id);
		if (idx < 0) return;
		const target = idx + dir;
		if (target < 0 || target >= activePage.blocks.length) return;
		const arr = [...activePage.blocks];
		[arr[idx], arr[target]] = [arr[target], arr[idx]];
		activePage.blocks = arr;
		pages = pages;
	}

	function duplicateBlock(id: string) {
		if (!activePage) return;
		const idx = activePage.blocks.findIndex((b) => b.id === id);
		if (idx < 0) return;
		const clone: Block = { ...structuredClone(activePage.blocks[idx]), id: uid() };
		activePage.blocks = [...activePage.blocks.slice(0, idx + 1), clone, ...activePage.blocks.slice(idx + 1)];
		activeBlockId = clone.id;
		pages = pages;
	}

	// keep reactivity when editing inline
	function touch() {
		pages = pages;
	}
</script>

<!-- ═══════ PAGE LIST ═══════ -->
{#if activePageIdx === null || !activePage}
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-bold text-slate-800">Pages builder</h2>
			<button type="button" on:click={addPage}
				class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
				<Plus class="size-4" /> Nouvelle page
			</button>
		</div>

		{#if pages.length === 0}
			<div class="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
				<FileStack class="mx-auto mb-3 size-10 text-slate-300" />
				<p class="text-sm text-slate-500">Aucune page. Crée ta première page !</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each pages as pg, i}
					<button type="button" on:click={() => { activePageIdx = i; activeBlockId = null; }}
						class="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-400 hover:shadow-sm">
						<div>
							<div class="text-sm font-semibold text-slate-800">{pg.title}</div>
							<div class="mt-0.5 font-mono text-xs text-slate-400">/p/{pg.slug}</div>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<button type="button" title="Dupliquer" on:click|stopPropagation={() => duplicatePage(i)}
								class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
								<Copy class="size-4" />
							</button>
							<button type="button" title="Supprimer" on:click|stopPropagation={() => removePage(i)}
								class="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">
								<Trash2 class="size-4" />
							</button>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>

<!-- ═══════ PAGE EDITOR (with blocks + inspector) ═══════ -->
{:else}
	<div class="space-y-4">
		<!-- Back + page title -->
		<button type="button" on:click={() => { activePageIdx = null; activeBlockId = null; }}
			class="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
			← Toutes les pages
		</button>

		<!-- Page settings card -->
		<div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
			<h3 class="text-sm font-bold text-slate-700">Réglages de la page</h3>
			<Field label="Titre">
				<Txt bind:value={activePage.title} placeholder="Titre de la page" />
			</Field>
			<Field label="Slug (URL)" hint="Accessible sur /p/{activePage.slug}">
				<Txt bind:value={activePage.slug} placeholder="mon-slug" />
			</Field>
			<div class="grid grid-cols-2 gap-3">
				<Field label="Fond">
					<Color bind:value={activePage.bg} />
				</Field>
				<Field label="Largeur max (px)">
					<Txt bind:value={activePage.maxWidth} type="number" placeholder="760" />
				</Field>
			</div>
		</div>

		<!-- Block list with live preview -->
		<div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
			<div class="mb-3 flex items-center justify-between">
				<h3 class="text-xs font-bold uppercase tracking-wide text-slate-500">Blocs</h3>
			</div>

			{#if activePage.blocks.length === 0}
				<p class="py-6 text-center text-xs text-slate-400">Aucun bloc — ajoute-en un ci-dessous</p>
			{:else}
				<div class="space-y-2">
					{#each activePage.blocks as block, bi (block.id)}
						<button type="button"
							on:click={() => { activeBlockId = activeBlockId === block.id ? null : block.id; }}
							class="group relative w-full rounded-lg border bg-white p-3 text-left transition
								{activeBlockId === block.id
									? 'border-emerald-500 ring-2 ring-emerald-100 shadow-sm'
									: 'border-slate-200 hover:border-emerald-300'}">

							<!-- Block label + controls -->
							<div class="mb-2 flex items-center justify-between gap-2">
								<span class="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
									{#if block.type === 'heading'}<Heading class="size-3.5" />
									{:else if block.type === 'text'}<PilcrowSquare class="size-3.5" />
									{:else if block.type === 'button'}<MousePointerClick class="size-3.5" />
									{:else if block.type === 'image'}<Image class="size-3.5" />
									{:else if block.type === 'icon'}<Sparkles class="size-3.5" />
									{:else if block.type === 'divider'}<Minus class="size-3.5" />
									{:else if block.type === 'spacer'}<ArrowUpDown class="size-3.5" />
									{/if}
									{BLOCK_LABELS[block.type]}
								</span>

								<div class="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100"
									on:click|stopPropagation={() => {}}>
									<button type="button" title="Monter" disabled={bi === 0}
										on:click|stopPropagation={() => moveBlock(block.id, -1)}
										class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">
										<ChevronUp class="size-3.5" />
									</button>
									<button type="button" title="Descendre" disabled={bi === activePage.blocks.length - 1}
										on:click|stopPropagation={() => moveBlock(block.id, 1)}
										class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">
										<ChevronDown class="size-3.5" />
									</button>
									<button type="button" title="Dupliquer"
										on:click|stopPropagation={() => duplicateBlock(block.id)}
										class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
										<Copy class="size-3.5" />
									</button>
									<button type="button" title="Supprimer"
										on:click|stopPropagation={() => removeBlock(block.id)}
										class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
										<Trash2 class="size-3.5" />
									</button>
								</div>
							</div>

							<!-- Mini preview -->
							<div class="pointer-events-none overflow-hidden rounded-md border border-slate-100 bg-white p-2"
								style="background:{activePage.bg};">
								<div style="max-width:{activePage.maxWidth}px; margin:0 auto; transform:scale(0.7); transform-origin:top left; max-height:80px; overflow:hidden;">
									<BlockRender {block} />
								</div>
							</div>
						</button>

						<!-- ═══════ INSPECTOR PANEL (opens below selected block) ═══════ -->
						{#if activeBlockId === block.id}
							<div class="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 animate-in"
								on:input={touch} on:change={touch}>
								<h4 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
									<svelte:component this={resolveIcon('wrench')} class="size-3.5" />
									Propriétés — {BLOCK_LABELS[block.type]}
								</h4>

								<!-- ── Text / Heading / Button ── -->
								{#if block.type === 'heading' || block.type === 'text' || block.type === 'button'}
									<Field label="Texte">
										{#if block.type === 'text'}
											<textarea bind:value={block.text} rows="3" placeholder="Contenu…"
												class="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"></textarea>
										{:else}
											<Txt bind:value={block.text} placeholder="Texte" />
										{/if}
									</Field>
								{/if}

								{#if block.type === 'button'}
									<Field label="Lien (URL)">
										<Txt bind:value={block.href} placeholder="/dashboard" />
									</Field>
								{/if}

								<!-- ── Font size slider ── -->
								{#if block.type !== 'divider' && block.type !== 'spacer' && block.type !== 'image'}
									<Field label="Taille ({block.fontSize ?? 16}px)">
										<input type="range" min="10" max="80" step="1"
											bind:value={block.fontSize}
											class="slider w-full" />
									</Field>
								{/if}

								<!-- ── Font weight slider ── -->
								{#if block.type === 'heading' || block.type === 'text'}
									<Field label="Épaisseur ({block.fontWeight ?? 400})">
										<input type="range" min="100" max="900" step="100"
											bind:value={block.fontWeight}
											class="slider w-full" />
									</Field>
								{/if}

								<!-- ── Colors ── -->
								{#if block.type !== 'spacer'}
									<div class="grid grid-cols-2 gap-3">
										<Field label="Couleur">
											<Color bind:value={block.color} />
										</Field>
										{#if block.type === 'heading' || block.type === 'text' || block.type === 'button'}
											<Field label="Fond du bloc">
												<Color bind:value={block.bg} />
											</Field>
										{/if}
									</div>
								{/if}

								<!-- ── Alignment ── -->
								{#if block.type !== 'spacer' && block.type !== 'divider'}
									<Field label="Alignement">
										<div class="flex gap-1">
											{#each [['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as [val, Icon]}
												<button type="button"
													on:click={() => { block.align = val; touch(); }}
													class="rounded-lg p-2 transition {block.align === val
														? 'bg-emerald-100 text-emerald-700'
														: 'bg-white text-slate-500 hover:bg-slate-100'}">
													<svelte:component this={Icon} class="size-4" />
												</button>
											{/each}
										</div>
									</Field>
								{/if}

								<!-- ── Padding ── -->
								{#if block.type !== 'spacer'}
									<div class="grid grid-cols-2 gap-3">
										<Field label="Padding Y ({block.paddingY ?? 0}px)">
											<input type="range" min="0" max="80" step="2"
												bind:value={block.paddingY}
												class="slider w-full" />
										</Field>
										{#if block.type !== 'divider'}
											<Field label="Padding X ({block.paddingX ?? 0}px)">
												<input type="range" min="0" max="80" step="2"
													bind:value={block.paddingX}
													class="slider w-full" />
											</Field>
										{/if}
									</div>
								{/if}

								<!-- ── Radius ── -->
								{#if block.type === 'button' || block.type === 'image'}
									<Field label="Rayon ({block.radius ?? 0}px)">
										<input type="range" min="0" max="50" step="1"
											bind:value={block.radius}
											class="slider w-full" />
									</Field>
								{/if}

								<!-- ── Image specific ── -->
								{#if block.type === 'image'}
									<Field label="Image">
										<MediaPicker bind:value={block.src} {media} />
									</Field>
									<Field label="Largeur ({block.width ?? 100}%)">
										<input type="range" min="10" max="100" step="5"
											bind:value={block.width}
											class="slider w-full" />
									</Field>
								{/if}

								<!-- ── Icon specific ── -->
								{#if block.type === 'icon'}
									<Field label="Icône">
										<select bind:value={block.icon} on:change={touch}
											class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
											{#each ICON_NAMES as name}
												<option value={name}>{name}</option>
											{/each}
										</select>
										<div class="mt-2 flex items-center gap-2 text-emerald-600">
											<svelte:component this={resolveIcon(block.icon)} size={24} />
											<span class="text-xs text-slate-500">Aperçu</span>
										</div>
									</Field>
								{/if}

								<!-- ── Spacer height ── -->
								{#if block.type === 'spacer'}
									<Field label="Hauteur ({block.height ?? 40}px)">
										<input type="range" min="8" max="200" step="4"
											bind:value={block.height}
											class="slider w-full" />
									</Field>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- Add block toolbar -->
		<div class="rounded-xl border border-dashed border-slate-300 bg-white p-3">
			<p class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Ajouter un bloc</p>
			<div class="flex flex-wrap gap-1.5">
				{#each /** @type {BlockType[]} */ (['heading', 'text', 'button', 'image', 'icon', 'divider', 'spacer']) as btype}
					<button type="button" on:click={() => addBlock(btype)}
						class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700">
						{#if btype === 'heading'}<Heading class="size-3.5" />
						{:else if btype === 'text'}<PilcrowSquare class="size-3.5" />
						{:else if btype === 'button'}<MousePointerClick class="size-3.5" />
						{:else if btype === 'image'}<Image class="size-3.5" />
						{:else if btype === 'icon'}<Sparkles class="size-3.5" />
						{:else if btype === 'divider'}<Minus class="size-3.5" />
						{:else if btype === 'spacer'}<ArrowUpDown class="size-3.5" />
						{/if}
						{BLOCK_LABELS[btype]}
					</button>
				{/each}
			</div>
		</div>

		<!-- Full page preview -->
		<div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
			<div class="border-b border-slate-100 px-4 py-2">
				<span class="text-xs font-bold uppercase tracking-wide text-slate-400">Aperçu complet</span>
			</div>
			<div class="p-4" style="background:{activePage.bg};">
				<div style="max-width:{activePage.maxWidth}px; margin:0 auto;">
					{#each activePage.blocks as block (block.id)}
						<BlockRender {block} />
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.slider {
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		border-radius: 3px;
		background: #e2e8f0;
		outline: none;
	}
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #059669;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 4px rgba(0,0,0,0.15);
	}
	.slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #059669;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 4px rgba(0,0,0,0.15);
	}
	.animate-in {
		animation: slideIn 0.2s ease-out;
	}
	@keyframes slideIn {
		from { opacity: 0; transform: translateY(-8px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
