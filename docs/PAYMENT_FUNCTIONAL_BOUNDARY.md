# Frontière fonctionnelle des demandes de paiement externes

## Objet

Behar Tech Pro gère les devis, les factures et la création de demandes techniques envoyées à un fournisseur externe. Le règlement lui-même est traité et conservé par Stripe, SumUp, PayPal, Square, Revolut, Mollie, la banque, la caisse ou le terminal du réparateur.

L’architecture a été conçue pour ne pas fournir de fonction de mémorisation des paiements reçus. Elle ne constitue pas une déclaration de certification, de conformité NF525 ou d’exclusion juridique officielle.

## Données conservées

Une demande externe peut conserver : la facture et le dossier liés, le total TTC strictement repris de la facture finalisée, la devise, le fournisseur, la boutique, les dates de création/transmission, le lien hébergé, l’identifiant technique du Checkout et un état de transmission purement technique.

Les seuls états techniques autorisés sont :

- `created` : le fournisseur a renvoyé un lien hébergé ;
- `sent` : la demande a été transmise à un canal externe ;
- `dispatch_error` : l’appel réseau immédiat n’a pas abouti.

Ils ne décrivent jamais le résultat du règlement.

## Données et fonctions interdites

Behar Tech Pro ne doit ni enregistrer, ni afficher, ni déduire :

- le succès, l’échec ou l’expiration financière d’une demande ;
- un montant reçu, partiel, remboursé ou restant réellement dû ;
- un acompte reçu ;
- un moyen de paiement, des données de carte ou une transaction finale ;
- la date du règlement, un remboursement, un litige, un versement ou un solde ;
- un historique de règlements, un rapprochement bancaire ou une clôture de caisse ;
- un bouton de confirmation ou de marquage manuel d’un règlement ;
- une mise à jour automatique de facture ou de dossier à partir d’un fournisseur.

Aucun webhook marchand Stripe, SumUp, PayPal, Square, Revolut, Mollie ou terminal n’est créé. Les webhooks Stripe propres aux abonnements Behar Tech Pro restent séparés et ne doivent pas être modifiés par cette intégration.

## Vocabulaire d’interface

Phrase générale autorisée :

> Le règlement est géré en dehors de Behar Tech Pro par Stripe, SumUp, PayPal, Square, Revolut, Mollie ou le système de paiement du réparateur.

## Square

Square utilise exclusivement le jeton OAuth du vendeur pour créer un lien hébergé ou transmettre le total TTC à son
Square Terminal. Aucun résultat n’est relu, aucun `payment_id` n’est conservé et aucune commission applicative n’est
configurée. Les terminaux sont isolés par boutique, fournisseur et Device ID.

## Revolut Business

Revolut utilise la Secret API Key du Merchant Account du réparateur, chiffrée côté serveur. Le test ne charge que les
locations techniques. La création d’un lien conserve uniquement l’order ID et l’URL hébergée ; l’envoi Terminal ignore
le corps du payment intent et ne déclenche aucune lecture finale. La liste des orders, payments, payment attempts,
refunds et rapports reste hors frontière.

## Mollie

Mollie Connect utilise le jeton OAuth de l’organisation du réparateur et le profile ID associé à la boutique. La
création est limitée aux moyens immédiats autorisés, sans application fee, routing, split, resell pricing, customer,
mandat ou abonnement. Seuls l’identifiant technique et le checkout URL sont conservés ; aucun Payments Get/List,
webhook, remboursement, chargeback, settlement, balance ou invoice Mollie n’est utilisé.

Cette phrase ne confirme jamais un règlement particulier.

Les termes indiquant un résultat financier particulier sont interdits dans ce parcours, notamment « paiement réussi », « payé », « impayé », « en attente de paiement », « paiement refusé », « reste à payer », « montant encaissé », « marquer comme payé » et « indiquer un règlement ».

## CA facturé et CA encaissé

Le **CA facturé** est calculé depuis les factures émises. Il décrit la facturation produite par l’atelier.

Le **CA encaissé** suppose de connaître les règlements réellement reçus. Cette donnée n’est pas calculée par la nouvelle intégration et ne doit pas être présentée à partir des demandes externes.

## Indépendance opérationnelle

Les statuts de réparation restent indépendants : Reçu → Diagnostic → En attente → En réparation → Test final → Prêt → Terminé. Un dossier peut être terminé ou un appareil remis sans que Behar Tech Pro en déduise un règlement.

## Dette historique identifiée

Le schéma et le store historiques contiennent encore des objets de règlement (`payments`, `payment_status`, `paid_at`, `paidAmount`) et des fonctions telles que `markInvoicePaid`, `recordRepairSettlement`, `closeDossierWithSettlement` et `markRepairAsPaid`. Aucune suppression destructive n’est réalisée par la migration des demandes externes. Le module `/dashboard/paiements` est masqué et les principaux parcours facture/dossier ont été redirigés vers la demande externe.

Ces données historiques doivent faire l’objet d’une migration juridique et produit séparée avant suppression. Tant que cette reprise n’est pas terminée, elles ne doivent pas être réutilisées par la nouvelle intégration.

## Évolution future

Toute synchronisation future de statuts financiers, de transactions, de remboursements, de versements ou de soldes nécessite une nouvelle analyse juridique et une nouvelle décision d’architecture. Elle ne doit pas être ajoutée à l’interface `ExternalPaymentRequestProvider` existante.

## SumUp Solo

L’envoi Cloud API vers un Solo est disponible automatiquement lorsque `SUMUP_ENVIRONMENT=sandbox`. En production, il reste derrière `SUMUP_TERMINAL_DISPATCH_ENABLED=false` et son activation exige une validation juridique préalable. Aucune URL de résultat, lecture de statut ou récupération de transaction n’est implémentée.

## PayPal

Le lien PayPal manuel est chiffré et n'entraîne aucun appel de lecture. PayPal Commerce Platform reste indisponible tant que les identifiants partenaire ne sont pas tous configurés. Partner Referrals demande uniquement `PAYMENT`; les ordres désignent le réparateur comme payee direct, sans commission. Le retour de capture vérifie une signature puis ignore entièrement le corps de réponse et affiche une page générique.
