# Audit technique préalable — Widget client Behar Tech Pro

Date de l’audit : 10 juillet 2026  
Périmètre : dépôt `BeharTecjSaaS-main`, code applicatif, migrations Supabase, API, stockage, synchronisation et tests.  
Statut : audit préalable uniquement — aucune implémentation du widget.

## 1. Résumé exécutif

L’application possède déjà la majorité des briques métier nécessaires au widget : catalogue d’appareils, catalogue tarifaire, clients avec détection partielle des doublons, rendez-vous, notifications, préremplissage du comptoir et section « Entrées prévues » de l’atelier. Ces briques peuvent être réutilisées, mais elles ne peuvent pas être appelées directement depuis un widget public dans leur état actuel.

Le point architectural déterminant est que Behar Tech Pro est aujourd’hui **local-first** : l’état métier principal est géré dans un grand store Zustand persistant, puis synchronisé en bloc dans `workshop_snapshots`. Une API secondaire normalise également une partie de cet état dans des tables Supabase. Le widget, lui, devra être **server-first** pour gérer la concurrence sur les créneaux, l’idempotence, l’anti-spam et l’isolation des ateliers.

Le MVP ne doit donc pas écrire directement dans le store depuis la page publique. Il doit écrire dans des tables normalisées par des routes serveur, puis le SaaS doit ingérer/synchroniser ces objets vers son store. Cette frontière est indispensable pour éviter les doubles réservations et l’exposition de prix d’achat, fournisseurs, lots ou données d’autres ateliers.

Décision recommandée : ne pas commencer l’interface publique avant d’avoir sécurisé l’identité atelier/licence, défini les tables publiques filtrées et livré une API de création transactionnelle des demandes et rendez-vous.

## 2. Architecture et technologies réellement utilisées

- Framework : Next.js 16 App Router, React 19 et TypeScript strict.
- Interface : Tailwind CSS 4, composants shadcn/Radix/Base UI, icônes Lucide, notifications Sonner.
- État principal : Zustand 5 avec persistance locale.
- Backend : Supabase/PostgreSQL, Supabase Storage et client `@supabase/supabase-js`.
- Validation : Zod et React Hook Form sont disponibles, mais leur usage n’est pas uniforme dans les routes existantes.
- Tests : Vitest pour les tests unitaires, Playwright pour les scénarios E2E, Percy pour la régression visuelle.
- Distribution : Next runtime sur Vercel/Netlify, export statique optionnel, PWA, Capacitor Android et Tauri desktop.
- Qualité : Biome pour le formatage/lint, TypeScript pour le typage.

Le projet est organisé autour de :

- `src/app/(main)` : application protégée et administration ;
- `src/app/(external)` : pages publiques par token, contact, capture et téléchargement ;
- `src/app/api` : routes serveur publiques et privées ;
- `src/components/behar` : composants et espaces métier ;
- `src/lib/behar-store.ts` : types, état, permissions et actions métier principales ;
- `src/lib/workshop-sync.ts` et `src/components/behar/auto-sync-provider.tsx` : synchronisation du snapshot ;
- `src/lib/server` : accès serveur et DTO publics ;
- `supabase/migrations` : schéma normalisé, stockage et accès publics.

Conventions observées : composants clients explicites avec `"use client"`, imports via l’alias `@/`, types métier centralisés, libellés en français, design clair `#FAFAF8` / `#1A1916` / `#2A9D8F`, boutons et panneaux réutilisables, actions Zustand auditables, routes publiques filtrées via DTO.

## 3. Authentification, tenant, boutiques et permissions

### Authentification actuelle

L’accès au SaaS repose sur trois couches : activation d’une licence, onboarding atelier, puis sélection d’un utilisateur et saisie d’un PIN. Il ne s’agit pas de Supabase Auth. Les utilisateurs, leurs PIN et leur session sont gérés dans le store Zustand. Les PIN sont présents en clair dans l’état client et dans le snapshot ; la route de normalisation calcule ensuite un hash pour `team_members.pin_hash`.

