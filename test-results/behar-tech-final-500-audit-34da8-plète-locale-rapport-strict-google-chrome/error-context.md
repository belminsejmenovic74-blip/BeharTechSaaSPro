# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: behar-tech-final-500-audit.spec.ts >> Audit Playwright final 500 points Behar Tech Pro >> journée atelier complète locale + rapport strict
- Location: tests/behar-tech-final-500-audit.spec.ts:878:7

# Error details

```
TimeoutError: locator.fill: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: /Nom de l'atelier/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [active]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - navigation [ref=e7]:
            - button "previous" [disabled] [ref=e8]:
              - img "previous" [ref=e9]
            - generic [ref=e11]:
              - generic [ref=e12]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e13]:
              - img "next" [ref=e14]
          - img
        - generic [ref=e16]:
          - link "Next.js 16.2.4 (stale) Turbopack" [ref=e17] [cursor=pointer]:
            - /url: https://nextjs.org/docs/messages/version-staleness
            - img [ref=e18]
            - generic "There is a newer version (16.2.6) available, upgrade recommended!" [ref=e20]: Next.js 16.2.4 (stale)
            - generic [ref=e21]: Turbopack
          - img
      - dialog "Runtime ReferenceError" [ref=e23]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e30]: Runtime ReferenceError
              - generic [ref=e31]:
                - button "Copy Error Info" [ref=e32] [cursor=pointer]:
                  - img [ref=e33]
                - button "No related documentation found" [disabled] [ref=e35]:
                  - img [ref=e36]
                - button "Attach Node.js inspector" [ref=e38] [cursor=pointer]:
                  - img [ref=e39]
            - generic [ref=e48]: InstallAppLink is not defined
          - generic [ref=e49]:
            - generic [ref=e50]:
              - paragraph [ref=e52]:
                - img [ref=e54]
                - generic [ref=e57]: src/app/(main)/dashboard/parametres/page.tsx (588:12) @ SettingsPage
                - button "Open in editor" [ref=e58] [cursor=pointer]:
                  - img [ref=e60]
              - generic [ref=e63]:
                - generic [ref=e64]: 586 | </SecondaryButton>
                - generic [ref=e65]: 587 | </div>
                - generic [ref=e66]: "> 588 | <InstallAppLink />"
                - generic [ref=e67]: "| ^"
                - generic [ref=e68]: 589 | <button type="button" className="mt-3 flex items-center gap-1.5 text-[12px] tex...
                - generic [ref=e69]: "590 | disabled={!canBackupData}"
                - generic [ref=e70]: "591 | onClick={() => {"
            - generic [ref=e71]:
              - generic [ref=e72]:
                - paragraph [ref=e73]:
                  - text: Call Stack
                  - generic [ref=e74]: "16"
                - button "Show 15 ignore-listed frame(s)" [ref=e75] [cursor=pointer]:
                  - text: Show 15 ignore-listed frame(s)
                  - img [ref=e76]
              - generic [ref=e78]:
                - generic [ref=e79]:
                  - text: SettingsPage
                  - button "Open SettingsPage in editor" [ref=e80] [cursor=pointer]:
                    - img [ref=e81]
                - text: src/app/(main)/dashboard/parametres/page.tsx (588:12)
        - generic [ref=e83]: "1"
        - generic [ref=e84]: "2"
    - generic [ref=e89] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e90]:
        - img [ref=e91]
      - generic [ref=e94]:
        - button "Open issues overlay" [ref=e95]:
          - generic [ref=e96]:
            - generic [ref=e97]: "0"
            - generic [ref=e98]: "1"
          - generic [ref=e99]: Issue
        - button "Collapse issues badge" [ref=e100]:
          - img [ref=e101]
  - generic [ref=e104]:
    - img [ref=e105]
    - heading "This page couldn’t load" [level=1] [ref=e107]
    - paragraph [ref=e108]: Reload to try again, or go back.
    - generic [ref=e109]:
      - button "Reload" [ref=e111] [cursor=pointer]
      - button "Back" [ref=e112] [cursor=pointer]
```

