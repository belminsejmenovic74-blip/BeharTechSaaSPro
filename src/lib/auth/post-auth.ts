import { goto } from '$app/navigation';
import { supabase } from '$lib/auth/supabase';

/**
 * Destination après une authentification réussie.
 *
 * Parcours cible : création de compte / connexion → portail d'accueil du SaaS
 * (app.behartechpro.fr/accueil), d'où l'utilisateur choisit son mode
 * (dashboard / comptoir / atelier). C'est le cas dès que l'URL de l'application
 * est configurée via VITE_APP_URL / PUBLIC_APP_URL — y compris pour un nouveau
 * compte.
 *
 * Si l'URL du SaaS n'est PAS configurée (dev local sans le SaaS), on retombe
 * sur le comportement historique du site Svelte (/onboarding ou /client) pour
 * ne rien casser.
 *
 * Aucune donnée de session (token, refresh token, secret) n'est transmise dans
 * l'URL : simple redirection vers le sous-domaine, où le SaaS vérifie la
 * session via son propre système (garde licence + PIN).
 */
export function appBaseUrl(): string {
	const raw =
		(import.meta.env.VITE_APP_URL as string | undefined) ||
		(import.meta.env.PUBLIC_APP_URL as string | undefined) ||
		'';
	return raw.replace(/\/+$/, '');
}

/**
 * Génère un code de transfert à usage unique (nonce) permettant au SaaS
 * d'activer la licence sans ressaisie. Renvoie null si la RPC n'est pas encore
 * déployée ou si aucune licence n'est provisionnée pour ce compte : dans ce cas
 * la redirection se fait sans code et le SaaS demandera la clé (comportement
 * actuel). Aucun token n'est transmis — seulement ce nonce à usage unique.
 */
async function mintHandoffCode(): Promise<string | null> {
	if (!supabase) return null;
	try {
		const { data, error } = await supabase.rpc('create_workshop_handoff');
		if (error) return null;
		return typeof data === 'string' && data.length > 0 ? data : null;
	} catch {
		return null;
	}
}

export async function redirectAfterAuth(onboardingCompleted: boolean | null | undefined): Promise<void> {
	await goto(onboardingCompleted ? '/client' : '/onboarding');
}

export async function saasUrl(path = '/accueil'): Promise<string> {
	const base = appBaseUrl();
	if (!base) return path;
	const safePath = path.startsWith('/') && !path.startsWith('//') ? path : '/accueil';
	const code = await mintHandoffCode();
	if (!code) throw new Error('Votre licence est encore en cours de préparation. Réessayez dans un instant.');
	const target = new URL('/accueil', `${base}/`);
	target.searchParams.set('bthk', code);
	if (safePath !== '/accueil') target.searchParams.set('returnTo', safePath);
	return target.toString();
}

export async function openSaas(path = '/accueil'): Promise<void> {
	window.location.assign(await saasUrl(path));
}
