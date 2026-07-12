<script lang="ts">
	// Démo storefront reliée au widget publié de la licence Behar Tech.
	import HeroDeviceSelector from '$lib/widget/HeroDeviceSelector.svelte';

	const publicId = 'wdg_b8d8c22875f0499b97929660fc7bbdd0';
</script>

<svelte:head>
	<title>Réparation téléphone, console et montre — Démo Behar Tech Pro</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="page">
	<header class="nav">
		<div class="brand">
			<span class="brand__mark">B</span>
			<span class="brand__name">
				Behar Tech Pro
				<small>RÉPARATION SMARTPHONE</small>
			</span>
		</div>
		<nav class="nav__links">
			<a href="/reparation">Réparations</a>
			<a href="/reparation">Nos services</a>
			<a href="/reparation">Tarifs</a>
			<a href="/reparation">À propos</a>
			<a href="/reparation">Contact</a>
		</nav>
		<div class="nav__cta">
			<span class="pill">📍 Nos ateliers</span>
			<span class="pill pill--phone">📞 01 42 63 12 12</span>
		</div>
	</header>

	<main class="hero">
		<div class="hero__grid">
			<div class="hero__text">
				<p class="eyebrow">— RÉPARATION SANS RENDEZ-VOUS · VOTRE VILLE</p>
				<h1>
					Réparation téléphone<br />rapide, claire,<br />au bon prix<span class="dot">.</span>
				</h1>
				<p class="lede">
					Écran cassé, batterie, charge, caméra : passez directement à l'atelier. Diagnostic et
					devis gratuits, réparation possible dès 40 minutes selon la panne. Prix clairs, parmi les
					plus bas de la région.
				</p>
				<div class="hero__buttons">
					<button class="btn btn--primary" type="button">Devis gratuit maintenant →</button>
					<button class="btn btn--ghost" type="button">Voir les réparations →</button>
				</div>
			</div>
			<div class="hero__visual" aria-hidden="true">
				<div class="phone"></div>
			</div>
		</div>

		<div class="selector-wrap">
			<HeroDeviceSelector {publicId} />
		</div>

		<ul class="trust">
			<li><b>⚡ Sans rendez-vous</b><span>Passez quand vous voulez</span></li>
			<li><b>🕐 Dès 40 min</b><span>Réparation rapide</span></li>
			<li><b>✓ Devis gratuit</b><span>Diagnostic offert</span></li>
			<li><b>€ Prix bas région</b><span>Parmi les moins chers</span></li>
		</ul>
	</main>
</div>

<style>
	.page {
		--accent: #2a9d8f;
		--text: #1a1916;
		--muted: #6b6b6b;
		--line: rgba(26, 25, 22, 0.1);
		min-height: 100vh;
		background: linear-gradient(180deg, #ffffff 0%, #f4f5f0 100%);
		color: var(--text);
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
	}
	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		max-width: 1200px;
		margin: 0 auto;
		padding: 22px 24px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.brand__mark {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: #17211e;
		color: #fff;
		font-weight: 800;
	}
	.brand__name {
		display: flex;
		flex-direction: column;
		font-weight: 800;
		font-size: 19px;
		line-height: 1.05;
	}
	.brand__name small {
		font-size: 10px;
		letter-spacing: 0.12em;
		color: var(--muted);
		font-weight: 700;
	}
	.nav__links {
		display: flex;
		gap: 26px;
	}
	.nav__links a {
		color: var(--text);
		text-decoration: none;
		font-weight: 600;
		font-size: 15px;
	}
	.nav__links a:hover {
		color: var(--accent);
	}
	.nav__cta {
		display: flex;
		gap: 10px;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 9px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		background: #fff;
	}
	.hero {
		max-width: 1200px;
		margin: 0 auto;
		padding: 10px 24px 60px;
	}
	.hero__grid {
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: 30px;
		align-items: center;
		min-height: 420px;
	}
	.eyebrow {
		color: var(--accent);
		font-weight: 700;
		font-size: 13px;
		letter-spacing: 0.06em;
		margin: 0 0 14px;
	}
	h1 {
		font-size: clamp(38px, 5vw, 62px);
		line-height: 1.02;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 20px;
	}
	.dot {
		color: var(--accent);
	}
	.lede {
		color: #3f3f3b;
		font-size: 17px;
		line-height: 1.6;
		max-width: 520px;
		margin: 0 0 26px;
	}
	.hero__buttons {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
	}
	.btn {
		border: 0;
		border-radius: 12px;
		padding: 16px 24px;
		font-size: 16px;
		font-weight: 700;
		cursor: pointer;
	}
	.btn--primary {
		background: #0f3b34;
		color: #fff;
	}
	.btn--ghost {
		background: #fff;
		border: 1px solid var(--line);
		color: var(--text);
	}
	.hero__visual {
		display: grid;
		place-items: center;
	}
	.phone {
		width: 240px;
		height: 340px;
		border-radius: 34px;
		background: linear-gradient(150deg, #1b2733 0%, #33475b 55%, #4a637d 100%);
		box-shadow: 0 40px 90px rgba(26, 25, 22, 0.28);
		transform: rotate(14deg);
	}
	.selector-wrap {
		margin-top: 8px;
	}
	.trust {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 20px;
		list-style: none;
		margin: 34px 0 0;
		padding: 0;
	}
	.trust li {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.trust b {
		color: var(--accent);
		font-size: 15px;
	}
	.trust span {
		color: var(--muted);
		font-size: 13px;
	}

	@media (max-width: 860px) {
		.nav__links,
		.nav__cta {
			display: none;
		}
		.hero__grid {
			grid-template-columns: 1fr;
		}
		.hero__visual {
			display: none;
		}
		.trust {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
