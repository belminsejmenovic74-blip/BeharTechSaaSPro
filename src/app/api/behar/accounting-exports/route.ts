import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ACCOUNTING_EXPORT_FORMATS,
  nativeAccountingExportProvider,
  type AccountingExportFilters,
  type AccountingExportFormat,
  type AccountingExportSource,
  type AccountingShop,
} from "@/lib/accounting-export/core";
import { createAccountingCsv, createAccountingWorkbook } from "@/lib/accounting-export/serializers";
import { createZip, type ZipEntry } from "@/lib/accounting-export/zip";
import type { StoreState, WorkshopSettings } from "@/lib/behar-store";
import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPORT_BUCKET = "accounting-exports";
const PDF_BUCKET = "repair-documents";
const MAX_EXPORT_BYTES = 60 * 1024 * 1024;
const MAX_PDF_TOTAL_BYTES = 50 * 1024 * 1024;

const baseSchema = z.object({
  workshopId: z.string().uuid(),
  licenseKey: z.string().trim().min(6).max(100),
});

const filtersSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    shopId: z.string().trim().min(1).max(100),
    vatRate: z.union([z.literal("all"), z.number().min(0).max(100)]),
  })
  .refine((filters) => filters.startDate <= filters.endDate, {
    message: "La date de début doit précéder la date de fin.",
  });

const requestSchema = z.discriminatedUnion("operation", [
  baseSchema.extend({ operation: z.literal("preview"), filters: filtersSchema }).strict(),
  baseSchema
    .extend({
      operation: z.literal("generate"),
      filters: filtersSchema,
      format: z.enum(ACCOUNTING_EXPORT_FORMATS),
      actorName: z.string().trim().min(1).max(120),
    })
    .strict(),
  baseSchema.extend({ operation: z.literal("history") }).strict(),
  baseSchema.extend({ operation: z.literal("download"), exportId: z.string().uuid() }).strict(),
]);

type ShopRow = {
  id: string;
  public_shop_id: string;
  internal_name: string;
  commercial_name: string | null;
  timezone: string;
};

function errorResponse(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: code, message, details }, { status });
}

