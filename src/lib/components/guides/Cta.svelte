<script lang="ts">
	import { CTA_VARIANTS, type CtaKey } from '$lib/guides/cta';
	// Bloc CTA de fin d'article (charte §3, F7). Paramétré par la clé `cta`
	// du frontmatter — jamais de texte codé en dur côté article.
	export let variant: CtaKey;
	$: cta = CTA_VARIANTS[variant];
</script>

<section class="cta">
	<h2 class="cta-title">{cta.title}</h2>
	<p class="cta-text">{cta.text}</p>
	<a class="cta-btn" href={cta.href}>{cta.buttonLabel}</a>
</section>

<style>
	.cta {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 32px;
		margin: 3rem 0;
		text-align: center;
	}
	.cta-title {
		font-family: Inter, system-ui, sans-serif;
		font-size: 22px;
		font-weight: 600;
		margin: 0 0 0.5rem;
		color: var(--text);
	}
	.cta-text {
		font-size: 16px;
		color: var(--text-muted);
		margin: 0 auto 1.5rem;
		max-width: 40ch;
	}
	.cta-btn {
		display: inline-block;
		background: var(--accent);
		color: #fff;
		font-weight: 600;
		padding: 12px 24px;
		border-radius: 12px;
		text-decoration: none;
		transition: background 150ms ease;
	}
	.cta-btn:hover {
		background: var(--accent-hover);
		color: #fff;
		text-decoration: none;
	}
</style>
