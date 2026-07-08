"use client";

import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import {
  ALLOWED_TEXTRACT_CONTENT_TYPES,
  type ParsedTextractExpense,
  type TextractAnalyzeExpenseResponse,
  validateTextractInvoiceFile,
} from "@/lib/textract-expense-parser";
import { formatEuro, type StockItem, useBeharStore } from "@/lib/behar-store";
import { normalizePartReference, stockReferenceMatches } from "@/lib/stock-reference";
import { cn } from "@/lib/utils";

import {
  Panel,
  PrimaryButton,
  SecondaryButton,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
} from "./primitives";

type ImportStep = "upload" | "analyzing" | "invoice" | "lines" | "summary";

type InvoiceForm = {
  supplier: string;
  supplierAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalExcludingTax: string;
  taxAmount: string;
  totalIncludingTax: string;
};

type InvoiceLineForm = {
  id: string;
  rawName: string;
  itemName: string;
  reference: string;
  internalCode: string;
  compatibleModel: string;
  category: string;
  quality: string;
  supplierBrand: string;
  ean: string;
  supplierWarranty: string;
  quantityPurchased: string;
  unitPurchasePriceExclTax: string;
  taxRate: string;
  lineTotalExclTax: string;
};

type TextractImportResponse = {
  ok: boolean;
  error?: string;
  parsed?: ParsedTextractExpense;
  rawTextract?: TextractAnalyzeExpenseResponse;
  supplierInvoiceDraft?: {
    supplier?: { name?: string; address?: string };
    purchaseDate?: string;
    dueDate?: string;
    invoiceNumber?: string;
    totalExcludingTax?: number;
    taxAmount?: number;
    totalIncludingTax?: number;
    textractJson?: TextractAnalyzeExpenseResponse;
    lines?: Array<{
      itemName?: string;
      reference?: string;
      sku?: string;
      quantityPurchased?: number;
      unitPurchasePriceExclTax?: number;
      taxRate?: number;
      taxAmount?: number;
      lineTotalExclTax?: number;
    }>;
  };
};

const EMPTY_INVOICE_FORM: InvoiceForm = {
  supplier: "",
  supplierAddress: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  totalExcludingTax: "",
  taxAmount: "",
  totalIncludingTax: "",
};

function newLine(seed: Partial<InvoiceLineForm> = {}): InvoiceLineForm {
  return {
    id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    rawName: "",
    itemName: "",
    reference: "",
    internalCode: "",
    compatibleModel: "",
    category: "",
    quality: "",
    supplierBrand: "",
    ean: "",
    supplierWarranty: "",
    quantityPurchased: "1",
    unitPurchasePriceExclTax: "",
    taxRate: "",
    lineTotalExclTax: "",
    ...seed,
  };
}

function toField(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value);
}

function toMoney(value: string): number {
  const amount = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function toQuantity(value: string): number {
  const quantity = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function detectSku(text: string): string {
  return /\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+\b/i.exec(text)?.[0]?.toUpperCase() ?? "";
}

function normalizeModelName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+\/\s+/g, "/")
    .trim();
}

