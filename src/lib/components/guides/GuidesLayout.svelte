<script lang="ts">
	// Enveloppe la section /guides/ et /faq/ dans le design system de la charte.
	// Réutilise le Header/Footer du site (fournis par (app)/+layout.svelte) :
	// ce composant ne stylise QUE la zone de contenu, via des tokens scopés.
	export let wide = false; // hub/pilier : grille large ; article : colonne ≤720px
</script>

<svelte:head>
	<!-- Source Serif 4 pour les titres éditoriaux (charte §2), non bloquant. -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap"
	/>
</svelte:head>

<div class="guides-scope" class:wide>
	<slot />
</div>

<style>
	.guides-scope {
		/* Tokens de la charte graphique (§1). Décision D3 : accent = #2A9D8F. */
		--bg: #fafaf8;
		--surface: #ffffff;
		--text: #1d1d1f;
		--text-muted: #6e6e73;
		--accent: #2a9d8f;
		--accent-hover: #238277;
		--accent-soft: rgba(42, 157, 143, 0.08);
		--peach: #f3d7c8;
		--border: #e8e8e4;
		--serif: 'Source Serif 4', Lora, Georgia, serif;

		background: var(--bg);
		color: var(--text);
		font-family: Inter, system-ui, sans-serif;
		font-size: 17px;
		line-height: 1.7;
		/* Dégage le header fixe du site. */
		padding-top: calc(var(--navigation-height, 3.5rem) + 2.5rem);
		padding-bottom: 4rem;
		min-height: 100vh;
	}

	:global(.guides-scope a) {
		color: var(--accent);
		text-decoration: none;
	}
	:global(.guides-scope a:hover) {
		color: var(--accent-hover);
		text-decoration: underline;
	}
	:global(.guides-scope :focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
		border-radius: 4px;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.guides-scope *) {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
