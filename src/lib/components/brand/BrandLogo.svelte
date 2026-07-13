<script lang="ts">
	export let compact = false;
	export let centered = false;
	/** Classe de hauteur Tailwind explicite (ex. "h-12"). Prioritaire sur `compact`. */
	export let size = '';

	$: heightClass = size || (compact ? 'h-8' : 'h-10');
</script>

<a href="/" class:mx-auto={centered} class="inline-flex items-center" aria-label="Behar Tech Pro">
	<img
		src="/brand/behar-tech-pro-logo.png"
		alt="BEHAR TECH PRO"
		class={`${heightClass} w-auto`}
		loading="eager"
	/>
</a>
