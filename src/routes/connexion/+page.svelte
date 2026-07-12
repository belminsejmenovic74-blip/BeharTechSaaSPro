<script lang="ts">
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
</script>

<svelte:head>
	<title>Connexion | Behar Tech Pro</title>
	<meta
		name="description"
		content="Connectez-vous pour accéder à votre espace client Behar Tech Pro."
	/>
</svelte:head>

<AuthCard initialMode="signin" />
