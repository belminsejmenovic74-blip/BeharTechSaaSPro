# Configuration des fournisseurs externes

La route utilisateur canonique est `https://behartechpro.fr/client?section=paiements`. Les callbacks sont servis par `https://app.behartechpro.fr/api/external-payments/oauth/callback/{provider}` puis reviennent vers `/client?section=paiements&provider={provider}&connected=1`.

## Guides détaillés

- [Stripe Connect et TWINT](./STRIPE_CONNECT_SETUP.md) — [OAuth Standard](https://docs.stripe.com/connect/oauth-standard-accounts), [direct charges](https://docs.stripe.com/connect/direct-charges).
- [SumUp OAuth, Hosted Checkout et Solo](./SUMUP_SETUP.md) — [OAuth](https://developer.sumup.com/tools/authorization/oauth), [Checkouts](https://developer.sumup.com/online-payments/checkouts), [Cloud API](https://developer.sumup.com/terminal-payments/cloud-api). Le scope `payments` nécessite une validation SumUp.
- [PayPal manuel et Commerce Platform](./PAYPAL_SETUP.md) — [Partner Referrals](https://developer.paypal.com/docs/multiparty/seller-onboarding/before-payment/). L'onboarding automatique reste masqué tant que Behar Tech Pro n'est pas partenaire approuvé.
- [Square OAuth, Payment Links et Terminal](./SQUARE_SETUP.md) — [applications Square](https://developer.squareup.com/apps), [OAuth](https://developer.squareup.com/docs/oauth-api/overview), [Terminal](https://developer.squareup.com/docs/terminal-api/quickstart).
- [Revolut Business](./REVOLUT_BUSINESS_SETUP.md) — [Merchant Account et clés](https://developer.revolut.com/docs/guides/merchant/get-started), [Revolut Terminal](https://developer.revolut.com/docs/guides/merchant/accept-payments/in-person-payments/terminal/introduction). L'audit de la documentation publique ne fournit pas de parcours OAuth partenaire multi-marchands pour un SaaS personnalisé; l'intégration utilise donc la Secret API Key propre à chaque réparateur.
- [Mollie Connect](./MOLLIE_CONNECT_SETUP.md) — [Connect](https://docs.mollie.com/docs/connect-overview), [OAuth](https://docs.mollie.com/docs/implementing-oauth), [onboarding](https://docs.mollie.com/docs/connect-platforms-onboarding-customers).

## Vercel et passage en production

1. Créer une application sandbox/test chez chaque fournisseur.
2. Enregistrer exactement le callback du domaine Preview stable puis celui de production.
3. Ajouter les variables serveur dans Vercel Preview/Production, jamais dans le dépôt.
4. Tester deux boutiques séparées, EUR et CHF, puis TWINT sur la boutique suisse.
5. Obtenir les validations partenaire PayPal, SumUp `payments`/readers et toute activation fournisseur requise.
6. Remplacer ensemble les identifiants sandbox par les identifiants live; ne jamais mélanger les environnements.
