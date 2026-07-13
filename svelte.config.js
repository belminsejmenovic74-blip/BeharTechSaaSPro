import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({ runtime: 'nodejs22.x' }),
		// Vitrine statique : une ancre CMS pointant vers une section masquée ne doit
		// pas casser le build (avertissement au lieu d'erreur).
		prerender: { handleMissingId: 'warn' },
		// Required for PostHog session replay to work correctly with SSR
		paths: { relative: false }
	}
};

export default config;
