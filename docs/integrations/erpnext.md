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
- `ERPNEXT_DEFAULT_CUSTOMER_GROUP`
- `ERPNEXT_DEFAULT_SUPPLIER_GROUP`
- `ERPNEXT_DEFAULT_ITEM_GROUP`
- `ERPNEXT_DEFAULT_TERRITORY`
- `ERPNEXT_REQUEST_TIMEOUT_MS`
- `ERPNEXT_SYNC_ENABLED`

`ERPNEXT_COMPANY` doit contenir le nom interne exact du document ERPNext. Il reste actuellement
`Behar Tech Pro` pendant la phase provisoire ; la raison sociale légale affichée est « BEHAR TECH PRO ».
Il faudra mettre cette variable à jour si le document ERPNext est renommé après l’immatriculation.

L’utilisateur associé au token doit être un utilisateur technique distinct. Il ne doit pas recevoir le rôle
`System Manager` ni le profil `Administrateur BEHAR TECH PRO`.

## Répartition des sources de vérité

- BEHAR TECH PRO : réparations, dossiers, boutiques, techniciens et expérience métier.
- ERPNext : articles comptables, stocks, lots, numéros de série, fournisseurs, achats et documents comptables.
- Supabase : isolation des ateliers, identifiants de liaison, reprise et suivi de synchronisation.

Les champs `custom_identifiant_*_behar_tech_pro` servent de clés d’idempotence. Un même objet BEHAR TECH PRO
doit mettre à jour le document ERPNext existant au lieu de créer un doublon.

Les quantités de stock ne sont jamais envoyées dans la création d’un `Item`. Elles devront passer par un
mouvement de stock ou un rapprochement dédié afin de préserver le grand livre de stock ERPNext.

## Garde-fous

- Aucun `DELETE` ERPNext n’est exposé par le client.
- Les factures doivent rester en brouillon tant que l’entreprise n’est pas immatriculée.
- Le code bloque actuellement toute synchronisation de facture tant que `legalInvoicingEnabled` n’est pas
  explicitement activé après confirmation de l’immatriculation. Même ensuite, le document produit reste un
  brouillon (`docstatus = 0`) et ne modifie pas le stock.
- Le statut actuel est « TVA non applicable, article 293 B du CGI ».
- Les paiements Stripe, SumUp et PayPal sont enregistrés comme externes ; ils ne sont pas encaissés par ERPNext.
- La synchronisation doit être testée avec des fixtures et des appels simulés avant activation sur le site réel.

La route serveur `/api/behar/sync` propage désormais les clients, fournisseurs et articles vers ERPNext après
la validation de la session, de la licence et de l’isolation atelier. Les identifiants externes sont préfixés
par l’atelier afin d’éviter les collisions entre locataires. Les factures, paiements et mouvements de stock
ne sont pas envoyés par cette étape tant que leurs workflows comptables et légaux ne sont pas activés.

La route `GET /api/erpnext/status` permet un diagnostic de production. Elle exige le jeton serveur
`ADMIN_ACCESS_TOKEN`, ne renvoie jamais les clés ERPNext et vérifie le jeton technique avec l’API Frappe.
