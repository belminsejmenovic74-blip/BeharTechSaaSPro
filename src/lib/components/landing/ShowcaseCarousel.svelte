<script lang="ts">
	import { CheckIcon, ArrowLeftIcon, ArrowRightIcon } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { resolveIcon } from '$lib/cms/icons';
	import type { ShowcaseContent } from '$lib/cms/types';

	export let config: ShowcaseContent;
	export let id: string | undefined = undefined;

	let active = 0;
	$: slides = config.slides.filter((s) => s.visible !== false);
	$: count = slides.length;
	$: active = Math.min(active, Math.max(0, count - 1));
	$: slide = slides[active] ?? slides[0];
	$: leftTitle = config.sideTitle || slide?.sideTitle || '';
	$: cards = (slide?.cards ?? []).filter((c) => c.visible !== false);

	const teal = 'var(--bt-accent)';
	function goto(i: number) {
		active = (i + count) % count;
	}
	const next = () => goto(active + 1);
	const prev = () => goto(active - 1);

	let touchX: number | null = null;
	function onTouchStart(e: TouchEvent) {
		touchX = e.touches[0].clientX;
	}
	function onTouchEnd(e: TouchEvent) {
		if (touchX === null) return;
		const dx = e.changedTouches[0].clientX - touchX;
		if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
		touchX = null;
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') next();
		if (e.key === 'ArrowLeft') prev();
	}
</script>

<section
	{id}
	class="relative scroll-mt-24 overflow-hidden px-5 py-24 md:py-28"
	tabindex="0"
	role="group"
	aria-roledescription="carrousel"
	on:keydown={onKey}
