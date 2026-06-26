# User Flows - Behar Tech Pro

Objectif: décrire les parcours utilisateur de bout en bout pour éviter les écrans cassés, les actions isolées et les modules non reliés.

Ces flows doivent être utilisés comme référence par les développeurs et les IA de développement. Chaque flow doit rester compatible avec les règles métier obligatoires de Behar Tech Pro.

## 1. Comptoir: arrivée client -> prise en charge -> photos -> signature -> création dossier

### Point de départ

Un client arrive au comptoir avec un appareil à réparer.

### Étapes

1. L'utilisateur ouvre le mode comptoir.
2. Il recherche le client par nom, téléphone ou email.
3. Si le client n'existe pas, il crée une fiche client rapide.
4. Il crée ou sélectionne l'appareil du client.
5. Il renseigne le problème déclaré.
6. Il renseigne l'état d'entrée de l'appareil.
7. Il ajoute les accessoires déposés si nécessaire.
8. Il prend ou ajoute les photos d'entrée.
9. Il fait signer le client si le flow de signature est activé.
10. Il crée le dossier réparation.
11. Le système génère un identifiant de dossier.
12. Le système génère un lien de suivi et un QR code.
13. L'utilisateur ouvre ou télécharge la fiche de dépôt.
14. Le dossier apparaît dans les réparations et dans le mode atelier.

### Conditions

- L'utilisateur doit avoir le droit de créer un client et une réparation.
- Le dossier doit contenir au minimum un client, un appareil ou une description d'appareil, et un problème déclaré.
- Le devis n'est pas obligatoire.
- La signature n'est obligatoire que si une règle métier explicite l'exige.
- Les photos d'entrée doivent être liées au dossier si elles sont prises.

### Exceptions

- Si le client existe déjà, l'utilisateur doit le sélectionner au lieu de créer un doublon.
- Si les photos ne peuvent pas être ajoutées, le dossier peut être créé avec un état clair "photos absentes".
- Si la signature échoue, le dossier peut continuer sauf si la signature est obligatoire dans le contexte.
- Si le QR code ne peut pas être généré, le lien de suivi doit rester disponible ou une erreur claire doit être affichée.

### Résultat attendu

- Un dossier réparation unique est créé.
- Les photos d'entrée sont accessibles depuis le dossier.
- La signature est liée au dossier ou au document concerné si elle existe.
- Le lien de suivi et le QR code ouvrent le bon suivi client.
- La fiche de dépôt peut être ouverte ou téléchargée.

### Erreurs à éviter

- Bloquer la création du dossier parce qu'aucun devis n'existe.
- Créer un dossier sans appareil ni problème déclaré.
- Perdre les photos après création.
- Créer un QR code qui pointe vers un autre dossier.
- Afficher marge, prix d'achat, fournisseur ou stock interne sur la fiche remise au client.
- Rendre la signature obligatoire sans règle métier explicite.

## 2. Atelier: dossier reçu -> diagnostic -> intervention -> statut -> document -> clôture

### Point de départ

Un dossier créé au comptoir arrive dans le mode atelier.

### Étapes

1. Le technicien ouvre le mode atelier.
2. Il consulte les dossiers à traiter.
3. Il ouvre le dossier reçu.
4. Il vérifie le client, l'appareil, le problème déclaré, les photos et l'état d'entrée.
5. Il passe le dossier en statut diagnostic.
6. Il ajoute une note technique interne.
7. Il décide de l'intervention à faire.
8. Il associe une pièce stock si nécessaire.
9. Il passe le dossier en statut en réparation.
10. Il réalise ou marque l'intervention.
11. Il passe le dossier en statut prêt, attente client, attente pièce ou terminé selon le cas.
12. Il génère ou ouvre le document utile: fiche intervention, devis, facture ou reçu.
13. Le dossier est clôturé lorsque la réparation est livrée et les paiements sont cohérents.

### Conditions

