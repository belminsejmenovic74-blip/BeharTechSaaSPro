// ══════════════════════════════════════════════════════════════════════════
//  Constructeurs JSON-LD (SEO + GEO, PRD §F5).
//  Aucun champ inventé. Sérialisé tel quel dans <script type="application/ld+json">.
// ══════════════════════════════════════════════════════════════════════════
import { ORG, SITE_URL, articleUrl, absUrl } from './config';
import type { Article } from './content';

const orgNode = () => ({
	'@type': 'Organization',
	name: ORG.name,
	url: ORG.url,
	logo: { '@type': 'ImageObject', url: ORG.logo }
});

const personNode = (name: string) => ({
	'@type': 'Person',
	name,
	worksFor: orgNode()
});

/** Article schema d'après le frontmatter. */
export function articleJsonLd(a: Article) {
	const url = articleUrl(a.frontmatter.slug);
	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: a.frontmatter.title,
		description: a.frontmatter.metaDescription,
		image: absUrl(a.frontmatter.image),
		author: personNode(a.frontmatter.author),
		publisher: orgNode(),
		datePublished: a.frontmatter.datePublished,
		dateModified: a.frontmatter.dateModified,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		inLanguage: 'fr',
		url
	};
}

/** BreadcrumbList à partir d'une liste [label, url] (url absolue, sauf dernier). */
export function breadcrumbJsonLd(items: { name: string; url?: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((it, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: it.name,
			...(it.url ? { item: it.url } : {})
		}))
	};
}

/** FAQPage schema. */
export function faqJsonLd(faq: { question: string; answer: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((q) => ({
			'@type': 'Question',
			name: q.question,
			acceptedAnswer: { '@type': 'Answer', text: q.answer }
		}))
	};
}

/** Organization schema (home). */
export function organizationJsonLd(sameAs: string[] = []) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: ORG.name,
		url: SITE_URL,
		logo: ORG.logo,
		slogan: ORG.tagline,
		...(sameAs.length ? { sameAs } : {})
	};
}
