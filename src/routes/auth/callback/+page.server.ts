import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	if (!code) return { authError: null };
	const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
	return { authError: error?.message ?? null };
};
