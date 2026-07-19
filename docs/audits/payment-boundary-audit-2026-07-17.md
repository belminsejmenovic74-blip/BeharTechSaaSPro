# Audit de la frontière de paiement — 17 juillet 2026

## Périmètre et conclusion initiale

L'audit couvre les migrations Supabase, les routes Next.js, le store Zustand, la synchronisation cloud, les DTO publics, les exports, les composants et les textes d'interface.

Conclusion initiale : l'architecture récente de demandes externes (`external_payment_*`) respecte globalement une séparation technique, mais le socle historique conserve encore un module de règlement local complet. En l'état initial de l'audit, BEHAR TECH PRO pouvait encore créer et synchroniser des règlements reçus. L'application ne pouvait donc pas confirmer la frontière demandée.

## Tables et colonnes concernées

### Structures historiques à rendre strictement obsolètes

- `public.payments` : `amount`, `method`, `status`, `paid_at`, `payment_number`, `public_token`, `public_url` ; la table enregistre un règlement reçu et doit devenir immédiatement non insérable/non modifiable avant une suppression séparée validée.
- `public.sales.payment_status` : état local d'encaissement ; aucune nouvelle écriture ne doit le faire évoluer.
- `public.documents.payment_id` et le type `payment_receipt` : publication de confirmations de règlement ; à ne plus alimenter.
- `public.repairs.payment_status` (présent dans les types/lectures historiques) : ne doit plus être exposé ni utilisé pour calculer l'état d'un dossier.
- `workshop_snapshots.state` : le JSON complet contient historiquement `payments`, les champs `paidAt`, `paidAmount`, `paymentMethod`, `paymentStatus` et des journaux liés au règlement. C'est une persistance de données d'encaissement à neutraliser.

### Structures externes autorisées sous réserve des contrôles serveur

- `external_payment_connections` : fournisseur, compte externe, boutique et secrets chiffrés.
- `external_payment_requests` : seules l'association à la facture, le fournisseur, l'identifiant technique et l'URL hébergée sont désormais alimentés. Les colonnes historiques `requested_amount`, `currency`, `delivery_channel`, `technical_state`, `sent_at`, `reader_id`, `repair_id` et `created_by` sont gelées, rendues facultatives pour les nouvelles lignes et inventoriées avant une purge séparée.
- `external_payment_readers` : identifiant technique du terminal externe par boutique.
- `external_payment_oauth_states` : nonce CSRF à usage unique, sans résultat financier.

Les migrations de ces tables activent et forcent RLS, révoquent l'accès Data API aux rôles publics et utilisent des contraintes organisation/boutique. Aucun webhook marchand n'a été trouvé dans `src/app/api/external-payments`.

## Fichiers et fonctionnalités à risque

### Critique — écritures de règlements

- `src/app/api/behar/sync/route.ts` : transforme `payload.payments` en lignes `public.payments`, écrit `paid_at`, `method`, `status`, et publie des documents de confirmation ; écrit aussi `sales.payment_status`.
- `src/lib/workshop-sync.ts` et `src/components/behar/auto-sync-provider.tsx` : sauvegardent le store complet, y compris les règlements, dans `workshop_snapshots.state`.
- `src/lib/data/normalized-sync.ts` : inclut `payments` dans le contrat envoyé au serveur.
- `src/lib/behar-store.ts` : les mutateurs `markInvoicePaid`, `addPayment`, `markRepairAsPaid`, `recordRepairSettlement`, `closeDossierWithSettlement`, `updatePaymentStatus` et `paySale` créent ou modifient des règlements locaux, des reçus, des dates, des moyens et des montants.

Action : bloquer ces mutateurs, exclure les propriétés interdites des persistances locale/cloud, retirer les écritures normalisées et ajouter un verrou SQL additif.

### Critique — export non conforme

- `src/lib/accounting-export/core.ts` : calcule payé, reste à payer, statut, remboursement et CA encaissé.
- `src/lib/accounting-export/serializers.ts` : exporte les données d'encaissement et génère un journal de ventes avec comptes comptables.
- `src/app/api/behar/accounting-exports/route.ts` et `src/components/behar/accounting-export-workspace.tsx` : exposent filtres de paiement et format `sales_journal`.
- `supabase/migrations/20260717143252_accounting_exports.sql` : enrichit la table historique `payments` et autorise le format `sales_journal`.

