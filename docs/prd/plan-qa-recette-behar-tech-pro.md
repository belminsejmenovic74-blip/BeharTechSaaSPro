# Plan QA et recette - Behar Tech Pro

Objectif: fournir la checklist de test à suivre après chaque mission IA ou développement sur Behar Tech Pro.

Ce document ne remplace pas les tests automatisés. Il définit les contrôles fonctionnels à exécuter ou à automatiser pour valider que les modules restent reliés, utilisables et conformes aux règles métier.

## 1. Mode d'emploi

### 1.1 Quand utiliser ce plan

- Après chaque modification produit.
- Après chaque correction de bug.
- Avant une démo client.
- Avant un build de livraison.
- Après une modification touchant les documents, paiements, permissions, pays/devise, stockage local ou routes publiques.

### 1.2 Environnement de référence

- URL locale: `http://localhost:3000` ou `http://127.0.0.1:3000`.
- Route principale: `/dashboard`.
- Storage local: `behar-tech-local-demo-v3`.
- Licence recommandée: `BHT-2026-PRO-002`.
- Admin: PIN `0000`.
- Technicien: PIN `1234`.
- Accueil: PIN `5678`.
- Rôle limité/stagiaire: PIN `9999` si disponible.

### 1.3 Priorités

- `P0`: bloquant. App inutilisable, données perdues, document cassé, fuite de données internes, flow central impossible, permission critique contournée.
- `P1`: important. Flow métier gêné mais contournable, état incohérent, responsive cassé sur un écran important, erreur utilisateur peu claire.
- `P2`: finition. Wording, alignement, affordance, état vide, confort d'utilisation.

## 2. Dashboard

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-DASH-01 | Licence activée, utilisateur admin connecté. | Ouvrir `/dashboard`. | Le dashboard charge sans erreur critique et affiche les indicateurs principaux. | P0 |
| QA-DASH-02 | Données démo ou données locales présentes. | Vérifier les KPIs réparations, paiements, stock et activité. | Les valeurs affichées sont cohérentes avec les données visibles dans les modules. | P1 |
| QA-DASH-03 | Au moins une réparation en cours existe. | Cliquer sur un raccourci ou une carte liée aux réparations. | L'utilisateur arrive sur le module ou dossier attendu. | P1 |
| QA-DASH-04 | Au moins un paiement ou montant à encaisser existe. | Cliquer sur l'entrée paiement ou facture. | L'utilisateur arrive sur le bon module sans perdre la session. | P1 |
| QA-DASH-05 | Utilisateur sans permission dashboard si rôle disponible. | Accéder directement à `/dashboard`. | L'accès est bloqué ou redirigé avec un état clair. | P0 |

## 3. Mode comptoir

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-COMP-01 | Utilisateur accueil ou admin connecté. | Ouvrir le mode comptoir. | L'écran comptoir charge avec les actions principales visibles. | P0 |
| QA-COMP-02 | Aucun client sélectionné. | Créer un client rapide avec téléphone et nom. | Le client est créé et sélectionnable immédiatement. | P0 |
| QA-COMP-03 | Client sélectionné. | Créer une réparation sans devis. | Le dossier est créé, visible dans réparations et atelier. | P0 |
| QA-COMP-04 | Création réparation en cours. | Ajouter photos d'entrée ou simuler l'ajout. | Les photos sont liées au dossier et visibles ensuite. | P0 |
| QA-COMP-05 | Flow signature activé ou zone signature disponible. | Ajouter une signature puis créer le dossier. | La signature est liée au bon dossier ou document. | P1 |
| QA-COMP-06 | Dossier créé. | Ouvrir le QR code ou copier le lien de suivi. | Le lien ou QR code pointe vers le bon suivi client. | P0 |
| QA-COMP-07 | Dossier créé. | Ouvrir ou télécharger la fiche dépôt. | Le document s'ouvre ou se télécharge sans erreur. | P0 |
| QA-COMP-08 | Accueil connecté sans permission sensible. | Inspecter documents et vues comptoir. | Prix d'achat, marge, fournisseur et stock interne sont absents. | P0 |

