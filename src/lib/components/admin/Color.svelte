<script lang="ts">
	export let value = '#000000';
</script>

<div class="flex items-center gap-2">
	<input
		type="color"
		bind:value
		class="size-9 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
	/>
	<input
		type="text"
		bind:value
		class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
	/>
</div>
