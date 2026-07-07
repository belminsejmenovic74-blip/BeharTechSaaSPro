<script lang="ts">
	import { resolveIcon } from '$lib/cms/icons';
	import type { Block } from '$lib/cms/types';

	export let block: Block;

	$: box = `text-align:${block.align ?? 'left'};padding:${block.paddingY ?? 0}px ${block.paddingX ?? 0}px;`;
</script>

{#if block.type === 'heading'}
	<h2 style="{box} margin:0; font-size:{block.fontSize ?? 40}px; font-weight:{block.fontWeight ?? 700}; color:{block.color ?? '#1A1916'}; background:{block.bg ?? 'transparent'}; line-height:1.1; letter-spacing:-0.5px;">
		{block.text ?? ''}
	</h2>
{:else if block.type === 'text'}
	<p style="{box} margin:0; font-size:{block.fontSize ?? 16}px; font-weight:{block.fontWeight ?? 400}; color:{block.color ?? '#6B6B6B'}; background:{block.bg ?? 'transparent'}; line-height:1.6; white-space:pre-wrap;">
		{block.text ?? ''}
	</p>
{:else if block.type === 'button'}
	<div style={box}>
		<a
			href={block.href || '#'}
			style="display:inline-block; text-decoration:none; font-weight:600; font-size:{block.fontSize ?? 15}px; color:{block.color ?? '#FFFFFF'}; background:{block.bg ?? '#2A9D8F'}; border-radius:{block.radius ?? 10}px; padding:12px 24px;"
		>
			{block.text ?? 'Bouton'}
		</a>
	</div>
{:else if block.type === 'image'}
	<div style={box}>
		{#if block.src}
			<img src={block.src} alt={block.text ?? ''} style="display:inline-block; width:{block.width ?? 100}%; max-width:100%; height:auto; border-radius:{block.radius ?? 12}px;" />
		{:else}
			<div style="border:1px dashed rgba(26,25,22,0.2); border-radius:12px; padding:32px; color:#9a9a97; font-size:13px;">Image — choisis un fichier</div>
		{/if}
	</div>
{:else if block.type === 'icon'}
	<div style="{box} color:{block.color ?? '#2A9D8F'};">
		<svelte:component this={resolveIcon(block.icon)} size={block.fontSize ?? 32} />
	</div>
{:else if block.type === 'divider'}
	<div style={box}><hr style="border:none; border-top:1px solid {block.color ?? 'rgba(26,25,22,0.12)'}; margin:0;" /></div>
{:else if block.type === 'spacer'}
	<div style="height:{block.height ?? 40}px;"></div>
{/if}
