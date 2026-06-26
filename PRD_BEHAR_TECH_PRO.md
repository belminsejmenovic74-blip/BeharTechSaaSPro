# PRD - Behar Tech Pro

## 1. Vision produit

### 1.1 Résumé

Behar Tech Pro est un SaaS premium pour ateliers de réparation de smartphones, ordinateurs, tablettes et consoles. Le produit aide un réparateur à gérer tout le cycle de vie d'une réparation depuis l'accueil client jusqu'au paiement, en passant par le diagnostic, les photos d'entrée, le suivi client, les documents PDF, le stock et l'atelier.

Le produit doit être utilisable en conditions réelles d'atelier:

- Sur desktop pour la gestion complète.
- Sur tablette au comptoir pour créer rapidement un dossier, encaisser, faire signer ou montrer un suivi.
- Sur mobile pour consulter, mettre à jour, prendre des photos ou suivre une réparation.

### 1.2 Promesse produit

Behar Tech Pro doit donner à un atelier indépendant le niveau de qualité opérationnelle d'un réseau premium, sans complexité inutile.

Le produit doit permettre:

- De créer un dossier réparation en moins de 2 minutes.
- De suivre chaque réparation sans perdre d'informations.
- De réduire les appels clients grâce au lien ou QR code de suivi.
- De générer des devis, factures, reçus et documents propres.
- De protéger l'atelier avec des photos, états d'entrée et historiques clairs.
- De gérer le stock sans exposer les informations internes au client.
- De travailler en France ou en Suisse avec les bonnes devises et règles documentaires.

### 1.3 Positionnement

Behar Tech Pro n'est pas un ERP lourd. C'est un logiciel métier premium, rapide et très concret pour ateliers de réparation.

Références de qualité attendues:

- Apple pour la clarté, l'espace, la simplicité.
- Stripe pour la précision, les états, les détails administratifs.
- Linear pour la rapidité, la navigation fluide, la densité utile.

## 2. Problèmes utilisateurs

### 2.1 Problèmes côté atelier

- Les informations d'une réparation sont dispersées entre messages, papier, photos et mémoire du technicien.
- Les clients appellent souvent pour connaître l'avancement.
- Les devis, factures et reçus sont parfois créés dans plusieurs outils différents.
- Le stock de pièces n'est pas toujours fiable.
- Les photos d'entrée et preuves d'état sont faciles à oublier.
- Les prix d'achat, marges et fournisseurs peuvent être exposés par erreur.
- Les règles françaises et suisses ne sont pas toujours compatibles.
- Les outils existants sont souvent trop lourds, trop moches ou trop génériques.

### 2.2 Problèmes côté client final

- Le client ne sait pas si son appareil est pris en charge, en attente de pièce, en réparation ou prêt.
- Le client reçoit parfois des documents peu professionnels.
- Le client doit rappeler ou envoyer des messages pour obtenir une information simple.
- Le client peut douter de l'état initial de son appareil sans photos ou fiche claire.

### 2.3 Problèmes côté équipe

- Le gérant veut voir l'activité, les paiements, les marges et les risques.
- Le technicien veut une vue atelier rapide, sans administratif inutile.
- L'accueil veut créer un dossier, prendre un paiement, planifier un rendez-vous et imprimer un document sans chercher.
- Un stagiaire ou employé limité ne doit pas accéder aux données sensibles.

## 3. Objectifs business et produit

### 3.1 Objectifs business

- Vendre une solution SaaS premium à des ateliers de réparation indépendants et multi-boutiques.
- Réduire le temps administratif quotidien des réparateurs.
- Augmenter la confiance client grâce à des documents propres et au suivi en ligne.
- Créer une base produit extensible pour des offres futures: synchronisation cloud, multi-boutique, paiement en ligne, SMS, IA d'aide au prix.
- Permettre des démonstrations commerciales sans backend complexe.

### 3.2 Objectifs produit

- Centraliser l'activité autour d'un dossier unique réparation.
- Garantir des flows rapides pour comptoir, atelier et mobile.
- Permettre le fonctionnement local-first et mock tant que les vraies API ne sont pas connectées.
- Assurer que les documents client n'affichent jamais les informations internes.
- Permettre France et Suisse sans bloquer les documents par des validations propres à un seul pays.
- Garder les flows validés stables à chaque évolution.

### 3.3 Indicateurs de succès

