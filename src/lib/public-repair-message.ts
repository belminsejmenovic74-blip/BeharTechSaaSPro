import { z } from "zod";

const unsafeMarkup = /<\/?(?:script|iframe|object|embed|style)|javascript:|data:text\/html/i;

export const publicRepairMessageSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "Le message est vide.")
      .max(1000, "Le message ne peut pas dépasser 1 000 caractères.")
      .refine((value) => !unsafeMarkup.test(value), "Le message contient du contenu non autorisé.")
      .refine(
        (value) =>
          [...value].every((character) => {
            const code = character.charCodeAt(0);
            return code > 31 || code === 9 || code === 10 || code === 13;
          }),
        "Le message contient des caractères non autorisés.",
      ),
    authorName: z.string().trim().min(1).max(80).default("Client"),
    clientMessageId: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_-]{16,100}$/),
  })
  .strict();

export function isValidPublicRepairToken(token: string): boolean {
  return /^[a-zA-Z0-9_-]{18,180}$/.test(token.trim());
}

export class PublicMessageError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 429 | 503,
    readonly code: "invalid" | "not_found" | "duplicate" | "rate_limited" | "unavailable",
  ) {
    super(message);
    this.name = "PublicMessageError";
  }
}
