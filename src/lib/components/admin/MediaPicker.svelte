<script lang="ts">
	import { UploadCloud } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { uploadCmsAsset } from '$lib/cms/db';
	import { getAdminSession } from '$lib/cms/local';

	export let value = ''; // URL de l'image
	export let media: string[] = [];

	let uploading = false;
	let open = false;

	async function upload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploading = true;

		try {
			const sessionToken = getAdminSession();
			value = await uploadCmsAsset(file, sessionToken, file.name);
			if (!media.includes(value)) media = [value, ...media];
			toast.success('Image envoyée dans Supabase');
		} catch (error) {
			toast.error('Échec de l’upload Supabase', {
				description: error instanceof Error ? error.message : 'Erreur inconnue.'
			});
		} finally {
			uploading = false;
			input.value = '';
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center gap-3">
		<div
			class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
		>
			{#if value}
				<img src={value} alt="" class="max-h-full max-w-full object-contain" />
			{:else}
				<span class="text-[10px] text-slate-400">aucune</span>
			{/if}
		</div>
		<div class="flex flex-1 flex-col gap-2">
			<input
				bind:value
				placeholder="/imgs/mon-image.png"
				class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
			/>
			<div class="flex items-center gap-2">
				<button
					type="button"
					on:click={() => (open = !open)}
					class="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
				>
					{open ? 'Fermer' : 'Choisir'}
				</button>
				<label
					class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
				>
					<UploadCloud class="size-3.5" />
					{uploading ? 'Import…' : 'Importer'}
					<input
						type="file"
						accept="image/*"
						class="hidden"
						on:change={upload}
						disabled={uploading}
					/>
				</label>
			</div>
		</div>
	</div>

	{#if open}
		<div
			class="grid max-h-52 grid-cols-4 gap-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-6"
		>
			{#each media as m}
				<button
					type="button"
					title={m}
					on:click={() => {
						value = m;
						open = false;
					}}
					class="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-white p-1 hover:border-emerald-500 {value ===
					m
						? 'border-emerald-500 ring-2 ring-emerald-100'
						: 'border-slate-200'}"
				>
					<img src={m} alt="" class="max-h-full max-w-full object-contain" />
				</button>
			{/each}
		</div>
	{/if}
</div>
