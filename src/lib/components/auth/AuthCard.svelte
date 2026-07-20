<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isClerkAPIResponseError } from '@clerk/clerk-js';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import { Check, Sparkles } from 'lucide-svelte';
	import { editable } from '$lib/editor/editable';
	import { getClerk } from '$lib/auth/clerk';
	import { provisionClerkAccount } from '$lib/auth/provision';

	export let initialMode: 'signin' | 'signup' = 'signin';
	export let showProgress = false;

	type VerificationStep =
		| 'none'
		| 'signup-email'
		| 'signup-phone-entry'
		| 'signup-phone-code'
		| 'signin-second-factor';
	type SecondFactorStrategy = 'email_code' | 'phone_code' | 'totp' | 'backup_code';
	type ClerkInstance = Awaited<ReturnType<typeof getClerk>>;
	type ClerkClient = NonNullable<ClerkInstance['client']>;
	type ClerkSignIn = ClerkClient['signIn'];

	let mode: 'signin' | 'signup' = initialMode;
	let email = '';
	let password = '';
	let phoneNumber = '';
	let verificationCode = '';
	let verificationStep: VerificationStep = 'none';
	let secondFactorStrategy: SecondFactorStrategy | null = null;
	let loading = false;
	let checkingSession = true;
	let message = '';
	let errorMessage = '';
	let pendingEmail = '';
	let selectedPlan = 'pro';
	let billingInterval: 'month' | 'year' = 'month';
	let invitationTicket = '';

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
	$: title = invitationTicket ? 'Activez votre accès' : isSignup ? 'Bienvenue' : 'Se connecter';
	$: subtitle = invitationTicket
		? 'Choisissez votre mot de passe pour rejoindre votre espace Behar Tech Pro.'
		: isSignup
		? 'Créez votre compte ou connectez-vous pour accéder à votre espace.'
		: 'Connectez-vous pour accéder à votre espace.';
	$: selectedPlanData = signupPlans.find((plan) => plan.id === selectedPlan) || signupPlans[2];
	$: planPriceMonthly = billingInterval === 'year' ? monthlyEquivalent(selectedPlanData.yearly) : selectedPlanData.monthly;
	$: emailButton = invitationTicket ? 'Activer mon accès' : isSignup ? `Continuer avec l’offre ${selectedPlanData.name}` : 'Se connecter';
	$: googleButton = isSignup ? 'Google' : 'Continuer avec Google';
	$: alternateHref = isSignup ? '/connexion' : '/inscription';
	$: alternateText = isSignup ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte';
	$: verificationTitle = verificationStep === 'signup-phone-entry'
		? 'Ajoutez votre téléphone'
		: verificationStep === 'signup-phone-code'
			? 'Vérifiez votre téléphone'
			: verificationStep === 'signin-second-factor'
				? 'Vérification de sécurité'
				: 'Vérifiez votre adresse e-mail';
	$: verificationDescription = verificationStep === 'signup-phone-entry'
		? 'Clerk demande un numéro de téléphone pour sécuriser votre compte.'
		: verificationStep === 'signup-phone-code'
			? 'Saisissez le code reçu par SMS.'
			: verificationStep === 'signin-second-factor'
				? secondFactorStrategy === 'totp'
					? 'Saisissez le code de votre application d’authentification.'
					: secondFactorStrategy === 'backup_code'
						? 'Saisissez l’un de vos codes de secours.'
						: 'Saisissez le code de sécurité que Clerk vient de vous envoyé.'
				: `Saisissez le code envoyé à ${pendingEmail || 'votre adresse e-mail'}.`;

	function getCallbackUrl() {
		return `${$page.url.origin}/auth/callback`;
	}

	function validateEmail(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}

	function normalizePhone(value: string) {
		let normalized = value.replace(/[\s.()-]/g, '');
		if (normalized.startsWith('00')) normalized = `+${normalized.slice(2)}`;
		else if (normalized.startsWith('0')) normalized = `+33${normalized.slice(1)}`;
		else if (normalized.startsWith('33')) normalized = `+${normalized}`;
		// Accepte aussi l'écriture française courante « +33 (0)6… ».
		if (normalized.startsWith('+330')) normalized = `+33${normalized.slice(4)}`;
		return normalized;
	}

	const PLAN_IDS = ['free', 'gratuit', 'starter', 'pro', 'business'];
	function normalizePlan(value: unknown): string {
		const v = String(value ?? '').toLowerCase();
		return PLAN_IDS.includes(v) ? v.replace('gratuit', 'free') : '';
	}

	function monthlyEquivalent(yearly: number) {
		return (yearly / 12).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
	}

	function clerkErrorMessage(error: unknown) {
		if (isClerkAPIResponseError(error)) {
			const first = error.errors[0];
			const detailedMessage = first?.longMessage || first?.message || '';
			if (/country|pays/i.test(detailedMessage) && /phone|sms|téléphone/i.test(detailedMessage)) {
				return 'Les SMS vers la France ne sont pas encore autorisés dans Clerk. Activez France dans SMS → Settings → SMS allowlist.';
			}
			const translations: Record<string, string> = {
				form_identifier_not_found: 'Aucun compte ne correspond à cette adresse e-mail.',
				form_password_incorrect: 'Mot de passe incorrect.',
				form_identifier_exists: 'Un compte existe déjà avec cette adresse e-mail.',
				form_code_incorrect: 'Le code saisi est incorrect.',
				verification_expired: 'Ce code a expiré. Demandez-en un nouveau.',
				form_password_pwned: 'Ce mot de passe a été compromis. Choisissez-en un autre.'
			};
			return translations[first?.code] || detailedMessage || 'L’authentification a échoué.';
		}
		return error instanceof Error ? error.message : 'L’authentification a échoué.';
	}

	function requireClient(clerk: ClerkInstance): ClerkClient {
		if (!clerk.client) throw new Error('Clerk n’est pas encore prêt. Réessayez dans un instant.');
		return clerk.client;
	}

	async function activateSession(sessionId: string | null, signup: boolean) {
		if (!sessionId) throw new Error('Clerk n’a pas créé de session.');
		const clerk = await getClerk();
		await clerk.setActive({ session: sessionId });
		await provisionClerkAccount();
		await goto(signup ? '/onboarding' : '/client');
	}

	async function resumeSignup() {
		const clerk = await getClerk();
		const signUp = requireClient(clerk).signUp;
		if (signUp.status === 'complete') {
			await activateSession(signUp.createdSessionId, true);
			return;
		}
		pendingEmail = signUp.emailAddress || '';
		if (signUp.unverifiedFields.includes('email_address')) {
			verificationStep = 'signup-email';
			message = 'Un code de vérification a déjà été envoyé.';
			return;
		} else if (signUp.missingFields.includes('phone_number')) {
			verificationStep = 'signup-phone-entry';
		} else if (signUp.unverifiedFields.includes('phone_number')) {
			verificationStep = 'signup-phone-code';
		}
	}

	onMount(() => {
		let plan = '';
		let interval: 'month' | 'year' | '' = '';
		try {
			const params = $page.url.searchParams;
			invitationTicket = params.get('__clerk_ticket') || '';
			if (invitationTicket) mode = 'signup';
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
		try { localStorage.setItem('btp_selected_plan', JSON.stringify({ plan: selectedPlan, interval: billingInterval })); } catch { /* ignore */ }

		getClerk()
			.then(async (clerk) => {
				if (clerk.isSignedIn) {
					await goto(isSignup ? '/onboarding' : '/client');
					return;
				}
				const client = requireClient(clerk);
				if (invitationTicket) {
					const signUp = await client.signUp.create({ strategy: 'ticket', ticket: invitationTicket });
					email = signUp.emailAddress || '';
					pendingEmail = email;
					if (signUp.status === 'complete') await activateSession(signUp.createdSessionId, false);
					return;
				}
				if (isSignup && client.signUp.status === 'missing_requirements') await resumeSignup();
			})
			.catch((error) => { errorMessage = clerkErrorMessage(error); })
			.finally(() => { checkingSession = false; });
	});

	async function handleGoogle() {
		errorMessage = '';
		message = '';
		loading = true;
		try {
			const clerk = await getClerk();
			const client = requireClient(clerk);
			const options = {
				strategy: 'oauth_google' as const,
				redirectUrl: getCallbackUrl(),
				redirectUrlComplete: isSignup ? '/onboarding' : '/client'
			};
			if (isSignup) {
				await client.signUp.authenticateWithRedirect({
					...options,
					unsafeMetadata: { signup_source: 'behartechpro.fr', selected_plan: selectedPlan, billing_interval: billingInterval }
				});
			} else {
				await client.signIn.authenticateWithRedirect(options);
			}
		} catch (error) {
			errorMessage = clerkErrorMessage(error);
			loading = false;
		}
	}

	async function handleSecondFactor(signIn: ClerkSignIn) {
		const factors = signIn.supportedSecondFactors || [];
		const factor = factors.find((candidate) =>
			['email_code', 'phone_code', 'totp', 'backup_code'].includes(candidate.strategy)
		);
		if (!factor) throw new Error('Cette méthode de double authentification n’est pas encore prise en charge.');

		secondFactorStrategy = factor.strategy as SecondFactorStrategy;
		if (factor.strategy === 'email_code') {
			await signIn.prepareSecondFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
		} else if (factor.strategy === 'phone_code') {
			await signIn.prepareSecondFactor({ strategy: 'phone_code', phoneNumberId: factor.phoneNumberId });
		}
		verificationStep = 'signin-second-factor';
		message = 'Vérification supplémentaire requise.';
	}

	async function handleEmailAuth() {
		errorMessage = '';
		message = '';
		const normalizedEmail = email.trim().toLowerCase();
		if (!invitationTicket && !validateEmail(normalizedEmail)) {
			errorMessage = 'Indiquez une adresse e-mail valide.';
			return;
		}
		if (password.length < 8) {
			errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
			return;
		}

		loading = true;
		try {
			const clerk = await getClerk();
			const client = requireClient(clerk);
			if (invitationTicket) {
				let signUp = client.signUp;
				if (!signUp.id) signUp = await signUp.create({ strategy: 'ticket', ticket: invitationTicket });
				signUp = await signUp.update({ password });
				if (signUp.status === 'complete') {
					await activateSession(signUp.createdSessionId, false);
					return;
				}
				if (signUp.missingFields.includes('phone_number')) {
					verificationStep = 'signup-phone-entry';
					return;
				}
				throw new Error(`Informations manquantes : ${signUp.missingFields.join(', ') || 'finalisation du compte'}.`);
			}
			if (isSignup) {
				const signUp = await client.signUp.create({
					emailAddress: normalizedEmail,
					password,
					unsafeMetadata: { signup_source: 'behartechpro.fr', selected_plan: selectedPlan, billing_interval: billingInterval }
				});
				pendingEmail = normalizedEmail;
				if (signUp.status === 'complete') {
					await activateSession(signUp.createdSessionId, true);
					return;
				}
				if (signUp.unverifiedFields.includes('email_address')) {
					await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
					verificationStep = 'signup-email';
					message = 'Un code de vérification vient de vous être envoyé.';
					return;
				}
				if (signUp.missingFields.includes('phone_number')) {
					verificationStep = 'signup-phone-entry';
					return;
				}
				throw new Error(`Informations manquantes : ${signUp.missingFields.join(', ') || 'vérification du compte'}.`);
			}

			const signIn = await client.signIn.create({
				strategy: 'password',
				identifier: normalizedEmail,
				password
			});
			if (signIn.status === 'complete') {
				await activateSession(signIn.createdSessionId, false);
				return;
			}
			if (signIn.status === 'needs_second_factor') {
				await handleSecondFactor(signIn);
				return;
			}
			throw new Error('La connexion nécessite une étape supplémentaire non disponible sur cet écran.');
		} catch (error) {
			errorMessage = clerkErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	async function handlePhoneSubmit() {
		errorMessage = '';
		message = '';
		const normalized = normalizePhone(phoneNumber);
		if (!/^\+\d{8,15}$/.test(normalized)) {
			errorMessage = 'Indiquez un numéro valide, par exemple 06 12 34 56 78.';
			return;
		}
		loading = true;
		try {
			const clerk = await getClerk();
			const signUp = await requireClient(clerk).signUp.update({ phoneNumber: normalized });
			await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
			verificationStep = 'signup-phone-code';
			verificationCode = '';
			message = 'Un code vient de vous être envoyé par SMS.';
		} catch (error) {
			errorMessage = clerkErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	async function handleVerification() {
		errorMessage = '';
		message = '';
		if (!verificationCode.trim()) {
			errorMessage = 'Saisissez le code de vérification.';
			return;
		}
		loading = true;
		try {
			const clerk = await getClerk();
			const client = requireClient(clerk);
			if (verificationStep === 'signup-email') {
				const signUp = await client.signUp.attemptEmailAddressVerification({ code: verificationCode.trim() });
				if (signUp.status === 'complete') {
					await activateSession(signUp.createdSessionId, true);
					return;
				}
				if (signUp.missingFields.includes('phone_number')) {
					verificationStep = 'signup-phone-entry';
					verificationCode = '';
					message = 'Adresse e-mail vérifiée.';
					return;
				}
			}
			if (verificationStep === 'signup-phone-code') {
				const signUp = await client.signUp.attemptPhoneNumberVerification({ code: verificationCode.trim() });
				if (signUp.status === 'complete') {
					await activateSession(signUp.createdSessionId, true);
					return;
				}
			}
			if (verificationStep === 'signin-second-factor' && secondFactorStrategy) {
				const signIn = await client.signIn.attemptSecondFactor({ strategy: secondFactorStrategy, code: verificationCode.trim() });
				if (signIn.status === 'complete') {
					await activateSession(signIn.createdSessionId, false);
					return;
				}
			}
			throw new Error('La vérification n’est pas terminée.');
		} catch (error) {
			errorMessage = clerkErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	async function resendVerification() {
		loading = true;
		errorMessage = '';
		try {
			const clerk = await getClerk();
			const client = requireClient(clerk);
			if (verificationStep === 'signup-email') {
				await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
			} else if (verificationStep === 'signup-phone-code') {
				await client.signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
			} else if (verificationStep === 'signin-second-factor') {
				await handleSecondFactor(client.signIn);
			}
			message = 'Nouveau code envoyé.';
		} catch (error) {
			errorMessage = clerkErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	function resetVerification() {
		verificationStep = 'none';
		verificationCode = '';
		phoneNumber = '';
		message = '';
		errorMessage = '';
	}
</script>

<main class="min-h-screen bg-[#FAFAF8] px-5 py-7 text-[#1A1916]">
	<a href="/" class="inline-flex items-center text-sm font-medium text-[#1A1916] transition hover:text-[#2A9D8F]">
		<span class="mr-2 text-xl leading-none">‹</span>
		Retour
	</a>

	<section class="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-[430px] flex-col items-center justify-center py-8 transition-all">
		<BrandLogo centered size="h-12" />

		{#if showProgress}
			<div class="mt-10 flex w-full items-center justify-center gap-8">
				<div class="flex items-center gap-2" aria-label="Progression 1 sur 7">
					{#each Array(7) as _, index}
						<span class={`h-[5px] w-[22px] rounded-full ${index === 0 ? 'bg-[#2A9D8F]' : 'bg-[#DDDAD5]'}`}></span>
					{/each}
				</div>
				<span class="text-sm text-[#6B6B6B]">1/7</span>
			</div>
		{/if}

		<div class="mt-9 w-full text-center">
			<h1 use:editable={{ id: `auth.${initialMode}.title`, kind: 'heading', label: 'Titre' }} class="text-[28px] font-semibold leading-tight tracking-normal text-[#1A1916] sm:text-[30px]">{title}</h1>
			<p use:editable={{ id: `auth.${initialMode}.subtitle`, kind: 'text', label: 'Sous-titre' }} class="mx-auto mt-3 max-w-[360px] text-[15px] leading-6 text-[#6B6B6B]">{subtitle}</p>
		</div>

		{#if checkingSession}
			<div class="mt-9 h-6 w-6 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]" aria-label="Chargement"></div>
		{:else if verificationStep !== 'none'}
			<div class="mt-8 w-full rounded-[14px] border border-[#2A9D8F]/25 bg-white p-6 text-left">
				<h2 class="text-lg font-semibold">{verificationTitle}</h2>
				<p class="mt-2 text-sm leading-6 text-[#6B6B6B]">{verificationDescription}</p>
				{#if verificationStep === 'signup-phone-entry'}
					<form class="mt-5 space-y-3" on:submit|preventDefault={handlePhoneSubmit}>
						<input class="h-[52px] w-full rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]" type="tel" placeholder="06 12 34 56 78 ou +33 6…" bind:value={phoneNumber} autocomplete="tel" />
						<button type="submit" class="flex h-12 w-full items-center justify-center rounded-[8px] bg-[#111111] text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>{loading ? 'Envoi…' : 'Recevoir le code'}</button>
					</form>
				{:else}
					<form class="mt-5 space-y-3" on:submit|preventDefault={handleVerification}>
						<input class="h-[52px] w-full rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-center text-[18px] tracking-[0.2em] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]" inputmode={secondFactorStrategy === 'backup_code' ? 'text' : 'numeric'} placeholder="Code de vérification" bind:value={verificationCode} autocomplete="one-time-code" />
						<button type="submit" class="flex h-12 w-full items-center justify-center rounded-[8px] bg-[#111111] text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>{loading ? 'Vérification…' : 'Continuer'}</button>
					</form>
					{#if secondFactorStrategy !== 'totp' && secondFactorStrategy !== 'backup_code'}
						<button type="button" class="mt-3 w-full text-center text-sm text-[#6B6B6B] underline" on:click={resendVerification} disabled={loading}>Renvoyer le code</button>
					{/if}
				{/if}
				<button type="button" class="mt-3 w-full text-center text-sm text-[#6B6B6B] underline" on:click={resetVerification}>Recommencer</button>
			</div>
			{#if message}<p class="mt-4 text-center text-sm text-[#167B70]">{message}</p>{/if}
			{#if errorMessage}<p class="mt-4 text-center text-sm text-red-700">{errorMessage}</p>{/if}
		{:else}
			{#if isSignup && !invitationTicket}
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
							{#if billingInterval === 'year' && selectedPlanData.yearly > 0}<span class="ml-2 pb-0.5 text-[11px] font-medium text-[#167B70]">{selectedPlanData.yearly} € / an · 2 mois offerts</span>{/if}
						</div>
						<ul class="mt-4 space-y-2">
							{#each selectedPlanData.features as feature}<li class="flex items-center gap-2 text-xs font-medium text-[#494844]"><Check class="size-3.5 text-[#2A9D8F]" strokeWidth={2.5} /> {feature}</li>{/each}
						</ul>
					</div>
					<p class="mt-3 text-center text-xs text-[#6B6B6B]">Sans engagement · Changez de formule à tout moment depuis votre espace</p>
				{/if}

			<form class="mt-8 w-full max-w-[430px] space-y-4" on:submit|preventDefault={handleEmailAuth}>
				<input class="h-[52px] w-full rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-[15px] text-[#1A1916] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F] disabled:bg-[#F4F4F1]" type="email" placeholder="nom@exemple.com" bind:value={email} autocomplete="email" disabled={!!invitationTicket} />
				<input class="h-[52px] w-full rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-[15px] text-[#1A1916] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]" type="password" placeholder="Mot de passe (8 caractères minimum)" bind:value={password} autocomplete={isSignup ? 'new-password' : 'current-password'} />
				<div id="clerk-captcha"></div>
				<button type="submit" class="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-[#111111] px-5 text-[15px] font-semibold text-white transition hover:bg-[#2A2A2A] disabled:cursor-wait disabled:opacity-70" disabled={loading}>
					{#if loading}<span class="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>{/if}
					<span use:editable={{ id: `auth.${initialMode}.emailBtn`, kind: 'button', label: 'Bouton e-mail' }}>{emailButton}</span>
				</button>
				{#if invitationTicket}<p class="text-center text-[11px] leading-5 text-[#77736D]">Votre adresse e-mail est déjà vérifiée par l’invitation Clerk.</p>{:else if isSignup}<p class="text-center text-[11px] leading-5 text-[#77736D]">Aucun prélèvement lors de la création du compte. Vous confirmez votre formule après la configuration de l’atelier.</p>{/if}
			</form>

			{#if !invitationTicket}
				<div class="my-8 flex w-full max-w-[430px] items-center gap-4 text-[12px] font-medium uppercase tracking-normal text-[#6B6B6B]"><span class="h-px flex-1 bg-[#E8E5DF]"></span>OU CONTINUER AVEC<span class="h-px flex-1 bg-[#E8E5DF]"></span></div>

				<button type="button" class="flex h-[52px] w-full max-w-[430px] items-center justify-center rounded-[8px] border border-[#E8E5DF] bg-white px-5 text-[15px] font-semibold text-[#1A1916] transition hover:border-[#2A9D8F]" on:click={handleGoogle} disabled={loading}>
					<span use:editable={{ id: `auth.${initialMode}.googleBtn`, kind: 'button', label: 'Bouton Google' }}>{googleButton}</span>
				</button>
			{/if}

			{#if errorMessage}<p class="mt-4 w-full rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-center text-[13px] leading-5 text-red-700">{errorMessage}</p>{/if}
			{#if message}<p class="mt-4 w-full rounded-[8px] border border-[#2A9D8F]/25 bg-white px-4 py-3 text-center text-[13px] leading-5 text-[#1A1916]">{message}</p>{/if}

			{#if !invitationTicket}<a use:editable={{ id: `auth.${initialMode}.alt`, kind: 'text', label: 'Lien alternatif' }} class="mt-8 text-[14px] text-[#6B6B6B] underline underline-offset-4 transition hover:text-[#1A1916]" href={alternateHref}>{alternateText}</a>{/if}
		{/if}
	</section>
</main>