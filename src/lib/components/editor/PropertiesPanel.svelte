<script lang="ts">
	import { X, Wand2 } from 'lucide-svelte';
	import { getRegistration, resetOverride, selectedId } from '$lib/editor/store';
	import Typography from './panels/Typography.svelte';
	import Fill from './panels/Fill.svelte';
	import LayoutPanel from './panels/LayoutPanel.svelte';
	import ButtonProps from './panels/ButtonProps.svelte';
	import ImageProps from './panels/ImageProps.svelte';

	$: id = $selectedId;
	$: reg = getRegistration(id);

	const kindLabel: Record<string, string> = {
		heading: 'Titre',
		text: 'Texte',
		button: 'Bouton',
		image: 'Image',
		container: 'Bloc'
	};
	$: showBox = reg ? reg.kind === 'button' || reg.kind === 'image' || reg.kind === 'container' : false;
	$: showType = reg ? reg.kind !== 'image' : false;
</script>

<aside class="cms-props" class:open={!!(id && reg)}>
	{#if id && reg}
		<div class="head">
			<div>
				<div class="title">{reg.label || kindLabel[reg.kind] || 'Élément'}</div>
				<div class="sub">Propriétés</div>
			</div>
			<button class="icon" title="Fermer" on:click={() => selectedId.set(null)}>
				<X class="size-4" />
			</button>
		</div>

		<div class="body">
			{#if reg.kind === 'image'}
				<ImageProps {id} />
			{:else if reg.kind === 'button'}
				<ButtonProps {id} />
			{/if}
			{#if showType}
				<Typography {id} />
			{/if}
			<Fill {id} {showBox} />
			<LayoutPanel {id} />
		</div>

		<div class="foot">
			<button class="reset" on:click={() => resetOverride(id)}>
				<Wand2 class="size-3.5" /> Réinitialiser cet élément
			</button>
		</div>
	{/if}
</aside>

<style>
	.cms-props {
		position: fixed;
		top: 0;
		right: 0;
		height: 100vh;
		width: 300px;
		z-index: 2147482500;
		display: flex;
		flex-direction: column;
		background: #fff;
		border-left: 1px solid rgba(26, 25, 22, 0.08);
		box-shadow: -12px 0 40px rgba(26, 25, 22, 0.08);
		transform: translateX(100%);
		transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
	}
	.cms-props.open {
		transform: translateX(0);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid rgba(26, 25, 22, 0.07);
	}
	.title {
		font-size: 14px;
		font-weight: 700;
		color: #1a1916;
	}
	.sub {
		font-size: 11px;
		color: #9a9a95;
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
	}
	.foot {
		padding: 14px 16px;
		border-top: 1px solid rgba(26, 25, 22, 0.07);
	}
	.reset {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		justify-content: center;
		height: 36px;
		border-radius: 9px;
		border: 1px solid rgba(26, 25, 22, 0.12);
		font-size: 12px;
		font-weight: 600;
		color: #6b6b6b;
		cursor: pointer;
	}
	.reset:hover {
		border-color: rgba(42, 157, 143, 0.4);
		color: #2a9d8f;
	}
</style>
