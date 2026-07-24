export const CALENDLY_URL = 'https://calendly.com/belmin-sejmenovic74/nouvelle-reunion';

const CALENDLY_SCRIPT_ID = 'bt-calendly-script';
const CALENDLY_STYLESHEET_ID = 'bt-calendly-stylesheet';
const CALENDLY_SCRIPT_URL = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_STYLESHEET_URL = 'https://assets.calendly.com/assets/external/widget.css';

export type CalendlyApi = {
	initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void;
	initBadgeWidget: (options: {
		url: string;
		text: string;
		color: string;
		textColor: string;
		branding: boolean;
	}) => void;
};

type CalendlyWindow = Window & { Calendly?: CalendlyApi };

let calendlyPromise: Promise<CalendlyApi> | undefined;

function getCalendly() {
	return (window as CalendlyWindow).Calendly;
}

function ensureCalendlyStylesheet() {
	if (document.getElementById(CALENDLY_STYLESHEET_ID)) return;
	const link = document.createElement('link');
	link.id = CALENDLY_STYLESHEET_ID;
	link.rel = 'stylesheet';
	link.href = CALENDLY_STYLESHEET_URL;
	document.head.appendChild(link);
}

export function ensureCalendly(): Promise<CalendlyApi> {
	const available = getCalendly();
	if (available) return Promise.resolve(available);
	if (calendlyPromise) return calendlyPromise;

	ensureCalendlyStylesheet();
	calendlyPromise = new Promise((resolve, reject) => {
		const finish = () => {
			const api = getCalendly();
			if (api) resolve(api);
			else reject(new Error('Calendly indisponible.'));
		};

		const existing = document.getElementById(CALENDLY_SCRIPT_ID) as HTMLScriptElement | null;
		if (existing) {
			existing.addEventListener('load', finish, { once: true });
			existing.addEventListener(
				'error',
				() => reject(new Error('Chargement de Calendly impossible.')),
				{
					once: true
				}
			);
			return;
		}

		const script = document.createElement('script');
		script.id = CALENDLY_SCRIPT_ID;
		script.async = true;
		script.src = CALENDLY_SCRIPT_URL;
		script.addEventListener('load', finish, { once: true });
		script.addEventListener(
			'error',
			() => reject(new Error('Chargement de Calendly impossible.')),
			{
				once: true
			}
		);
		document.head.appendChild(script);
	});

	return calendlyPromise;
}

export function initCalendlyBadge(api: CalendlyApi) {
	document.querySelector('.calendly-badge-widget')?.remove();
	api.initBadgeWidget({
		url: CALENDLY_URL,
		text: 'Demande de contact',
		color: '#448588',
		textColor: '#ffffff',
		branding: true
	});

	const badge = document.querySelector('.calendly-badge-widget') as HTMLElement | null;
	if (!badge) return;
	const mobile = window.matchMedia('(max-width: 640px)').matches;
	badge.style.setProperty('right', 'auto', 'important');
	badge.style.setProperty('left', mobile ? '12px' : '20px', 'important');
	if (mobile) badge.style.setProperty('bottom', '12px', 'important');
}

export function removeCalendlyBadge() {
	if (typeof document === 'undefined') return;
	document.querySelector('.calendly-badge-widget')?.remove();
}
