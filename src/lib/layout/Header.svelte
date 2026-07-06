<script lang="ts">
	import { cn } from '$lib/utils';
	import { AlignJustify, XIcon } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { getCms } from '$lib/cms/context';

	const cms = getCms();
	$: header = $cms.header;
	// Menu mobile = liens de nav + connexion + CTA.
	$: mobileItems = [
		...header.nav,
		{ label: header.loginLabel, href: header.loginHref },
		{ label: header.ctaLabel, href: header.ctaHref }
	];

	let hamburgerMenuIsOpen = false;

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
		<a class="text-md flex items-center gap-1.5 font-semibold" href="/">
			{header.brand}<span
				class="rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide"
				>{header.badge}</span
			>
		</a>

		<div class="ml-auto hidden items-center gap-6 md:flex lg:gap-8">
			{#each header.nav as item}
				<a href={item.href} class="text-sm text-gray-600 transition hover:text-[#1A1916]">{item.label}</a>
			{/each}
			<a class="text-sm text-[#1A1916]" href={header.loginHref}>{header.loginLabel}</a>
			<a
				class="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
				style="background: var(--bt-button)"
				href={header.ctaHref}>{header.ctaLabel}</a
			>
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
			<a class="text-md flex items-center gap-1.5 font-semibold" href="/">
				{header.brand}<span
					class="rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide"
					>{header.badge}</span
				>
			</a>
			<button class="md:hidden" use:toggleOverflowHidden>
				<span class="sr-only">Toggle menu</span>
				<XIcon strokeWidth={1.4} class="text-gray-400" />
			</button>
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
