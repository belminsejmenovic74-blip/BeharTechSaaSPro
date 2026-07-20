<script lang="ts">
	import { getCms } from '$lib/cms/context';
	import { editable } from '$lib/editor/editable';

	const cms = getCms();
	$: cta = $cms.cta;

	let firstName = '';
	let lastName = '';
	let email = '';
	let phone = '';
	let shopName = '';
	let contactPref = 'peu-importe';
	let company = ''; // honeypot

	let state: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let errorMsg = '';

	async function submit() {
		if (state === 'loading') return;
		state = 'loading';
		errorMsg = '';
		try {
			const res = await fetch('/api/reservation', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ firstName, lastName, email, phone, shopName, contactPref, company })
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
			errorMsg = 'Connexion impossible. Vérifiez votre réseau et réessayez.';
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
			<div
				class="mt-10 rounded-2xl border p-8 text-center"
				style="background: var(--bt-card); border-color: #cfe9e4"
			>
				<p class="text-xl font-semibold" style="color: var(--bt-text)">Votre place est réservée ✅</p>
				<p class="mx-auto mt-3 max-w-md text-gray-500">
					Merci {firstName || ''} ! Un e-mail de confirmation vient de vous être envoyé. Nous vous
					recontacterons très vite.
				</p>
				<a
					href="/exemple"
					class="mt-6 inline-block rounded-xl px-5 py-3 text-sm font-semibold text-white"
					style="background: var(--bt-button)">Voir la démo en attendant</a
				>
			</div>
		{:else}
			<form
				class="mt-10 rounded-2xl border p-6 sm:p-8"
				style="background: var(--bt-card); border-color: rgba(26,25,22,0.08)"
				on:submit|preventDefault={submit}
			>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="mb-1 block text-sm font-medium" style="color: var(--bt-text)">Prénom</span>
						<input bind:value={firstName} required autocomplete="given-name" class="field" />
					</label>
					<label class="block">
						<span class="mb-1 block text-sm font-medium" style="color: var(--bt-text)">Nom</span>
						<input bind:value={lastName} required autocomplete="family-name" class="field" />
					</label>
					<label class="block sm:col-span-2">
						<span class="mb-1 block text-sm font-medium" style="color: var(--bt-text)">Nom de la boutique</span>
						<input bind:value={shopName} required autocomplete="organization" class="field" />
					</label>
					<label class="block">
						<span class="mb-1 block text-sm font-medium" style="color: var(--bt-text)">E-mail</span>
						<input bind:value={email} type="email" required autocomplete="email" class="field" />
					</label>
					<label class="block">
						<span class="mb-1 block text-sm font-medium" style="color: var(--bt-text)">Téléphone</span>
						<input bind:value={phone} type="tel" required autocomplete="tel" class="field" />
					</label>
					<label class="block sm:col-span-2">
						<span class="mb-1 block text-sm font-medium" style="color: var(--bt-text)">Quand vous recontacter ?</span>
						<select bind:value={contactPref} class="field">
							<option value="peu-importe">Peu importe</option>
							<option value="matin">Le matin</option>
							<option value="apres-midi">L'après-midi</option>
							<option value="soir">En soirée</option>
						</select>
					</label>
				</div>

				<!-- Honeypot anti-spam (masqué aux humains) -->
				<input
					bind:value={company}
					name="company"
					tabindex="-1"
					autocomplete="off"
					aria-hidden="true"
					class="absolute left-[-9999px] h-0 w-0 opacity-0"
				/>

				{#if state === 'error'}
					<p class="mt-4 text-sm font-medium text-red-600">{errorMsg}</p>
				{/if}

				<button
					type="submit"
					disabled={state === 'loading'}
					class="mt-6 w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
					style="background: var(--bt-button)"
				>
					{state === 'loading' ? 'Envoi…' : cta.button1Text || 'Réserver ma place'}
				</button>
				<p class="mt-3 text-center text-xs text-gray-500">
					Sans engagement · Aucun paiement aujourd'hui · Vos données restent confidentielles
				</p>
			</form>
		{/if}
	</div>
</section>

<style>
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
</style>
