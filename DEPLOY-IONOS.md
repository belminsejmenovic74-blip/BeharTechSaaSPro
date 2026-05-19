# Déploiement Behar Tech Pro sur IONOS via FileZilla

Guide pas-à-pas pour héberger l'application web et les installateurs
desktop sur un hébergement mutualisé IONOS.

## Sommaire

1. Build du site web statique
2. Préparation des binaires desktop
3. Configuration FileZilla
4. Upload sur IONOS
5. Mises à jour ultérieures
6. Dépannage

---

## 1. Build du site web

Dans un terminal, à la racine du projet :

```bash
npm install --legacy-peer-deps
npm run build
```

Le dossier `out/` est généré. **C'est tout son contenu** que tu vas
uploader sur IONOS. Pas le code source, pas `src/`, pas `node_modules/`.

Le `out/` contient :

```
out/
├── index.html                      ← page d'accueil
├── telecharger/index.html          ← page de téléchargement
├── dashboard/                      ← l'app SaaS complète
│   ├── index.html
│   ├── reparations/index.html
│   ├── clients/index.html
│   └── ...
├── _next/                          ← bundles JS / CSS
├── downloads/                      ← les .exe / .dmg (à remplir, voir étape 2)
└── assets/                         ← logos, icônes
```

---

## 2. Préparation des binaires desktop (.exe / .dmg)

Le `npm run build` ne génère **pas** les installateurs desktop : il
faut les construire séparément.

### Option A — Via GitHub Actions (recommandée, gratuit)

```bash
git tag v1.0.0
git push origin v1.0.0
```

Attends ~15 minutes que le workflow `tauri-release` termine sur
https://github.com/belminsejmenovic74-blip/BeharTechSaaSPro/actions

Puis va sur https://github.com/belminsejmenovic74-blip/BeharTechSaaSPro/releases/latest
et télécharge :

- `BeharTechPro_1.0.0_x64-setup.exe`
- `BeharTechPro_1.0.0_universal.dmg`

### Option B — Build local (Mac uniquement pour le .dmg)

```bash
npm run tauri:build
```

Le `.dmg` se trouve dans `src-tauri/target/release/bundle/dmg/`.
Le `.exe` nécessite une machine Windows.

### Renommage et placement

Renomme les fichiers pour qu'ils correspondent à ce que la page
`/telecharger` attend (voir `APP_VERSION` dans
`src/app/(external)/telecharger/page.tsx`) :

```bash
# Depuis le dossier où sont les binaires
mv BeharTechPro_1.0.0_x64-setup.exe   BeharTechPro-1.0.0-windows.exe
mv BeharTechPro_1.0.0_universal.dmg   BeharTechPro-1.0.0-mac.dmg
```

Puis copie-les dans `out/downloads/` (le dossier a été créé
automatiquement par le build via `public/downloads/`) :

```bash
cp BeharTechPro-1.0.0-windows.exe out/downloads/
cp BeharTechPro-1.0.0-mac.dmg     out/downloads/
```

Maintenant `out/` est prêt à uploader.

---

## 3. Configuration FileZilla

### Récupérer les identifiants IONOS

1. Connecte-toi à https://my.ionos.fr
2. **Hébergement** → choisis ton pack
3. **SFTP** (ou FTP selon le pack)
4. Note :
   - **Hôte / Serveur** : généralement `access-XXXXXXX.webspace-data.io` ou `home.XXX.X-IO.fr`
   - **Utilisateur** : `uXXXXXXXX` ou un email
   - **Mot de passe** : celui défini dans IONOS
   - **Port** : 22 pour SFTP (recommandé), 21 pour FTP

### Configurer la connexion dans FileZilla

1. Ouvre FileZilla → **Fichier → Gestionnaire de sites**
2. **Nouveau site** → nomme-le `Behar Tech IONOS`
3. Renseigne :
   - **Protocole** : `SFTP - SSH File Transfer Protocol`
   - **Hôte** : ton serveur IONOS
   - **Port** : 22
   - **Type d'authentification** : `Normale`
   - **Identifiant** + **Mot de passe**
4. **Connexion**

Tu vois deux panneaux : à gauche ton Mac, à droite IONOS.

---

## 4. Upload sur IONOS

### Naviguer vers le bon dossier sur IONOS

Le dossier racine du site web s'appelle généralement :

- `/htdocs/` (cas le plus fréquent IONOS)
- `/public_html/`
- `/www/`

→ Double-clique dans le panneau de droite jusqu'à voir ce dossier.

### Uploader

⚠️ **Important** : tu veux que le **contenu** de `out/` arrive
directement dans `htdocs/`, **pas** un dossier `out` à l'intérieur.

