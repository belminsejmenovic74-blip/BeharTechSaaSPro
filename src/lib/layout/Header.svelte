<script lang="ts">
	import { cn } from '$lib/utils';
	import { AlignJustify, XIcon } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { getCms } from '$lib/cms/context';
	import { editable } from '$lib/editor/editable';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import ClerkUserButton from '$lib/components/auth/ClerkUserButton.svelte';
	import { clerkSession, getClerk } from '$lib/auth/clerk';
	import { onMount } from 'svelte';
	import posthog from 'posthog-js';

	const cms = getCms();
	$: header = $cms.header;

	function onNavCtaClick() {
		posthog.capture('nav_cta_clicked', { cta_label: header.ctaLabel, cta_href: header.ctaHref });
	}
	// Menu mobile = liens de nav + connexion + CTA.
	$: mobileItems = [
		...header.nav,
		...($clerkSession.signedIn
			? []
			: [
					...(header.loginLabel ? [{ label: header.loginLabel, href: header.loginHref }] : []),
					{ label: header.ctaLabel, href: header.ctaHref }
				])
	];

	let hamburgerMenuIsOpen = false;

	onMount(() => {
		getClerk().catch((error) => console.error('[clerk] initialization failed', error));
	});

	function toggleOverflowHidden(node: HTMLElement) {
		node.addEventListener('click', () => {
			hamburgerMenuIsOpen = !hamburgerMenuIsOpen;
			const html = document.querySelector('html');
			if (html) {
				if (hamburgerMenuIsOpen) html.classList.add('overflow-hidden');
				else html.classList.remove('overflow-hidden');
			}
		});
	}
</script>

<header
	class="fixed left-0 top-0 z-50 w-full -translate-y-4 animate-fade-in border-b border-[rgba(26,25,22,0.08)] opacity-0"
	style="background: var(--bt-glass-bg); backdrop-filter: blur(var(--bt-glass-blur)); -webkit-backdrop-filter: blur(var(--bt-glass-blur));"
>
	<div class="container flex h-20 items-center justify-between">
		<BrandLogo size="h-11" />

		<div class="ml-auto hidden items-center gap-6 md:flex lg:gap-8">
			{#each header.nav as item, i}
				<a
					href={item.href}
					use:editable={{ id: `header.nav.${i}`, kind: 'button', path: `header.nav.${i}.label`, label: 'Lien de nav', fields: { href: `header.nav.${i}.href` } }}
					class="text-sm text-gray-600 transition hover:text-[#1A1916]">{item.label}</a
				>
			{/each}
			{#if $clerkSession.signedIn}
				<ClerkUserButton />
			{:else}
				{#if header.loginLabel}
					<a
						class="text-sm text-[#1A1916]"
						href={header.loginHref}
						use:editable={{ id: 'header.login', kind: 'button', path: 'header.loginLabel', label: 'Connexion', fields: { href: 'header.loginHref' } }}
						>{header.loginLabel}</a
					>
				{/if}
				<a
					class="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
					style="background: var(--bt-button)"
					href={header.ctaHref}
					use:editable={{ id: 'header.cta', kind: 'button', path: 'header.ctaLabel', label: 'CTA en-tête', fields: { href: 'header.ctaHref' } }}
					on:click={onNavCtaClick}>{header.ctaLabel}</a
				>
			{/if}
		</div>
		<button class="ml-6 md:hidden" use:toggleOverflowHidden>
			<span class="sr-only">Toggle menu</span>
			{#if hamburgerMenuIsOpen}
				<XIcon strokeWidth={1.4} class="text-gray-400" />
			{:else}
				<AlignJustify strokeWidth={1.4} class="text-gray-400" />
			{/if}
		</button>
	</div>
</header>

<nav
	class={cn(`fixed left-0 top-0 z-50 h-screen w-full overflow-auto `, {
		'pointer-events-none': !hamburgerMenuIsOpen,
		'bg-background/70 backdrop-blur-md': hamburgerMenuIsOpen
	})}
>
	{#if hamburgerMenuIsOpen}
		<div class="container flex h-20 items-center justify-between">
			<BrandLogo size="h-11" />
			<div class="flex items-center gap-4">
				{#if $clerkSession.signedIn}<ClerkUserButton />{/if}
				<button class="md:hidden" use:toggleOverflowHidden>
					<span class="sr-only">Toggle menu</span>
					<XIcon strokeWidth={1.4} class="text-gray-400" />
				</button>
			</div>
		</div>
		<ul in:fly={{ y: -30, duration: 400 }} class="flex flex-col uppercase ease-in">
			{#each mobileItems as item}
				<li class="border-b py-0.5 pl-6">
					<a class="flex h-[var(--navigation-height)] w-full items-center text-xl" href={item.href}>
						{item.label}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</nav>
