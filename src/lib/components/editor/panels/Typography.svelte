<script lang="ts">
	import { AlignLeft, AlignCenter, AlignRight } from 'lucide-svelte';
	import { getOverride, revision, setStyle } from '$lib/editor/store';
	import { FONT_FAMILIES, type ElementStyle } from '$lib/editor/elements';

	export let id: string;

	function readStyle(_rev: number, _id: string): ElementStyle {
		return getOverride(_id)?.style ?? {};
	}
	$: style = readStyle($revision, id);

	function set<K extends keyof ElementStyle>(key: K, value: ElementStyle[K]) {
		setStyle(id, { [key]: value } as Partial<ElementStyle>);
	}
	function num(e: Event & { currentTarget: HTMLInputElement }) {
		const v = e.currentTarget.value;
		return v === '' ? undefined : Number(v);
	}

	const weights = [
		{ label: 'Léger', value: 300 },
		{ label: 'Normal', value: 400 },
		{ label: 'Medium', value: 500 },
		{ label: 'Semi', value: 600 },
		{ label: 'Gras', value: 700 },
		{ label: 'Extra', value: 800 }
	];
</script>

<div class="cms-panel-section">
	<div class="cms-panel-title">Typographie</div>

	<div class="cms-field">
		<label class="cms-label" for="cms-ff">Police</label>
		<select
			id="cms-ff"
			class="cms-select"
			value={style.fontFamily ?? ''}
			on:change={(e) => set('fontFamily', e.currentTarget.value || undefined)}
		>
			{#each FONT_FAMILIES as f}
				<option value={f.value}>{f.label}</option>
			{/each}
		</select>
	</div>

	<div class="cms-row">
		<div class="cms-field">
			<label class="cms-label" for="cms-fs">Taille (px)</label>
			<input
				id="cms-fs"
				class="cms-input"
				type="number"
				min="8"
				max="200"
				placeholder="auto"
				value={style.fontSize ?? ''}
				on:input={(e) => set('fontSize', num(e))}
			/>
		</div>
		<div class="cms-field">
			<label class="cms-label" for="cms-fw">Poids</label>
			<select
				id="cms-fw"
				class="cms-select"
				value={style.fontWeight ?? ''}
				on:change={(e) => {
					const v = e.currentTarget.value;
					set('fontWeight', v === '' ? undefined : Number(v));
				}}
			>
				<option value="">auto</option>
				{#each weights as w}
					<option value={w.value}>{w.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="cms-row" style="margin-top:12px">
		<div class="cms-field">
			<label class="cms-label" for="cms-lh">Interligne</label>
			<input
				id="cms-lh"
				class="cms-input"
				type="number"
				step="0.05"
				min="0.8"
				max="3"
				placeholder="auto"
				value={style.lineHeight ?? ''}
				on:input={(e) => set('lineHeight', num(e))}
			/>
		</div>
		<div class="cms-field">
			<label class="cms-label" for="cms-ls">Espacement</label>
			<input
				id="cms-ls"
				class="cms-input"
				type="number"
				step="0.1"
				min="-5"
				max="20"
				placeholder="auto"
				value={style.letterSpacing ?? ''}
				on:input={(e) => set('letterSpacing', num(e))}
			/>
		</div>
	</div>

	<div class="cms-field" style="margin-top:12px">
		<label class="cms-label">Alignement</label>
		<div class="cms-seg">
			<button class:on={style.textAlign === 'left'} on:click={() => set('textAlign', 'left')} title="Gauche">
				<AlignLeft class="size-3.5" />
			</button>
			<button class:on={style.textAlign === 'center'} on:click={() => set('textAlign', 'center')} title="Centré">
				<AlignCenter class="size-3.5" />
			</button>
			<button class:on={style.textAlign === 'right'} on:click={() => set('textAlign', 'right')} title="Droite">
				<AlignRight class="size-3.5" />
			</button>
		</div>
	</div>
</div>
