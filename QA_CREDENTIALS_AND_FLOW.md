# QA Credentials & Flow — Behar Tech Pro

> Document de référence pour l'audit Playwright (~500 points). À jour au 2026-05-15.

---

## 🌐 Environnement local

| Élément          | Valeur                                                 |
| ---------------- | ------------------------------------------------------ |
| URL principale   | `http://127.0.0.1:3000` (alias `http://localhost:3000`) |
| Variable env     | `BEHAR_BASE_URL`                                        |
| Storage key      | `behar-tech-local-demo-v3` (localStorage, Zustand)      |
| Service worker   | `/sw.js` (cache `behar-tech-pro-v3`)                    |
| Manifest         | `/manifest.webmanifest` — name "Behar Tech Pro"         |
| Mode persistance | 100 % local (pas de Supabase, pas d'API externe)        |

---

## 🔑 Licences de test

Toutes les licences ci-dessous sont **valides** (vérifiées dans `src/lib/behar-store.ts` ~ ligne 3000) :

```
BHT-2026-PRO-001
BHT-2026-PRO-002          ← recommandée pour les tests
BHT-PILOT-ANNEMASSE
BHT-BEHAR-TECH-PRO
BHT-PILOT-EXCLUSIF
```

Champ d'entrée : `<input placeholder="BHT-XXXX-XXXX-XXXX">` sur `/dashboard/` quand `licenseActivated: false`.
La validation est **insensible à la casse**.

Licence invalide pour tester l'erreur : `MAUVAISE-CLE-2099` (ou n'importe quel autre format).

---

## 👥 Utilisateurs démo et PIN

Définis dans `src/lib/behar-store.ts` (`defaultUsers`, vers ligne 972).

| Nom          | ID                       | Rôle         | PIN    | Active |
| ------------ | ------------------------ | ------------ | ------ | ------ |
| **Gérant**     | `user_belmin_admin`      | `admin`      | `0000` | ✅      |
| **Technicien** | `user_nadir_technician`  | `technician` | `1234` | ✅      |
| **Accueil**    | `user_lina_frontdesk`    | `frontdesk`  | `5678` | ✅      |
| **Stagiaire**  | `user_intern_stagiaire`  | `technician` | `9999` | ✅      |

> Le stagiaire a `permissionOverrides` qui retirent : suppression, exports, paramètres sensibles.

---

## 🚦 Flow d'authentification

1. **Licence** (`licenseActivated: false`) → écran d'activation à la racine `/dashboard/`.
2. **Onboarding** (`onboardingCompleted: false`) → wizard `OnboardingWizard` (4 étapes : atelier, contact, équipe, tarifs).
3. **PIN Gate** (`sessionUserId === undefined`) → écran "Bonjour" + sélecteur d'utilisateur + PIN.
4. **Dashboard** ouvert.

### Composants clés

| Étape         | Composant                                                | Fichier                                          |
| ------------- | -------------------------------------------------------- | ------------------------------------------------ |
| Licence       | `LicenseActivation`                                      | `src/components/behar/license-activation.tsx`    |
| Installation  | `InstallationGate`                                       | `src/components/behar/installation-gate.tsx`     |
| Onboarding    | `OnboardingWizard`                                       | `src/components/behar/onboarding-wizard.tsx`     |
| PIN Gate      | `PinLoginGate` (sélecteur + saisie)                      | `src/components/behar/pin-login-gate.tsx`        |
| Sidebar       | `DashboardSidebar` (bouton déconnexion, logo atelier)    | `src/components/behar/dashboard-sidebar.tsx`     |
| Mobile nav    | `MobileBottomNav`                                        | `src/components/behar/mobile-bottom-nav.tsx`     |

### Changer d'utilisateur

1. Sidebar : clic sur l'icône **logout** (rouge) à côté du nom → `logout()` → revient au sélecteur.
2. Bouton "Changer d'utilisateur" sur l'écran PIN après sélection → revient au sélecteur.

### Reset complet (pour QA)

```js
// Dans la console navigateur, ou via Playwright addInitScript :
localStorage.removeItem("behar-tech-local-demo-v3");
location.reload();
```

---

## 🗺️ Routes principales

Toutes sous `/dashboard/` (App Router, segment `(main)`).

