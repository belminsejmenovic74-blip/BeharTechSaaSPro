# Mini-PRD - Mode Atelier

## Objectif du module

Permettre aux techniciens de traiter les réparations en cours avec une vue claire, rapide et centrée sur l'exécution: statuts, diagnostic, notes techniques, photos, pièces et blocages.

Le mode atelier doit réduire le bruit administratif et donner au technicien les informations utiles au bon moment.

## Utilisateurs concernés

- Technicien.
- Gérant.
- Accueil pour consultation ponctuelle.

## Problèmes à résoudre

- Difficile de savoir quelles réparations traiter en priorité.
- Les statuts ne sont pas mis à jour régulièrement.
- Les notes techniques sont mélangées aux informations client.
- Les photos d'entrée ne sont pas consultées au moment du diagnostic.
- Les pièces utilisées ne sont pas reliées au dossier.
- Le suivi client n'est pas mis à jour quand l'atelier avance.

## Parcours utilisateur

### Traitement d'une réparation

1. Le technicien ouvre le mode atelier.
2. Il consulte la liste ou le Kanban des réparations.
3. Il filtre par statut, priorité, technicien, type appareil ou attente pièce.
4. Il ouvre un dossier.
5. Il vérifie panne déclarée, état d'entrée, photos et historique.
6. Il ajoute un diagnostic ou une note technique.
7. Il change le statut.
8. Il associe des pièces si nécessaire.
9. Il marque la réparation prête ou bloquée.

### Gestion d'un blocage

1. Le technicien identifie un problème: pièce manquante, accord client, diagnostic incomplet.
2. Il choisit un statut adapté: en attente pièce ou en attente client.
3. Il ajoute une note interne claire.
4. Le suivi client affiche uniquement l'information publique autorisée.

## Composants / écrans

- Vue Kanban par statut.
- Vue liste avec filtres.
- Carte réparation.
- Panneau détail réparation.
- Bloc appareil et panne.
- Galerie photos d'entrée.
- Historique des statuts.
- Notes techniques.
- Sélecteur de statut.
- Sélecteur de pièce stock.
- Indicateurs attente pièce, priorité, prêt.

## Données nécessaires

- Réparation: identifiant, statut, priorité, dates, technicien assigné.
- Client: nom et contact minimal selon permission.
- Appareil: type, marque, modèle, IMEI ou numéro de série si disponible.
- Photos d'entrée et photos atelier.
- Notes techniques.
- Notes publiques si utilisées.
- Pièces associées.
- Historique des statuts.
- Token de suivi client.
- Permissions de l'utilisateur.

## Règles métier

- Les statuts doivent être historisés.
- Les photos d'entrée doivent être visibles dans le dossier atelier.
- Les notes techniques sont internes par défaut.
- Les statuts publics doivent mettre à jour le suivi client sans exposer les détails internes.
- Un technicien ne voit pas prix d'achat, marge ou fournisseur sans permission.
- Une réparation ne doit pas dépendre d'un devis pour être traitée.
- Une pièce peut être associée à une réparation selon permission.
- La suppression d'une réparation doit être protégée.

## Cas limites / erreurs à gérer

- Réparation sans technicien assigné.
- Réparation sans photo d'entrée.
- Statut incompatible ou transition non autorisée.
- Pièce stock indisponible.
- Note technique vide.
- Dossier supprimé ou introuvable.
- Utilisateur sans permission de changer le statut.
- Suivi client non disponible.
- Données locales désynchronisées.

## Critères d'acceptation

- Le technicien peut consulter les réparations à traiter.
- Le technicien peut ouvrir un dossier et voir les photos d'entrée.
- Le technicien peut ajouter une note technique.
- Le technicien peut changer un statut autorisé.
- L'historique enregistre les changements de statut.
- Le suivi client reflète les statuts publics.
- Les données sensibles restent masquées sans permission.
- Le module est utilisable sur desktop, tablette et mobile.

## Tests obligatoires

- Ouvrir le mode atelier avec un rôle technicien.
- Filtrer les réparations par statut.
- Ouvrir un dossier et vérifier les photos d'entrée.
- Ajouter une note technique.
- Changer le statut vers diagnostic, en réparation, attente pièce et prêt.
- Vérifier l'historique de statuts.
- Associer une pièce stock si permission active.
- Vérifier le suivi client après changement de statut.
- Tester l'absence de prix d'achat, marge et fournisseur sans permission.
- Tester l'accès refusé aux actions non autorisées.

