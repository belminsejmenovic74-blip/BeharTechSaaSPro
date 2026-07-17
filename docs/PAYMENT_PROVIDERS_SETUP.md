# Configuration Stripe Connect, SumUp, PayPal, Square, Revolut Business et Mollie

## Pré-requis

Déployer d’abord la migration `supabase/migrations/20260714110000_external_payment_requests.sql`. Vérifier que les tables `shops`, `invoices`, `repairs`, `organization_members` et les fonctions privées d’autorisation du projet sont déjà présentes.

Les secrets restent exclusivement dans les variables serveur Vercel. Aucun secret ou jeton ne doit utiliser le préfixe `NEXT_PUBLIC_`.

Générer la clé de chiffrement avec, par exemple :

```bash
openssl rand -base64 32
```

## Stripe Connect

Documentation officielle : [OAuth comptes Standard](https://docs.stripe.com/connect/oauth-standard-accounts), [référence OAuth](https://docs.stripe.com/connect/oauth-reference), [direct charges](https://docs.stripe.com/connect/direct-charges).

1. Dans le Dashboard Stripe de la plateforme, activer Connect.
2. Ouvrir les réglages Connect OAuth et autoriser l’onboarding OAuth de comptes Standard.
3. Copier le Client ID Connect (`ca_...`) dans `STRIPE_CONNECT_CLIENT_ID`.
4. Déclarer exactement l’URL de retour :
   - production : `https://app.behartechpro.fr/api/external-payments/oauth/callback/stripe` ;
   - préproduction : la même route sur le domaine de préproduction ;
   - local : une URL HTTPS de tunnel vers la même route.
5. Renseigner cette URL à l’identique dans `STRIPE_CONNECT_REDIRECT_URI`.
6. Renseigner la clé secrète réservée à Connect dans `STRIPE_CONNECT_SECRET_KEY`.
7. Répéter la configuration en mode test avec les identifiants test pour la sandbox.

La création d’une Checkout Session utilise `Stripe-Account` avec l’identifiant du compte Standard connecté. C’est une direct charge. Le code n’envoie ni `transfer_data`, ni destination charge, ni `application_fee_amount`, ni `application_fee_percent`.

La clé Stripe Connect doit rester dans le namespace de déploiement de cette intégration. Ne pas remplacer ni réutiliser à l’aveugle les secrets ou webhooks employés par les abonnements Behar Tech Pro.

## SumUp OAuth et Hosted Checkout

Documentation officielle : [OAuth 2.0](https://developer.sumup.com/tools/authorization/oauth), [création de Checkout](https://developer.sumup.com/api/checkouts/create), [Hosted Checkout](https://developer.sumup.com/online-payments/checkouts).

1. Créer une application dans le portail développeur SumUp.
2. Copier l’identifiant et le secret dans `SUMUP_CLIENT_ID` et `SUMUP_CLIENT_SECRET`.
3. Déclarer exactement l’URL de retour :
   - production : `https://app.behartechpro.fr/api/external-payments/oauth/callback/sumup` ;
   - préproduction et local : la même route sur chaque origine HTTPS autorisée.
4. Renseigner cette valeur dans `SUMUP_REDIRECT_URI`.
5. Demander à SumUp la validation manuelle du scope `payments`. Sans cette validation, l’application ne peut pas créer de Checkout.
6. L’application demande seulement `payments user.profile_readonly readers.write`. Ne pas ajouter `transactions.history`, les scopes de versement, de remboursement, de reçus ou `payment_instruments`.
7. Configurer un marchand sandbox SumUp et tester la création du Hosted Checkout sans saisir ni confirmer de transaction réelle.

La requête Hosted Checkout contient le `merchant_code` du réparateur et `hosted_checkout.enabled=true`. Elle ne contient pas de `return_url` backend. Le champ financier `status` éventuellement présent dans la réponse est ignoré.

## Affiliate Key et SumUp Solo

Documentation officielle : [Cloud API](https://developer.sumup.com/terminal-payments/cloud-api), [Reader Checkout](https://developer.sumup.com/api/readers/create).

1. Créer une Affiliate Key depuis le portail SumUp et la renseigner dans `SUMUP_AFFILIATE_KEY`.
2. Obtenir les scopes/permissions SumUp nécessaires aux readers (`readers.write` et autorisation de création de Reader Checkout).
3. Utiliser un Virtual Solo avec un marchand sandbox avant tout matériel physique.
4. Conserver `SUMUP_TERMINAL_DISPATCH_ENABLED=false` dans tous les environnements de production.
5. N’activer la valeur `true` qu’après validation juridique explicite de l’usage Cloud API/POS.

Le code n’envoie aucune `return_url` de terminal, ignore l’identifiant de transaction renvoyé et ne consulte jamais le statut du reader après transmission.

## Variables Vercel

Ajouter aux environnements Production, Preview et Development selon les comptes correspondants :

```text
STRIPE_CONNECT_CLIENT_ID=
STRIPE_CONNECT_SECRET_KEY=
STRIPE_CONNECT_REDIRECT_URI=
SUMUP_CLIENT_ID=
SUMUP_CLIENT_SECRET=
SUMUP_REDIRECT_URI=
SUMUP_AFFILIATE_KEY=
SUMUP_ENVIRONMENT=sandbox
SUMUP_TERMINAL_DISPATCH_ENABLED=false

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PARTNER_ID=
PAYPAL_BN_CODE=
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_RETURN_URL=https://app.example.com/api/external-payments/paypal/return

SQUARE_APPLICATION_ID=
SQUARE_APPLICATION_SECRET=
SQUARE_REDIRECT_URI=https://app.example.com/api/external-payments/oauth/callback/square
SQUARE_ENVIRONMENT=sandbox

REVOLUT_ENVIRONMENT=sandbox
REVOLUT_API_VERSION=2026-04-20

MOLLIE_CLIENT_ID=
MOLLIE_CLIENT_SECRET=
MOLLIE_REDIRECT_URI=https://app.example.com/api/external-payments/oauth/callback/mollie
MOLLIE_ENVIRONMENT=test
PAYMENT_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
```

Les variables Supabase serveur déjà requises restent nécessaires : `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

## Mise en production

1. Appliquer la migration Supabase et contrôler les politiques RLS.
2. Déployer les variables Vercel sans valeur dans le dépôt.
3. Vérifier les redirect URLs exactes en production chez Stripe, SumUp, PayPal et Square, puis l’environnement Merchant API Revolut.
4. Connecter un compte marchand de test depuis Paramètres → Intégrations & paiements.
5. Finaliser une facture de test, créer un lien et vérifier qu’il appartient bien au compte marchand connecté.
6. Vérifier dans la base que seule une ligne technique `external_payment_requests` est créée et qu’aucune ligne `payments` ni statut de facture n’est modifié.
7. Ne configurer aucun webhook de résultat marchand.
8. Passer aux identifiants live uniquement après validation des comptes Connect et du scope SumUp `payments`.

Le guide détaillé Square se trouve dans [SQUARE_SETUP.md](./SQUARE_SETUP.md).
Le guide détaillé Revolut se trouve dans [REVOLUT_BUSINESS_SETUP.md](./REVOLUT_BUSINESS_SETUP.md).
Le guide détaillé Mollie se trouve dans [MOLLIE_CONNECT_SETUP.md](./MOLLIE_CONNECT_SETUP.md).
