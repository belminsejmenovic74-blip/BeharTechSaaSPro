import { z } from "zod";

const unsafeText = /<\/?(?:script|iframe|object|embed|style)|javascript:|data:text\/html/i;

export const safeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) =>
        !unsafeText.test(value) &&
        [...value].every((character) => {
          const code = character.charCodeAt(0);
          return code > 31 || code === 9 || code === 10 || code === 13;
        }),
      "Contenu non autorisé.",
    );

const contactFields = {
  firstName: safeText(80).optional().default(""),
  lastName: safeText(80).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  email: z
    .union([z.literal(""), z.string().trim().email().max(180)])
    .optional()
    .default(""),
  deviceCategory: safeText(60).min(1),
  brand: safeText(100).optional().default(""),
  model: safeText(160).min(1),
  issue: safeText(180).min(1),
  issueDescription: safeText(1200).optional().default(""),
  servicePublicId: z.string().trim().max(120).optional(),
  quality: safeText(100).optional().default(""),
  comment: safeText(1500).optional().default(""),
  contactPreference: z.enum(["phone", "sms", "email", "whatsapp"]).optional(),
  requestedCallbackAt: z.string().datetime({ offset: true }).optional(),
  shopPublicId: z.string().trim().max(100).optional(),
  photos: z.array(z.string().trim().min(8).max(500)).max(5).optional().default([]),
  sourceUrl: z.string().url().max(1000).optional(),
  consent: z
    .object({
      service: z.literal(true),
      marketing: z.boolean().optional().default(false),
      text: safeText(1000).min(10),
      privacyVersion: safeText(40).min(1),
      acceptedAt: z.string().datetime({ offset: true }),
    })
    .strict(),
  startedAt: z.string().datetime({ offset: true }),
  website: z.literal("").optional().default(""),
} as const;

function hasPhone(value: { phone: string }) {
  return value.phone.replace(/\D/g, "").length >= 7;
}

function hasContact(value: { phone: string; email: string }) {
  return hasPhone(value) || value.email.length > 0;
}

function plausibleElapsed(startedAt: string) {
  const elapsed = Date.now() - new Date(startedAt).getTime();
  return Number.isFinite(elapsed) && elapsed >= 1_500 && elapsed <= 24 * 60 * 60 * 1000;
}

export const leadInputSchema = z
  .object({
    ...contactFields,
    type: z.enum(["callback", "quote", "price_request", "request"]),
  })
  .strict()
  .refine(hasPhone, { message: "Un numéro de téléphone valide est requis." })
  .refine((value) => plausibleElapsed(value.startedAt), { message: "Soumission trop rapide ou expirée." });

export const appointmentInputSchema = z
  .object({
    ...contactFields,
    type: z.literal("appointment").optional().default("appointment"),
    date: z.string().date(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict()
  .refine(hasContact, { message: "Un téléphone ou un email valide est requis." })
  .refine((value) => plausibleElapsed(value.startedAt), { message: "Soumission trop rapide ou expirée." });

export const quoteInputSchema = z
  .object({
    servicePublicId: z.string().trim().min(3).max(120),
    shopPublicId: z.string().trim().max(100).optional(),
  })
  .strict();

export const catalogQuerySchema = z.object({
  category: safeText(60).optional(),
  brand: safeText(100).optional(),
  model: safeText(160).optional(),
  issue: safeText(180).optional(),
  shop: z.string().trim().max(100).optional(),
});

export const slotsQuerySchema = z.object({
  shop: z.string().trim().max(100).optional(),
  from: z.string().date().optional(),
  days: z.coerce.number().int().min(1).max(31).optional().default(14),
  servicePublicId: z.string().trim().max(120).optional(),
});

export const uploadInputSchema = z
  .object({
    fileName: safeText(120).min(1),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
    size: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    sessionId: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_-]{12,160}$/),
  })
  .strict();

export const eventInputSchema = z
  .object({
    sessionId: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_-]{12,160}$/),
    shopPublicId: z.string().trim().max(100).optional(),
    name: z.enum([
      "widget_loaded",
      "widget_started",
      "device_selected",
      "issue_selected",
      "price_displayed",
      "price_unavailable",
      "stock_displayed",
      "stock_unavailable",
      "form_opened",
      "lead_submitted",
      "booking_opened",
      "slot_selected",
      "appointment_created",
      "widget_abandoned",
    ]),
    data: z
      .object({
        category: safeText(60).optional(),
        brand: safeText(100).optional(),
        model: safeText(160).optional(),
        issue: safeText(180).optional(),
        servicePublicId: z.string().trim().max(120).optional(),
        reason: safeText(160).optional(),
      })
      .strict()
      .optional()
      .default({}),
    idempotencyKey: z.string().trim().min(12).max(160).optional(),
  })
  .strict();

export type LeadInput = z.infer<typeof leadInputSchema>;
export type AppointmentInput = z.infer<typeof appointmentInputSchema>;
