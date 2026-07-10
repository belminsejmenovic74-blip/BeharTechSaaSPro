"use client";

import jsPDF from "jspdf";

import type { StockItem } from "@/lib/behar-store";
import { downloadPdfFile } from "@/lib/download-file.client";
import { normalizePartReference, stockPrimaryReference } from "@/lib/stock-reference";

export type StockLabelPdfFormat = "thermal40" | "standard60" | "a4";

type LabelConfig = {
  width: number;
  height: number;
  qr: number;
  pad: number;
  referenceSize: number;
  referenceMinSize: number;
  nameSize: number;
  secondarySize: number;
};

const LABELS: Record<Exclude<StockLabelPdfFormat, "a4">, LabelConfig> = {
  thermal40: {
    width: 40,
    height: 25,
    qr: 11.5,
    pad: 2.2,
    referenceSize: 10.5,
    referenceMinSize: 6.5,
    nameSize: 5.8,
    secondarySize: 4.5,
  },
  standard60: {
    width: 60,
    height: 30,
    qr: 17,
    pad: 2.8,
    referenceSize: 14,
    referenceMinSize: 8,
    nameSize: 7,
    secondarySize: 5.4,
  },
};

const A4_LAYOUT = {
  width: 210,
  height: 297,
  marginX: 8,
  marginY: 9,
  gapX: 4,
  gapY: 5,
  columns: 3,
  rows: 8,
} as const;

function clean(value: string | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map(clean).find(Boolean) ?? "";
}

function uniqueDisplay(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const text = clean(value);
    const key = normalizePartReference(text);
    if (!text || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as string[];
}

export type StockLabelContent = {
  reference: string;
  name: string;
  compatibility: string;
  secondary: string;
  smallCode: string;
};

export function getStockLabelContent(item: StockItem): StockLabelContent {
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  const compatibility = uniqueDisplay([item.brandName, item.compatibleModels.join(" / ")]).join(" · ");
  const secondary = uniqueDisplay([item.quality, item.location]).join(" · ");
  const smallCode = uniqueDisplay([
    item.ean ? `EAN ${item.ean}` : "",
    item.sku && normalizePartReference(item.sku) !== normalizePartReference(reference) ? `SKU ${item.sku}` : "",
  ]).join(" · ");
  return {
    reference,
    name: firstNonEmpty(item.displayName, item.name, item.categoryName, item.category, "Pièce"),
    compatibility,
    secondary,
    smallCode,
  };
}

function fitSingleLine(pdf: jsPDF, value: string, maxWidth: number, preferredSize: number, minimumSize: number) {
  let size = preferredSize;
  pdf.setFontSize(size);
  while (size > minimumSize && pdf.getTextWidth(value) > maxWidth) {
    size -= 0.5;
    pdf.setFontSize(size);
  }
  if (pdf.getTextWidth(value) <= maxWidth) return { value, size };
  let fitted = value;
  while (fitted.length > 2 && pdf.getTextWidth(`${fitted}…`) > maxWidth) fitted = fitted.slice(0, -1);
  return { value: `${fitted}…`, size };
}

function clippedLine(pdf: jsPDF, value: string, maxWidth: number) {
  if (!value || pdf.getTextWidth(value) <= maxWidth) return value;
  let fitted = value;
  while (fitted.length > 2 && pdf.getTextWidth(`${fitted}…`) > maxWidth) fitted = fitted.slice(0, -1);
  return `${fitted}…`;
}

function drawLabel(pdf: jsPDF, item: StockItem, qrDataUrl: string, x: number, y: number, config: LabelConfig) {
  const content = getStockLabelContent(item);
  const qrX = x + config.width - config.pad - config.qr;
  const qrY = y + (config.height - config.qr) / 2;
  const contentX = x + config.pad;
  const contentWidth = Math.max(1, qrX - contentX - 2);
  const compact = config.height <= 25;

  pdf.setDrawColor(26, 25, 22);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, config.width, config.height);

  pdf.setTextColor(26, 25, 22);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(4.8);
  pdf.text("BEHAR • TECH PRO", contentX, y + config.pad + 1.6);

  pdf.setFont("courier", "bold");
  const fittedReference = fitSingleLine(
    pdf,
    content.reference,
    contentWidth,
    config.referenceSize,
    config.referenceMinSize,
  );
  pdf.setFontSize(fittedReference.size);
  const referenceY = y + config.pad + (compact ? 6.8 : 7.8);
  pdf.text(fittedReference.value, contentX, referenceY);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(config.nameSize);
  pdf.setLineHeightFactor(1.08);
  const nameLines = (pdf.splitTextToSize(content.name, contentWidth) as string[]).slice(0, 2);
  const nameY = referenceY + (compact ? 3.4 : 4.2);
  pdf.text(nameLines, contentX, nameY);
  let cursorY = nameY + Math.max(1, nameLines.length) * (compact ? 2.1 : 2.7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(config.secondarySize);
  pdf.setTextColor(107, 107, 107);
  if (content.compatibility && cursorY < y + config.height - config.pad - 2.4) {
    pdf.text(clippedLine(pdf, content.compatibility, contentWidth), contentX, cursorY);
    cursorY += compact ? 1.9 : 2.4;
  }
  if (content.secondary && cursorY < y + config.height - config.pad - 1.1) {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(22, 123, 112);
    pdf.text(clippedLine(pdf, content.secondary, contentWidth), contentX, cursorY);
  }

  if (content.smallCode) {
    pdf.setFont("courier", "normal");
    pdf.setFontSize(compact ? 3.8 : 4.4);
    pdf.setTextColor(107, 107, 107);
    pdf.text(clippedLine(pdf, content.smallCode, contentWidth), contentX, y + config.height - config.pad - 0.4);
  }

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, "PNG", qrX, qrY, config.qr, config.qr, undefined, "NONE");
  }
}

export function downloadStockLabelPdf({
  copies,
  filename,
  format,
  item,
  qrDataUrl,
}: {
  copies: number;
  filename: string;
  format: StockLabelPdfFormat;
  item: StockItem;
  qrDataUrl: string;
}) {
  downloadPdfFile(createStockLabelPdfBlob({ copies, format, item, qrDataUrl }), filename);
}

export function createStockLabelPdfBlob({
  copies,
  format,
  item,
  qrDataUrl,
}: {
  copies: number;
  format: StockLabelPdfFormat;
  item: StockItem;
  qrDataUrl: string;
}) {
  if (!qrDataUrl) throw new Error("QR code requis pour générer une étiquette imprimable.");

  if (format !== "a4") {
    const config = LABELS[format];
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [config.width, config.height] });
    drawLabel(pdf, item, qrDataUrl, 0, 0, config);
    return pdf.output("blob");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const config = LABELS.standard60;
  const perPage = A4_LAYOUT.columns * A4_LAYOUT.rows;
  const safeCopies = Math.max(1, Math.min(80, Math.round(copies || 1)));

  for (let index = 0; index < safeCopies; index += 1) {
    if (index > 0 && index % perPage === 0) pdf.addPage("a4", "portrait");
    const pageIndex = index % perPage;
    const column = pageIndex % A4_LAYOUT.columns;
    const row = Math.floor(pageIndex / A4_LAYOUT.columns);
    drawLabel(
      pdf,
      item,
      qrDataUrl,
      A4_LAYOUT.marginX + column * (config.width + A4_LAYOUT.gapX),
      A4_LAYOUT.marginY + row * (config.height + A4_LAYOUT.gapY),
      config,
    );
  }

  return pdf.output("blob");
}