function fileMetadata(format: AccountingExportFormat, period: string) {
  if (format === "xlsx") {
    return {
      fileName: `export-comptable-${period}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  if (format === "zip") {
    return { fileName: `export-comptable-${period}.zip`, mimeType: "application/zip" };
  }
  return { fileName: `factures-pour-comptable-${period}.csv`, mimeType: "text/csv; charset=utf-8" };
}

function contentDisposition(fileName: string) {
  return `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function storagePathFromDocument(line: { pdfStoragePath?: string; pdfUrl?: string }): string | null {
  if (line.pdfStoragePath) return line.pdfStoragePath.replace(/^\/+/, "");
  if (!line.pdfUrl) return null;
  const marker = `/storage/v1/object/public/${PDF_BUCKET}/`;
  try {
    const url = new URL(line.pdfUrl);
    const index = url.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(url.pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

async function loadSource(
  admin: Exclude<Awaited<ReturnType<typeof authorizeWorkshopLicense>>, Response>["admin"],
  workshopId: string,
) {
  const [snapshotResult, shopResult] = await Promise.all([
    admin.from("workshop_snapshots").select("state").eq("workshop_id", workshopId).maybeSingle(),
    admin
      .from("shops")
      .select("id,public_shop_id,internal_name,commercial_name,timezone")
      .eq("tenant_id", workshopId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);
  if (snapshotResult.error || !snapshotResult.data?.state) throw new Error("Données atelier indisponibles.");
  if (shopResult.error) throw new Error("Boutiques indisponibles.");
  const state = snapshotResult.data.state as Partial<StoreState>;
  const shopRows = (shopResult.data || []) as ShopRow[];
  const knownShops = new Map<string, AccountingShop>();
  for (const shop of shopRows) {
    knownShops.set(shop.public_shop_id, {
      id: shop.public_shop_id,
      name: shop.commercial_name || shop.internal_name,
      timezone: shop.timezone,
    });
  }
  const invoiceShopIds = new Set((state.invoices || []).map((invoice) => invoice.shopId).filter(Boolean));
  if (shopRows.length === 1) {
    const onlyShop = shopRows[0];
    for (const invoiceShopId of invoiceShopIds) {
      if (!knownShops.has(invoiceShopId)) {
        knownShops.set(invoiceShopId, {
          id: invoiceShopId,
          name: onlyShop.commercial_name || onlyShop.internal_name,
          timezone: onlyShop.timezone,
        });
      }
    }
    if (invoiceShopIds.size > 0 && !invoiceShopIds.has(onlyShop.public_shop_id)) {
      knownShops.delete(onlyShop.public_shop_id);
    }
  }
  const fallbackSettings = (state.workshopSettings || state.workshopInfo || {}) as WorkshopSettings;
  const source: AccountingExportSource = {
    invoices: state.invoices || [],
    customers: state.customers || [],
    repairs: state.repairs || [],
    documents: state.documents || [],
    shops: [...knownShops.values()],
    workshopSettings: fallbackSettings,
  };
  return { source, shopRows };
}

function resolveDatabaseShopId(shopRows: ShopRow[], requestedShopId: string): string | null {
  if (requestedShopId === "all") return null;
  const row = shopRows.find((shop) => shop.id === requestedShopId || shop.public_shop_id === requestedShopId);
  if (row) return row.id;
  return shopRows.length === 1 ? shopRows[0].id : "";
}

async function accountingAuthorization(workshopId: string, licenseKey: string) {
  const auth = await authorizeWorkshopLicense(workshopId, licenseKey);
  if (auth instanceof Response) return auth;
  if (!auth.session || !["owner", "admin"].includes(auth.session.role)) {
    return errorResponse(
      "insufficient_permissions",
      "L'export des factures est réservé au gérant ou à un administrateur.",
      403,
    );
  }
  return auth;
}

async function createZipExport(
  prepared: ReturnType<typeof nativeAccountingExportProvider.prepare>,
  admin: Exclude<Awaited<ReturnType<typeof authorizeWorkshopLicense>>, Response>["admin"],
): Promise<Buffer> {
  const missing = prepared.lines.filter((line) => !storagePathFromDocument(line));
  if (missing.length) {
    throw new ExportProblem(
      "missing_pdf",
      `PDF manquant pour ${missing.length} facture(s). Publiez-les avant de créer l'archive.`,
      422,
      missing.map((line) => line.invoiceNumber),
    );
  }
  const entries: ZipEntry[] = [{ name: "factures.csv", data: createAccountingCsv(prepared) }];
  let pdfBytes = 0;
  for (const line of prepared.lines) {
    const path = storagePathFromDocument(line);
    if (!path) continue;
    const { data, error } = await admin.storage.from(PDF_BUCKET).download(path);
    if (error || !data) {
      throw new ExportProblem("missing_pdf", `Le PDF de ${line.invoiceNumber} est indisponible.`, 422, [
        line.invoiceNumber,
      ]);
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    pdfBytes += buffer.length;
    if (pdfBytes > MAX_PDF_TOTAL_BYTES) {
      throw new ExportProblem("export_too_large", "Les PDF sélectionnés dépassent la limite de 50 Mo.", 413);
    }
    entries.push({ name: `factures/facture-${line.invoiceNumber}.pdf`, data: buffer });
  }
  return createZip(entries);
}

class ExportProblem extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return errorResponse("invalid_request", "Paramètres d'export invalides.", 400, parsed.error.flatten());
    const auth = await accountingAuthorization(parsed.data.workshopId, parsed.data.licenseKey);
    if (auth instanceof Response) return auth;
    const { admin, workshopId, session } = auth;
    if (!session) {
      return errorResponse("insufficient_permissions", "Session administrateur requise.", 403);
    }

    if (parsed.data.operation === "history") {
      const { data, error } = await admin
        .from("accounting_exports")
        .select(
          "id,shop_id,period_start,period_end,generated_by_name,file_type,file_name,file_size_bytes,invoice_count,warnings,created_at",
        )
        .eq("workshop_id", workshopId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return errorResponse("history_unavailable", "Historique momentanément indisponible.", 503);
      const { data: shops } = await admin
        .from("shops")
        .select("id,internal_name,commercial_name")
        .eq("tenant_id", workshopId);
      const names = new Map((shops || []).map((shop) => [shop.id, shop.commercial_name || shop.internal_name]));
      return NextResponse.json({
        exports: (data || []).map((entry) => ({
          ...entry,
          shop_name: entry.shop_id ? names.get(entry.shop_id) || "Boutique" : "Toutes les boutiques",
        })),
      });
    }

    if (parsed.data.operation === "download") {
      const { data: history, error } = await admin
        .from("accounting_exports")
        .select("storage_path,file_name,mime_type")
        .eq("id", parsed.data.exportId)
        .eq("workshop_id", workshopId)
        .maybeSingle();
      if (error || !history) return errorResponse("export_not_found", "Export introuvable ou non autorisé.", 404);
      const downloaded = await admin.storage.from(EXPORT_BUCKET).download(history.storage_path);
      if (downloaded.error || !downloaded.data) {
        return errorResponse("export_file_missing", "Le fichier archivé n'est plus disponible.", 404);
      }
      return new Response(await downloaded.data.arrayBuffer(), {
        headers: {
          "Content-Type": history.mime_type,
          "Content-Disposition": contentDisposition(history.file_name),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const { source, shopRows } = await loadSource(admin, workshopId);
    const requestedShop = resolveDatabaseShopId(shopRows, parsed.data.filters.shopId);
    if (requestedShop === "") {
      return errorResponse("shop_forbidden", "Cette boutique n'appartient pas à votre organisation.", 403);
    }
    const prepared = nativeAccountingExportProvider.prepare(source, parsed.data.filters as AccountingExportFilters);
    if (parsed.data.operation === "preview") {
      return NextResponse.json({
        ...prepared,
        lines: prepared.lines.map(({ pdfUrl: _pdfUrl, pdfStoragePath: _pdfStoragePath, ...line }) => line),
        shops: source.shops,
      });
    }
    if (!prepared.lines.length) {
      return errorResponse("no_invoices", "Aucune facture validée ne correspond à cette période.", 422);
    }
    const inconsistent = prepared.warnings.filter((warning) => warning.code === "inconsistent_amount");
    if (inconsistent.length) {
      return errorResponse(
        "inconsistent_amount",
        "Corrigez les montants incohérents avant de lancer l'export.",
        422,
        inconsistent,
      );
    }

    let buffer: Buffer;
    if (parsed.data.format === "xlsx") buffer = createAccountingWorkbook(prepared);
    else if (parsed.data.format === "zip") buffer = await createZipExport(prepared, admin);
    else buffer = createAccountingCsv(prepared);
    if (buffer.length > MAX_EXPORT_BYTES) {
      return errorResponse("export_too_large", "L'export dépasse la limite de 60 Mo. Réduisez la période.", 413);
    }

    const period = `${parsed.data.filters.startDate}_${parsed.data.filters.endDate}`;
    const metadata = fileMetadata(parsed.data.format, period);
    const exportId = randomUUID();
    const storagePath = `${workshopId}/${new Date().toISOString().slice(0, 10)}/${exportId}-${metadata.fileName}`;
    const upload = await admin.storage.from(EXPORT_BUCKET).upload(storagePath, buffer, {
      contentType: metadata.mimeType.split(";")[0],
      upsert: false,
    });
    if (upload.error) return errorResponse("storage_failed", "Enregistrement sécurisé de l'export impossible.", 503);
    const history = await admin.from("accounting_exports").insert({
      id: exportId,
      workshop_id: workshopId,
      shop_id: requestedShop,
      period_start: parsed.data.filters.startDate,
      period_end: parsed.data.filters.endDate,
      generated_by: session.userId,
      generated_by_name: parsed.data.actorName,
      file_type: parsed.data.format,
      storage_path: storagePath,
      file_name: metadata.fileName,
      mime_type: metadata.mimeType,
      file_size_bytes: buffer.length,
      checksum_sha256: createHash("sha256").update(buffer).digest("hex"),
      invoice_count: prepared.summary.invoiceCount,
      filters: parsed.data.filters,
      warnings: prepared.warnings,
    });
    if (history.error) {
      await admin.storage.from(EXPORT_BUCKET).remove([storagePath]);
      return errorResponse("history_failed", "Historique de l'export impossible à enregistrer.", 503);
    }
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": metadata.mimeType,
        "Content-Disposition": contentDisposition(metadata.fileName),
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Accounting-Export-Id": exportId,
      },
    });
  } catch (error) {
    if (error instanceof ExportProblem) return errorResponse(error.code, error.message, error.status, error.details);
    console.error("[accounting-export] unexpected error", error);
    return errorResponse("export_failed", "L'export des factures n'a pas pu être généré.", 500);
  }
}
