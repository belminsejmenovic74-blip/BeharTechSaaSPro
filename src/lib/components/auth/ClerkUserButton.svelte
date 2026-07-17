<script lang="ts">
	import { onMount } from 'svelte';
	import { getClerk } from '$lib/auth/clerk';

	let mountNode: HTMLDivElement;

	onMount(() => {
		let mounted = false;
		let clerk: Awaited<ReturnType<typeof getClerk>> | undefined;

		getClerk().then((instance) => {
			clerk = instance;
			if (!instance.isSignedIn) return;
			instance.mountUserButton(mountNode, {
				appearance: {
					elements: {
						avatarBox: 'h-10 w-10 ring-1 ring-black/10'
					}
				}
			});
			mounted = true;
		});

		return () => {
			if (mounted && clerk && mountNode) clerk.unmountUserButton(mountNode);
		};
	});
</script>

<div bind:this={mountNode} aria-label="Compte utilisateur"></div>
