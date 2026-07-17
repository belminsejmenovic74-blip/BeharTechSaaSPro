import { createClerkClient } from '@clerk/backend';
import { env } from '$env/dynamic/private';

export type ClerkAuthUser = {
	id: string;
	email: string;
	email_confirmed_at: string | null;
	first_name: string | null;
	last_name: string | null;
};

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
	const secretKey = env.CLERK_SECRET_KEY;
	const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;
	if (!secretKey || !publishableKey) return null;

	clerkClient ??= createClerkClient({ secretKey, publishableKey });
	return clerkClient;
}

export async function getClerkAuthUser(
	request: Request,
	origin: string
): Promise<ClerkAuthUser | null> {
	const client = getClerkClient();
	if (!client) return null;

	try {
		const state = await client.authenticateRequest(request, {
			authorizedParties: [origin]
		});
		if (!state.isAuthenticated) return null;

		const auth = state.toAuth();
		if (!auth.userId) return null;

		const user = await client.users.getUser(auth.userId);
		const primaryEmail = user.primaryEmailAddress;
		return {
			id: user.id,
			email: primaryEmail?.emailAddress ?? '',
			email_confirmed_at:
				primaryEmail?.verification?.status === 'verified' ? new Date(user.updatedAt).toISOString() : null,
			first_name: user.firstName,
			last_name: user.lastName
		};
	} catch (error) {
		console.error('[clerk-auth]', error instanceof Error ? error.message : 'authentication failed');
		return null;
	}
}
