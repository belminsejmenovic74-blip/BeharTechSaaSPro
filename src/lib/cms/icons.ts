// ══════════════════════════════════════════════════════════════════════════
//  Registre d'icônes CMS : nom (string, stocké en JSON) → composant lucide.
//  Permet d'éditer les icônes depuis l'admin sans importer de composant.
// ══════════════════════════════════════════════════════════════════════════
import {
	Activity,
	BadgeCheck,
	BellRing,
	Box,
	CalendarClock,
	Camera,
	Check,
	Clock,
	FileText,
	Globe,
	Link,
	Mail,
	MessageSquare,
	Package,
	Receipt,
	RefreshCcw,
	ShieldCheck,
	Smartphone,
	Sparkles,
	Star,
	Store,
	TrendingUp,
	Wrench,
	type Icon as LucideIcon
} from 'lucide-svelte';

export const ICONS = {
	activity: Activity,
	badgeCheck: BadgeCheck,
	bellRing: BellRing,
	box: Box,
	calendarClock: CalendarClock,
	camera: Camera,
	check: Check,
	clock: Clock,
	fileText: FileText,
	globe: Globe,
	link: Link,
	mail: Mail,
	messageSquare: MessageSquare,
	package: Package,
	receipt: Receipt,
	refreshCcw: RefreshCcw,
	shieldCheck: ShieldCheck,
	smartphone: Smartphone,
	sparkles: Sparkles,
	star: Star,
	store: Store,
	trendingUp: TrendingUp,
	wrench: Wrench
} satisfies Record<string, typeof LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Liste des noms d'icônes (pour les <select> de l'admin). */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** Résout un nom d'icône vers son composant, avec repli sûr. */
export function resolveIcon(name: string | undefined) {
	return (name && ICONS[name as IconName]) || Check;
}
