"use client";

import { type ReactNode, useMemo, useState } from "react";

import { toast } from "sonner";

import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { useBeharStore, type WorkshopSettings } from "@/lib/behar-store";

type Props = {
  open: boolean;
};

const PAYMENT_OPTIONS = ["Espèces hors Behar Tech", "TPE externe", "Virement", "Chèque", "Autre"] as const;

export function InstallationOnboarding({ open }: Readonly<Props>) {
  const store = useBeharStore();
  const saveWorkshopSettings = store.saveWorkshopSettings;

  const [errors, setErrors] = useState<string[]>([]);
  const [draft, setDraft] = useState<WorkshopSettings>(() => ({
    ...store.workshopSettings,
    name: store.workshopSettings.name || "",
    phone: store.workshopSettings.phone || "",
    email: store.workshopSettings.email || "",
    website: store.workshopSettings.website || "",
    address: store.workshopSettings.address || "",
    postalCode: store.workshopSettings.postalCode || "",
    city: store.workshopSettings.city || "",
    country: store.workshopSettings.country || "France",
    siret: store.workshopSettings.siret || "",
    tvaNumber: store.workshopSettings.tvaNumber || "",
    vatApplicable: store.workshopSettings.vatApplicable ?? false,
    tvaMention: store.workshopSettings.tvaMention || "TVA non applicable, art. 293 B du CGI",
    repairPrefix: store.workshopSettings.repairPrefix || "REP",
    quotePrefix: store.workshopSettings.quotePrefix || "DEV",
    invoicePrefix: store.workshopSettings.invoicePrefix || "FAC",
    receiptPrefix: store.workshopSettings.receiptPrefix || "REC",
    nextRepairNumber: store.workshopSettings.nextRepairNumber ?? 1,
    nextQuoteNumber: store.workshopSettings.nextQuoteNumber ?? 1,
    nextInvoiceNumber: store.workshopSettings.nextInvoiceNumber ?? 1,
    nextReceiptNumber: store.workshopSettings.nextReceiptNumber ?? 1,
    acceptedPaymentMethods: store.workshopSettings.acceptedPaymentMethods?.length
      ? store.workshopSettings.acceptedPaymentMethods
      : ["Espèces hors Behar Tech", "TPE externe", "Virement"],
    businessHours: store.workshopSettings.businessHours || "Lun-Ven 09:00-18:00 · Sam 09:00-13:00",
    quoteTerms: store.workshopSettings.quoteTerms || "Devis valable 30 jours.",
    invoiceTerms: store.workshopSettings.invoiceTerms || "Paiement comptant à réception.",
    intakeTerms: store.workshopSettings.intakeTerms || "",
    documentFooter: store.workshopSettings.documentFooter || "Merci pour votre confiance.",
    allowCounterClient: store.workshopSettings.allowCounterClient ?? true,
    showLogo: store.workshopSettings.showLogo ?? true,
  }));

  const initials = useMemo(() => {
    const raw = (draft.name || "Atelier").trim();
    return raw
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [draft.name]);

  if (!open) return null;

  const setField = <K extends keyof WorkshopSettings>(key: K, value: WorkshopSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const nextErrors: string[] = [];
    if (!String(draft.name || "").trim()) {
      nextErrors.push("Le nom de l’atelier est obligatoire.");
    }
    if (!String(draft.phone || "").trim() && !String(draft.email || "").trim()) {
      nextErrors.push("Ajoutez au moins un téléphone ou un email.");
    }
    if (!String(draft.city || "").trim()) {
      nextErrors.push("La ville est obligatoire.");
    }
    if (!String(draft.siret || "").trim()) {
      nextErrors.push("Le numéro SIREN / SIRET est obligatoire.");
    }
    setErrors(nextErrors);
    if (nextErrors.length > 0) {
      nextErrors.forEach((e) => toast.error(e));
      return false;
    }
    return true;
  };

  const onSave = () => {
    if (!validate()) return;
    const city = String(draft.city || "").trim();
    const postalCode = String(draft.postalCode || "").trim();
    saveWorkshopSettings({
      ...draft,
      brand: "BEHAR • TECH",
      name: String(draft.name || "").trim(),
      phone: String(draft.phone || "").trim() || "Non renseigné",
      email: String(draft.email || "").trim() || "Non renseigné",
      address: String(draft.address || "").trim() || "Non renseigné",
      city,
      postalCode,
      postalCity: [postalCode, city].filter(Boolean).join(" ").trim() || city,
      website: String(draft.website || "").trim(),
      quoteTerms: String(draft.quoteTerms || "").trim(),
      invoiceTerms: String(draft.invoiceTerms || "").trim(),
      intakeTerms: String(draft.intakeTerms || "").trim(),
      documentFooter: String(draft.documentFooter || "").trim(),
      tvaMention: draft.vatApplicable ? "" : String(draft.tvaMention || "").trim(),
      isMicroEnterprise: !draft.vatApplicable,
      repairPrefix: String(draft.repairPrefix || "REP")
        .toUpperCase()
        .slice(0, 6),
      quotePrefix: String(draft.quotePrefix || "DEV")
        .toUpperCase()
        .slice(0, 6),
      invoicePrefix: String(draft.invoicePrefix || "FAC")
        .toUpperCase()
        .slice(0, 6),
      receiptPrefix: String(draft.receiptPrefix || "REC")
        .toUpperCase()
        .slice(0, 6),
      nextRepairNumber: Math.max(1, Number(draft.nextRepairNumber || 1)),
      nextQuoteNumber: Math.max(1, Number(draft.nextQuoteNumber || 1)),
      nextInvoiceNumber: Math.max(1, Number(draft.nextInvoiceNumber || 1)),
      nextReceiptNumber: Math.max(1, Number(draft.nextReceiptNumber || 1)),
      acceptedPaymentMethods: draft.acceptedPaymentMethods ?? [],
      businessHours: String(draft.businessHours || "").trim(),
      allowCounterClient: Boolean(draft.allowCounterClient),
      updatedAt: undefined,
      configuredAt: undefined,
    });
    toast.success("Atelier configuré avec succès.");
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white p-5 md:p-8">
      <div className="mx-auto max-w-5xl rounded-[24px] border border-[#E8E8E5] bg-white p-6 shadow-[0_20px_60px_rgba(26,25,22,0.08)] md:p-8">
        <h1 className="font-semibold text-[#1A1916] text-3xl tracking-tight">Configurer votre atelier</h1>
        <p className="mt-2 text-[#6B6B6B] text-sm">
          Ces informations apparaîtront sur vos devis, factures, reçus et documents client.
        </p>

        {errors.length > 0 ? (
          <div className="mt-5 rounded-[14px] border border-[#F3D1CC] bg-[#FFF7F6] px-4 py-3 text-[#7A271A] text-sm">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        ) : null}

        <section className="mt-7 grid gap-4 rounded-[18px] border border-[#E8E8E5] bg-[#FAFAFA]/70 p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold text-[#1A1916] text-lg">Identité atelier</h2>
          <Field label="Nom de l’atelier">
            <input className={inputCls} value={draft.name || ""} onChange={(e) => setField("name", e.target.value)} />
          </Field>
          <Field label="Logo atelier">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-sm text-[#1A1916]">
                  {draft.logoUrl ? "Changer logo" : "Choisir logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setField("logoUrl", String(reader.result || ""));
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {draft.logoUrl ? (
                  <img src={draft.logoUrl} alt="Logo atelier" className="h-10 w-10 rounded-[10px] object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#E7F5F1] font-semibold text-[#2A9D8F] text-xs">
                    {initials || "AT"}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                Si vous importez un logo, il apparaîtra automatiquement sur vos documents.
              </p>
            </div>
          </Field>
          <Field label="Téléphone">
            <input className={inputCls} value={draft.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={inputCls} value={draft.email || ""} onChange={(e) => setField("email", e.target.value)} />
          </Field>
          <Field label="Site web (optionnel)">
            <input
              className={inputCls}
              value={draft.website || ""}
              onChange={(e) => setField("website", e.target.value)}
            />
          </Field>
        </section>

        <section className="mt-4 grid gap-4 rounded-[18px] border border-[#E8E8E5] bg-[#FAFAFA]/70 p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold text-[#1A1916] text-lg">Adresse</h2>
          <Field label="Adresse">
            <input
              className={inputCls}
              value={draft.address || ""}
              onChange={(e) => setField("address", e.target.value)}
            />
          </Field>
          <Field label="Code postal">
            <input
              className={inputCls}
              value={draft.postalCode || ""}
              onChange={(e) => setField("postalCode", e.target.value)}
            />
          </Field>
          <Field label="Ville">
            <input className={inputCls} value={draft.city || ""} onChange={(e) => setField("city", e.target.value)} />
          </Field>
          <Field label="Pays">
            <input
              className={inputCls}
              value={draft.country || ""}
              onChange={(e) => setField("country", e.target.value)}
            />
          </Field>
        </section>

        <section className="mt-4 grid gap-4 rounded-[18px] border border-[#E8E8E5] bg-[#FAFAFA]/70 p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold text-[#1A1916] text-lg">Informations légales</h2>
          <Field label="SIREN / SIRET (Obligatoire)">
            <input className={inputCls} value={draft.siret || ""} onChange={(e) => setField("siret", e.target.value)} />
          </Field>
          <Field label="TVA intracommunautaire (optionnel)">
            <input
              className={inputCls}
              value={draft.tvaNumber || ""}
              onChange={(e) => setField("tvaNumber", e.target.value)}
            />
          </Field>
          <div className="md:col-span-2 flex flex-wrap gap-5 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={Boolean(draft.vatApplicable)}
                onChange={() => setField("vatApplicable", true)}
              />
              TVA applicable (20 %)
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={!draft.vatApplicable} onChange={() => setField("vatApplicable", false)} />
              TVA non applicable
            </label>
          </div>
          {!draft.vatApplicable ? (
            <Field label="Mention TVA">
              <input
                className={inputCls}
                value={draft.tvaMention || ""}
                onChange={(e) => setField("tvaMention", e.target.value)}
              />
            </Field>
          ) : null}
        </section>

        <section className="mt-4 grid gap-4 rounded-[18px] border border-[#E8E8E5] bg-[#FAFAFA]/70 p-4 md:grid-cols-4">
          <h2 className="md:col-span-4 font-semibold text-[#1A1916] text-lg">Numérotation documents</h2>
          <Field label="Préfixe réparation">
            <input
              className={inputCls}
              value={draft.repairPrefix || ""}
              onChange={(e) => setField("repairPrefix", e.target.value)}
            />
          </Field>
          <Field label="Préfixe devis">
            <input
              className={inputCls}
              value={draft.quotePrefix || ""}
              onChange={(e) => setField("quotePrefix", e.target.value)}
            />
          </Field>
          <Field label="Préfixe facture">
            <input
              className={inputCls}
              value={draft.invoicePrefix || ""}
              onChange={(e) => setField("invoicePrefix", e.target.value)}
            />
          </Field>
          <Field label="Préfixe reçu">
            <input
              className={inputCls}
              value={draft.receiptPrefix || ""}
              onChange={(e) => setField("receiptPrefix", e.target.value)}
            />
          </Field>
          <Field label="Prochain n° réparation">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.nextRepairNumber || 1}
              onChange={(e) => setField("nextRepairNumber", Number(e.target.value) || 1)}
            />
          </Field>
          <Field label="Prochain n° devis">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.nextQuoteNumber || 1}
              onChange={(e) => setField("nextQuoteNumber", Number(e.target.value) || 1)}
            />
          </Field>
          <Field label="Prochain n° facture">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.nextInvoiceNumber || 1}
              onChange={(e) => setField("nextInvoiceNumber", Number(e.target.value) || 1)}
            />
          </Field>
          <Field label="Prochain n° reçu">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.nextReceiptNumber || 1}
              onChange={(e) => setField("nextReceiptNumber", Number(e.target.value) || 1)}
            />
          </Field>
        </section>

        <section className="mt-4 grid gap-4 rounded-[18px] border border-[#E8E8E5] bg-[#FAFAFA]/70 p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold text-[#1A1916] text-lg">Paiements / horaires / conditions</h2>
          <Field label="Paiements acceptés">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {PAYMENT_OPTIONS.map((option) => {
                const active = (draft.acceptedPaymentMethods ?? []).includes(option);
                return (
                  <label key={option} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => {
                        const current = new Set(draft.acceptedPaymentMethods ?? []);
                        if (e.target.checked) current.add(option);
                        else current.delete(option);
                        setField("acceptedPaymentMethods", Array.from(current));
                      }}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Horaires affichés">
            <input
              className={inputCls}
              value={draft.businessHours || ""}
              onChange={(e) => setField("businessHours", e.target.value)}
            />
          </Field>
          <Field label="Conditions devis">
            <textarea
              className={areaCls}
              value={draft.quoteTerms || ""}
              onChange={(e) => setField("quoteTerms", e.target.value)}
            />
          </Field>
          <Field label="Conditions facture">
            <textarea
              className={areaCls}
              value={draft.invoiceTerms || ""}
              onChange={(e) => setField("invoiceTerms", e.target.value)}
            />
          </Field>
          <Field label="Conditions bon de prise en charge">
            <textarea
              className={areaCls}
              value={draft.intakeTerms || ""}
              onChange={(e) => setField("intakeTerms", e.target.value)}
            />
          </Field>
          <Field label="Pied de page document">
            <textarea
              className={areaCls}
              value={draft.documentFooter || ""}
              onChange={(e) => setField("documentFooter", e.target.value)}
            />
          </Field>
          <Field label="Client comptoir">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(draft.allowCounterClient)}
                onChange={(e) => setField("allowCounterClient", e.target.checked)}
              />
              Activer client comptoir / client de passage
            </label>
            <p className="mt-2 text-[#6B6B6B] text-xs">
              Permet de facturer un client de passage sans créer une fiche client complète.
            </p>
          </Field>
        </section>

        <div className="mt-7 flex flex-wrap items-center justify-end gap-2">
          <SecondaryButton onClick={() => window.location.reload()}>Annuler</SecondaryButton>
          <PrimaryButton className="h-11 px-6" onClick={onSave}>
            Enregistrer et accéder au logiciel
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="text-[#6B6B6B] text-sm">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
const areaCls =
  "min-h-[76px] w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