- Le technicien doit avoir le droit de voir et modifier les réparations.
- Les notes techniques sont internes par défaut.
- Les statuts doivent être historisés.
- Le stock ne se décrémente que sur un événement métier validé.
- La clôture ne doit pas supprimer les documents, paiements, photos ou historiques.

### Exceptions

- Si une pièce est indisponible, le dossier passe en attente pièce.
- Si l'accord client est nécessaire, le dossier passe en attente client.
- Si le diagnostic impose un devis, l'utilisateur peut créer un devis, mais la réparation reste valide sans devis.
- Si le document ne s'ouvre pas, l'utilisateur doit voir une erreur claire et pouvoir réessayer.

### Résultat attendu

- Le dossier contient un historique clair des statuts.
- Le diagnostic et les notes techniques sont conservés.
- Les photos d'entrée restent visibles.
- Les documents liés sont accessibles depuis le dossier.
- Le suivi client affiche un statut public cohérent.

### Erreurs à éviter

- Exposer les notes techniques internes au client.
- Décrémenter le stock à la simple consultation d'une pièce.
- Bloquer l'atelier parce qu'aucune facture ou aucun devis n'existe.
- Casser le lien de suivi après changement de statut.
- Perdre les documents ou photos à la clôture.

## 3. Réparation simple sans devis

### Point de départ

Une réparation simple est prise en charge et ne nécessite pas de devis.

### Étapes

1. L'utilisateur crée une réparation depuis le comptoir ou le module réparations.
2. Il renseigne client, appareil, panne, état d'entrée et photos si disponibles.
3. Il crée le dossier sans devis.
4. Le technicien réalise le diagnostic rapide.
5. Le technicien effectue l'intervention.
6. L'utilisateur crée une facture directe si le client doit payer.
7. L'utilisateur encaisse ou marque le paiement comme réglé.
8. L'utilisateur ouvre ou télécharge la facture ou le reçu.
9. Le dossier est marqué prêt, livré ou terminé.

### Conditions

- Le devis ne doit pas être requis.
- La facture directe doit contenir au moins une ligne valide.
- La facture doit avoir une devise.
- Le paiement doit être lié à la facture, à la réparation ou à la vente selon le cas.

### Exceptions

- Si le prix final change, l'utilisateur met à jour la facture ou crée une ligne correcte avant validation.
- Si le paiement n'est pas encore reçu, la facture peut rester en attente ou partiellement réglée.
- Si le client refuse l'intervention, le dossier reste consultable et peut être annulé sans supprimer l'historique.

### Résultat attendu

- La réparation est créée, traitée et clôturée sans devis.
- La facture directe est valide.
- Le paiement est cohérent avec le solde.
- Les documents sont ouvrables et téléchargeables.

### Erreurs à éviter

- Forcer un devis pour passer à la facture.
- Créer une facture avec des lignes vides.
- Marquer payé sans paiement ou action explicite.
- Supprimer le dossier si la réparation est annulée.
- Afficher des données internes sur la facture client.

## 4. Réparation avec devis puis facture

### Point de départ

Une réparation nécessite un accord client avant intervention.

### Étapes

1. L'utilisateur crée ou ouvre une réparation.
2. Le technicien réalise le diagnostic.
3. L'utilisateur crée un devis depuis le dossier.
4. Il ajoute les lignes du devis.
5. Il vérifie la devise et le contexte pays.
6. Il génère le devis.
7. Il ouvre, télécharge ou partage le devis au client.
8. Le client ou l'utilisateur accepte le devis par une action explicite.
9. Le dossier passe en attente intervention ou en réparation.
10. Le technicien réalise l'intervention.
11. L'utilisateur convertit le devis accepté en facture.
12. Il vérifie les lignes, la devise, les taxes et le total.
13. Il encaisse ou marque le paiement comme réglé.
14. Il ouvre ou télécharge la facture et le reçu.
15. Le dossier est clôturé.

### Conditions