- Création d'une réparation complète en moins de 2 minutes.
- Accès au suivi client par lien ou QR code en moins de 10 secondes.
- Génération ou ouverture d'un document en moins de 3 secondes en local.
- Aucun document client ne contient prix d'achat, marge, fournisseur ou stock interne.
- Aucun blocage de facture directe quand les conditions métier sont valides.
- Utilisation fluide sur desktop, tablette et mobile.

## 4. Utilisateurs et rôles

### 4.1 Gérant / administrateur

Responsabilités:

- Piloter l'activité.
- Gérer les réparations, clients, devis, factures, paiements, stock.
- Voir les informations sensibles si autorisé: prix d'achat, marge, fournisseur.
- Gérer l'équipe, les permissions, les paramètres atelier.
- Configurer le pays, la devise, l'identité boutique et les documents.

Droits attendus:

- Accès complet par défaut.
- Peut modifier les paramètres sensibles.
- Peut supprimer ou exporter selon permission explicite.

### 4.2 Technicien

Responsabilités:

- Diagnostiquer et réparer les appareils.
- Mettre à jour les statuts.
- Ajouter notes techniques, pièces utilisées et photos.
- Consulter les dossiers affectés.

Droits attendus:

- Accès atelier et réparations.
- Accès limité aux clients selon besoin.
- Pas d'accès par défaut aux marges, prix d'achat, fournisseurs ou paramètres équipe.

### 4.3 Accueil / comptoir

Responsabilités:

- Créer une fiche client.
- Créer une réparation rapidement.
- Prendre les photos d'entrée si nécessaire.
- Planifier un rendez-vous.
- Générer ou envoyer un lien de suivi.
- Encaisser un acompte ou paiement.
- Créer devis, facture directe ou reçu selon contexte.

Droits attendus:

- Accès comptoir, clients, rendez-vous, devis, factures et paiements.
- Pas d'accès aux informations internes sensibles.

### 4.4 Stagiaire / rôle limité

Responsabilités:

- Aider à l'atelier ou au comptoir sur des tâches limitées.

Droits attendus:

- Accès restreint.
- Pas de suppression.
- Pas d'export.
- Pas de paramètres sensibles.
- Pas de marge, prix d'achat ou fournisseur.

### 4.5 Client final

Responsabilités:

- Consulter l'avancement d'une réparation depuis un lien ou QR code.
- Consulter les documents publics: devis, facture, reçu, suivi.
- Accepter ou refuser un devis si le flow est disponible.

Droits attendus:

- Accès uniquement par token public.
- Aucun accès aux données internes.
- Aucun accès aux autres dossiers.

## 5. Modules principaux

### 5.1 Tableau de bord

Objectif:

- Donner une vue immédiate de l'activité du jour et des priorités.

Fonctions:

- KPIs: réparations en cours, prêtes, en attente, paiements, chiffre d'affaires.
- Activité récente.
- Alertes stock ou dossiers bloqués.
- Accès rapide aux flows: nouvelle réparation, rendez-vous, facture, paiement.

### 5.2 Dossier unique réparation

Objectif:

- Centraliser toutes les informations liées à une réparation.

Contenu obligatoire:

- Identifiant unique du dossier.
- Client.
- Appareil: type, marque, modèle, couleur, capacité, numéro de série ou IMEI si disponible.
- Problème déclaré.
- Etat d'entrée.
- Photos d'entrée visibles.
- Statut actuel.
- Historique des statuts.
- Notes comptoir.
- Notes techniques.
- Pièces associées.
- Devis liés si existants.
- Factures liées si existantes.
- Paiements liés.
- Documents PDF liés.
- Lien ou QR code de suivi client.

Règles:

- Un devis ne doit pas être obligatoire pour créer ou gérer une réparation.
- Une réparation peut exister sans facture tant que le dossier n'est pas finalisé ou encaissé.
- Une facture directe peut être créée si les conditions métier sont valides.
- Les photos d'entrée doivent rester accessibles dans le dossier.

### 5.3 Mode comptoir

Objectif:

- Permettre une prise en charge rapide face au client.

Fonctions:

- Création client rapide.
- Création réparation rapide.
- Sélection appareil et panne.
- Photos d'entrée.
- Etat visuel et accessoires déposés.
- Rendez-vous ou dépôt direct.
- Génération lien ou QR code de suivi.
- Création devis optionnelle.
- Création facture directe si valide.
- Encaissement acompte ou paiement.
- Impression ou téléchargement document.

Contraintes:

- Interface très claire, peu de champs visibles au départ.
- Priorité au temps d'exécution.
- Compatible tablette comptoir.

### 5.4 Mode atelier

Objectif:

