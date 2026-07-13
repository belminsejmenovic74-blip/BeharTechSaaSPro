<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import { Check, Sparkles } from 'lucide-svelte';
	import { editable } from '$lib/editor/editable';
	import { ensureClientProfile, hasSupabase, supabase } from '$lib/auth/supabase';
	import { redirectAfterAuth } from '$lib/auth/post-auth';

	export let initialMode: 'signin' | 'signup' = 'signin';
	export let showProgress = false;

	let mode: 'signin' | 'signup' = initialMode;
	let email = '';
	let password = '';
	let loading = false;
	let checkingSession = true;
	let message = '';
	let errorMessage = '';
	let awaitingVerification = false;
	let pendingEmail = '';
	let selectedPlan = 'pro';
	let billingInterval: 'month' | 'year' = 'month';
	const signupPlans = [
		{
			id: 'free', name: 'Gratuit', monthly: 0, yearly: 0, recommended: false,
			description: 'Pour découvrir Behar Tech Pro',
			features: ['1 appareil', '10 réparations / mois', '10 SMS inclus']
		},
		{
			id: 'starter', name: 'Starter', monthly: 29, yearly: 290, recommended: false,
			description: 'L’essentiel pour un petit atelier',
			features: ['2 appareils', 'Réparations illimitées', '30 SMS inclus']
		},
		{
			id: 'pro', name: 'Pro', monthly: 49, yearly: 490, recommended: true,
			description: 'Le meilleur choix pour grandir',
			features: ['4 appareils', 'Réparations illimitées', '150 SMS + export comptable']
		},
		{
			id: 'business', name: 'Business', monthly: 99, yearly: 990, recommended: false,
			description: 'Pour les équipes et le volume',
			features: ['Appareils illimités', 'Réparations illimitées', '250 SMS + support dédié']
		}
	] as const;

	$: isSignup = mode === 'signup';
	$: title = isSignup ? 'Bienvenue' : 'Se connecter';
	$: subtitle = isSignup
		? 'Créez votre compte ou connectez-vous pour accéder à votre espace.'
		: 'Connectez-vous pour accéder à votre espace.';
	$: selectedPlanData = signupPlans.find((plan) => plan.id === selectedPlan) || signupPlans[2];
	$: planPriceMonthly = billingInterval === 'year' ? monthlyEquivalent(selectedPlanData.yearly) : selectedPlanData.monthly;
	$: emailButton = isSignup ? `Continuer avec l’offre ${selectedPlanData.name}` : 'Se connecter';
	$: googleButton = isSignup ? 'Google' : 'Continuer avec Google';
	$: alternateHref = isSignup ? '/connexion' : '/inscription';
	$: alternateText = isSignup
		? 'Déjà un compte ? Se connecter'
		: 'Pas encore de compte ? Créer un compte';

	function getRedirectUrl() {
		return `${$page.url.origin}/auth/callback`;
	}

	function validateEmail(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}

	const PLAN_IDS = ['free', 'gratuit', 'starter', 'pro', 'business'];
	function normalizePlan(value: unknown): string {
		const v = String(value ?? '').toLowerCase();
		return PLAN_IDS.includes(v) ? v.replace('gratuit', 'free') : '';
	}

	function monthlyEquivalent(yearly: number) {
		return (yearly / 12).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
	}

	async function redirectExistingSession() {
		if (!supabase) {
			checkingSession = false;
			return;
		}

		const { data } = await supabase.auth.getSession();
		const user = data.session?.user;
		if (!user) {
			checkingSession = false;
			return;
		}

		const profile = await ensureClientProfile(user);
		await redirectAfterAuth(profile?.onboarding_completed);
	}

	onMount(() => {
		// Priorité : offre choisie sur le site (URL) > dernier choix (localStorage) > défaut.
		let plan = '';
		let interval: 'month' | 'year' | '' = '';
		try {
			const params = $page.url.searchParams;
			plan = normalizePlan(params.get('plan'));
			interval = params.get('interval') === 'year' ? 'year' : params.get('interval') === 'month' ? 'month' : '';
			if (!plan || !interval) {
				const choice = JSON.parse(localStorage.getItem('btp_selected_plan') || '{}');
				if (!plan) plan = normalizePlan(choice.plan);
				if (!interval) interval = choice.interval === 'year' ? 'year' : 'month';
			}
		} catch { /* défauts ci-dessous */ }
		selectedPlan = plan || 'pro';
		billingInterval = interval || 'month';
		// Mémorise pour la suite du parcours (onboarding / repli).
		try { localStorage.setItem('btp_selected_plan', JSON.stringify({ plan: selectedPlan, interval: billingInterval })); } catch { /* ignore */ }
		redirectExistingSession().catch(() => {
			checkingSession = false;
		});
	});

	async function handleGoogle() {
		errorMessage = '';
		message = '';

		if (!supabase) {
			errorMessage =
				'Supabase n’est pas encore configuré. Ajoutez PUBLIC_SUPABASE_URL et PUBLIC_SUPABASE_ANON_KEY.';
			return;
		}

		loading = true;
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: getRedirectUrl() }
		});
		if (error) {
			errorMessage = error.message;
			loading = false;
		}
	}

	async function handleEmailAuth() {
		errorMessage = '';
		message = '';

		if (!supabase) {
			errorMessage =
				'Supabase n’est pas encore configuré. Ajoutez PUBLIC_SUPABASE_URL et PUBLIC_SUPABASE_ANON_KEY.';
			return;
		}

		const normalizedEmail = email.trim().toLowerCase();
		if (!validateEmail(normalizedEmail)) {
			errorMessage = 'Indiquez une adresse e-mail valide.';
			return;
		}
		if (password.length < 8) {
			errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
			return;
		}

		loading = true;

		if (isSignup) {
			const { data, error } = await supabase.auth.signUp({
				email: normalizedEmail,
				password,
				options: {
					emailRedirectTo: getRedirectUrl(),
					data: { signup_source: 'behartechpro.fr', selected_plan: selectedPlan, billing_interval: billingInterval }
				}
			});
			loading = false;

			if (error) {
				errorMessage = error.message;
				return;
			}

			if (data.session?.user) {
				const profile = await ensureClientProfile(data.session.user);
				await redirectAfterAuth(profile?.onboarding_completed);
				return;
			}

			pendingEmail = normalizedEmail;
			awaitingVerification = true;
			message = 'Un e-mail de vérification vient de vous être envoyé. Vérifiez votre boîte de réception avant de continuer.';
			return;
		}

		const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
		loading = false;

		if (error) {
			if (/confirm|verified/i.test(error.message)) {
				pendingEmail = normalizedEmail;
				awaitingVerification = true;
				errorMessage = 'Votre adresse e-mail doit être vérifiée avant l’accès à Behar Tech Pro.';
				return;
			}
			errorMessage = error.message;
			return;
		}
		if (data.user) {
			const profile = await ensureClientProfile(data.user);
			await redirectAfterAuth(profile?.onboarding_completed);
		}
	}

	async function resendVerification() {
		if (!supabase || !pendingEmail) return;
		loading = true;
		errorMessage = '';
		const { error } = await supabase.auth.resend({
			type: 'signup',
			email: pendingEmail,
			options: { emailRedirectTo: getRedirectUrl() }
		});
		loading = false;
		if (error) errorMessage = error.message;
		else message = 'E-mail renvoyé. Pensez à vérifier le dossier indésirable.';
	}
