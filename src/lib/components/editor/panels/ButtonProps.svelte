<script lang="ts">
	import { getContentValue, getRegistration, revision, setContentPath } from '$lib/editor/store';

	export let id: string;

	function read(_rev: number, _id: string) {
		const reg = getRegistration(_id);
		const fields = reg?.fields ?? {};
		return {
			labelPath: fields.label ?? reg?.path,
			hrefPath: fields.href,
			label: fields.label ? String(getContentValue(fields.label) ?? '') : reg?.path ? String(getContentValue(reg.path) ?? '') : '',
			href: fields.href ? String(getContentValue(fields.href) ?? '') : ''
		};
	}
	$: data = read($revision, id);

	function setLabel(v: string) {
		if (data.labelPath) setContentPath(data.labelPath, v);
	}
	function setHref(v: string) {
		if (data.hrefPath) setContentPath(data.hrefPath, v);
	}
</script>

<div class="cms-panel-section">
	<div class="cms-panel-title">Bouton</div>

	{#if data.labelPath}
		<div class="cms-field">
			<label class="cms-label" for="cms-btn-label">Libellé</label>
			<input
				id="cms-btn-label"
				class="cms-input"
				value={data.label}
				on:input={(e) => setLabel(e.currentTarget.value)}
			/>
		</div>
	{/if}

	{#if data.hrefPath}
		<div class="cms-field">
			<label class="cms-label" for="cms-btn-href">Lien (URL)</label>
			<input
				id="cms-btn-href"
				class="cms-input"
				placeholder="https://… ou #ancre"
				value={data.href}
				on:input={(e) => setHref(e.currentTarget.value)}
			/>
		</div>
	{:else}
		<p class="cms-hint">Ce bouton n'a pas de lien éditable.</p>
	{/if}
</div>

<style>
	.cms-hint {
		font-size: 11px;
		color: #9a9a95;
	}
</style>
