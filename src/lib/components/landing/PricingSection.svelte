<script lang="ts">
	import { CheckIcon } from 'lucide-svelte';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import { fly } from 'svelte/transition';
	import { getCms } from '$lib/cms/context';
	import { editable } from '$lib/editor/editable';
	import posthog from 'posthog-js';

	type Interval = 'month' | 'year';

	const cms = getCms();
	$: pricing = $cms.pricing;
	$: plans = pricing.plans.map((p, i) => ({ ...p, _i: i })).filter((p) => p.visible !== false);

	function toHumanPrice(price: number, decimals = 0) {
		return Number(price / 100).toFixed(decimals);
	}

	let interval: Interval = 'month';

	function onIntervalToggle() {
		const next: Interval = interval === 'month' ? 'year' : 'month';
		posthog.capture('pricing_billing_period_toggled', { billing_period: next });
		interval = next;
	}

	function onPlanCtaClick(planName: string, planHref: string, planInterval: Interval) {
		posthog.capture('pricing_plan_selected', {
			plan_name: planName,
			plan_href: planHref,
			billing_period: planInterval
		});
	}

	function onSetupCtaClick() {
		posthog.capture('setup_offer_cta_clicked', {
			cta_label: pricing.setup.buttonText,
			cta_href: pricing.setup.buttonHref
		});
	}
</script>

