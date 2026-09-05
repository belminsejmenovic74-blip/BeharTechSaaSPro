<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { ArrowRight } from 'lucide-svelte';
	const loginUrl = env.PUBLIC_LOGIN_URL || '/connexion';
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />
	<link rel="canonical" href="https://behartechpro.fr/" />
	<title>Behar Tech Pro — Bientôt disponible</title>
	<meta name="description" content="Une nouvelle ère pour la réparation. Moins de gestion. Plus de réparations. De nouvelles possibilités avec Behar Tech Pro." />
</svelte:head>

<div class="coming-soon">
	<header class="masthead">
		<img src="/coming-soon/behar-tech-pro.png" alt="BEHAR • TECH PRO" width="346" height="96" />
		<p class="status"><span aria-hidden="true"></span>Bientôt disponible</p>
	</header>
	<main>
		<div class="ribbons" aria-hidden="true">
			<svg viewBox="0 0 1536 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<linearGradient id="silk" x1="0" y1="0" x2="1" y2=".3">
						<stop stop-color="#DCEFEB" stop-opacity=".12"/><stop offset=".28" stop-color="#fff" stop-opacity=".65"/><stop offset=".49" stop-color="#A9D6CF" stop-opacity=".5"/><stop offset=".65" stop-color="#fff" stop-opacity=".85"/><stop offset=".86" stop-color="#DCEFEB" stop-opacity=".3"/><stop offset="1" stop-color="#A9D6CF" stop-opacity=".22"/>
					</linearGradient>
					<linearGradient id="fold" x1="0" y1="0" x2=".9" y2="1">
						<stop stop-color="#fff" stop-opacity=".15"/><stop offset=".38" stop-color="#DCEFEB" stop-opacity=".4"/><stop offset=".55" stop-color="#A9D6CF" stop-opacity=".66"/><stop offset=".6" stop-color="#fff" stop-opacity=".9"/><stop offset=".79" stop-color="#DCEFEB" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
					</linearGradient>
					<linearGradient id="edge" x2=".3" y2="1"><stop stop-color="#A9D6CF" stop-opacity=".55"/><stop offset=".6" stop-color="#2A9D8F" stop-opacity=".28"/><stop offset="1" stop-color="#DCEFEB" stop-opacity="0"/></linearGradient>
					<linearGradient id="fade" x2="0" y2="1"><stop stop-color="white"/><stop offset=".7" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
					<mask id="bottom-fade"><rect width="1536" height="800" fill="url(#fade)"/></mask>
					<filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
				</defs>
				<g mask="url(#bottom-fade)">
					<path d="M-90 -40 C-10 62 201 104 199 300 C196 401 106 471 24 432 C91 567 266 689 688 802 L514 845 C213 765 47 616 -37 436 C-109 274 66 189 -90 -40Z" fill="url(#silk)" stroke="url(#edge)"/>
					<path d="M-58 3 C152 133 156 218 145 323 C128 410 61 446 24 432 C-3 391 -17 365 -32 338 C73 419 95 405 111 324 C135 193 53 99 -58 3Z" fill="#A9D6CF" opacity=".17" filter="url(#soft)"/>
					<path d="M-95 160 C58 265 116 443 222 528 C336 615 428 727 688 802 C340 758 95 646 18 498 C-25 410 -74 322 -95 160Z" fill="url(#fold)" stroke="url(#edge)"/>
					<path d="M-33 330 C67 401 123 465 222 528 C355 616 432 719 651 791" fill="none" stroke="white" stroke-opacity=".78" stroke-width="3"/>
					<path d="M1645 -90 C1477 53 1416 180 1433 337 C1462 531 1471 623 1357 646 C1258 666 1168 540 1038 760 L1021 851 C1148 687 1176 697 1290 687 C1512 669 1527 451 1564 334 C1611 187 1720 103 1645 -90Z" fill="url(#silk)" stroke="url(#edge)"/>
					<path d="M1619 -45 C1515 100 1450 257 1433 337 C1424 467 1355 542 1233 590 C1144 624 1077 651 1038 760 C1154 618 1231 670 1357 646 C1456 627 1462 534 1433 337 C1420 175 1498 38 1619 -45Z" fill="url(#fold)" stroke="url(#edge)"/>
					<path d="M1624 -28 C1481 154 1424 244 1435 357 C1455 513 1467 613 1364 643 C1284 669 1203 570 1115 642" fill="none" stroke="white" stroke-opacity=".75" stroke-width="3"/>
				</g>
			</svg>
		</div>
		<section class="hero" aria-labelledby="launch-title">
			<p class="eyebrow">UNE NOUVELLE ÈRE POUR LA RÉPARATION</p>
			<h1 id="launch-title"><span>On arrive bientôt</span><span>pour transformer</span><span class="accent">vos ateliers.</span></h1>
			<p class="description">Moins de gestion. Plus de réparations. De nouvelles possibilités.</p>
		</section>
	</main>
	<footer class="client-access">
		<p>Pour ceux qui ont une longueur d’avance.</p>
		<a class="login" href={loginUrl}>Connexion <ArrowRight size={17} strokeWidth={1.5} aria-hidden="true" /></a>
		<p class="signature">L’atelier de demain commence ici.</p>
	</footer>
