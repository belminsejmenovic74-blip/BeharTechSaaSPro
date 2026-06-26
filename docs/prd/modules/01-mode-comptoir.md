# Mini-PRD - Mode Comptoir

## Objectif du module

Permettre à l'accueil de créer rapidement un dossier réparation, un client, un rendez-vous, un paiement ou un document depuis une interface tablette/desktop pensée pour le face-à-face client.

Le mode comptoir doit prioriser la vitesse, la clarté et la fiabilité. Il ne doit pas obliger l'utilisateur à passer par un devis pour prendre en charge une réparation.

## Utilisateurs concernés

- Accueil / comptoir.
- Gérant.
- Technicien si l'atelier fonctionne sans personne dédiée à l'accueil.

## Problèmes à résoudre

- Prise en charge trop lente au comptoir.
- Informations client ou appareil saisies plusieurs fois.
- Oubli des photos d'entrée et de l'état appareil.
- Confusion entre réparation, devis, facture et paiement.
- Documents difficiles à ouvrir ou imprimer devant le client.
- QR code de suivi non remis au client.

## Parcours utilisateur

### Création d'une réparation

1. L'utilisateur ouvre le mode comptoir.
2. Il recherche un client existant ou crée un nouveau client.
3. Il renseigne l'appareil: type, marque, modèle, couleur, capacité, IMEI ou numéro de série si disponible.
4. Il saisit le problème déclaré.
5. Il ajoute l'état d'entrée, les accessoires déposés et les photos d'entrée.
6. Il crée le dossier réparation.
7. Le système génère un identifiant de dossier, un lien de suivi et un QR code.
8. L'utilisateur ouvre, télécharge ou imprime la fiche de dépôt.

### Facture directe depuis le comptoir

1. L'utilisateur choisit une réparation, une vente ou un client.
2. Il crée une facture directe.
3. Il ajoute les lignes et vérifie la devise.
4. Il valide la facture si les conditions métier sont remplies.
5. Il encaisse un paiement si nécessaire.
6. Il ouvre ou télécharge le document.

### Rendez-vous depuis le comptoir

1. L'utilisateur crée un rendez-vous.
2. Il associe un client si disponible.
3. Il définit date, heure, motif et type.
4. Le rendez-vous peut ensuite être converti en réparation.

## Composants / écrans

- Ecran principal mode comptoir.
- Recherche ou création client rapide.
- Formulaire création réparation.
- Bloc appareil.
- Bloc panne déclarée.
- Bloc photos d'entrée.
- Bloc état d'entrée et accessoires.
- Bloc actions rapides: créer devis, facture directe, paiement, document.
- Modal QR code de suivi.
- Prévisualisation document.
- Confirmation de création.

## Données nécessaires

- Client: nom, téléphone, email optionnel, adresse optionnelle.
- Appareil: type, marque, modèle, couleur, capacité, IMEI ou numéro de série.
- Réparation: identifiant, problème déclaré, statut initial, priorité, notes comptoir.
- Photos d'entrée: URLs locales ou références locales.
- Etat d'entrée: écran, châssis, boutons, caméra, connecteurs, accessoires.
- Documents liés: fiche dépôt, devis, facture, reçu.
- Paiements: montant, moyen, statut.
- Suivi client: token public, URL, QR code.
- Contexte boutique: pays, devise, identité atelier.

## Règles métier

- Une réparation doit pouvoir être créée sans devis.
- Le devis est une action optionnelle.
- Une facture directe peut être créée si les données minimales sont valides.
- Les photos d'entrée doivent être visibles dans le dossier après création.
- Le QR code et le lien de suivi doivent être générés pour le dossier.
- Les documents client ne doivent jamais afficher prix d'achat, marge, fournisseur ou stock interne.
- La devise doit suivre le contexte atelier, boutique ou document.
- Une entreprise suisse ne doit pas être bloquée par une validation française.
- Les actions sensibles doivent suivre les permissions du rôle connecté.

## Cas limites / erreurs à gérer

- Client introuvable.
- Client créé avec téléphone manquant ou invalide selon règles locales.
- Appareil partiellement renseigné.
- Photos refusées, trop lourdes ou absentes.
- Token de suivi non généré.
- Document impossible à ouvrir ou télécharger.
- Facture directe demandée sans données minimales.
- Paiement supérieur au montant dû.
- Perte de connexion API: le mode local/mock doit rester utilisable.
- Utilisateur sans permission pour facturer, encaisser, supprimer ou exporter.

## Critères d'acceptation

- L'utilisateur peut créer une réparation sans devis.
- Le dossier créé contient client, appareil, panne, statut initial, état d'entrée et photos si ajoutées.
- Le dossier est visible dans les modules réparations et atelier.
- Le QR code ou lien de suivi est disponible après création.
- La fiche dépôt peut être ouverte ou téléchargée.
- Une facture directe peut être créée sans devis si les données sont valides.
- Les données sensibles ne sont jamais visibles dans les documents client.
- Le mode comptoir reste utilisable sur tablette.

## Tests obligatoires

- Créer un client depuis le mode comptoir.
- Créer une réparation sans devis.
- Ajouter des photos d'entrée et vérifier leur présence dans le dossier.
- Générer et ouvrir le QR code de suivi.
- Ouvrir et télécharger la fiche dépôt.
- Créer une facture directe sans devis.
- Encaisser un paiement partiel et total.
- Tester le rôle accueil sans accès aux données sensibles.
- Tester le responsive tablette et mobile.
- Vérifier qu'aucun document client n'affiche prix d'achat, marge, fournisseur ou stock interne.

