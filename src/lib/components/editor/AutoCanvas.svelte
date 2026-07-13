<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		breakpoint,
		editMode,
		getCmsStore,
		registerNode,
		revision,
		select,
		setOverrideText,
		unregisterNode
	} from '$lib/editor/store';
	import { layoutDeclarations, resolveLayout, styleDeclarations } from '$lib/editor/elements';

	type InlineValue = { value: string; priority: string };
	type AutoEntry = {
		id: string;
		node: HTMLElement;
		originalText: string | null;
		baseline: Map<string, InlineValue>;
		forced: Set<string>;
	};

	const entries = new Map<string, AutoEntry>();
	let observer: MutationObserver | null = null;
	let scanFrame = 0;
	let root: HTMLElement | null = null;
	let editing: AutoEntry | null = null;

	const ignoredTags = new Set([
		'HTML', 'BODY', 'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE',
		'SVG', 'PATH', 'DEFS', 'CLIPPATH', 'G', 'USE', 'BR', 'SOURCE'
	]);
	const textTags = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'LABEL', 'SMALL', 'STRONG', 'EM', 'B', 'I']);
	const buttonTags = new Set(['A', 'BUTTON']);
	const imageTags = new Set(['IMG', 'VIDEO', 'PICTURE', 'CANVAS']);
	const containerTags = new Set(['MAIN', 'HEADER', 'FOOTER', 'NAV', 'SECTION', 'ARTICLE', 'ASIDE', 'FORM', 'FIELDSET', 'DIV', 'UL', 'OL', 'LI']);

	function isVisible(node: HTMLElement) {
		const rect = node.getBoundingClientRect();
		const style = getComputedStyle(node);
		return rect.width >= 8 && rect.height >= 8 && style.display !== 'none' && style.visibility !== 'hidden';
	}

	function isCandidate(node: HTMLElement) {
		if (ignoredTags.has(node.tagName)) return false;
		if (node.closest('[data-cms-chrome], [data-cms-ignore]')) return false;
		if (node.hasAttribute('data-el')) return false;
		if (!isVisible(node)) return false;
		if (textTags.has(node.tagName) || buttonTags.has(node.tagName) || imageTags.has(node.tagName)) return true;
		if (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) return true;
		if (!containerTags.has(node.tagName)) return false;
		// Évite d'instrumenter les wrappers techniques vides, tout en gardant les cartes,
		// formulaires, listes et grandes zones de mise en page.
		return node.children.length > 0 || (node.textContent?.trim().length ?? 0) > 0;
	}

	function nodeSegment(node: HTMLElement) {
		const parent = node.parentElement;
		if (!parent) return node.tagName.toLowerCase();
		const sameTag = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
		return `${node.tagName.toLowerCase()}:${sameTag.indexOf(node) + 1}`;
	}

	function stableId(node: HTMLElement) {
		const parts: string[] = [];
		let current: HTMLElement | null = node;
		while (current && current !== root) {
			parts.unshift(nodeSegment(current));
			current = current.parentElement;
		}
		return `auto:${window.location.pathname}:${parts.join('/')}`;
	}

	function kindFor(node: HTMLElement): 'text' | 'heading' | 'button' | 'image' | 'container' {
		if (/^H[1-6]$/.test(node.tagName)) return 'heading';
		if (buttonTags.has(node.tagName)) return 'button';
		if (imageTags.has(node.tagName)) return 'image';
		if (textTags.has(node.tagName)) return 'text';
		return 'container';
	}

	function labelFor(node: HTMLElement) {
		const explicit = node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('placeholder');
		if (explicit) return explicit.slice(0, 60);
		const text = node.textContent?.replace(/\s+/g, ' ').trim();
		if (text && text.length <= 60) return text;
		const labels: Record<string, string> = {
			FORM: 'Formulaire', SECTION: 'Section', HEADER: 'En-tête', FOOTER: 'Pied de page',
			NAV: 'Navigation', IMG: 'Image', INPUT: 'Champ', DIV: 'Bloc', LI: 'Élément de liste'
		};
		return labels[node.tagName] || 'Élément';
	}

	function restoreInline(entry: AutoEntry) {
		for (const prop of entry.forced) {
			const before = entry.baseline.get(prop);
			if (before?.value) entry.node.style.setProperty(prop, before.value, before.priority);
			else entry.node.style.removeProperty(prop);
		}
		entry.forced.clear();
	}

	function applyEntry(entry: AutoEntry) {
		restoreInline(entry);
		const store = getCmsStore();
		if (!store || !entry.node.isConnected) return;
		const override = get(store).editorOverrides?.[entry.id];
		if (entry.originalText !== null && editing !== entry) {
			const text = override?.content?.text ?? entry.originalText;
			if (entry.node.textContent !== text) entry.node.textContent = text;
		}
		if (!override) return;
		const declarations = {
			...styleDeclarations(override.style),
			...layoutDeclarations(resolveLayout(override, get(breakpoint)))
		};
		for (const [prop, value] of Object.entries(declarations)) {
			if (!entry.baseline.has(prop)) {
				entry.baseline.set(prop, {
					value: entry.node.style.getPropertyValue(prop),
					priority: entry.node.style.getPropertyPriority(prop)
				});
			}
			entry.node.style.setProperty(prop, value, 'important');
			entry.forced.add(prop);
		}
	}

	function register(node: HTMLElement) {
		const id = stableId(node);
		if (entries.has(id)) return;
		node.dataset.el = id;
		node.dataset.cmsAuto = 'true';
		node.classList.toggle('cms-editable', get(editMode));
		const entry: AutoEntry = {
			id,
			node,
			originalText: node.children.length === 0 && !['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
				? node.textContent ?? ''
				: null,
			baseline: new Map(),
			forced: new Set()
		};
		entries.set(id, entry);
		registerNode({ id, node, kind: kindFor(node), label: labelFor(node) });
		applyEntry(entry);
	}

	function scan() {
		scanFrame = 0;
		root = document.querySelector<HTMLElement>('.cms-stage');
		if (!root) return;
		for (const [id, entry] of entries) {
			if (!entry.node.isConnected || !root.contains(entry.node)) {
				unregisterNode(id);
				entries.delete(id);
			}
		}
		for (const node of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
			if (isCandidate(node)) register(node);
		}
	}

	function scheduleScan() {
		if (!scanFrame) scanFrame = requestAnimationFrame(scan);
	}

	function autoEntryFromEvent(event: Event) {
		const target = event.target as HTMLElement | null;
		// Un élément explicitement instrumenté garde toujours la priorité sur son
		// conteneur auto-détecté.
		const closestEditable = target?.closest<HTMLElement>('[data-el]');
		const node = closestEditable?.dataset.cmsAuto === 'true' ? closestEditable : null;
		return node ? entries.get(node.dataset.el || '') ?? null : null;
	}

	function onClick(event: MouseEvent) {
		if (!get(editMode)) return;
		const entry = autoEntryFromEvent(event);
		if (!entry || editing === entry) return;
		event.preventDefault();
		event.stopPropagation();
		select(entry.id);
	}

	function onDoubleClick(event: MouseEvent) {
		if (!get(editMode)) return;
		const entry = autoEntryFromEvent(event);
		if (!entry || entry.originalText === null || kindFor(entry.node) === 'image') return;
		event.preventDefault();
		event.stopPropagation();
		editing = entry;
		entry.node.setAttribute('contenteditable', 'plaintext-only');
		entry.node.dataset.editing = 'true';
		entry.node.focus();
		const range = document.createRange();
		range.selectNodeContents(entry.node);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		entry.node.addEventListener('blur', finishTextEdit, { once: true });
		entry.node.addEventListener('keydown', onTextKeydown);
	}

	function onTextKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			(editing?.node as HTMLElement | undefined)?.blur();
		}
		if (event.key === 'Escape' && editing) {
			event.preventDefault();
			const store = getCmsStore();
			editing.node.textContent = store
				? get(store).editorOverrides?.[editing.id]?.content?.text ?? editing.originalText ?? ''
				: editing.originalText ?? '';
			editing.node.dataset.cmsCancelEdit = 'true';
			editing.node.blur();
		}
	}

	function finishTextEdit() {
		if (!editing) return;
		const entry = editing;
		entry.node.removeEventListener('keydown', onTextKeydown);
		entry.node.removeAttribute('contenteditable');
		delete entry.node.dataset.editing;
		const cancelled = entry.node.dataset.cmsCancelEdit === 'true';
		delete entry.node.dataset.cmsCancelEdit;
		editing = null;
		if (!cancelled) {
			const next = entry.node.textContent ?? '';
			const store = getCmsStore();
			const current = store ? get(store).editorOverrides?.[entry.id]?.content?.text ?? entry.originalText : entry.originalText;
			if (next !== current) setOverrideText(entry.id, next);
		}
	}

	const unsubscribers = [
		revision.subscribe(() => entries.forEach(applyEntry)),
		breakpoint.subscribe(() => entries.forEach(applyEntry)),
		editMode.subscribe((on) => {
			entries.forEach((entry) => entry.node.classList.toggle('cms-editable', on));
			if (!on && editing) editing.node.blur();
		})
	];

	onMount(() => {
		scan();
		root?.addEventListener('click', onClick, true);
		root?.addEventListener('dblclick', onDoubleClick, true);
		observer = new MutationObserver(scheduleScan);
		if (root) observer.observe(root, { childList: true, subtree: true });
	});

	onDestroy(() => {
		observer?.disconnect();
		if (scanFrame) cancelAnimationFrame(scanFrame);
		root?.removeEventListener('click', onClick, true);
		root?.removeEventListener('dblclick', onDoubleClick, true);
		unsubscribers.forEach((unsubscribe) => unsubscribe());
		for (const [id, entry] of entries) {
			restoreInline(entry);
			unregisterNode(id);
			delete entry.node.dataset.el;
			delete entry.node.dataset.cmsAuto;
			entry.node.classList.remove('cms-editable');
		}
		entries.clear();
	});
</script>
