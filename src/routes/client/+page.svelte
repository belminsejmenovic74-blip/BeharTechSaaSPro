<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import {
		ensureClientProfile,
		getCurrentUser,
		supabase,
		type ClientProfile
	} from '$lib/auth/supabase';

	let loading = true;
	let errorMessage = '';
	let copied = false;
	let profile: ClientProfile | null = null;

	$: repairsRemaining = profile ? Math.max(profile.repairs_limit - profile.repairs_used, 0) : 0;
	$: smsRemaining = profile ? Math.max(profile.sms_limit - profile.sms_used, 0) : 0;
	$: planLabel = profile?.plan === 'free' ? 'Starter' : profile?.plan || 'Starter';
	$: statusLabel =
		profile?.subscription_status === 'active' ? 'Actif' : profile?.subscription_status || 'Actif';

	onMount(async () => {
		try {
			const user = await getCurrentUser();
			if (!user) {
				await goto('/connexion');
				return;
			}

			const nextProfile = await ensureClientProfile(user);
			if (!nextProfile) throw new Error('Profil client introuvable.');
			if (!nextProfile.onboarding_completed) {
				await goto('/onboarding');
				return;
			}

			profile = nextProfile;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Impossible de charger votre espace client.';
		} finally {
			loading = false;
		}
	});

	async function copyKey() {
		if (!profile) return;
		try {
			await navigator.clipboard.writeText(profile.activation_key);
			copied = true;
			window.setTimeout(() => (copied = false), 1800);
		} catch {
			errorMessage = 'Copie impossible depuis ce navigateur.';
		}
	}

	async function logout() {
		await supabase?.auth.signOut();
		await goto('/connexion');
	}
</script>

<svelte:head>
	<title>Espace client | Behar Tech Pro</title>
	<meta
		name="description"
		content="Votre espace client Behar Tech Pro, votre clé d’activation et vos accès."
	/>
</svelte:head>

