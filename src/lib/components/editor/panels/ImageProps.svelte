<script lang="ts">
	import { Upload, Loader2 } from 'lucide-svelte';
	import { getContentValue, getRegistration, revision, setContentPath } from '$lib/editor/store';
	import { uploadCmsAsset } from '$lib/cms/db';
	import { getAdminSession } from '$lib/cms/local';

	export let id: string;

	let uploading = false;
	let fileInput: HTMLInputElement;

	function read(_rev: number, _id: string) {
		const fields = getRegistration(_id)?.fields ?? {};
		return {
			srcPath: fields.src,
			altPath: fields.alt,
			src: fields.src ? String(getContentValue(fields.src) ?? '') : '',
			alt: fields.alt ? String(getContentValue(fields.alt) ?? '') : ''
		};
	}
	$: data = read($revision, id);

	function setSrc(v: string) {
		if (data.srcPath) setContentPath(data.srcPath, v);
	}
	function setAlt(v: string) {
		if (data.altPath) setContentPath(data.altPath, v);
	}

	async function onFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file || !data.srcPath) return;
		const token = getAdminSession();
		if (!token) {
			alert('Session admin requise pour téléverser une image.');
			return;
		}
		uploading = true;
		try {
			const url = await uploadCmsAsset(file, token, data.alt);
			setSrc(url);
		} catch (err) {
			console.error('[cms] upload failed', err);
			alert('Téléversement impossible : ' + (err instanceof Error ? err.message : err));
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = '';
		}
	}
</script>

<div class="cms-panel-section">
	<div class="cms-panel-title">Image</div>

	{#if data.srcPath}
		{#if data.src}
			<div class="preview">
				<img src={data.src} alt={data.alt || 'Aperçu'} />
			</div>
		{/if}

		<button class="replace" on:click={() => fileInput?.click()} disabled={uploading}>
			{#if uploading}<Loader2 class="size-4 spin" /> Téléversement…{:else}<Upload class="size-4" /> Remplacer l'image{/if}
		</button>
		<input bind:this={fileInput} type="file" accept="image/*" class="hidden-file" on:change={onFile} />

		<div class="cms-field" style="margin-top:12px">
			<label class="cms-label" for="cms-img-url">URL de l'image</label>
			<input
				id="cms-img-url"
				class="cms-input"
				placeholder="https://…"
				value={data.src}
				on:change={(e) => setSrc(e.currentTarget.value)}
			/>
		</div>

		{#if data.altPath}
			<div class="cms-field">
				<label class="cms-label" for="cms-img-alt">Texte alternatif</label>
				<input
					id="cms-img-alt"
					class="cms-input"
					value={data.alt}
					on:input={(e) => setAlt(e.currentTarget.value)}
				/>
			</div>
		{/if}
	{:else}
		<p class="cms-hint">Cette image n'est pas remplaçable.</p>
	{/if}
</div>

<style>
	.preview {
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid rgba(26, 25, 22, 0.1);
		margin-bottom: 10px;
		background: repeating-conic-gradient(#f4f4f2 0% 25%, #fff 0% 50%) 50% / 16px 16px;
	}
	.preview img {
		display: block;
		width: 100%;
		max-height: 140px;
		object-fit: contain;
	}
	.replace {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		height: 38px;
		border-radius: 9px;
		border: 1px solid rgba(42, 157, 143, 0.4);
		color: #2a9d8f;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.replace:hover:not(:disabled) {
		background: rgba(42, 157, 143, 0.06);
	}
	.replace:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.hidden-file {
		display: none;
	}
	.cms-hint {
		font-size: 11px;
		color: #9a9a95;
	}
	:global(.cms-props .spin) {
		animation: cms-spin 0.8s linear infinite;
	}
</style>
