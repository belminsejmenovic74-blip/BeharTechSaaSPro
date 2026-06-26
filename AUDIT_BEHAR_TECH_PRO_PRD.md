# Audit Behar Tech Pro vs PRD

Date : 2026-06-26  
Verdict strict : **NO GO production SaaS payant sans corrections et recette navigateur complète**.

Le logiciel a une base fonctionnelle large : Comptoir, Atelier, dossiers, devis, factures, paiements, stock, rendez-vous, documents, suivi client, France/Suisse et rôles sont présents dans le code. Le build production passe. En revanche, le PRD demande un produit utilisable toute la journée par un réparateur, sans surprise métier. À ce niveau d'exigence, il reste des risques bloquants sur la recette réelle navigateur, les documents publics, l'immutabilité des documents, les permissions et la dette de qualité.

## Portée Et Limites

Sources lues :
- `PRD_BEHAR_TECH_PRO.md`
- `docs/prd/modules/01-mode-comptoir.md` à `09-roles-permissions.md`
- `docs/prd/regles-metier-obligatoires.md`
- `docs/prd/user-flows-behar-tech-pro.md`
- `docs/prd/plan-qa-recette-behar-tech-pro.md`
- Code applicatif `src/app`, `src/components/behar`, `src/lib`

Vérifications effectuées :
- `npm run build` : **OK**
- `npm run check` : **KO**, 518 erreurs, 478 warnings, 1322 infos. Les premières erreurs visibles viennent surtout de `scratch/ocr.js`, gros fichiers JSON, `package.json` format et un rapport non UTF-8.
- Audit code statique ciblé : **OK**

Vérifications non terminées :
- Recette navigateur réelle Comptoir/Atelier/Dashboard/Client : **bloquée**. Le Browser plugin a expiré, Chromium Playwright échoue dans le sandbox macOS, et l'autorisation d'exécuter Chromium hors sandbox a été refusée.
- Impression réelle Chrome/Edge/Firefox, imprimante thermique, téléchargement natif mobile : **non validés manuellement**.

## Synthèse PRD

| Exigence PRD | État actuel | Conformité | Problème | Correction recommandée | Priorité |
|---|---:|---|---|---|---|
| Mode Comptoir rapide, tablette, création dossier sans devis | Présent | Partiel | Le flow existe, mais non recetté en navigateur et composants très denses | Recette complète sur tablette + simplification des états critiques | Important |
| Bon de prise en charge généré dès création | Présent | Conforme partiel | Document local créé automatiquement | Vérifier impression/téléchargement sur Chrome/Edge/mobile | Important |
| Télécharger un document sans ouvrir l'app | Corrigé côté Comptoir | Partiel | Le bouton Comptoir utilise un blob PDF ; autres surfaces gardent parfois preview/open | Uniformiser toutes les actions avec route PDF/Blob + `download` | Bloquant |
| Imprimer uniquement le document | Corrigé côté Comptoir | Partiel | Comptoir utilise une page dédiée ; plusieurs modules utilisent encore `PrintProvider.print()` avec `window.print()` | Migrer Dashboard/Atelier/fiche dossier vers `printDocument()` | Bloquant |
| Imprimer QR Code seul | Ajouté | Partiel | Route `/print/qr/_` et page blanche 80/58 mm existent ; impression réelle non validée | Recette Chrome/Safari/Edge + thermique | Bloquant |
| Documents blancs, premium, sans beige | Amélioré | Partiel | Beaucoup de blanc, mais presets `tangerine`, `brutalist`, `soft-pop` restent problématiques | Supprimer/verrouiller presets non premium en production | Important |
| Suivi client par QR/token public | Présent | Partiel | `/p/[token]`, `/suivi/[token]` existent ; fallback document ouvre parfois une page interne/preview | Servir les PDF publics via API avec vrais headers | Bloquant |
| Le suivi client ne montre pas données internes | Présent | À vérifier | Filtres publics existent, mais pas de test byte/PDF prouvant absence prix achat/marge/fournisseur | Tests automatiques sur PDF public + DTO serveur | Bloquant |
| Atelier avec statut, diagnostic, notes, pièces, historique | Présent | Partiel | Fonctionnel en code, mais UX non recettée | Recette atelier complète + tests de régression | Important |
| Test final requis avant "Prêt" | Présent | Conforme partiel | `validateRepairFinalTest` bloque correctement dans le store | Tester depuis UI | Important |
| Stock sans décrément sur consultation/brouillon | Présent | Conforme partiel | `addPartToRepair` ne décrémente pas ; décrément à confirmation/paiement | Ajouter tests unitaires stock | Important |
| Catalogue pièces/prestations | Présent | Partiel | Large modèle stock/pricebook, mais qualité UI non validée | Recette catalogue + import/export | Important |
| Vente comptoir avec ticket/paiement/stock | Présent | Partiel | Paiement et décrément existent ; flow non recetté navigateur | Test E2E vente comptoir | Important |
| Paiements partiels, pas de trop-perçu implicite | Présent | Partiel | `markInvoicePaid` règle le reste dû ; `addPayment` doit être revu plus finement | Tests montants partiels/trop-perçu | Important |
| Rendez-vous autonome puis conversion dossier | Présent | Partiel | `convertAppointmentToRepair` existe ; flow UI non validé | Recette RDV -> dossier sans double saisie | Important |
| France/Suisse, EUR/CHF, TVA | Présent | Partiel | Modèle pays/devise existe ; risque si document est régénéré avec paramètres courants | Snapshot fiscal/documentaire immuable | Bloquant |
| Rôles et permissions UI/routes/actions | Présent | Partiel | Store protège plusieurs actions, mais route/UI restent hétérogènes | Guards par route + tests par rôle | Bloquant |
| Local-first/demo sans API externe | Présent | Conforme partiel | Store local fonctionne ; upload cloud documents devient local-only si Supabase absent | Afficher clairement les limites multi-appareils | Important |
| Build stable | OK | Conforme | `npm run build` passe | Garder en CI | Bloquant déjà OK |
| Lint/check propre | KO | Non conforme | 518 erreurs Biome | Exclure `scratch`/gros dumps ou nettoyer | Important |