- Le devis doit contenir au moins une ligne valide.
- Le devis accepté peut être converti en facture.
- Le refus du devis ne doit pas supprimer la réparation.
- La facture doit contenir des lignes valides.
- Les documents client ne doivent jamais afficher marge, prix d'achat, fournisseur ou stock interne.

### Exceptions

- Si le devis est refusé, le dossier reste consultable et peut passer en annulé ou attente client.
- Si le devis est modifié après acceptation, une nouvelle validation ou version doit être gérée selon le produit.
- Si la facture ne peut pas être générée, le dossier et le devis accepté restent disponibles.
- Si la devise est absente, la facture ne doit pas être validée.

### Résultat attendu

- Le devis est créé, accepté et lié au dossier.
- La facture issue du devis reprend les informations utiles.
- La facture peut être ouverte et téléchargée.
- Le paiement met à jour le solde.
- Le dossier conserve devis, facture, paiement, photos et historique.

### Erreurs à éviter

- Convertir un devis refusé en facture automatiquement.
- Créer une facture avec des lignes vides.
- Perdre les photos ou notes du dossier après conversion.
- Changer silencieusement la devise entre devis et facture.
- Exposer prix d'achat, marge, fournisseur ou stock interne.

## 5. Suivi client via QR code / lien

### Point de départ

Un client reçoit un QR code ou un lien de suivi pour sa réparation.

### Étapes

1. L'utilisateur ouvre le dossier réparation.
2. Il affiche le lien de suivi ou le QR code.
3. Le client scanne le QR code ou ouvre le lien.
4. La page publique charge le dossier lié au token.
5. Le client consulte le statut public.
6. Le client consulte les informations autorisées sur l'appareil et la réparation.
7. Le client ouvre ou télécharge les documents publics disponibles.
8. Si un devis est disponible, le client peut l'accepter ou le refuser si le flow est activé.
9. Quand le statut atelier change, le suivi client reflète le statut public.

### Conditions

- Le token public doit être unique et non devinable.
- Le QR code doit pointer vers le bon lien.
- Le lien doit ouvrir le bon dossier.
- Le suivi doit fonctionner même sans devis.
- Les données internes doivent être filtrées avant affichage public.

### Exceptions

- Si le token est invalide, afficher une erreur sans données.
- Si aucun document n'est disponible, afficher un état vide clair.
- Si le devis a déjà été accepté ou refusé, ne pas reproposer une action contradictoire.
- Si la réparation est annulée, afficher un statut public clair.

### Résultat attendu

- Le client voit uniquement son dossier.
- Le statut public est clair.
- Les documents publics sont ouvrables et téléchargeables.
- Les actions publiques ne modifient que le dossier lié au token.

### Erreurs à éviter

- Faire ouvrir le QR code sur un mauvais dossier.
- Afficher des notes techniques internes.
- Afficher marge, prix d'achat, fournisseur ou stock interne.
- Bloquer le suivi parce qu'aucun devis n'existe.
- Révéler des données quand le token est invalide.

## 6. Téléchargement / ouverture document

### Point de départ

Un utilisateur ou client veut ouvrir ou télécharger un document lié à une réparation, un devis, une facture ou un paiement.

### Étapes

1. L'utilisateur arrive depuis un dossier, une liste, une facture, un devis, un paiement ou un suivi public.
2. Il clique sur ouvrir, télécharger ou imprimer.
3. Le système récupère le document ou le génère depuis les données valides.
4. Le système filtre les données interdites pour les documents client.
5. Le document s'ouvre dans une page, une prévisualisation ou un nouvel onglet.
6. Le téléchargement produit un fichier exploitable.
7. L'utilisateur revient à l'écran source sans perdre le contexte.

### Conditions

- Le document doit être lié à une source connue.
- Les documents client doivent être filtrés.
- La devise et le pays doivent être connus pour les documents financiers.
- L'ouverture et le téléchargement doivent fonctionner depuis tous les écrans qui référencent le document.
- Le mode local/mock doit permettre la génération ou l'accès document.

