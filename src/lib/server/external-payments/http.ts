import "server-only";

export class ExternalPaymentProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

export async function providerJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const json = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !json) throw new ExternalPaymentProviderError(fallbackMessage, response.status || 502);
  return json;
}

export function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} manquante.`);
  return value;
}
