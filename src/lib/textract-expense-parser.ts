export const MAX_TEXTRACT_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_TEXTRACT_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export type TextractInvoiceFileValidation =
  | { ok: true; contentType: (typeof ALLOWED_TEXTRACT_CONTENT_TYPES)[number] }
  | { ok: false; code: "missing_file" | "unsupported_file_type" | "file_too_large"; message: string; status: number };

export type TextractExpenseDetection = {
  Text?: string;
  Confidence?: number;
};

export type TextractExpenseField = {
  Type?: TextractExpenseDetection;
  LabelDetection?: TextractExpenseDetection;
  ValueDetection?: TextractExpenseDetection;
  GroupProperties?: Array<{ Types?: string[] }>;
};

export type TextractLineItem = {
  LineItemExpenseFields?: TextractExpenseField[];
};

export type TextractLineItemGroup = {
  LineItems?: TextractLineItem[];
};

export type TextractExpenseDocument = {
  SummaryFields?: TextractExpenseField[];
  LineItemGroups?: TextractLineItemGroup[];
};

export type TextractAnalyzeExpenseResponse = {
  ExpenseDocuments?: TextractExpenseDocument[];
  DocumentMetadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ParsedTextractExpenseLine = {
  itemName: string;
  reference?: string;
  sku?: string;
  quantityPurchased: number;
  unitPurchasePriceExclTax?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotalExclTax?: number;
  lineTotalInclTax?: number;
  rawText?: string;
};

export type ParsedTextractExpense = {
  supplier?: string;
  supplierAddress?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalExcludingTax?: number;
  taxAmount?: number;
  totalIncludingTax?: number;
  lines: ParsedTextractExpenseLine[];
};

const SUMMARY_ALIASES = {
  supplier: ["VENDOR_NAME", "SUPPLIER_NAME", "RECEIVER_NAME", "NAME"],
  supplierAddress: ["VENDOR_ADDRESS", "SUPPLIER_ADDRESS", "ADDRESS", "ADDRESS_BLOCK"],
  invoiceNumber: ["INVOICE_RECEIPT_ID", "INVOICE_ID", "INVOICE_NUMBER", "RECEIPT_ID"],
  invoiceDate: ["INVOICE_RECEIPT_DATE", "INVOICE_DATE", "RECEIPT_DATE"],
  dueDate: ["DUE_DATE", "PAYMENT_DUE_DATE"],
  totalExcludingTax: ["SUBTOTAL", "NET_AMOUNT", "TOTAL_HT"],
  taxAmount: ["TAX", "TOTAL_TAX", "VAT", "TVA"],
  totalIncludingTax: ["TOTAL", "AMOUNT_DUE", "INVOICE_TOTAL", "TOTAL_TTC"],
} as const;

const LINE_ALIASES = {
  itemName: ["ITEM", "DESCRIPTION", "PRODUCT_NAME"],
  reference: ["PRODUCT_CODE", "SKU", "REFERENCE", "PART_NUMBER"],
  quantity: ["QUANTITY", "QTY"],
  unitPrice: ["UNIT_PRICE", "PRICE_PER_UNIT"],
  lineTotal: ["PRICE", "AMOUNT", "LINE_TOTAL"],
  tax: ["TAX", "VAT", "TVA"],
  taxRate: ["TAX_RATE", "VAT_RATE", "TVA_RATE"],
} as const;

function normalizeContentType(contentType: string | undefined): string {
  return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

export function validateTextractInvoiceFile(input: {
  contentType?: string;
  size?: number;
}): TextractInvoiceFileValidation {
  const contentType = normalizeContentType(input.contentType);
  if (!contentType || typeof input.size !== "number") {
    return { ok: false, code: "missing_file", message: "Fichier facture manquant.", status: 400 };
  }

  const normalizedContentType = contentType === "image/jpg" ? "image/jpeg" : contentType;
  if (
    !ALLOWED_TEXTRACT_CONTENT_TYPES.includes(normalizedContentType as (typeof ALLOWED_TEXTRACT_CONTENT_TYPES)[number])
  ) {
    return {
      ok: false,
      code: "unsupported_file_type",
      message: "Format non supporté. Importez un PDF, JPG ou PNG.",
      status: 400,
    };
  }

  if (input.size > MAX_TEXTRACT_FILE_BYTES) {
    return {
      ok: false,
      code: "file_too_large",
      message: "Facture trop volumineuse. La limite est de 10 Mo.",
      status: 413,
    };
  }

  return { ok: true, contentType: normalizedContentType as (typeof ALLOWED_TEXTRACT_CONTENT_TYPES)[number] };
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function fieldType(field: TextractExpenseField): string {
  return (field.Type?.Text ?? "").trim().toUpperCase();
}

function fieldValue(field: TextractExpenseField): string | undefined {
  return cleanText(field.ValueDetection?.Text);
}

function labelValue(field: TextractExpenseField): string | undefined {
  return cleanText(field.LabelDetection?.Text);
}

function fieldGroups(field: TextractExpenseField): string[] {
  return (field.GroupProperties ?? [])
    .flatMap((group) => group.Types ?? [])
    .map((type) => type.trim().toUpperCase())
    .filter(Boolean);
}

function pickField(fields: TextractExpenseField[], aliases: readonly string[]): TextractExpenseField | undefined {
  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());
  return fields.find((field) => normalizedAliases.includes(fieldType(field)));
}

function pickSummaryText(fields: TextractExpenseField[], aliases: readonly string[]): string | undefined {
  const exact = pickField(fields, aliases);
  if (exact) return fieldValue(exact);

  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());
  const byLabel = fields.find((field) => {
    const label = (labelValue(field) ?? "").toUpperCase();
    return normalizedAliases.some((alias) => label.includes(alias.replaceAll("_", " ")));
  });
  return byLabel ? fieldValue(byLabel) : undefined;
}

function pickSupplier(fields: TextractExpenseField[]): string | undefined {
  const supplier = fields.find((field) => {
    const groups = fieldGroups(field);
    return fieldType(field) === "VENDOR_NAME" || (fieldType(field) === "NAME" && groups.includes("VENDOR"));
  });
  return supplier ? fieldValue(supplier) : pickSummaryText(fields, SUMMARY_ALIASES.supplier);
}

export function parseMoneyText(value: string | undefined): number | undefined {
  const text = cleanText(value);
  if (!text) return undefined;

  const numeric = text
    .replace(/[^\d,.-]/g, "")
    .replace(/(?!^)-/g, "")
    .trim();
  if (!numeric || numeric === "-") return undefined;

  const commaIndex = numeric.lastIndexOf(",");
  const dotIndex = numeric.lastIndexOf(".");
  let normalized = numeric;

  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = numeric.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (commaIndex >= 0) {
    normalized = numeric.replace(",", ".");
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : undefined;
}

function parseQuantity(value: string | undefined): number | undefined {
  const quantity = parseMoneyText(value);
  if (typeof quantity !== "number" || quantity <= 0) return undefined;
  return quantity;
}

function parsePercentText(value: string | undefined): number | undefined {
  const text = cleanText(value);
  if (!text?.includes("%")) return undefined;
  const percent = parseMoneyText(text);
  return typeof percent === "number" && percent >= 0 ? percent : undefined;
}

export function normalizeInvoiceDate(value: string | undefined): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;

  const frenchDate = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.exec(text);
  if (frenchDate) {
    const year = frenchDate[3].length === 2 ? `20${frenchDate[3]}` : frenchDate[3];
    const month = frenchDate[2].padStart(2, "0");
    const day = frenchDate[1].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return isoDate ? text : text;
}

function detectSku(text: string | undefined): string | undefined {
  const cleaned = cleanText(text);
  if (!cleaned) return undefined;
  const match = /\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+\b/i.exec(cleaned);
  return match?.[0]?.toUpperCase();
}

function collectSummaryFields(raw: TextractAnalyzeExpenseResponse): TextractExpenseField[] {
  return (raw.ExpenseDocuments ?? []).flatMap((document) => document.SummaryFields ?? []);
}

function collectLineItems(raw: TextractAnalyzeExpenseResponse): TextractLineItem[] {
  return (raw.ExpenseDocuments ?? []).flatMap((document) =>
    (document.LineItemGroups ?? []).flatMap((group) => group.LineItems ?? []),
  );
}

function parseLine(lineItem: TextractLineItem): ParsedTextractExpenseLine | undefined {
  const fields = lineItem.LineItemExpenseFields ?? [];
  if (!fields.length) return undefined;

  const itemText = pickSummaryText(fields, LINE_ALIASES.itemName);
  const reference = pickSummaryText(fields, LINE_ALIASES.reference) ?? detectSku(itemText);
  const quantity = parseQuantity(pickSummaryText(fields, LINE_ALIASES.quantity)) ?? 1;
  const unitPrice = parseMoneyText(pickSummaryText(fields, LINE_ALIASES.unitPrice));
  const taxAmount = parseMoneyText(pickSummaryText(fields, LINE_ALIASES.tax));
  const taxRate =
    parsePercentText(pickSummaryText(fields, LINE_ALIASES.taxRate)) ??
    parsePercentText(pickSummaryText(fields, LINE_ALIASES.tax));
  const rawLineTotal = parseMoneyText(pickSummaryText(fields, LINE_ALIASES.lineTotal));
  const computedLineTotal = typeof unitPrice === "number" ? quantity * unitPrice : undefined;
  const lineTotalExclTax =
    typeof rawLineTotal === "number"
      ? rawLineTotal
      : typeof computedLineTotal === "number"
        ? computedLineTotal
        : undefined;

  const rawText = fields.map(fieldValue).filter(Boolean).join(" | ");
  const itemName = itemText ?? reference ?? rawText;
  if (!itemName) return undefined;

  return {
    itemName,
    reference,
    sku: reference,
    quantityPurchased: quantity,
    unitPurchasePriceExclTax: unitPrice,
    taxRate,
    taxAmount,
    lineTotalExclTax,
    lineTotalInclTax:
      typeof lineTotalExclTax === "number" && typeof taxAmount === "number" ? lineTotalExclTax + taxAmount : undefined,
    rawText: rawText || undefined,
  };
}

export function parseTextractExpense(raw: TextractAnalyzeExpenseResponse): ParsedTextractExpense {
  const summaryFields = collectSummaryFields(raw);
  const totalExcludingTax = parseMoneyText(pickSummaryText(summaryFields, SUMMARY_ALIASES.totalExcludingTax));
  const taxAmount = parseMoneyText(pickSummaryText(summaryFields, SUMMARY_ALIASES.taxAmount));
  const totalIncludingTax = parseMoneyText(pickSummaryText(summaryFields, SUMMARY_ALIASES.totalIncludingTax));

  return {
    supplier: pickSupplier(summaryFields),
    supplierAddress: pickSummaryText(summaryFields, SUMMARY_ALIASES.supplierAddress),
    invoiceNumber: pickSummaryText(summaryFields, SUMMARY_ALIASES.invoiceNumber),
    invoiceDate: normalizeInvoiceDate(pickSummaryText(summaryFields, SUMMARY_ALIASES.invoiceDate)),
    dueDate: normalizeInvoiceDate(pickSummaryText(summaryFields, SUMMARY_ALIASES.dueDate)),
    totalExcludingTax,
    taxAmount,
    totalIncludingTax,
    lines: collectLineItems(raw)
      .map(parseLine)
      .filter((line): line is ParsedTextractExpenseLine => Boolean(line)),
  };
}
