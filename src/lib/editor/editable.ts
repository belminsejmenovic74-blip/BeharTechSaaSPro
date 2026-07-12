// ══════════════════════════════════════════════════════════════════════════
//  Action Svelte `use:editable` — instrumente un nœud du site.
//  Visiteur (editMode=false) : NE FAIT RIEN → aucun contour/outil exposé.
//  Admin en mode édition : sélection, application des overrides (style+layout),
//  édition de texte inline (contenteditable), hover.
// ══════════════════════════════════════════════════════════════════════════
import type { Action } from 'svelte/action';
import { get } from 'svelte/store';
import {
	breakpoint,
	editMode,
	getCmsStore,
	getByPath,
	hoveredId,
	registerNode,
	revision,
	select,
	selectedId,
	setContentPath,
	setOverrideText,
	unregisterNode,
	type EditableFields,
	type EditableKind
} from './store';
import { layoutDeclarations, resolveLayout, styleDeclarations } from './elements';

export interface EditableParams {
	id: string;
	kind?: EditableKind;
	/** Chemin SiteContent pour l'édition de texte inline (ex: "hero.title"). */
	path?: string;
	label?: string;
	/** Texte multiligne : les sauts de ligne \n sont préservés (br). */
	multiline?: boolean;
	/** Chemins SiteContent des champs typés (lien, image, alt…). */
	fields?: EditableFields;
}

const isBrowser = typeof window !== 'undefined';

export const editable: Action<HTMLElement, EditableParams> = (node, params) => {
	if (!isBrowser) return {};

	let p = params;
	node.dataset.el = p.id;
	let editing = false;
	// Texte figé d'origine (pour les éléments SANS champ typé) : sert de valeur de
	// repli quand aucun override texte n'est défini.
	const isLeafText = node.children.length === 0;
	let originalText = node.textContent ?? '';
	// Propriétés CSS actuellement forcées par nous → pour pouvoir les retirer.
	const forced = new Set<string>();

	function clearForced() {
		for (const prop of forced) node.style.removeProperty(prop);
		forced.clear();
	}

	function applyOverrides() {
		clearForced();
		const store = getCmsStore();
		if (!store) return;
		const override = get(store).editorOverrides?.[p.id];

		// Texte générique (élément sans champ typé) : applique l'override ou le texte
		// d'origine. On ne touche jamais aux nœuds avec enfants (icônes) ni en édition.
		if (!p.path && isLeafText && !editing) {
			const overridden = override?.content?.text;
			const target = overridden != null ? overridden : originalText;
			if (node.textContent !== target) node.textContent = target;
		}

		if (!override) return;
		const decls = {
			...styleDeclarations(override.style),
			...layoutDeclarations(resolveLayout(override, get(breakpoint)))
		};
		for (const [prop, value] of Object.entries(decls)) {
			node.style.setProperty(prop, value, 'important');
			forced.add(prop);
		}
	}

	function onClick(e: MouseEvent) {
		if (!get(editMode) || editing) return;
		e.preventDefault();
		e.stopPropagation();
		select(p.id);
	}

	function onDblClick(e: MouseEvent) {
		if (!get(editMode)) return;
		if (p.kind === 'image' || p.kind === 'container') return;
		// Éditable si champ typé OU nœud texte simple (override générique).
		if (!p.path && !isLeafText) return;
		e.preventDefault();
		e.stopPropagation();
		startTextEdit();
	}

	function onEnter(e: MouseEvent) {
		if (get(editMode) && !editing) hoveredId.set(p.id);
	}
	function onLeave() {
		if (get(hoveredId) === p.id) hoveredId.set(null);
	}

	/* ---- Édition de texte inline ---------------------------------------- */
	function startTextEdit() {
		if (editing || (!p.path && !isLeafText)) return;
		editing = true;
		node.setAttribute('contenteditable', 'plaintext-only');
		node.dataset.editing = 'true';
		node.focus();
		// Sélectionne tout le contenu.
		const range = document.createRange();
		range.selectNodeContents(node);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
		node.addEventListener('blur', commitTextEdit, { once: true });
		node.addEventListener('keydown', onEditKeydown);
	}

	function onEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !p.multiline && !e.shiftKey) {
			e.preventDefault();
			node.blur();
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			// Restaure la valeur effective puis quitte sans commit.
			const store = getCmsStore();
			if (store) {
				if (p.path) {
					node.textContent = String(getByPath(get(store), p.path) ?? '');
				} else {
					const ov = get(store).editorOverrides?.[p.id]?.content?.text;
					node.textContent = ov != null ? ov : originalText;
				}
			}
			node.blur();
		}
	}

	function readText(): string {
		if (p.multiline) {
			// <br> / blocs → \n
			const html = node.innerHTML.replace(/<div>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
			const tmp = document.createElement('div');
			tmp.innerHTML = html;
			return (tmp.textContent ?? '').replace(/\n{3,}/g, '\n\n');
		}
		return node.textContent ?? '';
	}

	function commitTextEdit() {
		node.removeEventListener('keydown', onEditKeydown);
		node.removeAttribute('contenteditable');
		delete node.dataset.editing;
		editing = false;
		const store = getCmsStore();
		if (!store) return;
		const next = readText();
		if (p.path) {
			const current = String(getByPath(get(store), p.path) ?? '');
			if (next !== current) setContentPath(p.path, next);
		} else if (isLeafText) {
			const current = String(get(store).editorOverrides?.[p.id]?.content?.text ?? originalText);
			if (next !== current) setOverrideText(p.id, next);
		}
	}

	/* ---- Réactivité ------------------------------------------------------- */
	function refreshMode(on: boolean) {
		node.classList.toggle('cms-editable', on);
		node.style.cursor = on && !editing ? 'default' : '';
		if (!on && editing) node.blur();
	}

	const unsubs = [
		editMode.subscribe(refreshMode),
		revision.subscribe(() => applyOverrides()),
		breakpoint.subscribe(() => applyOverrides()),
		selectedId.subscribe((id) => node.classList.toggle('cms-selected', id === p.id))
	];

	node.addEventListener('click', onClick, true);
	node.addEventListener('dblclick', onDblClick, true);
	node.addEventListener('mouseenter', onEnter);
	node.addEventListener('mouseleave', onLeave);

	registerNode({
		id: p.id,
		node,
		kind: p.kind ?? 'text',
		path: p.path,
		label: p.label,
		fields: p.fields
	});
	applyOverrides();

	return {
		update(next: EditableParams) {
			if (next.id !== p.id) {
				unregisterNode(p.id);
				node.dataset.el = next.id;
				registerNode({
					id: next.id,
					node,
					kind: next.kind ?? 'text',
					path: next.path,
					label: next.label,
					fields: next.fields
				});
			}
			p = next;
			applyOverrides();
		},
		destroy() {
			unsubs.forEach((u) => u());
			node.removeEventListener('click', onClick, true);
			node.removeEventListener('dblclick', onDblClick, true);
			node.removeEventListener('mouseenter', onEnter);
			node.removeEventListener('mouseleave', onLeave);
			unregisterNode(p.id);
		}
	};
};
