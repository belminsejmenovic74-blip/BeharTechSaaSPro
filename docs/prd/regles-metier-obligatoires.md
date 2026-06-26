# Règles métier obligatoires - Behar Tech Pro

Ce document liste les règles métier que les développeurs et les IA doivent respecter pour Behar Tech Pro.

Chaque règle est obligatoire. Une évolution produit ne doit pas contourner ces règles sans validation explicite du propriétaire produit.

## 1. Réparations

### R1.1 - Dossier unique

Chaque réparation doit être représentée par un dossier unique.

### R1.2 - Identifiant obligatoire

Chaque dossier réparation doit avoir un identifiant unique.

### R1.3 - Création sans devis

Une réparation doit pouvoir être créée sans devis.

### R1.4 - Gestion sans devis

Une réparation doit pouvoir être consultée, modifiée et suivie sans devis.

### R1.5 - Devis optionnel

Le devis doit toujours rester une action optionnelle dans le cycle de vie d'une réparation.

### R1.6 - Appareil obligatoire

Une réparation doit contenir au minimum un appareil ou une description d'appareil.

### R1.7 - Problème déclaré obligatoire

Une réparation doit contenir un problème déclaré par le client ou renseigné par l'atelier.

### R1.8 - Statut obligatoire

Une réparation doit toujours avoir un statut courant.

### R1.9 - Historique des statuts

Chaque changement de statut doit être historisé avec une date.

### R1.10 - Statuts compréhensibles

Les statuts doivent être compréhensibles par l'équipe atelier sans interprétation technique obscure.

### R1.11 - Réparation non supprimée par devis refusé

Un devis refusé ne doit jamais supprimer, annuler automatiquement ou bloquer une réparation.

### R1.12 - Réparation non bloquée par facture absente

Une réparation ne doit pas être bloquée uniquement parce qu'aucune facture n'existe encore.

### R1.13 - Facture directe autorisée

Une facture directe peut être créée depuis une réparation si les conditions métier minimales sont valides.

### R1.14 - Documents liés visibles

Les documents liés à une réparation doivent être accessibles depuis le dossier réparation.

### R1.15 - Paiements liés visibles

Les paiements liés à une réparation doivent être accessibles depuis le dossier réparation.

### R1.16 - Données liées conservées

Un changement de statut ne doit pas casser les devis, factures, paiements, documents ou photos déjà liés au dossier.

## 2. Devis

### R2.1 - Devis non obligatoire

Le devis n'est jamais obligatoire pour créer, gérer, facturer ou clôturer une réparation.

### R2.2 - Création depuis réparation

Un devis peut être créé depuis une réparation.

### R2.3 - Création depuis client

Un devis peut être créé depuis un client si le contexte métier le permet.

### R2.4 - Lignes obligatoires

Un devis ne doit pas être validé avec zéro ligne.

### R2.5 - Ligne non vide

Chaque ligne de devis validée doit contenir au minimum un libellé, une quantité et un prix de vente.

### R2.6 - Quantité positive

Chaque ligne de devis validée doit avoir une quantité strictement positive.

### R2.7 - Prix valide

Chaque ligne de devis validée doit avoir un prix de vente supérieur ou égal à zéro.

### R2.8 - Total calculé

Le total d'un devis doit être calculé à partir de ses lignes.

### R2.9 - Devise obligatoire

Un devis doit avoir une devise.

### R2.10 - Devise cohérente

La devise du devis doit suivre le contexte atelier, boutique ou document.

### R2.11 - Acceptation explicite

Un devis ne doit être marqué accepté que par une action explicite.

### R2.12 - Refus explicite

Un devis ne doit être marqué refusé que par une action explicite.

### R2.13 - Conversion possible

Un devis accepté peut être converti en facture.

### R2.14 - Conversion non exclusive

La conversion d'un devis accepté ne doit pas être le seul chemin possible pour créer une facture.

### R2.15 - Devis refusé non facturable automatiquement

Un devis refusé ne doit pas générer automatiquement une facture.

### R2.16 - Données internes interdites