Conséquence : cette authentification suffit comme verrou d’interface locale, mais ne constitue pas une identité serveur forte pouvant autoriser une route sensible du widget ou du CMS.

### Multi-tenant

Le tenant fonctionnel correspond à l’atelier identifié par `workshop_id`, lui-même rattaché à une licence dans `workshop_snapshots`. Les tables normalisées possèdent généralement un `workshop_id`. La route `/api/behar/sync` vérifie qu’une licence est active et qu’elle est rattachée au bon atelier avant d’utiliser la clé serveur.

Risques :

- le code de synchronisation client indique qu’il lit et écrit encore directement `workshop_snapshots`, alors que la migration `0019_snapshot_access_lockdown.sql` supprime cet accès et prévoit des RPC ;
- les RPC de la migration 0019 acceptent la licence comme secret partagé, sans validation contre `license_keys` à l’intérieur de la fonction ;
- une divergence est explicitement documentée dans le code entre la base live et les migrations locales ;
- l’état contient encore des identifiants de boutique codés en dur (`shop_atelier_belmin`, `main_shop`).

### Boutiques

Le modèle courant sait porter `shopId` sur de nombreux objets, mais il n’existe pas de véritable entité multi-boutiques complète dans le store ni de table `shops` dans le schéma principal. Les réglages gèrent surtout l’atelier, le pays, le marché et la devise. Le widget multi-boutiques du PRD ne peut pas reposer sur les chaînes `shopId` actuelles.

Recommandation : créer une table `shops` rattachée à `workshops`, migrer progressivement les objets vers une vraie clé étrangère et imposer `workshop_id + shop_id` sur toutes les requêtes du widget.

### Rôles et permissions

Les rôles existants sont `admin`, `technician` et `frontdesk`, avec une matrice de permissions détaillée et des surcharges par utilisateur. Les routes du dashboard sont filtrées par `PermissionRouteGuard`, et les actions critiques du store appellent souvent `requirePermission`.

Éléments réutilisables :

- `canViewSettings` / `canEditSettings` pour la configuration du widget ;
- `canViewClients` / `canCreateClient` pour les prospects ;
- `canViewRepairs` / `canCreateRepair` pour les rendez-vous et pré-fiches ;
- `canViewQuotes` / `canCreateQuote` pour la conversion en devis ;
- journal d’audit et notifications du store.

Éléments manquants : permissions dédiées `canManageWidget`, `canPublishWidget`, `canViewWidgetLeads`, `canManageWidgetAppointments`, `canViewWidgetAnalytics`. Les contrôles du store ne protègent pas une API serveur ; il faudra une authentification serveur ou un mécanisme signé pour les opérations du SaaS.

## 4. Briques métier réutilisables

### Clients

`addCustomer` normalise le téléphone et l’email, recherche un client existant et évite un doublon simple. Il journalise aussi la réutilisation. À compléter : gestion explicite de plusieurs correspondances, fusion prudente des champs manquants, index uniques partiels par atelier et normalisation serveur.

### Rendez-vous

Le type `Appointment` contient déjà client, appareil, panne, prix, instantané de prix, date, heure, durée, source, statut et lien réparation. `addAppointment`, `updateAppointment`, `deleteAppointment` et `createRepairFromAppointment` sont réutilisables côté SaaS.

Manques critiques : aucune réservation transactionnelle serveur, aucune capacité par technicien/boutique, aucune exclusion atomique du dernier créneau et aucune clé d’idempotence.

### Comptoir et atelier

Le mode comptoir affiche les rendez-vous, permet de les transformer et préremplit client/appareil/panne/prix. L’atelier possède une section « Entrées prévues » qui sélectionne les rendez-vous `En attente`, `Confirmé` ou `Arrivé` non encore liés à une réparation. Après arrivée, `createRepairFromAppointment` fait entrer le dossier dans le pipeline normal.

