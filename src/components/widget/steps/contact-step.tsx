"use client";

// Étape 4 — Informations et rendez-vous.
// Coordonnées (prénom, nom, téléphone, email), commentaire, photos éventuelles
// et préférence de contact ; puis choix de l'action : être rappelé, demander un
// devis ou prendre rendez-vous (avec sélection de créneau). Aucune création de
// compte : seul un moyen de contact est requis, plus le consentement.

import { type ReactNode, useMemo, useState } from "react";

import type { ContactPreference, Slot } from "@/lib/widget/public-types";
import { WidgetApiError } from "@/lib/widget/public-client";
import { useAsyncList } from "@/components/widget/use-catalog";
import { primaryService, type StepContext } from "@/components/widget/widget-state";
import { formatDateFr, resolveLayout } from "@/components/widget/widget-theme";
import type { WidgetFieldKey } from "@/lib/widget/cms-config";
import {
  Spinner,
  StepShell,
  WidgetChip,
  WidgetField,
  WidgetInput,
  WidgetNotice,
  WidgetTextarea,
} from "@/components/widget/widget-primitives";

const CONTACT_PREFERENCES: Array<{ value: ContactPreference; label: string }> = [
  { value: "phone", label: "Téléphone" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
];

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function ContactStep({ ctx, submitError }: { ctx: StepContext; submitError: string | null }) {
  const { draft, patch, features, texts, config } = ctx;

  const layout = resolveLayout(config.layout);
  const columnClass = "grid-cols-1 sm:grid-cols-2";
  const phoneDigits = draft.phone.replace(/\D/g, "").length;
  const emailValid = !draft.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
  const fieldBlocks: Record<WidgetFieldKey, ReactNode> = {
    identity: (
      <div className={`grid gap-3 ${columnClass}`}>
        <WidgetField label={texts.firstNameLabel} htmlFor="w-firstname">
          <WidgetInput
            id="w-firstname"
            value={draft.firstName}
            autoComplete="given-name"
            onChange={(event) => patch({ firstName: event.target.value })}
            placeholder="Prénom"
          />
        </WidgetField>
        <WidgetField label={texts.lastNameLabel} htmlFor="w-lastname">
          <WidgetInput
            id="w-lastname"
            value={draft.lastName}
            autoComplete="family-name"
            onChange={(event) => patch({ lastName: event.target.value })}
            placeholder="Nom"
          />
        </WidgetField>
      </div>
    ),
    contact: (
      <div className={`grid gap-3 ${columnClass}`}>
        <WidgetField
          label={texts.phoneLabel}
          htmlFor="w-phone"
          required
          hint="Requis pour traiter votre demande."
          error={draft.phone && phoneDigits < 7 ? "Saisissez un numéro de téléphone valide." : undefined}
        >
          <WidgetInput
            id="w-phone"
            type="tel"
            inputMode="tel"
            value={draft.phone}
            autoComplete="tel"
            onChange={(event) => patch({ phone: event.target.value })}
            placeholder="06 12 34 56 78"
          />
        </WidgetField>
        <WidgetField
          label={texts.emailLabel}
          htmlFor="w-email"
          error={!emailValid ? "Saisissez une adresse e-mail valide." : undefined}
        >
          <WidgetInput
            id="w-email"
            type="email"
            inputMode="email"
            value={draft.email}
            autoComplete="email"
            onChange={(event) => patch({ email: event.target.value })}
            placeholder="vous@exemple.fr"
          />
        </WidgetField>
      </div>
    ),
    preference: (
      <WidgetField label={texts.contactPreferenceLabel}>
        <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-[13px] border border-[var(--w-border)] bg-[#F5F6F3] p-1">
          {CONTACT_PREFERENCES.map((preference) => (
            <WidgetChip
              key={preference.value}
              selected={draft.contactPreference === preference.value}
              segmented
              onClick={() =>
                patch({ contactPreference: draft.contactPreference === preference.value ? "" : preference.value })
              }
            >
              {preference.label}
            </WidgetChip>
          ))}
        </div>
      </WidgetField>
    ),
    comment: features.comment ? (
      <WidgetField label={texts.commentLabel} hint="Facultatif.">
        <WidgetTextarea
          value={draft.comment}
          onChange={(event) => patch({ comment: event.target.value })}
          placeholder="Une précision pour l’atelier ?"
          maxLength={1500}
        />
      </WidgetField>
    ) : null,
    photos: features.photos ? <PhotoUploader ctx={ctx} /> : null,
    request: null,
    booking: null,
    consent: (
      <label className="flex cursor-pointer items-start gap-3 rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] p-4">
        <input
          type="checkbox"
          checked={draft.consent}
          onChange={(event) => patch({ consent: event.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--w-primary)]"
        />
        <span className="text-sm leading-relaxed text-[var(--w-text)]">
          {texts.consentLabel.replace(config.general.commercialName?.trim() || "l’atelier", "l’atelier")}
          {config.general.privacyUrl ? (
            <>
              {" "}
              <a
                href={config.general.privacyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--w-primary)] underline"
              >
                Politique de confidentialité
              </a>
              .
            </>
          ) : null}
        </span>
      </label>
    ),
  };

  return (
    <StepShell title="Vos coordonnées" subtitle="Ces informations permettront à l’atelier de confirmer votre demande.">
      {layout.fieldOrder.map((field) =>
        layout.hiddenFields.includes(field) ? null : <div key={field}>{fieldBlocks[field]}</div>,
      )}

      {submitError ? <WidgetNotice tone="warning">{submitError}</WidgetNotice> : null}
    </StepShell>
  );
}

export function SlotPicker({ ctx }: { ctx: StepContext }) {
  const { client, token, draft, patch, emit } = ctx;
  const service = primaryService(draft);
  const slots = useAsyncList<Slot>(
    (signal) =>
      client
        .getSlots(token, { shop: draft.shopId || undefined, days: "14", servicePublicId: service?.publicId }, signal)
        .then((result) => result.slots),
    [token, draft.shopId, service?.publicId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const slot of slots.items) {
      const list = map.get(slot.date) ?? [];
      list.push(slot.time);
      map.set(slot.date, list);
    }
    return [...map.entries()];
  }, [slots.items]);

  if (slots.loading) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--w-radius)] border border-[var(--w-border)] p-4 text-sm text-[var(--w-muted)]">
        <Spinner className="h-4 w-4" /> Recherche des créneaux disponibles…
      </div>
    );
  }

  if (slots.error || grouped.length === 0) {
    return (
      <WidgetNotice tone="warning">
        Aucun créneau disponible pour le moment. Choisissez « Être rappelé » : l’atelier vous proposera un rendez-vous.
      </WidgetNotice>
    );
  }

  return (
    <WidgetField label="Créneau">
      <div className="grid max-h-72 gap-4 overflow-y-auto pr-1">
        {grouped.map(([date, times]) => (
          <div key={date} className="grid gap-2">
            <p className="text-sm font-medium capitalize text-[var(--w-text)]">{formatDateFr(date)}</p>
            <div className="flex flex-wrap gap-2">
              {times.map((time) => {
                const selected = draft.appointmentDate === date && draft.appointmentTime === time;
                return (
                  <WidgetChip
                    key={time}
                    selected={selected}
                    onClick={() => {
                      patch({ appointmentDate: date, appointmentTime: time });
                      emit("slot_selected");
                    }}
                  >
                    {time}
                  </WidgetChip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </WidgetField>
  );
}

type PhotoEntry = { path: string; name: string; status: "uploading" | "done" | "error" };

function PhotoUploader({ ctx }: { ctx: StepContext }) {
  const { client, token, draft, patch, sessionId, texts } = ctx;
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError(null);
    const files = [...fileList].slice(0, MAX_PHOTOS - draft.photos.length);
    for (const file of files) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setError("Formats acceptés : JPEG, PNG, WebP, HEIC.");
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError("Chaque photo doit peser moins de 10 Mo.");
        continue;
      }
      const marker: PhotoEntry = { path: "", name: file.name, status: "uploading" };
      setEntries((current) => [...current, marker]);
      try {
        const signed = await client.signUpload(token, {
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          sessionId,
        });
        const upload = await fetch(signed.signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type, "x-upsert": "true" },
          body: file,
        });
        if (!upload.ok) throw new Error("upload_failed");
        setEntries((current) =>
          current.map((entry) => (entry === marker ? { ...marker, path: signed.path, status: "done" } : entry)),
        );
        patch({ photos: [...draft.photos, signed.path].slice(0, MAX_PHOTOS) });
      } catch (uploadError) {
        setEntries((current) => current.map((entry) => (entry === marker ? { ...marker, status: "error" } : entry)));
        setError(
          uploadError instanceof WidgetApiError ? uploadError.message : "Une photo n’a pas pu être envoyée. Réessayez.",
        );
      }
    }
  }

  function removePhoto(entry: PhotoEntry) {
    setEntries((current) => current.filter((item) => item !== entry));
    if (entry.path) patch({ photos: draft.photos.filter((path) => path !== entry.path) });
  }

  const full = draft.photos.length >= MAX_PHOTOS;

  return (
    <WidgetField
      label={texts.photoLabel}
      hint={`Facultatif — jusqu’à ${MAX_PHOTOS} photos du problème.`}
      error={error ?? undefined}
    >
      <div className="grid gap-2">
        {entries.length ? (
          <ul className="grid gap-2">
            {entries.map((entry, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: les noms de fichiers peuvent se répéter
                key={`${entry.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-[var(--w-radius)] border border-[var(--w-border)] px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {entry.status === "uploading" ? <Spinner className="h-4 w-4 text-[var(--w-muted)]" /> : null}
                  <span className="truncate text-[var(--w-text)]">{entry.name}</span>
                  {entry.status === "error" ? <span className="text-xs text-[#B4232A]">échec</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => removePhoto(entry)}
                  className="shrink-0 text-xs font-medium text-[var(--w-muted)] hover:text-[var(--w-text)]"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {!full ? (
          <label className="flex cursor-pointer items-center justify-center rounded-[var(--w-radius)] border border-dashed border-[var(--w-border)] px-4 py-3 text-sm font-medium text-[var(--w-muted)] transition hover:border-[var(--w-primary)] hover:text-[var(--w-text)]">
            Ajouter des photos
            <input
              type="file"
              accept={ALLOWED_PHOTO_TYPES.join(",")}
              multiple
              className="sr-only"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
    </WidgetField>
  );
}