1. Dans FileZilla, panneau de gauche, navigue jusqu'à
   `~/Downloads/BeharTecjSaaS-main/out/`
2. **Sélectionne tout** (Cmd+A) — fichiers + sous-dossiers
3. Glisse vers le panneau de droite, dans `htdocs/`
4. Attendre la fin de l'upload (5-10 min selon ta connexion)

À la fin, sur IONOS tu dois avoir :

```
htdocs/
├── index.html
├── telecharger/
├── dashboard/
├── _next/
├── downloads/
│   ├── BeharTechPro-1.0.0-windows.exe
│   ├── BeharTechPro-1.0.0-mac.dmg
│   └── README.md
└── assets/
```

### Ajouter un .htaccess (recommandé)

Crée un fichier `.htaccess` à côté de `index.html` avec ce contenu
pour servir les fichiers binaires en téléchargement direct :

```apache
# Force download des installateurs au lieu d'ouvrir dans le navigateur
<FilesMatch "\.(exe|dmg|msi|deb|AppImage)$">
  Header set Content-Disposition "attachment"
  Header set Content-Type "application/octet-stream"
</FilesMatch>

# Cache long des assets JS/CSS hashés par Next
<FilesMatch "\.(js|css|woff2|png|jpg|jpeg|svg|webp)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Réécriture pour les pages Next.js avec trailingSlash
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.+)/?$ /$1/index.html [L]

# Erreur 404 personnalisée (utilise la page Next.js)
ErrorDocument 404 /404.html
```

---

## 5. Tester

Ouvre dans ton navigateur :

- `https://ton-domaine.fr/` → l'accueil
- `https://ton-domaine.fr/telecharger/` → la page de download
- `https://ton-domaine.fr/dashboard/` → l'app
- `https://ton-domaine.fr/downloads/BeharTechPro-1.0.0-windows.exe` → doit lancer un téléchargement direct

Si tout marche → tu peux donner le lien
`https://ton-domaine.fr/telecharger/` à tes clients.

---

## 6. Mises à jour ultérieures

### Tu changes du code dans l'app

```bash
npm run build
# Puis upload le contenu de out/ via FileZilla, écrase l'existant.
```

### Tu sors une nouvelle version desktop (.exe / .dmg)

```bash
git tag v1.1.0
git push origin v1.1.0
# Attendre ~15 min, télécharger depuis GitHub Releases,
# renommer en BeharTechPro-1.1.0-windows.exe / .dmg
# Mettre à jour APP_VERSION = "1.1.0" dans:
#   src/app/(external)/telecharger/page.tsx
# Rebuild et re-upload.
```

### Tu ajoutes seulement de nouveaux binaires

Pas besoin de tout re-uploader : dépose juste les nouveaux fichiers
dans `htdocs/downloads/` via FileZilla.

---

## 6. Dépannage

### Erreur 403 Forbidden sur les pages

→ Souvent un problème de permissions. Sur IONOS, dans FileZilla :
clic droit sur le dossier → **Permissions du fichier** → `755` pour les
dossiers, `644` pour les fichiers.

### Les URLs comme `/dashboard` donnent 404

→ Vérifie que ton `out/` contient bien des dossiers
`dashboard/index.html` (pas un fichier `dashboard.html`). C'est le rôle
du `trailingSlash: true` dans `next.config.mjs`.

→ Vérifie aussi que le `.htaccess` est bien uploadé (FileZilla cache
parfois les fichiers commençant par `.` → Affichage → Fichiers cachés).

### Le .exe / .dmg s'ouvre dans le navigateur au lieu de se télécharger

→ Le `.htaccess` n'est pas pris en compte. Vérifie qu'IONOS supporte
le mod_headers (devrait être OK sur la plupart des packs).

### Connexion FileZilla refusée

→ Vérifie le port (22 pour SFTP, 21 pour FTP).
→ Vérifie que tu n'as pas activé "FTP sur TLS" alors que c'est du FTP
classique.
→ IONOS peut bloquer après plusieurs essais ratés : attends 15 min.

### "Le fichier n'existe pas" sur /downloads/BeharTechPro...

→ Les binaires ne sont pas dans le bon dossier sur IONOS. Vérifie via
FileZilla qu'ils sont dans `htdocs/downloads/` (pas `htdocs/` directement).

---

## Commande rapide récap

```bash
# 1. Build du site
npm run build

# 2. (Optionnel) si on génère localement les binaires
npm run tauri:build
cp src-tauri/target/release/bundle/dmg/*.dmg out/downloads/BeharTechPro-1.0.0-mac.dmg

# 3. Ouvrir FileZilla, sélectionner tout dans out/, glisser dans htdocs/
```

Pour une mise à jour rapide :

```bash
npm run build && open out
# Glisser le contenu dans FileZilla
```
