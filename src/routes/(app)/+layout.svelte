<script lang="ts">
	import { page } from '$app/stores';
	import Footer from '$lib/layout/Footer.svelte';
	import Header from '$lib/layout/Header.svelte';
</script>

{#if $page.url.pathname === '/'}
	<slot />
{:else}
	<div class="min-h-screen bg-background font-sans antialiased">
		<Header />
		<div class="mx-auto flex-1 overflow-hidden">
			<slot />
		</div>
		<Footer />
	</div>
{/if}