>
	<div class="mx-auto max-w-[1520px]">
		<!-- En-tête -->
		<div class="mx-auto max-w-3xl text-center">
			<h2 class="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-black sm:text-5xl md:text-6xl">
				{#each config.titleLines as line}
					<span class="block">{line}</span>
				{/each}
			</h2>
			{#if config.subtitle}
				<p class="mx-auto mt-5 max-w-2xl text-lg text-gray-500">{config.subtitle}</p>
			{/if}
			{#if config.subtitleTeal}
				<p class="mt-4 text-lg font-semibold" style="color:{teal}">{config.subtitleTeal}</p>
			{/if}
			{#if config.description}
				<p class="mx-auto mt-3 max-w-2xl text-lg text-gray-500">{config.description}</p>
			{/if}
		</div>

		<!-- Corps : gauche / centre / droite -->
		<div class="mt-16 grid grid-cols-1 items-center gap-8 lg:[grid-template-columns:280px_minmax(0,1fr)_300px] lg:gap-[clamp(2rem,4vw,4.5rem)]">
			<!-- GAUCHE -->
			<div class="order-2 lg:order-1">
				{#key active}
					<div in:fade={{ duration: 250 }} class="mx-auto max-w-sm lg:mx-0">
						<h3 class="text-lg font-bold" style="color:{teal}">{leftTitle}</h3>
						<ul class="mt-5 flex flex-col gap-4">
							{#each slide.bullets as b}
								<li class="flex items-start gap-3 text-sm text-black">
									<span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full" style="background:{teal}">
										<CheckIcon class="size-3 text-white" strokeWidth={3} />
									</span>
									<span>{b}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/key}
			</div>

			<!-- CENTRE -->
			<div class="relative order-1 lg:order-2">
				<button
					on:click={prev}
					aria-label="Précédent"
					class="absolute -left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-md transition hover:text-[#2A9D8F] sm:-left-9 lg:-left-14"
				>
					<ArrowLeftIcon class="size-5" />
				</button>
				<button
					on:click={next}
					aria-label="Suivant"
					class="absolute -right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-md transition hover:text-[#2A9D8F] sm:-right-9 lg:-right-14"
				>
					<ArrowRightIcon class="size-5" />
				</button>

				<div on:touchstart={onTouchStart} on:touchend={onTouchEnd}>
					{#key active}
						<div in:fade={{ duration: 250 }}>
							{#if config.layout === 'phone'}
								<!-- Téléphone + cartes flottantes -->
								<div class="relative mx-auto flex max-w-[260px] justify-center lg:max-w-none">
									<img
										src={slide.img}
										alt={slide.tab}
										class="relative z-10 h-[420px] w-auto object-contain lg:h-[560px]"
										style="filter: var(--bt-shadow-float);"
									/>
									<!-- cartes : grille dessous en mobile -->
									<div class="absolute inset-0 z-20 hidden lg:block">
										{#each cards as c, i}
											<div
												class="absolute w-40 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.18)] {i === 0
													? '-left-3 top-6'
													: i === 1
														? '-left-3 bottom-6'
														: i === 2
															? '-right-3 top-6'
															: '-right-3 bottom-6'}"
											>
												<svelte:component this={resolveIcon(c.icon)} class="size-4" style="color:{teal}" />
												<p class="mt-1.5 text-xs font-semibold text-black">{c.title}</p>
												<p class="mt-0.5 text-[11px] leading-snug text-gray-500">{c.text}</p>
											</div>
										{/each}
									</div>
								</div>
								<div class="mt-6 grid grid-cols-2 gap-3 lg:hidden">
									{#each cards as c}
										<div class="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
											<svelte:component this={resolveIcon(c.icon)} class="size-4" style="color:{teal}" />
											<p class="mt-1.5 text-xs font-semibold text-black">{c.title}</p>
											<p class="text-[11px] leading-snug text-gray-500">{c.text}</p>
										</div>
									{/each}
								</div>
							{:else if slide.device}
								<!-- Appareil détouré (fond transparent) : flotte, ombre portée CSS
								     qui épouse la silhouette. Aucun cadre, aucun fond parasite. -->
								<div class="flex h-[300px] items-center justify-center sm:h-[460px] lg:h-[580px]">
									<img
										src={slide.img}
										alt={slide.tab}
										class="max-h-full w-auto max-w-full object-contain"
										style="filter: var(--bt-shadow-float);"
									/>
								</div>
							{:else}
								<!-- Capture plein cadre : encadrée dans une carte premium (bord fin +
								     coins arrondis + ombre douce CSS). Dimensionnée par la largeur. -->
								<div class="mx-auto flex min-h-[300px] items-center justify-center sm:min-h-[460px] lg:min-h-[580px]">
									<div
										class="w-full max-w-[820px] overflow-hidden border bg-white"
										style="border-radius: var(--bt-radius); border-color: rgba(26,25,22,0.08); box-shadow: var(--bt-shadow);"
									>
										<img src={slide.img} alt={slide.tab} class="block h-auto w-full" />
									</div>
								</div>
							{/if}
						</div>
					{/key}
				</div>
			</div>

			<!-- DROITE : onglets -->
			<div class="order-3">
				<ul class="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
					{#each slides as s, i}
						<li class="shrink-0 lg:w-full">
							<button
								on:click={() => goto(i)}
								class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl border px-4 py-3 text-left text-sm transition"
								style={i === active && config.tabStyle === 'filled'
									? `background:${teal};border-color:${teal};color:#fff`
									: i === active
										? `border-color:${teal};color:#000;background:#fff`
										: 'border-color:#e5e7eb;color:#6b7280;background:#fff'}
							>
								{#if config.tabStyle === 'dots'}
									<span class="size-2 shrink-0 rounded-full" style="background:{i === active ? teal : '#d1d5db'}"></span>
								{:else if s.tabIcon}
									<svelte:component this={resolveIcon(s.tabIcon)} class="size-4 shrink-0" />
								{/if}
								<span class={i === active ? 'font-semibold' : ''}>{s.tab}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Dots -->
		<div class="mt-10 flex items-center justify-center gap-2">
			{#each slides as _, i}
				<button
					on:click={() => goto(i)}
					aria-label={`Vue ${i + 1}`}
					class="h-2 rounded-full transition-all"
					style="width:{i === active ? '24px' : '8px'};background:{i === active ? teal : '#d1d5db'}"
				></button>
			{/each}
		</div>
	</div>
</section>