Action : remplacer par « Export des factures pour votre comptable », limité à CSV, XLSX et ZIP CSV+PDF par période, sans donnée d'encaissement ni écriture comptable automatique.

### Élevé — exposition publique et analytique dérivée

- `src/lib/server/public-api.ts` : lit `payments`, déduit un règlement et renvoie `paymentStatus`/`hasPaidPayment`.
- `src/lib/public-repair-dto.ts`, `src/lib/public-tracking-documents-sync.ts`, `src/lib/public-commercial-dto.ts` : créent ou publient des reçus et états de paiement.
- `src/components/behar/public-tracking-view.tsx`, `document-preview.tsx`, `public-printable-document-page.tsx` : affichent des confirmations de règlement historiques.

Action : ne plus créer ni publier ces données ; conserver uniquement une compatibilité de lecture historique non accessible depuis les nouveaux parcours jusqu'à la migration de suppression.

### Élevé — interface de caisse historique

- `src/components/behar/cash-register-modal.tsx`, `payments-workspace.tsx`, `sales-workspace.tsx`, `settlement-modal.tsx`, `repairs-workspace.tsx`, `comptoir-workspace.tsx` : contiennent encaissement manuel, espèces/carte/chèque, paiement partiel, marquage payé ou reçu.
- `/dashboard/paiements` est déjà redirigé vers les factures, mais `/dashboard/ventes` et certains parcours comptoir restent accessibles par URL directe.

Action : rediriger les routes historiques de caisse/ventes, retirer leur permission de routage et conserver uniquement la création de lien externe depuis une facture finalisée.

### Moyen — documentation, mocks et PRD

- `src/mock/payments.ts`, `src/mock/demo.ts`, `src/mock/invoices.ts`, `docs/prd/modules/07-paiements.md`, `PRD_BEHAR_TECH_PRO.md` et des rapports QA décrivent encore l'ancien produit de caisse.

Action : ces éléments ne doivent pas être chargés en production. Leur nettoyage éditorial complet peut suivre après le verrouillage technique ; les tests de frontière doivent empêcher leur réintroduction dans le runtime.

## Factures et audit documentaire

Le store contient déjà un verrou applicatif (`lockedAt`) qui bloque la modification/suppression des factures validées et journalise les tentatives. Ce contrôle doit être doublé en base : interdiction de supprimer une facture non brouillon, interdiction de modifier numéro/date/montants après validation, journal d'audit documentaire et unicité organisation/numéro. Les corrections passent par avoir ou nouvelle facture.

## Isolation, rôles et sécurité

- Les routes serveur utilisent une licence rattachée à l'atelier et vérifient l'organisation ; l'export doit en plus limiter le rôle à gérant/administrateur/comptable.
- Les tables externes ont une clé composite organisation/boutique et RLS forcée.
- Les secrets fournisseurs sont chiffrés côté serveur ; aucune clé `service_role` ne doit être exposée au client.
- Les réponses et téléchargements doivent rester `private, no-store`, avec URLs signées temporaires pour les PDF.
- Aucun montant, statut ou résultat financier ne doit être envoyé aux logs ou outils d'analyse.

## Données existantes à inventorier avant suppression

Aucune suppression destructive n'est exécutée par cet audit. L'inventaire live à valider doit au minimum compter, par organisation et boutique :

- lignes de `payments` et bornes `created_at`/`paid_at` ;
- lignes `sales` dont `payment_status` n'est pas la valeur historique par défaut ;
- documents avec `payment_id` ou type `payment_receipt` ;
- snapshots dont le JSON contient une clé interdite ;
- réparations/factures portant un état local payé dans les colonnes ou le JSON.

La requête d'inventaire est fournie séparément de la migration de purge. Toute suppression des lignes/colonnes exige une validation explicite.

## Décision de remédiation

1. Arrêt immédiat des nouvelles écritures locales et cloud de règlements.
2. Sanitisation des snapshots et DTO avant persistance ou exposition.
3. Export strictement fondé sur les factures émises.
4. Verrou SQL additif des tables/colonnes obsolètes et des factures validées.
5. Tests automatiques de frontière, d'immuabilité, d'isolation et de fuite de secrets.
6. Migration destructive de purge préparée séparément, jamais exécutée automatiquement.