Un devis client ne doit jamais afficher marge, prix d'achat, fournisseur ou stock interne.

## 3. Factures

### R3.1 - Facture directe autorisée

Une facture directe peut exister sans devis si les conditions métier minimales sont valides.

### R3.2 - Devis non requis

Une facture ne doit jamais exiger l'existence préalable d'un devis.

### R3.3 - Lignes obligatoires

Une facture ne doit jamais être créée ou validée avec des lignes vides.

### R3.4 - Au moins une ligne

Une facture validée doit contenir au moins une ligne.

### R3.5 - Ligne facturable complète

Chaque ligne de facture validée doit contenir un libellé, une quantité et un prix de vente.

### R3.6 - Quantité positive

Chaque ligne de facture validée doit avoir une quantité strictement positive.

### R3.7 - Prix valide

Chaque ligne de facture validée doit avoir un prix de vente supérieur ou égal à zéro.

### R3.8 - Total calculé

Le total d'une facture doit être calculé à partir de ses lignes, taxes, remises et paiements liés.

### R3.9 - Client requis

Une facture doit être liée à un client ou contenir les informations client minimales requises par le contexte.

### R3.10 - Devise obligatoire

Une facture doit toujours avoir une devise.

### R3.11 - Devise cohérente

La devise de la facture doit suivre le contexte atelier, boutique ou document.

### R3.12 - Pays obligatoire

Une facture doit être générée dans un contexte pays connu: France ou Suisse.

### R3.13 - Validation par pays

Les validations de facture doivent dépendre du pays de l'entreprise.

### R3.14 - Suisse non bloquée par France

Une facture suisse ne doit jamais être bloquée par une validation strictement française.

### R3.15 - Ouverture obligatoire

Une facture créée doit pouvoir être ouverte depuis tous les écrans qui la référencent.

### R3.16 - Téléchargement obligatoire

Une facture créée doit pouvoir être téléchargée depuis tous les écrans qui la référencent.

### R3.17 - Données internes interdites

Une facture client ne doit jamais afficher marge, prix d'achat, fournisseur ou stock interne.

### R3.18 - Historique stable

Une facture déjà émise ne doit pas changer silencieusement de devise, pays, total ou contenu.

## 4. Paiements

### R4.1 - Paiement lié

Chaque paiement doit être lié à une facture, une réparation ou une vente.

### R4.2 - Montant obligatoire

Chaque paiement doit avoir un montant.

### R4.3 - Montant positif

Un paiement validé doit avoir un montant strictement positif.

### R4.4 - Devise obligatoire

Chaque paiement doit avoir une devise.

### R4.5 - Devise cohérente

La devise du paiement doit correspondre au contexte du document ou du dossier lié.

### R4.6 - Moyen de paiement obligatoire

Chaque paiement validé doit avoir un moyen de paiement.

### R4.7 - Paiement partiel autorisé

Un paiement partiel doit être autorisé si le montant payé est inférieur au montant dû.

### R4.8 - Solde mis à jour

Après chaque paiement, le solde restant doit être recalculé.

### R4.9 - Paiement total détecté

Une facture doit être considérée comme payée lorsque le total payé couvre le montant dû.

### R4.10 - Surpaiement bloqué sans règle explicite

Un paiement supérieur au montant dû doit être bloqué sauf règle métier explicite.

### R4.11 - Acompte autorisé

Un acompte peut être lié à une réparation avant l'existence d'une facture.

### R4.12 - Reçu ouvrable

Un reçu généré doit pouvoir être ouvert depuis tous les écrans qui le référencent.

### R4.13 - Reçu téléchargeable

Un reçu généré doit pouvoir être téléchargé depuis tous les écrans qui le référencent.

### R4.14 - Remboursement protégé

Un remboursement doit être réservé aux utilisateurs ayant la permission correspondante.

### R4.15 - Annulation protégée

L'annulation d'un paiement doit être réservée aux utilisateurs ayant la permission correspondante.

### R4.16 - Démo sans banque

Les paiements doivent fonctionner en local/mock sans API bancaire réelle.

## 5. Documents client

### R5.1 - Ouverture obligatoire

