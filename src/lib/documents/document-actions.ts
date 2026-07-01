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

import { toast } from "sonner";

import type { BeharDocument, DocumentType } from "@/lib/behar-store";
import { isIosLikeBrowser } from "@/lib/download-file.client";
import { publicAbsoluteUrl } from "@/lib/public-access";

// Seul l'identifiant est requis pour construire l'URL : le filtrage interne/public
// se fait côté route à partir du vrai document du store. On accepte donc tout objet
// porteur d'un `id` (y compris des documents faiblement typés du dossier) sans cast.
export type DocumentLike = { id: string; type?: DocumentType | string };
export type PdfDocumentLike = DocumentLike & { fileUrl?: string | null };

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

type QrPrintOptions = {
  print?: boolean;
  format?: "A4" | "A6" | "80mm" | "58mm";
};

type PdfFetchResult = {
  blob: Blob;
  filename?: string;
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

function buildQrUrl(repairId: string, options?: QrPrintOptions): string {
  const params = new URLSearchParams();
  if (options?.print) params.set("print", "1");
  if (options?.format) params.set("format", options.format);
  const query = params.toString();
  return `/print/qr/${encodeURIComponent(repairId)}/${query ? `?${query}` : ""}`;
}

function printUrlInHiddenFrame(url: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // Chrome/Edge/Firefox bloquent souvent window.print() lancé depuis un iframe
  // chargé après coup. Une page dédiée ouverte par le clic utilisateur garde le
  // Comptoir en place tout en déclenchant l'impression de manière fiable.
  const printWindow = window.open(url, "_blank", "popup=yes,width=920,height=1200,noopener,noreferrer");
  if (printWindow) {
    try {
      printWindow.focus();
    } catch {
      // Certains navigateurs ignorent focus() sur une fenêtre ouverte avec noopener.
    }
    return true;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.src = url;
  document.body.appendChild(iframe);

  window.setTimeout(() => iframe.remove(), 90_000);
  return true;
}

/** URL interne (atelier) du document — données complètes. */
export function getInternalDocumentUrl(document: DocumentLike): string {
  return buildUrl(document);
}

/** URL publique (client) du document — fiches internes bloquées par la route. */
export function getPublicDocumentUrl(document: DocumentLike): string {
  return buildUrl(document, { public: true });
}

/** URL interne dédiée à l'impression du document. */
export function getDocumentPrintUrl(document: DocumentLike, options?: Omit<OpenOptions, "print">): string {
  return buildUrl(document, { ...options, print: true });
}

export function getDocumentPdfUrl(document: DocumentLike, mode: "download" | "inline" = "inline"): string {
  const params = new URLSearchParams({ mode });
  return `/api/documents/${encodeURIComponent(document.id)}.pdf?${params.toString()}`;
}

function preferredPdfUrl(document: PdfDocumentLike, mode: "download" | "inline"): string {
  return document.fileUrl || getDocumentPdfUrl(document, mode);
}

function filenameFromContentDisposition(value: string | null): string | undefined {
  if (!value) return undefined;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/[/\\]/g, "-");
    } catch {
      return utf8Match[1].replace(/[/\\]/g, "-");
    }
  }
  const asciiMatch = /filename="?([^";]+)"?/i.exec(value);
  return asciiMatch?.[1]?.replace(/[/\\]/g, "-");
}

function fallbackPdfFilename(document: PdfDocumentLike): string {
  const base = (document.id || "document")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
  return `${base || "document"}.pdf`;
}

function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function readErrorReason(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    const json = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    return json?.error || json?.message || `erreur ${response.status}`;
  }
  const text = (await response.text().catch(() => "")).trim();
  return text || `erreur ${response.status}`;
}

export async function fetchDocumentPdfBlob(
  document: PdfDocumentLike,
  mode: "download" | "inline" = "inline",
): Promise<PdfFetchResult> {
  const response = await fetch(preferredPdfUrl(document, mode), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readErrorReason(response));
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const errorResponse = response.clone();
  const blob = await response.blob();
  if (!contentType.includes("application/pdf") && blob.type !== "application/pdf") {
    throw new Error(await readErrorReason(errorResponse).catch(() => "Le serveur n'a pas renvoyé un fichier PDF."));
  }

  return {
    blob: blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" }),
    filename: filenameFromContentDisposition(response.headers.get("content-disposition")),
  };
}

