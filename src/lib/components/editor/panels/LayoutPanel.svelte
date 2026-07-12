<script lang="ts">
	import { breakpoint, getOverride, revision, setLayout } from '$lib/editor/store';
	import { resolveLayout, type ElementLayout } from '$lib/editor/elements';

	export let id: string;

	$: bp = $breakpoint;
	function readLayout(_rev: number, _id: string, _bp: typeof bp): ElementLayout {
		return resolveLayout(getOverride(_id), _bp);
	}
	$: layout = readLayout($revision, id, bp);

	function set(key: keyof ElementLayout, e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		const value = raw === '' ? undefined : Number(raw);
		setLayout(id, bp, { [key]: value });
	}

	const bpLabel: Record<string, string> = { desktop: 'Desktop', tablet: 'Tablette', mobile: 'Mobile' };
</script>

<div class="cms-panel-section">
	<div class="cms-panel-title">Position — {bpLabel[bp]}</div>

	<div class="cms-row">
		<div class="cms-field">
			<label class="cms-label" for="cms-dx">Décalage X</label>
			<input id="cms-dx" class="cms-input" type="number" placeholder="0" value={layout.dx ?? ''} on:input={(e) => set('dx', e)} />
		</div>
		<div class="cms-field">
			<label class="cms-label" for="cms-dy">Décalage Y</label>
			<input id="cms-dy" class="cms-input" type="number" placeholder="0" value={layout.dy ?? ''} on:input={(e) => set('dy', e)} />
		</div>
	</div>

	<div class="cms-row" style="margin-top:12px">
		<div class="cms-field">
			<label class="cms-label" for="cms-w">Largeur</label>
			<input id="cms-w" class="cms-input" type="number" min="0" placeholder="auto" value={layout.w ?? ''} on:input={(e) => set('w', e)} />
		</div>
		<div class="cms-field">
			<label class="cms-label" for="cms-h">Hauteur</label>
			<input id="cms-h" class="cms-input" type="number" min="0" placeholder="auto" value={layout.h ?? ''} on:input={(e) => set('h', e)} />
		</div>
	</div>
	<p class="cms-hint">Réglages indépendants par breakpoint. Le desktop sert de base.</p>
</div>

<style>
	.cms-hint {
		margin-top: 10px;
		font-size: 11px;
		color: #9a9a95;
		line-height: 1.4;
	}
</style>
