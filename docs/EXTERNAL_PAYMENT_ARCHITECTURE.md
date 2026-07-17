# Architecture des demandes de paiement externes

## Route et applications

La configuration marchande est exposée sur `https://behartechpro.fr/client?section=paiements`. `/accueil` reste un alias historique, mais n'est pas la route canonique de ce parcours.

Le même SaaS Next.js porte l'espace client, le Dashboard, le Mode Comptoir et les routes serveur `/api/external-payments/*`. Aucun secret et aucun appel fournisseur ne sont exécutés dans un site Svelte ou dans le navigateur.

## Flux commun

1. Le gérant choisit une boutique dans `/client`.
2. Le backend valide la session, le rôle `owner`/`admin`, l'organisation et la boutique.
3. OAuth ou la clé Merchant API sont traités côté serveur et les secrets sont chiffrés.
4. Une facture finalisée et rattachée à la même boutique est sélectionnée dans le Mode Comptoir.
5. Le registre `ExternalPaymentRequestProvider` crée un lien hébergé ou transmet le total TTC à un terminal.
6. Seules les métadonnées techniques de la demande sont enregistrées.
7. Le réparateur consulte son prestataire pour vérifier le règlement.

Les fournisseurs enregistrés sont `stripe`, `sumup`, `paypal`, `square`, `revolut` et `mollie`. Stripe Connect est séparé du Stripe Billing utilisé par les abonnements Behar Tech Pro.

## Données et multi-boutiques

- `external_payment_connections` : une connexion active par fournisseur et boutique, avec un fournisseur technique par défaut.
- `external_payment_readers` : terminal et location rattachés à la même organisation et boutique.
- `external_payment_requests` : facture, montant demandé, devise, lien/identifiant technique et état `created`, `sent` ou `dispatch_error`.
- `external_payment_oauth_states` : état OAuth haché, expirant et consommé une seule fois.

Les factures synchronisées portent `shop_id`. La création exige la même paire `workshop_id` + `shop_id` pour la facture, la connexion et le terminal.

## Frontière du fournisseur

Le contrat commun sait seulement autoriser une connexion, traiter son retour, créer une demande externe, transmettre à un terminal, gérer les équipements techniques, déconnecter et ouvrir le dashboard externe. Il ne comporte aucune lecture de résultat, synchronisation, transaction, rapprochement, remboursement ou mise à jour de facture.
