"use client";

function withPdfExtension(filename: string): string {
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}

export function downloadBlobFile(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
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
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Téléchargement PDF impossible (${response.status}).`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const blob = await response.blob();
  if (!contentType.includes("application/pdf") && blob.type !== "application/pdf") {
    throw new Error("Le lien ne renvoie pas un vrai fichier PDF.");
  }
  downloadPdfFile(blob, filename);
}
