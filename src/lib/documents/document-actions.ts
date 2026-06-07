// Couche commune d'actions documentaires.
//
// OBJECTIF : une seule logique pour ouvrir / imprimer / partager un document,
// réutilisée par le Dashboard Documents, la fiche réparation, le mode comptoir
// et le suivi client. On ne crée PAS un second rendu : tout passe par la route
// interne `/print/document/[documentId]` (composant LocalDocumentPrintPage), qui
// rend le vrai document via LocalPrintableDocument.
//
// - mode interne  : `/print/document/{id}`            (atelier, données complètes)
// - mode public   : `/print/document/{id}?public=1`   (client, fiches internes bloquées)
// - impression    : on ajoute `?print=1` pour déclencher window.print() au chargement.

import type { BeharDocument, DocumentType } from "@/lib/behar-store";

export type DocumentLike = Pick<BeharDocument, "id" | "type"> & Partial<BeharDocument>;

/** Types de documents jamais exposés côté client. */
const INTERNAL_ONLY_TYPES: DocumentType[] = ["internal", "summary"];

export function isInternalOnlyDocument(document?: DocumentLike | null): boolean {
  return Boolean(document && INTERNAL_ONLY_TYPES.includes(document.type));
}

/** URL interne (atelier) du document — données complètes. */
export function getInternalDocumentUrl(document: DocumentLike): string {
  return `/print/document/${document.id}`;
}

/** URL publique (client) du document — fiches internes bloquées par la route. */
export function getPublicDocumentUrl(document: DocumentLike): string {
  return `/print/document/${document.id}?public=1`;
}

type OpenOptions = {
  /** true => vue publique filtrée (client). false/undefined => vue interne atelier. */
  public?: boolean;
  /** true => déclenche l'impression automatiquement au chargement. */
  print?: boolean;
};

function buildUrl(document: DocumentLike, options?: OpenOptions): string {
  const params = new URLSearchParams();
  if (options?.public) params.set("public", "1");
  if (options?.print) params.set("print", "1");
  const query = params.toString();
  return `/print/document/${document.id}${query ? `?${query}` : ""}`;
}

/**
 * Ouvre le vrai document dans un nouvel onglet (idéal POS / comptoir : la caisse
 * reste ouverte). Retourne false si le document est introuvable.
 */
export function openDocument(document?: DocumentLike | null, options?: OpenOptions): boolean {
  if (typeof window === "undefined") return false;
  if (!document?.id) return false;
  window.open(buildUrl(document, options), "_blank", "noopener,noreferrer");
  return true;
}

/**
 * Ouvre le document et lance l'impression du vrai document (pas l'écran courant).
 * Réutilise exactement le même rendu que le Dashboard.
 */
export function printDocument(document?: DocumentLike | null, options?: Omit<OpenOptions, "print">): boolean {
  return openDocument(document, { ...options, print: true });
}

/** URL absolue partageable (copie de lien, QR). */
export function getShareableDocumentUrl(document: DocumentLike, options?: OpenOptions): string {
  const relative = buildUrl(document, { public: true, ...options });
  const origin =
    process.env.NEXT_PUBLIC_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}${relative}`;
}
