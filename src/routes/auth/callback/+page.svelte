<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ensureClientProfile, supabase } from '$lib/auth/supabase';
	import { redirectAfterAuth } from '$lib/auth/post-auth';
	import type { PageData } from './$types';

	export let data: PageData;

	let errorMessage = '';

	onMount(async () => {
		if (data.authError) {
			errorMessage = data.authError;
			return;
		}
		if (!supabase) {
			errorMessage = 'Supabase n’est pas configuré.';
			return;
		}

		const { data: sessionData, error } = await supabase.auth.getSession();
		if (error) {
			errorMessage = error.message;
			return;
		}

		const user = sessionData.session?.user;
		if (!user) {
			await goto('/connexion');
			return;
		}

		try {
			const profile = await ensureClientProfile(user);
			await redirectAfterAuth(profile?.onboarding_completed);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Profil client impossible à préparer.';
		}
	});
</script>

<svelte:head><title>Connexion en cours | Behar Tech Pro</title></svelte:head>

<main class="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-6 text-[#1A1916]">
	<div
		class="w-full max-w-md rounded-3xl border border-[#1A1916]/10 bg-white p-8 text-center shadow-[0_24px_80px_rgba(26,25,22,0.08)]"
	>
		{#if errorMessage}
			<p class="text-sm font-medium text-red-700">{errorMessage}</p>
			<a
				class="mt-6 inline-flex rounded-xl bg-[#2A9D8F] px-5 py-3 text-sm font-semibold text-white"
				href="/connexion">Retour à la connexion</a
			>
		{:else}
			<div
				class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]"
				aria-label="Chargement"
			></div>
			<h1 class="mt-4 text-xl font-semibold">Connexion en cours</h1>
			<p class="mt-2 text-sm text-[#6B6B6B]">Préparation de votre espace client.</p>
		{/if}
	</div>
</main>