# Test source

```ts
  934  |       "Authentification",
  935  |       "carte utilisateur Technicien (Nadir) visible",
  936  |       await visible(page, /Nadir|Technicien/i) ? "OK" : "BUG",
  937  |       "P1",
  938  |     );
  939  |     add(
  940  |       "Authentification",
  941  |       "carte utilisateur Accueil (Lina) visible",
  942  |       await visible(page, /Lina|Accueil/i) ? "OK" : "BUG",
  943  |       "P1",
  944  |     );
  945  | 
  946  |     // Click on the admin card → PIN screen, validate "Bonjour <prénom>" greeting
  947  |     const adminCard = page.getByRole("button").filter({ hasText: /Belmin/i }).first();
  948  |     if (await adminCard.isVisible().catch(() => false)) {
  949  |       await adminCard.click();
  950  |       add(
  951  |         "Authentification",
  952  |         "écran PIN affiche 'Bonjour Belmin'",
  953  |         await visible(page, /Bonjour Belmin/i) ? "OK" : "BUG",
  954  |         "P1",
  955  |       );
  956  |       add(
  957  |         "Authentification",
  958  |         "message d'humour rôle visible (entre guillemets)",
  959  |         await visible(page, /«.+»/) ? "OK" : "BUG",
  960  |         "P2",
  961  |       );
  962  |       // Type wrong PIN
  963  |       for (const digit of ["9", "9", "9", "9"]) {
  964  |         await page.getByRole("button", { name: new RegExp(`^${digit}$`) }).click().catch(() => undefined);
  965  |       }
  966  |       add(
  967  |         "Authentification",
  968  |         "PIN incorrect refusé avec message d'erreur",
  969  |         await visible(page, /incorrect|invalide/i) ? "OK" : "BUG",
  970  |         "P0",
  971  |       );
  972  |       // Bon PIN
  973  |       for (const digit of ["0", "0", "0", "0"]) {
  974  |         await page.getByRole("button", { name: new RegExp(`^${digit}$`) }).click().catch(() => undefined);
  975  |       }
  976  |     } else {
  977  |       add("Authentification", "carte admin cliquable", "NON TESTABLE", undefined, "Carte admin introuvable.");
  978  |     }
  979  |     // === END NEW PIN gate checks ===
  980  | 
  981  |     const stateSeed = buildLicensedEmptyState();
  982  |     await writeState(page, stateSeed);
  983  |     await page.goto(TARGET_URL);
  984  |     const dashboardReady = await page
  985  |       .getByRole("link", { name: /Tableau de bord/i })
  986  |       .waitFor({ state: "visible", timeout: 20_000 })
  987  |       .then(() => true)
  988  |       .catch(() => false);
  989  |     if (!dashboardReady) {
  990  |       add(
  991  |         "P0 Chargement",
  992  |         "l'application sort du loader après état local seedé",
  993  |         "BUG",
  994  |         "P0",
  995  |         "Après injection d'un état local valide, /dashboard/ reste bloqué sur Chargement. Vente pilote impossible tant que ce gate ne sort pas correctement.",
  996  |       );
  997  |       await writeFinalReport(checks, screenshots, stateSeed, consoleErrors);
  998  |       testInfo.attachments.push({ name: "rapport-audit-final", path: REPORT_PATH, contentType: "text/markdown" });
  999  |       return;
  1000 |     }
  1001 |     add("Licence", "accès dashboard après activation/configuration", "OK");
  1002 | 
  1003 |     await createStockItemViaUi(page);
  1004 |     add("Stock", "pièce créée depuis l'UI sans seed produit", await visible(page, /Écran UI iPhone 13/i) ? "OK" : "BUG", "P0");
  1005 | 
  1006 |     await createRepairClientQuoteViaUi(page);
  1007 |     let uiState = await getState(page);
  1008 |     add("Clients", "client créé depuis l'UI", uiState.customers?.some((customer: any) => customer.name === "Client UI Audit") ? "OK" : "BUG", "P0");
  1009 |     add("Réparations", "réparation créée depuis l'UI", (uiState.repairs?.length ?? 0) >= 1 && uiState.repairs?.some((repair: any) => repair.customerId) ? "OK" : "BUG", "P0");
  1010 |     add("Devis", "devis créé depuis le flow UI réparation", (uiState.quotes?.length ?? 0) >= 1 ? "OK" : "BUG", "P0");
  1011 | 
  1012 |     await completeInvoicePaymentViaUi(page);
  1013 |     uiState = await getState(page);
  1014 |     add("Factures", "facture créée depuis l'UI", (uiState.invoices?.length ?? 0) >= 1 ? "OK" : "BUG", "P0");
  1015 |     add("Paiements", "paiement encaissé depuis l'UI", (uiState.payments?.length ?? 0) >= 1 ? "OK" : "BUG", "P0");
  1016 |     add("Documents/PDF", "documents générés par flows UI", (uiState.documents?.length ?? 0) >= 1 ? "OK" : "BUG", "P1");
  1017 | 
  1018 |     await topUpAuditVolume(page);
  1019 |     await page.goto(TARGET_URL);
  1020 |     const state = await getState(page);
  1021 |     addStoreChecks(add, state);
  1022 | 
  1023 |     await assertVisibleCheck(page, add, "Dashboard", "titre/dashboard visible", /Réparations|CA encaissé|Tableau de bord/i, "P1");
  1024 |     await assertVisibleCheck(page, add, "Dashboard", "activité récente visible", /Activité récente/i, "P2");
  1025 |     await assertVisibleCheck(page, add, "Dashboard", "stock bas ou widgets visibles", /Stock faible|Réparations en cours|Montant à encaisser/i, "P2");
  1026 | 
  1027 |     await page.goto(`${BASE_URL}/dashboard/parametres`);
  1028 |     add("Paramètres", "page Réglages visible", await headingVisible(page, /Réglages/i) ? "OK" : "BUG", "P1");
  1029 |     for (const label of [/Identité atelier/i, /Coordonnées/i, /Informations légales/i, /TVA & documents/i, /Logo & apparence/i, /Licence/i, /Install(?:er|ation de) l.?application/i, /Sauvegarde & export/i]) {
  1030 |       add("Paramètres", `section ${label} visible`, await visible(page, label) ? "OK" : "BUG", "P2");
  1031 |     }
  1032 |     add("Paramètres", "clé licence masquée", await visible(page, /BHT-BEHA••/i) ? "OK" : "BUG", "P1");
  1033 |     add("Paramètres", "champ technique Logo URL absent", !(await visible(page, /Logo URL|data URI/i)) ? "OK" : "BUG", "P1");
> 1034 |     await page.getByRole("textbox", { name: /Nom de l'atelier/i }).fill("hj");
       |                                                                    ^ TimeoutError: locator.fill: Timeout 20000ms exceeded.
  1035 |     await page.getByRole("textbox", { name: /SIRET/i }).fill("00000000000000");
  1036 |     await page.getByRole("button", { name: /Enregistrer/i }).click();
  1037 |     add("Paramètres", "nom atelier invalide refusé", await visible(page, /nom d'atelier réel/i) ? "OK" : "BUG", "P1");
  1038 |     add("Paramètres", "SIRET invalide refusé", await visible(page, /SIRET obligatoire/i) ? "OK" : "BUG", "P1");
  1039 |     await page.getByRole("textbox", { name: /Nom de l'atelier/i }).fill("Atelier Final Audit Persisté");
  1040 |     await page.getByRole("textbox", { name: /SIRET/i }).fill("91743685300021");
  1041 |     await page.getByRole("button", { name: /Enregistrer/i }).click();
  1042 |     add("Paramètres", "message paramètres enregistrés", await visible(page, /Paramètres enregistrés/i) ? "OK" : "BUG", "P1");
  1043 |     await page.reload();
  1044 |     await expect(page.getByRole("textbox", { name: /Nom de l'atelier/i })).toHaveValue("Atelier Final Audit Persisté");
  1045 |     add("Paramètres", "nom atelier persisté refresh", "OK");
  1046 | 
  1047 |     await page.goto(`${BASE_URL}/dashboard/reparations`);
  1048 |     add("Réparations", "page réparations visible", await headingVisible(page, /Réparations/i) ? "OK" : "BUG", "P0");
  1049 |     await assertVisibleCheck(page, add, "Réparations", "Karim Haddad / iPhone 13 visible", /Karim Haddad|iPhone 13/i, "P1");
  1050 |     await assertVisibleCheck(page, add, "Réparations", "réparation diagnostic sans prix visible", /Diagnostic sans prix|MacBook/i, "P1");
  1051 | 
  1052 |     await page.goto(`${BASE_URL}/dashboard/clients`);
  1053 |     add("Clients", "page clients visible", await headingVisible(page, /Clients/i) ? "OK" : "BUG", "P1");
  1054 |     await assertVisibleCheck(page, add, "Clients", "client Karim Haddad visible", /Karim Haddad/i, "P1");
  1055 |     await assertVisibleCheck(page, add, "Clients", "client comptoir visible", /Client comptoir/i, "P2");
  1056 | 
  1057 |     await page.goto(`${BASE_URL}/dashboard/stock`);
  1058 |     add("Stock", "page stock visible", (await headingVisible(page, /Stock/i)) || (await visible(page, /Nouvelle pièce|Pièces, composants/i)) ? "OK" : "BUG", "P0");
  1059 |     await assertVisibleCheck(page, add, "Stock", "pièce Écran iPhone 13 visible", /Écran iPhone 13/i, "P1");
  1060 |     add("Stock", "prix achat visible admin", await page.getByRole("columnheader", { name: /Prix d'achat/i }).isVisible().catch(() => false) ? "OK" : "BUG", "P1");
  1061 |     add("Stock", "marge visible admin", await page.getByRole("columnheader", { name: /Marge/i }).isVisible().catch(() => false) ? "OK" : "BUG", "P1");
  1062 |     add("Stock", "fournisseur visible admin", await page.getByRole("columnheader", { name: /Fournisseur/i }).isVisible().catch(() => false) ? "OK" : "BUG", "P1");
  1063 | 
  1064 |     // === NEW: Stock UI improvements (ModelSelector + scroll fix) ===
  1065 |     // Select the first stock row → detail panel opens with form fields scrollable
  1066 |     const firstStockRow = page.getByRole("row").filter({ hasText: /Écran iPhone 13/i }).first();
  1067 |     if (await firstStockRow.isVisible().catch(() => false)) {
  1068 |       await firstStockRow.click();
  1069 |       // Detail panel fields must be visible (the panel had a flex-1 bug previously)
  1070 |       add(
  1071 |         "Stock",
  1072 |         "panneau détail affiche les champs (Référence, Type, Marque)",
  1073 |         (await visible(page, /Référence/i)) && (await visible(page, /Type/i)) && (await visible(page, /Marque/i)) ? "OK" : "BUG",
  1074 |         "P0",
  1075 |         "Régression à risque suite au refactor du scroll desktop (max-h-[calc(100vh-11rem)]).",
  1076 |       );
  1077 |       add(
  1078 |         "Stock",
  1079 |         "champ Stock actuel éditable visible",
  1080 |         await visible(page, /Stock actuel/i) ? "OK" : "BUG",
  1081 |         "P0",
  1082 |       );
  1083 |       add(
  1084 |         "Stock",
  1085 |         "actions Réapprovisionner/Utiliser visibles",
  1086 |         (await visible(page, /Réapprovisionner/i)) && (await visible(page, /Utiliser dans une réparation/i)) ? "OK" : "BUG",
  1087 |         "P1",
  1088 |       );
  1089 |       add(
  1090 |         "Stock",
  1091 |         "ModelSelector (champ Modèles avec input + datalist)",
  1092 |         (await page.locator('input[list^="models-list-"]').count()) > 0 ? "OK" : "PARTIEL",
  1093 |         undefined,
  1094 |         "Champ texte avec datalist HTML5 — sélecteur tag + ajout libre.",
  1095 |       );
  1096 |     } else {
  1097 |       add("Stock", "panneau détail testable", "NON TESTABLE", undefined, "Ligne stock introuvable pour ouvrir le panneau de détail.");
  1098 |     }
  1099 |     // === END Stock UI checks ===
  1100 | 
  1101 |     await switchUser(page, "user_nadir_technician");
  1102 |     await page.goto(`${BASE_URL}/dashboard/stock`);
  1103 |     add("Permissions", "technicien ne voit pas prix achat", (await page.getByRole("columnheader", { name: /Prix d'achat/i }).count()) === 0 ? "OK" : "BUG", "P1");
  1104 |     add("Permissions", "technicien ne voit pas marge", (await page.getByRole("columnheader", { name: /Marge/i }).count()) === 0 ? "OK" : "BUG", "P1");
  1105 |     add("Permissions", "technicien ne voit pas fournisseur", (await page.getByRole("columnheader", { name: /Fournisseur/i }).count()) === 0 ? "OK" : "BUG", "P1");
  1106 |     await page.goto(`${BASE_URL}/dashboard/parametres`);
  1107 |     add("Permissions", "technicien bloqué sur paramètres URL directe", await visible(page, /Paramètres non accessibles/i) ? "OK" : "BUG", "P1");
  1108 |     await switchUser(page, "user_belmin_admin");
  1109 | 
  1110 |     for (const route of [
  1111 |       ["/dashboard/rendez-vous", "Rendez-vous"],
  1112 |       ["/dashboard/devis", "Devis"],
  1113 |       ["/dashboard/factures", "Factures"],
  1114 |       ["/dashboard/paiements", "Paiements"],
  1115 |       ["/dashboard/documents", "Documents"],
  1116 |     ] as const) {
  1117 |       await page.goto(`${BASE_URL}${route[0]}`);
  1118 |       add(route[1], `page ${route[1]} visible`, await headingVisible(page, new RegExp(route[1], "i")) ? "OK" : "BUG", "P1");
  1119 |       add(route[1], `aucune erreur visible ${route[1]}`, !(await visible(page, /Application error|Unhandled Runtime Error|Failed to compile/i)) ? "OK" : "BUG", "P0");
  1120 |     }
  1121 | 
  1122 |     await page.goto(`${BASE_URL}/dashboard/documents`);
  1123 |     await assertVisibleCheck(page, add, "Documents/PDF", "bon de prise en charge présent", /Bon de prise en charge/i, "P1");
  1124 |     await assertVisibleCheck(page, add, "Documents/PDF", "devis présent", /Devis/i, "P1");
  1125 |     await assertVisibleCheck(page, add, "Documents/PDF", "facture présente", /Facture/i, "P1");
  1126 |     await assertVisibleCheck(page, add, "Documents/PDF", "reçu présent", /Reçu/i, "P1");
  1127 |     add("Documents/PDF", "PDF réels téléchargés et vérifiés %PDF", "PARTIEL", undefined, "Boutons présents dans l'UI, mais téléchargement exhaustif non exécuté dans cet audit rapide pour éviter faux positifs html2canvas.");
  1128 |     add("Sécurité", "documents client sans prix achat/marge/fournisseur", "PARTIEL", undefined, "Contrôlé par seed et masquage UI ; les octets PDF doivent être vérifiés dans un audit PDF dédié si nécessaire.");
  1129 | 
  1130 |     const persisted = await getState(page);
  1131 |     add("Persistance", "réparations persistées refresh/localStorage", persisted.repairs?.length >= 30 ? "OK" : "BUG", "P0");
  1132 |     add("Persistance", "stock persisté refresh/localStorage", persisted.stockItems?.length >= 50 ? "OK" : "BUG", "P1");
  1133 |     add("Persistance", "documents persistés refresh/localStorage", persisted.documents?.length >= 50 ? "OK" : "BUG", "P1");
  1134 | 
```