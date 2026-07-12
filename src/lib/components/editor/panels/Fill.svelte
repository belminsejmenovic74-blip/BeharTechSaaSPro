<script lang="ts">
	import { getOverride, revision, setStyle } from '$lib/editor/store';
	import type { ElementStyle } from '$lib/editor/elements';

	export let id: string;
	/** Affiche le fond + arrondi + ombre (utile pour boutons/images/blocs). */
	export let showBox = false;

	function readStyle(_rev: number, _id: string): ElementStyle {
		return getOverride(_id)?.style ?? {};
	}
	$: style = readStyle($revision, id);

	function set<K extends keyof ElementStyle>(key: K, value: ElementStyle[K]) {
		setStyle(id, { [key]: value } as Partial<ElementStyle>);
	}
	function setShadow(v: string) {
		set('shadow', (v || undefined) as ElementStyle['shadow']);
	}
	function setRadius(v: string) {
		set('borderRadius', v === '' ? undefined : Number(v));
	}

	const shadows = [
		{ label: 'Aucune', value: 'none' },
		{ label: 'Douce', value: 'soft' },
		{ label: 'Moyenne', value: 'medium' },
		{ label: 'Forte', value: 'strong' }
	] as const;
</script>

<div class="cms-panel-section">
	<div class="cms-panel-title">Couleur</div>

	<div class="cms-field">
		<label class="cms-label">Texte</label>
		<div class="cms-color">
			<span class="cms-swatch">
				<input type="color" value={style.color ?? '#1A1916'} on:input={(e) => set('color', e.currentTarget.value)} />
			</span>
			<input
				class="cms-input"
				placeholder="hérité"
				value={style.color ?? ''}
				on:change={(e) => set('color', e.currentTarget.value || undefined)}
			/>
		</div>
	</div>

	{#if showBox}
		<div class="cms-field">
			<label class="cms-label">Fond</label>
			<div class="cms-color">
				<span class="cms-swatch">
					<input type="color" value={style.background ?? '#2A9D8F'} on:input={(e) => set('background', e.currentTarget.value)} />
				</span>
				<input
					class="cms-input"
					placeholder="transparent"
					value={style.background ?? ''}
					on:change={(e) => set('background', e.currentTarget.value || undefined)}
				/>
			</div>
		</div>

		<div class="cms-row">
			<div class="cms-field">
				<label class="cms-label" for="cms-radius">Arrondi (px)</label>
				<input
					id="cms-radius"
					class="cms-input"
					type="number"
					min="0"
					max="200"
					placeholder="auto"
					value={style.borderRadius ?? ''}
					on:input={(e) => setRadius(e.currentTarget.value)}
				/>
			</div>
			<div class="cms-field">
				<label class="cms-label" for="cms-shadow">Ombre</label>
				<select
					id="cms-shadow"
					class="cms-select"
					value={style.shadow ?? ''}
					on:change={(e) => setShadow(e.currentTarget.value)}
				>
					<option value="">auto</option>
					{#each shadows as s}
						<option value={s.value}>{s.label}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	<div class="cms-field" style="margin-top:12px">
		<label class="cms-label">Opacité — {style.opacity ?? 100}%</label>
		<input
			class="cms-range"
			type="range"
			min="0"
			max="100"
			value={style.opacity ?? 100}
			on:input={(e) => set('opacity', Number(e.currentTarget.value))}
		/>
	</div>
</div>