- Aider les techniciens à traiter les réparations sans bruit administratif.

Fonctions:

- Vue Kanban ou liste par statut.
- Filtres: priorité, type appareil, statut, technicien, attente pièce, date.
- Détail réparation.
- Changement de statut rapide.
- Notes techniques.
- Ajout de photos.
- Association de pièces stock.
- Signalement d'un blocage.
- Marquage prêt à récupérer.

Contraintes:

- Les informations utiles au technicien doivent être visibles immédiatement.
- Les actions fréquentes doivent être accessibles en un clic ou deux.

### 5.5 Suivi client par QR code ou lien

Objectif:

- Réduire les appels et donner une expérience client professionnelle.

Fonctions:

- Génération d'un lien public unique par réparation.
- Génération d'un QR code lié au dossier.
- Page publique de suivi.
- Affichage du statut, des prochaines étapes et des documents publics.
- Acceptation ou refus de devis si activé.
- Téléchargement ou ouverture des documents disponibles.

Règles:

- Le lien doit fonctionner en local/demo et avec API réelle plus tard.
- Le token public ne doit donner accès qu'au dossier concerné.
- Aucune donnée interne ne doit être exposée.

### 5.6 Clients

Objectif:

- Gérer les coordonnées et l'historique client.

Fonctions:

- Création et édition client.
- Recherche par nom, téléphone, email.
- Historique réparations, devis, factures, paiements.
- Association de plusieurs appareils.

Contraintes:

- La création d'un client doit être rapide.
- Le téléphone doit rester le champ prioritaire pour un atelier.

### 5.7 Réparations

Objectif:

- Gérer le cycle complet des réparations.

Statuts recommandés:

- Nouveau.
- Diagnostic.
- Devis envoyé.
- En attente client.
- En attente pièce.
- En réparation.
- Prêt.
- Livré.
- Annulé.

Règles:

- Les statuts doivent être simples et compréhensibles.
- Le passage d'un statut doit être historisé.
- Certains statuts peuvent déclencher un affichage dans le suivi client.
- Un changement de statut ne doit pas casser les devis, factures ou documents déjà générés.

### 5.8 Rendez-vous

Objectif:

- Planifier les passages clients et interventions.

Fonctions:

- Création rendez-vous.
- Association client et réparation si disponible.
- Type: dépôt, diagnostic, récupération, intervention, autre.
- Vue calendrier.
- Statut: prévu, confirmé, terminé, annulé, absent.

Contraintes:

- Un rendez-vous peut exister sans réparation au départ.
- Un rendez-vous peut être converti en réparation.

### 5.9 Devis

Objectif:

- Proposer un prix avant intervention quand le contexte le demande.

Fonctions:

- Création depuis réparation ou client.
- Lignes de prestation et pièces.
- TVA ou taxes selon contexte pays.
- Envoi ou partage par lien.
- Acceptation ou refus.
- Conversion en facture.

Règles obligatoires:

- Un devis ne doit jamais être obligatoire pour créer ou gérer une réparation.
- Un devis refusé ne doit pas supprimer la réparation.
- Un devis accepté peut faciliter la création de facture, mais ne doit pas être l'unique chemin.
- Les documents devis client ne doivent jamais afficher prix d'achat, marge, fournisseur, stock interne.

### 5.10 Factures

Objectif:

- Facturer une réparation, une vente ou une prestation.

Fonctions:

- Création depuis devis accepté.
- Création directe sans devis si conditions métier valides.
- Association à une réparation ou à une vente.
- Paiement total ou partiel.
- Génération PDF.
- Ouverture et téléchargement.

Règles obligatoires:

- Une facture directe peut exister si les informations minimales sont présentes.
- Les validations françaises ne doivent pas bloquer une facture suisse.
- La devise doit suivre le contexte atelier, boutique ou document.
- La facture client ne doit jamais exposer les informations internes.

### 5.11 Paiements

Objectif:

- Suivre les encaissements et soldes.

Fonctions:

- Paiement facture.
- Acompte sur réparation.
- Paiement partiel.
- Moyens: espèces, carte, virement, autre.
- Reçu ou justificatif si nécessaire.
- Historique.

Règles:

- Un paiement doit être relié à une facture, une réparation ou une vente selon le flow.
- Le solde restant doit être clair.
- Les paiements mock/local doivent fonctionner sans API bancaire.

### 5.12 Documents PDF

Objectif:

- Générer des documents propres, lisibles et conformes au contexte marché.

Types de documents:

