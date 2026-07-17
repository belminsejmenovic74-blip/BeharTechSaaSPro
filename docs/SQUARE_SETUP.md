# Square — demandes de paiement externes

Square est un fournisseur de l’abstraction `ExternalPaymentRequestProvider`. Le compte connecté appartient au
réparateur : chaque appel utilise son jeton vendeur et Behar Tech Pro ne reçoit aucun fonds, ne prend aucune commission
et ne synchronise aucun résultat financier.

## Créer l’application Square

1. Créer une application dans le [Square Developer Dashboard](https://developer.squareup.com/apps).
2. Dans **OAuth**, enregistrer exactement l’URL correspondant à `SQUARE_REDIRECT_URI` :
   `https://<domaine-vercel>/api/external-payments/oauth/callback/square`.
3. Renseigner l’Application ID et l’Application Secret uniquement dans les variables serveur.
4. Autoriser uniquement `MERCHANT_PROFILE_READ`, `ORDERS_READ`, `ORDERS_WRITE` et `PAYMENTS_WRITE`.

`PAYMENTS_READ` et `PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS` ne sont pas demandés. La seconde permission permettrait une
commission applicative, ce que cette intégration interdit.

Le flux Authorization Code vérifie un `state` aléatoire, haché, expirant et consommé une seule fois. Les jetons d’accès
et de renouvellement sont chiffrés avec `PAYMENT_TOKEN_ENCRYPTION_KEY`. Le renouvellement intervient avant expiration et
enregistre le nouveau refresh token lorsque Square le fait tourner.

## Sandbox Seller et établissements

Dans le Developer Dashboard, ouvrir **Sandbox test accounts**, créer ou choisir un Sandbox Seller, puis lancer le flux
OAuth avec `SQUARE_ENVIRONMENT=sandbox`. L’intégration récupère les établissements actifs du vendeur et conserve leur
identifiant technique. Vérifier que la devise de l’établissement correspond à celle de la boutique, EUR ou CHF.

Pour un lien, Behar Tech Pro appelle `CreatePaymentLink` en mode `quick_pay` avec le total TTC finalisé et le numéro de
facture. Les pourboires, la livraison, Cash App Pay et Afterpay/Clearpay sont désactivés. Aucun catalogue, abonnement,
carte enregistrée, paiement différé, application fee ou donnée client n’est envoyé.

## Square Terminal et terminal virtuel

Dans **Paramètres > Intégrations > Paiements externes > Square**, associer un Device ID à un établissement et lui donner
un nom local. La Terminal API reçoit uniquement le total TTC, la devise, le numéro de facture comme `reference_id`, le
Device ID et une clé d’idempotence.

Le Sandbox n’accepte pas de terminal physique. Utiliser un Device ID de terminal virtuel fourni par Square, par exemple
le scénario de réussite documenté `9fa747a2-25ff-48ee-b078-04381f7c828f`. En production, saisir le Device ID du terminal
Square enregistré sur le compte du réparateur.

L’application ne recherche jamais le terminal checkout après l’envoi. Elle ignore tout statut ou identifiant de
paiement éventuellement présent dans la réponse immédiate.

## Variables locales et Vercel

```dotenv
SQUARE_APPLICATION_ID=
SQUARE_APPLICATION_SECRET=
SQUARE_REDIRECT_URI=
SQUARE_ENVIRONMENT=sandbox
PAYMENT_TOKEN_ENCRYPTION_KEY=
```

Créer les mêmes variables dans **Vercel > Project > Settings > Environment Variables**. Utiliser une URL de redirection
distincte et enregistrée dans Square pour Preview si l’OAuth doit y être testé. En production, basculer
`SQUARE_ENVIRONMENT=production` et utiliser les identifiants de production correspondants. Ne jamais préfixer les secrets
avec `NEXT_PUBLIC_`.

## Frontière financière obligatoire

- Aucun webhook Square de paiement ou de terminal.
- Aucun appel `GetPayment`, `ListPayments`, `SearchTerminalCheckouts`, `RefundPayment` ou `ListRefunds`.
- Aucun `payment_id`, statut de paiement, montant encaissé, moyen de paiement, remboursement ou historique.
- Une facture n’est jamais modifiée en fonction de Square.
- Le réparateur vérifie le règlement directement dans son Dashboard Square.

Les seules données persistées sont la connexion vendeur, l’établissement, les terminaux associés et la demande
technique (`created`, `sent` ou `dispatch_error`).
