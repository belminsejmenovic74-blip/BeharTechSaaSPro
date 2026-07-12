<script lang="ts">
	import DiscordSvg from '$lib/imgs/discord.svg';
	import TwitterSvg from '$lib/imgs/x.svg';
	import { Input } from '$lib/components/ui/input';
	import Button from '$lib/components/ui/button/button.svelte';
	import { getCms } from '$lib/cms/context';
	import { editable } from '$lib/editor/editable';

	const cms = getCms();
	$: footer = $cms.footer;

	const footerSocials = [
		{ href: '', name: 'Discord', icon: DiscordSvg },
		{ href: '', name: 'Twitter', icon: TwitterSvg }
	];
</script>

<footer>
	<div class="mx-auto w-full max-w-screen-xl xl:pb-2">
		<div class="gap-4 p-4 px-8 py-16 sm:pb-16 md:flex md:justify-between">
			<div class="mb-12 flex flex-col gap-4">
				<a href="/" class="flex items-center gap-1.5 text-2xl font-semibold">
					{footer.brand}<span
						class="rounded-[5px] border px-1.5 py-0.5 text-[11px] font-bold uppercase leading-none tracking-wide"
						>PRO</span
					>
				</a>
				<p use:editable={{ id: 'footer.tagline', kind: 'text', path: 'footer.tagline', label: 'Slogan', multiline: true }} class="max-w-xs">{footer.tagline}</p>
				<div class="mt-2 flex max-w-xs flex-col gap-2">
					<h2
						use:editable={{ id: 'footer.newsletterTitle', kind: 'heading', path: 'footer.newsletterTitle', label: 'Titre newsletter' }}
						class="text-sm font-medium uppercase tracking-tighter text-gray-900"
					>
						{footer.newsletterTitle}
					</h2>
					<form class="flex items-center gap-2" on:submit|preventDefault={() => {}}>
						<Input type="email" placeholder={footer.newsletterPlaceholder} class="h-9" />
						<Button type="submit" size="sm">{footer.newsletterButton}</Button>
					</form>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
				{#each footer.columns as nav, ci}
					<div>
						<h2
							use:editable={{ id: `footer.columns.${ci}.label`, kind: 'heading', path: `footer.columns.${ci}.label`, label: 'Titre de colonne' }}
							class="mb-6 text-sm font-medium uppercase tracking-tighter text-gray-900"
						>
							{nav.label}
						</h2>
						<ul class="grid gap-2">
							{#each nav.items as item, ii}
								<li>
									<a
										href={item.href}
										use:editable={{ id: `footer.columns.${ci}.items.${ii}`, kind: 'button', path: `footer.columns.${ci}.items.${ii}.label`, label: 'Lien', fields: { href: `footer.columns.${ci}.items.${ii}.href` } }}
										class="cursor-pointer text-sm font-[450] text-gray-400 duration-200 hover:text-gray-600"
									>
										{item.label}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>

		<div
			class="flex flex-col gap-2 rounded-md border-neutral-700/20 px-8 py-4 sm:flex sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex items-center space-x-5 sm:mt-0 sm:justify-center">
				{#each footerSocials as social}
					<a href={social.href} class="fill-gray-500 text-gray-500 hover:fill-gray-900 hover:text-gray-900">
						<img src={social.icon} class="size-4" alt={social.name} />
						<span class="sr-only">{social.name}</span>
					</a>
				{/each}
			</div>
			<span class="text-sm text-gray-500 sm:text-center">
				© {new Date().getFullYear()}
				<a href="/" use:editable={{ id: 'footer.copyright', kind: 'heading', path: 'footer.copyright', label: 'Copyright' }} class="cursor-pointer">{footer.copyright}</a>. Tous droits réservés.
			</span>
		</div>
	</div>
</footer>