Cette structure couvre déjà l’objectif « rendez-vous dans le comptoir » et « à venir dans l’atelier ». Pour le widget, la meilleure stratégie est de créer un rendez-vous et une pré-fiche normalisée, puis de les ingérer dans le store avec `source = "Widget site internet"`.

### Catalogue appareils et prestations

Le dépôt contient un catalogue d’appareils, des marques et modèles configurables, des imports JSON/XLSX et un catalogue tarifaire `PriceBookItem`. Celui-ci associe catégorie, marque, modèle, réparation, pièce, qualité, prix d’achat, main-d’œuvre, prix client, fournisseur, stock, garantie et statut actif.

Le statut `isActive` ne signifie pas « publié sur le widget ». Il faut une couche de publication séparée. Le widget ne doit jamais sérialiser un `PriceBookItem` complet car il contient prix d’achat, marge et fournisseur.

### Prix

Les calculs France/Suisse, les qualités et les `PriceSnapshot` existent. L’instantané actuel contient aussi des champs internes (`fournisseur`, `prixAchat`, `marge`). Il peut être conservé en interne, mais un DTO public distinct doit contenir uniquement type d’affichage, prix client, devise, qualité, durée et garantie.

Manquent : modes « exact », « à partir de », « fourchette », « sur demande », « masqué », indicateur de publication et version publiée immuable.

### Stock, lots et factures fournisseurs

Le stock sait gérer articles, mouvements, achats, fournisseurs, factures fournisseur, lignes de facture et lots FIFO reconstruits via `stock-lots.ts`. Les mouvements prévoient déjà `reservation_created` et `reservation_released`.

Manques : aucun champ canonique « réservé » ou « affecté » directement exploitable ; la disponibilité client doit être calculée côté serveur depuis les mouvements et affectations. Le DTO public doit interdire fournisseur, facture, lot, coût, marge, référence interne et quantité exacte sauf publication explicite.

### Notifications

Le store possède des notifications temps réel au sens UI locale, avec lecture/non-lu et affichage dans la topbar. Elles sont synchronisées dans le snapshot. Il n’existe pas de pipeline serveur dédié pour les notifications widget, ni de push navigateur robuste, ni de file email/SMS.

### Fichiers et photos

Des routes et buckets existent pour les photos de réparation, documents PDF, médias CMS et captures mobiles. Les types MIME et tailles sont partiellement contrôlés.

Risques : certaines routes d’upload utilisent le `service_role` sans authentification ni vérification d’appartenance atelier ; les buckets de photos/documents sont publics ; les erreurs du fournisseur sont parfois renvoyées au client. Les uploads du widget doivent utiliser un bucket privé distinct, un chemin tenanté, une URL signée courte, une validation serveur et une politique de rétention.

## 5. Éléments similaires déjà présents

- Pages publiques de suivi de réparation par token.
- Pages publiques de devis, factures, reçus, ventes et documents.
- Acceptation/refus public d’un devis.
- Messagerie publique liée à une réparation.
- Certificats publics de reconditionnement avec réglages de visibilité.
- Formulaire public de contact.
- Capture photo mobile et relais de fichiers.
- CMS d’aide avec aperçu et médias.
- Écran complet de rendez-vous et création depuis le comptoir.
- Visuel marketing `public/assets/landing/feature-widget.png` et contenu du site mentionnant le widget.

Il n’existe toutefois aucun widget fonctionnel, aucune route de réservation publique, aucune table de demandes widget, aucune configuration brouillon/publication et aucune API publique de catalogue filtré.

## 6. API et sécurité existantes

Les routes publiques commerciales utilisent globalement un accès Supabase serveur et construisent des DTO filtrés. C’est un bon modèle à réutiliser. La route `/api/behar/sync` possède une vérification licence/atelier plus robuste et constitue le meilleur exemple d’isolation existant.

Problèmes observés avant ajout du widget :

