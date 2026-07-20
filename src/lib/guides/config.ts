// ══════════════════════════════════════════════════════════════════════════
//  Configuration de la section /guides/ (SEO + GEO).
//  Source de vérité pour l'URL absolue, l'auteur, l'organisation et le logo.
//  Toute URL émise (canonical, sitemap, OG, JSON-LD, llms.txt) part d'ici.
// ══════════════════════════════════════════════════════════════════════════

/** Domaine de production. Toutes les URL absolues en dérivent. */
export const SITE_URL = 'https://behartechpro.fr';

/** Convention de trailing slash (D2) : TOUJOURS un slash final. */
export const TRAILING_SLASH = true;

/** Auteur par défaut (seule valeur par défaut silencieuse autorisée, cf. PRD §5). */
export const DEFAULT_AUTHOR = 'Belmin Sejmenovic';

/** Organisation éditrice (JSON-LD Organization + publisher). */
export const ORG = {
	name: 'Behar Tech Pro',
	url: SITE_URL,
	logo: `${SITE_URL}/brand/behar-tech-pro-logo.png`,
	tagline: "L'atelier dans la poche."
};

/** Construit une URL absolue avec la convention de trailing slash appliquée. */
export function absUrl(path: string): string {
	let p = path.startsWith('/') ? path : `/${path}`;
	// Ne pas ajouter de slash aux fichiers (sitemap.xml, llms.txt…).
	const isFile = /\.[a-z0-9]+$/i.test(p);
	if (TRAILING_SLASH && !isFile && !p.endsWith('/')) p += '/';
	return `${SITE_URL}${p}`;
}

/** URL canonique d'un article. */
export const articleUrl = (slug: string) => absUrl(`/guides/${slug}`);
/** URL canonique d'un pilier. */
export const pilierUrl = (slug: string) => absUrl(`/guides/${slug}`);
/** URL canonique du hub. */
export const hubUrl = () => absUrl('/guides');
/** URL canonique de la FAQ. */
export const faqUrl = () => absUrl('/faq');
/** URL canonique du hub blog. */
export const blogHubUrl = () => absUrl('/blog');
/** URL canonique d'un article de blog. */
export const blogUrl = (slug: string) => absUrl(`/blog/${slug}`);