## 4. Mode atelier

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-ATEL-01 | Technicien connecté, au moins une réparation existe. | Ouvrir le mode atelier. | Les dossiers à traiter sont visibles. | P0 |
| QA-ATEL-02 | Dossier avec photos d'entrée. | Ouvrir le dossier dans l'atelier. | Les photos d'entrée, panne et appareil sont visibles. | P0 |
| QA-ATEL-03 | Dossier ouvert. | Ajouter une note technique. | La note est enregistrée comme note interne. | P1 |
| QA-ATEL-04 | Dossier ouvert. | Changer le statut vers diagnostic puis en réparation. | Le statut change et l'historique est mis à jour. | P0 |
| QA-ATEL-05 | Dossier ouvert, pièce disponible. | Associer une pièce au dossier. | La pièce apparaît dans le dossier; le stock ne décrémente que si le flow le valide. | P1 |
| QA-ATEL-06 | Statut public modifié. | Ouvrir le suivi client du dossier. | Le suivi affiche un statut public cohérent. | P0 |
| QA-ATEL-07 | Technicien sans permission sensible. | Vérifier prix achat, marge et fournisseur. | Les données sensibles ne sont pas visibles. | P0 |

## 5. Clients

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-CLI-01 | Utilisateur autorisé connecté. | Ouvrir `/dashboard/clients`. | La liste clients charge sans erreur. | P0 |
| QA-CLI-02 | Aucun client sélectionné. | Créer un client avec téléphone et nom. | Le client est créé et retrouvable par recherche. | P0 |
| QA-CLI-03 | Client existant avec réparation. | Ouvrir la fiche client. | L'historique réparations, devis, factures ou paiements liés est visible selon permissions. | P1 |
| QA-CLI-04 | Client existant. | Modifier une information non sensible. | La modification est persistée après refresh. | P1 |
| QA-CLI-05 | Rôle limité connecté. | Tenter suppression ou export client. | L'action est bloquée ou absente. | P0 |
| QA-CLI-06 | Recherche avec téléphone existant. | Créer un nouveau client avec le même téléphone. | Le système propose le client existant ou signale le risque de doublon. | P1 |

## 6. Réparations

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-REP-01 | Utilisateur autorisé connecté. | Créer une réparation sans devis. | La réparation est créée avec statut courant et identifiant unique. | P0 |
| QA-REP-02 | Réparation existante. | Ouvrir le dossier détail. | Client, appareil, panne, statut, photos, documents et paiements liés sont accessibles. | P0 |
| QA-REP-03 | Réparation existante. | Changer plusieurs statuts. | Chaque changement est historisé. | P0 |
| QA-REP-04 | Réparation existante sans facture. | Continuer le traitement atelier. | Le dossier n'est pas bloqué par l'absence de facture. | P0 |
| QA-REP-05 | Réparation existante sans devis. | Créer une facture directe. | La facture est possible si les lignes et données minimales sont valides. | P0 |
| QA-REP-06 | Réparation avec photos. | Refresh puis rouvrir le dossier. | Les photos restent visibles. | P0 |
| QA-REP-07 | Rôle limité connecté. | Tenter suppression réparation. | La suppression est bloquée ou absente. | P0 |

## 7. Devis

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-DEV-01 | Réparation existante. | Créer un devis avec une ligne valide. | Le devis est créé, lié au dossier et ouvrable. | P0 |
| QA-DEV-02 | Création devis. | Tenter de valider un devis sans ligne. | La validation est bloquée avec erreur claire. | P0 |
| QA-DEV-03 | Devis créé. | Ouvrir et télécharger le devis. | Le document fonctionne et ne contient pas de données internes. | P0 |
| QA-DEV-04 | Devis créé. | Accepter le devis. | Le devis passe accepté par action explicite. | P1 |
| QA-DEV-05 | Devis créé. | Refuser le devis. | Le devis passe refusé et la réparation n'est pas supprimée. | P0 |
| QA-DEV-06 | Devis accepté. | Convertir en facture. | La facture reprend les lignes utiles et reste modifiable selon règles. | P0 |
| QA-DEV-07 | Réparation sans devis. | Continuer le flow réparation. | Aucun écran n'exige un devis. | P0 |

