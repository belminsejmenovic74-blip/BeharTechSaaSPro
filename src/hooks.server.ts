import type { Handle, HandleServerError } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

import { COOKIE, verifySession } from '$lib/server/auth';
import { getPostHogClient } from '$lib/server/posthog';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	if (pathname.startsWith('/ingest')) {
		const useAssetHost =
			pathname.startsWith('/ingest/static/') || pathname.startsWith('/ingest/array/');
		const hostname = useAssetHost ? 'eu-assets.i.posthog.com' : 'eu.i.posthog.com';

		const url = new URL(event.request.url);
		url.protocol = 'https:';
		url.hostname = hostname;
		url.port = '443';
		url.pathname = pathname.replace(/^\/ingest/, '');

		const headers = new Headers(event.request.headers);
		headers.set('host', hostname);
		headers.set('accept-encoding', '');

		const clientIp = event.request.headers.get('x-forwarded-for') || event.getClientAddress();
		if (clientIp) headers.set('x-forwarded-for', clientIp);

		return fetch(url.toString(), {
			method: event.request.method,
			headers,
			body: event.request.body,
			// @ts-expect-error duplex required for streaming request bodies
			duplex: 'half'
		});
	}

	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				);
			}
		}
	});
	const { data } = await event.locals.supabase.auth.getUser();
	event.locals.user = data.user ?? null;

	event.locals.admin = verifySession(event.cookies.get(COOKIE));
	return resolve(event);
};

export const handleError: HandleServerError = async ({ error, status, message }) => {
	const posthog = getPostHogClient();
	posthog?.capture({
		distinctId: 'server',
		event: 'server_error',
		properties: {
			error: error instanceof Error ? error.message : String(error),
			status,
			message
		}
	});
	return { message, status };
};
