"use client";

function withPdfExtension(filename: string): string {
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}

/**
 * iOS Safari (et WebKit mobile / iPadOS) ignorent l'attribut `download` et
 * gèrent mal les `blob:` URLs : le pattern fetch → blob → `<a download>` ne
 * déclenche aucun téléchargement. Sur ces plateformes on ouvre le PDF inline
 * dans un onglet ; l'utilisateur l'enregistre depuis le lecteur. Détection
 * volontairement large (iPhone/iPad + iPadOS déguisé en Mac tactile).
 */
export function isIosLikeBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iP(hone|ad|od)/.test(ua);
  const iPadOS = /Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  return iOS || iPadOS;
}

export function downloadBlobFile(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  // iOS : `<a download>` ignoré → on affiche le PDF dans un onglet (lecture + « Enregistrer »).
  if (isIosLikeBrowser()) {
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadPdfFile(blob: Blob, filename: string): void {
  const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  downloadBlobFile(pdfBlob, withPdfExtension(filename));
}

export async function downloadPdfUrl(url: string, filename: string): Promise<void> {
  // iOS : on ouvre le vrai PDF dans un onglet AVANT tout `await` (sinon Safari
  // bloque le popup, le geste utilisateur étant perdu après le fetch).
  if (isIosLikeBrowser()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const response = await fetch(url, { cache: "no-store" });
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const json = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      throw new Error(json?.error || json?.message || `Téléchargement PDF impossible (${response.status}).`);
    }
    throw new Error(`Téléchargement PDF impossible (${response.status}).`);
  }
  const blob = await response.blob();
  if (!contentType.includes("application/pdf") && blob.type !== "application/pdf") {
    throw new Error("Le lien ne renvoie pas un vrai fichier PDF.");
  }
  downloadPdfFile(blob, filename);
}