### Exceptions

- Si le document est introuvable, afficher une erreur claire.
- Si les données minimales manquent, indiquer quoi corriger.
- Si le token public est invalide, ne rien révéler.
- Si le navigateur bloque le téléchargement, proposer l'ouverture ou une relance.

### Résultat attendu

- Le document s'ouvre.
- Le document se télécharge.
- Le contenu respecte le pays, la devise et les permissions.
- Le contexte utilisateur n'est pas perdu.

### Erreurs à éviter

- Bouton document visible mais sans action.
- Téléchargement cassé depuis un écran secondaire.
- Générer un document client avec prix d'achat, marge, fournisseur ou stock interne.
- Bloquer un document suisse avec une validation française.
- Perdre le dossier source après ouverture.

## 7. Paiement externe / marqué réglé

### Point de départ

Un paiement a été réalisé hors du SaaS ou doit être marqué comme réglé manuellement.

### Étapes

1. L'utilisateur ouvre la facture, la réparation ou le module paiements.
2. Il choisit marquer réglé ou enregistrer paiement externe.
3. Il sélectionne le moyen de paiement: espèces, carte, virement, externe ou autre.
4. Il saisit le montant payé.
5. Il vérifie la devise.
6. Le système calcule le solde restant.
7. Le paiement est enregistré et lié à sa source.
8. Le statut passe à payé ou partiellement payé selon le montant.
9. L'utilisateur ouvre ou télécharge le reçu si nécessaire.

### Conditions

- L'utilisateur doit avoir le droit d'encaisser ou de marquer réglé.
- Le montant doit être strictement positif.
- La devise doit correspondre au contexte.
- Un paiement doit être lié à une facture, réparation ou vente.
- Un paiement supérieur au montant dû doit être bloqué sauf règle explicite.

### Exceptions

- Si le client paie partiellement, le statut doit rester partiel avec solde visible.
- Si la facture n'existe pas encore, un acompte peut être lié à la réparation.
- Si le paiement est une erreur, l'annulation ou le remboursement doit être protégé par permission.
- Si le reçu ne peut pas être généré, le paiement reste enregistré et l'erreur document est affichée.

### Résultat attendu

- Le paiement est enregistré.
- Le solde est cohérent.
- La facture ou réparation affiche le bon état de paiement.
- Le reçu peut être ouvert ou téléchargé si généré.

### Erreurs à éviter

- Marquer réglé sans montant.
- Marquer réglé sans action explicite.
- Enregistrer un paiement sans source.
- Créer un solde négatif sans règle explicite.
- Permettre un remboursement à un rôle non autorisé.

## 8. Flux France

### Point de départ

L'atelier est configuré avec le pays France.

### Étapes

1. Le gérant ouvre les paramètres atelier.
2. Il choisit France comme pays.
3. Le système propose EUR comme devise par défaut.
4. Le gérant renseigne les informations atelier nécessaires.
5. L'utilisateur crée une réparation, un devis, une facture ou un paiement.
6. Les documents financiers utilisent EUR sauf contexte document explicite différent.
7. Les validations et mentions adaptées à la France sont appliquées.
8. Les documents peuvent être ouverts et téléchargés.

### Conditions

- Le pays doit être stocké ou disponible dans le contexte atelier.
- La devise du document doit être connue.
- Les validations doivent être liées au pays France.
- Les documents déjà émis ne doivent pas être modifiés silencieusement après changement de paramètres.

### Exceptions

- Si la devise est absente, le système doit proposer EUR ou demander une correction.
- Si une information atelier manque, le document doit indiquer clairement le champ à compléter si ce champ est obligatoire.
- Si l'atelier passe ensuite en Suisse, les anciens documents France restent cohérents.

### Résultat attendu

- Les devis, factures et reçus France affichent EUR.
- Les règles France s'appliquent uniquement au contexte France.
- Les documents France restent ouvrables et téléchargeables.

### Erreurs à éviter

