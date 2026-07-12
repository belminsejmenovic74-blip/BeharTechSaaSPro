<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		beginGesture,
		breakpoint,
		endGesture,
		getOverride,
		getRegistration,
		revision,
		selectedId,
		setLayout
	} from '$lib/editor/store';
	import { resolveLayout } from '$lib/editor/elements';
	import ElementToolbar from './ElementToolbar.svelte';

	type Rect = { left: number; top: number; width: number; height: number };
	let rect: Rect | null = null;
	let raf = 0;

	$: selId = $selectedId;

	function recompute() {
		const reg = getRegistration(selId);
		if (!reg || !reg.node.isConnected) {
			rect = null;
			return;
		}
		const r = reg.node.getBoundingClientRect();
		rect = { left: r.left, top: r.top, width: r.width, height: r.height };
	}

	// Recalcule sur changement de sélection / mutation / breakpoint.
	$: void selId, $revision, $breakpoint, recompute();

	// Suivi scroll/resize.
	function loop() {
		recompute();
		raf = requestAnimationFrame(loop);
	}
	onMount(() => {
		raf = requestAnimationFrame(loop);
	});
	onDestroy(() => cancelAnimationFrame(raf));

	/* ---- Déplacement / redimensionnement --------------------------------- */
	type Dir = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

	let startX = 0;
	let startY = 0;
	let baseDx = 0;
	let baseDy = 0;
	let baseW = 0;
	let baseH = 0;
	let activeDir: Dir | null = null;

	function gestureStart(dir: Dir, e: PointerEvent) {
		if (!selId) return;
		const reg = getRegistration(selId);
		if (!reg) return;
		e.preventDefault();
		e.stopPropagation();
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);

		activeDir = dir;
		startX = e.clientX;
		startY = e.clientY;
		const bp = get(breakpoint);
		const l = resolveLayout(getOverride(selId), bp);
		baseDx = l.dx ?? 0;
		baseDy = l.dy ?? 0;
		const r = reg.node.getBoundingClientRect();
		baseW = l.w ?? Math.round(r.width);
		baseH = l.h ?? Math.round(r.height);

		beginGesture();
		window.addEventListener('pointermove', gestureMove);
		window.addEventListener('pointerup', gestureEnd, { once: true });
	}

	function gestureMove(e: PointerEvent) {
		if (!activeDir || !selId) return;
		const dX = e.clientX - startX;
		const dY = e.clientY - startY;
		const bp = get(breakpoint);
		const patch: Record<string, number> = {};

		if (activeDir === 'move') {
			patch.dx = Math.round(baseDx + dX);
			patch.dy = Math.round(baseDy + dY);
		} else {
			const dir = activeDir;
			if (dir.includes('e')) patch.w = Math.max(20, Math.round(baseW + dX));
			if (dir.includes('s')) patch.h = Math.max(12, Math.round(baseH + dY));
			if (dir.includes('w')) {
				patch.w = Math.max(20, Math.round(baseW - dX));
				patch.dx = Math.round(baseDx + dX);
			}
			if (dir.includes('n')) {
				patch.h = Math.max(12, Math.round(baseH - dY));
				patch.dy = Math.round(baseDy + dY);
			}
		}
		setLayout(selId, bp, patch, true);
	}

	function gestureEnd() {
		window.removeEventListener('pointermove', gestureMove);
		activeDir = null;
		endGesture();
	}

	const handles: { dir: Dir; cursor: string; x: number; y: number }[] = [
		{ dir: 'nw', cursor: 'nwse-resize', x: 0, y: 0 },
		{ dir: 'n', cursor: 'ns-resize', x: 0.5, y: 0 },
		{ dir: 'ne', cursor: 'nesw-resize', x: 1, y: 0 },
		{ dir: 'e', cursor: 'ew-resize', x: 1, y: 0.5 },
		{ dir: 'se', cursor: 'nwse-resize', x: 1, y: 1 },
		{ dir: 's', cursor: 'ns-resize', x: 0.5, y: 1 },
		{ dir: 'sw', cursor: 'nesw-resize', x: 0, y: 1 },
		{ dir: 'w', cursor: 'ew-resize', x: 0, y: 0.5 }
	];

	$: reg = getRegistration(selId);
</script>

{#if rect && reg}
	<div class="cms-frame" style="left:{rect.left}px; top:{rect.top}px; width:{rect.width}px; height:{rect.height}px;">
		<!-- Barre d'outils flottante -->
		<div class="cms-frame-toolbar">
			<ElementToolbar registration={reg} onMoveStart={(e) => gestureStart('move', e)} />
		</div>

		<!-- Poignées de redimensionnement -->
		{#each handles as h}
			<button
				type="button"
				class="cms-handle"
				style="left:{h.x * 100}%; top:{h.y * 100}%; cursor:{h.cursor};"
				on:pointerdown={(e) => gestureStart(h.dir, e)}
				aria-label="Redimensionner"
			></button>
		{/each}
	</div>
{/if}

<style>
	.cms-frame {
		position: fixed;
		z-index: 2147482000;
		pointer-events: none;
		outline: 1.5px solid #2a9d8f;
		box-shadow: 0 0 0 1px rgba(42, 157, 143, 0.25);
		border-radius: 2px;
	}
	.cms-frame-toolbar {
		position: absolute;
		left: 0;
		top: -44px;
		pointer-events: auto;
	}
	.cms-handle {
		position: absolute;
		width: 11px;
		height: 11px;
		margin-left: -6px;
		margin-top: -6px;
		background: #fff;
		border: 1.5px solid #2a9d8f;
		border-radius: 50%;
		padding: 0;
		pointer-events: auto;
		box-shadow: 0 1px 3px rgba(26, 25, 22, 0.2);
		touch-action: none;
	}
	.cms-handle:hover {
		background: #2a9d8f;
	}
</style>
