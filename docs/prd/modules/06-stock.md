# Mini-PRD - Stock

## Objectif du module

Permettre à l'atelier de gérer les pièces et produits nécessaires aux réparations, avec une visibilité claire sur les quantités, prix de vente et alertes, tout en protégeant les prix d'achat, marges et fournisseurs.

## Utilisateurs concernés

- Gérant.
- Technicien.
- Accueil pour consultation ou vente selon permission.

## Problèmes à résoudre

- Pièces indisponibles découvertes trop tard.
- Stock non relié aux réparations.
- Prix d'achat, marge ou fournisseur visibles par des rôles non autorisés.
- Informations stock interne exposées au client.
- Difficulté à retrouver une pièce rapidement.

## Parcours utilisateur

### Consultation stock

1. L'utilisateur ouvre le module stock.
2. Il recherche une pièce par nom, marque, modèle, SKU ou catégorie.
3. Il consulte quantité, prix vente et statut.
4. Les données sensibles s'affichent uniquement si permission active.

### Association à une réparation

1. L'utilisateur ouvre une réparation.
2. Il recherche une pièce disponible.
3. Il associe la pièce au dossier.
4. Le système met à jour la liste des pièces utilisées.
5. Le stock est décrémenté si le flow l'implémente.

## Composants / écrans

- Liste stock.
- Recherche et filtres.
- Fiche pièce.
- Création ou édition pièce.
- Indicateur quantité.
- Indicateur seuil bas.
- Sélecteur de pièce depuis réparation.
- Bloc pièces utilisées dans dossier.
- Masquage données sensibles selon permission.

## Données nécessaires

- Identifiant pièce.
- Nom.
- Catégorie.
- Marque compatible.
- Modèle compatible.
- SKU.
- Quantité disponible.
- Seuil d'alerte.
- Prix vente.
- Prix achat sensible.
- Marge sensible.
- Fournisseur sensible.
- Statut: disponible, bas, rupture, archivé.
- Réparations liées.

## Règles métier

- Le prix d'achat est visible uniquement avec permission.
- La marge est visible uniquement avec permission.
- Le fournisseur est visible uniquement avec permission.
- Le stock interne ne doit jamais apparaître dans un document client.
- Une pièce peut être associée à une réparation selon permission.
- Une réparation ne doit pas être bloquée par une pièce non renseignée si le flow métier permet de continuer.
- Le stock local/mock doit fonctionner sans API externe.
- Les suppressions ou imports doivent être protégés.

## Cas limites / erreurs à gérer

- Pièce introuvable.
- Stock à zéro.
- Quantité demandée supérieure au stock.
- Pièce archivée.
- Doublon SKU.
- Données prix achat manquantes.
- Utilisateur sans permission sensible.
- Décrément stock impossible.
- Réparation liée supprimée.
- Import catalogue partiel ou invalide.

## Critères d'acceptation

- Un utilisateur autorisé peut consulter le stock.
- La recherche permet de retrouver une pièce.
- Les quantités et seuils sont lisibles.
- Une pièce peut être associée à une réparation.
- Les données sensibles sont masquées sans permission.
- Aucun document client n'affiche stock interne, fournisseur, prix d'achat ou marge.
- Le stock reste utilisable en mode local/mock.

## Tests obligatoires

- Rechercher une pièce.
- Créer ou modifier une pièce si permission active.
- Tester affichage gérant avec données sensibles.
- Tester affichage technicien ou accueil sans données sensibles.
- Associer une pièce à une réparation.
- Tester stock à zéro.
- Tester seuil bas.
- Vérifier documents client après association d'une pièce.
- Tester accès refusé à l'import/export sans permission.
- Vérifier persistance locale/mock.

