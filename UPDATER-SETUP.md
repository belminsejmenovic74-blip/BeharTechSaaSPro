# Mise à jour automatique de l'app desktop (Tauri Updater)

Procédure à faire **une seule fois** pour activer le système de mise
à jour auto des binaires Mac/Windows. Après ça, chaque `git push`
de tag `v*` produit automatiquement un manifeste signé que les apps
installées chez tes clients utiliseront pour se mettre à jour.

## Comment ça marche

1. Tu pushes un tag `v1.1.0`.
2. GitHub Actions build les `.exe` + `.dmg` + signe un manifeste `latest.json`.
3. Tout est publié dans GitHub Releases.
4. L'app installée chez ton client (n'importe quelle version précédente)
   vérifie l'URL `latest.json` → voit la nouvelle version → propose
   "Télécharger et installer" → applique → relance l'app sur la 1.1.0.
5. Tu n'as plus rien à faire — la version Vercel + les apps desktop se
   mettent à jour automatiquement.

L'update est **signée cryptographiquement** : seul un binaire produit
par ta clé privée peut être installé. Un attaquant qui pirate
GitHub Releases ne peut pas faire avaler un faux update à tes clients.

## Setup initial (à faire une fois)

### 1. Générer la paire de clés Tauri

Sur ton Mac, dans un terminal **à la racine du projet** :

```bash
npx tauri signer generate --write-keys ~/.tauri/behar-tech-pro
```

Il te demande un **mot de passe** : choisis-en un fort (note-le quelque
part, perdu = tu perds la capacité de signer les futures updates et tu
devras tout recommencer).

Deux fichiers sont créés :

- `~/.tauri/behar-tech-pro.key` ← **PRIVÉ**, à NE JAMAIS commit
- `~/.tauri/behar-tech-pro.key.pub` ← public, à coller dans la config

Vérifie qu'ils existent :

```bash
ls -la ~/.tauri/
```

### 2. Coller la clé publique dans tauri.conf.json

Ouvre `~/.tauri/behar-tech-pro.key.pub` :

```bash
cat ~/.tauri/behar-tech-pro.key.pub
```

Tu vois une longue ligne base64 (genre `dW50cnVzdGVkIGNvbW1lbnQ6IH...`).

Ouvre `src-tauri/tauri.conf.json`, trouve :

```json
"pubkey": "REPLACE_ME_WITH_PUBLIC_KEY_FROM_npx_tauri_signer_generate"
```

et remplace `REPLACE_ME_...` par le contenu du fichier `.key.pub`.

Commit + push :

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore(updater): set production public key"
git push origin main
```

### 2 bis. Ajouter les variables d'env au workflow GitHub Actions

Le fichier `.github/workflows/tauri-release.yml` doit recevoir les
clés de signature. Édite-le directement sur GitHub (ou en local si
ton token a le scope `workflow`).

Sur GitHub web → ouvre `.github/workflows/tauri-release.yml` → bouton crayon →
remplace le bloc `env:` du step "Build the Tauri app" par :

```yaml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

Commit directement sur `main` via l'interface GitHub.

### 3. Ajouter les secrets dans GitHub

Va sur :
**https://github.com/belminsejmenovic74-blip/BeharTechSaaSPro/settings/secrets/actions**

Clique **New repository secret**. Crée **deux** secrets :

#### `TAURI_SIGNING_PRIVATE_KEY`

Contenu : tout le fichier `~/.tauri/behar-tech-pro.key`. Pour le copier
proprement :

```bash
cat ~/.tauri/behar-tech-pro.key | pbcopy
```

(la commande copie dans le presse-papier sur Mac)

Puis colle dans le champ Value du secret.

#### `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Le mot de passe que tu as choisi à l'étape 1.

Si tu n'as pas mis de mot de passe, mets `""` (chaîne vide) — ou ne
crée pas ce secret du tout, le workflow gère le cas.