Tout document client généré doit pouvoir être ouvert depuis tous les écrans concernés.

### R5.2 - Téléchargement obligatoire

Tout document client généré doit pouvoir être téléchargé depuis tous les écrans concernés.

### R5.3 - Prix d'achat interdit

Un document client ne doit jamais afficher un prix d'achat.

### R5.4 - Marge interdite

Un document client ne doit jamais afficher une marge.

### R5.5 - Fournisseur interdit

Un document client ne doit jamais afficher un fournisseur.

### R5.6 - Stock interne interdit

Un document client ne doit jamais afficher le stock interne.

### R5.7 - Notes techniques internes interdites

Un document client ne doit jamais afficher des notes techniques internes.

### R5.8 - Permissions interdites

Un document client ne doit jamais afficher les permissions, rôles ou informations internes d'équipe.

### R5.9 - Devise visible

Un document client doit afficher clairement sa devise.

### R5.10 - Pays respecté

Un document client doit respecter le pays du contexte documentaire.

### R5.11 - Données filtrées avant rendu

Les données internes doivent être filtrées avant le rendu ou la génération d'un document client.

### R5.12 - Token public limité

Un document public accessible par token doit donner accès uniquement au document autorisé.

### R5.13 - Token invalide sans fuite

Un token invalide doit afficher une erreur claire sans révéler de donnée client ou atelier.

### R5.14 - Document lié

Un document généré depuis une réparation, un devis, une facture ou un paiement doit rester lié à sa source.

### R5.15 - Branding atelier

Un document client doit afficher l'identité atelier disponible: nom, contact et adresse si renseignés.

## 6. Stock

### R6.1 - Données sensibles protégées

Le prix d'achat, la marge et le fournisseur sont des données sensibles.

### R6.2 - Prix d'achat masqué

Le prix d'achat doit être masqué sans permission explicite.

### R6.3 - Marge masquée

La marge doit être masquée sans permission explicite.

### R6.4 - Fournisseur masqué

Le fournisseur doit être masqué sans permission explicite.

### R6.5 - Stock client interdit

Le stock interne ne doit jamais apparaître sur un document client.

### R6.6 - Association contrôlée

Une pièce peut être associée à une réparation uniquement par un utilisateur autorisé.

### R6.7 - Décrément contrôlé

Le stock ne doit pas se décrémenter à n'importe quel moment.

### R6.8 - Décrément sur événement validé

Le stock doit se décrémenter uniquement sur un événement métier validé: pièce utilisée, réparation validée, vente confirmée ou autre règle explicitement définie.

### R6.9 - Pas de décrément sur consultation

La consultation d'une pièce ne doit jamais décrémenter le stock.

### R6.10 - Pas de décrément sur devis brouillon

Un devis brouillon ne doit jamais décrémenter le stock.

### R6.11 - Rupture gérée

Une tentative d'utilisation d'une pièce en rupture doit afficher une erreur ou un avertissement clair.

### R6.12 - Quantité négative interdite

Le stock disponible ne doit jamais devenir négatif sans règle explicite de stock réservé ou commande.

### R6.13 - Réparation non bloquée automatiquement

Une réparation ne doit pas être bloquée uniquement parce qu'une pièce stock n'est pas renseignée.

### R6.14 - Historique utile

Toute sortie de stock liée à une réparation ou vente doit pouvoir être retracée.

## 7. Rendez-vous

### R7.1 - Rendez-vous sans réparation

Un rendez-vous peut exister sans réparation.

### R7.2 - Conversion possible

Un rendez-vous peut être converti en réparation.

### R7.3 - Client optionnel au départ

Un rendez-vous peut être créé avec des informations client minimales si le client complet n'existe pas encore.

### R7.4 - Date obligatoire

Un rendez-vous validé doit avoir une date.

### R7.5 - Heure obligatoire

Un rendez-vous validé doit avoir une heure ou un créneau.

### R7.6 - Type recommandé

Un rendez-vous doit indiquer un type quand l'information est disponible: dépôt, diagnostic, récupération, intervention ou autre.

### R7.7 - Statut obligatoire

