# SumUp OAuth, Hosted Checkout et Solo

L’intégration utilise le même système de demandes externes que Stripe : routes `/api/external-payments`, abstraction `ExternalPaymentRequestProvider` et tables `external_payment_*`. Elle ne crée aucun registre de règlements parallèle.

## Créer l’application OAuth

1. Ouvrir le portail développeur SumUp et créer une application OAuth pour Behar Tech Pro.
2. Déclarer exactement chaque URL de redirection :
   - production : `https://app.behartechpro.fr/api/external-payments/oauth/callback/sumup` ;
   - Preview Vercel : la même route sur le domaine stable de préproduction ;
   - développement : une origine HTTPS locale ou un tunnel HTTPS.
3. Renseigner le Client ID et le secret dans `SUMUP_CLIENT_ID` et `SUMUP_CLIENT_SECRET`.
4. Renseigner l’URL active, strictement identique à celle déclarée, dans `SUMUP_REDIRECT_URI`.

Le parcours utilise Authorization Code Flow avec un `state` aléatoire, haché en base, expirant et consommé une seule fois avant l’échange du code.

## Scopes demandés

```text
payments user.profile_readonly readers.write
```

- `payments` permet de créer le Hosted Checkout et nécessite une validation manuelle de l’application par SumUp.
- `user.profile_readonly` permet de récupérer le `merchant_code` du réparateur.
- `readers.write` permet d’associer un Solo et de lui transmettre une demande.

Ne jamais demander `payment_instruments`, `transactions.history`, ni des permissions de payouts, refunds ou receipts. L’intégration ne crée pas de Customer SumUp et ne sauvegarde aucune carte.

## Jetons

Les `access_token` et `refresh_token` sont chiffrés en AES-256-GCM avant stockage avec `PAYMENT_TOKEN_ENCRYPTION_KEY`. Lors d’un renouvellement, le nouveau refresh token est chiffré et remplace immédiatement l’ancien. Si SumUp n’en renvoie pas, le token précédent est conservé. Aucun token ne doit être envoyé au navigateur ou écrit dans les logs.

## Hosted Checkout

La requête contient uniquement le total TTC finalisé, la devise, le `merchant_code`, une référence idempotente, une description de facture et `hosted_checkout.enabled=true`. Elle ne contient ni `return_url` backend, ni Customer, ni installment, ni acompte.

Seuls l’identifiant technique du Checkout et `hosted_checkout_url` sont conservés. Les champs de réponse financiers, transactions ou statuts sont ignorés et le Checkout n’est jamais relu.

## Affiliate Key et Solo

1. Créer une Affiliate Key SumUp pour l’application et la renseigner dans `SUMUP_AFFILIATE_KEY`.
2. Demander à SumUp les permissions `readers_create` et `readers_checkout_create` associées au scope `readers.write`.
3. Sur le Solo, démarrer l’association et recopier le code de 8 ou 9 caractères dans **Paramètres → Intégrations → Paiements externes → Gérer les terminaux**.
4. Nommer le terminal. Behar Tech Pro conserve uniquement `reader_id`, `reader_name`, la boutique et la date d’association.
5. Depuis une facture, sélectionner SumUp puis **Envoyer au terminal SumUp** et choisir le lecteur de la boutique.

Une connexion SumUp créée avant l’ajout du scope `readers.write` doit être déconnectée puis reconnectée pour autoriser la gestion des Solo.

La requête Solo envoie le total TTC en unités mineures, la devise, le numéro de facture dans la description et les métadonnées Affiliate. `installments`, `return_url` et les options de pourboire sont omis. L’identifiant de transaction éventuellement renvoyé est ignoré.

## Sandbox et Virtual Solo

1. Créer un marchand sandbox SumUp.
2. Configurer `SUMUP_ENVIRONMENT=sandbox` ; l’envoi terminal est alors disponible sans activer le flag de production.
3. Ouvrir Virtual Solo avec le marchand sandbox.
4. Associer le lecteur virtuel avec le code affiché.
5. Créer une facture de test, puis tester séparément le Hosted Checkout et la transmission terminal sans fonds réels.

Virtual Solo ne simule pas de fonds réels. Behar Tech Pro ne reçoit aucun webhook final et ne lit jamais le résultat de la demande.

## Variables Vercel

```text
SUMUP_CLIENT_ID=
SUMUP_CLIENT_SECRET=
SUMUP_REDIRECT_URI=
SUMUP_AFFILIATE_KEY=
SUMUP_ENVIRONMENT=sandbox
PAYMENT_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
```

Le flag existant `SUMUP_TERMINAL_DISPATCH_ENABLED=false` doit rester désactivé en production tant que l’usage Cloud API n’a pas reçu la validation attendue. Pour une activation de production explicitement validée, utiliser `SUMUP_ENVIRONMENT=production` et `SUMUP_TERMINAL_DISPATCH_ENABLED=true`.

Configurer séparément les valeurs Development, Preview et Production, puis redéployer l’application.
