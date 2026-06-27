"use client";

import type { Customer, Invoice, Payment, Quote, Repair, WorkshopInfo } from "@/lib/behar-store";
import { formatCurrency, getInvoiceTotal, getQuoteTotal, getWorkshopCountryLabel } from "@/lib/behar-store";
import { downloadPdfFile } from "@/lib/download-file.client";
import { getDocumentFilename } from "@/lib/workshop-country";

type PdfSection = {
  title?: string;
  lines: string[];
};

const clean = (value: string | number | undefined) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u20AC/g, "EUR")
    .replace(/[•]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();

const escapePdf = (value: string) => clean(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function downloadSimplePdf(filename: string, title: string, sections: PdfSection[]) {
  if (typeof window === "undefined") return;

  const content: string[] = ["BT", "/F1 20 Tf", "50 790 Td", `(${escapePdf(title)}) Tj`, "/F1 10 Tf", "0 -28 Td"];

  for (const section of sections) {
    if (section.title) {
      content.push("/F1 13 Tf", `(${escapePdf(section.title)}) Tj`, "/F1 10 Tf", "0 -18 Td");
    }
    for (const line of section.lines) {
      const chunks = clean(line).match(/.{1,88}(\s|$)|.{1,88}/g) ?? [line];
      for (const chunk of chunks) {
        content.push(`(${escapePdf(chunk)}) Tj`, "0 -14 Td");
      }
    }
    content.push("0 -10 Td");
  }
  content.push("ET");

  const stream = content.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;

  downloadPdfFile(new Blob([pdf], { type: "application/pdf" }), filename);
}

function workshopLines(workshop: WorkshopInfo) {
  return [
    workshop.brand,
    workshop.name,
    workshop.address,
    `${workshop.postalCity}, ${getWorkshopCountryLabel(workshop.country)}`,
    workshop.email,
    workshop.phone,
    workshop.country === "CH" ? (workshop.swissUid ? `IDE / CHE : ${workshop.swissUid}` : "") : `SIRET : ${workshop.siret}`,
    workshop.country === "CH" && workshop.swissCanton ? `Canton : ${workshop.swissCanton}` : "",
    workshop.country === "CH" && workshop.vatApplicable && workshop.swissVatNumber
      ? `N TVA suisse : ${workshop.swissVatNumber}`
      : "",
    workshop.isMicroEnterprise
      ? workshop.tvaMention || "TVA non applicable — art. 293 B du CGI"
      : workshop.tvaMention || "",
  ];
}

export function downloadQuotePdf(workshop: WorkshopInfo, quote: Quote, customer: Customer, repair?: Repair) {
  const lines = quote.lines.map(
    (line) => `${line.description} | qte ${line.quantity} | ${formatCurrency(line.quantity * line.unitPrice, quote.currency ?? workshop.currency)}`,
  );
  downloadSimplePdf(getDocumentFilename("quote", quote.number), `Devis ${quote.number}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    {
      title: "Client",
      lines: [customer.name, customer.phone, customer.email, repair?.device ?? customer.device, repair?.issue ?? ""],
    },
    { title: "Lignes", lines },
    {
      title: "Total",
      lines: [
        `${workshop.vatApplicable ? "Total a payer" : "Total"} : ${formatCurrency(getQuoteTotal(quote), quote.currency ?? workshop.currency)}`,
        quote.notes || "",
        workshop.quoteTerms || "",
        workshop.defaultWarranty || "",
      ],
    },
  ]);
}

export function downloadInvoicePdf(workshop: WorkshopInfo, invoice: Invoice, customer: Customer, repair?: Repair) {
  const lines = invoice.lines.map(
    (line) => `${line.description} | qte ${line.quantity} | ${formatCurrency(line.quantity * line.unitPrice, invoice.currency ?? workshop.currency)}`,
  );
  downloadSimplePdf(getDocumentFilename("invoice", invoice.number), `Facture ${invoice.number}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    {
      title: "Client",
      lines: [customer.name, customer.phone, customer.email, repair?.device ?? customer.device, repair?.issue ?? ""],
    },
    { title: "Lignes", lines },
    {
      title: "Paiement",
      lines: [
        invoice.status,
        invoice.paymentMethod,
        `Total a payer : ${formatCurrency(getInvoiceTotal(invoice), invoice.currency ?? workshop.currency)}`,
        workshop.invoiceTerms || "",
      ],
    },
  ]);
}

export function downloadReceiptPdf(workshop: WorkshopInfo, payment: Payment, customer: Customer) {
  downloadSimplePdf(getDocumentFilename("payment", payment.paymentNumber || payment.reference), `Confirmation de règlement ${payment.reference}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    { title: "Client", lines: [customer.name, customer.phone, customer.email] },
    {
      title: "Paiement",
      lines: [
        payment.date,
        payment.method === "TWINT" ? "Paye par TWINT" : payment.mode,
        payment.twintReference ? `Reference TWINT : ${payment.twintReference}` : "",
        payment.status,
        `Montant : ${formatCurrency(payment.amount, payment.currency ?? workshop.currency)}`,
      ],
    },
  ]);
}

export function downloadRepairIntakePdf(workshop: WorkshopInfo, repair: Repair, customer?: Customer) {
  downloadSimplePdf(getDocumentFilename("intake", repair.number), `Bon de prise en charge ${repair.number}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    { title: "Client", lines: [customer?.name ?? "Client a renseigner", customer?.phone ?? "", customer?.email ?? ""] },
    {
      title: "Appareil",
      lines: [repair.device, repair.issue, `IMEI : ${repair.imei}`, `Statut : ${repair.status}`, repair.notes],
    },
  ]);
}

export function downloadInternalRepairPdf(workshop: WorkshopInfo, repair: Repair, customer?: Customer) {
  downloadSimplePdf(getDocumentFilename("internal", repair.number), `Fiche intervention interne ${repair.number}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    { title: "Client", lines: [customer?.name ?? "Client a renseigner", repair.device, repair.issue] },
    {
      title: "Pieces et marge",
      lines: repair.parts.length
        ? repair.parts.map(
            (part) =>
              `${part.name} ${part.reference} | achat ${formatCurrency(part.purchasePrice, repair.currency ?? workshop.currency)} | vente ${formatCurrency(
                part.salePrice,
                repair.currency ?? workshop.currency,
              )} | marge ${formatCurrency(part.salePrice - part.purchasePrice, repair.currency ?? workshop.currency)}`,
          )
        : ["Aucune piece utilisee"],
    },
  ]);
}
