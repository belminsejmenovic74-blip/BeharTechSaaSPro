<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import { ensureClientProfile, getCurrentUser } from '$lib/auth/supabase';

	export let title: string;
	export let description: string;
	export let actionLabel = 'Retour à mon espace client';

	let loading = true;

	onMount(async () => {
		const user = await getCurrentUser();
		if (!user) {
			await goto('/connexion');
			return;
		}

		const profile = await ensureClientProfile(user);
		if (!profile?.onboarding_completed) {
			await goto('/onboarding');
			return;
		}

		loading = false;
	});
</script>

<main class="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 text-[#1A1916]">
	{#if loading}
		<div
			class="h-7 w-7 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]"
			aria-label="Chargement"
		></div>
	{:else}
		<section
			class="w-full max-w-2xl rounded-[16px] border border-[#E8E5DF] bg-white p-8 text-center sm:p-10"
		>
			<BrandLogo centered compact />
			<h1 class="mt-8 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
			<p class="mx-auto mt-4 max-w-xl text-base leading-7 text-[#6B6B6B]">{description}</p>
			<a
				href="/client"
				class="mt-8 inline-flex min-h-12 items-center justify-center rounded-[10px] bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#2A2A2A]"
			>
				{actionLabel}
			</a>
		</section>
	{/if}
</main>
