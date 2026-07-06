import { error, json } from '@sveltejs/kit';

import { saveMedia } from '$lib/server/media';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.admin) throw error(401, 'Non autorisé');
	const data = await request.formData();
	const file = data.get('file');
	if (!(file instanceof File)) throw error(400, 'Fichier manquant');
	const buf = Buffer.from(await file.arrayBuffer());
	const url = await saveMedia(file.name, buf);
	return json({ ok: true, url });
};
