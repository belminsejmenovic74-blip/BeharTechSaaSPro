<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { getCms } from '$lib/cms/context';
	import { editable } from '$lib/editor/editable';

	const cms = getCms();
	$: faq = $cms.faq;
	// Index réel conservé pour les chemins d'édition, masqués filtrés.
	$: items = (faq?.items ?? [])
		.map((it, i) => ({ ...it, _i: i }))
		.filter((it) => (it as { visible?: boolean }).visible !== false);
	$: heading = faq?.title || faq?.kicker || 'Questions fréquentes';
</script>

<section id="faq" class="scroll-mt-28 px-6 py-24 md:px-8">
	<div class="mx-auto max-w-3xl">
		<div class="text-center">
			<h2
				use:editable={{ id: 'faq.kicker', kind: 'heading', path: 'faq.kicker', label: 'Titre FAQ' }}
				class="text-4xl font-bold tracking-tight sm:text-5xl"
				style="color: var(--bt-text)"
			>
				{heading}
			</h2>
			{#if faq?.subtitle}
				<p
					use:editable={{ id: 'faq.subtitle', kind: 'text', path: 'faq.subtitle', label: 'Sous-titre', multiline: true }}
					class="mx-auto mt-4 max-w-2xl text-lg text-gray-500"
				>
					{faq.subtitle}
				</p>
			{/if}
		</div>

		<div class="mt-12 flex flex-col gap-3">
			{#each items as item (item.id)}
				<details
					class="group rounded-2xl border px-6 py-4 transition"
					style="background: var(--bt-card); border-color: rgba(26,25,22,0.10);"
				>
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 text-left"
					>
						<span
							use:editable={{ id: `faq.items.${item._i}.question`, kind: 'heading', path: `faq.items.${item._i}.question`, label: 'Question' }}
							class="text-base font-semibold sm:text-lg"
							style="color: var(--bt-text)"
						>
							{item.question}
						</span>
						<ChevronDown
							class="size-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
						/>
					</summary>
					<p
						use:editable={{ id: `faq.items.${item._i}.answer`, kind: 'text', path: `faq.items.${item._i}.answer`, label: 'Réponse', multiline: true }}
						class="mt-3 text-[15px] leading-relaxed text-gray-500"
					>
						{item.answer}
					</p>
				</details>
			{/each}
		</div>
	</div>
</section>

<style>
	summary::-webkit-details-marker {
		display: none;
	}
</style>
