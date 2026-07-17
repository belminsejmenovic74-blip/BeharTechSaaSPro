import "server-only";

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1";

function encryptionKey(): Buffer {
  const raw = process.env.PAYMENT_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("PAYMENT_TOKEN_ENCRYPTION_KEY manquante.");

  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32 && decoded.toString("base64").replace(/=+$/, "") === raw.replace(/=+$/, "")) return decoded;
  throw new Error("PAYMENT_TOKEN_ENCRYPTION_KEY doit contenir exactement 32 octets (base64 ou 64 caracteres hex). ");
}

export function encryptPaymentToken(plaintext: string): string {
  if (!plaintext) throw new Error("Jeton vide.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptPaymentToken(payload: string): string {
  const [version, ivValue, tagValue, ciphertextValue] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) throw new Error("Jeton chiffre invalide.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

export function signExternalReturnState(requestId: string): string {
  const signature = createHmac("sha256", encryptionKey()).update(`external-return:${requestId}`).digest("base64url");
  return `${requestId}.${signature}`;
}

export function verifyExternalReturnState(value: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const requestId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = createHmac("sha256", encryptionKey()).update(`external-return:${requestId}`).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  return received.length === expected.length && timingSafeEqual(received, expected) ? requestId : null;
}
