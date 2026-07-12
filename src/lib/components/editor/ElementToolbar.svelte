<script lang="ts">
	import { GripVertical, Pencil, RotateCcw, Type, Image as ImageIcon, MousePointer2 } from 'lucide-svelte';
	import { resetOverride, type Registration } from '$lib/editor/store';

	export let registration: Registration;
	export let onMoveStart: (e: PointerEvent) => void;

	const kindLabel: Record<string, string> = {
		heading: 'Titre',
		text: 'Texte',
		button: 'Bouton',
		image: 'Image',
		container: 'Bloc'
	};

	$: label = registration.label || kindLabel[registration.kind] || 'Élément';

	function editText() {
		registration.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
	}

	function reset() {
		resetOverride(registration.id);
	}
</script>

<div class="cms-toolbar" on:pointerdown|stopPropagation>
	<button class="grip" title="Déplacer" on:pointerdown={onMoveStart} aria-label="Déplacer">
		<GripVertical class="size-4" />
	</button>

	<span class="chip">
		{#if registration.kind === 'image'}
			<ImageIcon class="size-3" />
		{:else if registration.kind === 'button'}
			<MousePointer2 class="size-3" />
		{:else}
			<Type class="size-3" />
		{/if}
		{label}
	</span>

	{#if registration.path && registration.kind !== 'image'}
		<button class="btn" title="Modifier le texte" on:click={editText}>
			<Pencil class="size-3.5" />
		</button>
	{/if}

	<button class="btn" title="Réinitialiser le style" on:click={reset}>
		<RotateCcw class="size-3.5" />
	</button>
</div>

<style>
	.cms-toolbar {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 4px;
		border-radius: 10px;
		border: 1px solid rgba(26, 25, 22, 0.08);
		background: rgba(255, 255, 255, 0.96);
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 24px rgba(26, 25, 22, 0.14);
		white-space: nowrap;
	}
	.grip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 7px;
		color: #6b6b6b;
		cursor: grab;
		touch-action: none;
	}
	.grip:active {
		cursor: grabbing;
		background: rgba(42, 157, 143, 0.1);
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 0 8px;
		height: 26px;
		font-size: 12px;
		font-weight: 600;
		color: #1a1916;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 7px;
		color: #6b6b6b;
		cursor: pointer;
	}
	.btn:hover {
		background: rgba(26, 25, 22, 0.06);
		color: #1a1916;
	}
</style>
