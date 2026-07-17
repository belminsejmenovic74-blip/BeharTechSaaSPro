# Mollie Connect — demandes de paiement externes

## Architecture retenue

Behar Tech Pro utilise Mollie Connect en mode plateforme OAuth. Chaque réparateur autorise l’application à agir sur sa
propre organisation Mollie et son propre profil. La requête `POST /v2/payments` est authentifiée avec le jeton OAuth du
réparateur et contient son `profileId` : les fonds appartiennent donc directement à son compte Mollie.

L’intégration n’envoie jamais `applicationFee`, `routing`, split payment ou resell pricing. Elle ne consulte aucun
résultat financier et n’installe aucun webhook.

Documentation officielle :

- [Mollie Connect](https://docs.mollie.com/docs/connect-overview)
- [Implémenter OAuth](https://docs.mollie.com/docs/implementing-oauth)
- [Onboarding des clients](https://docs.mollie.com/docs/connect-platforms-onboarding-customers)
- [Créer un paiement](https://docs.mollie.com/reference/create-payment)
- [Idempotence](https://docs.mollie.com/reference/api-idempotency)

## Créer l’application OAuth

1. Créer ou utiliser le compte partenaire Behar Tech Pro dans Mollie.
2. Ouvrir **More → Developers → Your apps → Create Application**.
3. Activer le co-branded onboarding si Mollie l’a rendu disponible pour le compte partenaire.
4. Déclarer une redirect URL exacte par environnement :
   - production : `https://app.behartechpro.fr/api/external-payments/oauth/callback/mollie` ;
   - preview : la même route sur le domaine Vercel stable autorisé ;
   - développement : une origine HTTPS autorisée par Mollie.
5. Copier le Client ID `app_…` et le Client Secret dans Vercel.

L’application demande seulement `organizations.read`, `profiles.read`, `onboarding.read` et `payments.write`. Ne jamais
ajouter `payments.read`, `refunds.*`, `chargebacks.*`, `settlements.*`, `balances.*`, `invoices.*`, `customers.*`,
`mandates.*` ou `subscriptions.*`. Toute modification des scopes oblige le marchand à reconnecter l’application.

Le `state` OAuth est aléatoire, haché en base, limité à dix minutes puis consommé atomiquement une seule fois avant
l’échange du code. Les access et refresh tokens sont chiffrés AES-256-GCM. Le refresh token est révoqué lors de la
déconnexion et sa rotation éventuelle est enregistrée chiffrée.

## Onboarding et profils

Le même écran OAuth permet à un réparateur de connecter un compte existant. Si son organisation ou son profil nécessite
encore des informations, **Terminer la vérification** ouvre le lien de dashboard renvoyé par
`GET /v2/onboarding/me`. Le statut d’onboarding est traité transitoirement et n’est pas stocké.

Après vérification, ce bouton recharge les profils et associe le premier profil disponible à la boutique active. Le
profil reste isolé par `workshop_id`, `shop_id` et `provider`.

## Demande hébergée

Depuis une facture finalisée, Behar Tech Pro envoie uniquement le total TTC exact, EUR ou CHF, la référence de facture,
le `profileId`, une redirect URL générique, `sequenceType: oneoff`, `captureMode: automatic` et une clé d’idempotence.
`testmode: true` est envoyé uniquement lorsque `MOLLIE_ENVIRONMENT=test`.

La liste `method` autorise `creditcard` et `applepay`. Google Pay est présenté automatiquement par le Hosted Checkout
Mollie dans le parcours carte lorsqu’il est actif sur le profil. Pour l’EUR uniquement, `paybybank` est aussi autorisé
comme virement immédiat ou quasi immédiat. Le virement SEPA classique `banktransfer`, qui peut prendre plusieurs jours,
n’est pas activé. Pour le CHF, seuls les moyens compatibles avec la devise restent proposés.

Les méthodes différées ou de crédit (`klarna`, `alma`, `riverty`, `billie`, `in3`) sont absentes. Aucun customer,
mandat, carte enregistrée, abonnement, capture différée, application fee ou routing n’est envoyé.

La réponse est réduite immédiatement à l’ID technique et `_links.checkout.href`. Behar Tech Pro ne relit jamais le
paiement et n’appelle jamais Payments Get/List, Refunds, Chargebacks, Settlements, Balances ou Mollie Invoices.

## Environnement de test et Vercel

```dotenv
MOLLIE_CLIENT_ID=
MOLLIE_CLIENT_SECRET=
MOLLIE_REDIRECT_URI=https://app.example.com/api/external-payments/oauth/callback/mollie
MOLLIE_ENVIRONMENT=test
PAYMENT_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=https://app.example.com
```

Ajouter ces variables aux environnements Vercel Production, Preview et Development appropriés. Aucun secret ne doit
porter le préfixe `NEXT_PUBLIC_`. Utiliser `MOLLIE_ENVIRONMENT=live` uniquement après validation de l’application,
vérification des organisations et activation des profils/moyens de paiement.

En test, connecter une organisation Mollie, vérifier l’isolation de deux boutiques, créer une demande EUR puis CHF et
contrôler uniquement dans Mollie que le profil ciblé est correct. Ne jamais importer le résultat dans Behar Tech Pro.
