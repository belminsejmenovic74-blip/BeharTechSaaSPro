// ══════════════════════════════════════════════════════════════════════════
//  Contrat de données du frontmatter des articles de blog. Validé au BUILD.
//  Même exigences SEO que les guides (metaTitle ≤60, metaDescription ≤155,
//  imageAlt requis) — le build échoue sur toute violation.
// ══════════════════════════════════════════════════════════════════════════
import { z } from 'zod';
import { CTA_KEYS } from '$lib/guides/cta';
import { DEFAULT_AUTHOR } from '$lib/guides/config';

const iso = z.preprocess(
	(v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
	z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'date ISO 8601 attendue (AAAA-MM-JJ)')
);

export const postFrontmatter = z
	.object({
		title: z.string().min(1, 'title est obligatoire'),
		metaTitle: z.string().min(1, 'metaTitle est obligatoire').max(60, 'metaTitle dépasse 60 caractères'),
		metaDescription: z
			.string()
			.min(1, 'metaDescription est obligatoire')
			.max(155, 'metaDescription dépasse 155 caractères'),
		slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalide (kebab-case, sans accent)'),
		category: z.string().min(1, 'category est obligatoire'),
		datePublished: iso,
		dateModified: iso,
		author: z.string().min(1).default(DEFAULT_AUTHOR),
		cta: z.enum(CTA_KEYS as [string, ...string[]], {
			errorMap: () => ({ message: `cta inconnu (attendu : ${CTA_KEYS.join(', ')})` })
		}),
		image: z.string().min(1, 'image est obligatoire'),
		imageAlt: z.string().min(1, 'imageAlt est obligatoire — le build échoue sinon'),
		chapo: z.string().min(1, 'chapo est obligatoire'),
		essentiel: z
			.array(z.string().min(1))
			.min(2, "le bloc « L'essentiel » exige 2 à 4 phrases")
			.max(4, "le bloc « L'essentiel » exige 2 à 4 phrases"),
		faq: z
			.array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
			.optional(),
		draft: z.boolean().optional().default(false)
	})
	.strict();

export type PostFrontmatter = z.infer<typeof postFrontmatter>;

export function formatIssues(file: string, err: z.ZodError): string {
	const lines = err.issues.map((i) => `  · ${i.path.join('.') || '(racine)'} : ${i.message}`);
	return `Frontmatter blog invalide dans ${file} :\n${lines.join('\n')}`;
}