<main class="min-h-screen bg-[#FAFAF8] px-5 py-7 text-[#1A1916]">
	{#if loading}
		<div class="flex min-h-[80vh] items-center justify-center">
			<div
				class="h-7 w-7 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]"
				aria-label="Chargement"
			></div>
		</div>
	{:else if errorMessage}
		<section class="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
			<div class="w-full rounded-[16px] border border-red-200 bg-white p-7 text-center">
				<p class="text-sm font-medium text-red-700">{errorMessage}</p>
				<a
					class="mt-6 inline-flex rounded-[10px] bg-[#111111] px-5 py-3 text-sm font-semibold text-white"
					href="/connexion"
				>
					Connexion
				</a>
			</div>
		</section>
	{:else if profile}
		<header class="mx-auto grid max-w-[1080px] grid-cols-[1fr_auto_1fr] items-center gap-4">
			<a
				href="/"
				class="inline-flex items-center justify-self-start text-sm font-medium transition hover:text-[#2A9D8F]"
			>
				<span class="mr-2 text-xl leading-none">‹</span>
				Retour
			</a>
			<BrandLogo centered compact />
			<button
				type="button"
				class="justify-self-end text-sm font-medium text-[#6B6B6B] underline underline-offset-4 transition hover:text-[#1A1916]"
				on:click={logout}
			>
				Déconnexion
			</button>
		</header>

		<section class="mx-auto mt-9 max-w-[1052px] pb-12">
			<div class="text-center">
				<h1 class="text-[38px] font-semibold leading-tight tracking-normal sm:text-[44px]">
					Votre espace est prêt
				</h1>
				<p class="mt-3 text-[16px] leading-7 text-[#6B6B6B]">
					Retrouvez vos accès, votre clé et vos prochaines étapes.
				</p>
				<span
					class="mt-6 inline-flex items-center rounded-full bg-[#2A9D8F]/10 px-3 py-1.5 text-[13px] font-semibold text-[#0E766B]"
				>
					<span class="mr-2 h-2 w-2 rounded-full bg-[#2A9D8F]"></span>
					Compte actif
				</span>
			</div>

			<div class="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
				<section class="rounded-[16px] border border-[#E8E5DF] bg-white p-6 sm:p-7">
					<h2 class="text-[14px] font-semibold">Votre clé d’activation</h2>
					<div
						class="mt-5 flex flex-col gap-5 rounded-[14px] border border-[#E8E5DF] bg-[#FAFAF8] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
					>
						<p class="break-all font-mono text-[22px] font-semibold tracking-normal sm:text-[26px]">
							{profile.activation_key}
						</p>
						<button
							type="button"
							class="h-11 shrink-0 rounded-[8px] border border-[#E8E5DF] bg-white px-4 text-[13px] font-semibold transition hover:border-[#2A9D8F]"
							on:click={copyKey}
						>
							{copied ? 'Clé copiée' : 'Copier la clé'}
						</button>
					</div>
					<p class="mt-5 max-w-xl text-[13px] leading-6 text-[#6B6B6B]">
						Conservez cette clé en lieu sûr. Elle vous sera demandée pour connecter vos appareils.
					</p>
				</section>

				<section class="rounded-[16px] border border-[#E8E5DF] bg-white p-6 sm:p-7">
					<h2 class="text-[14px] font-semibold">Détails de votre compte</h2>
					<div class="mt-5 space-y-3.5 text-[13px]">
						<div class="bt-detail"><span>E-mail</span><strong>{profile.email}</strong></div>
						<div class="bt-detail">
							<span>Téléphone</span><strong>{profile.phone || 'À compléter'}</strong>
						</div>
						<div class="bt-detail">
							<span>Code postal</span><strong>{profile.postal_code || 'À compléter'}</strong>
						</div>
						<div class="bt-detail">
							<span>Entreprise</span><strong>{profile.company_name || 'Behar Tech Pro'}</strong>
						</div>
						<div class="bt-detail border-t border-[#E8E5DF] pt-4">
							<span>Plan</span><strong>{planLabel}</strong>
						</div>
						<div class="bt-detail">
							<span>Statut</span>
							<strong
								><span class="mr-2 inline-block h-2 w-2 rounded-full bg-[#2A9D8F]"
								></span>{statusLabel}</strong
							>
						</div>
					</div>
				</section>
			</div>

			<div class="mt-5 grid gap-5 md:grid-cols-3">
				<section class="rounded-[14px] border border-[#E8E5DF] bg-white p-5">
					<p class="text-[13px] font-semibold">Réparations restantes</p>
					<p class="mt-2 text-[23px] font-semibold">
						{repairsRemaining} <span class="text-[#6B6B6B]">/ {profile.repairs_limit}</span>
					</p>
					<p class="mt-1 text-[13px] text-[#6B6B6B]">Ce mois-ci</p>
				</section>
				<section class="rounded-[14px] border border-[#E8E5DF] bg-white p-5">
					<p class="text-[13px] font-semibold">SMS restants</p>
					<p class="mt-2 text-[23px] font-semibold">
						{smsRemaining} <span class="text-[#6B6B6B]">/ {profile.sms_limit}</span>
					</p>
					<p class="mt-1 text-[13px] text-[#6B6B6B]">Ce mois-ci</p>
				</section>
				<section class="rounded-[14px] border border-[#E8E5DF] bg-white p-5">
					<p class="text-[13px] font-semibold">Appareils connectés</p>
					<p class="mt-2 text-[23px] font-semibold">
						{profile.devices_used} <span class="text-[#6B6B6B]">/ {profile.devices_limit}</span>
					</p>
					<p class="mt-1 text-[13px] text-[#6B6B6B]">Limite incluse dans votre plan</p>
				</section>
			</div>

			<section class="mt-8">
				<h2 class="text-[18px] font-semibold">Accéder à votre espace</h2>
				<div class="mt-4 grid gap-5 md:grid-cols-3">
					<a class="bt-access-card" href="/dashboard">
						<span>
							<strong>Accéder au dashboard</strong>
							<small>Vue d’ensemble de votre activité et de vos performances.</small>
						</span>
						<span aria-hidden="true">→</span>
					</a>
					<a class="bt-access-card" href="/comptoir">
						<span>
							<strong>Accéder au comptoir</strong>
							<small>Gérer les clients, les réparations et les encaissements.</small>
						</span>
						<span aria-hidden="true">→</span>
					</a>
					<a class="bt-access-card" href="/atelier">
						<span>
							<strong>Accéder à l’atelier</strong>
							<small>Suivre vos interventions et vos techniciens.</small>
						</span>
						<span aria-hidden="true">→</span>
					</a>
				</div>
			</section>

			<section
				class="mt-5 flex flex-col gap-5 rounded-[14px] border border-[#E8E5DF] bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
			>
				<div>
					<h2 class="text-[14px] font-semibold">Inviter plus tard</h2>
					<p class="mt-2 text-[13px] text-[#6B6B6B]">
						Ajoutez des membres à votre équipe quand vous le souhaitez.
					</p>
				</div>
				<a
					class="inline-flex h-11 items-center justify-center rounded-[8px] border border-[#E8E5DF] bg-white px-5 text-[13px] font-semibold transition hover:border-[#2A9D8F]"
					href="/billing"
				>
					Gérer mon abonnement
				</a>
			</section>
		</section>
	{/if}
</main>

<style>
	.bt-detail {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.bt-detail span {
		color: #6b6b6b;
	}

	.bt-detail strong {
		text-align: right;
		font-weight: 500;
		color: #1a1916;
	}

	.bt-access-card {
		display: flex;
		min-height: 6.4rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-radius: 14px;
		border: 1px solid #e8e5df;
		background: #ffffff;
		padding: 1.25rem;
		color: #1a1916;
		transition:
			border-color 160ms ease,
			transform 160ms ease;
	}

	.bt-access-card:hover {
		border-color: #2a9d8f;
		transform: translateY(-1px);
	}

	.bt-access-card strong {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.bt-access-card small {
		margin-top: 0.6rem;
		display: block;
		color: #6b6b6b;
		font-size: 0.8125rem;
		line-height: 1.55;
	}
</style>
