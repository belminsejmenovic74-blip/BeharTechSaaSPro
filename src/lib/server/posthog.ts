import { PostHog } from 'posthog-node';
import { building } from '$app/environment';
import { env } from '$env/dynamic/public';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
	// Au prérendu (build), `$env/dynamic/public` n'est pas lisible : on désactive.
	if (building) return null;
	const token = env.PUBLIC_POSTHOG_PROJECT_TOKEN;
	// PostHog non configuré (variable absente) : on désactive proprement.
	// `$env/dynamic/public` est lu au runtime, donc le build ne casse plus si la
	// variable n'est pas définie sur l'environnement (ex. Vercel).
	if (!token) return null;
	if (!posthogClient) {
		posthogClient = new PostHog(token, {
			host: env.PUBLIC_POSTHOG_HOST,
			flushAt: 1,
			flushInterval: 0
		});
	}
	return posthogClient;
}
