# Behar Tech Pro — Rapport QA Playwright complet

_Généré le 2026-06-23T18:53:16.382Z — durée 562.6 s_

## Résumé
- **Score global** : 45/100
- **Checkpoints** : 22
- OK : 9
- FAIL : 9
- PARTIAL : 2
- BLOCKED : 2
- P0 : 1
- P1 : 2
- P2 : 1

## Verdict
PAS VENDABLE — bloqueurs P0 à corriger avant toute vente.

## P0 (bloqueurs)
### QA-03.3 — Facture liée à la réparation = 119 € (et non 29 €)
- **Module** : Facturation
- **Statut** : FAIL (P0)
- **Obtenu** : Aucune facture trouvée pour cette réparation — bouton UI non accessible (à vérifier manuellement)
- **Capture** : qa-results/screenshots/1782240361003-qa-03.3.png
- **Impact business** : Manque à gagner 90 € par réparation — fraude comptable involontaire.

## P1 (importants)
### QA-05.2 — Boutons OS désactivés (Windows / Mac / Linux)
- **Module** : Téléchargement
- **Statut** : FAIL (P1)
- **Obtenu** : [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('button:has-text("Windows")').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 15000ms[22m
[2m  - waiting for locator('button:has-text("Windows")').first()[22m

- **Capture** : qa-results/screenshots/1782240443673-qa-05.2.png
### QA-08.2 — Système de rôles détecté — checks détaillés à scripter manuellement
- **Module** : Permissions
- **Statut** : PARTIAL (P1)
- **Obtenu** : Module détecté mais flux Stagiaire non automatisé dans cette mission.

## P2 (mineurs)
### QA-03.1 — Création réparation 90+29 via seed (fallback UI)
- **Module** : Réparations
- **Statut** : PARTIAL (P2)
- **Obtenu** : Création seed direct, formulaire non scripté pour cette mission.

## Données créées
- Clients : 30
- Stock : 100
- Réparations : 51
- Devis : 50
- Factures : 40
- Paiements : 30
- Rendez-vous : 20
- Anti-litige : 0

## Top 10 corrections prioritaires
1. **[P0]** Facture liée à la réparation = 119 € (et non 29 €) — Facturation
2. **[P1]** Boutons OS désactivés (Windows / Mac / Linux) — Téléchargement
3. **[P1]** Système de rôles détecté — checks détaillés à scripter manuellement — Permissions
4. **[P2]** Création réparation 90+29 via seed (fallback UI) — Réparations

## Conclusion
PAS VENDABLE — bloqueurs P0 à corriger avant toute vente.