## Audit Des Flows

### 1. Comptoir

Statut : **partiellement conforme, pas encore vendable sans recette réelle**.

Points positifs :
- Création de réparation sans devis supportée par `addRepair`.
- Bon de prise en charge créé automatiquement (`doc_intake_*`).
- Actions demandées ajoutées dans le Comptoir : Télécharger le bon, Imprimer le bon, Imprimer QR Code.
- La liste documents Comptoir couvre bons, devis, factures, reçus, diagnostics, rapports finaux, ventes.

Risques :
- Le téléchargement repose sur génération client `html2canvas/jsPDF`, pas sur une route serveur PDF immuable.
- Impression cross-browser non validée ; le correctif ouvre maintenant une page dédiée par `window.open`, puis `window.print`.
- Certaines actions documentaires hors Comptoir utilisent encore l'ancien provider.

Priorité : **Bloquant** pour finaliser recette Chrome/Edge/Firefox/mobile.

### 2. Atelier

Statut : **fonctionnel en code, conformité partielle**.

Points positifs :
- Statuts, historique, diagnostic, notes client/interne, pièces et test final sont présents.
- Passage en "Prêt" conditionné par test final dans le store.
- Pièces ajoutées en attente puis confirmées, avec audit et notification stock bas.

Risques :
- Les surfaces d'impression dans Atelier/Dashboard ne sont pas toutes migrées vers les pages dédiées.
- Les permissions sont parfois vérifiées côté UI et action, mais pas uniformément au niveau route/parcours.

Priorité : **Important**, sauf impression/documents qui reste **Bloquant**.

### 3. Dashboard Réparation / Fiche Dossier

Statut : **partiel**.

Points positifs :
- Fiche dossier riche, documents liés, paiement/facturation, historique.
- Actions métier centrales reliées au store.

Risques :
- Boutons document encore reliés à `useDocument().print()` dans plusieurs endroits.
- UX très dense : utile pour un gérant, mais risquée au comptoir si non testée sur tablette.

Priorité : **Important**.

### 4. Client / Suivi Public

Statut : **partiel avec risque bloquant documents**.

Points positifs :
- Token public, QR, route `/p/[token]` et `/suivi/[token]`.
- Téléchargement PDF via `downloadPdfUrl` quand `downloadUrl` existe.

Risques :
- Si `downloadUrl` n'existe pas, le suivi client peut tomber sur un rendu local ou ouvrir `previewUrl`.
- L'upload `/api/repair-documents` renvoie 503 si Supabase Storage n'est pas configuré ; le document reste local.
- Pas de preuve automatisée que les PDF publics ne contiennent jamais prix achat/marge/fournisseur/notes internes.

Priorité : **Bloquant**.

### 5. Documents PDF

Statut : **amélioré, encore partiel**.

Ce qui vient d'être corrigé :
- `printDocument()` passe par `/print/document/_/?doc=...&print=1`.
- `printRepairQr()` passe par `/print/qr/_/?repair=...&format=...&print=1`.
- La page QR est blanche, centrée, minimaliste, compatible formats A4/A6/80mm/58mm.

Risques :
- Pas de vraie route GET PDF avec `Content-Disposition: attachment` pour les documents générés localement.
- Les documents peuvent être régénérés avec les paramètres actuels de l'atelier au lieu d'un snapshot immuable.
- `Content-Disposition` n'est pas garanti sur les URLs publiques Supabase générées.

Priorité : **Bloquant**.

### 6. Stock / Catalogue

Statut : **plutôt conforme côté règles métier, UX à recetter**.

Points positifs :
- Ajout de pièce à une réparation sans décrément immédiat.
- Décrément à confirmation de pièce, remise accessoire, paiement vente/facture.
- Champs sensibles existent et sont masqués dans plusieurs UI selon permissions.

Risques :
- Besoin de tests automatisés sur chaque transition stock.
- Vérification PDF/public nécessaire pour les champs sensibles.

Priorité : **Important**.

### 7. Rendez-vous

