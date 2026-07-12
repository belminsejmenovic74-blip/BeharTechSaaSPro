<script lang="ts">
	import { X, Sparkles, BarChart3, LayoutGrid, CreditCard, Mail } from 'lucide-svelte';

	export let show = false;
	export let onClose: () => void;
	export let onSelect: (type: string) => void;

	const blocks = [
		{
			id: 'hero',
			name: 'Hero',
			icon: Sparkles,
			desc: "En-tête principal avec titre et appel à l'action"
		},
		{
			id: 'stats',
			name: 'Chiffres',
			icon: BarChart3,
			desc: 'Bandeau de statistiques et réassurance'
		},
		{
			id: 'showcaseA',
			name: 'Showcase (Dots)',
			icon: LayoutGrid,
			desc: 'Présentation de fonctionnalités avec onglets'
		},
		{
			id: 'showcaseB',
			name: 'Showcase (Pills)',
			icon: LayoutGrid,
			desc: 'Présentation avec boutons pleins'
		},
		{
			id: 'showcaseC',
			name: 'Showcase (Phone)',
			icon: LayoutGrid,
			desc: 'Présentation orientée mobile'
		},
		{ id: 'pricing', name: 'Tarifs', icon: CreditCard, desc: 'Grille de prix et forfaits' },
		{
			id: 'integrations',
			name: 'Intégrations / CTA',
			icon: Mail,
			desc: "Appel à l'action final et logos"
		}
	];
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
		on:click={onClose}
	>
		<div
			class="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
			on:click|stopPropagation
		>
			<div class="flex items-center justify-between border-b border-slate-100 p-5">
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Bibliothèque de blocs</h2>
					<p class="text-sm text-slate-500">Ajoutez une nouvelle section à votre page.</p>
				</div>
				<button
					class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
					on:click={onClose}
				>
					<X class="size-5" />
				</button>
			</div>
			<div class="flex-1 overflow-auto p-5">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{#each blocks as block}
						<button
							type="button"
							class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/50 hover:shadow-md"
							on:click={() => onSelect(block.id)}
						>
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
							>
								<svelte:component this={block.icon} class="size-5" />
							</div>
							<div>
								<div class="font-medium text-slate-900">{block.name}</div>
								<div class="mt-1 text-xs text-slate-500">{block.desc}</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
