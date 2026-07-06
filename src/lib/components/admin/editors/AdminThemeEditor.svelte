<script lang="ts">
	import type { Theme } from '$lib/cms/types';
	import Field from '../Field.svelte';
	import Color from '../Color.svelte';
	import Toggle from '../Toggle.svelte';

	export let theme: Theme;

	const shadows: Theme['shadow'][] = ['none', 'soft', 'medium', 'strong'];
</script>

<div class="grid gap-5 sm:grid-cols-2">
	<Field label="Fond général"><Color bind:value={theme.background} /></Field>
	<Field label="Texte principal"><Color bind:value={theme.text} /></Field>
	<Field label="Texte secondaire"><Color bind:value={theme.muted} /></Field>
	<Field label="Accent"><Color bind:value={theme.accent} /></Field>
	<Field label="Boutons"><Color bind:value={theme.button} /></Field>
	<Field label="Cartes"><Color bind:value={theme.card} /></Field>

	<Field label="Rayon des cartes ({theme.radius}px)">
		<input type="range" min="0" max="40" bind:value={theme.radius} class="w-full accent-emerald-600" />
	</Field>

	<Field label="Intensité des ombres">
		<div class="flex gap-2">
			{#each shadows as s}
				<button
					type="button"
					on:click={() => (theme.shadow = s)}
					class="flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize transition {theme.shadow === s
						? 'border-emerald-500 bg-emerald-50 text-emerald-700'
						: 'border-slate-300 text-slate-500 hover:bg-slate-50'}"
				>
					{s}
				</button>
			{/each}
		</div>
	</Field>

	<div class="sm:col-span-2">
		<Field label="Effet glass léger (header)">
			<Toggle bind:checked={theme.glass} label={theme.glass ? 'Activé' : 'Désactivé'} />
		</Field>
	</div>
</div>

<p class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
	Astuce : « Réinitialiser » (en haut) restaure la DA Behar Tech Pro par défaut
	(#FAFAF8 / #1A1916 / #6B6B6B / accent #2A9D8F).
</p>
