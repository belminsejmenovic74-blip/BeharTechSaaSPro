<script lang="ts">
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
</script>

<svelte:head>
	<title>Inscription | Behar Tech Pro</title>
	<meta
		name="description"
		content="Créez votre compte Behar Tech Pro pour accéder à votre espace."
	/>
</svelte:head>

<AuthCard initialMode="signup" showProgress />
