# Revolut Business — demandes externes

## Résultat de l’audit multi-marchands

La documentation Revolut distingue les OAuth proposés par certains plugins no-code et l’intégration Merchant API des
logiciels de caisse tiers. Pour le push vers Revolut Terminal, elle précise qu’**actuellement seule
l’authentification par clé API est supportée**. Aucun parcours partenaire OAuth public permettant à Behar Tech Pro de
connecter plusieurs Merchant Accounts n’est documenté.

Behar Tech Pro ne simule donc aucun OAuth. Chaque réparateur fournit sa propre Secret API Key Merchant. La clé est
envoyée par HTTPS à une route serveur, testée avec la seule liste des locations, chiffrée en AES-256-GCM avant stockage
et jamais renvoyée par l’API. Elle peut être remplacée ou supprimée depuis Paramètres.

Documentation officielle :

- [Créer et valider un Merchant Account](https://developer.revolut.com/docs/guides/merchant/get-started)
- [Merchant API actuelle](https://developer.revolut.com/docs/api/merchant)
- [Version Merchant API 2026-04-20](https://developer.revolut.com/blog/2026-04-22-merchant-api-version-2026-04-20)
- [Push payments vers Revolut Terminal](https://developer.revolut.com/docs/guides/merchant/accept-payments/in-person-payments/terminal/push-payments)
- [Hosted Checkout Page](https://developer.revolut.com/docs/guides/merchant/accept-payments/online-payments/hosted-checkout-page/api)

## Prérequis réparateur

1. Posséder un compte Revolut Business actif.
2. Ouvrir un Merchant Account et terminer la validation KYM.
3. Dans **Merchant > Merchant API**, générer une Secret API Key correspondant à l’environnement utilisé.
4. Pour le terminal, créer une location physique, affecter le Terminal à cette location et activer **Pay at Counter**.

La clé propre au réparateur ne doit être ajoutée ni à `.env`, ni à Vercel, ni au dépôt. Seule
`PAYMENT_TOKEN_ENCRYPTION_KEY`, commune au serveur, protège les secrets stockés.

## Hosted Checkout Page

Behar Tech Pro appelle uniquement `POST /api/orders` avec :

- le total TTC finalisé en unité mineure ;
- la devise EUR ou CHF de la boutique ;
- `capture_mode: automatic` ;
- le numéro de facture dans `merchant_order_data.reference` ;
- une clé d’idempotence.

La réponse est réduite immédiatement à l’identifiant technique de l’order et `checkout_url`. L’application ne relit
jamais l’order, n’installe aucun webhook et ne conserve ni state, ni payments, ni payment attempts.

La Hosted Checkout Page documentée par Revolut peut afficher Revolut Pay, carte, Apple Pay, Google Pay et Pay by Bank.
L’API Create Order ne documente pas de filtre de moyens par order. Le réparateur doit donc désactiver Pay by Bank et
tout moyen non autorisé dans les réglages Revolut Business avant de partager un lien. Behar Tech Pro n’active aucun
crédit, Pay Later, abonnement, paiement récurrent ou sauvegarde de carte et n’envoie aucun objet `customer`.

Apple Pay n’est pas disponible dans le Sandbox Revolut ; sa disponibilité doit être vérifiée en production sur un
domaine conforme aux exigences Apple.

## Revolut Terminal

Le gestionnaire de terminaux utilise seulement :

- `GET /api/locations?type=physical` pour choisir la location ;
- `GET /api/terminals?operation_mode=pos&location_id=…` pour associer un terminal ;
- `POST /api/orders` avec `channel: pos`, la location, le total TTC et la référence de facture ;
- `POST /api/orders/{order_id}/payment-intents` pour transmettre la demande.

Le corps de réponse du payment intent n’est jamais lu. Behar Tech Pro ne poll pas le payment intent, ne récupère pas le
payment final et n’affiche aucun résultat financier. Le Terminal lui-même reste responsable de son écran de résultat.

En Sandbox, Revolut fournit un terminal virtuel `11111111-0000-0000-0000-000000000000`. Les scénarios sont pilotés par
le montant d’essai documenté par Revolut ; ils ne doivent jamais être interprétés ni stockés par Behar Tech Pro.

## Configuration Vercel

```dotenv
REVOLUT_ENVIRONMENT=sandbox
REVOLUT_API_VERSION=2026-04-20
PAYMENT_TOKEN_ENCRYPTION_KEY=
```

Il n’existe aucun Client ID ou secret partenaire Revolut global public à ajouter actuellement. Pour la production,
utiliser `REVOLUT_ENVIRONMENT=production`, redéployer puis faire saisir aux réparateurs leurs clés de production depuis
le formulaire sécurisé.

## Limites fonctionnelles obligatoires

L’intégration ne doit jamais appeler la liste des orders ou payments, la lecture d’un payment intent, les refunds, les
rapports, les customers, les saved payment methods ou les subscriptions. Elle ne doit jamais enregistrer un order state,
payment state, payment attempt, payment ID final, carte, remboursement, montant encaissé ou `paid_at`.