| Route                            | Module                              | Permission requise                  |
| -------------------------------- | ----------------------------------- | ----------------------------------- |
| `/dashboard`                     | Tableau de bord                     | `canViewDashboard`                  |
| `/dashboard/reparations`         | Réparations (Kanban + fiche)        | `canViewRepairs`                    |
| `/dashboard/clients`             | Clients                             | `canViewClients`                    |
| `/dashboard/ventes`              | Ventes / POS                        | `canViewSales`                      |
| `/dashboard/devis`               | Devis                               | `canViewQuotes`                     |
| `/dashboard/factures`            | Factures                            | `canViewInvoices`                   |
| `/dashboard/paiements`           | Paiements                           | `canViewPayments`                   |
| `/dashboard/rendez-vous`         | Rendez-vous (agenda)                | (généralement ouvert)               |
| `/dashboard/stock`               | Stock pièces                        | `canViewStock`                      |
| `/dashboard/documents`           | Documents générés (PDF)             | `canViewDocuments`                  |
| `/dashboard/parametres`          | Paramètres atelier                  | `canViewSettings`                   |
| `/dashboard/parametres/equipe`   | Équipe & permissions                | `canManageUsers`                    |
| `/dashboard/parametres/catalogue`| Catalogue prix                      | `canViewSettings`                   |
| `/dashboard/parametres/appareils`| Catalogue appareils                 | `canViewSettings`                   |
| `/dashboard/parcours-demo`       | Parcours guidé démo                 | -                                   |

> **Backstage / super-admin** : n'existe pas dans cette version. Tout est mono-atelier local.

---

## 🛡️ Permissions clés (50 keys)

Définis dans `PermissionKey` (`src/lib/behar-store.ts:38-90`). Les groupes critiques :

- **Sensible (admin only par défaut)** : `canViewPurchasePrice`, `canViewMargin`, `canViewSupplier`, `canManageUsers`, `canManageRoles`, `canViewAuditLog`, `canExportData`, `canImportData`, `canBackupData`, `canEditSettings`, `canDeleteRepair`, `canDeleteClient`, `canDeleteSale`, `canRefundSale`, `canApplyDiscount`.
- **Technique (technician)** : `canViewRepairs`, `canEditRepair`, `canChangeRepairStatus`, `canAddDiagnosis`, `canAddTechnicalNotes`, `canViewTechnicalNotes`, `canViewStock`, `canUseStockItem`.
- **Accueil (frontdesk)** : `canViewClients`, `canCreateClient`, `canViewQuotes`, `canCreateQuote`, `canViewInvoices`, `canCreateInvoice`, `canMarkPaymentPaid`, `canTakePayment`, `canCreateSale`.

---

## 📦 Données de test générées par le script

Le script crée son propre dataset, identifiable par préfixe `QA-` :

- **10 clients** : "QA-Client 001" à "QA-Client 010".
- **20 réparations** : iPhone 13 écran, Samsung S21 connecteur, PS5 HDMI, MacBook clavier, micro-soudure, etc. Préfixe `QA-REP-`.
- **50 pièces stock** : écrans, batteries, connecteurs Apple/Samsung/Xiaomi/Sony/Nintendo. Préfixe SKU `QA-`.
- **10 RDV** : sur la journée et la semaine.
- **10 devis** générés depuis des réparations.
- **8 factures** : 6 depuis devis acceptés + 2 directes via POS.
- **6 paiements** simulés.
- **4 membres équipe** : par défaut (Gérant, Technicien, Accueil, Stagiaire).

---

## 🧪 Lancer les tests

### Mode standard (CI / rapide)

```bash
# Suite complète, headless
PLAYWRIGHT_HEADLESS=true npx playwright test --project=google-chrome

# Une suite spécifique
npx playwright test tests/e2e/00-smoke.spec.ts

# Avec UI navigateur visible (par défaut headed)
npx playwright test
```

### Variables d'environnement

| Var                      | Défaut                   | Effet                                    |
| ------------------------ | ------------------------ | ---------------------------------------- |
| `BEHAR_BASE_URL`         | `http://localhost:3000`  | URL de l'app                             |
| `PLAYWRIGHT_HEADLESS`    | `false`                  | `true` = pas de fenêtre                  |
| `PLAYWRIGHT_SLOWMO`      | `250` (ms)               | Ralentissement entre actions             |
| `QA_FAST`                | `false`                  | `true` = saute le seed lourd             |

### Rapports

