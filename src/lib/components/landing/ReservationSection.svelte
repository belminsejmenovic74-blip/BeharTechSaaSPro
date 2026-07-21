<script lang="ts">
	import { getCms } from '$lib/cms/context';
	import { editable } from '$lib/editor/editable';

	const cms = getCms();
	$: cta = $cms.cta;

	let step: 1 | 2 = 1;
	let state: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let errorMsg = '';

	let firstName = '';
	let lastName = '';
	let email = '';
	let phone = '';
	let shopName = '';
	let selectedDate = '';
	let selectedTime = '';
	let company = ''; // honeypot

	$: canContinue =
		firstName.trim() && lastName.trim() && shopName.trim() && email.trim() && phone.trim();

	// Prochains jours ouvrés (hors dimanche), à partir de demain.
	type Day = { iso: string; weekday: string; label: string };
	const days: Day[] = (() => {
		const out: Day[] = [];
		const d = new Date();
		d.setHours(12, 0, 0, 0);
		while (out.length < 12) {
			d.setDate(d.getDate() + 1);
			if (d.getDay() === 0) continue; // dimanche fermé
			out.push({
				iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
				weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d),
				label: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d)
			});
		}
		return out;
	})();

	const slots: string[] = [];
	for (let m = 9 * 60; m <= 18 * 60 + 30; m += 30) {
		slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
	}

	function goStep2() {
		if (!canContinue) {
			errorMsg = 'Merci de remplir tous les champs.';
			state = 'error';
			return;
		}
		errorMsg = '';
		state = 'idle';
		step = 2;
	}

	async function submit(withSlot: boolean) {
		if (state === 'loading') return;
		if (withSlot && (!selectedDate || !selectedTime)) {
			errorMsg = 'Choisissez un jour et une heure.';
			state = 'error';
			return;
		}
		state = 'loading';
		errorMsg = '';
		try {
			const res = await fetch('/api/reservation', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					firstName,
					lastName,
					email,
					phone,
					shopName,
					date: withSlot ? selectedDate : undefined,
					time: withSlot ? selectedTime : undefined,
					company
				})
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.ok) {
				state = 'success';
			} else {
				state = 'error';
				errorMsg = data.error || 'Une erreur est survenue. Réessayez.';
			}
		} catch {
			state = 'error';
			errorMsg = 'Connexion impossible. Réessayez.';
		}
	}
</script>

