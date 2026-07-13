<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import { ensureClientProfile, getCurrentUser } from '$lib/auth/supabase';

	const plans = [
		{ id: 'starter', name: 'Starter', price: 29, devices: '2 appareils', sms: '30 SMS' },
		{ id: 'pro', name: 'Pro', price: 49, devices: '4 appareils', sms: '150 SMS' },
		{ id: 'business', name: 'Business', price: 99, devices: 'Appareils illimités', sms: '250 SMS' }
	] as const;
	let loading = true;
	let busy = '';
	let errorMessage = '';
	let selected: 'starter' | 'pro' | 'business' = 'pro';
	let interval: 'month' | 'year' = 'month';
	let currentPlan = 'free';

	onMount(async () => {
		const user = await getCurrentUser();
		if (!user) { await goto('/connexion'); return; }
		const profile = await ensureClientProfile(user);
		if (!profile?.onboarding_completed) { await goto('/onboarding'); return; }
		currentPlan = profile.plan;
		try {
			const choice = JSON.parse(localStorage.getItem('btp_selected_plan') || '{}');
			if (['starter', 'pro', 'business'].includes(choice.plan)) selected = choice.plan;
			if (choice.interval === 'year') interval = 'year';
		} catch { /* choix par défaut */ }
		loading = false;
	});

	async function requestSession(endpoint: string, body?: unknown) {
		busy = endpoint;
		errorMessage = '';
		try {
			const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
			const data = await response.json();
			if (!response.ok || !data.url) throw new Error(data.error || 'Opération impossible.');
			window.location.assign(data.url);
		} catch (error) { errorMessage = error instanceof Error ? error.message : 'Opération impossible.'; busy = ''; }
	}
</script>

<svelte:head><title>Abonnement | Behar Tech Pro</title></svelte:head>
<main class="min-h-screen bg-[#FAFAF8] px-5 py-7 text-[#1A1916]">
	<header class="mx-auto flex max-w-5xl items-center justify-between"><a href="/client" class="text-sm font-medium">‹ Retour au portail</a><BrandLogo compact /><span class="w-24"></span></header>
	{#if loading}<div class="flex min-h-[75vh] items-center justify-center"><div class="h-7 w-7 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]"></div></div>{:else}
	<section class="mx-auto max-w-5xl py-14"><div class="text-center"><h1 class="text-4xl font-semibold">Abonnement et licence</h1><p class="mt-3 text-[#6B6B6B]">La licence payante ne sera activée qu’après confirmation du webhook Stripe.</p><div class="mt-6 inline-flex rounded-xl border border-[#E8E5DF] bg-white p-1"><button class="rounded-lg px-4 py-2 text-sm {interval === 'month' ? 'bg-[#111] text-white' : ''}" on:click={() => (interval = 'month')}>Mensuel</button><button class="rounded-lg px-4 py-2 text-sm {interval === 'year' ? 'bg-[#111] text-white' : ''}" on:click={() => (interval = 'year')}>Annuel</button></div></div>
		<div class="mt-9 grid gap-4 md:grid-cols-3">{#each plans as plan}<button class="rounded-2xl border bg-white p-6 text-left transition {selected === plan.id ? 'border-[#2A9D8F] ring-2 ring-[#2A9D8F]/10' : 'border-[#E8E5DF]'}" on:click={() => (selected = plan.id)}><h2 class="text-lg font-semibold">{plan.name}</h2><p class="mt-3 text-3xl font-semibold">{interval === 'month' ? plan.price : plan.price * 10} €<small class="text-sm font-normal text-[#6B6B6B]">/{interval === 'month' ? 'mois' : 'an'}</small></p><ul class="mt-5 space-y-2 text-sm text-[#6B6B6B]"><li>{plan.devices}</li><li>Réparations illimitées</li><li>{plan.sms}</li></ul></button>{/each}</div>
		{#if errorMessage}<p class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">{errorMessage}</p>{/if}
		<div class="mx-auto mt-7 max-w-md space-y-3"><button class="h-12 w-full rounded-xl bg-[#111] font-semibold text-white disabled:opacity-60" disabled={!!busy} on:click={() => requestSession('/api/billing/checkout', { plan: selected, interval })}>{busy ? 'Connexion à Stripe…' : `Choisir ${plans.find((plan) => plan.id === selected)?.name}`}</button>{#if currentPlan !== 'free'}<button class="h-12 w-full rounded-xl border border-[#E8E5DF] bg-white text-sm font-semibold" disabled={!!busy} on:click={() => requestSession('/api/billing/portal')}>Gérer mon abonnement Stripe</button>{/if}<a href="/client" class="flex h-12 items-center justify-center text-sm text-[#6B6B6B] underline">Conserver l’offre gratuite</a></div>
	</section>{/if}
</main>