- Fiche dépôt.
- Devis.
- Facture.
- Reçu.
- Bon de prise en charge.
- Fiche état appareil.
- Certificat ou document de reconditionnement si applicable.

Règles obligatoires:

- Ouverture document doit fonctionner.
- Téléchargement document doit fonctionner.
- Les documents client ne doivent jamais afficher prix d'achat, marge, fournisseur, stock interne.
- Les documents doivent respecter la devise du contexte.
- Les documents doivent respecter le pays de l'entreprise: France ou Suisse.
- Une validation propre à la France ne doit pas bloquer une entreprise suisse.

### 5.13 Stock

Objectif:

- Gérer les pièces et produits nécessaires aux réparations.

Fonctions:

- Liste pièces.
- Recherche.
- Quantité disponible.
- Seuil d'alerte.
- Prix vente.
- Prix achat visible uniquement selon permission.
- Fournisseur visible uniquement selon permission.
- Association pièce à réparation.
- Décrément stock si validé par le flow.

Règles:

- Le stock interne ne doit jamais apparaître sur un document client.
- Les prix d'achat, marges et fournisseurs sont des données sensibles.
- Une réparation ne doit pas être bloquée par une pièce non renseignée si le flow métier permet de continuer.

### 5.14 Rôles et permissions

Objectif:

- Protéger les actions sensibles et les données internes.

Permissions critiques:

- Voir prix d'achat.
- Voir marge.
- Voir fournisseur.
- Gérer utilisateurs.
- Gérer rôles.
- Supprimer réparation.
- Supprimer client.
- Exporter données.
- Modifier paramètres entreprise.
- Rembourser.
- Appliquer remise.

Règles:

- Les permissions doivent s'appliquer à l'interface et aux accès directs par URL.
- Les données sensibles ne doivent pas être présentes dans les vues ou documents publics.
- Le rôle limité ne doit pas pouvoir supprimer ou exporter.

### 5.15 Paramètres atelier, pays et devise

Objectif:

- Adapter l'application au contexte réel de la boutique.

Paramètres:

- Nom atelier.
- Adresse.
- Téléphone.
- Email.
- Pays: France ou Suisse.
- Devise par défaut: EUR ou CHF.
- Identifiants fiscaux selon pays.
- Logo.
- Mentions documentaires.

Règles:

- Le pays doit permettre France ou Suisse.
- La devise doit suivre le contexte atelier, boutique ou document.
- Un document suisse ne doit pas être bloqué par une règle française.
- Les données déjà créées doivent garder leur devise documentaire si nécessaire.

## 6. Flows principaux

### 6.1 Flow création réparation au comptoir

1. L'accueil ouvre le mode comptoir.
2. Il recherche ou crée le client.
3. Il sélectionne l'appareil ou le renseigne manuellement.
4. Il renseigne la panne déclarée.
5. Il capture ou ajoute les photos d'entrée.
6. Il renseigne l'état d'entrée et les accessoires déposés.
7. Il crée le dossier réparation.
8. Le système génère un identifiant, un lien de suivi et un QR code.
9. L'accueil peut imprimer, télécharger ou ouvrir la fiche dépôt.
10. Le dossier apparaît dans le mode atelier.

Critères clés:

- Le devis est optionnel.
- Le dossier doit être utilisable immédiatement.
- Les photos sont visibles dans le dossier.

### 6.2 Flow atelier

1. Le technicien ouvre le mode atelier.
2. Il filtre ou sélectionne une réparation.
3. Il consulte problème, appareil, photos, notes et historique.
4. Il change le statut en diagnostic, en réparation, en attente pièce ou prêt.
5. Il ajoute notes techniques, photos ou pièces utilisées.
6. Le suivi client se met à jour selon les statuts publics.

Critères clés:

- Les actions fréquentes doivent être rapides.
- Les informations client et appareil doivent rester lisibles.
- Les données sensibles restent protégées selon permission.

### 6.3 Flow devis optionnel

1. L'utilisateur ouvre une réparation ou un client.
2. Il crée un devis si le contexte le nécessite.
3. Il ajoute les lignes.
4. Il génère ou partage le document.
5. Le client peut accepter ou refuser si le lien public est disponible.
6. Un devis accepté peut être converti en facture.

Critères clés:

- La réparation continue d'exister même sans devis.
- Un devis refusé ne supprime pas le dossier.
- Les informations internes ne sont jamais affichées.

### 6.4 Flow facture directe

