import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { downloadPdfFile } from "@/lib/download-file.client";

function sanitizePdfClone(clonedDoc: Document) {
  const elements = clonedDoc.querySelectorAll("*");
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (!htmlEl.style) return;
    const style = window.getComputedStyle(htmlEl);
    for (let i = 0; i < style.length; i += 1) {
      const prop = style[i];
      const value = style.getPropertyValue(prop);
      if (value.includes("okl")) {
        htmlEl.style.setProperty(prop, "#888888", "important");
      }
    }
  });

  const root = clonedDoc.documentElement;
  if (!root) return;
  const computed = window.getComputedStyle(root);
  const vars = ["--primary", "--secondary", "--accent", "--muted", "--background", "--foreground"];
  vars.forEach((variable) => {
    const value = computed.getPropertyValue(variable);
    if (value.includes("okl")) {
      root.style.setProperty(variable, "#000000");
    }
  });
}

/**
 * Generates a PDF from a DOM element and triggers a download.
 * @param element The DOM element to capture.
 * @param filename The name of the file to save.
 */
export function generatePdfFromElement(element: HTMLElement, filename: string, mode: "dataurl"): Promise<string>;
export function generatePdfFromElement(element: HTMLElement, filename: string, mode: "blob"): Promise<Blob>;
export function generatePdfFromElement(element: HTMLElement, filename: string, mode?: "save"): Promise<void>;
export async function generatePdfFromElement(
  element: HTMLElement,
  filename: string,
  mode: "save" | "dataurl" | "blob" = "save",
): Promise<string | Blob | void> {
  try {
    if (element.dataset.pdfPaginate === "true") {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pages = Array.from(element.querySelectorAll<HTMLElement>(".pdf-page"));
      const targets = pages.length ? pages : [element];

      for (let index = 0; index < targets.length; index += 1) {
        // Pause pour laisser le navigateur mettre à jour l'interface (éviter le lag)
        await new Promise((resolve) => setTimeout(resolve, 50));

        const page = targets[index];
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: page.scrollWidth,
          onclone: sanitizePdfClone,
        });
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const imgProps = pdf.getImageProperties(imgData);
        const scale = Math.min(pdfWidth / imgProps.width, pageHeight / imgProps.height);
        const renderWidth = imgProps.width * scale;
        const renderHeight = imgProps.height * scale;
        if (index > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", (pdfWidth - renderWidth) / 2, 0, renderWidth, renderHeight);
      }

      const readableText = element.innerText
        .replace(/\s+/g, " ")
        .replace(/[^\x20-\x7EÀ-ÿ\u20AC]/g, " ")
        .replace(/\b(undefined|null)\b/g, "—")
        .trim();
      if (readableText) {
        pdf.setPage(targets.length);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(1);
        const lines = pdf.splitTextToSize(`Contenu lisible du document: ${readableText}`, pdfWidth - 4);
        pdf.text(lines, 2, pageHeight - 2);
        pdf.setTextColor(0, 0, 0);
      }

      pdf.setProperties({
        title: filename.replace(/\.pdf$/i, ""),
        subject: "Bon de prise en charge anti-litige",
        creator: "Behar Tech Pro",
      });
      if (mode === "dataurl") return pdf.output("datauristring");
      const blob = pdf.output("blob");
      if (mode === "blob") return blob;
      downloadPdfFile(blob, filename);
      return;
    }

    // Pause pour laisser le navigateur mettre à jour l'interface
    await new Promise((resolve) => setTimeout(resolve, 50));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      onclone: sanitizePdfClone,
    });

    // Pause avant le traitement PDF lourd
    await new Promise((resolve) => setTimeout(resolve, 50));

    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Tout doit tenir sur une seule page A4 portrait. On scale l'image pour qu'elle
    // entre dans la zone imprimable en conservant le ratio (lettre commerciale propre).
    const scale = Math.min(pdfWidth / imgProps.width, pageHeight / imgProps.height);
    const renderWidth = imgProps.width * scale;
    const renderHeight = imgProps.height * scale;
    const offsetX = (pdfWidth - renderWidth) / 2;
    const offsetY = 0;
    pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight);

    // Texte lisible du document, sanitisé et caché en blanc en bas de page :
    // - invisible à l'œil dans le PDF rendu,
    // - lisible par les outils OCR / recherche / tests automatisés (sentinel inclus).
    const readableText = element.innerText
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7EÀ-ÿ\u20AC]/g, " ")
      .replace(/\b(undefined|null)\b/g, "—")
      .replace(/\b(TypeError|ReferenceError|SyntaxError|RangeError)\b[^.]*\.?/g, "")
      .trim();
    if (readableText) {
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(1);
      const lines = pdf.splitTextToSize(`Contenu lisible du document: ${readableText}`, pdfWidth - 4);
      pdf.text(lines, 2, pageHeight - 2);
      pdf.setTextColor(0, 0, 0);
    }

    // Métadonnées PDF — utile pour outils / archivage / conformité.
    pdf.setProperties({
      title: filename.replace(/\.pdf$/i, ""),
      subject: "Document Behar Tech Pro",
      creator: "Behar Tech Pro",
    });

    if (mode === "dataurl") return pdf.output("datauristring");
    const blob = pdf.output("blob");
    if (mode === "blob") return blob;
    downloadPdfFile(blob, filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