<section id="cta" class="relative scroll-mt-28 overflow-hidden px-6 py-24 md:px-8">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[360px] max-w-5xl"
		style="background: radial-gradient(70% 60% at 50% 0%, rgba(255,214,186,0.7), transparent 66%);"
	></div>

	<div class="mx-auto max-w-xl">
		<div class="text-center">
			<h2
				use:editable={{ id: 'cta.title', kind: 'heading', path: 'cta.title', label: 'Titre' }}
				class="text-3xl font-bold tracking-tight sm:text-4xl"
				style="color: var(--bt-text)"
			>
				{cta.title}
			</h2>
			<p
				use:editable={{ id: 'cta.subtitle', kind: 'text', path: 'cta.subtitle', label: 'Sous-titre', multiline: true }}
				class="mx-auto mt-4 max-w-lg text-lg text-gray-500"
			>
				{cta.subtitle}
			</p>
		</div>

		{#if state === 'success'}
			<div class="mt-10 rounded-2xl border p-8 text-center" style="background: var(--bt-card); border-color: #cfe9e4">
				<p class="text-xl font-semibold" style="color: var(--bt-text)">C'est noté ✅</p>
				<p class="mx-auto mt-3 max-w-md text-gray-500">
					Merci {firstName} ! Un e-mail de confirmation vient de vous être envoyé.
					{selectedDate ? 'Votre rendez-vous est enregistré.' : 'Nous vous recontacterons très vite.'}
				</p>
				<a href="/exemple" class="mt-6 inline-block rounded-xl px-5 py-3 text-sm font-semibold text-white" style="background: var(--bt-button)">Voir la démo</a>
			</div>
		{:else}
			<div class="mt-10 rounded-2xl border p-6 sm:p-8" style="background: var(--bt-card); border-color: rgba(26,25,22,0.08)">
				<!-- Étape 1 : informations -->
				{#if step === 1}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<label class="block">
							<span class="lbl">Prénom</span>
							<input bind:value={firstName} required autocomplete="given-name" class="field" />
						</label>
						<label class="block">
							<span class="lbl">Nom</span>
							<input bind:value={lastName} required autocomplete="family-name" class="field" />
						</label>
						<label class="block sm:col-span-2">
							<span class="lbl">Nom de la boutique</span>
							<input bind:value={shopName} required autocomplete="organization" class="field" />
						</label>
						<label class="block">
							<span class="lbl">E-mail</span>
							<input bind:value={email} type="email" required autocomplete="email" class="field" />
						</label>
						<label class="block">
							<span class="lbl">Téléphone</span>
							<input bind:value={phone} type="tel" required autocomplete="tel" class="field" />
						</label>
					</div>

					<input bind:value={company} name="company" tabindex="-1" autocomplete="off" aria-hidden="true" class="absolute left-[-9999px] h-0 w-0 opacity-0" />

					{#if state === 'error'}<p class="mt-4 text-sm font-medium text-red-600">{errorMsg}</p>{/if}

					<button type="button" on:click={goStep2} class="btn-primary mt-6">Continuer</button>
					<p class="mt-3 text-center text-xs text-gray-500">Sans engagement · Aucun paiement aujourd'hui · Données confidentielles</p>

				<!-- Étape 2 : créneau optionnel -->
				{:else}
					<button type="button" on:click={() => (step = 1)} class="text-sm text-gray-500 hover:text-[#1a1916]">← Retour</button>

					<p class="mt-3 text-base font-semibold" style="color: var(--bt-text)">
						Réservez un créneau d'appel <span class="font-normal text-gray-400">(optionnel)</span>
					</p>
					<p class="mt-1 text-sm text-gray-500">Choisissez un moment qui vous arrange, ou laissez-nous vous rappeler.</p>

					<div class="mt-5">
						<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Jour</p>
						<div class="flex flex-wrap gap-2">
							{#each days as d}
								<button
									type="button"
									on:click={() => { selectedDate = d.iso; selectedTime = ''; }}
									class="chip"
									class:chip-active={selectedDate === d.iso}
								>
									<span class="block text-[11px] uppercase opacity-70">{d.weekday}</span>
									<span class="block font-semibold">{d.label}</span>
								</button>
							{/each}
						</div>
					</div>

					{#if selectedDate}
						<div class="mt-5">
							<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Heure</p>
							<div class="flex flex-wrap gap-2">
								{#each slots as s}
									<button
										type="button"
										on:click={() => (selectedTime = s)}
										class="chip"
										class:chip-active={selectedTime === s}
									>{s}</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if state === 'error'}<p class="mt-4 text-sm font-medium text-red-600">{errorMsg}</p>{/if}

					<button
						type="button"
						on:click={() => submit(true)}
						disabled={state === 'loading' || !selectedDate || !selectedTime}
						class="btn-primary mt-6"
					>
						{state === 'loading' ? 'Envoi…' : 'Confirmer le rendez-vous'}
					</button>
					<button
						type="button"
						on:click={() => submit(false)}
						disabled={state === 'loading'}
						class="mt-3 w-full rounded-xl border px-5 py-3 text-sm font-semibold transition hover:bg-black/[0.03] disabled:opacity-60"
						style="border-color: rgba(26,25,22,0.14); color: var(--bt-text)"
					>
						Non merci, rappelez-moi simplement
					</button>
				{/if}
			</div>
		{/if}
	</div>
</section>

<style>
	.lbl {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--bt-text);
	}
	.field {
		width: 100%;
		border-radius: 10px;
		border: 1px solid rgba(26, 25, 22, 0.14);
		background: #fff;
		padding: 11px 14px;
		font-size: 15px;
		color: var(--bt-text);
		outline: none;
		transition: border-color 150ms ease;
	}
	.field:focus {
		border-color: var(--bt-accent, #2a9d8f);
	}
	.btn-primary {
		width: 100%;
		border-radius: 12px;
		background: var(--bt-button);
		padding: 14px 20px;
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		transition: opacity 150ms ease;
	}
	.btn-primary:hover {
		opacity: 0.9;
	}
	.btn-primary:disabled {
		opacity: 0.6;
	}
	.chip {
		min-width: 64px;
		border-radius: 12px;
		border: 1px solid rgba(26, 25, 22, 0.14);
		background: #fff;
		padding: 8px 12px;
		font-size: 14px;
		line-height: 1.2;
		color: var(--bt-text);
		text-align: center;
		transition:
			border-color 120ms ease,
			background 120ms ease;
	}
	.chip:hover {
		border-color: var(--bt-accent, #2a9d8f);
	}
	.chip-active {
		border-color: var(--bt-accent, #2a9d8f);
		background: rgba(42, 157, 143, 0.1);
		color: var(--bt-accent, #2a9d8f);
	}
</style>