## 8. Factures

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-FAC-01 | Client ou réparation disponible. | Créer une facture directe sans devis avec ligne valide. | La facture est créée. | P0 |
| QA-FAC-02 | Création facture. | Tenter de valider une facture avec lignes vides. | La validation est bloquée. | P0 |
| QA-FAC-03 | Facture créée. | Ouvrir et télécharger la facture. | Les deux actions fonctionnent depuis le dossier et le module factures. | P0 |
| QA-FAC-04 | Facture créée. | Vérifier contenu document client. | Marge, prix achat, fournisseur et stock interne sont absents. | P0 |
| QA-FAC-05 | Devis accepté. | Créer facture depuis devis. | La facture est liée au devis et au dossier. | P0 |
| QA-FAC-06 | Facture partiellement payée. | Consulter statut et solde. | Le solde restant est clair. | P1 |
| QA-FAC-07 | Facture déjà émise. | Changer pays/devise atelier puis rouvrir. | La facture historique ne change pas silencieusement. | P0 |

## 9. Paiements

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-PAI-01 | Facture impayée disponible. | Enregistrer un paiement total. | La facture passe payée et le solde devient zéro. | P0 |
| QA-PAI-02 | Facture impayée disponible. | Enregistrer un paiement partiel. | Le paiement est enregistré et le solde restant est exact. | P0 |
| QA-PAI-03 | Réparation sans facture. | Enregistrer un acompte si flow disponible. | L'acompte est lié à la réparation. | P1 |
| QA-PAI-04 | Formulaire paiement. | Saisir montant nul, négatif ou vide. | La validation est bloquée. | P0 |
| QA-PAI-05 | Facture avec reste dû. | Saisir montant supérieur au dû. | Le surpaiement est bloqué sauf règle explicite. | P0 |
| QA-PAI-06 | Paiement enregistré. | Ouvrir ou télécharger le reçu. | Le reçu fonctionne et ne contient aucune donnée interne. | P0 |
| QA-PAI-07 | Rôle sans permission remboursement. | Tenter remboursement ou annulation. | L'action est bloquée ou absente. | P0 |

## 10. Documents

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-DOC-01 | Réparation créée. | Ouvrir fiche dépôt. | La fiche s'ouvre depuis le dossier. | P0 |
| QA-DOC-02 | Réparation créée. | Télécharger fiche dépôt. | Un fichier exploitable est téléchargé. | P0 |
| QA-DOC-03 | Devis créé. | Ouvrir et télécharger devis. | Les deux actions fonctionnent. | P0 |
| QA-DOC-04 | Facture créée. | Ouvrir et télécharger facture. | Les deux actions fonctionnent. | P0 |
| QA-DOC-05 | Paiement enregistré. | Ouvrir et télécharger reçu. | Les deux actions fonctionnent si reçu disponible. | P0 |
| QA-DOC-06 | Tout document client. | Rechercher marge, prix achat, fournisseur, stock interne. | Aucun terme ou valeur interne n'apparaît. | P0 |
| QA-DOC-07 | Document public par token. | Ouvrir avec token invalide. | Erreur claire sans fuite de données. | P0 |
| QA-DOC-08 | Depuis plusieurs écrans. | Ouvrir même document depuis dossier, liste documents, facture/devis. | Le document reste accessible partout où il est référencé. | P0 |

