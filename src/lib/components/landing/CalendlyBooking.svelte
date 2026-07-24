<script lang="ts">
	import { onMount } from 'svelte';
	import { CALENDLY_URL, ensureCalendly } from '$lib/calendly';

	let container: HTMLDivElement;
	let loadFailed = false;

	onMount(() => {
		let active = true;
		ensureCalendly()
			.then((calendly) => {
				if (!active) return;
				calendly.initInlineWidget({ url: CALENDLY_URL, parentElement: container });
			})
			.catch(() => {
				if (active) loadFailed = true;
			});

		return () => {
			active = false;
		};
	});
</script>

<div id="demo" class="scroll-mt-28">
	<div class="text-center">
		<h3 class="text-2xl font-semibold tracking-tight" style="color: var(--bt-text)">
			Réservez directement votre démo de 15 minutes.
		</h3>
		<p class="mx-auto mt-3 max-w-2xl text-gray-500">
			Choisissez le créneau qui vous convient. Vous recevrez immédiatement la confirmation Calendly.
		</p>
	</div>

	<div
		bind:this={container}
		class="mt-8 overflow-hidden rounded-2xl border bg-white"
		style="min-width: 320px; height: 700px; border-color: rgba(26,25,22,0.08); box-shadow: var(--bt-shadow)"
		aria-label="Réservation Calendly d’une démo de 15 minutes"
	></div>

	{#if loadFailed}
		<p class="mt-4 text-center text-sm text-gray-500">
			Calendly ne s’est pas chargé.
			<a class="font-semibold underline" href={CALENDLY_URL} target="_blank" rel="noreferrer">
				Ouvrir le calendrier dans un nouvel onglet
			</a>
		</p>
	{/if}
</div>
