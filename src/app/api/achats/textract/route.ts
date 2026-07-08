import { NextResponse } from "next/server";

import {
  analyzeSupplierInvoiceWithTextract,
  isTextractConfigured,
  TextractServiceError,
} from "@/lib/server/textract-expense";
import {
  type ParsedTextractExpense,
  type TextractAnalyzeExpenseResponse,
  validateTextractInvoiceFile,
} from "@/lib/textract-expense-parser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupplierInvoiceDraft = {
  supplier: {
    name: string;
    address?: string;
  };
  purchaseDate?: string;
  dueDate?: string;
  invoiceNumber: string;
  originalFileName: string;
  totalExcludingTax?: number;
  taxAmount?: number;
  totalIncludingTax?: number;
  status: "brouillon";
  source: "textract";
  textractJson: TextractAnalyzeExpenseResponse;
  lines: Array<{
    itemName: string;
    reference?: string;
    sku?: string;
    quantityPurchased: number;
    unitPurchasePriceExclTax?: number;
    taxRate?: number;
    taxAmount?: number;
    lineTotalExclTax?: number;
    lineTotalInclTax?: number;
  }>;
};

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      code,
      error: message,
      manualEntryAvailable: true,
    },
    { status },
  );
}

function safeOriginalFileName(name: string): string {
  return (
    name
      .replace(/[^\p{L}\p{N}.\-_\s()]/gu, "")
      .trim()
      .slice(0, 120) || "facture-fournisseur"
  );
}

function buildDraft(input: {
  parsed: ParsedTextractExpense;
  rawTextract: TextractAnalyzeExpenseResponse;
  originalFileName: string;
}): SupplierInvoiceDraft {
  return {
    supplier: {
      name: input.parsed.supplier ?? "",
      address: input.parsed.supplierAddress,
    },
    purchaseDate: input.parsed.invoiceDate,
    dueDate: input.parsed.dueDate,
    invoiceNumber: input.parsed.invoiceNumber ?? "",
    originalFileName: input.originalFileName,
    totalExcludingTax: input.parsed.totalExcludingTax,
    taxAmount: input.parsed.taxAmount,
    totalIncludingTax: input.parsed.totalIncludingTax,
    status: "brouillon",
    source: "textract",
    textractJson: input.rawTextract,
    lines: input.parsed.lines.map((line) => ({
      itemName: line.itemName,
      reference: line.reference,
      sku: line.sku,
      quantityPurchased: line.quantityPurchased,
      unitPurchasePriceExclTax: line.unitPurchasePriceExclTax,
      taxRate: line.taxRate,
      taxAmount: line.taxAmount,
      lineTotalExclTax: line.lineTotalExclTax,
      lineTotalInclTax: line.lineTotalInclTax,
    })),
  };
}

export async function POST(request: Request) {
  if (!isTextractConfigured()) {
    return jsonError(
      "aws_not_configured",
      "L'analyse automatique n'est pas configurée côté serveur. Vous pouvez saisir la facture manuellement.",
      503,
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return jsonError("missing_file", "Ajoutez une facture fournisseur PDF, JPG ou PNG.", 400);
  }

  const validation = validateTextractInvoiceFile({ contentType: file.type, size: file.size });
  if (!validation.ok) {
    return jsonError(validation.code, validation.message, validation.status);
  }

  const originalFileName = safeOriginalFileName(file.name);
  const startedAt = Date.now();
  console.info("[behar:textract] Analyse facture fournisseur démarrée", {
    contentType: validation.contentType,
    size: file.size,
  });

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await analyzeSupplierInvoiceWithTextract({ bytes });
    console.info("[behar:textract] Analyse facture fournisseur terminée", {
      durationMs: Date.now() - startedAt,
      lineCount: result.parsed.lines.length,
      hasSupplier: Boolean(result.parsed.supplier),
      hasInvoiceNumber: Boolean(result.parsed.invoiceNumber),
    });

    return NextResponse.json({
      ok: true,
      source: "textract",
      manualEntryAvailable: true,
      parsed: result.parsed,
      rawTextract: result.rawTextract,
      supplierInvoiceDraft: buildDraft({ ...result, originalFileName }),
    });
  } catch (error) {
    if (error instanceof TextractServiceError) {
      return jsonError(error.code, error.message, error.status);
    }
    console.error("[behar:textract] Erreur serveur non attendue", { durationMs: Date.now() - startedAt });
    return jsonError("textract_server_error", "Analyse impossible. Vous pouvez saisir la facture manuellement.", 500);
  }
}