1. Plusieurs routes publiques renvoient `error.message`, pouvant exposer un détail Supabase/SQL.
2. Les routes CMS d’écriture et d’upload ne possèdent pas de garde serveur explicite.
3. Les routes `repair-photos` et `repair-documents` utilisent le service role sans authentifier l’appelant ni vérifier que l’objet appartient à son atelier.
4. `src/lib/supabase/admin.ts` peut retomber sur la clé anon lorsqu’aucune clé service n’est configurée, contrairement au client serveur plus strict de `src/lib/supabase/server.ts`.
5. L’authentification PIN et les permissions sont exécutées côté client ; elles ne suffisent pas pour protéger une route serveur.
6. Les tables normalisées ont RLS activé mais pas de policies utilisateur, car l’application passe par le service role. Ce choix exige des contrôles systématiques dans chaque route.
7. Les tables `public_tracking_*` accordent des écritures anon sur des DTO publics ; ce modèle ne doit pas être copié pour des données personnelles de prospects.

## 7. Modèle de données recommandé

### Tables à créer

- `shops` : boutique réelle rattachée à `workshops`.
- `widget_settings` : réglages brouillon, domaine autorisé, état et version publiée.
- `widget_publications` : snapshot immuable de chaque publication.
- `widget_public_services` : projection filtrée des prestations publiées, sans données internes.
- `widget_sessions` : session anonyme minimale, sans PII avant soumission.
- `widget_leads` : demandes de rappel, devis ou prix.
- `widget_events` : événements analytiques sans coordonnées personnelles.
- `widget_idempotency_keys` ou contrainte dédiée : protection des doubles soumissions.
- `appointment_slots` ou mécanisme équivalent : capacité/réservation atomique par boutique et créneau.
- `pre_repair_cases` : pré-fiches à venir distinctes des réparations actives.
- `widget_uploads` : métadonnées des fichiers privés et politique de rétention.

### Tables à adapter

- `appointments` : `source`, `source_id`, `widget_id`, `lead_id`, `shop_id`, confirmation prix/stock, statut de confirmation, idempotence.
- `clients` : téléphone/email normalisés et index tenantés ; prénom/nom séparés si nécessaire.
- `workshops` : relation vers boutiques et règles de rétention.
- `stock_items` / `stock_movements` : réservations explicites et calcul serveur de disponibilité.
- `team_members` ou modèle d’identité futur : droits serveur réels.
- éventuellement `repairs` : lien vers `pre_repair_cases` et origine widget, sans créer une réparation active à la réservation.

Les données widget contenant des PII ne doivent jamais être placées dans `public_tracking_*` ni dans une table accessible directement au rôle `anon`.

## 8. Routes API à créer

Routes publiques filtrées :

- `GET /api/public/widgets/:widgetId/config`
- `GET /api/public/widgets/:widgetId/catalog/categories`
- `GET /api/public/widgets/:widgetId/catalog/brands`
- `GET /api/public/widgets/:widgetId/catalog/models`
- `GET /api/public/widgets/:widgetId/catalog/issues`
- `POST /api/public/widgets/:widgetId/quote`
- `GET /api/public/widgets/:widgetId/availability`
- `GET /api/public/widgets/:widgetId/slots`
- `POST /api/public/widgets/:widgetId/leads`
- `POST /api/public/widgets/:widgetId/appointments`
- `POST /api/public/widgets/:widgetId/uploads/sign`
- `POST /api/public/widgets/:widgetId/events`

Routes SaaS authentifiées :

- `GET/PUT /api/widgets/:widgetId/draft`
- `POST /api/widgets/:widgetId/publish`
- `GET /api/widgets/:widgetId/leads`
- `PATCH /api/widgets/:widgetId/leads/:leadId`
- `GET /api/widgets/:widgetId/analytics`
- `POST /api/widgets/:widgetId/leads/:leadId/convert`

Les créations de rendez-vous doivent être transactionnelles : vérifier le créneau, réserver la capacité, créer/rattacher le client, créer le lead, le rendez-vous et la pré-fiche, puis écrire notification/audit dans une seule transaction ou fonction serveur idempotente.