Un rendez-vous doit avoir un statut: prévu, confirmé, terminé, annulé ou absent.

### R7.8 - Annulation sans suppression

Un rendez-vous annulé ne doit pas être supprimé automatiquement.

### R7.9 - Conversion sans double saisie

La conversion d'un rendez-vous en réparation doit reprendre les informations déjà connues.

### R7.10 - Réparation créée liée

Une réparation créée depuis un rendez-vous doit rester liée au rendez-vous source si cette information existe.

## 8. Clients

### R8.1 - Client unique recherché

Avant de créer un client, l'interface doit permettre de rechercher un client existant.

### R8.2 - Téléphone prioritaire

Le téléphone est l'information prioritaire pour identifier et contacter un client atelier.

### R8.3 - Client minimal

Un client peut être créé avec des informations minimales si le flow comptoir doit rester rapide.

### R8.4 - Historique client

Les réparations, devis, factures et paiements liés à un client doivent être consultables depuis sa fiche si l'utilisateur est autorisé.

### R8.5 - Données client protégées

Les données client ne doivent être accessibles qu'aux utilisateurs autorisés ou via token public limité.

### R8.6 - Suppression protégée

La suppression d'un client doit être réservée aux utilisateurs ayant la permission correspondante.

### R8.7 - Suppression non destructive

La suppression ou l'archivage d'un client ne doit pas casser les réparations, factures, documents ou paiements existants.

### R8.8 - Accès public limité

Un client ne doit jamais pouvoir consulter tous ses dossiers sans token ou mécanisme d'accès prévu.

## 9. Suivi client

### R9.1 - Lien obligatoire par dossier

Chaque réparation doit pouvoir disposer d'un lien de suivi client.

### R9.2 - QR code lié au bon dossier

Le QR code doit ouvrir le suivi du dossier réparation concerné.

### R9.3 - Lien lié au bon dossier

Le lien client doit ouvrir le suivi du dossier réparation concerné.

### R9.4 - Token unique

Le token public de suivi doit être unique.

### R9.5 - Token non devinable

Le token public de suivi ne doit pas être facilement devinable.

### R9.6 - Accès limité

Le suivi public doit donner accès uniquement au dossier lié au token.

### R9.7 - Données internes interdites

Le suivi public ne doit jamais afficher marge, prix d'achat, fournisseur, stock interne ou notes techniques internes.

### R9.8 - Statut public clair

Le statut affiché au client doit être clair et compréhensible.

### R9.9 - Documents publics ouvrables

Les documents publics disponibles depuis le suivi doivent pouvoir être ouverts.

### R9.10 - Documents publics téléchargeables

Les documents publics disponibles depuis le suivi doivent pouvoir être téléchargés.

### R9.11 - Devis non requis

Le suivi client doit fonctionner même si aucun devis n'existe.

### R9.12 - Token invalide sans fuite

Un token de suivi invalide doit afficher un état d'erreur sans révéler de donnée.

### R9.13 - Mise à jour statut

Un changement de statut public côté atelier doit se refléter dans le suivi client.

### R9.14 - Mobile obligatoire

Le suivi client doit être utilisable sur mobile.

## 10. France / Suisse / devise

### R10.1 - France supportée

Le pays France doit être supporté.

### R10.2 - Suisse supportée

Le pays Suisse doit être supporté.

### R10.3 - Coexistence France/Suisse

La France et la Suisse doivent pouvoir coexister proprement dans le modèle produit.

### R10.4 - EUR par défaut France

La devise par défaut d'un atelier France doit être EUR.

### R10.5 - CHF par défaut Suisse

La devise par défaut d'un atelier Suisse doit être CHF.

### R10.6 - Devise document stockée

La devise d'un document doit être stockée ou dérivée de manière stable au moment de sa création.

### R10.7 - Devise affichée

Chaque devis, facture, reçu ou document financier doit afficher sa devise.

### R10.8 - Validation par pays

Les règles fiscales, administratives et documentaires doivent être conditionnées par pays.

### R10.9 - Suisse non bloquée

Une entreprise suisse ne doit jamais être bloquée par une validation strictement française.

