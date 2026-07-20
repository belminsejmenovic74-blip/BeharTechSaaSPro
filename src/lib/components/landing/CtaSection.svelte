<script lang="ts">
	import { getCms } from '$lib/cms/context';
	import { editable } from '$lib/editor/editable';

	const cms = getCms();
	$: integrations = $cms.integrations;
	// On garde l'index réel (pour les chemins d'édition) tout en filtrant le masqué.
	$: items = integrations.items
		.map((l, i) => ({ ...l, _i: i }))
		.filter((l) => l.visible !== false);
</script>

<section id="integrations" class="relative scroll-mt-28 overflow-hidden px-6 pb-24 pt-32 md:px-8">
	<!-- Halo chaud en haut -->
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[360px] max-w-5xl"
		style="background: radial-gradient(70% 60% at 50% 0%, rgba(255,214,186,0.7), transparent 66%);"
	></div>

	<div class="mx-auto max-w-6xl">
		<div class="mx-auto max-w-3xl text-center">
			<p
				use:editable={{ id: 'integrations.kicker', kind: 'text', path: 'integrations.kicker', label: 'Sur-titre' }}
				class="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500"
			>
				{integrations.kicker}
			</p>
			<h2 class="mt-4 text-4xl font-bold tracking-tight sm:text-5xl" style="color: var(--bt-text)">
				<span use:editable={{ id: 'integrations.titleStrong', kind: 'heading', path: 'integrations.titleStrong', label: 'Titre' }}>{integrations.titleStrong}</span>
				<span use:editable={{ id: 'integrations.titleMuted', kind: 'heading', path: 'integrations.titleMuted', label: 'Titre (suite)' }} class="font-normal text-gray-500">{integrations.titleMuted}</span>
			</h2>
			<p
				use:editable={{ id: 'integrations.subtitle', kind: 'text', path: 'integrations.subtitle', label: 'Sous-titre', multiline: true }}
				class="mx-auto mt-5 max-w-2xl text-lg text-gray-500"
			>
				{integrations.subtitle}
			</p>
		</div>

		<div class="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
			{#each items as l (l.id)}
				<div
					use:editable={{ id: `integrations.items.${l._i}`, kind: 'container', label: l.name || 'Logo' }}
					class="flex flex-col items-center gap-3 text-center"
				>
					<img
						src={l.logo}
						alt={l.name}
						loading="lazy"
						use:editable={{ id: `integrations.items.${l._i}.logo`, kind: 'image', label: 'Logo', fields: { src: `integrations.items.${l._i}.logo`, alt: `integrations.items.${l._i}.name` } }}
						class="h-12 w-auto object-contain"
					/>
					<div>
						<p
							use:editable={{ id: `integrations.items.${l._i}.name`, kind: 'heading', path: `integrations.items.${l._i}.name`, label: 'Nom' }}
							class="font-semibold"
							style="color: {l.color || 'var(--bt-text)'}"
						>
							{l.name}
						</p>
						<p
							use:editable={{ id: `integrations.items.${l._i}.desc`, kind: 'text', path: `integrations.items.${l._i}.desc`, label: 'Description' }}
							class="mt-1 text-sm text-gray-500"
						>
							{l.desc}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
