<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Monitor, PanelLeftClose, Search, Smartphone, Tablet } from 'lucide-svelte';

	export let initialTab: 'company' | 'communications' | 'widget' = 'company';
	type Tab = typeof initialTab;
	type Settings = Record<string, any>;
	let tab: Tab = initialTab;
	let loading = true;
	let saving = '';
	let message = '';
	let error = '';
	let data: Settings = {};
	let domainsText = '';
	let company: Settings = {};
	let communications: Settings = {};
	let widget: Settings = {};
	let baseWidgetConfig: Settings = {};
	let previewFrame: HTMLIFrameElement;
	let previewDevice: 'desktop' | 'tablet' | 'phone' = 'desktop';
	let previewView: 'selector' | 'widget' = 'selector';
	let installModal: 'html' | 'wordpress' | 'button' | null = null;
	const previewOrigin = 'https://app.behartechpro.fr';
	const days = [
		{ key: 'Lun', label: 'Lundi' }, { key: 'Mar', label: 'Mardi' }, { key: 'Mer', label: 'Mercredi' },
		{ key: 'Jeu', label: 'Jeudi' }, { key: 'Ven', label: 'Vendredi' }, { key: 'Sam', label: 'Samedi' }, { key: 'Dim', label: 'Dimanche' }
	];
	const timeOptions = Array.from({ length: 29 }, (_, index) => {
		const minutes = 7 * 60 + index * 30;
		return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
	});
	let schedule: Settings[] = days.map((day, index) => ({ ...day, open: index < 6, start: '09:00', end: index === 5 ? '13:00' : '18:00' }));
	const defaultOffers = [
		{ id: 'qualirepar', title: 'Bonus QualiRépar', description: 'Jusqu’à 25 € de remise sur une réparation éligible.', conditionText: 'Éligibilité confirmée en boutique', displayMode: 'icon', behavior: 'selectable', fixedDiscount: 25, isPublished: true, displayOrder: 0 },
		{ id: 'verre-trempe', title: 'Verre trempé premium', description: 'Protection posée en boutique.', conditionText: 'Compatible selon le modèle', displayMode: 'icon', behavior: 'selectable', originalPrice: 20, promotionalPrice: 10, isPublished: true, displayOrder: 1 }
	];

	function parseSchedule(value: string) {
		if (!value) return;
		const normalized = value.replace(/–/g, '-');
		schedule = schedule.map((day) => {
			const match = normalized.match(new RegExp(`${day.key}[^0-9]*(\\d{2}:\\d{2})-(\\d{2}:\\d{2})`, 'i'));
			return match ? { ...day, open: true, start: match[1], end: match[2] } : { ...day, open: false };
		});
	}

	function serializeSchedule() {
		return schedule.filter((day) => day.open).map((day) => `${day.key} ${day.start}-${day.end}`).join(' · ');
	}

	function currentPreviewConfig() {
		return {
			...baseWidgetConfig,
			id: data.widget?.public_widget_id || 'demo', active: widget.active, displayMode: 'modal',
			general: { ...(baseWidgetConfig.general || {}), commercialName: widget.commercialName, phone: widget.phone, address: widget.address, locale: 'fr-FR', currency: company.country === 'CH' ? 'CHF' : 'EUR' },
			visual: { ...(baseWidgetConfig.visual || {}), primaryColor: widget.primaryColor, buttonColor: widget.buttonColor, backgroundColor: widget.backgroundColor, textColor: '#1A1916', logoUrl: widget.logoUrl, backgroundStyle: 'plain', buttonStyle: 'solid' },
			texts: { ...(baseWidgetConfig.texts || {}), title: widget.title, introduction: widget.introduction, deviceTitle: widget.deviceTitle, issueTitle: widget.issueTitle, contactTitle: widget.contactTitle, submitLabel: widget.submitLabel },
			features: { ...(baseWidgetConfig.features || {}), deviceSearch: true, multiIssue: false, ...widget.features },
			offers: { enabled: true, title: 'Offres et avantages', subtitle: 'Ajoutez une option à votre réparation', introduction: 'Sélectionnez uniquement ce qui vous intéresse.', layout: 'grid', columns: 2, offers: widget.offers || defaultOffers },
			shops: baseWidgetConfig.shops || [{ id: 'preview', name: widget.commercialName || 'Mon atelier', address: { address: company.address || '', postalCode: company.postalCode || '', city: company.city || '', country: company.country || 'FR' }, timezone: 'Europe/Paris' }],
			sessionToken: baseWidgetConfig.sessionToken || 'demo-session-token', publishedAt: new Date().toISOString()
		};
	}

	function sendPreview() {
		previewFrame?.contentWindow?.postMessage({ type: 'behar.widget.cms-preview', config: currentPreviewConfig() }, previewOrigin);
	}

	async function setPreviewView(view: 'selector' | 'widget') {
		previewView = view;
		await tick();
		if (view === 'widget') sendPreview();
	}

	function defaults(payload: Settings) {
		const workshop = payload.workshop || {};
		const comm = payload.communication || {};
		const config = payload.widget?.published_config || {};
		baseWidgetConfig = config;
		company = {
			name: workshop.commercial_name || workshop.name || '', email: workshop.email || '', phone: workshop.phone || '',
			address: workshop.address || '', postalCode: workshop.postal_code || '', city: workshop.city || '', website: workshop.website || '',
			country: workshop.country === 'CH' ? 'CH' : 'FR', businessHours: workshop.business_hours || '', legalMentions: workshop.legal_mentions || '', warrantyTerms: workshop.warranty_terms || ''
		};
		communications = {
			senderName: comm.sender_name || company.name, replyTo: comm.reply_to || company.email, emailSignature: comm.email_signature || `L’équipe ${company.name}`,
			brandColor: comm.brand_color || '#2A9D8F', smsTemplates: comm.sms_templates || {}, emailTemplates: comm.email_templates || {}, automations: comm.automations || {}
		};
		widget = {
			active: payload.widget?.active !== false, commercialName: config.general?.commercialName || company.name, phone: config.general?.phone || company.phone,
			address: config.general?.address || [company.address, company.postalCode, company.city].filter(Boolean).join(', '),
			primaryColor: config.visual?.primaryColor || '#2A9D8F', buttonColor: config.visual?.buttonColor || '#2A9D8F', backgroundColor: config.visual?.backgroundColor || '#FFFFFF', logoUrl: config.visual?.logoUrl || '',
			title: config.texts?.title || 'Réparez votre appareil', introduction: config.texts?.introduction || 'Recherchez votre appareil puis complétez votre demande.', deviceTitle: config.texts?.deviceTitle || 'Quel appareil souhaitez-vous réparer ?',
			issueTitle: config.texts?.issueTitle || 'Quel problème rencontrez-vous ?', contactTitle: config.texts?.contactTitle || 'Finalisez votre demande', submitLabel: config.texts?.submitLabel || 'Envoyer ma demande',
			features: { priceEstimate: config.features?.priceEstimate !== false, stockAvailability: Boolean(config.features?.stockAvailability), booking: config.features?.booking !== false, photos: config.features?.photos !== false, callbackRequest: config.features?.callbackRequest !== false, summarySidebar: config.features?.summarySidebar !== false },
			offers: config.offers?.offers?.length ? config.offers.offers : defaultOffers
		};
		parseSchedule(company.businessHours);
		domainsText = (payload.widget?.allowed_domains || []).join('\n');
	}

	async function load() {
		loading = true; error = '';
		try {
			const response = await fetch('/api/portal/settings');
			data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Chargement impossible.');
			defaults(data);
		} catch (reason) { error = reason instanceof Error ? reason.message : 'Chargement impossible.'; }
		finally { loading = false; }
	}

	async function save(operation: Tab) {
		saving = operation; message = ''; error = '';
		if (operation === 'company') company.businessHours = serializeSchedule();
		let body: Settings = operation === 'company' ? { operation, ...company } : operation === 'communications' ? { operation, ...communications } : { operation, ...widget, allowedDomains: domainsText.split(/[,\n]/).map((value) => value.trim()).filter(Boolean) };
		try {
			const response = await fetch('/api/portal/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || 'Enregistrement impossible.');
			message = operation === 'widget' ? 'Widget publié : le code reste identique.' : 'Modifications synchronisées avec le SaaS.';
			await load();
			tab = operation;
		} catch (reason) { error = reason instanceof Error ? reason.message : 'Enregistrement impossible.'; }
		finally { saving = ''; }
	}

	function setSms(key: string, value: string) { communications = { ...communications, smsTemplates: { ...communications.smsTemplates, [key]: value } }; }
	function setEmail(key: string, value: string) { communications = { ...communications, emailTemplates: { ...communications.emailTemplates, [key]: value } }; }
	function toggleFeature(key: string) { widget = { ...widget, features: { ...widget.features, [key]: !widget.features[key] } }; }
	function updateOffer(index: number, key: string, value: string | number | boolean) {
		widget = { ...widget, offers: widget.offers.map((offer: Settings, offerIndex: number) => offerIndex === index ? { ...offer, [key]: value } : offer) };
	}
	function addOffer() {
		widget = { ...widget, offers: [...widget.offers, { id: `offre-${Date.now()}`, title: 'Nouvelle offre', description: 'Décris clairement l’avantage proposé.', conditionText: '', displayMode: 'text', behavior: 'selectable', promotionalPrice: 0, isPublished: true, displayOrder: widget.offers.length }] };
	}
	function removeOffer(index: number) {
		widget = { ...widget, offers: widget.offers.filter((_: Settings, offerIndex: number) => offerIndex !== index).map((offer: Settings, displayOrder: number) => ({ ...offer, displayOrder })) };
	}
	function integrationSnippet(kind = 'html') {
		if (!data.widget?.public_widget_id) return '';
		const id = data.widget.public_widget_id;
		const snippets: Settings = {
			html: `<div data-behar-widget-search></div>\n<script src="https://app.behartechpro.fr/widget.js" data-widget-id="${id}" async><\/script>`,
			wordpress: `<!-- Bloc HTML personnalisé WordPress -->\n<div data-behar-widget-search></div>\n<script src="https://app.behartechpro.fr/widget.js" data-widget-id="${id}" async><\/script>`,
			button: `<button type="button" data-behar-widget-open>Prendre rendez-vous</button>\n<script src="https://app.behartechpro.fr/widget.js" data-widget-id="${id}" async><\/script>`
		};
		return snippets[kind] || snippets.html;
	}
	async function copyCode(kind = 'html') {
		await navigator.clipboard.writeText(integrationSnippet(kind));
		message = kind === 'wordpress' ? 'Code WordPress copié.' : kind === 'button' ? 'Code du bouton copié.' : 'Code HTML copié.';
	}
	async function copyLicense() {
		if (!data.license?.activationKey) return;
		await navigator.clipboard.writeText(data.license.activationKey);
		message = 'Clé de licence copiée.';
	}
	onMount(() => {
		const receive = (event: MessageEvent) => { if (event.origin === previewOrigin && event.data?.type === 'behar.widget.cms-preview-ready') sendPreview(); };
		window.addEventListener('message', receive);
		load().then(async () => { await tick(); sendPreview(); });
		return () => window.removeEventListener('message', receive);
	});
	$: if (tab === 'widget' && widget?.title) { JSON.stringify(widget); queueMicrotask(sendPreview); }
</script>

{#if loading}<div class="bt-control-card text-center text-sm text-[#6B6B6B]">Chargement des réglages partagés…</div>
{:else}
	<div class="space-y-5">
		<div class="flex flex-wrap gap-2 rounded-2xl border border-[#E8E8E5] bg-white p-2">
			<button class:active={tab === 'company'} on:click={() => (tab = 'company')}>Entreprise</button>
			<button class:active={tab === 'communications'} on:click={() => (tab = 'communications')}>SMS & e-mails</button>
			<button class:active={tab === 'widget'} on:click={() => (tab = 'widget')}>Widget & visuel CMS</button>
		</div>
		{#if error}<p class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>{/if}
		{#if message}<p class="rounded-xl border border-[#2A9D8F]/25 bg-[#EAF6F4] p-3 text-sm text-[#126B61]">{message}</p>{/if}
		<section class="grid gap-3 rounded-2xl border border-[#E8E8E5] bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><small class="text-[#6B6B6B]">Clé de licence automatique</small><code class="mt-1 block break-all text-sm font-semibold">{data.license?.activationKey || 'Provisionnement en cours'}</code></div><div class="rounded-xl bg-[#F6F7F9] px-4 py-2 text-sm"><span class="capitalize">{data.subscription?.plan || 'free'}</span> · {data.license?.status || 'pending'}</div><div class="flex gap-2"><button class="rounded-xl border border-[#E8E8E5] px-3 py-2 text-sm font-semibold" on:click={copyLicense}>Copier</button><a class="rounded-xl bg-[#111] px-3 py-2 text-sm font-semibold text-white" href="/billing">Upgrade</a></div></section>

		{#if tab === 'company'}
			<section class="bt-control-card"><div class="bt-heading"><div><h2>Mon entreprise</h2><p>Une seule fiche utilisée partout : portail, widget, documents et SaaS.</p></div></div>
				<div class="grid gap-4 md:grid-cols-2"><label>Nom commercial<input bind:value={company.name} /></label><label>E-mail<input type="email" bind:value={company.email} /></label><label>Téléphone<input bind:value={company.phone} /></label><label>Site web<input bind:value={company.website} /></label><label>Adresse<input bind:value={company.address} /></label><div class="grid grid-cols-2 gap-3"><label>Code postal<input bind:value={company.postalCode} /></label><label>Ville<input bind:value={company.city} /></label></div><label>Pays<select bind:value={company.country}><option value="FR">France</option><option value="CH">Suisse</option></select></label></div>
				<div class="mt-6"><h3 class="font-semibold">Horaires d’ouverture</h3><p class="mt-1 text-xs text-[#777]">Active les jours puis choisis simplement l’heure d’ouverture et de fermeture.</p><div class="schedule-grid mt-3">{#each schedule as day, index}<div class="schedule-row"><label class="day-toggle"><input type="checkbox" bind:checked={schedule[index].open} /><span>{day.label}</span></label>{#if day.open}<select aria-label={`Ouverture ${day.label}`} bind:value={schedule[index].start}>{#each timeOptions as time}<option value={time}>{time}</option>{/each}</select><span>à</span><select aria-label={`Fermeture ${day.label}`} bind:value={schedule[index].end}>{#each timeOptions as time}<option value={time}>{time}</option>{/each}</select>{:else}<span class="closed">Fermé</span>{/if}</div>{/each}</div></div>
				<label class="mt-4">Mentions légales<textarea bind:value={company.legalMentions}></textarea></label><label class="mt-4">Conditions de garantie<textarea bind:value={company.warrantyTerms}></textarea></label>
				<button class="bt-save" disabled={!!saving} on:click={() => save('company')}>{saving === 'company' ? 'Synchronisation…' : 'Enregistrer partout'}</button>
			</section>
		{:else if tab === 'communications'}
			<section class="bt-control-card"><div class="bt-heading"><div><h2>SMS et e-mails automatiques</h2><p>Personnalise les textes par défaut. Les variables comme {'{{client}}'} seront remplacées automatiquement.</p></div></div>
				<div class="grid gap-4 md:grid-cols-2"><label>Nom de l’expéditeur<input bind:value={communications.senderName} /></label><label>Adresse de réponse<input type="email" bind:value={communications.replyTo} /></label><label>Couleur de marque<input type="color" class="h-12" bind:value={communications.brandColor} /></label><label>Signature e-mail<input bind:value={communications.emailSignature} /></label></div>
				<h3 class="mt-7 font-semibold">Modèles SMS</h3><div class="mt-3 grid gap-4"><label>Appareil pris en charge<textarea value={communications.smsTemplates.repair_received || ''} on:input={(event) => setSms('repair_received', event.currentTarget.value)}></textarea></label><label>Appareil prêt<textarea value={communications.smsTemplates.repair_ready || ''} on:input={(event) => setSms('repair_ready', event.currentTarget.value)}></textarea></label><label>Demande d’avis 5 étoiles<textarea value={communications.smsTemplates.review_request || ''} on:input={(event) => setSms('review_request', event.currentTarget.value)}></textarea></label></div>
				<h3 class="mt-7 font-semibold">Modèles e-mail</h3><div class="mt-3 grid gap-4"><label>Prise en charge<textarea value={communications.emailTemplates.repair_received_body || ''} on:input={(event) => setEmail('repair_received_body', event.currentTarget.value)}></textarea></label><label>Appareil prêt<textarea value={communications.emailTemplates.repair_ready_body || ''} on:input={(event) => setEmail('repair_ready_body', event.currentTarget.value)}></textarea></label><label>Demande d’avis<textarea value={communications.emailTemplates.review_body || ''} on:input={(event) => setEmail('review_body', event.currentTarget.value)}></textarea></label></div>
				<button class="bt-save" disabled={!!saving} on:click={() => save('communications')}>{saving === 'communications' ? 'Synchronisation…' : 'Enregistrer les modèles'}</button>
			</section>
		{:else}
			<div class="grid gap-5"><section class="bt-control-card"><div class="bt-heading"><div><h2>Widget client</h2><p>Le code est créé automatiquement avec la licence. Chaque publication est immédiate.</p></div><label class="bt-switch"><input type="checkbox" bind:checked={widget.active} /> Actif</label></div>
				<div class="install-box"><div><p class="text-xs text-[#777]">Identifiant public</p><code class="mt-1 block break-all text-xs">{data.widget?.public_widget_id}</code></div><h3>Installer sur votre site</h3><p>Choisis ton site : une fenêtre te donne le code exact et les instructions.</p><div class="install-actions"><button on:click={() => (installModal = 'html')}>HTML / Shopify / Wix</button><button on:click={() => (installModal = 'wordpress')}>WordPress</button><button on:click={() => (installModal = 'button')}>Bouton seulement</button></div></div>
				<div class="mt-5 grid gap-4 md:grid-cols-2"><label>Nom affiché<input bind:value={widget.commercialName} /></label><label>Téléphone<input bind:value={widget.phone} /></label><label class="md:col-span-2">Adresse<input bind:value={widget.address} /></label><label>Couleur principale<input type="color" class="h-12" bind:value={widget.primaryColor} /></label><label>Couleur bouton<input type="color" class="h-12" bind:value={widget.buttonColor} /></label><label>Couleur de fond<input type="color" class="h-12" bind:value={widget.backgroundColor} /></label><label>Logo (URL)<input bind:value={widget.logoUrl} /></label></div>
				<h3 class="mt-7 font-semibold">Textes du parcours</h3><div class="mt-3 grid gap-4"><label>Titre<input bind:value={widget.title} /></label><label>Introduction<textarea bind:value={widget.introduction}></textarea></label><label>Étape 1 — appareil<input bind:value={widget.deviceTitle} /></label><label>Étape 1 — panne<input bind:value={widget.issueTitle} /></label><label>Étape 2 — coordonnées<input bind:value={widget.contactTitle} /></label><label>Bouton final<input bind:value={widget.submitLabel} /></label></div>
				<h3 class="mt-7 font-semibold">Fonctions visibles</h3><div class="mt-3 grid gap-2 sm:grid-cols-2">{#each [['priceEstimate','Estimation de prix'],['stockAvailability','Disponibilité'],['booking','Rendez-vous'],['photos','Photos'],['callbackRequest','Être rappelé']] as feature}<button class:chosen={widget.features[feature[0]]} class="bt-option" on:click={() => toggleFeature(feature[0])}>{feature[1]}</button>{/each}<button class:chosen={widget.features.summarySidebar} class="bt-option sidebar-option" on:click={() => toggleFeature('summarySidebar')}><PanelLeftClose size={17} />Colonne récapitulative</button></div>
				<div class="mt-7 flex items-center justify-between gap-3"><div><h3 class="font-semibold">Offres proposées</h3><p class="mt-1 text-xs text-[#777]">Les exemples peuvent être modifiés ou supprimés. Tu peux créer autant d’offres que nécessaire.</p></div><button class="add-offer" on:click={addOffer}>+ Ajouter</button></div>
				<div class="mt-3 grid gap-3">{#each widget.offers as offer, index (offer.id)}<article class="offer-editor"><div class="offer-top"><label class="offer-enabled"><input type="checkbox" checked={offer.isPublished} on:change={(event) => updateOffer(index, 'isPublished', event.currentTarget.checked)} /> Visible</label><button class="remove-offer" on:click={() => removeOffer(index)}>Supprimer</button></div><div class="grid gap-3 md:grid-cols-2"><label>Nom de l’offre<input value={offer.title} on:input={(event) => updateOffer(index, 'title', event.currentTarget.value)} /></label><label>Prix promotionnel (€)<input type="number" min="0" step="1" value={offer.promotionalPrice ?? ''} on:input={(event) => updateOffer(index, 'promotionalPrice', Number(event.currentTarget.value || 0))} /></label><label class="md:col-span-2">Description<input value={offer.description || ''} on:input={(event) => updateOffer(index, 'description', event.currentTarget.value)} /></label><label class="md:col-span-2">Condition affichée<input value={offer.conditionText || ''} on:input={(event) => updateOffer(index, 'conditionText', event.currentTarget.value)} /></label></div></article>{/each}{#if !widget.offers.length}<div class="empty-offers">Aucune offre. Le widget fonctionne normalement sans promotion.</div>{/if}</div>
				<label class="mt-5">Domaines autorisés, un par ligne<textarea bind:value={domainsText} placeholder="monatelier.fr"></textarea></label><button class="bt-save" disabled={!!saving} on:click={() => save('widget')}>{saving === 'widget' ? 'Publication…' : 'Publier le widget'}</button>
			</section>
			<section class="preview-panel">
				<div class="preview-title"><div><small>APERÇU CMS RÉEL</small><h3>{previewView === 'selector' ? 'Sélecteur du site' : 'Widget complet'}</h3></div><span>Synchronisé en direct</span></div>
				<div class="preview-toolbar"><div class="preview-switch"><button class:active={previewView === 'selector'} on:click={() => setPreviewView('selector')}><Search size={15} />Sélecteur</button><button class:active={previewView === 'widget'} on:click={() => setPreviewView('widget')}><PanelLeftClose size={15} />Widget complet</button></div><div class="device-switch"><button title="Ordinateur" aria-label="Aperçu ordinateur" class:active={previewDevice === 'desktop'} on:click={() => (previewDevice = 'desktop')}><Monitor size={17} /></button><button title="Tablette" aria-label="Aperçu tablette" class:active={previewDevice === 'tablet'} on:click={() => (previewDevice = 'tablet')}><Tablet size={17} /></button><button title="Téléphone" aria-label="Aperçu téléphone" class:active={previewDevice === 'phone'} on:click={() => (previewDevice = 'phone')}><Smartphone size={17} /></button></div></div>
				<div class="preview-canvas"><div class="preview-device {previewDevice} {previewView}">{#if previewView === 'selector'}<iframe src={`https://app.behartechpro.fr/widget-selector-preview?id=${encodeURIComponent(data.widget?.public_widget_id || '')}`} title={`Sélecteur — aperçu ${previewDevice}`} />{:else}<iframe bind:this={previewFrame} on:load={sendPreview} src="https://app.behartechpro.fr/widget-preview" title={`Widget — aperçu ${previewDevice}`} />{/if}</div></div>
			</section></div>
		{/if}
		{#if installModal}<div class="install-modal" role="presentation"><button class="install-backdrop" aria-label="Fermer la fenêtre" on:click={() => (installModal = null)}></button><section class="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title"><div class="install-dialog-head"><div><small>INSTALLATION DU WIDGET</small><h2 id="install-title">{installModal === 'wordpress' ? 'WordPress' : installModal === 'button' ? 'Bouton d’ouverture' : 'HTML / Shopify / Wix'}</h2></div><button aria-label="Fermer" on:click={() => (installModal = null)}>×</button></div><p>{installModal === 'wordpress' ? 'Ajoute un bloc « HTML personnalisé » dans WordPress puis colle ce code.' : installModal === 'button' ? 'Colle ce bouton à l’endroit souhaité. Le widget s’ouvrira dans une fenêtre animée.' : 'Colle ce code dans la page, juste avant la fermeture de la balise body.'}</p><pre><code>{integrationSnippet(installModal)}</code></pre><div class="install-dialog-actions"><button class="secondary" on:click={() => (installModal = null)}>Fermer</button><button class="primary" on:click={() => copyCode(installModal || 'html')}>Copier le code</button></div></section></div>{/if}
	</div>
{/if}

<style>
	.bt-control-card{border:1px solid #e8e8e5;background:#fff;border-radius:20px;padding:24px;box-shadow:0 1px 2px rgba(17,17,17,.025)}.bt-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}.bt-heading h2{font-size:20px;font-weight:720;letter-spacing:-.02em}.bt-heading p{margin-top:5px;color:#6b6b6b;font-size:13px;line-height:1.6}label{display:block;color:#52524f;font-size:12px;font-weight:650}input,select,textarea{margin-top:6px;width:100%;border:1px solid #dededb;border-radius:12px;background:#fff;padding:11px 12px;color:#1a1916;font-size:14px;outline:none}textarea{min-height:88px;resize:vertical}input:focus,select:focus,textarea:focus{border-color:#2a9d8f;box-shadow:0 0 0 3px rgba(42,157,143,.11)}.flex button{border-radius:10px;padding:10px 14px;color:#62625f;font-size:13px;font-weight:650}.flex button.active{background:#eaf6f4;color:#167b70}.bt-save{margin-top:22px;min-height:46px;border-radius:12px;background:#2a9d8f;padding:0 20px;color:#fff;font-size:14px;font-weight:700}.bt-save:disabled{opacity:.6}.bt-switch{display:flex;align-items:center;gap:7px;white-space:nowrap}.bt-switch input{margin:0;width:18px;accent-color:#2a9d8f}.bt-option{border:1px solid #dededb;border-radius:12px;background:#fff;padding:11px;text-align:left;font-size:13px}.bt-option.chosen{border-color:#2a9d8f;background:#fff;color:#167b70;box-shadow:0 3px 12px rgba(42,157,143,.09)}
	.install-box{display:grid;gap:10px;border:1px solid #e5e5e2;border-radius:16px;background:#fafaf8;padding:17px}.install-box h3{margin-top:6px;font-size:15px;font-weight:700}.install-box>p{color:#6b6b6b;font-size:12px;line-height:1.6}.install-actions{display:flex;flex-wrap:wrap;gap:8px}.install-actions button{border:1px solid #d9d9d5;border-radius:10px;background:#fff;padding:9px 12px;color:#111;font-size:12px;font-weight:700}.install-actions button:hover{border-color:#111}
	.install-modal{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:18px}.install-backdrop{position:absolute;inset:0;background:rgba(17,17,17,.28);backdrop-filter:blur(10px);animation:fade-in .18s ease}.install-dialog{position:relative;width:min(680px,100%);border:1px solid #e0e0dc;border-radius:22px;background:#fff;padding:22px;box-shadow:0 28px 90px rgba(17,17,17,.2);animation:dialog-in .22s cubic-bezier(.2,.8,.2,1)}.install-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.install-dialog-head small{color:#2a9d8f;font-size:10px;font-weight:800;letter-spacing:.14em}.install-dialog-head h2{margin-top:4px;font-size:22px;font-weight:750;letter-spacing:-.03em}.install-dialog-head>button{display:grid;size:36px;place-items:center;border:1px solid #e5e5e1;border-radius:50%;background:#fff;color:#555;font-size:22px}.install-dialog>p{margin-top:14px;color:#666;font-size:13px;line-height:1.65}.install-dialog pre{margin-top:16px;max-height:260px;overflow:auto;border:1px solid #e5e5e1;border-radius:14px;background:#f7f7f5;padding:15px;color:#20201e;font-size:12px;line-height:1.65;white-space:pre-wrap;word-break:break-all}.install-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.install-dialog-actions button{border-radius:11px;padding:11px 15px;font-size:13px;font-weight:750}.install-dialog-actions .secondary{border:1px solid #dededb;background:#fff;color:#333}.install-dialog-actions .primary{border:1px solid #2a9d8f;background:#2a9d8f;color:#fff}@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes dialog-in{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
	.add-offer{flex:none;border:1px solid #111;border-radius:10px;background:#111;padding:9px 12px;color:#fff;font-size:12px;font-weight:700}.offer-editor{border:1px solid #e4e4e0;border-radius:15px;background:#fcfcfb;padding:15px}.offer-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.offer-enabled{display:flex;align-items:center;gap:7px;color:#111}.offer-enabled input{margin:0;width:17px;accent-color:#111}.remove-offer{border:0;background:transparent;color:#a33;font-size:12px;font-weight:700}.empty-offers{border:1px dashed #d5d5d0;border-radius:14px;padding:22px;text-align:center;color:#777;font-size:12px}
	.schedule-grid{display:grid;gap:8px}.schedule-row{display:grid;grid-template-columns:minmax(130px,1fr) 110px auto 110px;align-items:center;gap:9px;border:1px solid #e8e8e5;border-radius:13px;background:#fcfcfb;padding:9px 11px}.schedule-row select{margin:0;padding:8px}.day-toggle{display:flex;align-items:center;gap:9px;color:#111}.day-toggle input{margin:0;width:17px;accent-color:#111}.closed{grid-column:2/5;color:#999;font-size:12px}
	.sidebar-option{display:flex;align-items:center;gap:8px}.preview-panel{overflow:hidden;border:1px solid #dcdcd8;border-radius:22px;background:#fff;box-shadow:0 18px 50px rgba(17,17,17,.08)}.preview-title{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8e8e5;padding:16px 18px}.preview-title small{color:#777;font-size:10px;font-weight:800;letter-spacing:.12em}.preview-title h3{margin-top:3px;font-size:17px;font-weight:720}.preview-title>span{border:1px solid #dededb;border-radius:999px;padding:6px 9px;color:#555;font-size:10px}.preview-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #e8e8e5;background:#fcfcfb;padding:10px 14px}.preview-switch,.device-switch{display:flex;gap:5px}.preview-switch button,.device-switch button{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid transparent;border-radius:9px;padding:8px 10px;color:#666;font-size:12px;font-weight:700}.preview-switch button.active,.device-switch button.active{border-color:#111;background:#111;color:#fff}.preview-canvas{overflow-x:auto;background:#efefec;padding:22px}.preview-device{margin:0 auto;overflow:hidden;border:1px solid #d7d7d2;border-radius:18px;background:#fff;box-shadow:0 15px 40px rgba(17,17,17,.1);transition:width .25s ease}.preview-device.desktop{width:100%;max-width:1380px}.preview-device.tablet{width:820px}.preview-device.phone{width:390px}.preview-device iframe{display:block;width:100%;border:0;background:#f7f7f5}.preview-device.widget.desktop iframe{height:720px}.preview-device.widget.tablet iframe{height:760px}.preview-device.widget.phone iframe{height:780px}.preview-device.selector.desktop iframe{height:250px}.preview-device.selector.tablet iframe{height:390px}.preview-device.selector.phone iframe{height:600px}
	@media(max-width:640px){.schedule-row{grid-template-columns:1fr 1fr auto 1fr}.day-toggle{grid-column:1/-1}.preview-canvas{padding:12px}.preview-device.tablet{width:760px}.preview-title>span{display:none}}
	.add-offer{border-color:#2a9d8f;background:#2a9d8f}.offer-editor{background:#fff}.preview-title small{color:#2a9d8f}.preview-title>span{border-color:#d5ebe7;color:#167b70}.preview-toolbar,.preview-canvas{background:#fff}.preview-switch button.active,.device-switch button.active{border-color:#2a9d8f;background:#eaf6f4;color:#167b70}
</style>
