<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Toaster } from '$lib/components/ui/sonner';
	import { isAuthed } from '$lib/cms/local';

	// Garde côté client (site statique : pas de serveur).
	onMount(() => {
		if (!isAuthed() && !$page.url.pathname.startsWith('/admin/login')) {
			goto('/admin/login');
		}
	});
</script>

<div class="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
	<slot></slot>
</div>
<Toaster />
