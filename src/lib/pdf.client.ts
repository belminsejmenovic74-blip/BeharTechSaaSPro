"use client";

import type { Customer, Invoice, Payment, Quote, Repair, WorkshopInfo } from "@/lib/behar-store";
import { formatEuro, getInvoiceTotal, getQuoteTotal } from "@/lib/behar-store";

type PdfSection = {
  title?: string;
  lines: string[];
};

const clean = (value: string | number | undefined) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/€/g, "EUR")
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

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function workshopLines(workshop: WorkshopInfo) {
  return [
    workshop.brand,
    workshop.name,
    workshop.address,
    `${workshop.postalCity}, ${workshop.country}`,
    workshop.email,
    workshop.phone,
    `SIRET : ${workshop.siret}`,
    workshop.isMicroEnterprise
      ? workshop.tvaMention || "TVA non applicable — art. 293 B du CGI"
      : workshop.tvaMention || "",
  ];
}

export function downloadQuotePdf(workshop: WorkshopInfo, quote: Quote, customer: Customer, repair?: Repair) {
  const lines = quote.lines.map(
    (line) => `${line.description} | qte ${line.quantity} | ${formatEuro(line.quantity * line.unitPrice)}`,
  );
  downloadSimplePdf(`devis-${quote.number}.pdf`, `Devis ${quote.number}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    {
      title: "Client",
      lines: [customer.name, customer.phone, customer.email, repair?.device ?? customer.device, repair?.issue ?? ""],
    },
    { title: "Lignes", lines },
    {
      title: "Total",
      lines: [
        `Total TTC : ${formatEuro(getQuoteTotal(quote))}`,
        quote.notes || "",
        workshop.quoteTerms || "",
        workshop.defaultWarranty || "",
      ],
    },
  ]);
}

export function downloadInvoicePdf(workshop: WorkshopInfo, invoice: Invoice, customer: Customer, repair?: Repair) {
  const lines = invoice.lines.map(
    (line) => `${line.description} | qte ${line.quantity} | ${formatEuro(line.quantity * line.unitPrice)}`,
  );
  downloadSimplePdf(`facture-${invoice.number}.pdf`, `Facture ${invoice.number}`, [
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
        `Total TTC : ${formatEuro(getInvoiceTotal(invoice))}`,
        workshop.invoiceTerms || "",
      ],
    },
  ]);
}

export function downloadReceiptPdf(workshop: WorkshopInfo, payment: Payment, customer: Customer) {
  downloadSimplePdf(`recu-${payment.reference}.pdf`, `Recu ${payment.reference}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    { title: "Client", lines: [customer.name, customer.phone, customer.email] },
    {
      title: "Paiement",
      lines: [payment.date, payment.mode, payment.status, `Montant : ${formatEuro(payment.amount)}`],
    },
  ]);
}

export function downloadRepairIntakePdf(workshop: WorkshopInfo, repair: Repair, customer?: Customer) {
  downloadSimplePdf(`prise-en-charge-${repair.number}.pdf`, `Bon de prise en charge ${repair.number}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    { title: "Client", lines: [customer?.name ?? "Client a renseigner", customer?.phone ?? "", customer?.email ?? ""] },
    {
      title: "Appareil",
      lines: [repair.device, repair.issue, `IMEI : ${repair.imei}`, `Statut : ${repair.status}`, repair.notes],
    },
  ]);
}

export function downloadInternalRepairPdf(workshop: WorkshopInfo, repair: Repair, customer?: Customer) {
  downloadSimplePdf(`fiche-interne-${repair.number}.pdf`, `Fiche intervention interne ${repair.number}`, [
    { title: "Atelier", lines: workshopLines(workshop) },
    { title: "Client", lines: [customer?.name ?? "Client a renseigner", repair.device, repair.issue] },
    {
      title: "Pieces et marge",
      lines: repair.parts.length
        ? repair.parts.map(
            (part) =>
              `${part.name} ${part.reference} | achat ${formatEuro(part.purchasePrice)} | vente ${formatEuro(
                part.salePrice,
              )} | marge ${formatEuro(part.salePrice - part.purchasePrice)}`,
          )
        : ["Aucune piece utilisee"],
    },
  ]);
}
