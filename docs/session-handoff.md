# SSO Behar Tech Pro

Le site public et le SaaS utilisent le même projet Supabase et le même
`workshops.id`. Le portail public conserve la session Supabase en cookies PKCE.
Lorsqu'un utilisateur ouvre une route du SaaS :

1. le site appelle `create_workshop_handoff()` avec la session Supabase ;
2. la base crée un nonce aléatoire de 64 caractères, valable deux minutes et à
   usage unique ;
3. le navigateur ouvre `app.behartechpro.fr/accueil?bthk=...&returnTo=...` ;
4. `/api/auth/handoff` consomme le nonce côté serveur, revérifie l'appartenance
   active à l'entreprise et pose `btp_app_session` en cookie HttpOnly ;
5. la licence est hydratée dans le SaaS puis la navigation reprend vers la route
   réelle (`/comptoir`, `/atelier`, `/dashboard`, etc.).

Aucun access token ou refresh token Supabase ne transite dans l'URL. La clé de
licence n'y apparaît jamais. Le nonce consommé ou expiré n'est pas réutilisable.

La déconnexion du SaaS efface le cookie applicatif puis passe par
`behartechpro.fr/auth/logout`, qui révoque la session Supabase avec la portée
globale.

Variables requises côté SaaS :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_SESSION_SECRET`
- `NEXT_PUBLIC_MARKETING_URL`

Le site public doit utiliser exactement les mêmes URL et clé publique Supabase.