## 9. Fichiers à modifier et à créer lors des prompts suivants

### Fichiers à modifier

- `src/lib/behar-store.ts` : nouveaux types/actions d’ingestion et liens widget.
- `src/components/behar/auto-sync-provider.tsx` et `src/lib/workshop-sync.ts` : synchronisation incrémentale des leads/rendez-vous ou abonnement serveur.
- `src/navigation/sidebar/sidebar-items.ts` : entrée « Demandes widget ».
- `src/components/behar/permission-route-guard.tsx` : permissions dédiées.
- `src/app/(main)/dashboard/parametres/page.tsx` : accès « Widget client ».
- `src/components/behar/comptoir-workspace.tsx` : badge Widget et alertes prix/stock.
- `src/components/behar/repairs-workspace.tsx` : pré-fiches à venir.
- `src/components/behar/appointments-workspace.tsx` : source, alertes et nouveaux statuts.
- `src/components/behar/topbar.tsx` : notifications serveur widget.
- `src/lib/data/normalized-sync.ts` et `src/app/api/behar/sync/route.ts` : nouveaux champs normalisés.

### Fichiers à créer

- migration Supabase dédiée au widget ;
- services serveur `src/lib/server/widget-*` ;
- DTO publics `src/lib/public-widget-dtos.ts` ;
- schémas Zod partagés ;
- routes API listées ci-dessus ;
- page de configuration et aperçu ;
- page « Demandes widget » et détail ;
- page publique isolée et script `widget.js` ;
- composants du parcours client ;
- tests unitaires, API, E2E, sécurité et visuels dédiés.

Cette liste est prévisionnelle. Chaque prompt d’implémentation doit limiter ses modifications à une tranche fonctionnelle vérifiable.

## 10. Plan de sécurité

1. Utiliser uniquement le `service_role` dans les modules `server-only` ; supprimer tout fallback vers la clé anon dans un client dit admin.
2. Ne jamais donner au widget un accès direct à Supabase. Toutes les lectures et écritures passent par l’API.
3. Résoudre le widget vers `workshop_id + shop_id` côté serveur ; ne jamais accepter ces identifiants depuis le navigateur comme autorité.
4. Publier une projection distincte du catalogue. Aucun objet interne complet ne quitte le serveur.
5. Appliquer Zod à toutes les entrées, limites de longueur, normalisation téléphone/email et échappement des textes.
6. Ajouter limitation par IP pseudonymisée/session/widget, honeypot et CAPTCHA adaptatif.
7. Contrôler `Origin`/`Referer` contre les domaines autorisés, tout en tenant compte des navigateurs qui omettent ces en-têtes.
8. Utiliser une clé d’idempotence unique par widget et une réservation de créneau transactionnelle.
9. Stocker les photos dans un bucket privé, avec URL signée, taille/type réels vérifiés et suppression programmée.
10. Journaliser publication, soumission, conversion, déplacement, annulation et accès refusé.
11. Séparer consentement de service et consentement marketing ; versionner le texte accepté.
12. Ne renvoyer au public que des messages neutres ; journaliser les erreurs techniques côté serveur.
13. Ajouter une rétention configurable, anonymisation/suppression RGPD et tests automatiques d’isolation inter-ateliers.

## 11. Stratégie de déploiement

1. Réconcilier d’abord les migrations locales avec la base déployée et corriger la divergence snapshot/RPC.
2. Déployer les nouvelles tables et fonctions avec RLS fermé par défaut, sans activer le widget.
3. Déployer l’API derrière un feature flag par atelier.
4. Livrer la configuration en mode brouillon uniquement.
5. Tester sur un atelier pilote et un domaine autorisé.
6. Activer les lectures publiques de la seule version publiée.
7. Activer les demandes, puis les rendez-vous dans une étape séparée.
8. Observer erreurs, latence, spam, conflits de créneaux et conversions.
9. Étendre progressivement aux autres ateliers et boutiques.