1. L'utilisateur ouvre une réparation, une vente ou le module factures.
2. Il choisit facture directe.
3. Il renseigne client, lignes, devise et taxes selon contexte.
4. Le système valide les informations minimales.
5. La facture est créée.
6. L'utilisateur peut ouvrir, télécharger ou imprimer le PDF.
7. L'utilisateur peut encaisser un paiement.

Critères clés:

- Aucun devis requis.
- Les conditions métier doivent être validées.
- Les règles France ne bloquent pas la Suisse.

### 6.5 Flow paiement

1. L'utilisateur sélectionne une facture, une réparation ou une vente.
2. Il choisit un moyen de paiement.
3. Il saisit le montant.
4. Le système met à jour payé, partiel ou solde restant.
5. Un reçu peut être ouvert ou téléchargé.

Critères clés:

- Paiement partiel accepté si le flow le permet.
- Historique conservé.
- Aucun appel à une API bancaire réelle requis pour la démo.

### 6.6 Flow suivi client

1. Le client scanne le QR code ou ouvre le lien.
2. Il voit le statut public de sa réparation.
3. Il consulte les informations autorisées.
4. Il ouvre ou télécharge les documents disponibles.
5. Il peut accepter ou refuser un devis si activé.

Critères clés:

- Le lien doit fonctionner.
- Le token doit être unique.
- Aucune information interne n'est exposée.

### 6.7 Flow rendez-vous vers réparation

1. L'accueil crée un rendez-vous.
2. Le client se présente.
3. Le rendez-vous est ouvert.
4. L'utilisateur crée une réparation depuis le rendez-vous.
5. Les informations client et contexte sont reprises.
6. Le rendez-vous passe à terminé ou converti.

Critères clés:

- Un rendez-vous peut exister sans réparation.
- La conversion doit éviter la double saisie.

## 7. Règles métier obligatoires

### 7.1 Dossier réparation

- Une réparation doit pouvoir être créée sans devis.
- Une réparation doit pouvoir être gérée sans devis.
- Une réparation doit contenir un identifiant unique.
- Les photos d'entrée doivent être visibles depuis le dossier.
- Le dossier doit conserver l'historique des événements importants.
- Les liens et QR codes de suivi client doivent fonctionner.

### 7.2 Devis

- Le devis est optionnel.
- Le devis peut être créé depuis une réparation ou un client.
- Le devis peut être accepté ou refusé.
- Le devis accepté peut être converti en facture.
- Le devis refusé ne doit pas supprimer ni bloquer la réparation.

### 7.3 Factures

- Une facture directe peut exister sans devis si les conditions métier sont valides.
- Une facture peut être liée à une réparation, une vente ou un client.
- La facture doit utiliser la devise du contexte.
- Les validations propres à un pays ne doivent pas bloquer un autre pays.
- La facture doit pouvoir être ouverte et téléchargée.

### 7.4 Documents client

Les documents client ne doivent jamais afficher:

- Prix d'achat.
- Marge.
- Fournisseur.
- Stock interne.
- Notes techniques internes si elles ne sont pas explicitement publiques.
- Permissions ou informations d'équipe.

### 7.5 Pays et devise

- Le pays doit accepter au minimum France et Suisse.
- La devise par défaut doit être EUR pour France et CHF pour Suisse, avec possibilité d'adaptation selon contexte boutique.
- Le contexte atelier, boutique ou document doit déterminer la devise affichée.
- Les documents existants ne doivent pas changer de devise de manière silencieuse si cela altère l'historique.

### 7.6 Local-first et mock

- La démo doit fonctionner sans backend complexe.
- Les données doivent pouvoir vivre en localStorage, mock store ou couche locale équivalente.
- Les API réelles doivent pouvoir remplacer progressivement les mocks.
- L'absence de Supabase ou d'API externe ne doit pas casser la démo.

### 7.7 Non-régression

- Ne jamais casser les flows déjà validés.
- Chaque modification doit préserver les parcours comptoir, atelier, suivi client, documents et permissions.
- Les tests de non-régression doivent couvrir les documents et les données sensibles.

## 8. Contraintes UX/UI

### 8.1 Direction artistique obligatoire

Palette:

- Fond principal: blanc pur `#FFFFFF`.
- Texte principal: `#1A1916`.
- Texte secondaire: `#6B6B6B`.
- Accent: `#2A9D8F`.

Style:

- Premium SaaS.
- Apple / Stripe / Linear.
- Beaucoup d'espace.
- Soft shadows.
- Léger glass.
- Typographie nette et lisible.
- Interfaces calmes, rapides, professionnelles.

Interdits visuels:

