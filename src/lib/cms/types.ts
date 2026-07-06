// ══════════════════════════════════════════════════════════════════════════
//  Modèle de contenu CMS — source unique de vérité du site public.
//  Édité via /admin, persisté en JSON (data/site-content.json).
// ══════════════════════════════════════════════════════════════════════════

export type ShadowIntensity = 'none' | 'soft' | 'medium' | 'strong';

export interface Theme {
	background: string; // fond général  (#FAFAF8)
	text: string; // texte principal    (#1A1916)
	muted: string; // texte secondaire   (#6B6B6B)
	accent: string; // accent / teal     (#2A9D8F)
	button: string; // fond des boutons CTA
	card: string; // fond des cartes     (#FFFFFF)
	radius: number; // rayon des cartes en px
	shadow: ShadowIntensity; // intensité des ombres
	glass: boolean; // effet glass léger (backdrop-blur)
}

export interface Seo {
	title: string;
	description: string;
	image: string;
	url: string;
	keywords: string;
}

export interface NavLink {
	label: string;
	href: string;
}

export interface HeaderContent {
	brand: string; // "BEHAR • TECH"
	badge: string; // "PRO"
	nav: NavLink[];
	loginLabel: string;
	loginHref: string;
	ctaLabel: string;
	ctaHref: string;
}

export interface HeroContent {
	badge: string;
	title: string;
	subtitle: string; // peut contenir un saut de ligne (\n)
	ctaLabel: string;
	ctaHref: string;
	showImage: boolean;
	image: string;
}

export interface StatItem {
	id: string;
	value: string;
	label: string;
	icon?: string; // nom d'icône, ou "google" pour le logo Google
	visible: boolean;
}

export interface StatsContent {
	kicker: string;
	subtitle: string;
	items: StatItem[];
}

export interface IntegrationItem {
	id: string;
	name: string;
	desc: string;
	logo: string;
	color?: string;
	visible: boolean;
}

export interface IntegrationsContent {
	kicker: string;
	titleStrong: string; // "Ils nous font confiance."
	titleMuted: string; // "Pourquoi pas vous ?"
	subtitle: string;
	items: IntegrationItem[];
}

export interface ShowcaseCard {
	id: string;
	icon: string;
	title: string;
	text: string;
	visible: boolean;
}

export interface ShowcaseSlide {
	id: string;
	tab: string;
	tabIcon: string;
	sideTitle?: string;
	img: string;
	device: boolean; // appareil détouré (flotte + drop-shadow)
	portrait: boolean;
	bullets: string[];
	cards?: ShowcaseCard[]; // cartes flottantes (layout phone)
	visible: boolean;
}

export interface ShowcaseContent {
	id: string;
	layout: 'screen' | 'phone';
	tabStyle: 'dots' | 'filled';
	titleLines: string[];
	subtitle: string;
	subtitleTeal: string;
	description: string;
	sideTitle: string;
	slides: ShowcaseSlide[];
}

export interface PricingPlan {
	id: string;
	name: string;
	description: string;
	buttonText: string;
	buttonHref: string;
	features: string[];
	monthlyPrice: number; // en centimes
	yearlyPrice: number; // en centimes
	isMostPopular: boolean;
	visible: boolean;
}

export interface PricingSetup {
	name: string;
	description: string;
	features: string[];
	price: string; // libre ("99€")
	note: string;
	buttonText: string;
	buttonHref: string;
	visible: boolean;
}

export interface PricingContent {
	kicker: string;
	title: string;
	subtitle: string;
	intervalNote: string; // "2 MOIS OFFERTS"
	plans: PricingPlan[];
	setup: PricingSetup;
}

export interface FooterColumn {
	label: string;
	items: NavLink[];
}

export interface FooterContent {
	brand: string;
	tagline: string;
	newsletterTitle: string;
	newsletterPlaceholder: string;
	newsletterButton: string;
	columns: FooterColumn[];
	copyright: string; // "Behar Tech Pro"
}

/** Identifiants de section pilotant l'ordre + la visibilité du rendu public. */
export type SectionId =
	| 'hero'
	| 'stats'
	| 'showcaseA'
	| 'showcaseB'
	| 'showcaseC'
	| 'integrations'
	| 'pricing';

export interface SectionRef {
	id: SectionId;
	label: string; // libellé admin
	visible: boolean;
}

export interface SiteContent {
	theme: Theme;
	seo: Seo;
	header: HeaderContent;
	hero: HeroContent;
	stats: StatsContent;
	showcases: {
		A: ShowcaseContent;
		B: ShowcaseContent;
		C: ShowcaseContent;
	};
	integrations: IntegrationsContent;
	pricing: PricingContent;
	footer: FooterContent;
	sections: SectionRef[];
}
