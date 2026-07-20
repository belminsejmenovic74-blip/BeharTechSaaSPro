// ══════════════════════════════════════════════════════════════════════════
//  Contrat de données du frontmatter (PRD §5). Validé au BUILD via zod.
//  Toute violation lève une erreur explicite qui fait échouer le build —
//  aucune valeur par défaut silencieuse (sauf `author`, cf. config).
// ══════════════════════════════════════════════════════════════════════════
import { z } from 'zod';
import { CTA_KEYS } from './cta';
import { DEFAULT_AUTHOR } from './config';

const iso = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'date ISO 8601 attendue (AAAA-MM-JJ)');

/** Frontmatter d'un article de guide. */
export const articleFrontmatter = z
	.object({
		title: z.string().min(1, 'title est obligatoire'),
		metaTitle: z
			.string()
			.min(1, 'metaTitle est obligatoire')
			.max(60, 'metaTitle dépasse 60 caractères'),
		metaDescription: z
			.string()
			.min(1, 'metaDescription est obligatoire')
			.max(155, 'metaDescription dépasse 155 caractères'),
		slug: z
			.string()
			.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalide (kebab-case, sans accent)'),
		pilier: z.string().min(1, 'pilier est obligatoire'),
		cluster: z.string().min(1, 'cluster est obligatoire'),
		datePublished: iso,
		dateModified: iso,
		author: z.string().min(1).default(DEFAULT_AUTHOR),
		cta: z.enum(CTA_KEYS as [string, ...string[]], {
			errorMap: () => ({ message: `cta inconnu (attendu : ${CTA_KEYS.join(', ')})` })
		}),
		liensInternes: z.array(z.string()).min(1, 'liensInternes est obligatoire'),
		image: z.string().min(1, 'image est obligatoire'),
		imageAlt: z.string().min(1, 'imageAlt est obligatoire — le build échoue sinon'),
		// Blocs éditoriaux structurels du template (F2) : requis pour rendre
		// un article. Distincts de l'Excel — rédigés par l'auteur.
		chapo: z.string().min(1, 'chapo est obligatoire'),
		essentiel: z
			.array(z.string().min(1))
			.min(2, "le bloc « L'essentiel » exige 2 à 4 phrases")
			.max(4, "le bloc « L'essentiel » exige 2 à 4 phrases"),
		// Section FAQ optionnelle → déclenche le JSON-LD FAQPage (F5).
		faq: z
			.array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
			.optional(),
		draft: z.boolean().optional().default(false)
	})
	.strict();

export type ArticleFrontmatter = z.infer<typeof articleFrontmatter>;

/** Frontmatter d'une page pilier. */
export const pilierFrontmatter = z
	.object({
		title: z.string().min(1, 'title est obligatoire'),
		metaTitle: z.string().min(1).max(60, 'metaTitle dépasse 60 caractères'),
		metaDescription: z.string().min(1).max(155, 'metaDescription dépasse 155 caractères'),
		slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalide (kebab-case)'),
		kicker: z.string().min(1, 'kicker est obligatoire'),
		order: z.number().int().nonnegative().default(0),
		draft: z.boolean().optional().default(false)
	})
	.strict();

export type PilierFrontmatter = z.infer<typeof pilierFrontmatter>;

/** Formate une erreur zod en message de build lisible, préfixé du fichier. */
export function formatIssues(file: string, err: z.ZodError): string {
	const lines = err.issues.map((i) => `  · ${i.path.join('.') || '(racine)'} : ${i.message}`);
	return `Frontmatter invalide dans ${file} :\n${lines.join('\n')}`;
}