- No dark mode.
- No néon.
- No humains.
- Pas de design réparateur cheap.
- Pas de bulles IA inutiles.
- Pas de fond bizarre.
- Pas de texture artificielle.
- Pas de palette agressive.

### 8.2 Responsive

Desktop:

- Navigation complète.
- Vue tableau, Kanban, détails et actions rapides.
- Densité utile sans surcharge.

Tablette comptoir:

- Boutons confortables.
- Parcours création rapide.
- Documents et QR code faciles à montrer au client.
- Pas de panneaux trop serrés.

Mobile:

- Consultation et actions rapides.
- Navigation basse ou actions primaires accessibles.
- Dossier lisible sans colonnes complexes.
- Photos et statuts visibles.

### 8.3 Principes d'interface

- L'action principale doit être évidente sur chaque écran.
- Les champs optionnels ne doivent pas bloquer les flows.
- Les erreurs doivent expliquer clairement quoi corriger.
- Les états vides doivent proposer une action utile.
- Les statuts doivent être compréhensibles sans formation.
- Les informations sensibles doivent être masquées par défaut.
- Les pages publiques doivent être très simples et rassurantes.

### 8.4 Documents

- Les PDF doivent être propres, lisibles, professionnels.
- Le branding atelier doit être visible.
- Les montants doivent être alignés et faciles à lire.
- La devise doit être explicite.
- Les mentions doivent s'adapter au pays.
- Aucun élément interne ne doit apparaître.

## 9. Contraintes techniques

### 9.1 Architecture actuelle attendue

- Application Next.js / React.
- TypeScript.
- UI responsive.
- Données mock/local pour la démo.
- Possibilité d'intégration Supabase ou API plus tard.
- Génération ou rendu de documents côté client ou via routes applicatives selon contexte.

### 9.2 Local-first

Exigences:

- L'app doit fonctionner avec données locales en démo.
- Les créations, modifications, statuts et documents doivent être testables sans backend réel.
- La couche de données doit isoler le métier de la persistance quand possible.
- Les futures API doivent pouvoir remplacer les mocks sans réécrire les flows UI.

### 9.3 Sécurité et confidentialité

- Les tokens publics doivent être uniques, non devinables et limités à une ressource.
- Les données sensibles doivent être filtrées avant rendu public ou document client.
- Les permissions doivent être vérifiées côté UI et côté accès direct quand une route existe.
- Les exports doivent être protégés.
- Les suppressions doivent être protégées.

### 9.4 Documents et téléchargements

- L'ouverture document doit fonctionner dans les routes prévues.
- Le téléchargement doit fonctionner sur desktop, tablette et mobile.
- Les documents publics doivent pouvoir être ouverts via token.
- Les documents ne doivent pas dépendre d'un backend non disponible pour la démo.

### 9.5 Pays, taxes et devises

- Le modèle de données doit stocker le pays ou marché de l'atelier.
- Le modèle de données doit stocker la devise du document ou du contexte.
- Les règles fiscales doivent être extensibles.
- Les validations doivent être conditionnées par pays.

### 9.6 Performance

- Les écrans comptoir et atelier doivent charger rapidement.
- Les actions fréquentes doivent être instantanées en local.
- Les images et photos doivent être optimisées pour l'affichage.
- Les documents ne doivent pas bloquer l'interface plus que nécessaire.

## 10. Ce qu'il ne faut pas faire

### 10.1 Produit

- Ne pas imposer un devis pour créer ou gérer une réparation.
- Ne pas forcer tous les ateliers dans un flow français.
- Ne pas bloquer une entreprise suisse avec des validations françaises.
- Ne pas transformer le produit en ERP lourd.
- Ne pas créer de dépendance obligatoire à une API externe pour la démo.
- Ne pas casser les flows déjà validés.
- Ne pas cacher les actions principales dans des menus profonds.

### 10.2 Données

- Ne jamais exposer prix d'achat, marge, fournisseur ou stock interne dans un document client.
- Ne pas mélanger devise atelier et devise document sans règle claire.
- Ne pas perdre les photos d'entrée.
- Ne pas supprimer des données liées sans confirmation et permission.
- Ne pas modifier silencieusement l'historique d'un document déjà émis.

### 10.3 UX/UI

- Ne pas utiliser de dark mode.
- Ne pas utiliser de néon.
- Ne pas utiliser de visuels humains.
- Ne pas faire un design "réparateur discount".
- Ne pas ajouter de bulles IA décoratives.
- Ne pas utiliser de fonds texturés artificiels.
- Ne pas surcharger le mode comptoir.
- Ne pas rendre le mobile secondaire ou cassé.

