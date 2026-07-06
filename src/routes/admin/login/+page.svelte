<script lang="ts">
	import { goto } from '$app/navigation';
	import { LockIcon } from 'lucide-svelte';
	import { ADMIN_PASSWORD, setAuthed } from '$lib/cms/local';

	let password = '';
	let error = '';

	function submit() {
		if (password === ADMIN_PASSWORD) {
			setAuthed(true);
			goto('/admin');
		} else {
			error = 'Mot de passe incorrect.';
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
			<span class="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
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
		<button type="submit" class="mt-4 h-10 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700">
			Se connecter
		</button>
	</form>
</div>
