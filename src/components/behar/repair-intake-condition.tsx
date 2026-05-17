"use client";

import { type ChangeEvent, type ReactNode, useMemo, useState } from "react";

import { ArrowLeft, Download, Eye, FileCheck2, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Customer, Repair, RepairIntakeCondition } from "@/lib/behar-store";
import { displayCustomerName } from "@/lib/customer-display";
import { formatDeviceLabel } from "@/lib/format-device";

import { PrimaryButton, SecondaryButton, StatusBadge } from "./primitives";

const missing = "Non renseigné";

const intakeFields = [
  { key: "generalCondition", label: "État général", options: ["Excellent", "Bon", "Usé", "Abîmé", "Très abîmé", missing] },
  { key: "powerState", label: "Appareil", options: ["Allumé", "Éteint", "Non testable", missing] },
  { key: "chargingState", label: "Batterie / charge", options: ["Charge OK", "Ne charge pas", "Batterie vide", "Non testable", missing] },
  { key: "screenState", label: "Écran", options: ["Intact", "Rayé", "Fissuré", "Cassé", "Tactile non testable", missing] },
  { key: "frameState", label: "Châssis / dos", options: ["Bon état", "Rayures", "Chocs", "Tordu", "Dos cassé", missing] },
  { key: "camerasState", label: "Caméras", options: ["OK", "Défaut visible", "Non testable", missing] },
  { key: "audioState", label: "Micro / haut-parleur", options: ["OK", "Défaut signalé", "Non testable", missing] },
  { key: "buttonsState", label: "Boutons", options: ["OK", "Défaut bouton", "Non testable", missing] },
  { key: "chargingPortState", label: "Connecteur de charge", options: ["OK", "Défaut signalé", "Non testable", missing] },
  { key: "biometricState", label: "Face ID / Touch ID", options: ["OK", "Ne fonctionne pas", "Non testable", "Non concerné", missing] },
  { key: "networkState", label: "Réseau / SIM", options: ["OK", "Non testé", "SIM absente", "Défaut signalé", missing] },
  { key: "passcodeState", label: "Code appareil", options: ["Code fourni", "Code non fourni", "Sans code", "Déverrouillage impossible", missing] },
] as const;

const accessoryOptions = ["Aucun", "Carte SIM", "Coque", "Chargeur", "Câble", "Boîte", "Stylet", "Autre"];

type IntakeFieldKey = (typeof intakeFields)[number]["key"];

function clean(value: unknown, fallback = missing) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || /^(undefined|null|nan)$/i.test(text)) return fallback;
  return text;
}

export function isIntakeValidated(intake?: RepairIntakeCondition) {
  return Boolean(
    intake?.customerConfirmed &&
      intake.diagnosticAuthorized &&
      intake.nonTestableAccepted &&
      clean(intake.signerName, "") &&
      clean(intake.signedAt, ""),
  );
}

function createDraft(intake?: RepairIntakeCondition): RepairIntakeCondition {
  const now = new Date().toISOString();
  return {
    generalCondition: "Non renseigné",
    powerState: "Non renseigné",
    chargingState: "Non renseigné",
    screenState: "Non renseigné",
    frameState: "Non renseigné",
    camerasState: "Non renseigné",
    audioState: "Non renseigné",
    buttonsState: "Non renseigné",
    chargingPortState: "Non renseigné",
    biometricState: "Non renseigné",
    networkState: "Non renseigné",
    passcodeState: "Non renseigné",
    accessories: [],
    photos: [],
    createdAt: now,
    ...intake,
    updatedAt: now,
  };
}