<section id="pricing" class="scroll-mt-28">
	<div class="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 py-14 md:px-8">
		<div class="mx-auto max-w-5xl text-center">
			<h4
				use:editable={{ id: 'pricing.kicker', kind: 'heading', path: 'pricing.kicker', label: 'Sur-titre' }}
				class="text-xl font-bold tracking-tight"
				style="color: var(--bt-text)"
			>
				{pricing.kicker}
			</h4>

			<h2
				use:editable={{ id: 'pricing.title', kind: 'heading', path: 'pricing.title', label: 'Titre tarifs' }}
				class="text-5xl font-bold tracking-tight sm:text-6xl"
				style="color: var(--bt-text)"
			>
				{pricing.title}
			</h2>

			<p
				use:editable={{ id: 'pricing.subtitle', kind: 'text', path: 'pricing.subtitle', label: 'Sous-titre', multiline: true }}
				class="mt-6 text-xl leading-8"
				style="color: var(--bt-muted)"
			>
				{pricing.subtitle}
			</p>
		</div>

		<div class="flex w-full items-center justify-center space-x-2">
			<Switch on:click={onIntervalToggle} id="interval" />
			<span>Annuel</span>
			{#if pricing.intervalNote}
				<span
					class="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-5 tracking-wide text-white"
					style="background: var(--bt-text)"
				>
					{pricing.intervalNote}
				</span>
			{/if}
		</div>

		<div class="mx-auto grid w-full flex-col justify-center gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each plans as price, id (price.id)}
				<div
					class={cn(
						'relative flex max-w-[400px] flex-col gap-8 overflow-hidden border p-4',
						price.isMostPopular ? 'border-2' : ''
					)}
					style="color: var(--bt-text); border-radius: var(--bt-radius); background: var(--bt-card); {price.isMostPopular
						? 'border-color: var(--bt-accent);'
						: ''}"
				>
					<div class="flex items-center">
						<div class="ml-4">
							<h2
								use:editable={{ id: `pricing.plans.${price._i}.name`, kind: 'heading', path: `pricing.plans.${price._i}.name`, label: "Nom de l'offre" }}
								class="text-base font-semibold leading-7"
							>
								{price.name}
							</h2>
							<p
								use:editable={{ id: `pricing.plans.${price._i}.description`, kind: 'text', path: `pricing.plans.${price._i}.description`, label: 'Description' }}
								class="h-12 text-sm leading-5"
								style="color: var(--bt-muted)"
							>
								{price.description}
							</p>
						</div>
					</div>
					{#key interval}
						<div in:fly={{ y: 20, duration: 300, delay: id * 40 }} class="flex flex-row gap-1">
							<span class="text-4xl font-bold" style="color: var(--bt-text)">
								{interval === 'month'
									? toHumanPrice(price.monthlyPrice)
									: toHumanPrice(price.yearlyPrice)}€
								<span class="text-xs">{interval === 'month' ? '/ mois' : '/ an'}</span>
							</span>
						</div>
					{/key}
					<Button
						href={price.buttonHref}
						on:click={() => onPlanCtaClick(price.name, price.buttonHref, interval)}
						class="group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter"
					>
						<span use:editable={{ id: `pricing.plans.${price._i}.button`, kind: 'button', path: `pricing.plans.${price._i}.buttonText`, label: 'Bouton', fields: { href: `pricing.plans.${price._i}.buttonHref` } }}>{price.buttonText}</span>
					</Button>

					<hr class="m-0 h-px w-full border-none bg-gradient-to-r from-neutral-200/0 via-neutral-500/30 to-neutral-200/0" />
					{#if price.features && price.features.length > 0}
						<ul class="flex flex-col gap-2 font-normal">
							{#each price.features as feature, fi}
								<li class="flex items-center gap-3 text-xs font-medium" style="color: var(--bt-text)">
									<CheckIcon class="size-5 shrink-0 rounded-full p-[2px] text-white" style="background: var(--bt-accent)" />
									<span use:editable={{ id: `pricing.plans.${price._i}.features.${fi}`, kind: 'text', path: `pricing.plans.${price._i}.features.${fi}`, label: 'Fonctionnalité' }} class="flex">{feature}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Setup Atelier : offre unique (paiement) sous les abonnements -->
		{#if pricing.setup.visible !== false}
			<div class="mx-auto w-full max-w-[860px]">
				<div
					class="flex flex-col gap-6 overflow-hidden border p-6 sm:flex-row sm:items-center sm:justify-between"
					style="color: var(--bt-text); border-radius: var(--bt-radius); background: var(--bt-card)"
				>
					<div class="flex flex-col gap-3">
						<div>
							<h2 use:editable={{ id: 'pricing.setup.name', kind: 'heading', path: 'pricing.setup.name', label: 'Nom' }} class="text-base font-semibold leading-7">{pricing.setup.name}</h2>
							<p use:editable={{ id: 'pricing.setup.description', kind: 'text', path: 'pricing.setup.description', label: 'Description' }} class="text-sm leading-5" style="color: var(--bt-muted)">{pricing.setup.description}</p>
						</div>
						<ul class="flex flex-wrap gap-x-5 gap-y-2">
							{#each pricing.setup.features as feature, fi}
								<li class="flex items-center gap-2 text-xs font-medium" style="color: var(--bt-text)">
									<CheckIcon class="size-5 shrink-0 rounded-full p-[2px] text-white" style="background: var(--bt-accent)" />
									<span use:editable={{ id: `pricing.setup.features.${fi}`, kind: 'text', path: `pricing.setup.features.${fi}`, label: 'Fonctionnalité' }} class="flex">{feature}</span>
								</li>
							{/each}
						</ul>
					</div>
					<div class="flex shrink-0 flex-col items-start gap-2 sm:items-end">
						<span use:editable={{ id: 'pricing.setup.price', kind: 'heading', path: 'pricing.setup.price', label: 'Prix' }} class="text-4xl font-bold" style="color: var(--bt-text)">{pricing.setup.price}</span>
						<span use:editable={{ id: 'pricing.setup.note', kind: 'text', path: 'pricing.setup.note', label: 'Note' }} class="text-xs" style="color: var(--bt-muted)">{pricing.setup.note}</span>
						<Button
							href={pricing.setup.buttonHref}
							on:click={onSetupCtaClick}
							class="group relative gap-2 overflow-hidden text-lg font-semibold tracking-tighter"
						>
							<span use:editable={{ id: 'pricing.setup.button', kind: 'button', path: 'pricing.setup.buttonText', label: 'Bouton', fields: { href: 'pricing.setup.buttonHref' } }}>{pricing.setup.buttonText}</span>
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>
