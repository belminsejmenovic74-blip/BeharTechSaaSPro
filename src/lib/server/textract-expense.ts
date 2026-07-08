// biome-ignore lint/correctness/noUndeclaredDependencies: Next.js exposes this marker for server-only modules.
import "server-only";

import { createHash, createHmac } from "node:crypto";

import {
  parseTextractExpense,
  type ParsedTextractExpense,
  type TextractAnalyzeExpenseResponse,
} from "@/lib/textract-expense-parser";

const TEXTRACT_TARGET = "Textract.AnalyzeExpense";
const TEXTRACT_SERVICE = "textract";
const AWS_JSON_CONTENT_TYPE = "application/x-amz-json-1.1";
const DEFAULT_TIMEOUT_MS = 25_000;

export type TextractExpenseAnalysis = {
  parsed: ParsedTextractExpense;
  rawTextract: TextractAnalyzeExpenseResponse;
};

type AwsTextractConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export class TextractServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "TextractServiceError";
    this.code = code;
    this.status = status;
  }
}

function getTextractConfig(): AwsTextractConfig | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = process.env.AWS_REGION?.trim();

  if (!accessKeyId || !secretAccessKey || !region) return null;
  return { accessKeyId, secretAccessKey, region };
}

export function isTextractConfigured(): boolean {
  return Boolean(getTextractConfig());
}

function hashHex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function toAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, region: string): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, TEXTRACT_SERVICE);
  return hmac(dateRegionServiceKey, "aws4_request");
}

function buildSignedHeaders(input: { config: AwsTextractConfig; host: string; payload: string; now: Date }): Headers {
  const { amzDate, dateStamp } = toAmzDate(input.now);
  const credentialScope = `${dateStamp}/${input.config.region}/${TEXTRACT_SERVICE}/aws4_request`;
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const canonicalHeaders =
    `content-type:${AWS_JSON_CONTENT_TYPE}\n` +
    `host:${input.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TEXTRACT_TARGET}\n`;
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, hashHex(input.payload)].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", getSignatureKey(input.config.secretAccessKey, dateStamp, input.config.region))
    .update(stringToSign, "utf8")
    .digest("hex");

  return new Headers({
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${input.config.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "Content-Type": AWS_JSON_CONTENT_TYPE,
    "X-Amz-Date": amzDate,
    "X-Amz-Target": TEXTRACT_TARGET,
  });
}

function extractAwsErrorCode(body: unknown): string {
  if (!body || typeof body !== "object") return "textract_error";
  const record = body as Record<string, unknown>;
  const rawType = typeof record.__type === "string" ? record.__type : undefined;
  const rawCode = typeof record.code === "string" ? record.code : undefined;
  return (rawType ?? rawCode ?? "textract_error").split("#").pop() ?? "textract_error";
}

function mapAwsStatus(code: string, fallbackStatus: number): number {
  if (["BadDocumentException", "InvalidParameterException", "UnsupportedDocumentException"].includes(code)) return 400;
  if (code === "DocumentTooLargeException") return 413;
  if (["AccessDeniedException", "InvalidSignatureException", "UnrecognizedClientException"].includes(code)) return 503;
  if (["ProvisionedThroughputExceededException", "ThrottlingException", "TooManyRequestsException"].includes(code)) {
    return 503;
  }
  return fallbackStatus >= 400 ? fallbackStatus : 502;
}

function mapAwsMessage(code: string): string {
  if (code === "UnsupportedDocumentException") return "Format de document non supporté.";
  if (code === "BadDocumentException") return "L'analyse automatique n'a pas pu lire cette facture.";
  if (code === "DocumentTooLargeException") return "Facture trop volumineuse pour l'analyse automatique.";
  if (code === "AccessDeniedException") return "L'analyse automatique n'est pas autorisée côté serveur.";
  if (code === "ProvisionedThroughputExceededException" || code === "ThrottlingException") {
    return "L'analyse automatique est temporairement indisponible. Réessayez dans quelques instants.";
  }
  return "Analyse automatique impossible pour cette facture.";
}

export async function analyzeSupplierInvoiceWithTextract(input: {
  bytes: Buffer;
  timeoutMs?: number;
}): Promise<TextractExpenseAnalysis> {
  const config = getTextractConfig();
  if (!config) {
    throw new TextractServiceError(
      "aws_not_configured",
      "L'analyse automatique n'est pas configurée côté serveur. La saisie manuelle reste disponible.",
      503,
    );
  }

  const host = `${TEXTRACT_SERVICE}.${config.region}.amazonaws.com`;
  const payload = JSON.stringify({ Document: { Bytes: input.bytes.toString("base64") } });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(`https://${host}/`, {
      method: "POST",
      headers: buildSignedHeaders({ config, host, payload, now: new Date() }),
      body: payload,
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as unknown;
    if (!response.ok) {
      const code = extractAwsErrorCode(body);
      console.warn("[behar:textract] Analyse facture rejetée", {
        code,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      throw new TextractServiceError(code, mapAwsMessage(code), mapAwsStatus(code, response.status));
    }

    const rawTextract = body as TextractAnalyzeExpenseResponse;
    return { parsed: parseTextractExpense(rawTextract), rawTextract };
  } catch (error) {
    if (error instanceof TextractServiceError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TextractServiceError(
        "textract_timeout",
        "L'analyse automatique met trop de temps à répondre. Saisie manuelle disponible.",
        504,
      );
    }
    throw new TextractServiceError(
      "textract_network_error",
      "Impossible de contacter le service d'analyse. Saisie manuelle disponible.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