</script>

<main class="min-h-screen bg-[#FAFAF8] px-5 py-7 text-[#1A1916]">
	<a
		href="/"
		class="inline-flex items-center text-sm font-medium text-[#1A1916] transition hover:text-[#2A9D8F]"
	>
		<span class="mr-2 text-xl leading-none">‹</span>
		Retour
	</a>

	<section
		class="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-[430px] flex-col items-center justify-center py-8 transition-all"
	>
		<BrandLogo centered size="h-12" />

		{#if showProgress}
			<div class="mt-10 flex w-full items-center justify-center gap-8">
				<div class="flex items-center gap-2" aria-label="Progression 1 sur 7">
					{#each Array(7) as _, index}
						<span
							class={`h-[5px] w-[22px] rounded-full ${index === 0 ? 'bg-[#2A9D8F]' : 'bg-[#DDDAD5]'}`}
						></span>
					{/each}
				</div>
				<span class="text-sm text-[#6B6B6B]">1/7</span>
			</div>
		{/if}

		<div class="mt-9 w-full text-center">
			<h1
				use:editable={{ id: `auth.${initialMode}.title`, kind: 'heading', label: 'Titre' }}
				class="text-[28px] font-semibold leading-tight tracking-normal text-[#1A1916] sm:text-[30px]"
			>
				{title}
			</h1>
			<p
				use:editable={{ id: `auth.${initialMode}.subtitle`, kind: 'text', label: 'Sous-titre' }}
				class="mx-auto mt-3 max-w-[360px] text-[15px] leading-6 text-[#6B6B6B]"
			>
				{subtitle}
			</p>
		</div>

		{#if checkingSession}
			<div
				class="mt-9 h-6 w-6 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]"
				aria-label="Chargement"
			></div>
		{:else if awaitingVerification}
			<div class="mt-8 w-full rounded-[14px] border border-[#2A9D8F]/25 bg-white p-6 text-left">
				<h2 class="text-lg font-semibold">Vérifiez votre adresse e-mail</h2>
				<p class="mt-2 text-sm leading-6 text-[#6B6B6B]">L’accès au portail et au SaaS reste bloqué tant que <strong>{pendingEmail}</strong> n’est pas vérifiée.</p>
				<button type="button" class="mt-5 flex h-12 w-full items-center justify-center rounded-[8px] bg-[#111111] text-sm font-semibold text-white disabled:opacity-60" on:click={resendVerification} disabled={loading}>{loading ? 'Envoi…' : 'Renvoyer l’e-mail'}</button>
				<button type="button" class="mt-3 w-full text-center text-sm text-[#6B6B6B] underline" on:click={() => { awaitingVerification = false; message = ''; errorMessage = ''; }}>Utiliser une autre adresse</button>
			</div>
			{#if message}<p class="mt-4 text-center text-sm text-[#167B70]">{message}</p>{/if}
			{#if errorMessage}<p class="mt-4 text-center text-sm text-red-700">{errorMessage}</p>{/if}
		{:else}
			{#if isSignup}
				<div class="mt-8 w-full max-w-[430px] text-left">
					<div class="rounded-[16px] border border-[#E3E0DA] bg-white p-5 shadow-[0_10px_25px_rgba(26,25,22,0.05)]">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2A9D8F]">Votre formule</p>
								<div class="mt-1.5 flex items-center gap-2">
									<strong class="text-[19px] tracking-[-0.02em]">{selectedPlanData.name}</strong>
									{#if selectedPlanData.recommended}<span class="inline-flex items-center gap-1 rounded-full bg-[#1A1916] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white"><Sparkles class="size-3" /> Le plus choisi</span>{/if}
								</div>
								<p class="mt-1 text-xs text-[#6B6B6B]">{selectedPlanData.description}</p>
							</div>
							<a href="/#pricing" class="shrink-0 text-sm font-medium text-[#2A9D8F] underline underline-offset-4 transition hover:text-[#167B70]">Modifier</a>
						</div>
						<div class="mt-4 flex items-end gap-1 border-t border-[#E9E6E1] pt-4">
							<span class="text-[30px] font-bold leading-none tracking-[-0.04em]">{planPriceMonthly} €</span>
							<span class="pb-0.5 text-xs text-[#6B6B6B]">/ mois</span>
							{#if billingInterval === 'year' && selectedPlanData.yearly > 0}
								<span class="ml-2 pb-0.5 text-[11px] font-medium text-[#167B70]">{selectedPlanData.yearly} € / an · 2 mois offerts</span>
							{/if}
						</div>
						<ul class="mt-4 space-y-2">
							{#each selectedPlanData.features as feature}
								<li class="flex items-center gap-2 text-xs font-medium text-[#494844]"><Check class="size-3.5 text-[#2A9D8F]" strokeWidth={2.5} /> {feature}</li>
							{/each}
						</ul>
					</div>
					<p class="mt-3 text-center text-xs text-[#6B6B6B]">Sans engagement · Changez de formule à tout moment depuis votre espace</p>
				</div>
			{/if}
			<form class="mt-8 w-full max-w-[430px] space-y-4" on:submit|preventDefault={handleEmailAuth}>
				<input
					class="h-[52px] w-full rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-[15px] text-[#1A1916] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]"
					type="email"
					placeholder="nom@exemple.com"
					bind:value={email}
					autocomplete="email"
				/>
				<input
					class="h-[52px] w-full rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-[15px] text-[#1A1916] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]"
					type="password"
					placeholder="Mot de passe (8 caractères minimum)"
					bind:value={password}
					autocomplete={isSignup ? 'new-password' : 'current-password'}
				/>

				<button
					type="submit"
					class="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-[#111111] px-5 text-[15px] font-semibold text-white transition hover:bg-[#2A2A2A] disabled:cursor-wait disabled:opacity-70"
					disabled={loading}
				>
					{#if loading}
						<span
							class="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
						></span>
					{/if}
					<span use:editable={{ id: `auth.${initialMode}.emailBtn`, kind: 'button', label: 'Bouton e-mail' }}>{emailButton}</span>
				</button>
				{#if isSignup}<p class="text-center text-[11px] leading-5 text-[#77736D]">Aucun prélèvement lors de la création du compte. Vous confirmez votre formule après la configuration de l’atelier.</p>{/if}
			</form>

			<div
				class="my-8 flex w-full max-w-[430px] items-center gap-4 text-[12px] font-medium uppercase tracking-normal text-[#6B6B6B]"
			>
				<span class="h-px flex-1 bg-[#E8E5DF]"></span>
				OU CONTINUER AVEC
				<span class="h-px flex-1 bg-[#E8E5DF]"></span>
			</div>

			<button
				type="button"
				class="flex h-[52px] w-full max-w-[430px] items-center justify-center rounded-[8px] border border-[#E8E5DF] bg-white px-5 text-[15px] font-semibold text-[#1A1916] transition hover:border-[#2A9D8F]"
				on:click={handleGoogle}
				disabled={loading}
			>
				<span use:editable={{ id: `auth.${initialMode}.googleBtn`, kind: 'button', label: 'Bouton Google' }}>{googleButton}</span>
			</button>

			{#if errorMessage}
				<p
					class="mt-4 w-full rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-center text-[13px] leading-5 text-red-700"
				>
					{errorMessage}
				</p>
			{/if}
			{#if message}
				<p
					class="mt-4 w-full rounded-[8px] border border-[#2A9D8F]/25 bg-white px-4 py-3 text-center text-[13px] leading-5 text-[#1A1916]"
				>
					{message}
				</p>
			{/if}

			<a
				use:editable={{ id: `auth.${initialMode}.alt`, kind: 'text', label: 'Lien alternatif' }}
				class="mt-8 text-[14px] text-[#6B6B6B] underline underline-offset-4 transition hover:text-[#1A1916]"
				href={alternateHref}
			>
				{alternateText}
			</a>
		{/if}
	</section>
</main>