### 10.4 Technique

- Ne pas dupliquer les règles métier dans plusieurs endroits sans source claire.
- Ne pas générer de documents avec données non filtrées.
- Ne pas faire dépendre les tests critiques d'un service tiers instable.
- Ne pas contourner les permissions uniquement côté affichage si une route directe existe.

## 11. Critères d'acceptation

### 11.1 Critères globaux

- Le produit fonctionne sur desktop, tablette et mobile.
- Les modules clés sont accessibles selon les permissions.
- Les données mock/local permettent une démo complète.
- Les flows comptoir, atelier, suivi client, devis, facture, paiement et documents fonctionnent.
- Les documents peuvent être ouverts et téléchargés.
- Le QR code ou lien de suivi client fonctionne.
- Les règles France/Suisse et EUR/CHF sont respectées au niveau attendu.

### 11.2 Dossier réparation

- Un utilisateur autorisé peut créer une réparation sans devis.
- Le dossier affiche client, appareil, panne, statut, historique et photos d'entrée.
- Le dossier affiche les documents, paiements, devis et factures liés.
- Le dossier fournit un lien ou QR code de suivi.
- Le dossier reste exploitable après changement de statut.

### 11.3 Mode comptoir

- Un utilisateur accueil peut créer client et réparation rapidement.
- Le devis reste optionnel.
- Une facture directe peut être créée si les conditions métier sont valides.
- Le QR code est généré ou accessible.
- La fiche dépôt ou document associé peut être ouvert ou téléchargé.

### 11.4 Mode atelier

- Un technicien peut voir les réparations à traiter.
- Un technicien peut changer un statut autorisé.
- Un technicien peut ajouter notes, photos ou pièces selon permission.
- Les photos d'entrée sont visibles.
- Les données sensibles restent masquées si la permission manque.

### 11.5 Suivi client

- Un lien public ouvre la bonne réparation.
- Le client voit uniquement les informations publiques.
- Les documents publics sont ouvrables.
- Le QR code pointe vers le bon lien.
- Un token invalide affiche un état clair sans fuite de données.

### 11.6 Devis

- Un devis peut être créé depuis un dossier ou un client.
- Un devis peut être ouvert ou téléchargé.
- Un devis peut être accepté ou refusé si le flow public est activé.
- Un devis accepté peut être converti en facture.
- Aucun devis ne révèle prix d'achat, marge, fournisseur ou stock interne.

### 11.7 Factures et paiements

- Une facture directe peut être créée sans devis.
- Une facture depuis devis accepté fonctionne.
- Le document facture s'ouvre et se télécharge.
- Un paiement total ou partiel met à jour le solde.
- Le reçu s'ouvre ou se télécharge si disponible.
- La devise affichée correspond au contexte.

### 11.8 Stock

- Un utilisateur autorisé peut consulter le stock.
- Une pièce peut être associée à une réparation.
- Les seuils ou alertes stock sont visibles si prévus.
- Les prix d'achat, marges et fournisseurs sont masqués sans permission.
- Aucune information stock interne n'apparaît dans un document client.

### 11.9 Rôles et permissions

- Un administrateur peut gérer les rôles et permissions.
- Un technicien ne voit pas les paramètres sensibles par défaut.
- Un accueil ne voit pas les données de marge par défaut.
- Un stagiaire ne peut pas supprimer ni exporter.
- Un accès direct à une route interdite est bloqué ou affiche une permission requise.

### 11.10 France / Suisse

- Un atelier France peut émettre des documents en EUR.
- Un atelier Suisse peut émettre des documents en CHF.
- Les validations documentaires sont conditionnées par pays.
- Une règle française ne bloque pas une facture suisse.
- La devise documentaire reste cohérente après création.

## 12. Plan de tests global

### 12.1 Tests smoke

- L'application démarre.
- La page dashboard est accessible après activation ou session valide.
- Aucune erreur console critique sur les routes principales.
- Les routes publiques de suivi et documents chargent avec token valide.

### 12.2 Tests responsive

Viewports minimum:

- Desktop: 1440 x 900.
- Tablette: 1024 x 768.
- Mobile: 390 x 844.

Vérifier:

- Pas d'élément important hors écran.
- Pas de texte coupé dans les actions principales.
- Navigation utilisable.
- Documents et QR code accessibles.
- Mode comptoir utilisable sur tablette.

### 12.3 Tests dossier réparation

