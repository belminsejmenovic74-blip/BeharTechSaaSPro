# Mini-PRD - Paramètres France / Suisse

## Objectif du module

Permettre à l'atelier de configurer son pays, sa devise, son identité et ses règles documentaires pour fonctionner correctement en France ou en Suisse.

Le module doit empêcher qu'une règle française bloque une entreprise suisse.

## Utilisateurs concernés

- Gérant.
- Administrateur.
- Support ou installateur si rôle prévu.

## Problèmes à résoudre

- Documents générés avec la mauvaise devise.
- Validations fiscales ou administratives trop centrées France.
- Informations atelier incomplètes sur les documents.
- Changement de pays qui modifie des documents déjà créés.
- Suisse bloquée par des champs obligatoires français.

## Parcours utilisateur

### Configuration initiale

1. Le gérant ouvre les paramètres.
2. Il renseigne l'identité atelier.
3. Il choisit le pays: France ou Suisse.
4. Le système propose la devise par défaut: EUR ou CHF.
5. Il complète les champs utiles au pays.
6. Il sauvegarde.
7. Les nouveaux documents utilisent ce contexte.

### Modification de contexte

1. Le gérant modifie pays, devise ou informations documentaires.
2. Le système explique l'impact sur les futurs documents.
3. Les documents déjà émis gardent leur contexte historique si nécessaire.
4. Les nouveaux documents utilisent les nouvelles valeurs.

## Composants / écrans

- Page paramètres atelier.
- Bloc identité entreprise.
- Sélecteur pays.
- Sélecteur devise.
- Bloc adresse et contact.
- Bloc informations fiscales/documentaires.
- Bloc logo.
- Aperçu document.
- Message d'impact avant sauvegarde.

## Données nécessaires

- Nom atelier.
- Adresse.
- Téléphone.
- Email.
- Logo.
- Pays: France ou Suisse.
- Devise par défaut: EUR ou CHF.
- Identifiant fiscal ou équivalent selon pays.
- Mentions documentaires.
- Conditions ou notes affichées sur documents.
- Date de mise à jour.

## Règles métier

- Le pays doit accepter au minimum France et Suisse.
- France propose EUR par défaut.
- Suisse propose CHF par défaut.
- La devise peut suivre le contexte boutique ou document.
- Les validations doivent être conditionnées par pays.
- Les champs propres à la France ne doivent pas bloquer la Suisse.
- Les documents existants ne doivent pas être modifiés silencieusement.
- Les documents client doivent afficher la devise correcte.
- Les paramètres sensibles sont modifiables uniquement par permission.

## Cas limites / erreurs à gérer

- Pays non configuré.
- Devise absente.
- Passage France vers Suisse.
- Passage Suisse vers France.
- Document existant dans une ancienne devise.
- Logo trop lourd ou absent.
- Champ fiscal manquant mais non requis dans le pays choisi.
- Utilisateur sans permission d'éditer.
- Sauvegarde locale impossible.

## Critères d'acceptation

- Le gérant peut choisir France.
- Le gérant peut choisir Suisse.
- Un atelier France génère des documents en EUR par défaut.
- Un atelier Suisse génère des documents en CHF par défaut.
- Une validation française ne bloque pas un document suisse.
- Les informations atelier apparaissent dans les documents.
- Les anciens documents gardent leur cohérence.
- Les permissions protègent la modification des paramètres.

## Tests obligatoires

- Configurer un atelier France.
- Générer une facture France en EUR.
- Générer un devis France en EUR.
- Configurer un atelier Suisse.
- Générer une facture Suisse en CHF.
- Générer un devis Suisse en CHF.
- Vérifier qu'une validation française ne bloque pas la Suisse.
- Modifier devise et vérifier les nouveaux documents.
- Vérifier les documents déjà créés.
- Tester accès paramètres sans permission.