function dateTime(value?: string) {
  if (!value) return missing;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return clean(value);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function deviceName(repair: Repair) {
  return formatDeviceLabel(repair, clean(repair.device, "Appareil"));
}

export function RepairIntakeSummaryCard({
  repair,
  customer,
  onOpen,
  onDownload,
  onOpenDocuments,
}: Readonly<{
  repair: Repair;
  customer?: Customer;
  onOpen: () => void;
  onDownload: () => void;
  onOpenDocuments: () => void;
}>) {
  const intake = repair.intakeCondition;
  const validated = isIntakeValidated(intake);
  const hasIntake = Boolean(intake);
  const accessories = intake?.accessories?.filter(Boolean) ?? [];

  return (
    <section className="rounded-[16px] border border-[#E8E8E5] bg-white/95 px-[18px] py-4 shadow-[0_10px_30px_rgba(26,25,22,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#1A1916] text-sm">État d'entrée / anti-litige</h3>
          {!hasIntake ? (
            <p className="mt-1 text-[#6B6B6B] text-sm">Aucun état d'entrée renseigné.</p>
          ) : (
            <p className="mt-1 text-[#6B6B6B] text-sm">{clean(intake?.generalCondition)} · {clean(intake?.screenState)}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 font-semibold text-[11px] ${validated ? "bg-[#E4F3DA] text-[#477A23]" : "bg-[#FAFAF8] text-[#6B6B6B]"}`}>
          {validated ? "État d'entrée validé" : "État d'entrée incomplet"}
        </span>
      </div>

      {hasIntake ? (
        <dl className="mt-4 grid gap-2 text-[13px]">
          <SummaryLine label="État général" value={clean(intake?.generalCondition)} />
          <SummaryLine label="Appareil" value={clean(intake?.powerState)} />
          <SummaryLine label="Écran" value={clean(intake?.screenState)} />
          <SummaryLine label="Châssis" value={clean(intake?.frameState)} />
          <SummaryLine label="Accessoires" value={accessories.length ? accessories.join(", ") : "Aucun accessoire fourni"} />
          <SummaryLine label="Défauts visibles" value={clean(intake?.visibleDefects)} />
          <SummaryLine label="Validation client" value={validated ? "Oui" : "Non"} />
          <SummaryLine label="Signataire" value={clean(intake?.signerName)} />
          <SummaryLine label="Date validation" value={dateTime(intake?.signedAt)} />
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton className="h-10" onClick={onOpen}>
          <FileCheck2 className="size-4" />
          {hasIntake ? "Modifier" : "Créer la fiche anti-litige"}
        </PrimaryButton>
        {hasIntake ? (
          <>
            <SecondaryButton className="h-10" onClick={onDownload}>
              <Download className="size-4" />
              Télécharger bon anti-litige
            </SecondaryButton>
            <SecondaryButton className="h-10" onClick={onOpenDocuments}>
              <Eye className="size-4" />
              Voir dans Documents
            </SecondaryButton>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function RepairIntakeScreen({
  repair,
  customer,
  onBack,
  onSave,
  onDownload,
  onOpenDocuments,
}: Readonly<{
  repair: Repair;
  customer?: Customer;
  onBack: () => void;
  onSave: (condition: RepairIntakeCondition) => void;
  onDownload: () => void;
  onOpenDocuments: () => void;
}>) {
  const [draft, setDraft] = useState<RepairIntakeCondition>(() => createDraft(repair.intakeCondition));
  const validated = isIntakeValidated(draft);

  const setField = <K extends keyof RepairIntakeCondition>(key: K, value: RepairIntakeCondition[K]) => {
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const save = (withValidation = false) => {
    const next: RepairIntakeCondition = {
      ...draft,
      signedAt:
        withValidation || (draft.customerConfirmed && draft.diagnosticAuthorized && draft.nonTestableAccepted && clean(draft.signerName, ""))
          ? draft.signedAt || new Date().toISOString()
          : draft.signedAt,
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    onSave(next);
    toast.success(next.signedAt ? "Validation client enregistrée" : "État d'entrée enregistré");
  };

  const toggleAccessory = (name: string) => {
    setDraft((current) => {
      const existing = current.accessories ?? [];
      if (name === "Aucun") {
        return { ...current, accessories: existing.includes("Aucun") ? [] : ["Aucun"], updatedAt: new Date().toISOString() };
      }
      const withoutNone = existing.filter((entry) => entry !== "Aucun");
      const next = withoutNone.includes(name) ? withoutNone.filter((entry) => entry !== name) : [...withoutNone, name];
      return { ...current, accessories: next, updatedAt: new Date().toISOString() };
    });
  };

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} n'est pas une image valide.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) return;
        setDraft((current) => ({
          ...current,
          photos: [
            ...(current.photos ?? []),
            { id: `photo_${Date.now()}_${Math.random().toString(16).slice(2)}`, name: file.name, dataUrl, createdAt: new Date().toISOString() },
          ],
          updatedAt: new Date().toISOString(),
        }));
      };
      reader.onerror = () => toast.error(`Impossible d'ajouter ${file.name}.`);
      reader.readAsDataURL(file);
    });
  };

  const summaryRows = useMemo(
    () => [
      ["Client", displayCustomerName(customer)],
      ["Appareil", deviceName(repair)],
      ["Réparation", repair.number],
      ["Statut", validated ? "État d'entrée validé" : "État d'entrée incomplet"],
      ["Validation client", validated ? "Oui" : "Non"],
      ["Signataire", clean(draft.signerName)],
      ["Date", dateTime(draft.signedAt)],
    ],
    [customer, draft.signerName, draft.signedAt, repair, validated],
  );

  // Champs prioritaires (vus en premier sur mobile)
  const primaryFields = intakeFields.filter((f) =>
    ["generalCondition", "powerState", "screenState", "chargingState", "frameState", "passcodeState"].includes(f.key),
  );
  const advancedFields = intakeFields.filter((f) => !primaryFields.includes(f));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none md:rounded-[20px] bg-[#FAFAF8]">
      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="scrollbar-thin min-h-0 overflow-y-auto px-4 py-4 pb-[120px] md:px-5 md:py-5 md:pb-5">
          <button className="mb-3 inline-flex items-center gap-2 text-[#167B70] text-[13px] font-medium hover:text-[#2A9D8F] md:mb-4 md:text-sm" onClick={onBack} type="button">
            <ArrowLeft className="size-4" />
            Retour
          </button>
          <h2 className="font-semibold text-[#1A1916] text-[20px] tracking-tight md:text-[24px]">État d'entrée appareil</h2>
          <p className="mt-1 text-[#6B6B6B] text-[12.5px] md:text-sm">Notez l'état visible de l'appareil au moment du dépôt.</p>

          {/* Champs principaux : 2 colonnes même sur mobile */}
          <section className="mt-4 md:mt-7">
            <h3 className="font-semibold text-[#1A1916] text-[13px] md:text-sm">État général</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2 md:gap-3">
              {primaryFields.map((field) => (
                <label className="block text-[#1A1916] text-[11px] font-medium md:text-[12px]" key={field.key}>
                  {field.label}
                  <select
                    className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-2.5 text-[12.5px] text-[#1A1916] outline-none transition focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10 md:h-11 md:rounded-[12px] md:px-3 md:text-sm"
                    onChange={(event) => setField(field.key as IntakeFieldKey, event.target.value as never)}
                    value={clean(draft[field.key], missing)}
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          {/* Plus de détails : 6 autres selects (replié sur mobile, ouvert sur desktop) */}
          <Accordion title="Tests détaillés" count={advancedFields.length}>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              {advancedFields.map((field) => (
                <label className="block text-[#1A1916] text-[11px] font-medium md:text-[12px]" key={field.key}>
                  {field.label}
                  <select
                    className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-2.5 text-[12.5px] text-[#1A1916] outline-none transition focus:border-[#2A9D8F] md:h-11 md:rounded-[12px] md:px-3 md:text-sm"
                    onChange={(event) => setField(field.key as IntakeFieldKey, event.target.value as never)}
                    value={clean(draft[field.key], missing)}
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Accordion>

          {/* Accessoires (visible) */}
          <section className="mt-5 md:mt-7">
            <h3 className="mb-2 font-semibold text-[#1A1916] text-[13px] md:text-sm">Accessoires fournis</h3>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {accessoryOptions.map((name) => {
                const checked = (draft.accessories ?? []).includes(name);
                return (
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition md:gap-2 md:px-3 md:py-2 md:text-sm ${checked ? "border-[#2A9D8F] bg-[#E8F7F3] text-[#167B70]" : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:border-[#2A9D8F]/40"}`}
                    key={name}
                  >
                    <input
                      checked={checked}
                      className="size-3 accent-[#2A9D8F] md:size-3.5"
                      onChange={() => toggleAccessory(name)}
                      type="checkbox"
                    />
                    {name}
                  </label>
                );
              })}
            </div>
            {(draft.accessories ?? []).includes("Autre") ? (
              <input
                className="mt-2 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[12.5px] outline-none focus:border-[#2A9D8F] md:mt-3 md:h-11 md:rounded-[12px] md:text-sm"
                onChange={(event) => setField("accessoriesOther", event.target.value)}
                placeholder="Préciser l'accessoire"
                value={draft.accessoriesOther ?? ""}
              />
            ) : null}
          </section>

          {/* Validation client (visible — critique pour anti-litige) */}
          <section className="mt-5 md:mt-7">
            <h3 className="mb-2 font-semibold text-[#1A1916] text-[13px] md:text-sm">Validation client</h3>
            <div className="grid gap-1.5 md:gap-2">
              <CheckLine checked={Boolean(draft.customerConfirmed)} onChange={(checked) => setField("customerConfirmed", checked)}>
                Le client confirme l'état d'entrée déclaré.
              </CheckLine>
              <CheckLine checked={Boolean(draft.diagnosticAuthorized)} onChange={(checked) => setField("diagnosticAuthorized", checked)}>
                Le client autorise l'ouverture / diagnostic.
              </CheckLine>
              <CheckLine checked={Boolean(draft.nonTestableAccepted)} onChange={(checked) => setField("nonTestableAccepted", checked)}>
                Certains défauts peuvent être non testables avant ouverture.
              </CheckLine>
            </div>
            <label className="mt-3 block text-[#1A1916] text-[11px] font-medium md:text-[12px]">
              Nom du client signataire
              <input
                className="mt-1 h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[12.5px] outline-none focus:border-[#2A9D8F] md:h-11 md:rounded-[12px] md:text-sm"
                onChange={(event) => setField("signerName", event.target.value)}
                value={draft.signerName ?? ""}
              />
            </label>
            {draft.signedAt ? <p className="mt-2 text-[#167B70] text-[12px] md:text-sm">Signé · {dateTime(draft.signedAt)}</p> : null}
          </section>

          {/* Notes & déclaration (collapsibles) */}
          <Accordion title="Défauts & notes client">
            <CompactTextArea
              label="Défauts visibles"
              onChange={(value) => setField("visibleDefects", value)}
              placeholder="Ex : écran fissuré en haut, dos rayé…"
              value={draft.visibleDefects ?? ""}
            />
            <CompactTextArea
              label="Déclaration client"
              onChange={(value) => setField("customerStatement", value)}
              placeholder="Ex : l'appareil ne charge plus depuis hier…"
              value={draft.customerStatement ?? ""}
            />
            <CompactTextArea
              label="Notes internes (atelier seulement)"
              onChange={(value) => setField("internalIntakeNotes", value)}
              placeholder="Visible uniquement côté atelier."
              value={draft.internalIntakeNotes ?? ""}
            />
          </Accordion>

          {/* Photos (collapsible) */}
          <Accordion title="Photos de l'appareil" count={(draft.photos ?? []).length}>
            <div className="grid gap-2.5 grid-cols-2 md:gap-3 lg:grid-cols-3">
              <label className="grid min-h-[96px] cursor-pointer place-items-center rounded-[12px] border border-dashed border-[#D8D8D2] bg-white text-center text-[#6B6B6B] transition hover:border-[#2A9D8F] hover:text-[#167B70] md:min-h-[112px] md:rounded-[14px]">
                <input accept="image/*" className="hidden" multiple onChange={addPhotos} type="file" />
                <span>
                  <ImagePlus className="mx-auto mb-1 size-5" />
                  <span className="block text-[12px] font-medium md:text-sm">Ajouter</span>
                </span>
              </label>
              {(draft.photos ?? []).map((photo) => (
                <div className="relative overflow-hidden rounded-[12px] border border-[#E8E8E5] bg-white md:rounded-[14px]" key={photo.id}>
                  {photo.dataUrl ? <img alt={photo.name} className="h-[96px] w-full object-cover md:h-[112px]" src={photo.dataUrl} /> : null}
                  <button
                    aria-label="Supprimer photo"
                    className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-[#6B6B6B] shadow-sm hover:text-[#B42318] md:size-8"
                    onClick={() => setField("photos", (draft.photos ?? []).filter((entry) => entry.id !== photo.id))}
                    type="button"
                  >
                    <Trash2 className="size-3.5 md:size-4" />
                  </button>
                </div>
              ))}
            </div>
          </Accordion>
        </div>

        <aside className="hidden xl:flex flex-col border-[#E8E8E5] border-t bg-white/80 p-5 xl:border-l xl:border-t-0">
          <h3 className="font-semibold text-[#1A1916] text-lg">Résumé</h3>
          <dl className="mt-5 space-y-3 text-sm">
            {summaryRows.map(([label, value]) => <SummaryLine key={label} label={label} value={value} />)}
          </dl>
          <div className="mt-6 rounded-[16px] border border-[#E8E8E5] bg-white p-4">
            <SummaryLine label="Écran" value={clean(draft.screenState)} />
            <SummaryLine label="Châssis / dos" value={clean(draft.frameState)} />
            <SummaryLine label="Batterie / charge" value={clean(draft.chargingState)} />
          </div>
          <div className="mt-6 grid gap-2">
            <SecondaryButton onClick={onDownload}>
              <Download className="size-4" />
              Voir bon de prise en charge
            </SecondaryButton>
            <SecondaryButton onClick={onOpenDocuments}>
              <Eye className="size-4" />
              Voir dans Documents
            </SecondaryButton>
          </div>
        </aside>
      </div>

      {/* Mobile : sticky bottom action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-[#E8E8E5] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
        style={{ boxShadow: "0 -10px 24px rgba(26,25,22,0.06)" }}
      >
        <StatusBadge status={validated ? "État d'entrée validé" : "État d'entrée incomplet"} />
        <PrimaryButton className="h-11 px-4 text-[13px]" onClick={() => save(false)}>
          Enregistrer
        </PrimaryButton>
      </div>

      {/* Desktop footer */}
      <div className="hidden md:flex shrink-0 flex-wrap items-center justify-between gap-3 border-[#E8E8E5] border-t bg-white px-5 py-4">
        <StatusBadge status={validated ? "État d'entrée validé" : "État d'entrée incomplet"} />
        <div className="flex gap-2">
          <SecondaryButton className="h-10 min-w-[130px]" onClick={onBack}>Annuler</SecondaryButton>
          <PrimaryButton className="h-10 min-w-[160px]" onClick={() => save(false)}>Enregistrer</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Accordion({
  title,
  count,
  children,
  defaultOpen = false,
}: Readonly<{ title: string; count?: number; children: ReactNode; defaultOpen?: boolean }>) {
  return (
    <details
      className="mt-4 group rounded-[14px] border border-[#E8E8E5] bg-white open:bg-white md:mt-7 md:border-t md:border-x-0 md:border-b-0 md:rounded-none md:bg-transparent"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-[14px] px-3.5 py-3 font-semibold text-[#1A1916] text-[13px] md:px-0 md:pt-5 md:text-sm">
        <span className="flex items-center gap-2">
          {title}
          {typeof count === "number" && count > 0 && (
            <span className="rounded-full bg-[#EAF6F2] px-2 py-0.5 text-[10.5px] font-bold text-[#2A9D8F]">{count}</span>
          )}
        </span>
        <span className="grid size-6 place-items-center rounded-full bg-[#FAFAF8] text-[#6B6B6B] transition group-open:rotate-45 md:hidden">+</span>
      </summary>
      <div className="px-3.5 pb-4 md:px-0 md:pt-3">{children}</div>
    </details>
  );
}

function CompactTextArea({
  label,
  placeholder,
  value,
  onChange,
}: Readonly<{ label: string; placeholder: string; value: string; onChange: (value: string) => void }>) {
  return (
    <label className="block mt-3 first:mt-0">
      <span className="text-[#1A1916] text-[12px] font-medium">{label}</span>
      <textarea
        className="mt-1 min-h-[68px] w-full resize-y rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2.5 text-[12.5px] text-[#1A1916] outline-none placeholder:text-[#A4A29C] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10 md:min-h-[86px] md:rounded-[14px] md:py-3 md:text-sm"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SummaryLine({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-[#6B6B6B]">{label}</dt>
      <dd className="text-right font-medium text-[#1A1916]">{value}</dd>
    </div>
  );
}

function FormSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="mt-7 border-[#E8E8E5] border-t pt-5">
      <h3 className="mb-3 font-semibold text-[#1A1916] text-sm">{title}</h3>
      {children}
    </section>
  );
}

function TextAreaBlock({
  label,
  placeholder,
  value,
  onChange,
}: Readonly<{ label: string; placeholder: string; value: string; onChange: (value: string) => void }>) {
  return (
    <FormSection title={label}>
      <textarea
        className="min-h-[86px] w-full resize-y rounded-[14px] border border-[#E8E8E5] bg-white px-3 py-3 text-sm text-[#1A1916] outline-none placeholder:text-[#A4A29C] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </FormSection>
  );
}

function CheckLine({
  checked,
  onChange,
  children,
}: Readonly<{ checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }>) {
  return (
    <label className="flex items-start gap-3 rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2.5 text-sm text-[#1A1916]">
      <input
        checked={checked}
        className="mt-0.5 size-4 accent-[#2A9D8F]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{children}</span>
    </label>
  );
}
