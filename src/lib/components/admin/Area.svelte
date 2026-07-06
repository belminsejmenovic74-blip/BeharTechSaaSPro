<script lang="ts">
	export let value = '';
	export let placeholder = '';
	export let rows = 3;
</script>

<textarea
	bind:value
	{placeholder}
	{rows}
	class="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
></textarea>
