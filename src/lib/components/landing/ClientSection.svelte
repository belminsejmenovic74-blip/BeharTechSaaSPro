<script lang="ts">
	import { Globe } from 'lucide-svelte';
	import { getCms } from '$lib/cms/context';
	import { resolveIcon } from '$lib/cms/icons';

	const cms = getCms();
	$: stats = $cms.stats;
	$: items = stats.items.filter((s) => s.visible !== false);
</script>

<section id="clients" class="scroll-mt-28 px-6 py-24 md:px-8 md:py-28">
	<div class="mx-auto max-w-6xl">
		<div class="text-center">
			<p class="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
				{stats.kicker}
			</p>
			<p class="mx-auto mt-4 max-w-2xl text-lg" style="color: var(--bt-muted)">
				{stats.subtitle}
			</p>
		</div>

		<div
			class="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8 lg:gap-y-0"
		>
			{#each items as stat (stat.id)}
				<div class="flex flex-col items-center gap-2 px-4 text-center">
					<div class="flex items-center gap-2">
						{#if stat.icon === 'globe'}
							<Globe class="size-6" style="color: var(--bt-accent)" strokeWidth={1.8} />
						{:else if stat.icon === 'google'}
							<svg viewBox="0 0 48 48" class="size-6" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
								<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
								<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
								<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
								<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
							</svg>
						{:else if stat.icon}
							<svelte:component this={resolveIcon(stat.icon)} class="size-6" style="color: var(--bt-accent)" strokeWidth={1.8} />
						{/if}
						<span class="text-3xl font-bold tracking-tight md:text-4xl" style="color: var(--bt-text)">
							{stat.value}
						</span>
					</div>
					<span class="text-sm" style="color: var(--bt-muted)">{stat.label}</span>
				</div>
			{/each}
		</div>
	</div>
</section>
