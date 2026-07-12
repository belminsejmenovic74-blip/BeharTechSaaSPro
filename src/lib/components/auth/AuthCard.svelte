<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import { editable } from '$lib/editor/editable';
	import { ensureClientProfile, hasSupabase, supabase } from '$lib/auth/supabase';

	export let initialMode: 'signin' | 'signup' = 'signin';
	export let showProgress = false;

	let mode: 'signin' | 'signup' = initialMode;
	let email = '';
	let loading = false;
	let checkingSession = true;
	let message = '';
	let errorMessage = '';

	$: isSignup = mode === 'signup';
	$: title = isSignup ? 'Bienvenue' : 'Se connecter';
	$: subtitle = isSignup
		? 'Créez votre compte ou connectez-vous pour accéder à votre espace.'
		: 'Connectez-vous pour accéder à votre espace.';
	$: emailButton = isSignup ? 'Continuer par e-mail' : 'Recevoir le lien de connexion';
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

	function temporaryPassword() {
		return `${crypto.randomUUID()}-${crypto.randomUUID()}-Btp!2026`;
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
		await goto(profile?.onboarding_completed ? '/client' : '/onboarding');
	}

	onMount(() => {
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

		loading = true;

		if (isSignup) {
			const { data, error } = await supabase.auth.signUp({
				email: normalizedEmail,
				password: temporaryPassword(),
				options: {
					emailRedirectTo: getRedirectUrl()
				}
			});
			loading = false;

			if (error) {
				errorMessage = error.message;
				return;
			}

			if (data.session?.user) {
				const profile = await ensureClientProfile(data.session.user);
				await goto(profile?.onboarding_completed ? '/client' : '/onboarding');
				return;
			}

			errorMessage =
				'La confirmation e-mail est encore activée dans Supabase. Désactivez "Confirm email" dans Auth > Providers > Email pour créer le compte et passer directement à la configuration.';
			return;
		}

		const { error } = await supabase.auth.signInWithOtp({
			email: normalizedEmail,
			options: {
				emailRedirectTo: getRedirectUrl(),
				shouldCreateUser: false
			}
		});
		loading = false;

		if (error) {
			errorMessage = error.message;
			return;
		}

		message = 'Lien envoyé. Ouvrez votre e-mail pour vous connecter.';
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
		class="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-[430px] flex-col items-center justify-center py-8"
	>
		<BrandLogo centered compact />

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
		{:else}
			<form class="mt-8 w-full space-y-4" on:submit|preventDefault={handleEmailAuth}>
				<input
					class="h-[52px] w-full rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-[15px] text-[#1A1916] outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]"
					type="email"
					placeholder="nom@exemple.com"
					bind:value={email}
					autocomplete="email"
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
			</form>

			<div
				class="my-8 flex w-full items-center gap-4 text-[12px] font-medium uppercase tracking-normal text-[#6B6B6B]"
			>
				<span class="h-px flex-1 bg-[#E8E5DF]"></span>
				OU CONTINUER AVEC
				<span class="h-px flex-1 bg-[#E8E5DF]"></span>
			</div>

			<button
				type="button"
				class="flex h-[52px] w-full items-center justify-center rounded-[8px] border border-[#E8E5DF] bg-white px-5 text-[15px] font-semibold text-[#1A1916] transition hover:border-[#2A9D8F]"
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
