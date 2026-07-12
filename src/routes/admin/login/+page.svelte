<script lang="ts">
	import { goto } from '$app/navigation';
	import { LockIcon } from 'lucide-svelte';
	import { loginAdmin } from '$lib/cms/db';
	import { setAdminSession } from '$lib/cms/local';
	import posthog from 'posthog-js';

	let password = '';
	let error = '';
	let loading = false;

	async function submit() {
		error = '';
		loading = true;
		try {
			const token = await loginAdmin(password);
			setAdminSession(token);
			posthog.capture('admin_login_succeeded');
			goto('/admin');
		} catch {
			error = 'Mot de passe incorrect.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Admin · Behar Tech Pro</title></svelte:head>

<div class="flex min-h-screen items-center justify-center px-6">
	<form
		on:submit|preventDefault={submit}
		class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
	>
		<div class="mb-6 flex flex-col items-center gap-3 text-center">
			<span
				class="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
			>
				<LockIcon class="size-5" />
			</span>
			<div>
				<h1 class="text-lg font-semibold">Espace administrateur</h1>
				<p class="mt-1 text-sm text-slate-500">Behar Tech Pro — édition du site</p>
			</div>
		</div>
		<label class="mb-1.5 block text-sm font-medium text-slate-700" for="pw">Mot de passe</label>
		<input
			id="pw"
			type="password"
			bind:value={password}
			class="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
			placeholder="••••••••"
		/>
		{#if error}<p class="mt-2 text-sm text-red-600">{error}</p>{/if}
		<button
			type="submit"
			disabled={loading}
			class="mt-4 h-10 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
		>
			{loading ? 'Connexion…' : 'Se connecter'}
		</button>
	</form>
</div>