Statut : **présent, conformité non prouvée**.

Points positifs :
- Rendez-vous et conversion en réparation sont présents.
- Le rendez-vous peut porter un client, appareil, intervention et montant estimé.

Risques :
- Pas de recette navigateur sur création RDV sans dossier puis conversion sans double saisie.

Priorité : **Important**.

### 8. Vente Comptoir

Statut : **présent, partiel**.

Points positifs :
- Modèle vente, paiement, reçu, décrément stock.
- Vente rattachable à réparation.

Risques :
- Reçu/print utilisent encore le provider global sur certaines surfaces.
- Flow paiement + reçu + stock non validé en navigateur.

Priorité : **Important**.

### 9. Multi-pays / Devises

Statut : **présent, risque documentaire**.

Points positifs :
- Types pays/devise et configuration France/Suisse existent.
- Paiements/factures portent pays/devise.

Risques :
- Si un document est recalculé depuis le store courant, un changement de réglages peut altérer un ancien document.
- Le PRD exige un comportement juridique fiable : il faut figer snapshots fiscaux, devise, TVA, mentions légales par document.

Priorité : **Bloquant**.

## UX / UI Premium

Verdict UX : **potentiel premium, mais pas encore garanti**.

Points positifs :
- Palette principale fortement blanchie.
- Densité métier adaptée SaaS atelier.
- Les documents et la page QR sont simples et blancs.

Problèmes :
- Les presets `tangerine`, `brutalist`, `soft-pop` ne respectent pas l'exigence premium Apple/Stripe/Linear.
- Beaucoup de composants ont des rayons élevés, ombres et cartes imbriquées ; cela peut donner une impression moins professionnelle.
- Sans screenshot navigateur, impossible de valider chevauchements, responsive tablette, lisibilité thermique et vitesse perçue.

Réponse à la question "un vrai réparateur peut-il l'utiliser toute la journée ?" : **pas encore en l'état validé**. Le socle métier est là, mais les documents, permissions, stabilité des checks et recette navigateur empêchent de recommander une utilisation quotidienne payante sans supervision.

## Bugs Et Incohérences Notables

1. **Documents publics pas toujours de vrais PDF téléchargeables**  
   Le suivi client ouvre parfois `previewUrl` si `downloadUrl` manque. Cela peut reproduire le problème d'ouverture d'application/page au lieu de PDF.

2. **Impression pas uniformisée**  
   Comptoir est corrigé, mais `payments-workspace`, `quotes-workspace`, `invoices-workspace`, `repairs-workspace`, `dossier-detail-workspace`, `document-preview` contiennent encore des appels à `print(type, id)`.

3. **Documents non immuables**  
   L'API upload fait `upsert: true`; un document peut être écrasé. Pour facture/devis signé, il faut versionner.

4. **Permissions hétérogènes**  
   Les actions store vérifient souvent `requirePermission`, mais l'accès par route et les écrans ne sont pas prouvés hermétiques par rôle.

5. **Biome KO**  
   Le repo ne passe pas `npm run check`, donc CI qualité non conforme.

6. **Dette de thème**  
   Certains presets restent à l'opposé de l'identité demandée.

## Corrections Prioritaires

### Bloquant

1. Créer une vraie route document PDF : `GET /api/documents/:id.pdf?mode=download|inline`, `Content-Type: application/pdf`, `Content-Disposition: attachment|inline`.
2. Remplacer tous les `useDocument().print()` visibles par des pages dédiées `printDocument()` ou route inline PDF.
3. Garantir snapshots immuables par document : atelier, client, lignes, TVA, devise, mentions, statut, date.
4. Versionner les PDF générés au lieu d'écraser (`upsert: false` ou version documentaire).
5. Ajouter tests publics anti-fuite : aucun prix achat, marge, fournisseur, notes internes dans HTML public et PDF public.
6. Ajouter guards route par permission, pas seulement UI.
7. Faire recette réelle Chrome, Edge, Firefox, Safari, iPad/tablette et imprimante thermique.

### Important

1. Nettoyer ou exclure `scratch/`, gros JSON et rapports non UTF-8 pour que `npm run check` passe.
2. Ajouter tests stock : ajout pièce, confirmation, retrait confirmé/non confirmé, vente, remboursement.
3. Ajouter tests paiements : partiel, solde restant, annulation, pas de trop-perçu implicite.
4. Supprimer/verrouiller presets non premium en production.
5. Simplifier certaines surfaces Comptoir pour usage rapide sous pression.

## Conclusion

Behar Tech Pro n'est pas un simple prototype : beaucoup de fonctions du PRD existent déjà. Mais le PRD demande un outil métier fiable, juridiquement propre, imprimable, utilisable au comptoir et sans fuite de données. Aujourd'hui, le logiciel est **proche fonctionnellement**, mais **pas encore conforme production**.

La priorité numéro un reste le système documentaire : PDF réel, téléchargement réel, impression dédiée, QR seul, snapshots immuables, puis recette navigateur complète. Une fois ce socle validé, le produit peut passer d'un bon socle SaaS à un outil réellement utilisable par un réparateur toute la journée.
