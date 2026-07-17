<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Activity,
		CalendarDays,
		ChevronDown,
		Home,
		LayoutDashboard,
		LayoutTemplate,
		LogOut,
		Menu,
		MessageSquareText,
		Search,
		Settings2,
		Store,
		Wrench,
		X
	} from 'lucide-svelte';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import PortalControlCenter from '$lib/components/portal/PortalControlCenter.svelte';
	import { getClerk } from '$lib/auth/clerk';
	import { ensureClientProfile, getCurrentUser, type ClientProfile } from '$lib/auth/supabase';
	import { appBaseUrl, openSaas } from '$lib/auth/post-auth';
	import { loadPortalData, type PortalData } from '$lib/auth/ecosystem';

	type Section = 'home' | 'widget' | 'tracking' | 'configuration';
	const nav: { id: Section; label: string; icon: typeof Home }[] = [
		{ id: 'home', label: 'Accueil', icon: Home },
		{ id: 'widget', label: 'Widget', icon: LayoutTemplate },
		{ id: 'tracking', label: 'Mon suivi', icon: Activity },
		{ id: 'configuration', label: 'Configuration', icon: Settings2 }
	];

	let loading = true;
	let actionLoading = '';
	let errorMessage = '';
	let section: Section = 'home';
	let mobileNav = false;
	let userMenu = false;
	let query = '';
	let statusFilter = 'all';
	let profile: ClientProfile | null = null;
	let portal: PortalData | null = null;

	$: workshopName = String(portal?.workshop?.commercial_name || portal?.workshop?.name || profile?.company_name || 'Mon atelier');
	$: firstName = profile?.first_name || workshopName;
	$: activeRepairs = portal?.repairs.filter((repair) => !['ready', 'delivered', 'cancelled'].includes(repair.status)).length ?? 0;
	$: readyRepairs = portal?.repairs.filter((repair) => repair.status === 'ready').length ?? 0;
	$: waitingRepairs = portal?.repairs.filter((repair) => ['received', 'diagnosis'].includes(repair.status)).length ?? 0;
	$: plan = String(portal?.subscription?.plan || profile?.plan || 'free');
	$: subscriptionStatus = String(portal?.subscription?.status || profile?.subscription_status || 'pending');
	$: licenseStatus = String(portal?.license?.status || 'pending');
	$: smsUsed = Number(portal?.usage?.sms_count ?? profile?.sms_used ?? 0);
	$: emailUsed = Number(portal?.usage?.email_count ?? 0);
	$: smsLimit = Number(profile?.sms_limit ?? 0);
	$: filteredRepairs = portal?.repairs.filter((repair) => {
		const haystack = `${repair.repair_number} ${repair.clients?.full_name || ''} ${repair.clients?.phone || ''} ${repair.device_brand || ''} ${repair.device_model || ''}`.toLowerCase();
		return (!query || haystack.includes(query.toLowerCase())) && (statusFilter === 'all' || repair.status === statusFilter);
	}) ?? [];

	onMount(async () => {
		try {
			const user = await getCurrentUser();
			if (!user) {
				await goto('/connexion');
				return;
			}
			if (!user.email_confirmed_at) {
				await (await getClerk()).signOut();
				await goto(`/connexion?verification=required&email=${encodeURIComponent(user.email || '')}`);
				return;
			}
			profile = await ensureClientProfile(user);
			if (!profile) throw new Error('Profil client introuvable.');
			if (!profile.onboarding_completed) {
				await goto('/onboarding');
				return;
			}
			portal = await loadPortalData(profile);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Impossible de charger votre portail.';
		} finally {
			loading = false;
		}
	});

	async function launch(path: string, id: string) {
		actionLoading = id;
		errorMessage = '';
		try { await openSaas(path); }
		catch (error) { errorMessage = error instanceof Error ? error.message : 'Ouverture impossible.'; actionLoading = ''; }
	}

	async function logout() {
		await (await getClerk()).signOut();
		const base = appBaseUrl();
		if (base) window.location.assign(`${base}/api/auth/logout?returnTo=${encodeURIComponent('/connexion')}`);
		else await goto('/connexion');
	}

	function displayDate(value: unknown) {
		if (!value) return 'Non disponible';
		const date = new Date(String(value));
		return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
	}
</script>

