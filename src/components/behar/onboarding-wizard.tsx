"use client";

import { useMemo, useState } from "react";

import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { BusinessHoursEditor } from "@/components/behar/business-hours-editor";
import { type TeamMember, useBeharStore, type WorkshopSettings } from "@/lib/behar-store";
import { syncNormalizedBusinessState } from "@/lib/data/normalized-sync";
import { cn } from "@/lib/utils";
import { refreshCapabilities, resetCapabilitiesCache } from "@/lib/use-capabilities";
import { normalizeLicenseKey, saveSnapshotState } from "@/lib/workshop-sync";
import { getLegalFieldsByCountry, getWorkshopCountryConfig } from "@/lib/workshop-country";
import { defaultWorkshopWeeklyHours, formatWorkshopWeeklyHours } from "@/lib/workshop-hours";

type Step = 1 | 2 | 3 | 4;

const blockedValues = new Set(["hj", "test", "undefined", "null", "nan", "none", "aucun", "n/a"]);
const cityByPostalCode: Record<string, string[]> = {
  "06000": ["Nice"],
  "13001": ["Marseille"],
  "31000": ["Toulouse"],
  "33000": ["Bordeaux"],
  "34000": ["Montpellier"],
  "44000": ["Nantes"],
  "59000": ["Lille"],
  "67000": ["Strasbourg"],
  "69001": ["Lyon"],
  "69002": ["Lyon"],
  "69003": ["Lyon"],
  "69004": ["Lyon"],
  "69005": ["Lyon"],
  "69006": ["Lyon"],
  "69007": ["Lyon"],
  "69008": ["Lyon"],
  "69009": ["Lyon"],
  "74100": ["Annemasse", "Ambilly", "Ville-la-Grand", "Vétraz-Monthoux"],
  "75001": ["Paris"],
  "75002": ["Paris"],
  "75003": ["Paris"],
  "75004": ["Paris"],
  "75005": ["Paris"],
  "75006": ["Paris"],
  "75007": ["Paris"],
  "75008": ["Paris"],
  "75009": ["Paris"],
  "75010": ["Paris"],
  "75011": ["Paris"],
  "75012": ["Paris"],
  "75013": ["Paris"],
  "75014": ["Paris"],
  "75015": ["Paris"],
  "75016": ["Paris"],
  "75017": ["Paris"],
  "75018": ["Paris"],
  "75019": ["Paris"],
  "75020": ["Paris"],
};
const callingCodeOptions = [
  { code: "+33", label: "France" },
  { code: "+41", label: "Suisse" },
  { code: "+32", label: "Belgique" },
  { code: "+352", label: "Luxembourg" },
  { code: "+34", label: "Espagne" },
  { code: "+39", label: "Italie" },
  { code: "+49", label: "Allemagne" },
  { code: "+44", label: "Royaume-Uni" },
  { code: "+1", label: "USA / Canada" },
  { code: "+212", label: "Maroc" },
  { code: "+213", label: "Algérie" },
  { code: "+216", label: "Tunisie" },
] as const;