### 4. Tester

Push un tag :

```bash
git tag v1.1.0
git push origin v1.1.0
```

Va voir sur **Actions** : le workflow doit passer en vert.

Puis sur **Releases > v1.1.0**, tu dois voir, en plus des installateurs
habituels :

```
latest.json          ← le manifeste de mise à jour
BeharTechPro_..._setup.exe.sig
BeharTechPro_..._universal.dmg.sig
```

C'est tout. Les apps installées chez tes clients pointent sur
`https://github.com/belminsejmenovic74-blip/BeharTechSaaSPro/releases/latest/download/latest.json`
et trouveront automatiquement v1.1.0.

## Mise à jour de routine (à chaque nouvelle version)

```bash
# 1. Tu fais tes modifs dans le code (par exemple bouton "Supprimer répa")
# 2. Tu bumps la version :
#    - src-tauri/Cargo.toml         → version = "1.1.1"
#    - src-tauri/tauri.conf.json    → "version": "1.1.1"
#    - package.json                  → "version": "1.1.1"

# 3. Commit + tag :
git add -A
git commit -m "feat: nouveau bouton supprimer répa"
git tag v1.1.1
git push origin main
git push origin v1.1.1

# 4. Attendre que GitHub Actions termine (~15 min).
# 5. Les apps de tes clients verront la nouvelle version au prochain
#    clic sur "Vérifier les mises à jour" dans Paramètres.
```

## Côté utilisateur (ton client)

Dans Behar Tech Pro desktop :

1. **Paramètres** → bloc "Mises à jour de l'application"
2. Clic sur **Vérifier les mises à jour**
3. Si nouvelle version → bouton **Télécharger et installer** apparaît
4. Clic → download (barre de progression) → installation → l'app se
   relance automatiquement sur la nouvelle version.

Aucune réinstallation manuelle, aucun .exe à retélécharger, rien à
faire à part cliquer.

## Dépannage

### Le workflow GitHub Actions échoue avec "could not load signing key"

→ Le secret `TAURI_SIGNING_PRIVATE_KEY` n'est pas configuré, ou son
contenu n'est pas le contenu COMPLET du fichier `.key` (clé privée).

### L'app dit "Aucune mise à jour" alors que la nouvelle version est sortie

→ Le manifeste `latest.json` n'est peut-être pas encore publié.
Vérifie sur GitHub Releases. Note : la release doit être publique
(pas draft).

### L'app dit "Signature invalide"

→ La clé publique dans `tauri.conf.json` ne correspond pas à la
privée utilisée pour signer. Re-vérifie l'étape 2.

### Je veux héberger latest.json sur IONOS au lieu de GitHub

Édite `src-tauri/tauri.conf.json` et change l'`endpoint` :

```json
"endpoints": [
  "https://ton-domaine.fr/downloads/latest.json"
]
```

Et copie `latest.json` + les fichiers `.sig` manuellement dans
`htdocs/downloads/` via FileZilla après chaque release.

Note : GitHub Releases reste plus simple parce que c'est auto.

## J'ai perdu ma clé privée — que faire ?

C'est embêtant : tu ne peux plus signer de nouvelles updates pour les
apps installées. Procédure :

1. Génère une nouvelle paire (étape 1).
2. Mets à jour la `pubkey` dans tauri.conf.json (étape 2).
3. Mets à jour le secret GitHub `TAURI_SIGNING_PRIVATE_KEY` (étape 3).
4. ⚠️ **Les apps déjà installées ne pourront plus se mettre à jour
   automatiquement** car elles ont l'ancienne clé publique. Tes clients
   devront retélécharger manuellement la dernière version depuis
   ton site, qui contiendra la nouvelle clé publique. Ensuite tout
   marchera de nouveau.

Donc : **sauvegarde bien ta clé** (gestionnaire de mots de passe,
backup chiffré, etc.). Note aussi le mot de passe.
