# Mini-PRD - Documents / PDF

## Objectif du module

Générer, ouvrir, télécharger et présenter des documents professionnels pour les clients et l'atelier: fiche dépôt, devis, facture, reçu, fiche état appareil et documents de reconditionnement si disponibles.

Le module doit protéger les données internes et respecter le contexte France/Suisse.

## Utilisateurs concernés

- Accueil / comptoir.
- Gérant.
- Technicien pour consultation ou impression atelier.
- Client final via lien public.

## Problèmes à résoudre

- Documents dispersés ou créés dans plusieurs outils.
- Documents client peu professionnels.
- Risque d'afficher des données internes au client.
- Téléchargement ou ouverture PDF instable.
- Validations documentaires inadaptées au pays de l'entreprise.
- Devise incorrecte sur les documents.

## Parcours utilisateur

### Génération d'un document

1. L'utilisateur ouvre une réparation, un devis, une facture ou un paiement.
2. Il choisit le document à créer ou consulter.
3. Le système génère une prévisualisation ou un PDF.
4. L'utilisateur ouvre, télécharge ou imprime le document.
5. Le document est lié au dossier ou à l'entité source.

### Consultation publique

1. Le client ouvre un lien public.
2. Il consulte les documents disponibles.
3. Il ouvre ou télécharge un document autorisé.
4. Le document n'affiche que les informations publiques.

## Composants / écrans

- Liste documents.
- Prévisualisation document.
- Page imprimable.
- Route publique document par token.
- Boutons ouvrir, télécharger, imprimer.
- Bloc informations atelier.
- Bloc client.
- Bloc appareil ou réparation.
- Tableau des lignes de devis/facture.
- Totaux, taxes et devise.

## Données nécessaires

- Identité atelier: nom, adresse, téléphone, email, logo.
- Pays atelier: France ou Suisse.
- Devise: EUR ou CHF selon contexte.
- Client: nom, coordonnées utiles.
- Réparation: identifiant, appareil, panne, état d'entrée.
- Photos si document d'état ou fiche dépôt.
- Devis: lignes, quantités, prix vente, taxes, total.
- Facture: lignes, paiements, reste dû, statut.
- Paiement: montant, moyen, date.
- Token public si document externe.
- Mentions légales ou documentaires selon pays.

## Règles métier

- Les documents client ne doivent jamais afficher prix d'achat, marge, fournisseur ou stock interne.
- Les notes techniques internes ne doivent pas apparaître sur les documents client.
- La devise doit suivre le contexte du document.
- Le pays doit déterminer les mentions et validations applicables.
- Une validation française ne doit pas bloquer un document suisse.
- Un devis n'est pas obligatoire pour générer une facture directe.
- Les documents doivent pouvoir être ouverts et téléchargés en local/demo.
- Un document public doit être accessible uniquement par token valide.

## Cas limites / erreurs à gérer

- Document introuvable.
- Token public invalide ou expiré.
- Données minimales manquantes.
- Devise absente.
- Pays non configuré.
- PDF impossible à générer.
- Téléchargement bloqué par navigateur.
- Image ou logo manquant.
- Document demandé par un rôle sans permission.
- Tentative d'accès public à un document interne.

## Critères d'acceptation

- Un devis peut être ouvert et téléchargé.
- Une facture peut être ouverte et téléchargée.
- Une fiche dépôt peut être ouverte et téléchargée.
- Un reçu peut être ouvert ou téléchargé si paiement disponible.
- Un document public avec token valide s'ouvre sans session.
- Un token invalide affiche un état clair sans fuite de données.
- Les documents France affichent EUR et règles France.
- Les documents Suisse affichent CHF et règles Suisse.
- Aucun document client n'affiche prix d'achat, marge, fournisseur ou stock interne.

## Tests obligatoires

- Générer une fiche dépôt depuis une réparation.
- Ouvrir et télécharger un devis.
- Ouvrir et télécharger une facture directe.
- Ouvrir et télécharger une facture issue d'un devis.
- Ouvrir et télécharger un reçu.
- Tester document public avec token valide.
- Tester document public avec token invalide.
- Vérifier EUR en contexte France.
- Vérifier CHF en contexte Suisse.
- Scanner le contenu rendu pour exclure prix d'achat, marge, fournisseur et stock interne.

