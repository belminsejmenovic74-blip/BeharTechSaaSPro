# Mini-PRD - Rôles / permissions

## Objectif du module

Protéger les données sensibles, les actions critiques et les paramètres de l'atelier avec des rôles simples et des permissions explicites.

Le module doit être robuste côté interface, accès direct aux routes et documents publics.

## Utilisateurs concernés

- Gérant / administrateur.
- Technicien.
- Accueil / comptoir.
- Stagiaire ou rôle limité.
- Client final via accès public sans compte.

## Problèmes à résoudre

- Données sensibles visibles par erreur.
- Suppression ou export possible par un rôle limité.
- Paramètres atelier accessibles à un utilisateur non autorisé.
- Prix d'achat, marge ou fournisseur exposés dans l'interface ou les documents.
- Accès direct par URL à une page interdite.
- Confusion entre données internes et données publiques.

## Parcours utilisateur

### Gestion des rôles

1. Le gérant ouvre les paramètres équipe.
2. Il consulte les utilisateurs et rôles.
3. Il modifie les permissions d'un rôle ou utilisateur si autorisé.
4. Le système applique les permissions aux menus, écrans et actions.

### Utilisation avec rôle limité

1. L'utilisateur se connecte.
2. Il voit uniquement les modules autorisés.
3. Les actions interdites sont masquées ou désactivées.
4. Un accès direct à une route interdite affiche une permission requise ou redirige.

## Composants / écrans

- Page équipe.
- Liste utilisateurs.
- Sélecteur rôle.
- Matrice permissions.
- Badge rôle utilisateur.
- Guard de route.
- Guard d'action.
- Etat permission requise.
- Masquage données sensibles dans tables, dossiers et documents.

## Données nécessaires

- Utilisateur: id, nom, rôle, PIN ou session, statut actif.
- Rôle: admin, technicien, accueil, stagiaire ou personnalisé.
- Permissions: voir, créer, modifier, supprimer, exporter, encaisser, gérer paramètres.
- Permissions sensibles: prix d'achat, marge, fournisseur.
- Journal ou historique si disponible.
- Session utilisateur courante.

## Règles métier

- Admin a accès complet par défaut.
- Technicien accède aux réparations et au mode atelier.
- Accueil accède au comptoir, clients, rendez-vous, devis, factures et paiements selon configuration.
- Stagiaire ou rôle limité ne peut pas supprimer ni exporter.
- Prix d'achat, marge et fournisseur sont visibles uniquement avec permission.
- Les documents client ne doivent jamais afficher données sensibles, même pour un admin.
- Les routes interdites doivent être protégées.
- Les actions critiques doivent vérifier la permission au moment de l'action.
- Les accès publics par token ne doivent pas dépendre d'un rôle interne.

## Cas limites / erreurs à gérer

- Utilisateur désactivé.
- Rôle supprimé ou inconnu.
- Permission manquante.
- Accès direct URL interdit.
- Action interdite depuis un bouton resté visible.
- Session expirée.
- Client public avec token invalide.
- Changement de permission pendant une session.
- Export demandé par rôle limité.
- Suppression demandée par rôle limité.

## Critères d'acceptation

- Un admin peut gérer utilisateurs et permissions.
- Un technicien ne voit pas les paramètres sensibles par défaut.
- Un accueil ne voit pas prix d'achat, marge ou fournisseur par défaut.
- Un stagiaire ne peut pas supprimer ni exporter.
- Les menus respectent les permissions.
- Les routes directes respectent les permissions.
- Les documents client ne révèlent jamais les données sensibles.
- Les pages publiques restent limitées au token.

## Tests obligatoires

- Connexion admin et accès complet.
- Connexion technicien et accès atelier.
- Connexion accueil et accès comptoir.
- Connexion stagiaire et accès limité.
- Tester route interdite par URL directe.
- Tester suppression sans permission.
- Tester export sans permission.
- Tester affichage prix d'achat, marge et fournisseur avec permission.
- Tester masquage prix d'achat, marge et fournisseur sans permission.
- Vérifier documents client avec tous les rôles.

