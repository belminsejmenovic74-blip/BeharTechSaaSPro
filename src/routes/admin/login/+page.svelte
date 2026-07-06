<script lang="ts">
	import { enhance } from '$app/forms';
	import { LockIcon } from 'lucide-svelte';

	export let form: { error?: string } | null = null;
	let loading = false;
</script>

<svelte:head><title>Admin · Behar Tech Pro</title></svelte:head>

<div class="flex min-h-screen items-center justify-center px-6">
	<div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
		<div class="mb-6 flex flex-col items-center gap-3 text-center">
			<span class="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
				<LockIcon class="size-5" />
			</span>
			<div>
				<h1 class="text-lg font-semibold">Espace administrateur</h1>
				<p class="mt-1 text-sm text-slate-500">Behar Tech Pro — gestion du contenu</p>
			</div>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="flex flex-col gap-3"
		>
			<label class="text-sm font-medium text-slate-700" for="password">Mot de passe</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				class="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
				placeholder="••••••••"
			/>
			{#if form?.error}
				<p class="text-sm text-red-600">{form.error}</p>
			{/if}
			<button
				type="submit"
				disabled={loading}
				class="mt-2 h-10 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
			>
				{loading ? 'Connexion…' : 'Se connecter'}
			</button>
		</form>
	</div>
</div>
