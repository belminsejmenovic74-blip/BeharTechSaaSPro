import { formSchema } from '$lib/schema/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

// Page vitrine statique (Vercel) : pas d'action serveur, uniquement le formulaire.
export const load = async () => {
	return {
		form: await superValidate(zod(formSchema))
	};
};
