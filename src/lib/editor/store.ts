// ══════════════════════════════════════════════════════════════════════════
//  Éditeur visuel — état global + moteur de mutation/undo-redo.
//  Opère sur le MÊME store `cms` (SiteContent) que le site → WYSIWYG instantané.
//  Tout le chrome d'édition n'est monté que pour un admin (voir EditorRoot).
// ══════════════════════════════════════════════════════════════════════════
import { get, writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type {
	Breakpoint,
	ElementLayout,
	ElementOverride,
	ElementStyle,
	SiteContent
} from '$lib/cms/types';

export type { Breakpoint } from '$lib/cms/types';

export type EditableKind = 'text' | 'heading' | 'button' | 'image' | 'container';

/** Chemins SiteContent des champs typés associés à un élément (lien, image…). */
export interface EditableFields {
	label?: string; // chemin du libellé (bouton)
	href?: string; // chemin du lien (bouton)
	src?: string; // chemin de la source (image)
	alt?: string; // chemin du texte alternatif (image)
}

export interface Registration {
	id: string;
	node: HTMLElement;
	kind: EditableKind;
	/** Chemin dans SiteContent pour l'édition de texte inline (ex: "hero.title"). */
	path?: string;
	label?: string;
	fields?: EditableFields;
}

/* ---- État réactif ------------------------------------------------------- */
export const editMode = writable(false);
export const selectedId = writable<string | null>(null);
export const hoveredId = writable<string | null>(null);
export const breakpoint = writable<Breakpoint>('desktop');
export const isDirty = writable(false);
/** Incrémenté à chaque mutation/gesture → force les overlays à recalculer les rects. */
export const revision = writable(0);
export const canUndo = writable(false);
export const canRedo = writable(false);

/* ---- Registre des nœuds éditables vivants ------------------------------- */
const registry = new Map<string, Registration>();

export function registerNode(reg: Registration) {
	registry.set(reg.id, reg);
}
export function unregisterNode(id: string) {
	registry.delete(id);
}
export function getRegistration(id: string | null): Registration | undefined {
	return id ? registry.get(id) : undefined;
}

/* ---- Liaison au store CMS (fournie par EditorRoot via contexte) ---------- */
let cmsStore: Writable<SiteContent> | null = null;
export function bindCms(store: Writable<SiteContent>) {
	cmsStore = store;
	undoStack.length = 0;
	redoStack.length = 0;
	syncHistoryFlags();
}
export function getCmsStore() {
	return cmsStore;
}

/* ---- Historique (snapshots) --------------------------------------------- */
const undoStack: SiteContent[] = [];
const redoStack: SiteContent[] = [];
const MAX_HISTORY = 120;
let gestureBefore: SiteContent | null = null;

function syncHistoryFlags() {
	canUndo.set(undoStack.length > 0);
	canRedo.set(redoStack.length > 0);
}
function bump() {
	revision.update((n) => n + 1);
	isDirty.set(true);
}

/** Mutation atomique avec entrée d'historique. */
export function commit(mutate: (c: SiteContent) => void) {
	if (!cmsStore) return;
	const before = structuredClone(get(cmsStore));
	cmsStore.update((c) => {
		mutate(c);
		return c;
	});
	undoStack.push(before);
	if (undoStack.length > MAX_HISTORY) undoStack.shift();
	redoStack.length = 0;
	syncHistoryFlags();
	bump();
}

/* Gestes continus (drag/resize) : un seul point d'historique par geste. */
export function beginGesture() {
	if (!cmsStore) return;
	gestureBefore = structuredClone(get(cmsStore));
}
export function liveUpdate(mutate: (c: SiteContent) => void) {
	if (!cmsStore) return;
	cmsStore.update((c) => {
		mutate(c);
		return c;
	});
	bump();
}
export function endGesture() {
	if (!cmsStore || !gestureBefore) return;
	undoStack.push(gestureBefore);
	if (undoStack.length > MAX_HISTORY) undoStack.shift();
	redoStack.length = 0;
	gestureBefore = null;
	syncHistoryFlags();
	isDirty.set(true);
}

export function undo() {
	if (!cmsStore || undoStack.length === 0) return;
	const current = structuredClone(get(cmsStore));
	const prev = undoStack.pop()!;
	redoStack.push(current);
	cmsStore.set(prev);
	syncHistoryFlags();
	bump();
}
export function redo() {
	if (!cmsStore || redoStack.length === 0) return;
	const current = structuredClone(get(cmsStore));
	const next = redoStack.pop()!;
	undoStack.push(current);
	cmsStore.set(next);
	syncHistoryFlags();
	bump();
}

/* ---- Helpers de chemin (contenu typé : hero.title, etc.) ---------------- */
export function getByPath(obj: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as any)[k]), obj);
}
function setByPath(obj: any, path: string, value: unknown) {
	const keys = path.split('.');
	let o = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		o[keys[i]] ??= {};
		o = o[keys[i]];
	}
	o[keys[keys.length - 1]] = value;
}

/* ---- Mutations de haut niveau ------------------------------------------- */
export function setContentPath(path: string, value: unknown) {
	commit((c) => setByPath(c, path, value));
}

/** Lit une valeur de contenu typé (ex: lien d'un CTA) dans le store courant. */
export function getContentValue(path: string): unknown {
	return cmsStore ? getByPath(get(cmsStore), path) : undefined;
}

function ensureOverride(c: SiteContent, id: string): ElementOverride {
	c.editorOverrides ??= {};
	c.editorOverrides[id] ??= {};
	return c.editorOverrides[id];
}

export function getOverride(id: string): ElementOverride | undefined {
	return cmsStore ? get(cmsStore).editorOverrides?.[id] : undefined;
}

/** Texte édité pour un élément SANS champ typé (stocké dans l'override). */
export function setOverrideText(id: string, text: string) {
	commit((c) => {
		const o = ensureOverride(c, id);
		o.content = { ...o.content, text };
	});
}

export function setStyle(id: string, patch: Partial<ElementStyle>) {
	commit((c) => {
		const o = ensureOverride(c, id);
		o.style = { ...o.style, ...patch };
	});
}

export function setLayout(id: string, bp: Breakpoint, patch: Partial<ElementLayout>, live = false) {
	const apply = (c: SiteContent) => {
		const o = ensureOverride(c, id);
		o.layout ??= {};
		o.layout[bp] = { ...o.layout[bp], ...patch };
	};
	if (live) liveUpdate(apply);
	else commit(apply);
}

export function resetOverride(id: string) {
	commit((c) => {
		if (c.editorOverrides) delete c.editorOverrides[id];
	});
}

/* ---- Sélection ---------------------------------------------------------- */
export function select(id: string | null) {
	selectedId.set(id);
}