## 11. Suivi client

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-SUI-01 | Réparation avec token. | Ouvrir le lien de suivi. | Le bon dossier public s'affiche. | P0 |
| QA-SUI-02 | Réparation avec QR code. | Scanner ou ouvrir l'URL du QR code. | Le QR code mène au bon suivi. | P0 |
| QA-SUI-03 | Réparation sans devis. | Ouvrir suivi client. | Le suivi fonctionne quand même. | P0 |
| QA-SUI-04 | Statut atelier modifié. | Rafraîchir le suivi client. | Le statut public est mis à jour. | P0 |
| QA-SUI-05 | Documents publics disponibles. | Ouvrir et télécharger depuis le suivi. | Les documents fonctionnent. | P0 |
| QA-SUI-06 | Token invalide. | Ouvrir une URL publique invalide. | Aucun nom client, dossier ou donnée interne n'est révélé. | P0 |
| QA-SUI-07 | Page publique sur mobile. | Tester viewport 390 x 844. | La page est lisible et les actions principales restent accessibles. | P1 |

## 12. Stock

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-STO-01 | Utilisateur autorisé connecté. | Ouvrir le stock. | La liste stock charge et la recherche fonctionne. | P0 |
| QA-STO-02 | Admin connecté. | Ouvrir une pièce. | Prix achat, marge et fournisseur sont visibles si permission active. | P1 |
| QA-STO-03 | Technicien ou accueil sans permission sensible. | Ouvrir une pièce. | Prix achat, marge et fournisseur sont masqués. | P0 |
| QA-STO-04 | Réparation ouverte, pièce disponible. | Associer une pièce. | La pièce est liée au dossier. | P1 |
| QA-STO-05 | Pièce consultée seulement. | Ouvrir puis fermer la fiche pièce. | Le stock ne décrémente pas. | P0 |
| QA-STO-06 | Devis brouillon avec pièce. | Créer ou modifier devis sans validation métier. | Le stock ne décrémente pas. | P0 |
| QA-STO-07 | Pièce en rupture. | Tenter utilisation. | Erreur ou avertissement clair; stock ne devient pas négatif. | P0 |
| QA-STO-08 | Document client avec pièce. | Ouvrir devis/facture. | Aucun stock interne, fournisseur ou prix achat n'apparaît. | P0 |

## 13. Paramètres

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-PAR-01 | Admin connecté. | Ouvrir `/dashboard/parametres`. | Les paramètres atelier chargent. | P0 |
| QA-PAR-02 | Admin connecté. | Modifier nom atelier ou contact. | La modification est sauvegardée et visible après refresh. | P1 |
| QA-PAR-03 | Admin connecté. | Ouvrir paramètres équipe. | La gestion équipe est accessible. | P1 |
| QA-PAR-04 | Technicien connecté. | Accéder à paramètres équipe par URL directe. | Accès bloqué ou message permission requise. | P0 |
| QA-PAR-05 | Rôle limité connecté. | Tenter modification pays/devise ou licence. | Action bloquée ou absente. | P0 |
| QA-PAR-06 | Paramètres modifiés. | Générer un document. | Les infos atelier à jour apparaissent sur le document. | P1 |

## 14. France / Suisse

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-FRCH-01 | Admin connecté. | Configurer pays France. | EUR est proposé ou utilisé par défaut. | P0 |
| QA-FRCH-02 | Atelier France. | Créer devis et facture. | Les documents affichent EUR et les règles France. | P0 |
| QA-FRCH-03 | Admin connecté. | Configurer pays Suisse. | CHF est proposé ou utilisé par défaut. | P0 |
| QA-FRCH-04 | Atelier Suisse. | Créer facture directe sans devis. | La facture est créée en CHF si données valides. | P0 |
| QA-FRCH-05 | Atelier Suisse. | Générer devis, facture, reçu. | Aucune validation strictement française ne bloque le flow. | P0 |
| QA-FRCH-06 | Documents France et Suisse existants. | Changer pays/devise puis rouvrir anciens documents. | Les anciens documents gardent leur devise et contexte. | P0 |
| QA-FRCH-07 | Atelier Suisse. | Ouvrir/télécharger document depuis dossier et suivi client. | Les documents fonctionnent en CHF. | P0 |

