// ══════════════════════════════════════════════════════════════════════════
//  Éditeur visuel — helpers de rendu des overrides (style + layout).
//  Fonctions pures : convertissent un ElementOverride en CSS inline appliqué
//  par l'action `editable`. Aucune dépendance DOM → testable / réutilisable.
// ══════════════════════════════════════════════════════════════════════════
import type {
	Breakpoint,
	ElementLayout,
	ElementOverride,
	ElementStyle,
	ShadowIntensity
} from '$lib/cms/types';

export type { Breakpoint, ElementLayout, ElementOverride, ElementStyle };

/** Presets d'ombre cohérents avec la DA (mêmes valeurs que le thème). */
const SHADOWS: Record<ShadowIntensity, string> = {
	none: 'none',
	soft: '0 24px 80px rgba(26,25,22,0.08), 0 8px 24px rgba(26,25,22,0.06)',
	medium: '0 30px 90px rgba(26,25,22,0.12), 0 10px 28px rgba(26,25,22,0.08)',
	strong: '0 40px 100px rgba(26,25,22,0.18), 0 14px 34px rgba(26,25,22,0.10)'
};

export const FONT_FAMILIES: { label: string; value: string }[] = [
	{ label: 'Système (défaut)', value: '' },
	{ label: 'Inter / Sans', value: 'Inter, system-ui, sans-serif' },
	{ label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
	{ label: 'Mono', value: 'ui-monospace, "SF Mono", monospace' }
];

/** Résout le layout effectif pour un breakpoint (cascade desktop → tablette → mobile). */
export function resolveLayout(
	override: ElementOverride | undefined,
	bp: Breakpoint
): ElementLayout {
	const l = override?.layout;
	if (!l) return {};
	const order: Breakpoint[] = ['desktop', 'tablet', 'mobile'];
	const merged: ElementLayout = {};
	for (const b of order) {
		Object.assign(merged, l[b] || {});
		if (b === bp) break;
	}
	return merged;
}

/** Déclarations CSS (clé:valeur) pour la partie style d'un override. */
export function styleDeclarations(style: ElementStyle | undefined): Record<string, string> {
	const d: Record<string, string> = {};
	if (!style) return d;
	if (style.fontSize != null) d['font-size'] = `${style.fontSize}px`;
	if (style.fontFamily) d['font-family'] = style.fontFamily;
	if (style.fontWeight != null) d['font-weight'] = String(style.fontWeight);
	if (style.lineHeight != null) d['line-height'] = String(style.lineHeight);
	if (style.letterSpacing != null) d['letter-spacing'] = `${style.letterSpacing}px`;
	if (style.textAlign) d['text-align'] = style.textAlign;
	if (style.color) d['color'] = style.color;
	if (style.background) d['background'] = style.background;
	if (style.borderRadius != null) d['border-radius'] = `${style.borderRadius}px`;
	if (style.shadow) d['box-shadow'] = SHADOWS[style.shadow];
	if (style.paddingX != null) d['padding-left'] = d['padding-right'] = `${style.paddingX}px`;
	if (style.paddingY != null) d['padding-top'] = d['padding-bottom'] = `${style.paddingY}px`;
	if (style.opacity != null) d['opacity'] = String(style.opacity / 100);
	return d;
}

/** Déclarations CSS pour la partie layout (position/dimension) d'un breakpoint. */
export function layoutDeclarations(layout: ElementLayout): Record<string, string> {
	const d: Record<string, string> = {};
	const dx = layout.dx || 0;
	const dy = layout.dy || 0;
	if (dx || dy) d['transform'] = `translate(${dx}px, ${dy}px)`;
	if (layout.w != null) d['width'] = `${layout.w}px`;
	if (layout.h != null) d['height'] = `${layout.h}px`;
	return d;
}
