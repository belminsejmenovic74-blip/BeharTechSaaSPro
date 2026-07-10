"use client";

import jsPDF from "jspdf";

import type { StockItem } from "@/lib/behar-store";
import { downloadPdfFile } from "@/lib/download-file.client";
import { stockPrimaryReference } from "@/lib/stock-reference";

export type StockLabelPdfFormat = "thermal40" | "standard60" | "a4";

type LabelConfig = {
  width: number;
  height: number;
  qr: number;
  pad: number;
  refSize: number;
  nameSize: number;
  codeSize: number;
};

const LABELS: Record<Exclude<StockLabelPdfFormat, "a4">, LabelConfig> = {
  thermal40: { width: 40, height: 25, qr: 11.5, pad: 2.2, refSize: 10.5, nameSize: 6.5, codeSize: 5.5 },
  standard60: { width: 60, height: 30, qr: 17, pad: 2.8, refSize: 15, nameSize: 7.5, codeSize: 6.5 },
};

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function labelName(item: StockItem) {
  const name = firstNonEmpty(item.displayName, item.name, item.categoryName, item.category, "Pièce");
  const model = item.compatibleModels.length ? item.compatibleModels.join(" / ") : "";
  if (!model || name.toLowerCase().includes(model.toLowerCase())) return name;
  return `${name} ${model}`;
}

function cleanPdfText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function drawLabel(pdf: jsPDF, item: StockItem, qrDataUrl: string, x: number, y: number, config: LabelConfig) {
  const reference = firstNonEmpty(stockPrimaryReference(item), item.sku, item.reference, item.internalCode, item.id);
  const name = cleanPdfText(labelName(item));
  const code = cleanPdfText(item.internalCode || "Code interne");
  const contentX = x + config.pad;
  const contentY = y + config.pad;
  const qrX = x + config.width - config.pad - config.qr;
  const qrY = y + config.height - config.pad - config.qr;
  const textWidth = Math.max(1, qrX - contentX - 1.8);

  pdf.setDrawColor(26, 25, 22);
  pdf.setLineWidth(0.22);
  pdf.rect(x, y, config.width, config.height);

  pdf.setTextColor(26, 25, 22);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(5.3);
  pdf.text("BEHAR", contentX, contentY + 2.4);
  pdf.setFillColor(42, 157, 143);
  pdf.circle(contentX + 12.2, contentY + 1.35, 0.75, "F");
  pdf.setTextColor(26, 25, 22);
  pdf.text("TECH", contentX + 14.3, contentY + 2.4);
  pdf.setDrawColor(42, 157, 143);
  pdf.setTextColor(22, 123, 112);
  pdf.roundedRect(contentX + 26.8, contentY - 0.5, 6.9, 3.6, 0.9, 0.9);
  pdf.text("PRO", contentX + 28.1, contentY + 2.3);

  pdf.setTextColor(26, 25, 22);
  pdf.setFont("courier", "bold");
  pdf.setFontSize(config.refSize);
  pdf.text(reference, contentX, contentY + (config.height <= 25 ? 10.5 : 12.5), { maxWidth: textWidth });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(config.nameSize);
  const nameLines = pdf.splitTextToSize(name, textWidth).slice(0, 2);
  pdf.text(nameLines, contentX, contentY + (config.height <= 25 ? 14.4 : 17.2));

  pdf.setFont("courier", "normal");
  pdf.setFontSize(config.codeSize);
  pdf.setTextColor(107, 107, 107);
  pdf.text(code, contentX, y + config.height - config.pad - 1.4, { maxWidth: textWidth });

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, "PNG", qrX, qrY, config.qr, config.qr);
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
  if (format !== "a4") {
    const config = LABELS[format];
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [config.width, config.height] });
    drawLabel(pdf, item, qrDataUrl, 0, 0, config);
    return pdf.output("blob");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const config = LABELS.standard60;
  const marginX = 8;
  const marginY = 9;
  const gapX = 4;
  const gapY = 5;
  const columns = 3;
  const rows = 8;
  const perPage = columns * rows;
  const safeCopies = Math.max(1, Math.min(80, Math.round(copies || 1)));

  for (let index = 0; index < safeCopies; index += 1) {
    if (index > 0 && index % perPage === 0) pdf.addPage();
    const pageIndex = index % perPage;
    const col = pageIndex % columns;
    const row = Math.floor(pageIndex / columns);
    drawLabel(
      pdf,
      item,
      qrDataUrl,
      marginX + col * (config.width + gapX),
      marginY + row * (config.height + gapY),
      config,
    );
  }

  return pdf.output("blob");
}
