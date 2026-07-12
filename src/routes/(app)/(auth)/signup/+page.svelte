<script lang="ts">
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
</script>

<svelte:head>
	<title>Inscription | Behar Tech Pro</title>
	<meta name="description" content="Inscription à Behar Tech Pro" />
</svelte:head>

<AuthCard initialMode="signup" showProgress />
