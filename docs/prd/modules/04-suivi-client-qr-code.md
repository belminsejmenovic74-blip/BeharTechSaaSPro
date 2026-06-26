# Mini-PRD - Suivi client QR code

## Objectif du module

Permettre au client final de suivre l'avancement de sa réparation via un lien public ou un QR code, sans appeler l'atelier et sans accéder aux données internes.

## Utilisateurs concernés

- Client final.
- Accueil / comptoir.
- Gérant.
- Technicien indirectement via les statuts atelier.

## Problèmes à résoudre

- Trop d'appels clients pour connaître l'avancement.
- Client incertain sur le statut de son appareil.
- Documents difficiles à retrouver.
- Risque d'exposer des données internes via lien public.
- QR code non généré ou non relié au bon dossier.

## Parcours utilisateur

### Remise du QR code

1. L'accueil crée ou ouvre une réparation.
2. Le système génère un token public.
3. Le système affiche le lien de suivi et le QR code.
4. L'accueil montre, imprime ou partage le QR code au client.

### Consultation client

1. Le client scanne le QR code ou ouvre le lien.
2. La page publique charge le dossier lié au token.
3. Le client voit le statut public, l'appareil et les prochaines étapes.
4. Le client ouvre les documents publics disponibles.
5. Le client accepte ou refuse un devis si cette action est disponible.

## Composants / écrans

- Modal QR code.
- Bouton copier le lien.
- Page publique de suivi.
- Bloc statut réparation.
- Bloc appareil.
- Bloc étapes ou historique public.
- Liste documents publics.
- Actions devis: accepter, refuser si activées.
- Etat token invalide.

## Données nécessaires

- Token public unique.
- URL publique.
- Identifiant réparation.
- Statut public.
- Libellé appareil.
- Client: prénom/nom ou information minimale.
- Documents publics disponibles.
- Devis public si disponible.
- Dates utiles: dépôt, mise à jour, disponibilité.
- Message public optionnel.

## Règles métier

- Le token doit donner accès uniquement au dossier concerné.
- Le lien et le QR code doivent fonctionner en local/demo.
- La page publique ne doit jamais afficher prix d'achat, marge, fournisseur ou stock interne.
- Les notes techniques internes ne doivent pas être publiques.
- Les statuts visibles doivent être compréhensibles par un client.
- Un devis peut être accepté ou refusé depuis le lien si le flow est activé.
- Un devis n'est pas obligatoire pour que le suivi fonctionne.
- Les documents publics doivent être ouvrables ou téléchargeables.

## Cas limites / erreurs à gérer

- Token invalide.
- Token absent.
- Réparation introuvable.
- Réparation annulée.
- Aucun document disponible.
- Devis déjà accepté ou refusé.
- QR code impossible à générer.
- Lien copié invalide.
- Données locales non synchronisées.
- Client ouvre le lien sur mobile avec connexion lente.

## Critères d'acceptation

- Chaque réparation peut disposer d'un lien public.
- Le QR code pointe vers le bon lien.
- Le client peut ouvrir le suivi sans compte.
- Le suivi affiche uniquement des données publiques.
- Les documents publics peuvent être ouverts.
- Un token invalide ne révèle aucune donnée.
- Les statuts mis à jour côté atelier se reflètent sur le suivi.
- Le suivi fonctionne sur mobile.

## Tests obligatoires

- Générer un lien depuis une réparation.
- Générer un QR code et vérifier son URL.
- Ouvrir la page publique avec token valide.
- Ouvrir la page publique avec token invalide.
- Changer le statut atelier et vérifier le statut public.
- Ouvrir un document public depuis le suivi.
- Vérifier qu'un dossier sans devis reste consultable.
- Accepter ou refuser un devis si disponible.
- Vérifier absence de données internes.
- Tester le rendu mobile.

