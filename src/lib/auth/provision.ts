export async function provisionClerkAccount(): Promise<void> {
	const response = await fetch('/api/auth/provision', { method: 'POST', cache: 'no-store' });
	if (response.ok) return;
	const body = (await response.json().catch(() => null)) as { error?: string } | null;
	throw new Error(body?.error || 'Impossible de préparer votre espace client.');
}

