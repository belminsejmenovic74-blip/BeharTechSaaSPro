# Frontière fonctionnelle des demandes externes

## Ce que Behar Tech Pro affiche

- facture finalisée, total HT, TVA, total TTC et devise;
- demande créée via le fournisseur;
- demande transmise au terminal;
- lien, QR code et actions de partage;
- invitation à ouvrir le fournisseur pour vérifier le règlement;
- état technique de connexion et de transmission uniquement.

Mention commune : « Le règlement est géré en dehors de Behar Tech Pro par le prestataire sélectionné. »

## Ce que Behar Tech Pro ne fait pas

Il ne reçoit, ne conserve et ne transfère jamais les fonds; il ne prend aucune commission et n'est pas merchant of record. Il ne lit pas le résultat financier, ne marque pas une facture, ne synchronise pas les transactions, ne rembourse pas et ne rapproche pas les encaissements.

Les interfaces de demandes externes ne proposent ni paiement partiel, acompte, paiement différé, crédit, 3X/4X, abonnement, prélèvement récurrent, carte enregistrée, Klarna, Alma, Oney, Affirm, Afterpay/Clearpay, Riverty, Billie ou in3.

La clôture d'un dossier est un état opérationnel indépendant. Elle peut intervenir avant ou après l'envoi d'une demande sans écrire de résultat financier.

## Données historiques

Les anciennes structures de règlement du SaaS ne sont pas supprimées par ces migrations additives. Elles ne sont ni alimentées ni consultées par `/api/external-payments/*`. Toute suppression future devra faire l'objet d'un audit et d'une migration juridique séparée.

Cette architecture transmet des demandes à des prestataires externes sans mémoriser les paiements reçus. Elle ne constitue pas une certification NF525.
