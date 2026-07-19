# Rapport de sécurisation de la frontière de paiement — 17 juillet 2026

## Résultat

Le code applicatif a été ramené à une frontière stricte : BEHAR TECH PRO gère les factures, les dossiers et les liens externes, mais ne crée plus de règlement reçu, ne marque plus une facture ou un dossier comme payé et n'exporte plus de donnée d'encaissement.

Les deux migrations de protection sont additives et n'ont pas été appliquées à la base distante pendant cette intervention :

- `20260717160315_lock_legacy_payment_writes.sql` gèle la table `payments`, l'état historique de `sales`, les documents de paiement et les factures validées, y compris leurs lignes ;
- `20260717163000_minimize_external_payment_request_storage.sql` limite les nouvelles demandes externes à la facture, au prestataire, à l'identifiant technique et à l'URL hébergée.

La proposition destructive reste séparée sous `supabase/proposals/` et s'arrête volontairement avec `EXPLICIT_APPROVAL_REQUIRED_DO_NOT_RUN`.

## Inventaire live en lecture seule

Inventaire agrégé exécuté le 17 juillet 2026, sans sélectionner ni afficher d'identité client :

- `payments` : **0 ligne** ;
- ventes avec un `payment_status` différent de `draft` : **0 ligne** ;
- documents historiques de paiement : **0 ligne** ;
- factures avec un statut de résultat financier : **0 ligne** ;
- demandes externes contenant un montant : **0 ligne** ;
- demandes externes contenant un état technique : **0 ligne** ;
- snapshots contenant la clé de compatibilité `payments` : **27**, tous avec une collection vide ;
- objets de paiement embarqués dans ces snapshots : **0** après suppression ciblée des **53 objets de test** explicitement identifiés par le propriétaire.

Le nettoyage du 17 juillet 2026 a conservé chaque snapshot, dossier, client, facture et réparation. Seuls les 53 objets de test contenus dans `state.payments` et les propriétés de résultat associées ont été retirés. L'inventaire live de contrôle confirme zéro objet restant.

## Changements fonctionnels

- Les routes `/dashboard/paiements` et `/dashboard/ventes` redirigent vers les factures.
- Les anciens mutateurs de paiement sont verrouillés et retournent sans écrire.
- La synchronisation, le localStorage, les sauvegardes JSON, les DTO publics et les documents publics sont nettoyés avant persistance ou exposition.
- La création de demande externe utilise le TTC de la facture uniquement en mémoire ; le montant, la devise, le canal, le terminal, l'état et la date ne sont pas enregistrés sur la demande.
- Les erreurs de transmission externes ne sont pas persistées.
- Le retour PayPal est générique et ne capture aucune commande. PayPal est limité à un lien PayPal.Me ou PayPal Business hébergé.
- Les tableaux de bord présentent le chiffre d'affaires **facturé**, jamais encaissé.
- L'export s'intitule « Export des factures pour votre comptable » et produit CSV, XLSX ou ZIP CSV + PDF, sans payé/impayé/moyen/date/montant reçu et sans journal comptable.
- Une facture validée et ses lignes deviennent immuables en base ; une correction passe par un avoir ou une nouvelle facture.

## Vérifications

- TypeScript : réussi (`npx tsc --noEmit`).
- Tests ciblés : **72 réussis** sur 4 fichiers.
- Build Next.js de production : réussi, **70 pages** générées.
- Le contrôle Biome global du dépôt reste affecté par une dette de formatage préexistante et non liée ; aucun formatage global n'a été appliqué.

## Risques résiduels et mise en production

1. Tant que les migrations additives ne sont pas déployées, la base distante ne bénéficie pas encore des triggers de blocage et d'immuabilité.
2. Les types et composants historiques de paiement restent temporairement dans le code pour relire les anciens snapshots, mais les routes sont masquées/redirigées, les mutateurs bloqués et les persistances sanitizées.
3. Après déploiement, exécuter à nouveau `supabase/audits/payment_data_inventory.sql` et archiver uniquement les agrégats.
