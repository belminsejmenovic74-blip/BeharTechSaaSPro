# Configuration Supabase Behar Tech Pro

## 1. Variables d'environnement

Ajouter ces variables en local et dans Vercel :

```env
PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="votre-cle-anon-publishable"
VITE_SUPABASE_URL="https://votre-projet.supabase.co"
VITE_SUPABASE_ANON_KEY="votre-cle-anon-publishable"
```

Le projet accepte les deux préfixes pour rester compatible avec les helpers existants.

## 2. Base de données

Exécuter les SQL :

```text
supabase/migrations/create_client_onboarding.sql
supabase/migrations/create_visual_cms.sql
```

Le premier script crée :

- `client_profiles`
- `team_invitations`
- génération unique de clé `BTP-XXXX-XXXX-XXXX`
- trigger de création automatique du profil après inscription
- RLS propriétaire pour profil et invitations
- lecture admin via `app_metadata.role = "admin"`

Le second script crée le vrai CMS visuel Supabase :

- `cms_pages`
- `cms_sections`
- `cms_elements`
- `cms_assets`
- `cms_versions`
- `cms_settings`
- `cms_admin_config`
- `cms_admin_sessions`
- bucket Storage `cms-assets`
- RPC `cms_admin_login`, `cms_get_draft`, `cms_save_draft`, `cms_publish`, `cms_get_published`
- RLS : le public lit uniquement les versions publiées, l’admin écrit via session CMS

Mot de passe admin initial du CMS : `behar-admin`.
À changer dans Supabase en mettant à jour `cms_admin_config.password_hash`.

## 3. Auth e-mail directe

Pour que le client crée son compte et passe directement à la configuration sans mail :

```text
Supabase > Authentication > Providers > Email
Disable: Confirm email
```

Le site tente une création directe avec session immédiate. Si Supabase continue à renvoyer une confirmation e-mail, c’est que ce réglage est encore actif côté dashboard Supabase.

## 4. Auth Google

Dans Supabase Auth > Providers > Google :

- activer Google
- renseigner le Client ID et Client Secret Google

Dans Google Cloud OAuth, ajouter :

```text
Authorized JavaScript origins:
http://localhost:5173
https://behartechpro.fr

Authorized redirect URIs:
https://<project-ref>.supabase.co/auth/v1/callback
```

Dans Supabase Auth > URL Configuration :

```text
Site URL:
https://behartechpro.fr

Redirect URLs:
http://localhost:5173/auth/callback
https://behartechpro.fr/auth/callback
https://behar-tech-saa-s-pro.vercel.app/auth/callback
```

Le site utilise un flow implicite Supabase côté navigateur, adapté au build statique SvelteKit.