function inferIphoneModels(text: string): string[] {
  const match = /\biPhone\s+([0-9A-Za-z\s/]+?)(?=\s*\(|\s+EAN\b|\s+Garantie\b|$)/i.exec(text);
  if (!match?.[1]) return [];
  const rawParts = match[1]
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const models: string[] = [];
  let previousNumber = "";
  for (const part of rawParts) {
    const number = /\b(SE|XR|XS|X|\d{1,2})\b/i.exec(part)?.[1] ?? previousNumber;
    if (number) previousNumber = number;
    const suffix = part.replace(/\b(SE|XR|XS|X|\d{1,2})\b/i, "").trim();
    models.push(normalizeModelName(`iPhone ${number}${suffix ? ` ${suffix}` : ""}`));
  }
  return [...new Set(models)];
}

function inferCompatibleModel(text: string): string {
  const iphoneModels = inferIphoneModels(text);
  if (iphoneModels.length) return iphoneModels.join(", ");
  const match =
    /\b(iPad\s?(?:Pro|Air|Mini)?\s?\d{0,2}|Galaxy\s?[A-Z]?\d{1,3}\s?(?:Ultra|Plus|FE)?|MacBook\s?(?:Air|Pro)?\s?\d{0,2})\b/i.exec(
      text,
    );
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? "";
}

function inferCategory(text: string): string {
  const value = text.toLowerCase();
  if (/(écran|ecran|oled|lcd|vitre avant|display|screen)/i.test(value)) return "Écran";
  if (/(batterie|battery)/i.test(value)) return "Batterie";
  if (/(connecteur|charge|charging|dock)/i.test(value)) return "Connecteur";
  if (/(caméra|camera|photo|lentille)/i.test(value)) return "Caméra";
  if (/(haut.?parleur|speaker|micro|audio|écouteur|ecouteur)/i.test(value)) return "Audio";
  if (/(nappe|flex)/i.test(value)) return "Nappe";
  if (/(vitre arrière|vitre arriere|coque|chassis|châssis|back glass)/i.test(value)) return "Châssis";
  return "";
}

function inferQuality(text: string): string {
  const value = text.toLowerCase();
  if (/\bltps\b/i.test(value)) return "LTPS";
  if (/\bpiec\b/i.test(value)) return "PIEC";
  if (/\bsoft\s*oled\b/i.test(value)) return "Soft OLED";
  if (/\bhard\s*oled\b/i.test(value)) return "Hard OLED";
  if (/\bincell\b/i.test(value)) return "Incell";
  if (/(origine|original|oem)/i.test(value)) return "Origine";
  if (/oled/i.test(value)) return "OLED";
  if (/lcd/i.test(value)) return "LCD";
  if (/premium/i.test(value)) return "Premium";
  if (/(reconditionné|reconditionne|refurb)/i.test(value)) return "Reconditionné";
  if (/(compatible|copy)/i.test(value)) return "Compatible";
  return "";
}

function cleanSupplierPartName(text: string, category: string, _quality: string) {
  const normalized = text
    .replace(/EAN\s*\d+/gi, "")
    .replace(/\/\s*Garantie\s*:?.*$/gi, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\biPhone\s+[0-9A-Za-z\s/]+?(?=\s|$)/gi, "")
    .replace(/\bUTOPYA\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const value = normalized.toLowerCase();
  let base = normalized;
  if (category === "Écran" || /(écran|ecran|display|screen)/i.test(value)) base = "Écran complet";
  if (category === "Caméra" && /lentille/i.test(value)) base = "Lentille caméra";
  else if (category === "Caméra") base = "Caméra";
  if (category === "Batterie") base = "Batterie";
  if (category === "Connecteur") base = "Connecteur de charge";
  if (!base) base = category || "Pièce";
  return base.trim();
}

function extractSupplierEan(text: string) {
  return /\bEAN\s*([0-9]{8,14})\b/i.exec(text)?.[1] ?? "";
}

function extractSupplierWarranty(text: string) {
  return /Garantie\s*:?\s*([^/()]+(?:\([^)]*\))?)/i.exec(text)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function extractSupplierBrand(text: string) {
  const values = Array.from(text.matchAll(/\(([^)]+)\)/g)).map((match) => match[1]?.trim() ?? "");
  return values.find((value) => value && !inferQuality(value) && !/utopya/i.test(value)) ?? "";
}

function isNonStockInvoiceLine(line: Pick<InvoiceLineForm, "itemName" | "reference" | "category">) {
  const value = `${line.itemName} ${line.reference} ${line.category}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  return /\b(chrono relais|chronopost|colissimo|mondial relay|relais colis|livraison|transport|expedition|shipping|delivery|frais de port|port forfait|dhl|ups)\b/.test(
    value,
  );
}

function nextInternalCode(stockItems: StockItem[], usedCodes: Set<string>): string {
  const year = new Date().getFullYear();
  const prefix = `BT-STK-${year}-`;
  const maxExisting = stockItems.reduce((max, item) => {
    const internalCode = item.internalCode ?? "";
    if (!internalCode.startsWith(prefix)) return max;
    const sequence = Number.parseInt(internalCode.slice(prefix.length), 10);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  let next = maxExisting + 1;
  let code = `BT-STK-${year}-${String(next).padStart(4, "0")}`;
  while (usedCodes.has(normalizePartReference(code))) {
    next += 1;
    code = `BT-STK-${year}-${String(next).padStart(4, "0")}`;
  }
  usedCodes.add(normalizePartReference(code));
  return code;
}

function findStockMatch(stockItems: StockItem[], line: InvoiceLineForm): StockItem | undefined {
  const keys = [line.reference, line.internalCode].map(normalizePartReference).filter(Boolean);
  if (!keys.length) return undefined;
  return stockItems.find((item) => keys.some((key) => stockReferenceMatches(item, key)));
}

function FieldLabel({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5 text-[#6B6B6B] text-xs font-medium">
      <span>{label}</span>
      {children}
    </div>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none transition placeholder:text-[#B4B4AE] focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10",
        props.className,
      )}
    />
  );
}

function buildPreviewUrl(file: File | null) {
  if (!file) return "";
  return URL.createObjectURL(file);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export function SupplierInvoiceImportModal({ buttonLabel = "Import facture" }: Readonly<{ buttonLabel?: string }>) {
  const commitSupplierInvoice = useBeharStore((state) => state.commitSupplierInvoice);
  const canManageStock = useBeharStore((state) => state.hasPermission("canManageStock"));
  const stockItems = useBeharStore((state) => state.stockItems);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [invoice, setInvoice] = useState<InvoiceForm>(EMPTY_INVOICE_FORM);
  const [lines, setLines] = useState<InvoiceLineForm[]>([newLine()]);
  const [textractJson, setTextractJson] = useState<TextractAnalyzeExpenseResponse | undefined>();
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const url = buildPreviewUrl(file);
    setPreviewUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (step !== "analyzing") return;
    setProgress(12);
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(88, value + 8));
    }, 420);
    return () => window.clearInterval(timer);
  }, [step]);

  const totals = useMemo(() => {
    const ht = lines.reduce((sum, line) => {
      const explicit = toMoney(line.lineTotalExclTax);
      if (explicit > 0) return sum + explicit;
      return sum + toQuantity(line.quantityPurchased) * toMoney(line.unitPurchasePriceExclTax);
    }, 0);
    const tva = toMoney(invoice.taxAmount);
    const ttc = toMoney(invoice.totalIncludingTax) || ht + tva;
    return { ht, tva, ttc };
  }, [invoice.taxAmount, invoice.totalIncludingTax, lines]);

  const stockPreparations = useMemo(() => {
    const usedCodes = new Set(stockItems.map((item) => normalizePartReference(item.internalCode)).filter(Boolean));
    return lines
      .filter((line) => !isNonStockInvoiceLine(line))
      .map((line) => {
        const rawItemName = (line.rawName || line.itemName).trim();
        const reference = (line.reference.trim() || detectSku(rawItemName)).toUpperCase();
        const existing = findStockMatch(stockItems, { ...line, reference });
        const category =
          line.category.trim() || existing?.categoryName || existing?.category || inferCategory(rawItemName);
        const quality = line.quality.trim() || existing?.quality || inferQuality(`${rawItemName} ${reference}`);
        const itemName = cleanSupplierPartName(rawItemName, category, quality);
        const quantityAdded = toQuantity(line.quantityPurchased);
        const unitPurchasePrice = toMoney(line.unitPurchasePriceExclTax);
        const stockBefore = existing?.stock ?? existing?.quantity ?? 0;
        const stockAfter = stockBefore + quantityAdded;
        const previousAverage = existing?.averagePurchasePrice ?? existing?.purchasePrice ?? 0;
        const averagePurchasePrice =
          stockAfter > 0
            ? roundMoney((previousAverage * stockBefore + unitPurchasePrice * quantityAdded) / stockAfter)
            : unitPurchasePrice;
        const internalCode =
          existing?.internalCode || line.internalCode.trim() || nextInternalCode(stockItems, usedCodes);
        return {
          lineId: line.id,
          itemName,
          reference,
          internalCode,
          compatibleModel:
            line.compatibleModel.trim() || existing?.compatibleModels?.join(", ") || inferCompatibleModel(rawItemName),
          category,
          quality,
          supplier: invoice.supplier.trim(),
          quantityAdded,
          unitPurchasePrice,
          taxRate: line.taxRate.trim() ? toMoney(line.taxRate) : undefined,
          lineTotal: toMoney(line.lineTotalExclTax) || roundMoney(quantityAdded * unitPurchasePrice),
          stockBefore,
          stockAfter,
          previousAverage,
          averagePurchasePrice,
          lastPurchasePrice: unitPurchasePrice,
          totalStockAdded: roundMoney(quantityAdded * unitPurchasePrice),
          existing,
          labelReady: Boolean(itemName && reference && internalCode),
        };
      });
  }, [invoice.supplier, lines, stockItems]);

  const nonStockLines = useMemo(() => lines.filter(isNonStockInvoiceLine), [lines]);

  const stockSummary = useMemo(
    () => ({
      existingCount: stockPreparations.filter((entry) => entry.existing).length,
      newCount: stockPreparations.filter((entry) => !entry.existing).length,
      stockAdded: stockPreparations.reduce((sum, entry) => sum + entry.quantityAdded, 0),
      stockValueAdded: stockPreparations.reduce((sum, entry) => sum + entry.totalStockAdded, 0),
    }),
    [stockPreparations],
  );

  function resetImport() {
    setStep("upload");
    setFile(null);
    setFileDataUrl("");
    setProgress(0);
    setInvoice(EMPTY_INVOICE_FORM);
    setLines([newLine()]);
    setTextractJson(undefined);
    setError("");
  }

  function close() {
    setOpen(false);
    resetImport();
  }

  function applyDraft(response: TextractImportResponse) {
    const draft = response.supplierInvoiceDraft;
    setInvoice({
      supplier: draft?.supplier?.name ?? response.parsed?.supplier ?? "",
      supplierAddress: draft?.supplier?.address ?? response.parsed?.supplierAddress ?? "",
      invoiceNumber: draft?.invoiceNumber ?? response.parsed?.invoiceNumber ?? "",
      invoiceDate: draft?.purchaseDate ?? response.parsed?.invoiceDate ?? "",
      dueDate: draft?.dueDate ?? response.parsed?.dueDate ?? "",
      totalExcludingTax: toField(draft?.totalExcludingTax ?? response.parsed?.totalExcludingTax),
      taxAmount: toField(draft?.taxAmount ?? response.parsed?.taxAmount),
      totalIncludingTax: toField(draft?.totalIncludingTax ?? response.parsed?.totalIncludingTax),
    });
    const parsedLines = (draft?.lines ?? response.parsed?.lines ?? []).map((line) => {
      const rawItemName = line.itemName ?? "";
      const reference = line.reference ?? line.sku ?? detectSku(rawItemName);
      const category = inferCategory(rawItemName);
      const quality = inferQuality(`${rawItemName} ${reference}`);
      return newLine({
        rawName: rawItemName,
        itemName: cleanSupplierPartName(rawItemName, category, quality),
        reference,
        compatibleModel: inferCompatibleModel(rawItemName),
        category,
        quality,
        supplierBrand: extractSupplierBrand(rawItemName),
        ean: extractSupplierEan(rawItemName),
        supplierWarranty: extractSupplierWarranty(rawItemName),
        quantityPurchased: toField(line.quantityPurchased ?? 1),
        unitPurchasePriceExclTax: toField(line.unitPurchasePriceExclTax),
        taxRate: toField(line.taxRate),
        lineTotalExclTax: toField(line.lineTotalExclTax),
      });
    });
    setLines(parsedLines.length ? parsedLines : [newLine()]);
    setTextractJson(response.rawTextract ?? draft?.textractJson);
  }

  async function analyzeFile(selectedFile: File) {
    const validation = validateTextractInvoiceFile({ contentType: selectedFile.type, size: selectedFile.size });
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setFile(selectedFile);
    setFileDataUrl("");
    setError("");
    setStep("analyzing");

    try {
      const originalFileUrl = await fileToDataUrl(selectedFile);
      setFileDataUrl(originalFileUrl);
      const data = new FormData();
      data.append("file", selectedFile);
      const response = await fetch("/api/achats/textract", { method: "POST", body: data });
      const payload = (await response.json().catch(() => ({}))) as TextractImportResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Analyse impossible.");
      }
      applyDraft(payload);
      setProgress(100);
      toast.success("Facture analysée. Vérifiez les informations avant validation.");
      window.setTimeout(() => setStep("invoice"), 250);
    } catch (catchError) {
      const message =
        catchError instanceof Error
          ? catchError.message
          : "L'analyse automatique n'a pas pu lire cette facture. Saisie manuelle disponible.";
      setError(message);
      setInvoice(EMPTY_INVOICE_FORM);
      setLines([newLine()]);
      setTextractJson(undefined);
      setProgress(100);
      toast.error(message);
      window.setTimeout(() => setStep("invoice"), 250);
    }
  }

  function onDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) void analyzeFile(selectedFile);
  }

  function updateLine(id: string, patch: Partial<InvoiceLineForm>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== id) : current));
  }

  function confirmImport() {
    const supplierName = invoice.supplier.trim();
    const invoiceNumber = invoice.invoiceNumber.trim();
    const preparationByLine = new Map(stockPreparations.map((entry) => [entry.lineId, entry]));
    const cleanLines = lines
      .map((line) => {
        const preparation = preparationByLine.get(line.id);
        const nonStockLine = isNonStockInvoiceLine(line);
        const rawName = (line.rawName || line.itemName).trim();
        const category = line.category.trim() || (nonStockLine ? "Livraison" : preparation?.category) || undefined;
        const quality = nonStockLine ? undefined : line.quality.trim() || preparation?.quality || undefined;
        const displayName = nonStockLine
          ? line.itemName.trim()
          : cleanSupplierPartName(rawName, category ?? "", quality ?? "");
        return {
          rawName,
          displayName,
          itemName: displayName,
          reference: nonStockLine
            ? line.reference.trim() || undefined
            : preparation?.reference || line.reference.trim() || undefined,
          sku: nonStockLine
            ? line.reference.trim() || undefined
            : preparation?.reference || line.reference.trim() || undefined,
          internalCode: nonStockLine
            ? line.internalCode.trim() || undefined
            : preparation?.internalCode || line.internalCode.trim() || undefined,
          compatibleModel: nonStockLine
            ? undefined
            : line.compatibleModel.trim() || preparation?.compatibleModel || undefined,
          category,
          quality,
          supplierBrand: nonStockLine
            ? undefined
            : line.supplierBrand.trim() || extractSupplierBrand(rawName) || undefined,
          ean: nonStockLine ? undefined : line.ean.trim() || extractSupplierEan(rawName) || undefined,
          supplierWarranty: nonStockLine
            ? undefined
            : line.supplierWarranty.trim() || extractSupplierWarranty(rawName) || undefined,
          quantityPurchased: toQuantity(line.quantityPurchased),
          unitPurchasePriceExclTax: toMoney(line.unitPurchasePriceExclTax),
          taxRate: line.taxRate.trim() ? toMoney(line.taxRate) : undefined,
          lineTotalExclTax: toMoney(line.lineTotalExclTax),
          createStockItem: !nonStockLine,
        };
      })
      .filter((line) => line.itemName && line.quantityPurchased > 0);

    if (!supplierName) {
      toast.error("Complétez le fournisseur.");
      setStep("invoice");
      return;
    }
    if (!invoiceNumber) {
      toast.error("Complétez le numéro de facture.");
      setStep("invoice");
      return;
    }
    if (!cleanLines.length) {
      toast.error("Ajoutez au moins une ligne d'achat.");
      setStep("lines");
      return;
    }
    if (cleanLines.some((line) => line.createStockItem !== false && line.unitPurchasePriceExclTax <= 0)) {
      toast.error("Complétez les prix d'achat HT.");
      setStep("lines");
      return;
    }

    const invoiceId = commitSupplierInvoice({
      supplier: { name: supplierName, address: invoice.supplierAddress.trim() || undefined },
      purchaseDate: invoice.invoiceDate || undefined,
      invoiceNumber,
      originalFileName: file?.name,
      originalFileUrl: fileDataUrl || previewUrl || undefined,
      totalExcludingTax: toMoney(invoice.totalExcludingTax) || totals.ht,
      taxAmount: toMoney(invoice.taxAmount),
      totalIncludingTax: toMoney(invoice.totalIncludingTax) || totals.ttc,
      status: "reçu",
      source: "textract",
      textractJson,
      lines: cleanLines,
      note: error ? `Import facture fournisseur validé après saisie manuelle : ${error}` : "Import automatique validé.",
    });

    if (!invoiceId) {
      toast.error("Impossible de créer l'achat. Vérifiez les champs obligatoires et vos permissions.");
      return;
    }

    toast.success("Facture fournisseur validée. Stock et mouvements mis à jour.");
    close();
  }

  if (!open) {
    return (
      <PrimaryButton onClick={() => setOpen(true)} disabled={!canManageStock}>
        <UploadCloud className="size-4" />
        {buttonLabel}
      </PrimaryButton>
    );
  }

  const modal = (
    <div
      className="fixed inset-0 isolate z-[130] overflow-y-auto bg-[#1A1916]/24 p-0 md:p-4"
      role="dialog"
      aria-modal="true"
    >
      <Panel className="mx-auto my-0 min-h-svh max-w-none rounded-none bg-[#FAFAF8] p-5 md:my-6 md:max-w-[calc(100vw-3rem)] md:min-h-0 md:rounded-[18px] md:p-6 xl:max-w-7xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#1A1916] text-2xl tracking-tight">Import facture fournisseur</h2>
            <p className="mt-1.5 text-[#6B6B6B] text-sm">
              Transformez une facture fournisseur en achat, lignes de stock et mouvements traçables.
            </p>
          </div>
          <button
            aria-label="Fermer"
            className="rounded-full p-2 text-[#6B6B6B] hover:bg-white"
            onClick={close}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-5 grid gap-2 md:grid-cols-5">
          {[
            ["upload", "Upload"],
            ["analyzing", "Analyse"],
            ["invoice", "Facture"],
            ["lines", "Lignes"],
            ["summary", "Résumé"],
          ].map(([key, label], index) => {
            const active = key === step;
            const done = ["upload", "analyzing", "invoice", "lines", "summary"].indexOf(step) > index;
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-[10px] border px-3 py-2 text-xs font-semibold",
                  active || done
                    ? "border-[#2A9D8F]/30 bg-white text-[#1A1916]"
                    : "border-[#E8E8E5] bg-white/55 text-[#8A8A85]",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[11px]",
                    done ? "bg-[#2A9D8F] text-white" : active ? "bg-[#DDF3EF] text-[#167B70]" : "bg-[#F2F2EF]",
                  )}
                >
                  {done ? <CheckCircle2 className="size-3.5" /> : index + 1}
                </span>
                {label}
              </div>
            );
          })}
        </div>

        {step === "upload" && (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <button
              className="flex min-h-[380px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-[#2A9D8F]/35 border-dashed bg-white p-8 text-center transition hover:border-[#2A9D8F]/60"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              type="button"
            >
              <UploadCloud className="mb-5 size-12 text-[#2A9D8F]" />
              <span className="font-semibold text-[#1A1916] text-lg">Glisser-déposer une facture ici</span>
              <span className="mt-2 max-w-md text-[#6B6B6B] text-sm">
                Formats acceptés : PDF, JPG, PNG. Taille maximale : 10 Mo.
              </span>
              <span className="mt-6 inline-flex h-11 items-center rounded-[12px] bg-[#2A9D8F] px-5 font-semibold text-white">
                Choisir un fichier
              </span>
            </button>
            <input
              ref={fileInputRef}
              accept={ALLOWED_TEXTRACT_CONTENT_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) void analyzeFile(selectedFile);
              }}
              type="file"
            />

            <Panel className="p-5">
              <h3 className="font-semibold text-[#1A1916] text-sm">Comment ça fonctionne ?</h3>
              <ol className="mt-4 space-y-3">
                {[
                  "Importez votre facture fournisseur",
                  "L'IA extrait les informations utiles",
                  "Vérifiez et corrigez les données",
                  "Validez pour créer l'achat et mettre à jour le stock",
                ].map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#EAF6F4] font-semibold text-[#167B70] text-xs">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-[#1A1916]">{item}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-[12px] border border-[#E8E8E5] bg-[#FAFAF8] p-4 text-[#6B6B6B] text-xs leading-5">
                Votre facture reste attachée à l'achat. Les pièces restent traçables depuis leur facture jusqu'à la
                réparation.
              </div>
            </Panel>
          </div>
        )}

        {step === "analyzing" && (
          <div className="grid min-h-[430px] place-items-center rounded-[18px] border border-[#E8E8E5] bg-white p-8 text-center">
            <div className="w-full max-w-md">
              <Loader2 className="mx-auto size-10 animate-spin text-[#2A9D8F]" />
              <h3 className="mt-5 font-semibold text-[#1A1916] text-xl">Analyse du document en cours…</h3>
              <p className="mt-2 text-[#6B6B6B] text-sm">
                L'analyse intelligente extrait les données de votre facture.
              </p>
              <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#E8E8E5]">
                <div
                  className="h-full rounded-full bg-[#2A9D8F] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 font-medium text-[#6B6B6B] text-xs">{progress}%</p>
            </div>
          </div>
        )}

        {(step === "invoice" || step === "lines" || step === "summary") && (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel className="min-h-[560px] overflow-hidden">
              <div className="flex items-center justify-between border-[#E8E8E5] border-b p-4">
                <div>
                  <p className="font-semibold text-[#1A1916] text-sm">Aperçu facture</p>
                  <p className="mt-0.5 text-[#6B6B6B] text-xs">
                    {file ? `${file.name} · ${formatSize(file.size)}` : "Aucun fichier"}
                  </p>
                </div>
                <FileText className="size-5 text-[#2A9D8F]" />
              </div>
              <div className="h-[500px] bg-white p-3">
                {previewUrl && file?.type.startsWith("image/") && (
                  // biome-ignore lint/performance/noImgElement: aperçu local via Object URL, non optimisable par next/image.
                  <img
                    alt="Aperçu facture fournisseur"
                    className="h-full w-full rounded-[12px] object-contain"
                    src={previewUrl}
                  />
                )}
                {previewUrl && file?.type === "application/pdf" && (
                  <object
                    className="h-full w-full rounded-[12px] border border-[#E8E8E5]"
                    data={previewUrl}
                    type="application/pdf"
                  >
                    <p className="p-5 text-[#6B6B6B] text-sm">Aperçu PDF non disponible dans ce navigateur.</p>
                  </object>
                )}
                {!previewUrl && (
                  <div className="grid h-full place-items-center rounded-[12px] border border-[#E8E8E5] bg-[#FAFAF8] text-[#6B6B6B] text-sm">
                    Vous pouvez compléter ou corriger les informations à tout moment.
                  </div>
                )}
              </div>
            </Panel>

            <Panel className="p-4 md:p-5">
              {error && (
                <div className="mb-4 rounded-[12px] border border-[#F2D4D1] bg-white p-3 text-[#B42318] text-sm">
                  {error}
                </div>
              )}

              {step === "invoice" && (
                <div>
                  <h3 className="font-semibold text-[#1A1916] text-lg">Vérification infos facture</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <FieldLabel label="Fournisseur">
                      <TextInput
                        placeholder="À compléter"
                        value={invoice.supplier}
                        onChange={(event) => setInvoice((current) => ({ ...current, supplier: event.target.value }))}
                      />
                    </FieldLabel>
                    <FieldLabel label="Numéro facture">
                      <TextInput
                        placeholder="À compléter"
                        value={invoice.invoiceNumber}
                        onChange={(event) =>
                          setInvoice((current) => ({ ...current, invoiceNumber: event.target.value }))
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="Date facture">
                      <TextInput
                        placeholder="À compléter"
                        type="date"
                        value={invoice.invoiceDate}
                        onChange={(event) => setInvoice((current) => ({ ...current, invoiceDate: event.target.value }))}
                      />
                    </FieldLabel>
                    <FieldLabel label="Échéance">
                      <TextInput
                        placeholder="À compléter"
                        type="date"
                        value={invoice.dueDate}
                        onChange={(event) => setInvoice((current) => ({ ...current, dueDate: event.target.value }))}
                      />
                    </FieldLabel>
                    <FieldLabel label="Total HT">
                      <TextInput
                        inputMode="decimal"
                        placeholder="À compléter"
                        value={invoice.totalExcludingTax}
                        onChange={(event) =>
                          setInvoice((current) => ({ ...current, totalExcludingTax: event.target.value }))
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="TVA">
                      <TextInput
                        inputMode="decimal"
                        placeholder="À compléter"
                        value={invoice.taxAmount}
                        onChange={(event) => setInvoice((current) => ({ ...current, taxAmount: event.target.value }))}
                      />
                    </FieldLabel>
                    <FieldLabel label="Total TTC">
                      <TextInput
                        inputMode="decimal"
                        placeholder="À compléter"
                        value={invoice.totalIncludingTax}
                        onChange={(event) =>
                          setInvoice((current) => ({ ...current, totalIncludingTax: event.target.value }))
                        }
                      />
                    </FieldLabel>
                  </div>
                </div>
              )}

              {step === "lines" && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-[#1A1916] text-lg">Correction lignes</h3>
                    <SecondaryButton className="h-9" onClick={() => setLines((current) => [...current, newLine()])}>
                      <Plus className="size-4" />
                      Ajouter une ligne
                    </SecondaryButton>
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-[14px] border border-[#E8E8E5]">
                    <table className={`${tableClassName} min-w-[1160px]`}>
                      <thead className={tableHeadClassName}>
                        <tr>
                          <th className="px-3 py-3">Désignation</th>
                          <th className="px-3 py-3">Référence / SKU</th>
                          <th className="px-3 py-3">Modèle compatible</th>
                          <th className="px-3 py-3">Catégorie</th>
                          <th className="px-3 py-3">Qualité</th>
                          <th className="px-3 py-3">Qté</th>
                          <th className="px-3 py-3">Prix achat HT</th>
                          <th className="px-3 py-3">TVA</th>
                          <th className="px-3 py-3">Total ligne</th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => (
                          <tr key={line.id}>
                            {(
                              [
                                ["itemName", "À compléter"],
                                ["reference", "SKU"],
                                ["compatibleModel", "Modèle"],
                                ["category", "Catégorie"],
                                ["quality", "Qualité"],
                                ["quantityPurchased", "1"],
                                ["unitPurchasePriceExclTax", "0,00"],
                                ["taxRate", "20"],
                                ["lineTotalExclTax", "0,00"],
                              ] as const
                            ).map(([field, placeholder]) => (
                              <td key={field} className={cn(tableCellClassName, "px-2 py-2")}>
                                <input
                                  className="h-9 w-full min-w-[90px] rounded-[9px] border border-[#E8E8E5] bg-white px-2 text-[#1A1916] text-xs outline-none placeholder:text-[#B4B4AE] focus:border-[#2A9D8F]/60"
                                  placeholder={placeholder}
                                  value={line[field]}
                                  onChange={(event) => updateLine(line.id, { [field]: event.target.value })}
                                />
                              </td>
                            ))}
                            <td className={cn(tableCellClassName, "px-2 py-2 text-right")}>
                              <button
                                aria-label="Supprimer la ligne"
                                className="rounded-full p-1.5 text-[#B4B4AE] hover:bg-[#FBEBEB] hover:text-[#C0392B]"
                                onClick={() => removeLine(line.id)}
                                type="button"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1A1916] text-sm">Préparation stock avant validation</p>
                        <p className="mt-0.5 text-[#6B6B6B] text-xs">
                          Aucune écriture stock n'est faite tant que l'achat n'est pas confirmé. Les frais de livraison
                          sont gardés hors stock.
                        </p>
                      </div>
                      <div className="rounded-full border border-[#D7EFEA] bg-white px-3 py-1 font-semibold text-[#167B70] text-xs">
                        {stockSummary.existingCount} existante(s) · {stockSummary.newCount} nouvelle(s) ·{" "}
                        {nonStockLines.length} hors stock
                      </div>
                    </div>
                    {nonStockLines.length > 0 && (
                      <div className="mb-3 rounded-[14px] border border-[#E8E8E5] bg-white p-4">
                        <p className="font-semibold text-[#1A1916] text-sm">Lignes hors stock</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {nonStockLines.map((line) => (
                            <span
                              key={line.id}
                              className="rounded-full border border-[#E8E8E5] bg-[#FAFAF8] px-3 py-1.5 text-[#6B6B6B] text-xs"
                            >
                              {line.itemName || "Livraison"} ·{" "}
                              {formatEuro(toMoney(line.lineTotalExclTax) || toMoney(line.unitPurchasePriceExclTax))}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid gap-3">
                      {stockPreparations.map((preparation) => (
                        <div key={preparation.lineId} className="rounded-[14px] border border-[#E8E8E5] bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 font-semibold text-[11px]",
                                    preparation.existing
                                      ? "border-[#D7EFEA] text-[#167B70]"
                                      : "border-[#FFE6C7] text-[#936100]",
                                  )}
                                >
                                  {preparation.existing ? "Référence existante" : "Nouvelle pièce"}
                                </span>
                                <span className="font-mono text-[#6B6B6B] text-xs">
                                  {preparation.reference || "Référence à compléter"}
                                </span>
                              </div>
                              <p className="mt-2 font-semibold text-[#1A1916] text-sm">
                                {preparation.itemName || "Nom de pièce à compléter"}
                              </p>
                              <p className="mt-1 text-[#6B6B6B] text-xs">
                                {preparation.compatibleModel || "Modèle à compléter"} ·{" "}
                                {preparation.category || "Catégorie à compléter"} ·{" "}
                                {preparation.quality || "Qualité à compléter"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-[#1A1916] text-xs">{preparation.internalCode}</p>
                              <p className="mt-1 text-[#6B6B6B] text-[11px]">
                                {preparation.labelReady ? "Étiquette prête" : "Étiquette à compléter"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 md:grid-cols-5">
                            {[
                              ["Stock", `${preparation.stockBefore} → ${preparation.stockAfter}`],
                              ["Qté ajoutée", String(preparation.quantityAdded)],
                              ["Dernier prix HT", formatEuro(preparation.lastPurchasePrice)],
                              ["Prix moyen pondéré", formatEuro(preparation.averagePurchasePrice)],
                              ["Valeur ajoutée", formatEuro(preparation.totalStockAdded)],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-[10px] bg-[#FAFAF8] px-3 py-2">
                                <p className="text-[#6B6B6B] text-[11px]">{label}</p>
                                <p className="mt-0.5 font-semibold text-[#1A1916] text-xs">{value}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[#6B6B6B] text-[11px]">
                            Historique prévu : entrée achat fournisseur liée à la facture, visible dans les mouvements
                            et la fiche pièce après validation.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === "summary" && (
                <div>
                  <h3 className="font-semibold text-[#1A1916] text-lg">Résumé</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      ["Fournisseur", invoice.supplier || "À compléter"],
                      ["Facture", invoice.invoiceNumber || "À compléter"],
                      ["Date", invoice.invoiceDate || "À compléter"],
                      ["Montant", formatEuro(toMoney(invoice.totalIncludingTax) || totals.ttc)],
                      ["Lignes", String(lines.filter((line) => line.itemName.trim()).length)],
                      ["Fichier", file?.name || "À compléter"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[12px] border border-[#E8E8E5] bg-white p-3">
                        <p className="text-[#6B6B6B] text-xs">{label}</p>
                        <p className="mt-1 font-semibold text-[#1A1916] text-sm">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-[14px] border border-[#E8E8E5] bg-white p-4">
                    <p className="mb-3 font-semibold text-[#1A1916] text-sm">Impact stock préparé</p>
                    <div className="grid gap-2 md:grid-cols-4">
                      {[
                        ["Références existantes", String(stockSummary.existingCount)],
                        ["Nouvelles pièces", String(stockSummary.newCount)],
                        ["Hors stock", String(nonStockLines.length)],
                        ["Quantité ajoutée", String(stockSummary.stockAdded)],
                        ["Valeur stock ajoutée", formatEuro(stockSummary.stockValueAdded)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[10px] bg-[#FAFAF8] px-3 py-2">
                          <p className="text-[#6B6B6B] text-[11px]">{label}</p>
                          <p className="mt-0.5 font-semibold text-[#1A1916] text-xs">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 max-h-44 overflow-auto rounded-[10px] border border-[#E8E8E5]">
                      <table className={`${tableClassName} min-w-[760px]`}>
                        <thead className={tableHeadClassName}>
                          <tr>
                            <th className="px-3 py-2">Référence</th>
                            <th className="px-3 py-2">Code interne</th>
                            <th className="px-3 py-2">Action</th>
                            <th className="px-3 py-2 text-right">Stock après</th>
                            <th className="px-3 py-2 text-right">Prix moyen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockPreparations.map((preparation) => (
                            <tr key={preparation.lineId}>
                              <td className={cn(tableCellClassName, "px-3 py-2 font-mono text-xs")}>
                                {preparation.reference || "À compléter"}
                              </td>
                              <td className={cn(tableCellClassName, "px-3 py-2 font-mono text-xs")}>
                                {preparation.internalCode}
                              </td>
                              <td className={cn(tableCellClassName, "px-3 py-2 text-xs")}>
                                {preparation.existing ? "Mettre à jour" : "Créer fiche stock + étiquette"}
                              </td>
                              <td className={cn(tableCellClassName, "px-3 py-2 text-right tabular-nums")}>
                                {preparation.stockAfter}
                              </td>
                              <td className={cn(tableCellClassName, "px-3 py-2 text-right tabular-nums")}>
                                {formatEuro(preparation.averagePurchasePrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[14px] border border-[#E8E8E5] bg-white p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6B6B6B]">Total HT lignes</span>
                      <span className="font-semibold text-[#1A1916]">{formatEuro(totals.ht)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-[#6B6B6B]">TVA facture</span>
                      <span className="font-semibold text-[#1A1916]">{formatEuro(totals.tva)}</span>
                    </div>
                    <div className="mt-3 border-[#E8E8E5] border-t pt-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#1A1916]">Total TTC</span>
                      <span className="font-bold text-[#1A1916]">{formatEuro(totals.ttc)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-between gap-2 border-[#E8E8E5] border-t pt-4">
                <SecondaryButton
                  onClick={() => {
                    if (step === "invoice") setStep("upload");
                    if (step === "lines") setStep("invoice");
                    if (step === "summary") setStep("lines");
                  }}
                >
                  <ArrowLeft className="size-4" />
                  Retour
                </SecondaryButton>
                {step !== "summary" ? (
                  <PrimaryButton onClick={() => setStep(step === "invoice" ? "lines" : "summary")}>
                    Continuer
                    <ArrowRight className="size-4" />
                  </PrimaryButton>
                ) : (
                  <PrimaryButton onClick={confirmImport}>
                    <CheckCircle2 className="size-4" />
                    Confirmer et créer l'achat
                  </PrimaryButton>
                )}
              </div>
            </Panel>
          </div>
        )}
      </Panel>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : modal;
}
