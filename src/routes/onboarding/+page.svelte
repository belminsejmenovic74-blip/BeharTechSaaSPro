<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import {
		createTeamInvitations,
		ensureClientProfile,
		getCurrentUser,
		nextOnboardingStep,
		updateClientProfile,
		type ClientProfile,
		type TeamInvitationInput
	} from '$lib/auth/supabase';

	const teamSizes = ['Je suis seul', '2 à 5 personnes', '6 à 10 personnes', '11 personnes et +'];
	const acquisitionSources = [
		'IA',
		'Google',
		'Réseaux sociaux',
		'YouTube',
		'Bouche à oreille',
		'Partenaire',
		'Salon / événement',
		'Publicité',
		'Autre'
	];
	const roles: TeamInvitationInput['role'][] = ['Atelier', 'Comptoir', 'Admin', 'Lecture seule'];

	let loading = true;
	let saving = false;
	let errorMessage = '';
	let licenseEmailNotice = '';
	let userId = '';
	let profile: ClientProfile | null = null;
	let currentStep = 1;
	let selectedPlan = 'free';

	let personal = {
		first_name: '',
		last_name: '',
		phone: '',
		email: '',
		postal_code: ''
	};

	let company = {
		company_name: '',
		company_city: '',
		postal_code: '',
		company_country: 'France',
		company_phone: '',
		company_website: ''
	};

	let team_size = '';
	let acquisition_source = '';
	let invitations: TeamInvitationInput[] = [
		{ email: '', role: 'Atelier' },
		{ email: '', role: 'Comptoir' },
		{ email: '', role: 'Admin' }
	];

	$: progressLabel = `${currentStep}/7`;

	function hydrateForm(nextProfile: ClientProfile) {
		profile = nextProfile;
		personal = {
			first_name: nextProfile.first_name || '',
			last_name: nextProfile.last_name || '',
			phone: nextProfile.phone || '',
			email: nextProfile.email || '',
			postal_code: nextProfile.postal_code || ''
		};
		company = {
			company_name: nextProfile.company_name || '',
			company_city: nextProfile.company_city || '',
			postal_code: nextProfile.postal_code || '',
			company_country: nextProfile.company_country || 'France',
			company_phone: nextProfile.company_phone || '',
			company_website: nextProfile.company_website || ''
		};
		team_size = nextProfile.team_size || '';
		acquisition_source = nextProfile.acquisition_source || '';
	}

	onMount(async () => {
		try {
			try { selectedPlan = JSON.parse(localStorage.getItem('btp_selected_plan') || '{}').plan || 'free'; } catch { selectedPlan = 'free'; }
			const user = await getCurrentUser();
			if (!user) {
				loading = false;
				currentStep = 1;
				return;
			}

			userId = user.id;
			const nextProfile = await ensureClientProfile(user);
			if (!nextProfile) throw new Error('Profil client introuvable.');
			if (nextProfile.onboarding_completed) {
				await goto('/client');
				return;
			}

			hydrateForm(nextProfile);
			currentStep = nextOnboardingStep(nextProfile);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Impossible de charger votre onboarding.';
		} finally {
			loading = false;
		}
	});

	function isEmail(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}

	function requireFields(fields: string[], message: string) {
		if (fields.some((field) => !field.trim())) {
			errorMessage = message;
			return false;
		}
		errorMessage = '';
		return true;
	}

	async function savePersonal() {
		if (
			!requireFields(
				[
					personal.first_name,
					personal.last_name,
					personal.phone,
					personal.email,
					personal.postal_code
				],
				'Complétez vos informations personnelles.'
			)
		)
			return;
		if (!isEmail(personal.email)) {
			errorMessage = 'Indiquez une adresse e-mail valide.';
			return;
		}

		saving = true;
		try {
			const updated = await updateClientProfile(userId, {
				first_name: personal.first_name.trim(),
				last_name: personal.last_name.trim(),
				phone: personal.phone.trim(),
				postal_code: personal.postal_code.trim()
			});
			if (updated) hydrateForm(updated);
			currentStep = 3;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Sauvegarde impossible.';
		} finally {
			saving = false;
		}
	}

	async function saveCompany() {
		if (
			!requireFields(
				[
					company.company_name,
					company.company_city,
					company.postal_code,
					company.company_country,
					company.company_phone
				],
				'Complétez les informations de votre atelier.'
			)
		)
			return;

		saving = true;
		try {
			const updated = await updateClientProfile(userId, {
				company_name: company.company_name.trim(),
				company_city: company.company_city.trim(),
				postal_code: company.postal_code.trim(),
				company_country: company.company_country.trim(),
				company_phone: company.company_phone.trim(),
				company_website: company.company_website.trim()
			});
			if (updated) hydrateForm(updated);
			currentStep = 4;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Sauvegarde impossible.';
		} finally {
			saving = false;
		}
	}

	async function saveTeamSize() {
		if (!team_size) {
			errorMessage = 'Choisissez une taille d’équipe.';
			return;
		}

		saving = true;
		try {
			const updated = await updateClientProfile(userId, { team_size });
			if (updated) hydrateForm(updated);
			currentStep = 5;
			errorMessage = '';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Sauvegarde impossible.';
		} finally {
			saving = false;
		}
	}

	async function saveAcquisitionSource() {
		if (!acquisition_source) {
			errorMessage = 'Choisissez une réponse.';
			return;
		}

		saving = true;
		try {
			const updated = await updateClientProfile(userId, { acquisition_source });
			if (updated) hydrateForm(updated);
			currentStep = 6;
			errorMessage = '';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Sauvegarde impossible.';
		} finally {
			saving = false;
		}
	}

	function addInvitation() {
		invitations = [...invitations, { email: '', role: 'Lecture seule' }];
	}

	async function completeOnboarding(sendInvitations: boolean) {
		const filledInvitations = invitations.filter((invitation) => invitation.email.trim());
		if (sendInvitations && filledInvitations.some((invitation) => !isEmail(invitation.email))) {
			errorMessage = 'Vérifiez les adresses e-mail des invitations.';
			return;
		}

		saving = true;
		try {
			if (sendInvitations) await createTeamInvitations(userId, filledInvitations);
			const updated = await updateClientProfile(userId, { onboarding_completed: true });
			if (updated) hydrateForm(updated);
			const emailResponse = await fetch('/api/email/license', { method: 'POST' });
			licenseEmailNotice = emailResponse.ok
				? 'Un e-mail contenant votre clé de licence vient de vous être envoyé.'
				: 'Votre clé est disponible ci-dessous. L’e-mail sera envoyé dès que le service d’envoi sera configuré.';
			currentStep = 7;
			errorMessage = '';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Finalisation impossible.';
		} finally {
			saving = false;
		}
	}

	async function goBack() {
		errorMessage = '';
		if (currentStep > 2) {
			currentStep -= 1;
			return;
		}
		await goto('/inscription');
	}
