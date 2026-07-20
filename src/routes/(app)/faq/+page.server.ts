import { FAQ } from '../../../content/faq';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

export const load: PageServerLoad = async () => {
	return { faq: FAQ };
};
