import { error, json } from '@sveltejs/kit';

import { writeContent } from '$lib/cms/server';
import type { SiteContent } from '$lib/cms/types';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.admin) throw error(401, 'Non autorisé');
	const body = (await request.json()) as SiteContent;
	await writeContent(body);
	return json({ ok: true });
};