### R10.10 - France non forcée partout

Le produit ne doit jamais supposer que toutes les entreprises sont françaises.

### R10.11 - Changement sans altération historique

Un changement de pays ou devise ne doit pas modifier silencieusement les documents déjà émis.

### R10.12 - Contexte obligatoire

Tout document financier doit connaître son contexte pays et devise avant validation.

### R10.13 - Libellés cohérents

Les libellés, taxes et mentions doivent rester cohérents avec le pays du document.

## 11. Rôles / permissions

### R11.1 - Permissions appliquées à l'interface

Les permissions doivent s'appliquer aux menus, boutons, formulaires et données affichées.

### R11.2 - Permissions appliquées aux routes

Les permissions doivent s'appliquer aux accès directs par URL.

### R11.3 - Permissions appliquées aux actions

Les permissions doivent être vérifiées au moment des actions sensibles.

### R11.4 - Prix d'achat protégé

Le prix d'achat doit être visible uniquement avec permission explicite.

### R11.5 - Marge protégée

La marge doit être visible uniquement avec permission explicite.

### R11.6 - Fournisseur protégé

Le fournisseur doit être visible uniquement avec permission explicite.

### R11.7 - Suppression protégée

La suppression d'une réparation, d'un client, d'une facture, d'un devis ou d'une pièce doit être protégée par permission.

### R11.8 - Export protégé

L'export de données doit être protégé par permission.

### R11.9 - Paramètres protégés

La modification des paramètres atelier, pays, devise ou équipe doit être protégée par permission.

### R11.10 - Remboursement protégé

Le remboursement doit être protégé par permission.

### R11.11 - Rôle limité sans suppression

Un rôle limité ou stagiaire ne doit pas pouvoir supprimer.

### R11.12 - Rôle limité sans export

Un rôle limité ou stagiaire ne doit pas pouvoir exporter.

### R11.13 - Client public sans rôle interne

Un client final accède uniquement par token public et ne doit pas recevoir de rôle interne.

### R11.14 - Documents client toujours filtrés

Même un administrateur ne doit pas générer un document client contenant des données internes interdites.

### R11.15 - Erreur permission claire

Une action interdite doit afficher un message clair ou être indisponible.

## 12. Photos / signature / dossier

### R12.1 - Photos d'entrée accessibles

Les photos d'entrée doivent être accessibles depuis le dossier réparation.

### R12.2 - Photos liées au bon dossier

Chaque photo d'entrée doit être liée au bon dossier réparation.

### R12.3 - Photos non perdues

Les photos d'entrée ne doivent pas disparaître lors d'un changement de statut, d'un devis, d'une facture ou d'un paiement.

### R12.4 - Absence de photo gérée

Un dossier sans photo doit afficher un état clair et ne doit pas casser le dossier.

### R12.5 - Ajout photo contrôlé

L'ajout de photos doit être réservé aux utilisateurs autorisés.

### R12.6 - Signature liée au bon document

Si une signature est collectée, elle doit être liée au document ou dossier concerné.

### R12.7 - Signature non obligatoire par défaut

La signature ne doit pas bloquer un flow sauf si une règle métier explicite l'exige.

### R12.8 - Signature conservée

Une signature collectée ne doit pas disparaître après génération ou ouverture du document lié.

### R12.9 - Dossier central

Le dossier réparation doit rester le point central pour consulter photos, documents, paiements, devis, factures, statuts et notes.

### R12.10 - Notes internes séparées

Les notes internes doivent être séparées des informations publiques.

### R12.11 - Données publiques maîtrisées

Seules les données explicitement publiques doivent apparaître dans le suivi client ou les documents client.

### R12.12 - Ouverture depuis dossier

Tout document lié au dossier doit pouvoir être ouvert depuis le dossier.

### R12.13 - Téléchargement depuis dossier

Tout document lié au dossier doit pouvoir être téléchargé depuis le dossier.

### R12.14 - Non-régression dossier

Une évolution ne doit jamais casser l'accès aux photos, documents, paiements, devis, factures ou suivi client depuis le dossier.

