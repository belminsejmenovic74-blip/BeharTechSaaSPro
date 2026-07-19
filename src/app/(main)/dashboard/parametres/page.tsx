"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AlertTriangle,
  Building2,
  Check,
  CloudDownload,
  CloudUpload,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  Phone,
  Shield,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { LicenseCard } from "@/components/behar/license-card";
import { BusinessHoursEditor } from "@/components/behar/business-hours-editor";
import { ExternalPaymentIntegrations } from "@/components/behar/external-payment-integrations";
import { PageShell } from "@/components/behar/page-shell";
import { Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { UpdateChecker } from "@/components/behar/update-checker";
import { useBeharStore, type WorkshopSettings } from "@/lib/behar-store";
import { sanitizePaymentDataForPersistence } from "@/lib/payment-data-boundary";
import { createBillingProfile, getLegalFieldsByCountry, getWorkshopCountryConfig } from "@/lib/workshop-country";
import { formatWorkshopWeeklyHours } from "@/lib/workshop-hours";
import {
  hydrateStoreFromCloud,
  loadSnapshotByLicenseKey,
  normalizeLicenseKey,
  saveSnapshotState,
  subscribeWorkshopSyncState,
} from "@/lib/workshop-sync";

/* ── Tabs ──────────────────────────────────────────── */
const TABS = [
  { key: "atelier", label: "Informations atelier", href: "/dashboard/parametres" },
  { key: "appareils", label: "Catalogue appareils", href: "/dashboard/parametres/appareils" },
  { key: "catalogue", label: "Tarifs & prestations", href: "/dashboard/parametres/catalogue" },
  { key: "reconditionnement", label: "Reconditionnement", href: "/dashboard/parametres/reconditionnement" },
  { key: "equipe", label: "Équipe & permissions", href: "/dashboard/parametres/equipe" },
] as const;

const SETTING_GROUPS = [
  { key: "atelier", label: "Atelier & contact" },
  { key: "horaires", label: "Horaires & rendez-vous" },
  { key: "legal", label: "Fiscalité & licence" },
  { key: "integrations", label: "Intégrations & paiements" },
  { key: "documents", label: "Documents & sauvegarde" },
] as const;

/* ── Helpers ──────────────────────────────────────── */
const inputCls =
  "h-11 w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 text-[15px] text-[#1A1916] outline-none transition-all duration-200 placeholder:text-[#A3A3A3] hover:border-[#DADADA] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/8";
const areaCls =
  "min-h-[88px] w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 py-3 text-[15px] text-[#1A1916] outline-none transition-all duration-200 placeholder:text-[#A3A3A3] hover:border-[#DADADA] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/8";
const selectCls =
  "h-11 w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 text-[15px] text-[#1A1916] outline-none transition-all duration-200 hover:border-[#DADADA] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/8 appearance-none";

const blockedValues = new Set(["hj", "test", "undefined", "null", "nan", "none", "aucun", "n/a"]);

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
  const raw = normalizeSpaces(value);
  const compact = raw.replace(/[\s().-]/g, "");
  if (!/^\+\d{7,15}$/.test(compact)) return false;
  if (compact.startsWith("+33")) return /^\+33[1-9]\d{8}$/.test(compact);
  return true;
}

function isValidEmail(value: unknown): boolean {
  const email = normalizeSpaces(value);
  if (blockedValues.has(email.toLowerCase())) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isInvalidLegalNumber(value: unknown, length: number): boolean {
  const digits = digitsOnly(value);
  return digits.length !== length || /^0+$/.test(digits) || /^123+$/.test(digits);
}

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

function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-[#1A1916]">
        {label}
        {required && <span className="text-[#2A9D8F] ml-0.5">*</span>}
      </span>
      {children}
      {error && <p className="text-[12px] text-[#DC3545] font-medium">{error}</p>}
      {hint && !error && <p className="text-[11px] text-[#8A8A8A]">{hint}</p>}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: any;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={`p-6 ${className || ""}`}>
      <div className="flex items-start gap-3 mb-5">
        <div className="size-9 rounded-[12px] bg-[#FFFFFF] flex items-center justify-center text-[#2A9D8F] shrink-0">
          <Icon className="size-[18px]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#1A1916] text-[15px] tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-[12px] text-[#8A8A8A] leading-relaxed">{description}</p>}
        </div>
      </div>
      {children}
    </Panel>
  );
}