function notifyDocumentError(error: unknown): void {
  const reason = error instanceof Error ? error.message : "raison inconnue";
  toast.error(`Document impossible à générer : ${reason}`);
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
  if (!document?.id) return false;
  return printUrlInHiddenFrame(getDocumentPrintUrl(document, options));
}

export async function downloadDocumentPdfAsync(document?: PdfDocumentLike | null): Promise<boolean> {
  if (typeof window === "undefined" || typeof window.document === "undefined" || !document?.id) return false;
  try {
    const pdf = await fetchDocumentPdfBlob(document, "download");
    downloadBlob(pdf.blob, pdf.filename || fallbackPdfFilename(document));
    return true;
  } catch (error) {
    notifyDocumentError(error);
    return false;
  }
}

export function downloadDocumentPdf(document?: PdfDocumentLike | null): boolean {
  if (typeof window === "undefined" || typeof window.document === "undefined" || !document?.id) return false;
  // iOS ignore `<a download>` + blob : on ouvre le vrai PDF (fileUrl Storage ou
  // /api/documents/{id}.pdf) inline dans un onglet, synchronement pour préserver
  // le geste utilisateur. L'utilisateur enregistre ensuite depuis le lecteur.
  if (isIosLikeBrowser()) {
    window.open(preferredPdfUrl(document, "inline"), "_blank", "noopener,noreferrer");
    return true;
  }
  void downloadDocumentPdfAsync(document);
  return true;
}

export async function printDocumentPdfAsync(document?: PdfDocumentLike | null): Promise<boolean> {
  if (typeof window === "undefined" || !document?.id) return false;
  const printWindow = window.open("", "_blank", "popup=yes,width=920,height=1200,noopener,noreferrer");
  if (printWindow) {
    printWindow.document.title = "Préparation impression";
    printWindow.document.body.innerHTML =
      "<main style='display:grid;min-height:100vh;place-items:center;background:#fff;color:#1A1916;font-family:system-ui,sans-serif'>Préparation du document...</main>";
  }

  try {
    const pdf = await fetchDocumentPdfBlob(document, "inline");
    const blobUrl = URL.createObjectURL(pdf.blob);
    if (printWindow) {
      printWindow.location.href = blobUrl;
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          toast.info("Le document est prêt. Ouvrez-le puis imprimez-le depuis le navigateur.");
        }
      }, 1_000);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
      return true;
    }

    const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (opened) {
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
      toast.info("Le document est prêt. Ouvrez-le puis imprimez-le depuis le navigateur.");
      return true;
    }

    downloadBlob(pdf.blob, pdf.filename || fallbackPdfFilename(document));
    toast.info("Le document est prêt. Ouvrez-le puis imprimez-le depuis le navigateur.");
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
    return true;
  } catch (error) {
    if (printWindow && !printWindow.closed) {
      printWindow.document.body.innerHTML =
        "<main style='display:grid;min-height:100vh;place-items:center;background:#fff;color:#B42318;font-family:system-ui,sans-serif'>Document impossible à générer.</main>";
    }
    notifyDocumentError(error);
    return false;
  }
}

export function printDocumentPdf(document?: PdfDocumentLike | null): boolean {
  if (typeof window === "undefined" || !document?.id) return false;
  void printDocumentPdfAsync(document);
  return true;
}

/** URL absolue partageable (copie de lien, QR). */
export function getShareableDocumentUrl(document: DocumentLike, options?: OpenOptions): string {
  const relative = buildUrl(document, { public: true, ...options });
  return publicAbsoluteUrl(relative);
}

export function getRepairQrPrintUrl(repairId: string, options?: QrPrintOptions): string {
  return buildQrUrl(repairId, options);
}

export function printRepairQr(repairId?: string | null, options?: Omit<QrPrintOptions, "print">): boolean {
  if (!repairId) return false;
  return printUrlInHiddenFrame(getRepairQrPrintUrl(repairId, { ...options, print: true }));
}