- Créer une réparation sans devis.
- Ajouter photos d'entrée.
- Vérifier affichage photos dans le dossier.
- Changer statut plusieurs fois.
- Vérifier historique.
- Générer lien ou QR code.
- Ouvrir suivi client.

### 12.4 Tests comptoir

- Créer client.
- Créer réparation.
- Créer rendez-vous.
- Créer facture directe sans devis.
- Encaisser paiement.
- Ouvrir ou télécharger document.
- Vérifier absence de données internes dans le document.

### 12.5 Tests atelier

- Connexion technicien.
- Voir liste ou Kanban.
- Filtrer par statut.
- Ouvrir dossier.
- Ajouter note technique.
- Ajouter ou consulter photo.
- Associer pièce.
- Marquer prêt.
- Vérifier mise à jour suivi client.

### 12.6 Tests devis

- Créer devis depuis réparation.
- Ouvrir PDF devis.
- Télécharger PDF devis.
- Accepter devis via lien public si disponible.
- Refuser devis via lien public si disponible.
- Convertir devis accepté en facture.
- Vérifier qu'une réparation sans devis reste valide.

### 12.7 Tests factures

- Créer facture depuis devis.
- Créer facture directe sans devis.
- Ouvrir facture.
- Télécharger facture.
- Vérifier devise EUR en contexte France.
- Vérifier devise CHF en contexte Suisse.
- Vérifier qu'une validation française ne bloque pas la Suisse.
- Vérifier absence de prix d'achat, marge, fournisseur, stock interne.

### 12.8 Tests paiements

- Enregistrer paiement total.
- Enregistrer paiement partiel.
- Vérifier solde restant.
- Générer ou ouvrir reçu.
- Tester plusieurs moyens de paiement.
- Vérifier cohérence de l'historique.

### 12.9 Tests stock

- Consulter stock avec rôle autorisé.
- Tester masquage prix achat, marge, fournisseur selon rôle.
- Associer pièce à réparation.
- Vérifier décrément ou statut stock si le flow l'implémente.
- Vérifier qu'aucun stock interne n'apparaît dans les documents client.

### 12.10 Tests permissions

- Tester admin.
- Tester technicien.
- Tester accueil.
- Tester stagiaire ou rôle limité.
- Tester accès direct URL à une page interdite.
- Tester suppression sans permission.
- Tester export sans permission.
- Tester documents publics sans session.

### 12.11 Tests suivi client

- Ouvrir lien valide.
- Ouvrir QR code valide.
- Ouvrir token invalide.
- Vérifier statut public.
- Vérifier documents publics.
- Vérifier absence de données internes.
- Vérifier acceptation ou refus devis si activé.

### 12.12 Tests non-régression obligatoires avant livraison

- Création réparation sans devis.
- Facture directe sans devis.
- Documents ouverts et téléchargés.
- Suivi client par lien et QR code.
- Photos d'entrée visibles.
- France EUR.
- Suisse CHF.
- Permissions sensibles.
- Aucun prix d'achat, marge, fournisseur ou stock interne dans les documents client.
- Aucun flow précédemment validé cassé.

## 13. Priorisation MVP

### 13.1 P0 - Indispensable

- Dossier unique réparation.
- Mode comptoir.
- Mode atelier.
- Suivi client lien ou QR code.
- Clients.
- Réparations.
- Devis optionnels.
- Factures directes.
- Paiements.
- Documents PDF ouvrables et téléchargeables.
- Photos d'entrée visibles.
- Stock basique.
- Rôles et permissions.
- France / Suisse.
- EUR / CHF.
- Fonctionnement local-first/mock.

### 13.2 P1 - Important

- Calendrier rendez-vous complet.
- Conversion rendez-vous vers réparation.
- Historique détaillé des événements.
- Documents avancés.
- Alertes stock.
- Filtres atelier avancés.
- Reçus détaillés.

### 13.3 P2 - Plus tard

- API bancaire réelle.
- SMS réels.
- Synchronisation cloud complète.
- Multi-boutique avancé.
- Automatisations avancées.
- Analytics avancés.
- IA d'aide au prix ou diagnostic.

## 14. Définition de terminé

Une mission produit ou développement est terminée uniquement si:

- Le flow demandé fonctionne réellement.
- Les règles métier obligatoires sont respectées.
- Les permissions sont respectées.
- Les documents concernés s'ouvrent ou se téléchargent.
- Le responsive minimal est vérifié.
- Les données sensibles ne fuient pas.
- Les tests ou vérifications adaptés ont été exécutés.
- Les flows déjà validés ne sont pas cassés.

