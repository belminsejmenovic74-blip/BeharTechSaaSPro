# Stripe Connect — demandes de paiement externes

Cette intégration est isolée du système d’abonnement Behar Tech Pro. Elle utilise ses propres routes sous `/api/external-payments`, ses propres tables `external_payment_*` et le secret serveur `STRIPE_CONNECT_SECRET_KEY`. Aucun webhook ou secret d’abonnement ne doit être réutilisé dans ces routes.

## Configuration Connect Standard

1. Activer Stripe Connect dans le Dashboard de la plateforme.
2. Dans les réglages OAuth Connect, autoriser la connexion de comptes Standard.
3. Copier le Client ID Connect de sandbox ou de production dans `STRIPE_CONNECT_CLIENT_ID`.
4. Déclarer chaque URL de redirection autorisée, à l’octet près :
   - production : `https://app.behartechpro.fr/api/external-payments/oauth/callback/stripe` ;
   - Preview Vercel : la même route sur le domaine stable de préproduction ;
   - développement : une origine HTTPS locale ou un tunnel HTTPS vers la même route.
5. Renseigner l’URL active dans `STRIPE_CONNECT_REDIRECT_URI`.
6. Renseigner la clé secrète Stripe du même mode dans `STRIPE_CONNECT_SECRET_KEY`.

Le Client ID et la clé secrète doivent tous deux appartenir au même mode Stripe. Les identifiants sandbox ne doivent jamais être mélangés aux identifiants live.

## Flux financier

La Checkout Session est créée avec l’en-tête `Stripe-Account` du réparateur. Il s’agit d’une direct charge : l’objet financier et les fonds appartiennent au compte connecté. La requête ne contient ni `transfer_data`, ni destination charge, ni `application_fee`. Behar Tech Pro ne relit pas la Session et ne reçoit aucun webhook marchand.

`mode=payment` est imposé. Le code ne crée pas de Customer, n’ajoute pas `setup_future_usage` et ne propose ni abonnement ni moyen de paiement récurrent.

## Moyens de paiement

- Boutique en EUR : `card` et `link`. Checkout peut présenter Apple Pay et Google Pay via le paiement carte lorsque Stripe, le compte connecté, le navigateur et l’appareil les rendent disponibles.
- Boutique en CHF : `card` et `twint`. Toutes les lignes sont exprimées en CHF.

La liste est fournie explicitement à Checkout. Klarna, Alma, Affirm, Afterpay/Clearpay et les autres moyens différés ne sont donc pas activés par cette intégration.

Pour TWINT :

1. ouvrir **Settings → Payment methods → Connected accounts** dans Stripe ;
2. activer TWINT pour les comptes connectés éligibles, ou laisser chaque compte Standard l’activer dans son Dashboard ;
3. vérifier que le compte connecté dispose des capacités nécessaires ;
4. tester une facture CHF en sandbox et sélectionner TWINT sur la page Checkout ;
5. ne pas ajouter TWINT aux factures EUR.

## Variables Vercel

Configurer séparément Development, Preview et Production :

```text
STRIPE_CONNECT_CLIENT_ID=
STRIPE_CONNECT_SECRET_KEY=
STRIPE_CONNECT_REDIRECT_URI=
PAYMENT_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
```

Les secrets ne doivent jamais utiliser le préfixe `NEXT_PUBLIC_`. Après modification, redéployer l’application afin que les routes serveur reçoivent les nouvelles valeurs.

## Vérification avant production

1. Appliquer `supabase/migrations/20260714110000_external_payment_requests.sql`.
2. Connecter un compte Standard de sandbox depuis **Paramètres → Intégrations → Paiements externes**.
3. Créer une facture EUR et vérifier que Checkout ne propose que la carte et les wallets éligibles.
4. Créer une facture CHF et vérifier la présence de TWINT.
5. Vérifier dans le Dashboard du compte connecté que la Session lui appartient.
6. Vérifier dans Supabase que seule une demande technique est créée et qu’aucune facture, transaction ou donnée de règlement n’est mise à jour.
7. Ne configurer aucun webhook marchand pour cette intégration.
