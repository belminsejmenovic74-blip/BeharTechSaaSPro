# Design QA — widget et réglages atelier

- Source sélecteur : `/var/folders/y2/0l9d6j_50gz9723lgrnl6lyw0000gn/T/codex-clipboard-a2eea826-5a8e-49a5-b2c4-d2d6034d0287.png`
- Sélecteur production : `/private/tmp/behar-widget-selector-production-final-b.png`
- Comparaison combinée : `/private/tmp/behar-widget-selector-design-qa-comparison.png`
- CMS widget production : `/private/tmp/behar-widget-cms-production.png`
- CMS widget téléphone : `/private/tmp/behar-widget-cms-phone-production.png`
- Réglages horaires production : `/private/tmp/behar-settings-hours-production.png`
- Viewport contrôlé : 1280 × 720.

## Résultat visuel

- Le sélecteur reprend la structure en quatre zones de la référence : appareil, marque, modèle, bouton d’action.
- Fond blanc, bordures fines, grands rayons et ombre douce conservés ; aucune grande grille de catégories grise n’est affichée.
- Les sélections utilisent la couleur de marque turquoise sur fond blanc. Le bouton désactivé reste volontairement gris clair comme dans la référence.
- Le widget complet utilise les mêmes trois sélecteurs natifs et propose les vues ordinateur, tablette et téléphone dans le CMS.
- La fenêtre d’installation animée a été contrôlée avec le vrai code HTML et les actions fermer/copier.
- Les réglages sont regroupés en quatre rubriques et l’éditeur d’horaires affiche matin, pause, après-midi, jours ouverts et jours fermés.

## Vérifications fonctionnelles

1. iPhone 17, iPhone 17 Pro, iPhone 17 Pro Max et iPhone 17e présents dans le sélecteur Apple.
2. Fonction Supabase `widget_available_slots` migrée et contrôlée en production.
3. Le lundi 13 juillet 2026 renvoie bien des créneaux le jour même, de 09:00 à 17:30 pour l’atelier actif.
4. Les plages structurées publient la pause du midi et toutes les heures configurées, y compris avant 09:00 ou après 18:00.
5. Build Next.js de production réussi, 18 tests ciblés réussis, aucune erreur console sur les réglages ou le sélecteur.
6. Aucun défaut P0/P1/P2 observé : pas de chevauchement, découpe bloquante, contrôle cassé ou fond gris indésirable.

final result: passed