function normalizeSpaces(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function isWeakText(value: unknown, minLength = 3): boolean {
  const normalized = normalizeSpaces(value).toLowerCase();
  if (!normalized || normalized.length < minLength) return true;
  if (blockedValues.has(normalized)) return true;
  if (/^0+$/.test(normalized) || /^1?2?3+$/.test(normalized)) return true;
  return /^[^a-zà-ÿ]*$/i.test(normalized);
}

function isValidPhoneNumber(value: unknown): boolean {
  const compact = normalizeSpaces(value).replace(/[\s().-]/g, "");
  if (!/^\+\d{7,15}$/.test(compact)) return false;
  if (compact.startsWith("+33")) return /^\+33[1-9]\d{8}$/.test(compact);
  return true;
}

function isValidEmail(value: unknown): boolean {
  const email = normalizeSpaces(value);
  if (blockedValues.has(email.toLowerCase())) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function phoneParts(value: unknown): { prefix: string; local: string } {
  const raw = normalizeSpaces(value);
  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  if (!match) {
    const digits = digitsOnly(raw);
    if (digits.startsWith("0")) return { prefix: "+33", local: digits.slice(1) };
    return { prefix: "+33", local: digits };
  }
  return { prefix: match[1], local: digitsOnly(match[2]) };
}

function formatPhoneLocal(prefix: string, value: unknown): string {
  const digits = digitsOnly(value).slice(0, 12);
  if (prefix === "+33")
    return digits
      .slice(0, 9)
      .replace(/(\d)(?=(?:\d{2})+$)/g, "$1 ")
      .trim();
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function OnboardingWizard() {
  const store = useBeharStore();
  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [draft, setDraft] = useState<WorkshopSettings>(() => ({
    ...store.workshopSettings,
    name: store.workshopSettings.name || "",
    commercialName: store.workshopSettings.commercialName || "",
    phone: store.workshopSettings.phone || "",
    email: store.workshopSettings.email || "",
    website: store.workshopSettings.website || "",
    address: store.workshopSettings.address || "",
    postalCode: store.workshopSettings.postalCode || "",
    city: store.workshopSettings.city || "",
    country: store.workshopSettings.country || "FR",
    currency: store.workshopSettings.country === "CH" ? "CHF" : "EUR",
    defaultPhonePrefix: store.workshopSettings.country === "CH" ? "+41" : "+33",
    taxRegime: store.workshopSettings.vatApplicable ? "vat_subject" : "not_subject_to_vat",
    siret: store.workshopSettings.siret || "",
    swissUid: store.workshopSettings.swissUid || "",
    swissVatNumber: store.workshopSettings.swissVatNumber || "",
    swissCanton: store.workshopSettings.swissCanton || "",
    vatApplicable: store.workshopSettings.vatApplicable ?? false,
    tvaMention: store.workshopSettings.tvaMention || "TVA non applicable, art. 293 B du CGI",
    repairPrefix: store.workshopSettings.repairPrefix || "REP",
    quotePrefix: store.workshopSettings.quotePrefix || "DEV",
    invoicePrefix: store.workshopSettings.invoicePrefix || "FAC",
    receiptPrefix: store.workshopSettings.receiptPrefix || "REC",
    acceptedPaymentMethods: store.workshopSettings.acceptedPaymentMethods?.length
      ? store.workshopSettings.acceptedPaymentMethods
      : ["Espèces hors Behar Tech", "TPE externe"],
    businessHours: store.workshopSettings.businessHours || "Lun-Ven 09:00-18:00",
    weeklyHours: store.workshopSettings.weeklyHours || defaultWorkshopWeeklyHours(),
    customerReceptionMode: store.workshopSettings.customerReceptionMode || "shop",
    quoteTerms: store.workshopSettings.quoteTerms || "Valable 30 jours.",
    invoiceTerms: store.workshopSettings.invoiceTerms || "Paiement à réception.",
    intakeTerms: store.workshopSettings.intakeTerms || "",
    documentFooter: store.workshopSettings.documentFooter || "Merci pour votre confiance.",
    showLogo: store.workshopSettings.showLogo ?? true,
  }));

  const [teamDraft, setTeamDraft] = useState<Omit<TeamMember, "id">[]>(
    store.teamMembers.length > 0
      ? store.teamMembers.map(({ id, ...m }) => m)
      : [{ firstName: "", lastName: "", role: "Gérant" }],
  );

  const setField = <K extends keyof WorkshopSettings>(key: K, value: WorkshopSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  // Check if step 1 can advance
  const canAdvanceStep1 = useMemo(() => {
    return !isWeakText(draft.name);
  }, [draft.name]);

  const nextStep = () => {
    if (step === 1) {
      if (isWeakText(draft.name)) return toast.error("Renseignez un nom d'atelier réel.");
      if (draft.commercialName && isWeakText(draft.commercialName)) return toast.error("Nom commercial invalide.");
      if (!isValidPhoneNumber(draft.phone)) return toast.error("Téléphone international invalide.");
      if (!isValidEmail(draft.email)) {
        return toast.error("Email atelier invalide.");
      }
      if (isWeakText(draft.address, 6)) return toast.error("Adresse complète obligatoire.");
      const postalCode = normalizeSpaces(draft.postalCode);
      const countryConfig = getWorkshopCountryConfig(draft.country);
      if (!countryConfig.postalCodePattern.test(postalCode) || /^0+$/.test(postalCode)) {
        return toast.error(
          draft.country === "CH"
            ? "NPA suisse invalide (4 chiffres attendus)."
            : "Code postal invalide (5 chiffres attendus).",
        );
      }
      if (isWeakText(draft.city)) return toast.error("Ville obligatoire.");
      if (draft.country === "CH" && draft.vatApplicable && !normalizeSpaces(draft.swissVatNumber)) {
        return toast.error("Renseignez le numéro TVA suisse pour un atelier assujetti.");
      }
    }
    setStep((s) => (s + 1) as Step);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep((s) => (s - 1) as Step);
    window.scrollTo(0, 0);
  };

  const handleFinish = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const city = normalizeSpaces(draft.city);
    const postalCode = normalizeSpaces(draft.postalCode);
    store.saveWorkshopSettings({
      ...draft,
      name: normalizeSpaces(draft.name),
      commercialName: normalizeSpaces(draft.commercialName),
      phone: normalizeSpaces(draft.phone),
      email: normalizeSpaces(draft.email).toLowerCase(),
      address: normalizeSpaces(draft.address),
      postalCode,
      city,
      country: draft.country === "CH" ? "CH" : "FR",
      currency: draft.country === "CH" ? "CHF" : "EUR",
      defaultPhonePrefix: draft.country === "CH" ? "+41" : "+33",
      taxRegime: draft.vatApplicable ? "vat_subject" : "not_subject_to_vat",
      siret: draft.country === "CH" ? "" : digitsOnly(draft.siret),
      tvaNumber: draft.country === "CH" ? "" : normalizeSpaces(draft.tvaNumber),
      swissUid: draft.country === "CH" ? normalizeSpaces(draft.swissUid) : "",
      swissVatNumber: draft.country === "CH" && draft.vatApplicable ? normalizeSpaces(draft.swissVatNumber) : "",
      swissCanton: draft.country === "CH" ? normalizeSpaces(draft.swissCanton) : "",
      postalCity: [postalCode, city].filter(Boolean).join(" ").trim(),
      vatRate: draft.vatApplicable ? Number(draft.vatRate || (draft.country === "CH" ? 8.1 : 20)) : 0,
      tvaMention: draft.vatApplicable
        ? ""
        : draft.country === "CH"
          ? "Non assujetti à la TVA"
          : normalizeSpaces(draft.tvaMention),
      quoteTerms: String(draft.quoteTerms || "").trim(),
      invoiceTerms: String(draft.invoiceTerms || "").trim(),
      intakeTerms: String(draft.intakeTerms || "").trim(),
      documentFooter: String(draft.documentFooter || "").trim(),
      isMicroEnterprise: !draft.vatApplicable,
      configuredAt: new Date().toISOString(),
    });

    const cleanTeam = teamDraft.filter(
      (member) => normalizeSpaces(member.firstName).length > 0 || normalizeSpaces(member.lastName).length > 0,
    );
    cleanTeam.forEach((member, index) => {
      const normalizedMember = {
        ...member,
        firstName: normalizeSpaces(member.firstName),
        lastName: normalizeSpaces(member.lastName),
        email: normalizeSpaces(member.email).toLowerCase() || undefined,
        phone: normalizeSpaces(member.phone) || undefined,
      };
      const existing = store.teamMembers[index];
      if (existing) store.updateTeamMember(existing.id, normalizedMember);
      else store.addTeamMember(normalizedMember);
    });

    store.setOnboardingCompleted(true);
    try {
      const licenseKey = normalizeLicenseKey(useBeharStore.getState().licenseKey);
      if (!licenseKey) throw new Error("Licence introuvable.");
      const snapshot = await saveSnapshotState(licenseKey, useBeharStore.getState());
      useBeharStore.setState((state) => ({
        cloudSync: {
          ...(state.cloudSync ?? {}),
          workshopId: snapshot.workshopId,
          lastSyncedAt: snapshot.updatedAt,
        },
      }));
      resetCapabilitiesCache();
      await refreshCapabilities();
      await syncNormalizedBusinessState(useBeharStore.getState());
      toast.success("Atelier configuré et synchronisé avec succès !");
    } catch (error) {
      console.error("[onboarding] final sync failed", error);
      toast.error("L’atelier est enregistré. La synchronisation cloud sera retentée automatiquement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4 md:py-20">
      {/* Stepper */}
      <div className="w-full max-w-3xl mb-14 flex items-center justify-between px-4">
        <StepperItem active={step >= 1} current={step === 1} label="Atelier" step={1} />
        <StepperDivider active={step >= 2} />
        <StepperItem active={step >= 2} current={step === 2} label="Paramètres" step={2} />
        <StepperDivider active={step >= 3} />
        <StepperItem active={step >= 3} current={step === 3} label="Équipe" step={3} />
        <StepperDivider active={step >= 4} />
        <StepperItem active={step >= 4} current={step === 4} label="Résumé" step={4} />
      </div>

      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-10 items-start">
        {/* Main Card */}
        <div className="flex-1 w-full bg-white rounded-[24px] border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.025)] overflow-hidden">
          <div className="p-8 md:p-12">
            {step === 1 && <StepAtelier draft={draft} setField={setField} />}
            {step === 2 && <StepSettings draft={draft} setField={setField} />}
            {step === 3 && <StepTeam team={teamDraft} setTeam={setTeamDraft} />}
            {step === 4 && <StepSummary draft={draft} team={teamDraft} />}

            {/* Navigation Buttons */}
            <div className="mt-14 pt-8 border-t border-[#FFFFFF] flex items-center justify-between">
              {step > 1 ? (
                <SecondaryButton onClick={prevStep} className="h-12 px-6 rounded-[14px] gap-2 text-[#667085]">
                  <ChevronLeft className="size-4" /> Retour
                </SecondaryButton>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <PrimaryButton
                  onClick={nextStep}
                  className="h-12 px-8 rounded-[14px] gap-2"
                  disabled={step === 1 && !canAdvanceStep1}
                >
                  Suivant <ChevronRight className="size-4" />
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="h-12 px-8 rounded-[14px] gap-2 bg-[#2A9D8F] hover:bg-[#238579]"
                >
                  {isSaving ? (
                    <>
                      Synchronisation… <Loader2 className="size-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Terminer la configuration <ArrowRight className="size-4" />
                    </>
                  )}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info/Preview */}
        <div className="hidden lg:block w-[280px] space-y-5 shrink-0">
          <div className="p-5 bg-white rounded-[18px] border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
            <p className="text-[#667085] text-[11px] font-medium uppercase tracking-wider">Étape {step} sur 4</p>
            <p className="mt-2.5 text-[#101828] text-[14px] leading-relaxed">
              {step === 1 && "L'identité de votre atelier apparaîtra sur tous vos documents officiels."}
              {step === 2 && "Définissez vos règles de facturation et la numérotation automatique."}
              {step === 3 && "Ajoutez vos collaborateurs pour suivre qui fait quoi."}
              {step === 4 && "Vérifiez une dernière fois vos informations avant de commencer."}
            </p>
          </div>

          {step === 1 && draft.name && (
            <div className="p-5 bg-white rounded-[18px] border border-[#E4E7EC]">
              <p className="text-[11px] font-medium text-[#667085] uppercase tracking-wider mb-4">Aperçu</p>
              <div className="flex items-center gap-3">
                {draft.logoUrl ? (
                  <img src={draft.logoUrl} className="size-10 rounded-[10px] object-cover" />
                ) : (
                  <div className="size-10 rounded-[10px] bg-[#FFFFFF] flex items-center justify-center text-[#98A2B3]">
                    <Building2 className="size-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-[#101828] text-[14px] truncate">{draft.name}</p>
                  <p className="text-[#667085] text-[12px] truncate">{draft.city || "Ville non définie"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components for Steps ---

function StepAtelier({ draft, setField }: any) {
  const isSwiss = draft.country === "CH";
  const legalFields = getLegalFieldsByCountry(draft.country);
  const phone = phoneParts(draft.phone);
  const phoneLocal = formatPhoneLocal(phone.prefix, phone.local);
  const postalCities = cityByPostalCode[normalizeSpaces(draft.postalCode)] ?? [];
  const setInternationalPhone = (prefixValue: string, localValue: string) => {
    const normalizedPrefix = `+${digitsOnly(prefixValue).slice(0, 4) || "33"}`;
    const local = formatPhoneLocal(normalizedPrefix, localValue);
    setField("phone", local ? `${normalizedPrefix} ${local}` : normalizedPrefix);
  };
  const setPostalCode = (value: string) => {
    const postalCode = digitsOnly(value).slice(0, isSwiss ? 4 : 5);
    setField("postalCode", postalCode);
    const cities = cityByPostalCode[postalCode] ?? [];
    if (cities.length > 0 && (!draft.city || !cities.includes(draft.city))) setField("city", cities[0]);
  };
  const setCountry = (country: "FR" | "CH") => {
    const config = getWorkshopCountryConfig(country);
    setField("country", country);
    setField("currency", config.currency);
    setField("defaultPhonePrefix", config.phonePrefix);
    setField("phone", config.phonePrefix);
    setField("postalCode", "");
    setField("city", "");
    setField("vatApplicable", false);
    setField("taxRegime", "not_subject_to_vat");
    setField("vatRate", 0);
    setField("tvaMention", country === "CH" ? "Non assujetti à la TVA" : "TVA non applicable, art. 293 B du CGI");
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-[26px] font-semibold text-[#101828] tracking-tight">Configurez votre atelier</h2>
        <p className="mt-2 text-[#667085] text-[15px]">Renseignez les informations principales de votre entreprise.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        <Field label="Pays de l'atelier *">
          <select
            className={cn(inputCls, "appearance-none")}
            value={draft.country || "FR"}
            onChange={(event) => setCountry(event.target.value as "FR" | "CH")}
          >
            <option value="FR">France</option>
            <option value="CH">Suisse</option>
          </select>
        </Field>
        <Field label="Devise">
          <input className={cn(inputCls, "bg-[#FFFFFF] text-[#667085]")} value={isSwiss ? "CHF" : "EUR"} readOnly />
        </Field>
        <Field label="Nom de l'atelier *" placeholder="Ex: Phone Repair Expert">
          <input className={inputCls} value={draft.name} onChange={(e) => setField("name", e.target.value)} />
        </Field>
        <Field label="Nom commercial (optionnel)" placeholder="Ex: SARL Behar Tech">
          <input
            className={inputCls}
            value={draft.commercialName}
            onChange={(e) => setField("commercialName", e.target.value)}
          />
        </Field>
        <Field label="Téléphone *" placeholder="6 12 34 56 78">
          <div className="grid grid-cols-[132px_1fr] gap-2">
            <select
              aria-label="Indicatif téléphonique"
              className={cn(inputCls, "px-3 appearance-none")}
              value={callingCodeOptions.some((option) => option.code === phone.prefix) ? phone.prefix : "+33"}
              onChange={(e) => setInternationalPhone(e.target.value, phone.local)}
            >
              {callingCodeOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Numéro de téléphone"
              className={inputCls}
              inputMode="tel"
              value={phoneLocal}
              onChange={(e) => setInternationalPhone(phone.prefix, e.target.value)}
              placeholder={phone.prefix === "+33" ? "6 12 34 56 78" : "Numéro"}
            />
          </div>
        </Field>
        <Field label="Email *" placeholder="contact@reparateur.fr">
          <input className={inputCls} value={draft.email} onChange={(e) => setField("email", e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field
            label="Mode d’accueil client *"
            hint="Ce choix adapte automatiquement les options proposées dans votre widget."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["shop", Store, "En boutique", "Les clients peuvent venir directement."],
                  ["mobile", Truck, "Déplacement uniquement", "Aucune invitation à passer en boutique."],
                  ["hybrid", Sparkles, "Boutique + déplacement", "Vous proposez les deux possibilités."],
                ] as const
              ).map(([value, Icon, label, description]) => {
                const selected = (draft.customerReceptionMode || "shop") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setField("customerReceptionMode", value)}
                    className={cn(
                      "rounded-[16px] border p-4 text-left transition",
                      selected
                        ? "border-[#2A9D8F] bg-[#F1FAF8] shadow-[0_0_0_3px_rgba(42,157,143,0.08)]"
                        : "border-[#E4E7EC] bg-white hover:border-[#2A9D8F]/45",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <Icon className="size-5 text-[#2A9D8F]" />
                      {selected ? <Check className="size-4 text-[#167B70]" /> : null}
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-[#101828]">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#667085]">{description}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Adresse complète *" placeholder="12 rue de la Paix">
            <input className={inputCls} value={draft.address} onChange={(e) => setField("address", e.target.value)} />
          </Field>
        </div>
        <Field label={`${legalFields.postalCodeLabel} *`} placeholder={isSwiss ? "1201" : "75000"}>
          <input
            className={inputCls}
            inputMode="numeric"
            value={draft.postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </Field>
        <Field label="Ville *" placeholder={isSwiss ? "Genève" : "Paris"}>
          {postalCities.length ? (
            <select
              className={cn(inputCls, "appearance-none")}
              value={draft.city || postalCities[0]}
              onChange={(e) => setField("city", e.target.value)}
            >
              {postalCities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          ) : (
            <input className={inputCls} value={draft.city} onChange={(e) => setField("city", e.target.value)} />
          )}
        </Field>
        {isSwiss ? (
          <>
            <Field label="Canton *" placeholder="Genève">
              <input
                className={inputCls}
                value={draft.swissCanton || ""}
                onChange={(e) => setField("swissCanton", e.target.value)}
              />
            </Field>
            <Field label="IDE / UID entreprise suisse" placeholder="CHE-123.456.789">
              <input
                className={inputCls}
                value={draft.swissUid || ""}
                onChange={(e) => setField("swissUid", e.target.value)}
              />
            </Field>
            {draft.vatApplicable ? (
              <Field label="Numéro TVA suisse *" placeholder="CHE-123.456.789 TVA">
                <input
                  className={inputCls}
                  value={draft.swissVatNumber || ""}
                  onChange={(e) => setField("swissVatNumber", e.target.value)}
                />
              </Field>
            ) : null}
          </>
        ) : (
          <>
            <Field
              label="SIRET"
              placeholder="12345678900012"
              hint="Optionnel à cette étape. L’immatriculation sera vérifiée depuis votre compte."
            >
              <input
                className={inputCls}
                value={draft.siret}
                inputMode="numeric"
                onChange={(e) => setField("siret", digitsOnly(e.target.value).slice(0, 14))}
              />
            </Field>
            <Field label="TVA Intracommunautaire (optionnel)">
              <input
                className={inputCls}
                value={draft.tvaNumber}
                onChange={(e) => setField("tvaNumber", e.target.value)}
              />
            </Field>
          </>
        )}

        <div className="md:col-span-2 mt-4">
          <p className="text-sm font-medium text-[#101828] mb-3">Logo de l'atelier</p>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#E4E7EC] rounded-2xl bg-[#FFFFFF] cursor-pointer hover:bg-[#FFFFFF] transition group">
            {draft.logoUrl ? (
              <div className="flex items-center gap-4 px-6 w-full">
                <img src={draft.logoUrl} className="size-16 rounded-xl object-cover shadow-sm" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#101828]">Logo sélectionné</p>
                  <p className="text-xs text-[#667085]">Cliquez pour changer d'image</p>
                </div>
                <div className="size-8 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center group-hover:border-[#2A9D8F] transition">
                  <RefreshCw className="size-4 text-[#98A2B3] group-hover:text-[#2A9D8F]" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="size-8 text-[#98A2B3] mb-2 group-hover:text-[#2A9D8F] transition" />
                <p className="text-sm text-[#667085]">Cliquez pour ajouter votre logo</p>
                <p className="text-[11px] text-[#98A2B3]">PNG, JPG ou SVG (max. 2Mo)</p>
              </div>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => setField("logoUrl", reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function StepSettings({ draft, setField }: any) {
  const isSwiss = draft.country === "CH";
  const setVatApplicable = (applicable: boolean) => {
    setField("vatApplicable", applicable);
    setField("taxRegime", applicable ? "vat_subject" : "not_subject_to_vat");
    setField("vatRate", applicable ? (isSwiss ? 8.1 : 20) : 0);
    setField(
      "tvaMention",
      applicable ? "" : isSwiss ? "Non assujetti à la TVA" : "TVA non applicable, art. 293 B du CGI",
    );
  };
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-[26px] font-semibold text-[#101828] tracking-tight">Paramètres de fonctionnement</h2>
        <p className="mt-2 text-[#667085] text-[15px]">Définissez les règles principales de votre atelier.</p>
      </div>

      <div className="space-y-8">
        <BusinessHoursEditor
          value={draft.weeklyHours}
          compact
          onChange={(weeklyHours) => {
            setField("weeklyHours", weeklyHours);
            setField("businessHours", formatWorkshopWeeklyHours(weeklyHours));
          }}
        />

        {/* Regime TVA */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-[#101828]">Régime de TVA</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setVatApplicable(false)}
              className={cn(
                "p-5 rounded-2xl border-2 text-left transition",
                !draft.vatApplicable
                  ? "border-[#2A9D8F] bg-[#FFFFFF]"
                  : "border-[#E4E7EC] bg-white hover:border-[#98A2B3]",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-[#101828]">
                  {isSwiss ? "Non assujetti à la TVA suisse" : "TVA non applicable"}
                </p>
                {!draft.vatApplicable && <CheckCircle2 className="size-5 text-[#2A9D8F]" />}
              </div>
              <p className="text-xs text-[#667085] leading-relaxed">
                {isSwiss
                  ? "Aucune TVA calculée. La mention suisse sera ajoutée aux documents."
                  : "Article 293 B du CGI. Vos prix seront affichés nets de taxe."}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setVatApplicable(true)}
              className={cn(
                "p-5 rounded-2xl border-2 text-left transition",
                draft.vatApplicable
                  ? "border-[#2A9D8F] bg-[#FFFFFF]"
                  : "border-[#E4E7EC] bg-white hover:border-[#98A2B3]",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-[#101828]">
                  TVA applicable ({String(isSwiss ? 8.1 : 20).replace(".", ",")} %)
                </p>
                {draft.vatApplicable && <CheckCircle2 className="size-5 text-[#2A9D8F]" />}
              </div>
              <p className="text-xs text-[#667085] leading-relaxed">
                Les documents afficheront HT / TVA / TTC avec le taux configuré.
              </p>
            </button>
          </div>
          {draft.vatApplicable ? (
            <Field label="Taux de TVA">
              <select
                className={cn(inputCls, "appearance-none")}
                value={draft.vatRate || (isSwiss ? 8.1 : 20)}
                onChange={(event) => setField("vatRate", Number(event.target.value))}
              >
                {(isSwiss ? [8.1, 3.8, 2.6] : [20, 10, 5.5]).map((rate) => (
                  <option key={rate} value={rate}>
                    {String(rate).replace(".", ",")} %
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>

        {/* Prefixes */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-[#101828]">Préfixes des documents</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Réparations">
              <input
                className={inputCls}
                value={draft.repairPrefix}
                onChange={(e) => setField("repairPrefix", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Devis">
              <input
                className={inputCls}
                value={draft.quotePrefix}
                onChange={(e) => setField("quotePrefix", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Factures">
              <input
                className={inputCls}
                value={draft.invoicePrefix}
                onChange={(e) => setField("invoicePrefix", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Reçus">
              <input
                className={inputCls}
                value={draft.receiptPrefix}
                onChange={(e) => setField("receiptPrefix", e.target.value.toUpperCase())}
              />
            </Field>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-[#101828]">Conditions et mentions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Conditions devis">
              <textarea
                className={cn(inputCls, "h-24 py-3 resize-none")}
                value={draft.quoteTerms}
                onChange={(e) => setField("quoteTerms", e.target.value)}
              />
            </Field>
            <Field label="Conditions facture">
              <textarea
                className={cn(inputCls, "h-24 py-3 resize-none")}
                value={draft.invoiceTerms}
                onChange={(e) => setField("invoiceTerms", e.target.value)}
              />
            </Field>
            <Field label="Conditions bon de prise en charge">
              <textarea
                className={cn(inputCls, "h-24 py-3 resize-none")}
                value={draft.intakeTerms || ""}
                onChange={(e) => setField("intakeTerms", e.target.value)}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Pied de page documents">
                <textarea
                  className={cn(inputCls, "h-20 py-3 resize-none")}
                  value={draft.documentFooter}
                  onChange={(e) => setField("documentFooter", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTeam({ team, setTeam }: { team: Omit<TeamMember, "id">[]; setTeam: any }) {
  const addMember = () => {
    setTeam([...team, { firstName: "", lastName: "", role: "Technicien" }]);
  };

  const removeMember = (index: number) => {
    if (team.length === 1) return toast.error("Il doit y avoir au moins un membre.");
    setTeam(team.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, patch: any) => {
    setTeam(team.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[26px] font-semibold text-[#101828] tracking-tight">Configurez votre équipe</h2>
          <p className="mt-2 text-[#667085] text-[15px]">Ajoutez les personnes qui travaillent dans l'atelier.</p>
        </div>
        <SecondaryButton onClick={addMember} className="h-11 rounded-[14px] gap-2 text-[#101828]">
          <UserPlus className="size-4" /> Ajouter un membre
        </SecondaryButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {team.map((member, index) => (
          <div key={index} className="p-6 rounded-[24px] border border-[#E4E7EC] bg-[#FFFFFF] relative group">
            <button
              onClick={() => removeMember(index)}
              className="absolute top-4 right-4 p-2 text-[#98A2B3] hover:text-[#E63946] transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="size-12 rounded-full bg-white border border-[#E4E7EC] flex items-center justify-center text-[#2A9D8F] font-bold text-lg shadow-sm">
                {member.firstName[0] || "?"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#101828]">
                  {member.firstName || "Prénom"} {member.lastName}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#E4E7EC] text-[#667085] text-[10px] font-bold uppercase tracking-wider">
                  {member.role}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom">
                  <input
                    className={cn(inputCls, "h-9 bg-white text-xs")}
                    value={member.firstName}
                    onChange={(e) => updateMember(index, { firstName: e.target.value })}
                  />
                </Field>
                <Field label="Nom">
                  <input
                    className={cn(inputCls, "h-9 bg-white text-xs")}
                    value={member.lastName}
                    onChange={(e) => updateMember(index, { lastName: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Rôle">
                <select
                  className={cn(inputCls, "h-9 bg-white text-xs appearance-none")}
                  value={member.role}
                  onChange={(e) => updateMember(index, { role: e.target.value })}
                >
                  <option>Gérant</option>
                  <option>Technicien</option>
                  <option>Comptoir</option>
                  <option>Vente</option>
                  <option>Administratif</option>
                  <option>Autre</option>
                </select>
              </Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepSummary({ draft, team }: { draft: WorkshopSettings; team: any[] }) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-[26px] font-semibold text-[#101828] tracking-tight">Votre atelier est prêt</h2>
        <p className="mt-2 text-[#667085] text-[15px]">
          Vérifiez une dernière fois vos informations avant de commencer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SummarySection title="Identité Atelier">
          <div className="flex items-center gap-4 mb-4">
            {draft.logoUrl ? (
              <img src={draft.logoUrl} className="size-12 rounded-xl object-cover" />
            ) : (
              <div className="size-12 rounded-xl bg-[#FFFFFF] border border-[#E4E7EC] flex items-center justify-center text-[#98A2B3]">
                <Building2 className="size-6" />
              </div>
            )}
            <div>
              <p className="font-semibold text-[#101828]">{draft.name}</p>
              <p className="text-xs text-[#667085]">
                {draft.city}, {draft.country === "CH" ? "Suisse" : "France"}
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-[#FFFFFF]">
            <SummaryItem icon={<Phone className="size-3" />} label={draft.phone} />
            <SummaryItem icon={<Mail className="size-3" />} label={draft.email} />
            <SummaryItem
              icon={<FileText className="size-3" />}
              label={
                draft.country === "CH" ? `IDE / CHE : ${draft.swissUid || "Non renseigné"}` : `SIRET: ${draft.siret}`
              }
            />
          </div>
        </SummarySection>

        <SummarySection title="Facturation & Équipe">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-1">Régime TVA</p>
              <p className="text-sm font-medium text-[#101828]">
                {draft.vatApplicable
                  ? `TVA applicable (${String(draft.vatRate || (draft.country === "CH" ? 8.1 : 20)).replace(".", ",")} %)`
                  : draft.country === "CH"
                    ? "Non assujetti à la TVA"
                    : "TVA non applicable (franchise en base)"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-1">Préfixes</p>
              <div className="flex gap-3">
                <span className="text-xs bg-[#FFFFFF] px-2 py-1 rounded-md text-[#667085] font-mono">
                  {draft.repairPrefix}
                </span>
                <span className="text-xs bg-[#FFFFFF] px-2 py-1 rounded-md text-[#667085] font-mono">
                  {draft.invoicePrefix}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">
                Équipe ({team.length})
              </p>
              <div className="flex -space-x-2">
                {team.map((m: any, i: number) => (
                  <div
                    key={i}
                    className="size-8 rounded-full border-2 border-white bg-[#FFFFFF] flex items-center justify-center text-[#2A9D8F] text-[10px] font-bold shadow-sm ring-1 ring-[#E4E7EC]/20"
                  >
                    {m.firstName[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SummarySection>
      </div>

      <div className="p-6 rounded-[24px] bg-[#2A9D8F]/5 border border-[#2A9D8F]/20 flex items-center gap-4">
        <div className="size-12 rounded-full bg-[#2A9D8F] flex items-center justify-center text-white shadow-lg">
          <Check className="size-6" />
        </div>
        <div>
          <p className="font-semibold text-[#101828]">Tout est prêt !</p>
          <p className="text-[#667085] text-sm">Cliquez sur le bouton ci-dessous pour accéder à votre dashboard.</p>
        </div>
      </div>
    </div>
  );
}

// --- Primitives ---

function StepperItem({
  active,
  current,
  label,
  step,
}: {
  active: boolean;
  current: boolean;
  label: string;
  step: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "size-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all duration-500",
          current ? "bg-[#101828] text-white" : active ? "bg-[#FFFFFF] text-[#2A9D8F]" : "bg-[#FFFFFF] text-[#98A2B3]",
        )}
      >
        {active && !current ? <Check className="size-3.5" /> : step}
      </div>
      <span
        className={cn(
          "text-[12px] font-medium transition-all duration-500",
          current ? "text-[#101828]" : active ? "text-[#667085]" : "text-[#98A2B3]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function StepperDivider({ active }: { active: boolean }) {
  return (
    <div className="flex-1 h-px mx-4 bg-[#FFFFFF] relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 bg-[#2A9D8F] transition-all duration-700 ease-in-out",
          active ? "translate-x-0" : "-translate-x-full",
        )}
      />
    </div>
  );
}

function Field({ label, placeholder, children, hint }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#101828] block">{label}</label>
      {children || <input className={inputCls} placeholder={placeholder} />}
      {hint && <p className="text-[12px] text-[#98A2B3] px-0.5">{hint}</p>}
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-[20px] border border-[#E4E7EC] bg-white">
      <p className="text-[13px] font-medium text-[#667085] uppercase tracking-wider mb-5">{title}</p>
      {children}
    </div>
  );
}

function SummaryItem({ icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[#667085] text-[13px]">
      <span className="text-[#98A2B3]">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

const inputCls =
  "h-12 w-full rounded-[14px] border border-[#E4E7EC] bg-white px-4 text-[#101828] text-[15px] outline-none transition-all duration-200 hover:border-[#D0D5DD] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/8 placeholder:text-[#98A2B3]";
