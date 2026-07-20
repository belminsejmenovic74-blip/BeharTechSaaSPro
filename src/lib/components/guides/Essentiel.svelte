<script lang="ts">
	// Bloc « L'essentiel » (charte §3, GEO §6) : 2 à 4 phrases factuelles
	// autonomes, extractibles par les moteurs IA. Placé juste après le chapo.
	export let points: string[];
</script>

<aside class="essentiel" aria-label="L'essentiel">
	<p class="label">L'essentiel</p>
	{#each points as point}
		<p class="point">{point}</p>
	{/each}
</aside>

<style>
	.essentiel {
		background: var(--surface);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		padding: 20px 24px;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.label {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		color: var(--text);
	}
	.point {
		margin: 0;
		font-size: 16px;
		color: var(--text);
	}
</style>