</script>

<svelte:head>
	<title>Onboarding | Behar Tech Pro</title>
	<meta name="description" content="Configurez votre espace Behar Tech Pro." />
</svelte:head>

{#if loading}
	<main class="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-[#1A1916]">
		<div
			class="h-7 w-7 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]"
			aria-label="Chargement"
		></div>
	</main>
{:else if currentStep === 1}
	<AuthCard initialMode="signup" showProgress />
{:else}
	<main class="min-h-screen bg-[#FAFAF8] px-5 py-7 text-[#1A1916]">
		<button
			type="button"
			class="inline-flex items-center text-sm font-medium transition hover:text-[#2A9D8F]"
			on:click={goBack}
		>
			<span class="mr-2 text-xl leading-none">‹</span>
			Retour
		</button>

		<section
			class="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-[430px] flex-col items-center justify-center py-8"
		>
			<BrandLogo centered compact />

			<div class="mt-10 flex w-full items-center justify-center gap-8">
				<div class="flex items-center gap-2" aria-label={`Progression ${progressLabel}`}>
					{#each Array(7) as _, index}
						<span
							class={`h-[5px] w-[22px] rounded-full ${index < currentStep ? 'bg-[#2A9D8F]' : 'bg-[#DDDAD5]'}`}
						></span>
					{/each}
				</div>
				<span class="text-sm text-[#6B6B6B]">{progressLabel}</span>
			</div>

			{#if currentStep === 2}
				<div class="mt-9 w-full text-center">
					<h1 class="text-[28px] font-semibold leading-tight sm:text-[30px]">Parlons de vous</h1>
					<p class="mt-3 text-[15px] leading-6 text-[#6B6B6B]">
						Renseignez vos informations pour créer votre espace.
					</p>
				</div>
				<form class="mt-8 w-full space-y-4" on:submit|preventDefault={savePersonal}>
					<input
						class="bt-input"
						placeholder="Prénom"
						bind:value={personal.first_name}
						autocomplete="given-name"
					/>
					<input
						class="bt-input"
						placeholder="Nom"
						bind:value={personal.last_name}
						autocomplete="family-name"
					/>
					<input
						class="bt-input"
						placeholder="Numéro de téléphone"
						bind:value={personal.phone}
						autocomplete="tel"
					/>
					<input
						class="bt-input"
						placeholder="E-mail"
						bind:value={personal.email}
						autocomplete="email"
					/>
					<input
						class="bt-input"
						placeholder="Code postal"
						bind:value={personal.postal_code}
						autocomplete="postal-code"
					/>
					<button class="bt-primary" type="submit" disabled={saving}
						>{saving ? 'Sauvegarde...' : 'Continuer'}</button
					>
				</form>
			{:else if currentStep === 3}
				<div class="mt-9 w-full text-center">
					<h1 class="text-[28px] font-semibold leading-tight sm:text-[30px]">Votre entreprise</h1>
					<p class="mt-3 text-[15px] leading-6 text-[#6B6B6B]">
						Ajoutez les informations de votre atelier.
					</p>
				</div>
				<form class="mt-8 w-full space-y-4" on:submit|preventDefault={saveCompany}>
					<input
						class="bt-input"
						placeholder="Nom de l’atelier"
						bind:value={company.company_name}
					/>
					<input class="bt-input" placeholder="Ville" bind:value={company.company_city} />
					<input
						class="bt-input"
						placeholder="Code postal"
						bind:value={company.postal_code}
						autocomplete="postal-code"
					/>
					<input class="bt-input" placeholder="Pays" bind:value={company.company_country} />
					<input
						class="bt-input"
						placeholder="Téléphone de l’atelier"
						bind:value={company.company_phone}
						autocomplete="tel"
					/>
					<input
						class="bt-input"
						placeholder="Site internet, optionnel"
						bind:value={company.company_website}
						autocomplete="url"
					/>
					<button class="bt-primary" type="submit" disabled={saving}
						>{saving ? 'Sauvegarde...' : 'Continuer'}</button
					>
				</form>
			{:else if currentStep === 4}
				<div class="mt-9 w-full text-center">
					<h1 class="text-[28px] font-semibold leading-tight sm:text-[30px]">
						Combien êtes-vous ?
					</h1>
					<p class="mx-auto mt-3 max-w-[400px] text-[15px] leading-6 text-[#6B6B6B]">
						Aidez-nous à adapter Behar Tech Pro à la taille de votre entreprise.
					</p>
				</div>
				<div class="mt-8 w-full space-y-3">
					{#each teamSizes as size}
						<button
							type="button"
							class={`bt-choice ${team_size === size ? 'border-[#2A9D8F] bg-white' : ''}`}
							on:click={() => (team_size = size)}
						>
							{size}
						</button>
					{/each}
					<button class="bt-primary mt-6" type="button" disabled={saving} on:click={saveTeamSize}>
						{saving ? 'Sauvegarde...' : 'Continuer'}
					</button>
				</div>
			{:else if currentStep === 5}
				<div class="mt-9 w-full text-center">
					<h1 class="text-[28px] font-semibold leading-tight sm:text-[30px]">
						Comment nous avez-vous connu ?
					</h1>
					<p class="mt-3 text-[15px] leading-6 text-[#6B6B6B]">
						Cela nous aide à mieux comprendre ce qui vous amène jusqu’à nous.
					</p>
				</div>
				<div class="mt-8 w-full space-y-3">
					{#each acquisitionSources as source}
						<button
							type="button"
							class={`bt-choice ${acquisition_source === source ? 'border-[#2A9D8F] bg-white' : ''}`}
							on:click={() => (acquisition_source = source)}
						>
							{source}
						</button>
					{/each}
					<button
						class="bt-primary mt-6"
						type="button"
						disabled={saving}
						on:click={saveAcquisitionSource}
					>
						{saving ? 'Sauvegarde...' : 'Continuer'}
					</button>
				</div>
			{:else if currentStep === 6}
				<div class="mt-9 w-full text-center">
					<h1 class="text-[28px] font-semibold leading-tight sm:text-[30px]">
						Invitez votre équipe
					</h1>
					<p class="mx-auto mt-3 max-w-[360px] text-[15px] leading-6 text-[#6B6B6B]">
						Ajoutez vos collègues maintenant ou passez cette étape plus tard.
					</p>
				</div>
				<div class="mt-8 w-full space-y-4">
					{#each invitations as invitation, index}
						<div class="grid gap-3 sm:grid-cols-[1fr_150px]">
							<input
								class="bt-input"
								placeholder="Adresse e-mail du collègue"
								type="email"
								bind:value={invitation.email}
							/>
							<select
								class="bt-input"
								bind:value={invitation.role}
								aria-label={`Rôle invitation ${index + 1}`}
							>
								{#each roles as role}
									<option value={role}>{role}</option>
								{/each}
							</select>
						</div>
					{/each}
					<button
						type="button"
						class="mx-auto flex text-[14px] text-[#6B6B6B] transition hover:text-[#1A1916]"
						on:click={addInvitation}
					>
						Ajouter un autre collègue
					</button>
					<button
						class="bt-primary mt-5"
						type="button"
						disabled={saving}
						on:click={() => completeOnboarding(true)}
					>
						{saving ? 'Envoi...' : 'Envoyer les invitations'}
					</button>
					<button
						type="button"
						class="mx-auto block text-[14px] text-[#6B6B6B] underline underline-offset-4 transition hover:text-[#1A1916]"
						on:click={() => completeOnboarding(false)}
						disabled={saving}
					>
						Passer cette étape
					</button>
				</div>
			{:else if currentStep === 7 && profile}
				<div class="mt-8 w-full text-center">
					<h1 class="text-[34px] font-semibold leading-tight sm:text-[40px]">
						Votre espace est prêt
					</h1>
					<p class="mt-3 text-[15px] leading-6 text-[#6B6B6B]">
						Retrouvez vos accès, votre clé et vos prochaines étapes.
					</p>
					<span
						class="mt-6 inline-flex items-center rounded-full bg-[#2A9D8F]/10 px-3 py-1.5 text-[13px] font-semibold text-[#0E766B]"
					>
						Compte actif
					</span>
				</div>
				<div class="mt-8 w-full rounded-[16px] border border-[#E8E5DF] bg-white p-6 text-left">
					<p class="text-[14px] font-semibold">Votre clé d’activation</p>
					<p class="mt-5 break-all font-mono text-[22px] font-semibold tracking-normal">
						{profile.activation_key}
					</p>
					<p class="mt-5 text-[13px] leading-6 text-[#6B6B6B]">
						Conservez cette clé en lieu sûr. Elle vous sera demandée pour connecter vos appareils.
					</p>
				</div>
				{#if licenseEmailNotice}<p class="mt-4 text-sm leading-6 text-[#167B70]">{licenseEmailNotice}</p>{/if}
				<a class="bt-primary mt-8" href={selectedPlan === 'free' || selectedPlan === 'gratuit' ? '/client' : '/billing'}>{selectedPlan === 'free' || selectedPlan === 'gratuit' ? 'Accéder à mon espace' : 'Finaliser mon abonnement'}</a>
			{/if}

			{#if errorMessage}
				<p
					class="mt-4 w-full rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-center text-[13px] leading-5 text-red-700"
				>
					{errorMessage}
				</p>
			{/if}
		</section>
	</main>
{/if}

<style>
	.bt-input {
		height: 52px;
		width: 100%;
		border-radius: 8px;
		border: 1px solid #e8e5df;
		background: #ffffff;
		padding: 0 1rem;
		color: #1a1916;
		font-size: 0.9375rem;
		outline: none;
	}

	.bt-input::placeholder {
		color: #6b6b6b;
	}

	.bt-input:focus {
		border-color: #2a9d8f;
	}

	.bt-primary {
		display: flex;
		min-height: 52px;
		width: 100%;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: #111111;
		padding: 0 1.25rem;
		color: #ffffff;
		font-size: 0.9375rem;
		font-weight: 600;
		transition:
			background 160ms ease,
			opacity 160ms ease;
	}

	.bt-primary:hover {
		background: #2a2a2a;
	}

	.bt-primary:disabled {
		cursor: wait;
		opacity: 0.68;
	}

	.bt-choice {
		min-height: 52px;
		width: 100%;
		border-radius: 8px;
		border: 1px solid #e8e5df;
		background: #ffffff;
		padding: 0 1rem;
		text-align: left;
		color: #1a1916;
		font-size: 0.9375rem;
		font-weight: 600;
		transition:
			border-color 160ms ease,
			transform 160ms ease;
	}

	.bt-choice:hover {
		border-color: #2a9d8f;
	}
</style>
