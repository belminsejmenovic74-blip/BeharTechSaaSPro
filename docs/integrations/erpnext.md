# Intégration ERPNext

L’intégration est exclusivement serveur. Aucune clé ERPNext ne doit être placée dans une variable
`NEXT_PUBLIC_*`, un composant React, un bundle navigateur ou une réponse d’API publique.

## État par défaut

La synchronisation reste inactive tant que `ERPNEXT_SYNC_ENABLED` n’est pas explicitement défini à `true`.
L’absence de clé ne doit donc jamais empêcher l’application de fonctionner en mode local ou Supabase.

## Variables serveur

- `ERPNEXT_BASE_URL`
- `ERPNEXT_API_KEY`
- `ERPNEXT_API_SECRET`
- `ERPNEXT_COMPANY`
- `ERPNEXT_DEFAULT_BRANCH`
- `ERPNEXT_DEFAULT_WAREHOUSE`
- `ERPNEXT_REQUEST_TIMEOUT_MS`
- `ERPNEXT_SYNC_ENABLED`

L’utilisateur associé au token doit être un utilisateur technique distinct. Il ne doit pas recevoir le rôle
`System Manager` ni le profil `Administrateur BEHAR TECH PRO`.

## Répartition des sources de vérité

- BEHAR TECH PRO : réparations, dossiers, boutiques, techniciens et expérience métier.
- ERPNext : articles comptables, stocks, lots, numéros de série, fournisseurs, achats et documents comptables.
- Supabase : isolation des ateliers, identifiants de liaison, reprise et suivi de synchronisation.

Les champs `custom_identifiant_*_behar_tech_pro` servent de clés d’idempotence. Un même objet BEHAR TECH PRO
doit mettre à jour le document ERPNext existant au lieu de créer un doublon.

## Garde-fous

- Aucun `DELETE` ERPNext n’est exposé par le client.
- Les factures doivent rester en brouillon tant que l’entreprise n’est pas immatriculée.
- Le statut actuel est « TVA non applicable, article 293 B du CGI ».
- Les paiements Stripe, SumUp et PayPal sont enregistrés comme externes ; ils ne sont pas encaissés par ERPNext.
- La synchronisation doit être testée avec des fixtures et des appels simulés avant activation sur le site réel.
