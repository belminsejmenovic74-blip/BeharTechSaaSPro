// Couche commune d'actions documentaires.
//
// OBJECTIF : une seule logique pour ouvrir / imprimer / partager un document,
// réutilisée par le Dashboard Documents, la fiche réparation, le mode comptoir
// et le suivi client. On ne crée PAS un second rendu : tout passe par la route
// interne `/print/document/[documentId]` (composant LocalDocumentPrintPage), qui
// rend le vrai document via LocalPrintableDocument.
//
// - mode interne  : `/print/document/_/?doc={id}`            (atelier, données complètes)
// - mode public   : `/print/document/_/?doc={id}&public=1`   (client, fiches internes bloquées)
// - impression    : on ajoute `&print=1` pour déclencher window.print() au chargement.
//
// IMPORTANT (404) : la route dynamique `[documentId]` n'est pré-générée QUE pour le
// segment placeholder `_` (cf. generateStaticParams). En export statique, ouvrir
// `/print/document/<vrai-id>/` renvoie donc une 404. On passe l'identifiant réel via
// le query param `doc` sur la page placeholder `_`, qui sait le lire côté client.

import type { BeharDocument, DocumentType } from "@/lib/behar-store";

// Seul l'identifiant est requis pour construire l'URL : le filtrage interne/public
// se fait côté route à partir du vrai document du store. On accepte donc tout objet
// porteur d'un `id` (y compris des documents faiblement typés du dossier) sans cast.
export type DocumentLike = { id: string; type?: DocumentType | string };

/** Segment statique unique pré-généré pour la route document (cf. generateStaticParams). */
const DOCUMENT_ROUTE_PLACEHOLDER = "_";

/** Types de documents jamais exposés côté client. */
const INTERNAL_ONLY_TYPES: DocumentType[] = ["internal", "summary"];

export function isInternalOnlyDocument(document?: { type?: DocumentType } | null): boolean {
  return Boolean(document?.type && INTERNAL_ONLY_TYPES.includes(document.type));
}

type OpenOptions = {
  /** true => vue publique filtrée (client). false/undefined => vue interne atelier. */
  public?: boolean;
  /** true => déclenche l'impression automatiquement au chargement. */
  print?: boolean;
};

function buildUrl(document: DocumentLike, options?: OpenOptions): string {
  const params = new URLSearchParams();
  // L'identifiant réel est passé en query param pour rester compatible avec
  // l'export statique (seule la page placeholder `_` est pré-générée).
  params.set("doc", document.id);
  if (options?.public) params.set("public", "1");
  if (options?.print) params.set("print", "1");
  return `/print/document/${DOCUMENT_ROUTE_PLACEHOLDER}/?${params.toString()}`;
}

/** URL interne (atelier) du document — données complètes. */
export function getInternalDocumentUrl(document: DocumentLike): string {
  return buildUrl(document);
}

/** URL publique (client) du document — fiches internes bloquées par la route. */
export function getPublicDocumentUrl(document: DocumentLike): string {
  return buildUrl(document, { public: true });
}

/**
 * Ouvre le vrai document dans un nouvel onglet (idéal POS / comptoir : la vente
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
