# Dossier public/downloads

Ce dossier contient les binaires desktop servis depuis la page
`/telecharger` :

- `BeharTechPro-1.0.1-windows.exe` — installateur Windows NSIS
- `BeharTechPro-1.0.1-mac.dmg`     — image disque macOS universelle

## Comment mettre à jour les binaires

1. Builder localement (Mac → .dmg) ou via GitHub Actions (Windows + Mac + Linux)
2. Récupérer les fichiers générés
3. Renommer en respectant le format `BeharTechPro-<version>-<plateforme>.<ext>`
4. Déposer ici (ou directement sur IONOS via FileZilla dans `htdocs/downloads/`)
5. Mettre à jour `APP_VERSION` dans
   `src/app/(external)/telecharger/page.tsx` si la version change.

## Ne pas committer les binaires lourds dans Git

Les `.exe` / `.dmg` font 10-30 Mo. À déposer directement sur IONOS
plutôt que de polluer Git. Voir `DEPLOY-IONOS.md` à la racine.
