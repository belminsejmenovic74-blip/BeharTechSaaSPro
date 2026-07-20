// ══════════════════════════════════════════════════════════════════════════
//  Variantes de CTA de fin d'article (PRD §6/F7, charte §3).
//  Un article ne code JAMAIS son CTA : il référence une clé de ce registre
//  via `cta:` dans le frontmatter. Le build échoue si la clé est inconnue.
//  Ton sobre, aucune fausse urgence. Liens vers des routes publiques réelles.
// ══════════════════════════════════════════════════════════════════════════

export type CtaKey =
	| 'checklist-lancement'
	| 'calculateur-budget'
	| 'checklist-conformite'
	| 'demo'
	| 'audit-site'
	| 'diagnostic-stock'
	| 'fonctionnalite';

export type CtaVariant = {
	title: string;
	text: string;
	buttonLabel: string;
	href: string;
};

export const CTA_VARIANTS: Record<CtaKey, CtaVariant> = {
	'checklist-lancement': {
		title: 'Structurez le lancement de votre atelier',
		text: 'Behar Tech Pro centralise clients, réparations et facturation dès le premier jour.',
		buttonLabel: 'Essayer gratuitement',
		href: '/inscription'
	},
	'calculateur-budget': {
		title: 'Pilotez le budget de votre atelier',
		text: 'Suivez encaissements, marges et stock au même endroit, sans tableur.',
		buttonLabel: 'Essayer gratuitement',
		href: '/inscription'
	},
	'checklist-conformite': {
		title: 'Gardez une facturation carrée',
		text: 'Devis et factures générés et archivés proprement pour chaque intervention.',
		buttonLabel: 'Essayer gratuitement',
		href: '/inscription'
	},
	demo: {
		title: 'Voyez Behar Tech Pro en situation',
		text: 'Parcourez un atelier de démonstration avant de créer votre compte.',
		buttonLabel: 'Voir la démo',
		href: '/exemple'
	},
	'audit-site': {
		title: 'Donnez une vitrine à votre atelier',
		text: 'Suivi client par QR code et espace de suivi en ligne inclus.',
		buttonLabel: 'Essayer gratuitement',
		href: '/inscription'
	},
	'diagnostic-stock': {
		title: 'Reprenez la main sur votre stock',
		text: 'Pièces, reconditionnement et rachats suivis en temps réel.',
		buttonLabel: 'Essayer gratuitement',
		href: '/inscription'
	},
	fonctionnalite: {
		title: 'Testez la fonctionnalité par vous-même',
		text: 'Toutes les fonctions de gestion d’atelier réunies dans un seul outil.',
		buttonLabel: 'Essayer gratuitement',
		href: '/inscription'
	}
};

export const CTA_KEYS = Object.keys(CTA_VARIANTS) as CtaKey[];
export const isCtaKey = (v: string): v is CtaKey => CTA_KEYS.includes(v as CtaKey);
