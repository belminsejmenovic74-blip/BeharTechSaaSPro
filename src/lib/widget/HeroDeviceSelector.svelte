<script lang="ts">
	import { onMount } from 'svelte';

	export let publicId = 'wdg_b8d8c22875f0499b97929660fc7bbdd0';

	type WidgetWindow = Window & typeof globalThis & { BeharWidget?: { refresh?: () => void } };

	onMount(() => {
		(window as WidgetWindow).BeharWidget?.refresh?.();
		if (document.querySelector('script[data-behar-svelte-widget]')) return;

		const script = document.createElement('script');
		script.async = true;
		script.src = '/widget.js';
		script.dataset.widgetId = publicId;
		script.dataset.beharSvelteWidget = 'true';
		document.body.appendChild(script);
	});
</script>

<div class="widget-search" data-behar-widget-search aria-label="Recherche de réparation"></div>

<noscript>
	<p>Activez JavaScript pour rechercher votre appareil et consulter les réparations disponibles.</p>
</noscript>

<style>
	.widget-search {
		width: 100%;
		min-height: 96px;
	}

	@media (max-width: 820px) {
		.widget-search {
			min-height: 340px;
		}
	}
</style>
