<script lang="ts">
	export let checked = false;
	export let label = '';
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	on:click={() => (checked = !checked)}
	class="inline-flex items-center gap-2"
>
	<span
		class="relative h-5 w-9 shrink-0 rounded-full transition-colors {checked
			? 'bg-emerald-600'
			: 'bg-slate-300'}"
	>
		<span
			class="absolute top-0.5 size-4 rounded-full bg-white transition-all {checked
				? 'left-4'
				: 'left-0.5'}"
		></span>
	</span>
	{#if label}<span class="text-sm text-slate-600">{label}</span>{/if}
</button>
