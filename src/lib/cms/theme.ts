// ══════════════════════════════════════════════════════════════════════════
//  Thème → variables CSS. Fonctions pures (utilisables serveur + client).
//  Injecté dans :root pour piloter la DA sans toucher au code des composants.
// ══════════════════════════════════════════════════════════════════════════
import type { Theme, ShadowIntensity } from './types';

/** #RRGGBB → triplet HSL "H S% L%" (format attendu par les variables shadcn). */
export function hexToHslTriplet(hex: string): string {
	const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
	if (!m) return '0 0% 100%';
	const r = parseInt(m[1], 16) / 255;
	const g = parseInt(m[2], 16) / 255;
	const b = parseInt(m[3], 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	const l = (max + min) / 2;
	const d = max - min;
	const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
	if (d !== 0) {
		if (max === r) h = ((g - b) / d) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const SHADOWS: Record<ShadowIntensity, string> = {
	none: 'none',
	soft: '0 24px 80px rgba(26,25,22,0.08), 0 8px 24px rgba(26,25,22,0.06)',
	medium: '0 30px 90px rgba(26,25,22,0.12), 0 10px 28px rgba(26,25,22,0.08)',
	strong: '0 40px 100px rgba(26,25,22,0.18), 0 14px 34px rgba(26,25,22,0.10)'
};

const FLOAT_SHADOWS: Record<ShadowIntensity, string> = {
	none: 'none',
	soft: 'drop-shadow(0 26px 60px rgba(26,25,22,0.12)) drop-shadow(0 8px 20px rgba(26,25,22,0.05))',
	medium: 'drop-shadow(0 30px 64px rgba(26,25,22,0.14)) drop-shadow(0 10px 24px rgba(26,25,22,0.06))',
	strong: 'drop-shadow(0 40px 80px rgba(26,25,22,0.18)) drop-shadow(0 14px 30px rgba(26,25,22,0.08))'
};

/** Bloc de déclarations CSS custom-properties à injecter dans :root. */
export function themeToCssVars(theme: Theme): string {
	return [
		`--background:${hexToHslTriplet(theme.background)}`,
		`--foreground:${hexToHslTriplet(theme.text)}`,
		`--bt-bg:${theme.background}`,
		`--bt-text:${theme.text}`,
		`--bt-muted:${theme.muted}`,
		`--bt-accent:${theme.accent}`,
		`--bt-button:${theme.button}`,
		`--bt-card:${theme.card}`,
		`--bt-radius:${theme.radius}px`,
		`--bt-shadow:${SHADOWS[theme.shadow]}`,
		`--bt-shadow-float:${FLOAT_SHADOWS[theme.shadow]}`,
		`--bt-glass-blur:${theme.glass ? '12px' : '0px'}`,
		`--bt-glass-bg:${theme.glass ? 'rgba(255,255,255,0.72)' : theme.background}`
	].join(';');
}
