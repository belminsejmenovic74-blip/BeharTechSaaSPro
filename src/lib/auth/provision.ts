type ProvisionResponse<T> = {
	error?: string;
	profile?: T;
};

export async function provisionClerkAccount<T = unknown>(): Promise<T | null> {
	const response = await fetch('/api/auth/provision', { method: 'POST', cache: 'no-store' });
	const body = (await response.json().catch(() => null)) as ProvisionResponse<T> | null;
	if (response.ok) return body?.profile ?? null;
	throw new Error(body?.error || 'Impossible de préparer votre espace client.');
}