- Générer un document France sans devise.
- Mélanger CHF et EUR sans règle explicite.
- Modifier les anciens documents après changement de pays.
- Appliquer des règles Suisse à un document France sans contexte.

## 9. Flux Suisse

### Point de départ

L'atelier est configuré avec le pays Suisse.

### Étapes

1. Le gérant ouvre les paramètres atelier.
2. Il choisit Suisse comme pays.
3. Le système propose CHF comme devise par défaut.
4. Le gérant renseigne les informations atelier nécessaires.
5. L'utilisateur crée une réparation, un devis, une facture ou un paiement.
6. Les documents financiers utilisent CHF sauf contexte document explicite différent.
7. Les validations et mentions adaptées à la Suisse sont appliquées.
8. Les documents peuvent être ouverts et téléchargés.

### Conditions

- Le pays Suisse doit être supporté.
- La devise CHF doit être supportée.
- Les validations doivent être conditionnées par pays.
- Aucune validation strictement française ne doit bloquer une entreprise suisse.
- Les documents déjà émis ne doivent pas être modifiés silencieusement après changement de paramètres.

### Exceptions

- Si une information française est absente, elle ne doit pas bloquer un document suisse sauf règle explicitement partagée.
- Si la devise est absente, le système doit proposer CHF ou demander une correction.
- Si l'atelier passe ensuite en France, les anciens documents Suisse restent cohérents.

### Résultat attendu

- Les devis, factures et reçus Suisse affichent CHF.
- Les règles Suisse s'appliquent au contexte Suisse.
- Le flow facture directe fonctionne en Suisse.
- Les documents Suisse restent ouvrables et téléchargeables.

### Erreurs à éviter

- Bloquer une facture suisse avec une validation française.
- Forcer EUR pour un atelier Suisse.
- Supposer que toutes les entreprises sont françaises.
- Modifier les anciens documents après changement de pays.
- Cacher une erreur de devise derrière un échec générique.

## 10. Création client + appareil + réparation rapide

### Point de départ

L'utilisateur doit créer très vite un client, son appareil et une réparation.

### Étapes

1. L'utilisateur ouvre le mode comptoir ou le bouton nouvelle réparation.
2. Il saisit le téléphone du client.
3. Si aucun client ne correspond, il crée le client avec les informations minimales.
4. Il renseigne le nom du client si disponible.
5. Il sélectionne ou crée l'appareil.
6. Il renseigne type, marque et modèle si connus.
7. Il ajoute IMEI ou numéro de série si disponible.
8. Il saisit le problème déclaré.
9. Il ajoute l'état d'entrée minimum.
10. Il ajoute les photos d'entrée si possible.
11. Il valide la création.
12. Le dossier est créé et accessible immédiatement.
13. Le lien de suivi et le QR code sont disponibles.

### Conditions

- Le téléphone est l'information prioritaire mais le flow doit rester rapide.
- L'appareil peut être partiellement renseigné si la description est suffisante.
- Le problème déclaré est obligatoire.
- Le devis n'est pas obligatoire.
- Les photos sont recommandées mais ne doivent pas casser le flow si elles échouent.

### Exceptions

- Si un client existant est trouvé, proposer de le sélectionner.
- Si plusieurs clients correspondent, afficher une sélection claire.
- Si le modèle appareil est inconnu, autoriser une saisie manuelle.
- Si le dossier ne peut pas être créé, conserver les champs déjà saisis autant que possible.

### Résultat attendu

- Le client est créé ou réutilisé.
- L'appareil est créé ou lié.
- La réparation est créée sans double saisie.
- Le dossier est visible dans réparations, comptoir et atelier.
- Le suivi client est disponible.

### Erreurs à éviter

- Créer des doublons client sans avertissement.
- Bloquer la création parce que le modèle exact est absent.
- Exiger un devis.
- Perdre la saisie après une erreur.
- Créer un dossier sans problème déclaré.
- Créer un dossier non visible dans les autres modules.