- HTML : `playwright-report/index.html` (généré automatiquement)
- Markdown final 500 points : `qa-report-behar-tech-500.md` (généré par `tests/e2e/99-report.spec.ts`)

---

## 🚨 Classification des bugs

| Priorité | Définition                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------- |
| **P0**   | Bloque la vente pilote : login impossible, données perdues, PDF cassé, fuite de permission, app down.   |
| **P1**   | Très gênant mais contournable : responsive cassé page secondaire, bouton mal placé, PDF incomplet.      |
| **P2**   | Finition : wording, alignement, espacement, badge peu clair.                                            |

### Seuils de décision

- **95-100 /100** : ✅ GO vente pilote.
- **90-94** : ⚠️ GO avec petites corrections.
- **80-89** : 🟡 Démo possible, vente pas sereine.
- **< 80** : 🛑 NO GO vente.

---

## 🔐 Vérifications sensibles obligatoires

Le script doit valider explicitement :

1. **Documents client** (devis PDF, facture PDF) **ne doivent jamais** afficher : prix d'achat, marge, fournisseur, stock interne.
2. **Marges / prix d'achat / fournisseur** : visibles **uniquement** si `canViewPurchasePrice`, `canViewMargin`, `canViewSupplier` actifs.
3. **Suppression** : protégée par `canDelete*`. Le rôle stagiaire ne doit pas pouvoir supprimer.
4. **Export** : `canExportData` requis. Stagiaire/Accueil ne doivent pas pouvoir exporter.
5. **Paramètres équipe** : `canManageUsers` requis. Technicien/Accueil/Stagiaire bloqués.
6. **Licence** : ne peut pas être modifiée par un technicien.
7. **Accès direct par URL** à une page interdite (`/dashboard/parametres/equipe` en tant que technicien) : doit afficher "Permission requise" ou rediriger.

---

## 📁 Structure des tests

```
tests/
├── e2e/
│   ├── 00-smoke.spec.ts            ← startup, no console errors, routes accessibles
│   ├── 01-license.spec.ts          ← activation licence, mauvaise clé, persistance
│   ├── 02-auth-pin.spec.ts         ← connexion 4 rôles, mauvais PIN, logout, refresh
│   ├── 03-permissions.spec.ts      ← matrice permissions par rôle
│   ├── 04-dashboard.spec.ts        ← KPIs, activité, cohérence
│   ├── 05-customers.spec.ts        ← CRUD clients
│   ├── 06-repairs.spec.ts          ← création + parcours statut + notes
│   ├── 07-stock.spec.ts            ← CRUD pièces, marge, association réparation
│   ├── 08-quotes.spec.ts           ← création devis, conversion
│   ├── 09-invoices.spec.ts         ← facturation, PDF
│   ├── 10-payments.spec.ts         ← paiement, reçu
│   ├── 11-appointments.spec.ts     ← RDV CRUD
│   ├── 12-documents.spec.ts        ← PDF générés, contenu nettoyé
│   ├── 13-settings-team.spec.ts    ← paramètres atelier + équipe
│   ├── 14-notifications-audit.spec.ts ← audit log + notifications
│   ├── 15-sales.spec.ts            ← module Ventes / POS
│   ├── 16-responsive.spec.ts       ← 7 viewports
│   ├── 17-pwa.spec.ts              ← manifest, SW, installable
│   ├── 20-workflow-e2e.spec.ts     ← parcours complet admin → tech → accueil → stagiaire
│   └── 99-report.spec.ts           ← agrège résultats + génère rapport markdown
├── helpers/
│   ├── auth.ts                     ← loginWithPin, switchUser, logout
│   ├── seed.ts                     ← buildLicensedState, buildFullDataset
│   ├── selectors.ts                ← raccourcis locator
│   ├── permissions.ts              ← expectVisibleForRole, expectHidden
│   └── report.ts                   ← collecte de checks, agrégation
├── fixtures/
│   └── data.ts                     ← noms, appareils, prix réalistes
└── legacy/                         ← anciens audits monolithiques (préservés)
```

---

## ✅ Avant tout audit

```bash
# 1. Build TypeScript (no errors)
npx tsc --noEmit

# 2. Build de production
npm run build

# 3. Démarrer le serveur (Playwright peut aussi le faire via webServer)
npm run dev

# 4. Lancer la suite
npx playwright test
```