Le widget ne doit pas dépendre de l’export statique : les réservations et validations nécessitent le runtime Next serveur.

## 12. Stratégie de test

### Unitaires

- DTO et filtrage des données sensibles ;
- normalisation téléphone/email et détection client ;
- calcul de disponibilité vendable/réservée/affectée ;
- modes de prix et snapshots ;
- calcul des créneaux ;
- idempotence et règles de consentement.

### Base/API

- isolation entre deux ateliers et deux boutiques ;
- refus d’un domaine non autorisé ;
- absence de prix/stock non publié dans la réponse brute ;
- double réservation concurrente ;
- double clic avec même clé d’idempotence ;
- rollback transactionnel si une création échoue ;
- rate limiting, payloads invalides, XSS et fichiers interdits.

### E2E

- prix publié et stock publié ;
- prix absent et formulaire de rappel ;
- stock non publié avec rendez-vous à confirmer ;
- client existant et nouveau client ;
- rendez-vous visible dans planning, comptoir et atelier « À venir » ;
- conversion en réparation sans ressaisie ;
- déplacement/annulation synchronisés ;
- mobile, tablette, desktop et intégration iframe sur site hôte.

### Non-régression

- `npm run test:unit` ;
- `npx tsc --noEmit` ;
- scénarios Playwright existants ;
- tests visuels Percy ;
- audit de migration/RLS et vérification des logs API.

## 13. Procédure de retour arrière

- Feature flag global et par widget permettant une désactivation immédiate sans migration inverse.
- Conserver les colonnes ajoutées pendant au moins une version ; ne pas faire de rollback destructif automatique.
- Les migrations initiales doivent être additives.
- En cas d’incident API, afficher le message neutre et le téléphone atelier ; bloquer les nouvelles réservations sans supprimer les leads existants.
- Restaurer la version publiée précédente via `widget_publications`.
- Désactiver séparément uploads, demandes ou rendez-vous.
- Exporter les leads/rendez-vous créés avant toute migration corrective.
- Prévoir un script de réconciliation entre tables normalisées et snapshot Zustand.
- Ne supprimer les nouvelles tables qu’après export, arrêt des écritures et validation manuelle.

## 14. État actuel des erreurs et de la qualité

Contrôles exécutés pendant l’audit :

- TypeScript `npx tsc --noEmit` : réussi.
- Vitest `npm run test:unit` : 11 fichiers et 122 tests réussis.
- Biome `npm run check` : échec avec 45 erreurs et 1 030 avertissements sur 346 fichiers. Les diagnostics concernent notamment formatage, imports inutilisés, dépendances de hooks, promesses non gérées, `any`, accessibilité et boutons sans type.
- Build `npm run build` : le processus a atteint « Creating an optimized production build » mais n’a pas produit le message final de succès dans l’environnement d’audit ; résultat à considérer comme non confirmé.

Des modifications utilisateur non liées étaient déjà présentes dans :

- `src/components/behar/achats-workspace.tsx` ;
- `src/components/behar/public-certificate-view.tsx` ;
- `src/components/behar/public-printable-document-page.tsx`.

Elles n’ont pas été modifiées par cet audit.

## 15. Ordre recommandé pour les prochains prompts

1. Corriger les prérequis sécurité bloquants et réconcilier la base live avec les migrations.
2. Créer le modèle de données widget et les DTO publics.
3. Créer l’API de configuration et de catalogue publié.
4. Créer l’API transactionnelle leads/rendez-vous et l’idempotence.
5. Ajouter l’ingestion SaaS, notifications, comptoir et atelier « À venir ».
6. Créer l’écran de configuration brouillon/publication.
7. Créer le parcours public et le script d’intégration.
8. Ajouter statistiques, anti-spam, RGPD et observabilité.

Le développement peut ensuite avancer prompt par prompt, chaque tranche ayant ses propres migrations, tests et critères d’acceptation.
