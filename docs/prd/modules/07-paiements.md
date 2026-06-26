# Mini-PRD - Paiements

## Objectif du module

Suivre les encaissements liés aux factures, réparations ou ventes, avec paiements totaux, partiels, acomptes et reçus, sans dépendre d'une API bancaire réelle pour la démo.

## Utilisateurs concernés

- Accueil / comptoir.
- Gérant.
- Utilisateur autorisé à encaisser.

## Problèmes à résoudre

- Paiements non reliés aux dossiers.
- Solde restant peu clair.
- Acomptes oubliés.
- Reçus difficiles à générer.
- Confusion entre facture, réparation et paiement.
- Dépendance inutile à un paiement en ligne pour la démo.

## Parcours utilisateur

### Encaisser une facture

1. L'utilisateur ouvre une facture.
2. Il choisit enregistrer un paiement.
3. Il sélectionne le moyen de paiement.
4. Il saisit le montant.
5. Le système calcule payé, partiel ou solde restant.
6. Un reçu peut être ouvert ou téléchargé.

### Encaisser un acompte

1. L'utilisateur ouvre une réparation.
2. Il choisit acompte.
3. Il saisit montant et moyen.
4. L'acompte est lié au dossier.
5. Le montant est repris au moment de la facture si le flow le prévoit.

## Composants / écrans

- Liste paiements.
- Formulaire encaissement.
- Sélecteur moyen de paiement.
- Bloc solde facture.
- Historique paiements.
- Reçu ou justificatif.
- Etat paiement: payé, partiel, en attente, annulé.
- Actions remboursement ou correction selon permission.

## Données nécessaires

- Identifiant paiement.
- Montant.
- Devise.
- Moyen: espèces, carte, virement, autre.
- Date.
- Statut.
- Facture liée si disponible.
- Réparation liée si acompte.
- Vente liée si applicable.
- Utilisateur ayant encaissé.
- Reçu lié.
- Notes internes optionnelles.

## Règles métier

- Un paiement doit être relié à une facture, une réparation ou une vente.
- Un paiement partiel doit mettre à jour le solde.
- Un paiement ne doit pas dépasser le montant dû sans règle explicite.
- Un acompte peut exister avant facture.
- Le reçu client ne doit jamais afficher marge, prix d'achat, fournisseur ou stock interne.
- La devise doit suivre le contexte du document ou dossier.
- Le remboursement ou l'annulation doit être protégé par permission.
- Les paiements mock/local doivent fonctionner sans API bancaire.

## Cas limites / erreurs à gérer

- Montant vide, nul ou négatif.
- Montant supérieur au reste dû.
- Devise manquante.
- Facture introuvable.
- Réparation introuvable.
- Paiement en double.
- Reçu impossible à ouvrir.
- Utilisateur sans permission d'encaisser.
- Remboursement sans permission.
- Données locales non synchronisées.

## Critères d'acceptation

- Un utilisateur autorisé peut enregistrer un paiement total.
- Un utilisateur autorisé peut enregistrer un paiement partiel.
- Le solde restant est mis à jour.
- Un acompte peut être lié à une réparation.
- Le reçu peut être ouvert ou téléchargé.
- Les paiements fonctionnent en local/mock.
- Les permissions protègent encaissement, remboursement et annulation.
- La devise affichée est cohérente.

## Tests obligatoires

- Encaisser une facture complète.
- Encaisser une facture partiellement.
- Vérifier le solde restant.
- Enregistrer un acompte sur réparation.
- Ouvrir ou télécharger un reçu.
- Tester plusieurs moyens de paiement.
- Tester montant invalide.
- Tester paiement supérieur au reste dû.
- Tester rôle sans permission d'encaisser.
- Vérifier absence de données internes sur reçu.