## 15. Responsive desktop / tablette / mobile

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-RESP-01 | App lancée, admin connecté. | Tester desktop 1440 x 900. | Dashboard, listes, dossier et documents sont utilisables sans chevauchement. | P0 |
| QA-RESP-02 | App lancée, accueil connecté. | Tester tablette 1024 x 768 sur mode comptoir. | Création client/réparation, photos, QR et documents restent utilisables. | P0 |
| QA-RESP-03 | App lancée, technicien connecté. | Tester tablette 768 x 1024 sur atelier. | Liste/Kanban, détail dossier et statuts restent lisibles. | P1 |
| QA-RESP-04 | App lancée. | Tester mobile 390 x 844 sur dashboard et dossier. | Navigation accessible, pas de contenu critique hors écran. | P0 |
| QA-RESP-05 | Lien public valide. | Tester suivi client mobile. | Statut, documents et actions publiques sont lisibles. | P0 |
| QA-RESP-06 | Document ouvert. | Tester prévisualisation document sur mobile. | Le document reste lisible ou téléchargeable sans écran cassé. | P1 |

## 16. Persistance après refresh

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-PERS-01 | Client créé. | Rafraîchir la page puis rechercher le client. | Le client existe toujours. | P0 |
| QA-PERS-02 | Réparation créée avec photos. | Rafraîchir puis rouvrir le dossier. | La réparation et les photos restent visibles. | P0 |
| QA-PERS-03 | Statut modifié. | Rafraîchir puis vérifier le dossier. | Le statut et l'historique restent cohérents. | P0 |
| QA-PERS-04 | Devis/facture créés. | Rafraîchir puis ouvrir les documents. | Les documents restent accessibles. | P0 |
| QA-PERS-05 | Paiement enregistré. | Rafraîchir puis vérifier solde. | Paiement et solde sont conservés. | P0 |
| QA-PERS-06 | Paramètres pays/devise modifiés. | Rafraîchir puis vérifier paramètres et documents nouveaux. | Les paramètres sont conservés. | P0 |
| QA-PERS-07 | Session utilisateur active. | Rafraîchir l'app. | Le comportement attendu de session/PIN est respecté sans perte de données. | P1 |

## 17. Tests de non-régression obligatoires

Ces tests doivent être rejoués après chaque mission, même si le module modifié semble éloigné.

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-NR-01 | App prête. | Créer une réparation sans devis. | Le flow complet fonctionne. | P0 |
| QA-NR-02 | Réparation existante. | Créer une facture directe sans devis. | La facture est créée avec lignes valides. | P0 |
| QA-NR-03 | Facture ou devis créé. | Ouvrir et télécharger le document. | Les deux actions fonctionnent. | P0 |
| QA-NR-04 | Document client créé. | Vérifier absence données internes. | Pas de marge, prix achat, fournisseur, stock interne. | P0 |
| QA-NR-05 | Réparation avec QR. | Ouvrir suivi via lien/QR. | Le bon dossier public s'ouvre. | P0 |
| QA-NR-06 | Photos ajoutées. | Refresh puis ouvrir dossier. | Photos toujours accessibles. | P0 |
| QA-NR-07 | Atelier France puis Suisse. | Générer factures dans chaque contexte. | EUR pour France, CHF pour Suisse, aucune validation pays incorrecte. | P0 |
| QA-NR-08 | Rôle limité. | Tester suppression, export, paramètres équipe. | Actions bloquées. | P0 |
| QA-NR-09 | Données créées. | Refresh complet navigateur. | Données locales importantes persistées. | P0 |
| QA-NR-10 | Desktop, tablette, mobile. | Parcourir dashboard, comptoir, dossier, suivi. | Aucun écran central cassé. | P0 |

## 18. Build / TypeScript / lint

### 18.1 Commandes à lancer si disponibles

