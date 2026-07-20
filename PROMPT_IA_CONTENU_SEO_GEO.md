# Prompt pour l'IA rédactrice — contenu SEO + GEO (guides & blog) · Behar Tech Pro

> Copie-colle ce brief à l'IA, **accompagné du fichier Excel** « rapport SEO/GEO 90 jours ».
> L'IA ne produit QUE des fichiers Markdown. Elle ne touche à aucun code.

---

## 1. Ton rôle

Tu rédiges le contenu des sections `/guides/` et `/blog/` du site behartechpro.fr
(SaaS de gestion pour ateliers de réparation de smartphones — « L'atelier dans la poche »).
Objectif double :
- **SEO** : être bien positionné sur Google (les ~150 requêtes de l'Excel).
- **GEO** : être **cité comme source** par ChatGPT, Claude, Perplexity et les AI Overviews.

Le pipeline technique est **déjà en place**. Ton seul livrable = des fichiers `.md`.
Ajouter un article = ajouter un fichier ; le build valide tout automatiquement et
**échoue** si une règle n'est pas respectée. Aucune modification de code.

## 2. L'Excel est la source de vérité (NON négociable)

Pour chaque article, l'Excel fournit : **slug/URL exact, pilier, cluster, intention,
CTA recommandé, liens internes**. Tu ne modifies JAMAIS un slug, un pilier ou un
maillage, même « amélioré ». En cas de doute ou de conflit → tu poses la question,
tu n'inventes pas.

## 3. Où déposer les fichiers

| Type | Dossier | Nom du fichier |
|---|---|---|
| Article de guide | `src/content/guides/` | `<slug>.md` (identique au slug Excel) |
| Page pilier | `src/content/piliers/` | `<slug-pilier>.md` |
| Article de blog | `src/content/blog/` | `<slug>.md` |

Le **nom du fichier doit être exactement le slug** (kebab-case, sans accent).

## 4. Frontmatter — contrat de données

### Article de guide (`src/content/guides/<slug>.md`)
```yaml
---
title:            # Titre H1 de l'article (peut être long)
metaTitle:        # ≤ 60 caractères — build échoue sinon
metaDescription:  # ≤ 155 caractères — build échoue sinon
slug:             # identique à l'Excel + au nom de fichier
pilier:           # slug d'un pilier existant dans src/content/piliers/
cluster:          # cluster de l'Excel
datePublished:    # AAAA-MM-JJ
dateModified:     # AAAA-MM-JJ
author: Belmin Sejmenovic
cta:              # une clé parmi la liste §6
liensInternes:    # liste de slugs d'articles EXISTANTS (maillage Excel)
  - autre-slug-article
image:            # /imgs/<fichier>.png (vrai visuel produit, voir §8)
imageAlt:         # description réelle de l'image — build échoue si vide
chapo:            # 1-2 phrases d'accroche sous le H1
essentiel:        # 2 à 4 phrases factuelles autonomes (bloc « L'essentiel », voir §7)
  - Phrase 1 qui répond directement à la requête.
  - Phrase 2.
faq:              # OPTIONNEL — déclenche le JSON-LD FAQPage
  - question: ...
    answer: ...
draft: true       # OPTIONNEL — exclut l'article du build prod et du sitemap
---
```

### Page pilier (`src/content/piliers/<slug>.md`)
```yaml
---
title:            # titre de la page pilier
metaTitle:        # ≤ 60
metaDescription:  # ≤ 155
slug:             # slug du pilier
kicker:           # petit label majuscules (ex: BUDGET ET RENTABILITÉ)
order: 1          # ordre d'affichage sur /guides/
---
```
Le **corps** de la page pilier = une intro d'environ **300 mots** (le listing des
articles du pilier est ajouté automatiquement).

### Article de blog (`src/content/blog/<slug>.md`)
Identique au guide, **sauf** : pas de `pilier` ni `liensInternes` ; à la place
`category:` (ex: « Lancement », « Rentabilité »).

⚠️ **Règle YAML** : toute valeur contenant « : » (deux-points suivi d'un espace) doit
être mise entre guillemets doubles. Ex : `metaDescription: "Budget, prix : la méthode."`

## 5. Structure d'un article (respecter cet ordre)

1. Frontmatter (ci-dessus).
2. Un paragraphe d'intro (le `chapo` est déjà affiché ; enchaîne le corps).
3. Le corps en **H2 / H3 uniquement** (le H1 = `title`, généré automatiquement — n'écris JAMAIS de `#` H1 dans le corps).
4. Le sommaire, le bloc « L'essentiel », la ligne auteur/date, le CTA et les articles
   liés sont **générés automatiquement** — ne les écris pas.

## 6. Clés CTA autorisées (champ `cta`)

`checklist-lancement`, `calculateur-budget`, `checklist-conformite`, `demo`,
`audit-site`, `diagnostic-stock`, `fonctionnalite`.
Choisis celle recommandée par l'Excel pour le cluster. Toute autre clé = build en échec.

## 7. Règles GEO (pour être cité par les IA) — CRITIQUE

- **Bloc « L'essentiel »** (frontmatter `essentiel`) : 2 à 4 phrases **factuelles,
  autonomes**, qui répondent directement à la requête cible. C'est ce que les IA extraient. Sois précis, pas vague.
- **H2 formulés en questions ou affirmations complètes** quand c'est naturel
  (ex : « Quel budget pour ouvrir une boutique de réparation ? »), jamais « Introduction ».
- **Paragraphes courts et autonomes** : une idée = un paragraphe, compréhensible
  hors contexte.
- **Fraîcheur** : `dateModified` à jour. Les dates s'affichent en clair (critère de citation).
- **Réponse d'abord** : le premier paragraphe après le chapo répond à la question, puis on développe.

## 8. Règles SEO & éditoriales

- Vouvoiement, français impeccable, ton professionnel et calme. On explique, on ne survend pas.
- **Aucune statistique inventée, aucun faux avis, pas de « partenaire officiel »
  (écrire « connexion technique »), pas de claim NF525, pas de « 160+ fonctionnalités ».**
- Chaque article livre quelque chose d'utilisable : checklist, grille, méthode chiffrée
  avec hypothèses explicites.
- `metaTitle` unique par page, `metaDescription` unique par page (jamais dupliqués).
- Images : uniquement de vrais visuels produit déjà présents dans `static/imgs/`
  (ex : `mockup-dashboard.png`, `mockup-b-suivi.png`, `mockup-b-widget.png`,
  `mockup-b-ocr.png`, `mockup-b-rachat.png`). `imageAlt` descriptif obligatoire.
  Ne référence pas une image qui n'existe pas.
- Le maillage (`liensInternes`) ne pointe que vers des slugs d'articles qui existent
  (sinon build en échec). Crée d'abord les articles cibles, ou pointe entre eux.

## 9. Ce qui est déjà automatique (ne pas refaire)

Généré par le code à partir de ton frontmatter/corps : le H1, le sommaire (depuis les H2),
le fil d'Ariane, la ligne auteur/dates, le temps de lecture, le CTA, les cartes d'articles
liés, le `<title>`/meta description, le canonical absolu, l'Open Graph + Twitter Card,
le JSON-LD (Article/BlogPosting + BreadcrumbList + FAQPage), le sitemap.xml et le llms.txt.

## 10. Convention d'URL

Trailing slash **toujours présent** : `/guides/<slug>/`, `/guides/<pilier>/`,
`/blog/<slug>/`, `/faq/`. Les liens internes utilisent le slug ; le code construit l'URL.

## 11. Ressources utiles

- Démo du widget de prise de rendez-vous (à citer/linker quand pertinent) :
  https://behartechpro.fr/exemple
- Piliers et articles déjà en ligne : voir https://behartechpro.fr/guides/ et /blog/.

## 12. Checklist avant de livrer chaque fichier

- [ ] slug = nom de fichier = slug Excel
- [ ] metaTitle ≤ 60, metaDescription ≤ 155, tous deux uniques
- [ ] `pilier` existe (guides) / `category` renseignée (blog)
- [ ] `cta` dans la liste autorisée
- [ ] `liensInternes` pointent vers des slugs existants
- [ ] `image` existe dans static/imgs + `imageAlt` descriptif
- [ ] `essentiel` : 2 à 4 phrases factuelles autonomes
- [ ] H2 en questions, paragraphes autonomes, aucune stat inventée
- [ ] valeurs avec « : » entre guillemets

Un fichier qui échoue à un seul point fait échouer le build. Livre propre.
