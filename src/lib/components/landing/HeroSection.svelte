<script lang="ts">
	import { ArrowRightIcon } from 'lucide-svelte';
	import { getCms } from '$lib/cms/context';

	const cms = getCms();
	$: hero = $cms.hero;
	$: subtitleLines = hero.subtitle.split('\n');
</script>

<section
	id="hero"
	class="relative isolate flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 py-28 text-center md:px-8"
>
	<!-- Halo chaud (derrière badge + titre) -->
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 -z-10 mx-auto max-w-5xl"
		style="background: radial-gradient(58% 48% at 50% 44%, rgba(255,214,186,0.85), transparent 70%);"
	></div>

	{#if hero.badge}
		<a
			href="#pense"
			class="-translate-y-4 animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-[rgba(26,25,22,0.08)] bg-white/70 px-4 py-1.5 text-sm text-gray-500 opacity-0 shadow-sm backdrop-blur transition hover:text-gray-700"
		>
			{hero.badge}
			<ArrowRightIcon class="size-3.5" />
		</a>
	{/if}

	<h1
		class="-translate-y-4 animate-fade-in mt-6 max-w-4xl text-balance py-2 text-6xl font-medium leading-[1.02] tracking-tighter opacity-0 [--animation-delay:150ms] md:text-7xl lg:text-8xl"
		style="color: var(--bt-text)"
	>
		{hero.title}
	</h1>

	<p
		class="-translate-y-4 animate-fade-in mt-6 max-w-2xl text-balance text-lg text-gray-500 opacity-0 [--animation-delay:300ms] md:text-xl"
	>
		{#each subtitleLines as line, i}
			{#if i > 0}<br class="hidden md:block" />{/if}
			{line}
		{/each}
	</p>

	{#if hero.ctaLabel}
		<a
			href={hero.ctaHref}
			class="-translate-y-4 animate-fade-in mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white opacity-0 shadow-sm transition hover:opacity-90 [--animation-delay:450ms]"
			style="background: var(--bt-button)"
		>
			{hero.ctaLabel}
			<ArrowRightIcon class="size-4" />
		</a>
	{/if}

	{#if hero.showImage && hero.image}
		<div class="relative mt-16 w-full max-w-[1200px] animate-fade-up opacity-0 [--animation-delay:400ms] md:mt-20">
			<img
				src={hero.image}
				alt="Aperçu Behar Tech Pro"
				loading="lazy"
				class="relative w-full rounded-2xl border border-[rgba(26,25,22,0.08)]"
				style="box-shadow: var(--bt-shadow)"
			/>
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 bottom-0 h-28"
				style="background: linear-gradient(to top, var(--bt-bg), transparent);"
			></div>
		</div>
	{/if}
</section>
