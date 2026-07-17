# PayPal externe — Behar Tech Pro

Cette intégration appartient exclusivement au système `ExternalPaymentRequestProvider`. Elle ne modifie ni les abonnements Behar Tech Pro, ni les factures après leur finalisation, ni un historique d’encaissement.

## Deux modes distincts

### Lien PayPal manuel

Ce mode fonctionne sans agrément PayPal Partner. Dans **Paramètres > Intégrations > Paiements externes**, le réparateur renseigne un lien officiel :

- `https://paypal.me/nom-atelier` ;
- `https://www.paypal.com/paypalme/nom-atelier` ;
- ou un lien PayPal Business `https://www.paypal.com/ncp/payment/...`.

Le lien est chiffré en AES-256-GCM dans `external_payment_connections.encrypted_configuration`. Pour PayPal.Me, Behar Tech Pro ajoute le total TTC et `EUR` ou `CHF` au chemin. Pour un lien Business déjà configuré dans PayPal, Behar Tech Pro partage le lien tel quel et présente le total TTC de la facture dans le message envoyé. Aucun appel de lecture PayPal n'est effectué.

## PayPal Commerce Platform

La connexion automatique est affichée comme indisponible tant que toutes les variables partenaire ne sont pas présentes. Elle ne doit jamais être simulée : PayPal exige que Behar Tech Pro soit un partenaire approuvé pour utiliser Partner Referrals.

L'onboarding appelle `POST /v2/customer/partner-referrals` avec :

- un `tracking_id` aléatoire, haché en base et consommé une seule fois comme protection anti-CSRF ;
- le produit `EXPRESS_CHECKOUT` ;
- uniquement la fonctionnalité `PAYMENT` ;
- aucune permission `REFUND`, litige, partner fee ou moyen de paiement sauvegardé.

Le retour doit être enregistré dans PayPal sous la forme :

```text
https://APP_DOMAIN/api/external-payments/oauth/callback/paypal
```

Seul `merchantIdInPayPal`, correspondant au merchant ID du réparateur, est conservé. Les paramètres de statut d'onboarding sont validés de manière transitoire puis ignorés.

## Création d'un ordre

L'ordre Orders v2 contient une seule unité d'achat :

- total TTC finalisé, lu côté serveur depuis la facture ;
- devise EUR ou CHF de l'atelier ;
- numéro de facture dans `invoice_id` ;
- merchant ID du réparateur dans `purchase_units.payee.merchant_id` ;
- `intent: CAPTURE` et action immédiate `PAY_NOW`.

Le header `PayPal-Auth-Assertion` désigne aussi le réparateur. Aucun `platform_fees`, delayed disbursement, abonnement, vault ou billing agreement n'est envoyé. L'identifiant technique de l'ordre et l'URL `payer-action` sont les seuls éléments de création conservés.

PayPal demande une capture serveur après l'approbation. `PAYPAL_RETURN_URL` doit donc être exactement :

```text
https://APP_DOMAIN/api/external-payments/paypal/return
```

Cette route vérifie une signature HMAC, l'ordre et la boutique, appelle la capture puis ne lit pas le corps de réponse. Elle n'écrit aucun résultat, ne modifie pas la facture, ne journalise aucune réponse PayPal et affiche toujours une page générique invitant le réparateur à consulter PayPal. Aucun webhook financier n'est installé.

## Variables Vercel

Configurer uniquement côté serveur, séparément pour Preview et Production :

```dotenv
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PARTNER_ID=
PAYPAL_BN_CODE=
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_RETURN_URL=https://APP_DOMAIN/api/external-payments/paypal/return
PAYMENT_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=https://APP_DOMAIN
```

`PAYMENT_TOKEN_ENCRYPTION_KEY` contient 32 octets en base64 ou 64 caractères hexadécimaux. Aucun secret PayPal ne doit utiliser un préfixe `NEXT_PUBLIC_`.

## Sandbox et mise en production

1. Créer les comptes sandbox partenaire, vendeur Business et acheteur dans le PayPal Developer Dashboard.
2. Faire activer l'accès partenaire et Partner Referrals pour l'application.
3. Configurer les deux URL de retour ci-dessus sur le domaine Vercel Preview utilisé pour les essais.
4. Tester un vendeur distinct par boutique, EUR puis CHF.
5. Vérifier dans les requêtes que `PAYMENT` est la seule fonctionnalité et que le corps Orders ne contient aucune commission.
6. Vérifier qu'après approbation ou refus, aucune colonne financière, transaction client ou modification de facture n'est créée.
7. Passer `PAYPAL_ENVIRONMENT=production` uniquement après validation PayPal et remplacer toutes les valeurs sandbox.

Le mode lien manuel reste le mode de repli officiel tant que l'activation partenaire n'est pas accordée.
