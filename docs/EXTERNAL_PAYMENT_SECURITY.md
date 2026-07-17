# Sécurité des paiements externes

## Secrets

- `PAYMENT_TOKEN_ENCRYPTION_KEY` est une clé serveur de 32 octets utilisée avec AES-256-GCM.
- Les access tokens, refresh tokens et clés Merchant API sont chiffrés avant stockage.
- Aucun secret fournisseur ne porte le préfixe `NEXT_PUBLIC_`.
- Les réponses navigateur ne contiennent jamais les colonnes chiffrées.
- Les routes ne journalisent ni secret ni réponse financière.

## Autorisation

- Connexion, configuration, choix par défaut, terminaux et déconnexion : `owner` ou `admin` uniquement.
- Création d'une demande : membre actif autorisé à utiliser le SaaS.
- Chaque requête valide l'organisation, la boutique et la facture côté serveur avec Zod.
- Les tables externes ont RLS forcée et leurs droits directs sont révoqués à `anon` et `authenticated`; les routes server-only appliquent les contrôles métier avant le service role.

## OAuth et requêtes

- `state` aléatoire de 32 octets, haché en base, expiration de dix minutes, consommation atomique unique.
- Redirect URLs fixes; aucun open redirect et aucun token dans une URL persistante.
- Idempotency key stable par organisation, boutique, facture, fournisseur et canal.
- Limitation de débit serveur sur connexion, configuration et création.
- Le total TTC vient exclusivement de la facture finalisée synchronisée.

## Absence de résultat financier

Aucun webhook marchand, aucune lecture de Checkout/Order/Payment après création et aucune colonne de paiement reçu ne sont présents. Les réponses fournisseur pouvant contenir `PAID`, `COMPLETED`, `CAPTURED`, un identifiant de transaction ou un moyen de paiement sont filtrées et ne sont pas persistées.
