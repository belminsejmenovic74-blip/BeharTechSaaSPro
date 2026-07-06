<script lang="ts">
	export let label = '';
	export let hint = '';
</script>

<label class="flex flex-col gap-1.5">
	{#if label}
		<span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
	{/if}
	<slot />
	{#if hint}
		<span class="text-xs text-slate-400">{hint}</span>
	{/if}
</label>