/* ── Page ─────────────────────────────────────────── */
export default function SettingsPage() {
  const store = useBeharStore();
  const canViewSettings = store.hasPermission("canViewSettings");
  const canEditSettings = store.hasPermission("canEditSettings");
  const canExportData = store.hasPermission("canExportData");
  const canImportData = store.hasPermission("canImportData");
  const canBackupData = store.hasPermission("canBackupData");
  const importRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<WorkshopSettings>(store.workshopSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(true);
  const [activeGroup, setActiveGroup] = useState<(typeof SETTING_GROUPS)[number]["key"]>("atelier");
  const pathname = usePathname();

  const setField = <K extends keyof WorkshopSettings>(key: K, value: WorkshopSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const name = normalizeSpaces(draft.name);
    const commercialName = normalizeSpaces(draft.commercialName);
    const address = normalizeSpaces(draft.address);
    const city = normalizeSpaces(draft.city);
    const postalCode = normalizeSpaces(draft.postalCode);
    const isSwiss = draft.country === "CH";
    const isOther = draft.country === "autre";
    const siret = digitsOnly(draft.siret);

    if (isWeakText(name)) e.name = "Renseignez un nom d'atelier réel.";
    if (commercialName && isWeakText(commercialName))
      e.commercialName = "Renseignez un nom commercial réel ou laissez vide.";
    if (!isValidPhoneNumber(draft.phone)) e.phone = "Numéro international requis : indicatif puis 7 à 15 chiffres.";
    if (!isValidEmail(draft.email)) e.email = "Renseignez un email valide.";
    if (isWeakText(address, 6)) e.address = "Adresse complète obligatoire.";
    if (!isOther) {
      if (!(isSwiss ? /^\d{4}$/ : /^\d{5}$/).test(postalCode) || /^0+$/.test(postalCode)) {
        e.postalCode = isSwiss ? "NPA suisse attendu sur 4 chiffres." : "Code postal obligatoire à 5 chiffres.";
      }
    } else {
      if (!postalCode) {
        e.postalCode = "Code postal obligatoire.";
      }
    }
    if (isWeakText(city)) e.city = "Renseignez une ville réelle.";
    if (draft.country === "FR" && isInvalidLegalNumber(siret, 14)) {
      e.siret = "SIRET obligatoire : 14 chiffres, hors valeurs de test.";
    }
    if (typeof draft.vatApplicable !== "boolean") e.vatApplicable = "Sélectionnez un régime de TVA.";
    if (draft.vatApplicable && (!Number.isFinite(Number(draft.vatRate)) || Number(draft.vatRate) <= 0)) {
      e.vatRate = "Renseignez un taux de TVA valide.";
    }
    if (draft.country === "FR" && draft.tvaNumber && isWeakText(draft.tvaNumber, 4))
      e.tvaNumber = "Numéro TVA invalide.";
    if (draft.tvaMention && isWeakText(draft.tvaMention, 8)) e.tvaMention = "Mention TVA trop courte ou invalide.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!store.requirePermission("canEditSettings", "Enregistrer les paramètres")) {
      toast.error("Action réservée au gérant/admin.");
      return;
    }
    if (!validate()) {
      toast.error("Corrigez les erreurs avant d'enregistrer.");
      return;
    }
    const city = normalizeSpaces(draft.city);
    const postalCode = normalizeSpaces(draft.postalCode);
    const isSwiss = draft.country === "CH";
    const siret = isSwiss ? "" : draft.country === "autre" ? draft.siret : digitsOnly(draft.siret);
    store.saveWorkshopSettings({
      ...draft,
      defaultMarket: draft.defaultMarket || (isSwiss ? "CH" : "FR"),
      allowedMarkets:
        draft.allowedMarkets && draft.allowedMarkets.length > 0
          ? draft.allowedMarkets
          : [draft.defaultMarket || (isSwiss ? "CH" : "FR")],
      name: normalizeSpaces(draft.name),
      commercialName: normalizeSpaces(draft.commercialName),
      phone: normalizeSpaces(draft.phone),
      email: normalizeSpaces(draft.email).toLowerCase(),
      address: normalizeSpaces(draft.address),
      postalCode,
      city,
      siret,
      country: draft.country,
      currency: isSwiss ? "CHF" : "EUR",
      taxRegime: draft.vatApplicable ? "vat_subject" : "not_subject_to_vat",
      defaultPhonePrefix: isSwiss ? "+41" : "+33",
      tvaNumber: isSwiss ? "" : normalizeSpaces(draft.tvaNumber),
      swissUid: isSwiss ? normalizeSpaces(draft.swissUid) : "",
      swissVatNumber: isSwiss && draft.vatApplicable ? normalizeSpaces(draft.swissVatNumber) : "",
      swissCanton: isSwiss ? normalizeSpaces(draft.swissCanton) : "",
      postalCity: [postalCode, city].filter(Boolean).join(" ").trim(),
      isMicroEnterprise: !draft.vatApplicable,
      vatRate: draft.vatApplicable ? Number(draft.vatRate ?? (isSwiss ? 8.1 : 20)) : 0,
      tvaMention: draft.vatApplicable
        ? ""
        : isSwiss
          ? "TVA non facturée — entreprise non assujettie à la TVA suisse."
          : normalizeSpaces(draft.tvaMention),
    });
    setSaved(true);
    toast.success("Paramètres enregistrés.");
  };

  const dataSnapshot = useMemo(
    () => ({
      workshopSettings: store.workshopSettings,
      workshopInfo: store.workshopInfo,
      onboardingCompleted: store.onboardingCompleted,
      configuredAt: store.configuredAt,
      updatedAt: store.updatedAt,
      customers: store.customers,
      repairs: store.repairs,
      quotes: store.quotes,
      invoices: store.invoices,
      appointments: store.appointments,
      stockItems: store.stockItems,
      documents: store.documents,
      messageLogs: store.messageLogs,
      selectedCustomerId: store.selectedCustomerId,
      selectedRepairId: store.selectedRepairId,
      selectedQuoteId: store.selectedQuoteId,
      selectedInvoiceId: store.selectedInvoiceId,
      selectedAppointmentId: store.selectedAppointmentId,
      selectedStockItemId: store.selectedStockItemId,
      selectedDocumentId: store.selectedDocumentId,
    }),
    [store],
  );

  const exportJson = () => {
    if (!store.requirePermission("canExportData", "Exporter les données")) {
      toast.error("Export réservé au gérant/admin.");
      return;
    }
    const safeSnapshot = sanitizePaymentDataForPersistence(dataSnapshot);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state: safeSnapshot }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `behar-tech-donnees-atelier-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    if (!store.requirePermission("canImportData", "Importer les données")) {
      toast.error("Import réservé au gérant/admin.");
      return;
    }
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedState = sanitizePaymentDataForPersistence(parsed.state ?? parsed);
      localStorage.setItem("behar-tech-local-demo-v3", JSON.stringify({ state: importedState, version: 1 }));
      toast.success("Import terminé. Rechargement...");
      window.location.reload();
    } catch {
      toast.error("Import impossible.");
    }
  };

  const siren = digitsOnly(draft.siret)
    .slice(0, 9)
    .replace(/(\d{3})(?=\d)/g, "$1 ");
  const postalCities = cityByPostalCode[normalizeSpaces(draft.postalCode)] ?? [];
  const phone = phoneParts(draft.phone);
  const isSwiss = draft.country === "CH";
  const legalFields = getLegalFieldsByCountry(draft.country);
  const phoneLocal = formatPhoneLocal(phone.prefix, phone.local);
  const setInternationalPhone = (prefixValue: string, localValue: string) => {
    const normalizedPrefix = `+${digitsOnly(prefixValue).slice(0, 4) || "33"}`;
    const local = formatPhoneLocal(normalizedPrefix, localValue);
    setField("phone", local ? `${normalizedPrefix} ${local}` : normalizedPrefix);
  };
  const setPostalCode = (value: string) => {
    const postalCode = digitsOnly(value).slice(0, isSwiss ? 4 : 5);
    setField("postalCode", postalCode);
    const cities = cityByPostalCode[postalCode] ?? [];
    if (cities.length === 1) {
      setField("city", cities[0]);
    } else if (cities.length > 1 && (!draft.city || !cities.includes(draft.city))) {
      setField("city", cities[0]);
    }
  };
  const setCountry = (country: "FR" | "CH" | "autre") => {
    setDraft((prev) => {
      const currentCountry = prev.country === "CH" ? "CH" : prev.country === "FR" ? "FR" : "autre";
      const currentProfile = createBillingProfile(
        {
          country: currentCountry,
          name: prev.name,
          commercialName: prev.commercialName,
          address: prev.address,
          postalCode: prev.postalCode,
          city: prev.city,
          canton: prev.swissCanton,
          phone: prev.phone,
          email: prev.email,
          siret: prev.siret,
          tvaNumber: prev.tvaNumber,
          swissUid: prev.swissUid,
          swissVatNumber: prev.swissVatNumber,
          vatApplicable: prev.vatApplicable,
          vatRate: prev.vatRate,
          tvaMention: prev.tvaMention,
        },
        currentCountry,
      );
      const billingProfiles = {
        ...(prev.billingProfiles ?? {}),
        [currentCountry]: currentProfile,
      };
      const config = getWorkshopCountryConfig(country);
      const target = createBillingProfile(billingProfiles[country] ?? { country }, country);
      const swiss = country === "CH";
      return {
        ...prev,
        billingProfiles,
        country,
        currency: config.currency,
        defaultPhonePrefix: config.phonePrefix,
        name: target.name || prev.name || "",
        commercialName: target.commercialName || prev.commercialName || "",
        address: target.address || prev.address || "",
        postalCode: target.postalCode || prev.postalCode || "",
        city: target.city || prev.city || "",
        postalCity: [target.postalCode, target.city].filter(Boolean).join(" "),
        phone: target.phone || prev.phone || config.phonePrefix,
        email: target.email || prev.email || "",
        siret: swiss ? "" : target.siret || "",
        tvaNumber: swiss ? "" : target.tvaNumber || "",
        swissUid: swiss ? target.swissUid || "" : "",
        swissVatNumber: swiss ? target.swissVatNumber || "" : "",
        swissCanton: swiss ? target.canton || "" : "",
        taxRegime: target.vatApplicable ? "vat_subject" : "not_subject_to_vat",
        vatApplicable: Boolean(target.vatApplicable),
        vatRate: target.vatApplicable ? target.vatRate || config.defaultVatRate : 0,
        tvaMention: target.tvaMention || "",
        acceptedPaymentMethods: swiss
          ? ["Espèces", "TWINT", "Carte externe", "Virement", "Autre"]
          : ["Espèces hors Behar Tech", "TPE externe", "Virement"],
        twintEnabled: swiss,
      };
    });
    setSaved(false);
    setErrors({});
  };

  if (!canViewSettings) {
    return (
      <PageShell title="Réglages" subtitle="Accès réservé au gérant/admin.">
        <Panel className="max-w-xl p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-[12px] bg-[#FFFFFF] text-[#6B6B6B]">
              <Shield className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1A1916] text-lg">Paramètres non accessibles</h2>
              <p className="mt-1 text-[#6B6B6B] text-sm">
                Votre profil actuel ne permet pas d'ouvrir ou modifier les réglages atelier.
              </p>
            </div>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell title="Réglages" subtitle="Identité de l'atelier, fiscalité et préférences.">
      {/* Tabs + Save bar */}
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-4">
        <nav className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto border-b border-[#FFFFFF] lg:w-auto">
          {TABS.map((t) => {
            const isActive =
              t.key === "atelier"
                ? pathname === "/dashboard/parametres"
                : pathname?.includes((t.href as string).split("?")[0]) &&
                  (t.href as string) !== "/dashboard/parametres";
            return (
              <Link
                key={t.key}
                href={t.href}
                prefetch={false}
                className={`shrink-0 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                  isActive || (t.key === "atelier" && pathname === "/dashboard/parametres")
                    ? "border-[#2A9D8F] text-[#1A1916]"
                    : "border-transparent text-[#6B6B6B] hover:text-[#1A1916]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:w-auto">
          <PrimaryButton onClick={save} className="h-10 w-full gap-2 px-5 sm:w-auto" disabled={!canEditSettings}>
            <Check className="size-4" /> Enregistrer les modifications
          </PrimaryButton>
          <span className="max-w-full text-[12px] text-[#8A8A8A] sm:max-w-[180px]">
            {saved ? "Toutes les modifications sont enregistrées" : "Modifications non enregistrées"}
          </span>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto rounded-[18px] border border-[#E8E8E5] bg-white p-2">
        {SETTING_GROUPS.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveGroup(group.key)}
            className={`shrink-0 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition ${
              activeGroup === group.key
                ? "bg-[#E9F7F4] text-[#1E7A6E] shadow-sm"
                : "text-[#6B6B6B] hover:bg-[#F7F7F4] hover:text-[#1A1916]"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {activeGroup === "atelier" ? (
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {/* Col 1 — Identité */}
          <Section
            icon={Building2}
            title="Identité atelier"
            description="Le nom de l'atelier apparaîtra sur vos documents."
          >
            <div className="grid gap-4">
              <Field label="Nom de l'atelier" required error={errors.name}>
                <input
                  className={inputCls}
                  value={draft.name || ""}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </Field>
              <Field label="Nom commercial" hint="Optionnel" error={errors.commercialName}>
                <input
                  className={inputCls}
                  value={draft.commercialName || ""}
                  onChange={(e) => setField("commercialName", e.target.value)}
                />
              </Field>
              <Field label="Site web" hint="Optionnel">
                <input
                  className={inputCls}
                  value={draft.website || ""}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://behartechpro.fr"
                />
              </Field>
              <Field label="Pays de domiciliation" required>
                <select
                  className={selectCls}
                  value={draft.country || "FR"}
                  onChange={(e) => {
                    const newCountry = e.target.value as "FR" | "CH" | "autre";
                    setCountry(newCountry);
                  }}
                >
                  <option value="FR">France</option>
                  <option value="CH">Suisse</option>
                  <option value="autre">Autre</option>
                </select>
              </Field>
              <Field label="Marché principal" required>
                <select
                  className={selectCls}
                  value={
                    draft.allowedMarkets?.includes("FR") && draft.allowedMarkets?.includes("CH")
                      ? "FR-CH"
                      : draft.defaultMarket || "FR"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "FR-CH") {
                      setField("allowedMarkets", ["FR", "CH"]);
                      setField("defaultMarket", draft.country === "CH" ? "CH" : "FR");
                    } else {
                      const country = val as "FR" | "CH";
                      setField("defaultMarket", country);
                      setField("allowedMarkets", [country]);
                    }
                  }}
                >
                  <option value="FR">France</option>
                  <option value="CH">Suisse</option>
                  <option value="FR-CH">Suisse-France</option>
                </select>
              </Field>
              <Field label="Devise par défaut" hint="Déterminée automatiquement par le marché principal.">
                <input
                  className={`${inputCls} bg-[#FFFFFF] text-[#6B6B6B]`}
                  value={
                    draft.allowedMarkets?.includes("FR") && draft.allowedMarkets?.includes("CH")
                      ? "EUR et CHF (Choix modifiable par document)"
                      : draft.defaultMarket === "CH"
                        ? "CHF (Franc suisse)"
                        : "EUR (Euro)"
                  }
                  readOnly
                />
              </Field>
            </div>
          </Section>

          {/* Col 2 — Coordonnées */}
          <Section icon={Phone} title="Coordonnées" description="Ces informations apparaîtront sur vos documents.">
            <div className="grid gap-4">
              <Field label="Téléphone" required error={errors.phone}>
                <div className="grid grid-cols-[132px_1fr] gap-2">
                  <select
                    className={`${selectCls} px-3`}
                    value={callingCodeOptions.some((option) => option.code === phone.prefix) ? phone.prefix : "+33"}
                    onChange={(e) => setInternationalPhone(e.target.value, phone.local)}
                    aria-label="Indicatif téléphonique"
                  >
                    {callingCodeOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} · {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputCls}
                    inputMode="tel"
                    value={phoneLocal}
                    onChange={(e) => setInternationalPhone(phone.prefix, e.target.value)}
                    placeholder={phone.prefix === "+33" ? "6 12 34 56 78" : "Numéro"}
                    aria-label="Numéro de téléphone"
                  />
                </div>
              </Field>
              <Field label="Email" required error={errors.email}>
                <input
                  className={inputCls}
                  type="email"
                  value={draft.email || ""}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </Field>
              <Field label="Adresse" required error={errors.address}>
                <input
                  className={inputCls}
                  value={draft.address || ""}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={legalFields.postalCodeLabel} required error={errors.postalCode}>
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={draft.postalCode || ""}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </Field>
                <Field label="Ville" required error={errors.city}>
                  {postalCities.length > 0 ? (
                    <select
                      className={selectCls}
                      value={draft.city || postalCities[0]}
                      onChange={(e) => setField("city", e.target.value)}
                    >
                      {postalCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputCls}
                      value={draft.city || ""}
                      onChange={(e) => setField("city", e.target.value)}
                    />
                  )}
                </Field>
              </div>
              {isSwiss && (
                <Field label="Canton" hint="Optionnel">
                  <input
                    className={inputCls}
                    value={draft.swissCanton || ""}
                    onChange={(e) => setField("swissCanton", e.target.value)}
                    placeholder="Genève, Vaud, Valais…"
                  />
                </Field>
              )}
            </div>
          </Section>
        </div>
      ) : null}

      {activeGroup === "horaires" ? (
        <div className="max-w-5xl">
          <BusinessHoursEditor
            value={draft.weeklyHours}
            onChange={(weeklyHours) => {
              setDraft((current) => ({
                ...current,
                weeklyHours,
                businessHours: formatWorkshopWeeklyHours(weeklyHours),
              }));
              setSaved(false);
            }}
          />
          <div className="mt-4 rounded-[16px] border border-[#CDEAE5] bg-[#F2FBF9] px-4 py-3 text-sm text-[#245F57]">
            Les rendez-vous du jour restent proposés tant que l'heure du créneau n'est pas passée. Les pauses et jours
            fermés sont automatiquement retirés du widget.
          </div>
        </div>
      ) : null}

      {/* Row 2 */}
      {activeGroup === "legal" ? (
        <>
          <div className="grid gap-5 xl:grid-cols-3 mt-5">
            {/* Informations légales */}
            <Section
              icon={Shield}
              title="Informations légales"
              description="Ces informations apparaîtront sur vos documents."
            >
              <div className="grid gap-4">
                {draft.country === "FR" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="SIREN" hint="9 chiffres">
                        <input
                          className={`${inputCls} bg-[#FFFFFF] text-[#6B6B6B]`}
                          value={siren}
                          readOnly
                          aria-readonly="true"
                        />
                      </Field>
                      <Field label="SIRET" required error={errors.siret} hint="14 chiffres">
                        <div className="relative">
                          <input
                            className={inputCls}
                            inputMode="numeric"
                            value={draft.siret || ""}
                            onChange={(e) => setField("siret", digitsOnly(e.target.value).slice(0, 14))}
                          />
                          {draft.siret && /^\d{14}$/.test(digitsOnly(draft.siret)) && !errors.siret && (
                            <Check className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#2A9D8F]" />
                          )}
                        </div>
                      </Field>
                    </div>
                    <Field label="TVA Intracommunautaire" hint="Optionnel" error={errors.tvaNumber}>
                      <input
                        className={inputCls}
                        value={draft.tvaNumber || ""}
                        onChange={(e) => setField("tvaNumber", e.target.value)}
                      />
                    </Field>
                  </>
                )}

                {draft.country === "CH" && (
                  <>
                    <Field label="Identifiant entreprise / IDE / UID" hint="Optionnel">
                      <input
                        className={inputCls}
                        value={draft.swissUid || ""}
                        onChange={(e) => setField("swissUid", e.target.value)}
                        placeholder="CHE-123.456.789"
                      />
                    </Field>
                    {draft.vatApplicable && (
                      <Field label="Numéro TVA suisse" error={errors.swissVatNumber} hint="Optionnel">
                        <input
                          className={inputCls}
                          value={draft.swissVatNumber || ""}
                          onChange={(e) => setField("swissVatNumber", e.target.value)}
                          placeholder="CHE-123.456.789 TVA"
                        />
                      </Field>
                    )}
                  </>
                )}

                {draft.country === "autre" && (
                  <>
                    <Field label="Identifiant entreprise" hint="Optionnel" error={errors.siret}>
                      <input
                        className={inputCls}
                        value={draft.siret || ""}
                        onChange={(e) => setField("siret", e.target.value)}
                      />
                    </Field>
                    <Field label="Numéro TVA" hint="Optionnel" error={errors.tvaNumber}>
                      <input
                        className={inputCls}
                        value={draft.tvaNumber || ""}
                        onChange={(e) => setField("tvaNumber", e.target.value)}
                      />
                    </Field>
                  </>
                )}
              </div>
            </Section>

            {/* TVA & documents */}
            <Section
              icon={FileText}
              title="TVA & documents"
              description="Choisissez le régime de TVA pour vos documents."
            >
              <div className="space-y-4">
                <Field label="Régime TVA" required error={errors.vatApplicable}>
                  <select
                    className={selectCls}
                    value={
                      draft.vatApplicable
                        ? draft.vatRate === 8.1
                          ? "vat_subject_ch"
                          : draft.vatRate === 20
                            ? "vat_subject_fr"
                            : "vat_subject_other"
                        : draft.tvaMention === "Exonéré de TVA"
                          ? "exempt"
                          : "not_subject_to_vat"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "vat_subject_fr") {
                        setField("vatApplicable", true);
                        setField("taxRegime", "vat_subject");
                        setField("vatRate", 20);
                        setField("tvaMention", "");
                      } else if (val === "vat_subject_ch") {
                        setField("vatApplicable", true);
                        setField("taxRegime", "vat_subject");
                        setField("vatRate", 8.1);
                        setField("tvaMention", "");
                      } else if (val === "vat_subject_other") {
                        setField("vatApplicable", true);
                        setField("taxRegime", "vat_subject");
                        setField("vatRate", draft.vatRate || 20);
                        setField("tvaMention", "");
                      } else if (val === "exempt") {
                        setField("vatApplicable", false);
                        setField("taxRegime", "not_subject_to_vat");
                        setField("tvaMention", "Exonéré de TVA");
                      } else {
                        setField("vatApplicable", false);
                        setField("taxRegime", "not_subject_to_vat");
                        setField(
                          "tvaMention",
                          isSwiss
                            ? "TVA non facturée — entreprise non assujettie à la TVA suisse."
                            : "TVA non applicable, art. 293 B du CGI",
                        );
                      }
                      setSaved(false);
                    }}
                  >
                    <option value="vat_subject_fr">France (Assujetti à la TVA 20%)</option>
                    <option value="vat_subject_ch">Suisse (Assujetti à la TVA suisse 8.1%)</option>
                    <option value="not_subject_to_vat">Non assujetti (Franchise en base)</option>
                    <option value="exempt">Exonéré</option>
                    <option value="vat_subject_other">Autre / Personnalisé</option>
                  </select>
                </Field>

                {draft.vatApplicable && (
                  <Field label="Taux de TVA" error={errors.vatRate}>
                    <div className="grid grid-cols-3 gap-2">
                      {(isSwiss ? [8.1, 3.8, 2.6] : [20, 10, 5.5]).map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            setField("vatRate", rate);
                            setSaved(false);
                          }}
                          className={`h-11 rounded-[14px] border px-3 text-[13px] font-semibold transition ${
                            Number(draft.vatRate ?? 20) === rate
                              ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                              : "border-[#E8E8E5] bg-white text-[#1A1916] hover:border-[#DADADA]"
                          }`}
                        >
                          {String(rate).replace(".", ",")} %
                        </button>
                      ))}
                    </div>
                    <input
                      className={`${inputCls} mt-2`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={draft.vatRate ?? ""}
                      onChange={(e) => {
                        setField("vatRate", Number(e.target.value));
                        setSaved(false);
                      }}
                      aria-label="Taux de TVA personnalisé"
                      placeholder="Ex: 20"
                    />
                  </Field>
                )}

                {!draft.vatApplicable && (
                  <Field
                    label="Mention affichée sur les documents"
                    hint="Cette mention apparaîtra sur vos devis et factures."
                    error={errors.tvaMention}
                  >
                    <textarea
                      className={areaCls}
                      value={draft.tvaMention || ""}
                      onChange={(e) => setField("tvaMention", e.target.value)}
                      maxLength={120}
                      rows={2}
                    />
                    <p className="text-right text-[10px] text-[#A3A3A3]">{(draft.tvaMention || "").length}/120</p>
                  </Field>
                )}
              </div>
            </Section>

            {/* Licence */}
            <LicenseCard />
          </div>

          {/* Mises à jour application desktop — ligne dédiée plein largeur */}
          <div className="mt-5">
            <UpdateChecker />
          </div>

          {isSwiss && (
            <div className="mt-5">
              <Section
                icon={CreditCard}
                title="Lien externe TWINT"
                description="TWINT reste un service externe : BEHAR TECH PRO ne conserve aucun résultat de paiement."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="TWINT">
                    <button
                      type="button"
                      onClick={() => setField("twintEnabled", !draft.twintEnabled)}
                      className={`h-11 w-full rounded-[14px] border px-4 text-left text-[13px] font-semibold transition ${
                        draft.twintEnabled
                          ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                          : "border-[#E8E8E5] bg-white text-[#6B6B6B]"
                      }`}
                    >
                      {draft.twintEnabled ? "TWINT activé" : "Activer TWINT"}
                    </button>
                  </Field>
                  <Field label="Lien TWINT" hint="Optionnel">
                    <input
                      className={inputCls}
                      value={draft.twintPaymentLink || ""}
                      onChange={(e) => setField("twintPaymentLink", e.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="QR code TWINT / image" hint="URL ou image encodée, optionnel">
                    <input
                      className={inputCls}
                      value={draft.twintQrCode || ""}
                      onChange={(e) => setField("twintQrCode", e.target.value)}
                      placeholder="https://.../qr-twint.png"
                    />
                  </Field>
                  <div className="rounded-[14px] border border-[#E8E8E5] bg-[#FFFFFF] p-4 text-[12px] leading-relaxed text-[#6B6B6B]">
                    Moyens proposés : Espèces · TWINT · Carte externe · Virement · Autre.
                  </div>
                </div>
              </Section>
            </div>
          )}
        </>
      ) : null}

      {/* Row 3 */}
      {activeGroup === "documents" ? (
        <div className="grid gap-5 xl:grid-cols-3 mt-5">
          {/* Sauvegarde */}
          <Section
            icon={Download}
            title="Sauvegarde & export"
            description="Sauvegardez vos données ou exportez vos paramètres."
          >
            <div className="grid gap-3">
              <SecondaryButton className="h-10 w-full" onClick={exportJson} disabled={!canExportData}>
                <Download className="size-4" /> Exporter les paramètres
              </SecondaryButton>
              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImport(file);
                }}
              />
              <SecondaryButton
                className="h-10 w-full"
                onClick={() => importRef.current?.click()}
                disabled={!canImportData}
              >
                <Upload className="size-4" /> Voir les sauvegardes
              </SecondaryButton>
            </div>
            <CloudSyncBlock />
            <InstallAppLink />
            <button
              type="button"
              className="mt-3 flex items-center gap-1.5 text-[12px] text-[#DC3545]/60 hover:text-[#DC3545] transition-colors"
              disabled={!canBackupData}
              onClick={() => {
                if (!store.requirePermission("canBackupData", "Réinitialiser les données")) {
                  toast.error("Réinitialisation réservée au gérant/admin.");
                  return;
                }
                if (window.confirm("Cette action efface les données de l'atelier. Elle est irréversible.")) {
                  store.resetDemo();
                  store.setOnboardingCompleted(false);
                  toast.success("Données réinitialisées.");
                }
              }}
            >
              <AlertTriangle className="size-3" /> Réinitialiser les données
            </button>
          </Section>

          {/* Documents — préfixes & conditions */}
          <Section
            icon={FileText}
            title="Numérotation & conditions"
            description="Préfixes et numéros de vos documents."
          >
            <div className="grid gap-3 grid-cols-2">
              <Field label="Préfixe réparation">
                <input
                  className={inputCls}
                  value={draft.repairPrefix || "REP"}
                  onChange={(e) => setField("repairPrefix", e.target.value)}
                />
              </Field>
              <Field label="N° suivant">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={String(draft.nextRepairNumber || 1)}
                  onChange={(e) => setField("nextRepairNumber", Number(e.target.value) || 1)}
                />
              </Field>
              <Field label="Préfixe devis">
                <input
                  className={inputCls}
                  value={draft.quotePrefix || "DEV"}
                  onChange={(e) => setField("quotePrefix", e.target.value)}
                />
              </Field>
              <Field label="N° suivant">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={String(draft.nextQuoteNumber || 1)}
                  onChange={(e) => setField("nextQuoteNumber", Number(e.target.value) || 1)}
                />
              </Field>
              <Field label="Préfixe facture">
                <input
                  className={inputCls}
                  value={draft.invoicePrefix || "FAC"}
                  onChange={(e) => setField("invoicePrefix", e.target.value)}
                />
              </Field>
              <Field label="N° suivant">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={String(draft.nextInvoiceNumber || 1)}
                  onChange={(e) => setField("nextInvoiceNumber", Number(e.target.value) || 1)}
                />
              </Field>
              <Field label="Préfixe reçu">
                <input
                  className={inputCls}
                  value={draft.receiptPrefix || "REC"}
                  onChange={(e) => setField("receiptPrefix", e.target.value)}
                />
              </Field>
              <Field label="N° suivant">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={String(draft.nextReceiptNumber || 1)}
                  onChange={(e) => setField("nextReceiptNumber", Number(e.target.value) || 1)}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-3">
              <Field label="Conditions devis">
                <textarea
                  className={areaCls}
                  value={draft.quoteTerms || ""}
                  onChange={(e) => setField("quoteTerms", e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Conditions facture">
                <textarea
                  className={areaCls}
                  value={draft.invoiceTerms || ""}
                  onChange={(e) => setField("invoiceTerms", e.target.value)}
                  rows={2}
                />
              </Field>
              <Field
                label="Conditions bon de prise en charge"
                hint="Texte libre ajouté aux mentions du bon de prise en charge."
              >
                <textarea
                  className={areaCls}
                  value={draft.intakeTerms || ""}
                  onChange={(e) => setField("intakeTerms", e.target.value)}
                  rows={3}
                />
              </Field>
              <Field label="Pied de page document">
                <textarea
                  className={areaCls}
                  value={draft.documentFooter || ""}
                  onChange={(e) => setField("documentFooter", e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          </Section>
        </div>
      ) : null}

      {activeGroup === "integrations" ? <ExternalPaymentIntegrations /> : null}

      {/* Sidebar help */}
      <div className="mt-6 rounded-[16px] border border-[#FFFFFF] bg-[#FFFFFF] px-5 py-4 flex items-start gap-3 max-w-sm">
        <HelpCircle className="size-5 text-[#2A9D8F] shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-[#1A1916]">Besoin d'aide ?</p>
          <p className="mt-0.5 text-[12px] text-[#6B6B6B]">Consultez notre centre d'aide ou contactez le support.</p>
          <button
            type="button"
            disabled
            className="mt-2 inline-flex cursor-not-allowed items-center gap-1 text-[12px] font-medium text-[#6B6B6B]"
          >
            Centre d'aide bientôt disponible <ExternalLink className="size-3" />
          </button>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Sauvegarde (auto-sync silencieux, action manuelle optionnelle) ──── */
function CloudSyncBlock() {
  const [busy, setBusy] = useState<"upload" | "restore" | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();

  useEffect(() => {
    setLastSyncedAt(useBeharStore.getState().cloudSync?.lastSyncedAt);
    return subscribeWorkshopSyncState((s) => {
      if (s.lastSyncedAt) setLastSyncedAt(s.lastSyncedAt);
    });
  }, []);

  const onSave = async () => {
    setBusy("upload");
    try {
      const state = useBeharStore.getState();
      const license = normalizeLicenseKey(state.licenseKey);
      if (!license) {
        toast.error("Aucune licence active.");
        return;
      }
      const result = await saveSnapshotState(license, state as any);
      setLastSyncedAt(result.updatedAt);
      toast.success("Données sauvegardées.");
    } catch (error: any) {
      toast.error(error?.message || "Sauvegarde impossible.");
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (!window.confirm("Récupérer la dernière sauvegarde remplace vos données actuelles. Continuer ?")) return;
    setBusy("restore");
    try {
      const license = normalizeLicenseKey(useBeharStore.getState().licenseKey);
      if (!license) {
        toast.error("Aucune licence active.");
        return;
      }
      const snapshot = await loadSnapshotByLicenseKey(license);
      if (!snapshot) {
        toast.error("Aucune sauvegarde disponible.");
        return;
      }
      hydrateStoreFromCloud(snapshot);
      setLastSyncedAt(snapshot.updatedAt);
      toast.success("Données restaurées.");
    } catch (error: any) {
      toast.error(error?.message || "Restauration impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 rounded-[14px] border border-[#E8E8E5] bg-[#FFFFFF] p-3">
      <p className="font-semibold text-[#1A1916] text-[13px]">Sauvegarde</p>
      <p className="mt-1 text-[#6B6B6B] text-[11.5px] leading-snug">
        Vos données sont sauvegardées automatiquement. Vous pouvez aussi forcer une sauvegarde ou récupérer la dernière.
      </p>

      {lastSyncedAt && (
        <p className="mt-2 flex items-center gap-1.5 text-[#147065] text-[11.5px] font-medium">
          <Check className="size-3" />
          Dernière sauvegarde :{" "}
          {new Date(lastSyncedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy !== null}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[12.5px] font-medium text-[#1A1916] transition active:scale-95 disabled:opacity-50 hover:bg-[#FFFFFF]"
        >
          {busy === "upload" ? <Loader2 className="size-3.5 animate-spin" /> : <CloudUpload className="size-3.5" />}
          Sauvegarder
        </button>
        <button
          type="button"
          onClick={onRestore}
          disabled={busy !== null}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[12.5px] font-medium text-[#1A1916] transition active:scale-95 disabled:opacity-50 hover:bg-[#FFFFFF]"
        >
          {busy === "restore" ? <Loader2 className="size-3.5 animate-spin" /> : <CloudDownload className="size-3.5" />}
          Restaurer
        </button>
      </div>
    </div>
  );
}

/* ── Lien discret "Installer l'app" (PWA) ─────────────────────────── */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function InstallAppLink() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(Boolean(standalone));

    const ua = navigator.userAgent || "";
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua));

    const global = (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt;
    if (global) setInstallPrompt(global);

    const onAvailable = () => {
      const p = (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt;
      if (p) setInstallPrompt(p);
    };
    const onBeforePrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      toast.success("Application installée.");
    };

    window.addEventListener("pwa-prompt-available", onAvailable);
    window.addEventListener("beforeinstallprompt", onBeforePrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-prompt-available", onAvailable);
      window.removeEventListener("beforeinstallprompt", onBeforePrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
        <Check className="size-3 text-[#2A9D8F]" /> Application installée
      </p>
    );
  }

  const handleClick = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
      } catch {
        /* ignore */
      }
      setInstallPrompt(null);
      return;
    }
    if (isIos) {
      setIosOpen(true);
      return;
    }
    toast.message("Ouvrez ce site dans Chrome / Edge puis cliquez sur l'icône Installer dans la barre d'adresse.");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="mt-3 flex items-center gap-1.5 text-[12px] text-[#6B6B6B] hover:text-[#2A9D8F] transition-colors"
      >
        <Download className="size-3" /> Installer l'application
      </button>

      {iosOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-[#1A1916]/40"
            onClick={() => setIosOpen(false)}
            aria-label="Fermer"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(26,25,22,0.18)]">
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1 w-9 rounded-full bg-[#FFFFFF]" aria-hidden />
            </div>
            <div className="px-6 pt-3 pb-4">
              <p className="font-semibold text-[#1A1916] text-[20px] tracking-tight">Installer sur iPhone / iPad</p>
              <p className="mt-1 text-[#6B6B6B] text-[13px]">
                Safari : touchez l'icône <strong>Partager</strong>, puis <strong>« Sur l'écran d'accueil »</strong>.
              </p>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => setIosOpen(false)}
                className="w-full h-11 rounded-[12px] bg-[#1A1916] text-white font-semibold text-[14px]"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
