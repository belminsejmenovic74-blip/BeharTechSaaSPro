import { describe, expect, it } from "vitest";

import {
  MAX_TEXTRACT_FILE_BYTES,
  normalizeInvoiceDate,
  parseMoneyText,
  parseTextractExpense,
  validateTextractInvoiceFile,
  type TextractAnalyzeExpenseResponse,
} from "@/lib/textract-expense-parser";

describe("Textract expense parser", () => {
  it("extrait les champs facture et les lignes produits depuis AnalyzeExpense", () => {
    const raw: TextractAnalyzeExpenseResponse = {
      ExpenseDocuments: [
        {
          SummaryFields: [
            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: "Grossiste Pro" } },
            { Type: { Text: "VENDOR_ADDRESS" }, ValueDetection: { Text: "10 rue des Fournisseurs, Paris" } },
            { Type: { Text: "INVOICE_RECEIPT_ID" }, ValueDetection: { Text: "FP-2026-001" } },
            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "08/07/2026" } },
            { Type: { Text: "DUE_DATE" }, ValueDetection: { Text: "31/07/2026" } },
            { Type: { Text: "SUBTOTAL" }, ValueDetection: { Text: "1 200,00 €" } },
            { Type: { Text: "TAX" }, ValueDetection: { Text: "240,00 €" } },
            { Type: { Text: "TOTAL" }, ValueDetection: { Text: "1 440,00 €" } },
          ],
          LineItemGroups: [
            {
              LineItems: [
                {
                  LineItemExpenseFields: [
                    { Type: { Text: "ITEM" }, ValueDetection: { Text: "Écran iPhone 14 Pro OLED" } },
                    { Type: { Text: "PRODUCT_CODE" }, ValueDetection: { Text: "IP14P-OLED" } },
                    { Type: { Text: "QUANTITY" }, ValueDetection: { Text: "3" } },
                    { Type: { Text: "UNIT_PRICE" }, ValueDetection: { Text: "80,00" } },
                    { Type: { Text: "PRICE" }, ValueDetection: { Text: "240,00" } },
                    { Type: { Text: "TAX_RATE" }, ValueDetection: { Text: "20%" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const parsed = parseTextractExpense(raw);

    expect(parsed.supplier).toBe("Grossiste Pro");
    expect(parsed.supplierAddress).toContain("Paris");
    expect(parsed.invoiceNumber).toBe("FP-2026-001");
    expect(parsed.invoiceDate).toBe("2026-07-08");
    expect(parsed.dueDate).toBe("2026-07-31");
    expect(parsed.totalExcludingTax).toBe(1200);
    expect(parsed.taxAmount).toBe(240);
    expect(parsed.totalIncludingTax).toBe(1440);
    expect(parsed.lines[0]).toMatchObject({
      itemName: "Écran iPhone 14 Pro OLED",
      reference: "IP14P-OLED",
      sku: "IP14P-OLED",
      quantityPurchased: 3,
      unitPurchasePriceExclTax: 80,
      lineTotalExclTax: 240,
      taxRate: 20,
    });
  });

  it("normalise les montants européens et les dates facture", () => {
    expect(parseMoneyText("1.234,56 €")).toBe(1234.56);
    expect(parseMoneyText("1,234.56 EUR")).toBe(1234.56);
    expect(normalizeInvoiceDate("7-8-26")).toBe("2026-08-07");
  });

  it("valide le type et la taille maximale avant appel backend", () => {
    expect(validateTextractInvoiceFile({ contentType: "application/pdf", size: 100 }).ok).toBe(true);
    expect(validateTextractInvoiceFile({ contentType: "image/jpg", size: 100 }).ok).toBe(true);
    expect(validateTextractInvoiceFile({ contentType: "text/plain", size: 100 })).toMatchObject({
      ok: false,
      code: "unsupported_file_type",
    });
    expect(
      validateTextractInvoiceFile({ contentType: "application/pdf", size: MAX_TEXTRACT_FILE_BYTES + 1 }),
    ).toMatchObject({
      ok: false,
      code: "file_too_large",
      status: 413,
    });
  });
});
