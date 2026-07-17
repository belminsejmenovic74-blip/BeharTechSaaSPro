<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getClerk } from '$lib/auth/clerk';

	let errorMessage = '';
	onMount(async () => {
		const returnTo = $page.url.searchParams.get('returnTo');
		const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
		try {
			await (await getClerk()).signOut();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Déconnexion impossible.';
			return;
		}
		window.location.replace(safeReturnTo);
	});
</script>

<svelte:head><title>Déconnexion | Behar Tech Pro</title></svelte:head>
<main class="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-6 text-center text-[#1A1916]">
	<div>{#if errorMessage}<p class="text-sm text-red-700">{errorMessage}</p>{:else}<div class="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]"></div><p class="mt-4 text-sm text-[#6B6B6B]">Déconnexion de Behar Tech Pro…</p>{/if}</div>
</main>