<svelte:head><title>Portail client | Behar Tech Pro</title><meta name="description" content="Accueil et configuration de votre entreprise Behar Tech Pro." /></svelte:head>

{#if loading}
	<main class="flex min-h-screen items-center justify-center bg-white"><div class="h-8 w-8 animate-spin rounded-full border-2 border-[#DDDAD5] border-t-[#2A9D8F]" aria-label="Chargement"></div></main>
{:else if errorMessage && !portal}
	<main class="flex min-h-screen items-center justify-center bg-[#F6F7F9] px-5"><div class="max-w-md rounded-2xl border border-red-200 bg-white p-7 text-center"><h1 class="text-xl font-semibold">Portail indisponible</h1><p class="mt-3 text-sm leading-6 text-red-700">{errorMessage}</p><a class="mt-5 inline-flex rounded-xl bg-[#111] px-5 py-3 text-sm font-semibold text-white" href="/connexion">Se reconnecter</a></div></main>
{:else if portal && profile}
	<div class="min-h-screen bg-white text-[#171715]">
		<aside class="fixed inset-y-0 left-0 z-30 hidden w-[236px] border-r border-[#E8E8E5] bg-white px-3 py-6 md:block">
			<div class="px-1"><BrandLogo compact /></div>
			<nav class="mt-8 space-y-1">{#each nav as item}<button type="button" on:click={() => (section = item.id)} class="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition {section === item.id ? 'bg-[#EAF6F4] text-[#167B70]' : 'text-[#666662] hover:bg-[#F3F3F1]'}"><svelte:component this={item.icon} size={18} />{item.label}</button>{/each}</nav>
		</aside>

		<header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E8E8E5] bg-white/95 px-5 backdrop-blur md:ml-[236px] md:justify-end md:px-8">
			<div class="md:hidden"><BrandLogo compact /></div><button class="grid size-10 place-items-center rounded-xl md:hidden" on:click={() => (mobileNav = true)} aria-label="Menu"><Menu size={21} /></button>
			<div class="relative hidden md:block"><button class="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#F3F3F1]" on:click={() => (userMenu = !userMenu)}><span class="grid size-9 place-items-center rounded-full bg-[#171715] font-semibold text-white">{firstName.charAt(0).toUpperCase()}</span><span class="text-left"><strong class="block max-w-48 truncate text-sm">{firstName}</strong><small class="block max-w-48 truncate text-[#6B6B6B]">{workshopName}</small></span><ChevronDown size={15} /></button>{#if userMenu}<div class="absolute right-0 mt-2 w-52 rounded-xl border border-[#E8E8E5] bg-white p-1.5 shadow-xl"><button class="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50" on:click={logout}><LogOut size={16} />Se déconnecter</button></div>{/if}</div>
		</header>

		{#if mobileNav}<div class="fixed inset-0 z-50 md:hidden"><button class="absolute inset-0 bg-black/30" aria-label="Fermer" on:click={() => (mobileNav = false)}></button><aside class="absolute inset-y-0 left-0 w-[282px] bg-white p-4"><div class="flex items-center justify-between"><BrandLogo compact /><button class="grid size-10 place-items-center" on:click={() => (mobileNav = false)}><X size={20} /></button></div><nav class="mt-7 space-y-1">{#each nav as item}<button class="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left {section === item.id ? 'bg-[#EAF6F4] text-[#167B70]' : ''}" on:click={() => { section = item.id; mobileNav = false; }}><svelte:component this={item.icon} size={19} />{item.label}</button>{/each}</nav><button class="absolute bottom-5 left-4 right-4 flex h-12 items-center gap-3 rounded-xl px-3 text-red-700" on:click={logout}><LogOut size={19} />Se déconnecter</button></aside></div>{/if}

		<main class="px-5 py-8 md:ml-[236px] md:px-8 md:py-10"><div class="mx-auto max-w-[1200px]">
			{#if errorMessage}<div class="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>{/if}

			{#if section === 'home'}
				<div class="flex flex-wrap items-end justify-between gap-4"><div><p class="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#858580]">Espace entreprise</p><h1 class="text-[32px] font-semibold tracking-[-0.04em] sm:text-[40px]">Bonjour {firstName}</h1><p class="mt-2 text-[#6B6B6B]">Que souhaitez-vous gérer aujourd’hui ?</p></div><a href="/billing" class="rounded-full border border-[#2A9D8F] bg-white px-5 py-2.5 text-sm font-semibold text-[#167B70]">Mettre à niveau · {plan}</a></div>
				<div class="mt-7 grid gap-4 md:grid-cols-3">
					<button class="bt-mode" on:click={() => launch('/comptoir', 'counter')} disabled={!!actionLoading}><Store size={24} /><strong>Mode comptoir</strong><span>Prises en charge, devis, ventes et encaissements.</span><small>{actionLoading === 'counter' ? 'Connexion…' : 'Ouvrir le SaaS →'}</small></button>
					<button class="bt-mode" on:click={() => launch('/atelier', 'workshop')} disabled={!!actionLoading}><Wrench size={24} /><strong>Mode atelier</strong><span>Appareils, statuts, pièces et travail en cours.</span><small>{activeRepairs} en cours · {readyRepairs} prêts</small></button>
					<button class="bt-mode" on:click={() => launch('/dashboard', 'dashboard')} disabled={!!actionLoading}><LayoutDashboard size={24} /><strong>Tableau de bord détaillé</strong><span>Activité, marges, dépenses et performances.</span><small>{actionLoading === 'dashboard' ? 'Connexion…' : 'Ouvrir le SaaS →'}</small></button>
				</div>
				<div class="mt-5 grid gap-4 lg:grid-cols-2">
					<section class="bt-card"><div class="flex items-center justify-between"><h2 class="bt-title"><CalendarDays size={18} />Prochains rendez-vous</h2><button class="text-sm font-medium text-[#167B70]" on:click={() => launch('/dashboard/rendez-vous', 'appointments')}>Tout voir</button></div>{#if portal.appointments.length}{#each portal.appointments.slice(0, 5) as appointment}<button class="bt-row w-full text-left" on:click={() => launch('/dashboard/rendez-vous', appointment.id)}><span><strong>{appointment.client_name || 'Client'}</strong><small>{appointment.device_model || 'Appareil non précisé'}</small></span><span class="text-right"><strong>{displayDate(appointment.appointment_date)}</strong><small>{appointment.appointment_time || appointment.status}</small></span></button>{/each}{:else}<p class="bt-empty">Aucun rendez-vous planifié.</p>{/if}</section>
					<section class="bt-card"><h2 class="bt-title"><Activity size={18} />Activité réelle</h2><div class="mt-5 grid grid-cols-3 gap-3"><div class="bt-stat"><strong>{activeRepairs}</strong><span>En cours</span></div><div class="bt-stat"><strong>{readyRepairs}</strong><span>Prêts</span></div><div class="bt-stat"><strong>{waitingRepairs}</strong><span>En attente</span></div></div><div class="mt-5 space-y-3 border-t border-[#F0F0EE] pt-4"><div class="bt-detail"><span>SMS envoyés / restants</span><strong>{smsUsed} / {Math.max(smsLimit - smsUsed, 0)}</strong></div><div class="bt-detail"><span>E-mails envoyés</span><strong>{emailUsed}</strong></div><div class="bt-detail"><span>Plan actif</span><strong class="capitalize">{plan}</strong></div><div class="bt-detail"><span>Licence</span><strong class={licenseStatus === 'active' ? 'text-[#167B70]' : 'text-amber-700'}>{licenseStatus}</strong></div><div class="bt-detail"><span>Prochaine échéance</span><strong>{displayDate(portal.subscription?.current_period_end || profile.renewal_date)}</strong></div></div></section>
				</div>
				<section class="bt-card mt-4"><div class="flex items-center justify-between"><h2 class="bt-title"><MessageSquareText size={18} />Dernières demandes du widget</h2><button class="text-sm font-medium text-[#167B70]" on:click={() => launch('/dashboard/demandes-site', 'leads')}>Gérer</button></div>{#if portal.leads.length}{#each portal.leads.slice(0, 5) as lead}<button class="bt-row w-full text-left" on:click={() => launch('/dashboard/demandes-site', lead.id)}><span><strong>{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Nouveau contact'}</strong><small>{lead.model} · {lead.issue}</small></span><span class="rounded-full border border-[#E8E8E5] px-2 py-1 text-xs">{lead.status}</span></button>{/each}{:else}<p class="bt-empty">Aucune demande reçue depuis le widget.</p>{/if}</section>
			{:else if section === 'widget'}
				<h1 class="text-3xl font-bold">Widget</h1><p class="mt-2 text-[#6B6B6B]">La configuration publiée est celle utilisée immédiatement par votre vrai widget.</p>
				<div class="mt-7"><PortalControlCenter initialTab="widget" /></div>
			{:else if section === 'tracking'}
				<h1 class="text-3xl font-bold">Mon suivi</h1><p class="mt-2 text-[#6B6B6B]">Réparations, rendez-vous et demandes issus des données du SaaS.</p><section class="bt-card mt-7"><div class="grid gap-3 sm:grid-cols-[1fr_220px]"><label class="flex h-11 items-center gap-2 rounded-xl border border-[#E8E8E5] px-3"><Search size={17} class="text-[#8A8A8A]" /><input class="min-w-0 flex-1 outline-none" placeholder="Client, téléphone, référence…" bind:value={query} /></label><select class="h-11 rounded-xl border border-[#E8E8E5] px-3" bind:value={statusFilter}><option value="all">Tous les statuts</option>{#each Array.from(new Set(portal.repairs.map((repair) => repair.status))) as status}<option value={status}>{status}</option>{/each}</select></div><div class="mt-5">{#if filteredRepairs.length}{#each filteredRepairs as repair}<button class="bt-row w-full text-left" on:click={() => launch('/dashboard/reparations', repair.id)}><span><strong>{repair.repair_number} · {repair.clients?.full_name || 'Client'}</strong><small>{[repair.device_brand, repair.device_model].filter(Boolean).join(' ')} · {repair.issue_description}</small></span><span class="rounded-full border border-[#E8E8E5] px-2 py-1 text-xs">{repair.status}</span></button>{/each}{:else}<p class="bt-empty">Aucun dossier ne correspond aux filtres.</p>{/if}</div></section>
			{:else}
				<div class="flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-3xl font-bold">Configuration</h1><p class="mt-2 text-[#6B6B6B]">Modifie ici ton entreprise, tes messages et ton widget. Tout se synchronise automatiquement.</p></div><a class="rounded-xl bg-[#111] px-5 py-3 text-sm font-semibold text-white" href="/billing">Mettre à niveau l’abonnement</a></div>
				<div class="mt-7"><PortalControlCenter initialTab="company" /></div>
			{/if}
		</div></main>
	</div>
{/if}

<style>
	:global(.bt-card){border:1px solid #e5e5e1;background:#fff;border-radius:20px;padding:24px;box-shadow:0 1px 2px rgba(17,17,17,.025)}
	:global(.bt-title){display:flex;align-items:center;gap:9px;font-size:16px;font-weight:650}
	:global(.bt-mode){display:flex;min-height:210px;flex-direction:column;align-items:flex-start;border:1px solid #e5e5e1;background:#fff;border-radius:20px;padding:24px;text-align:left;transition:.2s}
	:global(.bt-mode:hover){border-color:rgba(42,157,143,.6);transform:translateY(-2px);box-shadow:0 14px 32px rgba(17,17,17,.07)}
	:global(.bt-mode svg){color:#2a9d8f}
	:global(.bt-mode strong){margin-top:26px;font-size:18px;letter-spacing:-.02em}.bt-mode span{margin-top:8px;color:#6b6b6b;font-size:13px;line-height:1.65}.bt-mode small{margin-top:auto;padding-top:18px;color:#167b70;font-weight:700}
	:global(.bt-row){display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid #f0f0ee;padding:13px 0}.bt-row:first-child{border-top:0}.bt-row span{min-width:0}.bt-row strong{display:block;font-size:13px}.bt-row small{display:block;margin-top:3px;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6b6b6b;font-size:12px}
	:global(.bt-stat){border:1px solid #e9e9e5;background:#fcfcfb;border-radius:14px;padding:15px;text-align:center}.bt-stat strong{display:block;font-size:22px}.bt-stat span{display:block;margin-top:4px;color:#6b6b6b;font-size:11px}
	:global(.bt-detail){display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13px}.bt-detail span{color:#6b6b6b}.bt-detail strong{text-align:right}
	:global(.bt-empty){margin-top:16px;border-radius:12px;background:#f6f7f9;padding:22px;text-align:center;color:#6b6b6b;font-size:13px}
</style>
