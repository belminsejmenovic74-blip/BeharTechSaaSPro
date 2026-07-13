import posthog from 'posthog-js';
import { env } from '$env/dynamic/public';
import type { HandleClientError } from '@sveltejs/kit';

export async function init() {
	const token = env.PUBLIC_POSTHOG_PROJECT_TOKEN;
	// PostHog non configuré (variable absente) : on n'initialise pas.
	// `$env/dynamic/public` est lu au runtime, donc le build ne casse plus.
	if (!token) return;
	posthog.init(token, {
		api_host: '/ingest',
		ui_host: 'https://eu.posthog.com',
		defaults: '2026-01-30',
		capture_exceptions: true
	});
}

export const handleError: HandleClientError = async ({ error, status, message }) => {
	posthog.captureException(error);
	return { message, status };
};
