import "server-only";

import type { ErpNextConfig } from "./config";

type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;

type FrappeDataResponse<T> = {
  data: T;
};

type FrappeMessageResponse<T> = {
  message: T;
};

export type ErpNextListOptions = {
  fields?: string[];
  filters?: unknown[];
  limit?: number;
  orderBy?: string;
};

export class ErpNextApiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;

  constructor(input: { status: number; method: string; path: string; details?: string }) {
    const details = input.details?.slice(0, 500);
    super(`ERPNext ${input.method} ${input.path} a échoué (${input.status})${details ? ` : ${details}` : ""}`);
    this.name = "ErpNextApiError";
    this.status = input.status;
    this.method = input.method;
    this.path = input.path;
  }
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "%252F");
}

function resourcePath(doctype: string, name?: string): string {
  const base = `/api/resource/${encodePathPart(doctype)}`;
  return name ? `${base}/${encodePathPart(name)}` : base;
}

function sanitizeErrorBody(body: string): string {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as JsonRecord;
    const candidate = parsed.message ?? parsed.exc_type ?? parsed.exception ?? parsed.exc;
    return typeof candidate === "string" ? candidate : "Erreur ERPNext";
  } catch {
    return body.replace(/\s+/g, " ").trim();
  }
}

export class ErpNextClient {
  private readonly baseUrl: string;
  private readonly authorization: string;
  private readonly requestTimeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(config: ErpNextConfig, fetchImpl: FetchLike = fetch) {
    if (!config.configured) {
      throw new Error("Le client ERPNext ne peut pas être créé sans URL, clé API et secret API.");
    }
    this.baseUrl = config.baseUrl;
    this.authorization = `token ${config.apiKey}:${config.apiSecret}`;
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async ping(): Promise<string> {
    const response = await this.request<FrappeMessageResponse<string>>(
      "GET",
      "/api/method/frappe.auth.get_logged_user",
    );
    return response.message;
  }

  async list<T>(doctype: string, options: ErpNextListOptions = {}): Promise<T[]> {
    const params = new URLSearchParams();
    if (options.fields?.length) params.set("fields", JSON.stringify(options.fields));
    if (options.filters?.length) params.set("filters", JSON.stringify(options.filters));
    params.set("limit_page_length", String(options.limit ?? 20));
    if (options.orderBy) params.set("order_by", options.orderBy);

    const response = await this.request<FrappeDataResponse<T[]>>(
      "GET",
      `${resourcePath(doctype)}?${params.toString()}`,
    );
    return response.data;
  }

  async get<T>(doctype: string, name: string): Promise<T> {
    const response = await this.request<FrappeDataResponse<T>>("GET", resourcePath(doctype, name));
    return response.data;
  }

  async create<TDocument extends JsonRecord, TResult = TDocument>(
    doctype: string,
    document: TDocument,
  ): Promise<TResult> {
    const response = await this.request<FrappeDataResponse<TResult>>("POST", resourcePath(doctype), document);
    return response.data;
  }

  async update<TDocument extends JsonRecord, TResult = TDocument>(
    doctype: string,
    name: string,
    document: Partial<TDocument>,
  ): Promise<TResult> {
    const response = await this.request<FrappeDataResponse<TResult>>("PUT", resourcePath(doctype, name), document);
    return response.data;
  }

  async upsertByExternalId<
    TDocument extends JsonRecord,
    TResult extends { name: string } = TDocument & { name: string },
  >(input: {
    doctype: string;
    externalIdField: string;
    externalId: string;
    document: TDocument;
  }): Promise<{ action: "created" | "updated"; document: TResult }> {
    if (!input.externalId.trim()) throw new Error("Un identifiant externe non vide est requis pour l’upsert ERPNext.");

    const existing = await this.list<{ name: string }>(input.doctype, {
      fields: ["name"],
      filters: [[input.externalIdField, "=", input.externalId]],
      limit: 1,
    });

    if (existing[0]?.name) {
      const document = await this.update<TDocument, TResult>(input.doctype, existing[0].name, input.document);
      return { action: "updated", document };
    }

    const document = await this.create<TDocument, TResult>(input.doctype, input.document);
    return { action: "created", document };
  }

  private async request<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          authorization: this.authorization,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new ErpNextApiError({
          status: response.status,
          method,
          path,
          details: sanitizeErrorBody(text),
        });
      }
      return (text ? JSON.parse(text) : {}) as T;
    } catch (error) {
      if (error instanceof ErpNextApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`ERPNext ${method} ${path} a dépassé ${this.requestTimeoutMs} ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