</div>

<style>
	:global(body:has(.coming-soon) .crisp-client), :global(body:has(.coming-soon) .calendly-badge-widget) { display: none !important; }
	.coming-soon { min-height: 100svh; display: flex; flex-direction: column; overflow: clip; background: #FFFFFF; color: #1A1916; font-family: 'DM Sans', Arial, sans-serif; -webkit-font-smoothing: antialiased; padding: 0 clamp(20px, 3.65vw, 70px); }
	.masthead { height: 74px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #DDDFDC; padding: 0 30px; position: relative; z-index: 2; }
	.masthead img { width: 224px; height: auto; display: block; }
	.status { display: flex; align-items: center; gap: 11px; font-size: 16px; color: #6B6B6B; margin: 0; }
	.status span { width: 11px; height: 11px; border-radius: 50%; background: #2A9D8F; }
	main { position: relative; display: grid; place-items: center; flex: 1; min-height: 600px; }
	.ribbons { position: absolute; inset: 0 calc(-1 * clamp(20px, 3.65vw, 70px)); pointer-events: none; }
	.ribbons svg { width: 100%; height: 100%; }
	.hero { position: relative; z-index: 1; text-align: center; padding: 66px 0 80px; animation: appear 1s ease-out both; }
	.eyebrow { display: block; padding: 0; font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; line-height: 1.5; letter-spacing: 2.6px; color: #6B6B6B; margin: 0 0 36px; }
	h1 { font-family: 'DM Sans', Arial, sans-serif; font-size: clamp(64px, 7.04vw, 108px); font-weight: 700; letter-spacing: -.055em; line-height: 1.02; margin: 0; }
	h1 span { display: block; }
	.accent { color: #2A9D8F; }
	.description { color: #6B6B6B; font-size: clamp(17px, 1.5vw, 23px); letter-spacing: -.035em; margin: 25px 0 0; }
	.client-access { position: relative; z-index: 1; text-align: center; border-top: 1px solid #DDDFDC; padding: 21px 0 44px; color: #6B6B6B; font-size: 16px; }
	.client-access p { margin: 0; }
	.login { display: inline-flex; align-items: center; justify-content: center; gap: 17px; min-height: 49px; min-width: 181px; margin-top: 16px; border-radius: 10px; background: #1A1916; color: white; text-decoration: none; transition: background .2s, box-shadow .2s; }
	.login:hover { background: #34332e; box-shadow: 0 4px 14px #1a191614; }
	.login:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 5px; }
	.client-access .signature { font-size: 14px; margin-top: 30px; }
	@keyframes appear { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
	@media (min-width: 769px) and (max-height: 850px) { main { min-height: 440px; } .hero { padding: 38px 0 44px; } h1 { font-size: clamp(64px, 11vh, 96px); } .eyebrow { margin-bottom: 23px; } .client-access { padding-bottom: 24px; } .client-access .signature { margin-top: 22px; } }
	@media (max-width: 768px) { .masthead { height: 76px; padding: 0; } .masthead img { width: 180px; } .status { font-size: 12px; gap: 7px; } .status span { width: 7px; height: 7px; } main { min-height: 490px; } .hero { width: 100%; padding: 75px 0 85px; } h1 { font-size: clamp(37px, 7.8vw, 60px); letter-spacing: -.06em; line-height: 1.08; } .eyebrow { font-size: 10px; letter-spacing: 1.6px; padding: 0; margin-bottom: 28px; } .description { font-size: 16px; max-width: 340px; margin: 25px auto 0; line-height: 1.6; padding: 0 10px; } .ribbons { inset: 0 -24%; opacity: .65; } .client-access { font-size: 14px; padding: 25px 0 28px; } .client-access .signature { font-size: 12px; } }
	@media (max-width: 380px) { .masthead img { width: 155px; } .status { font-size: 10px; } .eyebrow { font-size: 9px; letter-spacing: 1.2px; } main { min-height: 450px; } }
	@media (prefers-reduced-motion: reduce) { .hero { animation: none; } .login { transition: none; } }
</style>
