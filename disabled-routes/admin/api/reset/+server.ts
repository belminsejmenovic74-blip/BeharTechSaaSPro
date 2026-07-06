import { error, json } from '@sveltejs/kit';

import { resetContent } from '$lib/cms/server';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.admin) throw error(401, 'Non autorisé');
	const content = await resetContent();
	return json({ ok: true, content });
};
