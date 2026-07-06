import type { Handle } from '@sveltejs/kit';

import { COOKIE, verifySession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = verifySession(event.cookies.get(COOKIE));
	return resolve(event);
};
