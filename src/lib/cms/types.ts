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

export interface WidgetContent {
	kicker: string;
	title: string;
	subtitle: string;
	benefits: string[]; // liste à puces du côté gauche
	image: string; // mockup principal du widget
	image2?: string; // image optionnelle secondaire
	image2Position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
	menuTitle?: string; // titre du menu vertical
	menuItems?: string[]; // items du menu vertical
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
	| 'pricing'
	| 'widget'
	| 'faq'
	| 'cta';

export interface SectionRef {
	id: SectionId;
	label: string; // libellé admin
	visible: boolean;
}

/* ---- Page builder (blocs libres) --------------------------------------- */
export type BlockType = 'heading' | 'text' | 'button' | 'image' | 'icon' | 'divider' | 'spacer';

export interface Block {
	id: string;
	type: BlockType;
	text?: string;
	href?: string;
	src?: string;
	icon?: string;
	fontSize?: number;
	fontWeight?: number;
	color?: string;
	bg?: string;
	align?: 'left' | 'center' | 'right';
	paddingY?: number;
	paddingX?: number;
	radius?: number;
	width?: number; // % (image/bouton)
	height?: number; // px (espace)
}

export interface BuilderPage {
	id: string;
	slug: string;
	title: string;
	bg: string;
	maxWidth: number;
	blocks: Block[];
}

/* ---- Éditeur visuel : couche d'overrides par élément ------------------- */
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

/** Styles surchargeables sur un élément éditable (typo, couleur, ombre…). */
export interface ElementStyle {
	fontSize?: number; // px
	fontFamily?: string;
	fontWeight?: number;
	lineHeight?: number; // unité em (1.2)
	letterSpacing?: number; // px
	textAlign?: 'left' | 'center' | 'right';
	color?: string;
	background?: string;
	borderRadius?: number; // px
	shadow?: ShadowIntensity;
	paddingX?: number; // px
	paddingY?: number; // px
	opacity?: number; // 0-100
}

/** Position/dimension surchargée pour un breakpoint donné (canvas libre). */
export interface ElementLayout {
	dx?: number; // translation X en px
	dy?: number; // translation Y en px
	w?: number; // largeur en px
	h?: number; // hauteur en px
	hidden?: boolean;
}

/** Override complet d'un élément, clé = identifiant stable `data-el`. */
export interface ElementOverride {
	content?: { text?: string; href?: string; src?: string; alt?: string };
	style?: ElementStyle;
	layout?: Partial<Record<Breakpoint, ElementLayout>>;
}

export interface SiteContent {
	theme: Theme;
	/** Surcharges visuelles par élément (éditeur « Mode édition »). */
	editorOverrides?: Record<string, ElementOverride>;
	pages: BuilderPage[];
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
	widget: WidgetContent;
	footer: FooterContent;
	sections: SectionRef[];
}

export interface Page {
	id: string;
	slug: string;
	title: string;
	seo_title: string;
	seo_description: string;
	status: 'draft' | 'published';
	created_at: string;
	updated_at: string;
}

export type SectionType =
	| 'header'
	| 'hero'
	| 'stats'
	| 'showcaseA'
	| 'showcaseB'
	| 'showcaseC'
	| 'integrations'
	| 'pricing'
	| 'widget'
	| 'faq'
	| 'cta'
	| 'footer';

export interface PageSection {
	id: string;
	page_id: string;
	type: SectionType | string;
	order: number;
	content: any; // Utilise les interfaces existantes (HeroContent, etc.) en JSON
	settings: any;
	created_at: string;
	updated_at: string;
}

export interface LocalDbSchema {
	pages: Page[];
	page_sections: PageSection[];
	theme: Theme;
}
