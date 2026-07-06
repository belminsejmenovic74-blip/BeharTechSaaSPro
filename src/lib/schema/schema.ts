import { z } from 'zod';

export const formSchema = z.object({
	email: z.string().email({ message: 'Adresse e-mail invalide' }),
});

export type FormSchema = typeof formSchema;
