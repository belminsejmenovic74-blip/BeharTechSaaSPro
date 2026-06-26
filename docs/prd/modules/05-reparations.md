# Mini-PRD - Réparations

## Objectif du module

Gérer le cycle complet d'une réparation autour d'un dossier unique: création, diagnostic, statut, photos, notes, devis optionnels, factures, paiements, documents et suivi client.

## Utilisateurs concernés

- Accueil / comptoir.
- Technicien.
- Gérant.
- Client final via suivi public.

## Problèmes à résoudre

- Informations de réparation dispersées.
- Absence d'historique clair.
- Devis parfois traité comme étape obligatoire.
- Photos d'entrée oubliées ou introuvables.
- Statut client pas à jour.
- Documents, paiements et pièces non reliés au dossier.

## Parcours utilisateur

### Création et suivi interne

1. L'utilisateur crée une réparation depuis le comptoir, le module réparations ou un rendez-vous.
2. Le système crée un identifiant unique.
3. Le dossier contient client, appareil, problème déclaré, état d'entrée et photos.
4. Le dossier passe dans les statuts atelier.
5. Les notes, pièces, devis, factures et paiements sont ajoutés selon besoin.
6. Le dossier est marqué prêt, livré, annulé ou terminé.

### Consultation dossier

1. L'utilisateur ouvre une réparation.
2. Il consulte les informations client et appareil.
3. Il consulte photos, historique, documents et paiements.
4. Il déclenche une action: statut, devis, facture, paiement, QR code, document.

## Composants / écrans

- Liste réparations.
- Filtres et recherche.
- Détail dossier réparation.
- Bloc client.
- Bloc appareil.
- Galerie photos d'entrée.
- Statut et historique.
- Notes comptoir.
- Notes techniques.
- Documents liés.
- Devis liés.
- Factures et paiements liés.
- Actions rapides.

## Données nécessaires

- Identifiant réparation.
- Client lié.
- Appareil.
- Problème déclaré.
- Etat d'entrée.
- Photos d'entrée.
- Statut actuel.
- Historique des statuts.
- Priorité.
- Technicien assigné.
- Notes internes et publiques.
- Pièces utilisées.
- Devis, factures, paiements, documents.
- Token de suivi client.
- Pays et devise du contexte si document ou paiement.

## Règles métier

- Une réparation peut être créée et gérée sans devis.
- Une facture directe peut être créée depuis une réparation si les conditions métier sont valides.
- Les photos d'entrée doivent rester visibles.
- Les statuts doivent être historisés.
- Les documents liés doivent rester accessibles.
- Les données sensibles ne doivent pas sortir vers le client.
- Les actions doivent respecter les permissions.
- Un changement de statut ne doit pas casser les documents déjà générés.
- Le lien de suivi doit rester relié au bon dossier.

## Cas limites / erreurs à gérer

- Réparation sans client complet.
- Appareil inconnu ou modèle non listé.
- Photo absente ou upload échoué.
- Statut invalide.
- Document lié introuvable.
- Paiement sans facture.
- Devis refusé.
- Facture directe sans données minimales.
- Token public manquant.
- Suppression demandée sans permission.

## Critères d'acceptation

- Un utilisateur autorisé peut créer une réparation sans devis.
- Le dossier affiche client, appareil, panne, état d'entrée et photos.
- Les statuts peuvent être mis à jour et historisés.
- Les devis, factures, paiements et documents liés sont visibles.
- Le QR code ou lien de suivi est accessible.
- Une facture directe peut être créée si valide.
- Les permissions protègent actions et données sensibles.
- Le dossier fonctionne sur desktop, tablette et mobile.

## Tests obligatoires

- Créer une réparation sans devis.
- Créer une réparation depuis un rendez-vous si disponible.
- Ajouter et afficher photos d'entrée.
- Changer plusieurs statuts.
- Vérifier l'historique.
- Créer un devis optionnel depuis la réparation.
- Créer une facture directe depuis la réparation.
- Enregistrer un paiement lié.
- Ouvrir les documents liés.
- Vérifier le suivi client et l'absence de données internes.

