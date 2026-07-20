<script lang="ts">
	import GuidesLayout from '$lib/components/guides/GuidesLayout.svelte';
	import Breadcrumb from '$lib/components/guides/Breadcrumb.svelte';
	import SeoHead from '$lib/components/guides/SeoHead.svelte';
	import { ORG, absUrl } from '$lib/guides/config';

	const title = 'Blog — Behar Tech Pro';
	const description =
		'Le blog Behar Tech Pro : conseils, actualités et bonnes pratiques pour les ateliers de réparation de smartphones. Premiers articles bientôt disponibles.';

	// Sujets prévus — cartes « à venir » (pas de faux contenu publié).
	const upcoming = [
		{
			kicker: 'Gestion d’atelier',
			title: 'Réduire les délais de réparation sans embaucher',
			teaser: 'Les leviers d’organisation qui font gagner du temps sur chaque dossier.'
		},
		{
			kicker: 'Rentabilité',
			title: 'Fixer ses prix de réparation au juste niveau',
			teaser: 'Une méthode simple pour calculer une marge saine, pièces et main-d’œuvre comprises.'
		},
		{
			kicker: 'Relation client',
			title: 'Transformer chaque réparation en avis 5 étoiles',
			teaser: 'Le suivi digital qui rassure le client et améliore votre réputation.'
		}
	];
</script>

<SeoHead {title} {description} canonical={absUrl('/blog')} image={ORG.logo} imageAlt={ORG.name} />

<GuidesLayout wide>
	<div class="container">
		<Breadcrumb items={[{ name: 'Accueil', href: '/' }, { name: 'Blog' }]} />

		<header class="hero">
			<p class="kicker">Blog</p>
			<h1>Conseils et actualités pour votre atelier</h1>
			<p class="lede">
				Nos premiers articles arrivent avec le lancement. En attendant, retrouvez nos
				<a href="/guides/">guides pratiques</a> pour créer et gérer votre atelier de réparation.
			</p>
		</header>

		<div class="grid">
			{#each upcoming as item}
				<article class="card">
					<span class="badge">{item.kicker}</span>
					<h2 class="card-title">{item.title}</h2>
					<p class="teaser">{item.teaser}</p>
					<p class="soon">Bientôt disponible</p>
				</article>
			{/each}
		</div>
	</div>
</GuidesLayout>

<style>
	.container {
		max-width: 1080px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
	.hero {
		text-align: center;
		margin: 1.5rem 0 3rem;
	}
	.kicker {
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent);
		font-weight: 600;
		margin: 0 0 0.5rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(30px, 5vw, 52px);
		line-height: 1.15;
		letter-spacing: -0.01em;
		margin: 0.25rem 0 1rem;
	}
	.lede {
		font-size: 19px;
		color: var(--text-muted);
		max-width: 640px;
		margin: 0 auto;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 24px;
	}
	.badge {
		align-self: flex-start;
		padding: 4px 12px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
	}
	.card-title {
		font-size: 20px;
		font-weight: 600;
		margin: 0;
		color: var(--text);
	}
	.teaser {
		font-size: 15px;
		color: var(--text-muted);
		margin: 0;
	}
	.soon {
		margin: auto 0 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
	}
</style>