| ID | Précondition | Action | Résultat attendu | Priorité |
| --- | --- | --- | --- | --- |
| QA-TECH-01 | Dépendances installées. | `npx tsc --noEmit` | Aucun type error. | P0 |
| QA-TECH-02 | Dépendances installées. | `npm run build` | Build production réussi. | P0 |
| QA-TECH-03 | Script disponible. | `npm run check` | Pas d'erreur Biome bloquante. | P1 |
| QA-TECH-04 | Suite Playwright disponible. | `npm run test:audit:quick` ou `npx playwright test tests/behar-tech-final-500-audit.spec.ts` | Suite critique verte ou échecs documentés. | P0 |
| QA-TECH-05 | Modification E2E sensible. | `npx playwright test tests/e2e/behar-full-atelier.spec.ts` | Flow atelier/comptoir principal vert ou échecs documentés. | P1 |

### 18.2 Si une commande n'est pas disponible

- Noter explicitement la commande non exécutée.
- Noter la raison: dépendance absente, sandbox, serveur non lancé, config manquante.
- Ne pas déclarer GO complet si `build` ou TypeScript n'a pas pu être vérifié après une modification de code.

## 19. Points bloquants

Un seul de ces points impose un `NO GO` jusqu'à correction ou décision produit explicite.

| Blocage | Description | Priorité |
| --- | --- | --- |
| App inaccessible | `/dashboard` ne charge pas ou crash permanent. | P0 |
| Login/licence impossible | Impossible d'atteindre l'app avec une licence valide ou un PIN valide. | P0 |
| Perte de données | Client, réparation, document, paiement ou paramètres disparaissent après refresh. | P0 |
| Réparation sans devis impossible | Le produit force un devis pour créer ou gérer une réparation. | P0 |
| Facture directe cassée | Impossible de créer une facture directe valide sans devis. | P0 |
| Document cassé | Facture, devis, reçu ou fiche dépôt ne s'ouvre pas ou ne se télécharge pas. | P0 |
| Fuite données internes | Document client ou suivi public affiche marge, prix achat, fournisseur ou stock interne. | P0 |
| QR/lien mauvais dossier | Le suivi public ouvre un autre dossier que celui attendu. | P0 |
| Suisse bloquée par France | Une entreprise suisse est bloquée par une validation strictement française. | P0 |
| Permissions contournées | Rôle limité peut supprimer, exporter, voir marge/prix achat/fournisseur ou modifier paramètres sensibles. | P0 |
| Build cassé | `npm run build` échoue après une modification de code. | P0 |

## 20. Go / No Go

### 20.1 GO

Décision `GO` si:

- Aucun P0 ouvert.
- Build production réussi si du code a été modifié.
- TypeScript sans erreur si la commande est disponible.
- Les flows non-régression P0 sont validés.
- Les documents client ne contiennent aucune donnée interne.
- Le suivi client par lien/QR ouvre le bon dossier.
- France et Suisse passent les contrôles de devise et validation.

### 20.2 GO avec réserves

Décision `GO avec réserves` si:

- Aucun P0 ouvert.
- Un ou plusieurs P1 restent présents mais contournables.
- Les réserves sont listées avec module, impact et action corrective.
- La démo ou livraison ne dépend pas du P1 restant.

### 20.3 NO GO

Décision `NO GO` si:

- Au moins un P0 est ouvert.
- Une commande technique critique échoue sans contournement validé.
- Un document client fuit une donnée interne.
- Une création réparation sans devis ne fonctionne plus.
- Une facture directe valide ne peut pas être créée.
- Les données créées disparaissent après refresh.
- Le QR code ou lien client ouvre le mauvais dossier.

## 21. Format de compte rendu attendu après QA

Chaque mission doit finir avec un court compte rendu:

- Commandes lancées.
- Tests manuels effectués.
- Résultat: GO, GO avec réserves ou NO GO.
- P0 restants: aucun ou liste.
- P1/P2 restants: liste courte.
- Modules non testés et raison.

