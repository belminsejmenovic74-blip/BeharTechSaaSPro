"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Laptop,
  MonitorSmartphone,
  Search,
  Smartphone,
  Tablet,
  User,
  UserRoundPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { deviceCatalog } from "@/data/deviceCatalog";
import { PhotoSlot } from "@/components/behar/photo-slot";
import { SignaturePad } from "@/components/behar/repair-intake-condition";
import {
  type DeviceType,
  formatCurrency,
  getNowIso,
  getTomorrowIso,
  type PaymentMethod,
  type Repair,
  type RepairIntakeCondition,
  type RepairStatus,
  type WorkshopCountry,
  useBeharStore,
} from "@/lib/behar-store";
import { isValidCustomerPhone, normalizeCustomerPhone } from "@/lib/customer-phone";
import { getPriceBookMarketPrice, type PriceBookDeviceType, type PriceBookItem } from "@/lib/price-book";
import { cn } from "@/lib/utils";
import { useCapabilities } from "@/lib/use-capabilities";
import { getWorkshopCountryConfig } from "@/lib/workshop-country";

type ClientMode = "counter" | "new" | "existing";
type ConditionChoice = "OK" | "Abîmé" | "HS" | "À tester";
type ConditionKey =
  | "generalCondition"
  | "screenState"
  | "frameState"
  | "chargingState"
  | "camerasState"
  | "buttonsState"
  | "audioState"
  | "chargingPortState"
  | "networkState"
  | "biometricState";

const steps = ["Client", "Appareil", "Intervention", "État d’entrée", "Preuves", "Récapitulatif"] as const;

const deviceTypes: Array<{ label: DeviceType; icon: typeof Smartphone }> = [
  { label: "Smartphone", icon: Smartphone },
  { label: "Tablette", icon: Tablet },
  { label: "Ordinateur", icon: Laptop },
  { label: "Console", icon: MonitorSmartphone },
  { label: "Autre", icon: Wrench },
];

const priorityBrands = ["Apple", "Samsung", "Xiaomi", "Google", "Huawei", "OnePlus", "Sony", "Autre"];
const problems = [
  "Écran cassé",
  "Batterie HS",
  "Connecteur de charge",
  "Caméra",
  "Vitre arrière",
  "Micro / haut-parleur",
  "Micro-soudure",
  "Diagnostic",
  "Autre",
] as const;
const conditionChoices: ConditionChoice[] = ["OK", "Abîmé", "HS", "À tester"];
const conditionRows: Array<{ key: ConditionKey; label: string }> = [
  { key: "generalCondition", label: "État général" },
  { key: "screenState", label: "Écran" },
  { key: "frameState", label: "Châssis / dos" },
  { key: "chargingState", label: "Batterie / charge" },
  { key: "camerasState", label: "Caméras" },
  { key: "buttonsState", label: "Boutons" },
  { key: "audioState", label: "Micro / haut-parleur" },
  { key: "chargingPortState", label: "Connecteur de charge" },
  { key: "networkState", label: "Réseau / SIM" },
  { key: "biometricState", label: "Face ID / Touch ID" },
];
const accessMethods = ["Non communiqué", "Aucun", "Code PIN", "Mot de passe", "Schéma", "Biométrie"] as const;
const photoSlots = [
  { key: "face", label: "Face" },
  { key: "dos", label: "Dos" },
  { key: "cote", label: "Côté" },
  { key: "defaut", label: "Défaut / détail" },
] as const;

const inputClass =
  "h-12 w-full rounded-[14px] border border-[#E4E7EC] bg-white px-4 text-[15px] text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10";
const textareaClass =
  "min-h-[92px] w-full rounded-[14px] border border-[#E4E7EC] bg-white px-4 py-3 text-[15px] text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10";

function conditionValue(key: ConditionKey, choice?: ConditionChoice): string {
  if (!choice) return "Non renseigné";
  const values: Record<ConditionKey, Record<ConditionChoice, string>> = {
    generalCondition: { OK: "Bon", Abîmé: "Abîmé", HS: "Très abîmé", "À tester": "Non renseigné" },
    screenState: { OK: "Intact", Abîmé: "Fissuré", HS: "Cassé", "À tester": "Tactile non testable" },
    frameState: { OK: "Bon état", Abîmé: "Rayures", HS: "Tordu", "À tester": "Non renseigné" },
    chargingState: { OK: "Charge OK", Abîmé: "Batterie vide", HS: "Ne charge pas", "À tester": "Non testable" },
    camerasState: { OK: "OK", Abîmé: "Défaut visible", HS: "Défaut visible", "À tester": "Non testable" },
    buttonsState: { OK: "OK", Abîmé: "Défaut bouton", HS: "Défaut bouton", "À tester": "Non testable" },
    audioState: { OK: "OK", Abîmé: "Défaut signalé", HS: "Défaut signalé", "À tester": "Non testable" },
    chargingPortState: { OK: "OK", Abîmé: "Défaut signalé", HS: "Défaut signalé", "À tester": "Non testable" },
    networkState: { OK: "OK", Abîmé: "Défaut signalé", HS: "Défaut signalé", "À tester": "Non testé" },
    biometricState: {
      OK: "OK",
      Abîmé: "Ne fonctionne pas",
      HS: "Ne fonctionne pas",
      "À tester": "Non testable",
    },
  };
  return values[key][choice];
}

function FieldLabel({ children, optional }: Readonly<{ children: React.ReactNode; optional?: boolean }>) {
  return (
    <span className="mb-1.5 block font-semibold text-[#101828] text-[13px]">
      {children}
      {optional ? <span className="ml-1 font-normal text-[#98A2B3]">· optionnel</span> : null}
    </span>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
  icon: Icon,
}: Readonly<{
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon?: typeof Smartphone;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center justify-center gap-2 rounded-[14px] border px-3 text-center font-semibold text-[13px] transition active:scale-[0.98]",
        active
          ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70] shadow-[0_0_0_1px_rgba(42,157,143,0.12)]"
          : "border-[#E4E7EC] bg-white text-[#101828]",
      )}
    >
      {Icon ? <Icon className="size-[18px]" strokeWidth={1.9} /> : null}
      {children}
      {active ? <Check className="size-4" /> : null}
    </button>
  );
}

function SummaryCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-[18px] border border-[#E4E7EC] bg-white p-4 shadow-[0_6px_20px_rgba(16,24,40,0.035)]">
      <h3 className="font-bold text-[#667085] text-[13px] uppercase tracking-[0.08em]">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function SummaryLine({ label, value }: Readonly<{ label: string; value?: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <span className="text-[#667085]">{label}</span>
      <span className="max-w-[62%] text-right font-semibold text-[#101828]">{value ?? "—"}</span>
    </div>
  );
}

function compactText(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mobileTypeToPriceBook(type: DeviceType): PriceBookDeviceType {
  if (type === "Tablette") return "tablet";
  if (type === "Ordinateur") return "computer";
  if (type === "Console") return "console";
  if (type === "Autre") return "other";
  return "smartphone";
}

function mobileTypeToCatalogCategory(type: DeviceType) {
  if (type === "Tablette") return "tablet";
  if (type === "Ordinateur") return "computer";
  if (type === "Console") return "console";
  if (type === "Smartphone") return "smartphone";
  return undefined;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "fr", { numeric: true }),
  );
}

function mobileBrandOptions({
  deviceType,
  priceBookItems,
  storeBrands,
}: {
  deviceType: DeviceType;
  priceBookItems: PriceBookItem[];
  storeBrands: ReturnType<typeof useBeharStore.getState>["deviceBrands"];
}) {
  const priceBookType = mobileTypeToPriceBook(deviceType);
  const catalogCategory = mobileTypeToCatalogCategory(deviceType);
  const catalogBrands = deviceCatalog
    .filter((entry) => !catalogCategory || entry.category === catalogCategory)
    .map((entry) => entry.brand);
  const configuredBrands = storeBrands
    .filter((entry) => entry.deviceTypes.includes(deviceType))
    .map((entry) => entry.name);
  const priceBookBrands = priceBookItems
    .filter((entry) => entry.isActive !== false && entry.typeAppareil === priceBookType)
    .map((entry) => entry.marque);
  const all = uniqueSorted([...priorityBrands, ...catalogBrands, ...configuredBrands, ...priceBookBrands]);
  return [...all.filter((entry) => entry !== "Autre"), "Autre"];
}

function brandNameForModel(brandId: string, storeBrands: ReturnType<typeof useBeharStore.getState>["deviceBrands"]) {
  return storeBrands.find((entry) => entry.id === brandId)?.name ?? "";
}

function mobileModelOptions({
  brand,
  deviceType,
  priceBookItems,
  storeBrands,
  storeModels,
}: {
  brand: string;
  deviceType: DeviceType;
  priceBookItems: PriceBookItem[];
  storeBrands: ReturnType<typeof useBeharStore.getState>["deviceBrands"];
  storeModels: ReturnType<typeof useBeharStore.getState>["deviceModels"];
}) {
  const normalizedBrand = compactText(brand);
  const priceBookType = mobileTypeToPriceBook(deviceType);
  const official =
    deviceCatalog.find(
      (entry) =>
        compactText(entry.brand) === normalizedBrand ||
        entry.aliases.some((alias) => compactText(alias) === normalizedBrand),
    )?.models ?? [];
  const configuredModels = storeModels
    .filter((entry) => entry.deviceType === deviceType)
    .filter(
      (entry) => !normalizedBrand || compactText(brandNameForModel(entry.brandId, storeBrands)) === normalizedBrand,
    )
    .map((entry) => entry.name);
  const catalogModels = priceBookItems
    .filter((entry) => entry.isActive !== false && entry.typeAppareil === priceBookType)
    .filter((entry) => !normalizedBrand || compactText(entry.marque) === normalizedBrand)
    .map((entry) => entry.modele);
  return uniqueSorted([...official, ...configuredModels, ...catalogModels]).slice(0, 160);
}

function modelMatches(selectedModel: string, catalogModel: string) {
  const selected = compactText(selectedModel);
  const catalog = compactText(catalogModel);
  return Boolean(
    selected && catalog && (selected === catalog || selected.includes(catalog) || catalog.includes(selected)),
  );
}

function MobileModelTouchSelector({
  brand,
  options,
  value,
  onChange,
}: Readonly<{
  brand: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}>) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = compactText(query);
    const source = normalizedQuery ? options.filter((entry) => compactText(entry).includes(normalizedQuery)) : options;
    const limit = normalizedQuery ? 48 : expanded ? 48 : 12;
    const visible = source.slice(0, limit);
    if (value && !visible.some((entry) => compactText(entry) === compactText(value))) {
      return [value, ...visible];
    }
    return visible;
  }, [expanded, options, query, value]);
  const canCreate = query.trim().length > 0 && !options.some((entry) => compactText(entry) === compactText(query));

  useEffect(() => {
    setQuery("");
    setExpanded(false);
  }, [brand]);

  if (!brand) {
    return (
      <p className="rounded-[14px] border border-[#E4E7EC] bg-white px-4 py-3 text-[#667085] text-[12px]">
        Choisissez d'abord une marque pour afficher les modèles comme au comptoir.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <label>
        <FieldLabel>Rechercher le modèle</FieldLabel>
        <input
          className={inputClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex. iPhone 15 Pro, Galaxy S22..."
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {filteredOptions.map((entry) => {
          const active = compactText(value) === compactText(entry);
          return (
            <button
              key={entry}
              type="button"
              onClick={() => {
                onChange(entry);
                setQuery("");
              }}
              className={cn(
                "min-h-[50px] rounded-[14px] border px-3 text-center font-bold text-[12.5px] leading-tight transition active:scale-[0.97]",
                active ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70]" : "border-[#E4E7EC] bg-white text-[#101828]",
              )}
            >
              {active ? <Check className="mr-1 inline size-3.5" /> : null}
              {entry}
            </button>
          );
        })}
        {canCreate ? (
          <button
            type="button"
            onClick={() => onChange(query.trim())}
            className="min-h-[50px] rounded-[14px] border border-dashed border-[#2A9D8F] bg-[#FFFFFF] px-3 font-bold text-[#167B70] text-[12.5px] leading-tight transition active:scale-[0.97]"
          >
            Utiliser « {query.trim()} »
          </button>
        ) : null}
      </div>
      {options.length > 12 && !query.trim() ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="h-11 w-full rounded-[14px] border border-[#E4E7EC] bg-white font-bold text-[#167B70] text-[13px] active:scale-[0.98]"
        >
          {expanded ? "Voir moins de modèles" : "Voir plus de modèles"}
        </button>
      ) : null}
    </div>
  );
}

export function MobileRepairIntakeWizard({
  initialStatus,
  prefill,
  onClose,
}: Readonly<{ initialStatus: RepairStatus; prefill?: Partial<Repair>; onClose: () => void }>) {
  const router = useRouter();
  const store = useBeharStore();
  const capabilities = useCapabilities();
  const wizardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [clientMode, setClientMode] = useState<ClientMode>(prefill?.customerId ? "existing" : "counter");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(prefill?.customerId ?? "");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const allowedMarkets = store.workshopSettings.allowedMarkets || [store.workshopInfo.country];
  const defaultMarket = store.workshopSettings.defaultMarket || store.workshopInfo.country;

  const [billingCountry, setBillingCountry] = useState<WorkshopCountry>(prefill?.billingCountry ?? defaultMarket);
  const billingConfig = getWorkshopCountryConfig(billingCountry);

  useEffect(() => {
    if (allowedMarkets.length === 1 && billingCountry !== allowedMarkets[0]) {
      setBillingCountry(allowedMarkets[0]);
    }
  }, [allowedMarkets, billingCountry]);

  const [deviceType, setDeviceType] = useState<DeviceType>(prefill?.deviceType ?? "Smartphone");
  const [brand, setBrand] = useState(prefill?.brandName ?? "");
  const [customBrand, setCustomBrand] = useState("");
  const [model, setModel] = useState(prefill?.deviceModel ?? prefill?.model ?? "");
  const [imei, setImei] = useState(prefill?.imei === "Non renseigné" ? "" : (prefill?.imei ?? ""));
  const [deviceColor, setDeviceColor] = useState(prefill?.deviceColor ?? "");
  const [deviceCapacity, setDeviceCapacity] = useState(prefill?.deviceCapacity ?? "");

  const [problem, setProblem] = useState(prefill?.issue ?? "");
  const [problemDetails, setProblemDetails] = useState("");
  const [price, setPrice] = useState(prefill?.total ? String(prefill.total) : "");
  const defaultPayment: PaymentMethod =
    billingCountry === "CH" && store.workshopInfo.twintEnabled !== false ? "TWINT" : "Espèces";
  const [plannedPaymentMethod, setPlannedPaymentMethod] = useState<PaymentMethod>(
    prefill?.plannedPaymentMethod ?? defaultPayment,
  );
  const [addMeeting, setAddMeeting] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNote, setMeetingNote] = useState("");

  const [conditions, setConditions] = useState<Partial<Record<ConditionKey, ConditionChoice>>>({});
  const [accessMethod, setAccessMethod] = useState<(typeof accessMethods)[number]>("Non communiqué");
  const [accessCode, setAccessCode] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [photos, setPhotos] = useState<Partial<Record<(typeof photoSlots)[number]["key"], string>>>({});
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    return store.customers
      .filter((customer) => customer.type !== "counter")
      .filter((customer) =>
        query ? `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query) : true,
      )
      .slice(0, 6);
  }, [customerSearch, store.customers]);
  const chosenCustomer = store.customers.find((customer) => customer.id === selectedCustomerId);
  const effectiveBrand = brand === "Autre" ? customBrand.trim() : brand;
  const brandOptions = useMemo(
    () =>
      mobileBrandOptions({
        deviceType,
        priceBookItems: store.priceBookItems,
        storeBrands: store.deviceBrands,
      }),
    [deviceType, store.deviceBrands, store.priceBookItems],
  );
  const modelOptions = useMemo(
    () =>
      mobileModelOptions({
        brand: effectiveBrand,
        deviceType,
        priceBookItems: store.priceBookItems,
        storeBrands: store.deviceBrands,
        storeModels: store.deviceModels,
      }),
    [deviceType, effectiveBrand, store.deviceBrands, store.deviceModels, store.priceBookItems],
  );
  const catalogProblemOptions = useMemo(() => {
    if (!effectiveBrand || !model.trim()) return [];
    const selectedType = mobileTypeToPriceBook(deviceType);
    const normalizedBrand = compactText(effectiveBrand);
    const seen = new Set<string>();
    return store.priceBookItems
      .filter((entry) => entry.isActive !== false)
      .filter((entry) => entry.typeAppareil === selectedType)
      .filter((entry) => compactText(entry.marque) === normalizedBrand)
      .filter((entry) => modelMatches(model, entry.modele))
      .map((entry) => {
        const price = getPriceBookMarketPrice(entry, billingCountry).prixClientTotal;
        const label = entry.reparation || entry.piece || "Intervention";
        return { label, price, source: "catalog" as const, item: entry };
      })
      .filter((entry) => {
        const key = compactText(entry.label);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }, [billingCountry, deviceType, effectiveBrand, model, store.priceBookItems]);
  const problemOptions = useMemo(() => {
    const catalogKeys = new Set(catalogProblemOptions.map((entry) => compactText(entry.label)));
    return [
      ...catalogProblemOptions,
      ...problems
        .filter((entry) => !catalogKeys.has(compactText(entry)))
        .map((label) => ({ label, price: 0, source: "generic" as const })),
    ];
  }, [catalogProblemOptions]);
  const issue =
    problem === "Autre" ? problemDetails.trim() : [problem, problemDetails.trim()].filter(Boolean).join(" — ");
  const amount = Number.parseFloat(price.replace(",", ".")) || 0;
  const paymentOptions: PaymentMethod[] = [
    "Espèces",
    "Carte externe",
    "Virement",
    "Autre",
    ...(billingCountry === "CH" && store.workshopInfo.twintEnabled !== false ? (["TWINT"] as PaymentMethod[]) : []),
  ];

  const conditionCounts: Record<ConditionChoice, number> = { OK: 0, Abîmé: 0, HS: 0, "À tester": 0 };
  for (const value of Object.values(conditions)) {
    if (value) conditionCounts[value] += 1;
  }
  const photoCount = Object.values(photos).filter(Boolean).length;

  useEffect(() => {
    setPlannedPaymentMethod(billingCountry === "CH" && store.workshopInfo.twintEnabled !== false ? "TWINT" : "Espèces");
  }, [billingCountry, store.workshopInfo.twintEnabled]);

  useEffect(() => {
    void step;
    window.scrollTo({ top: 0, behavior: "instant" });
    wizardRef.current
      ?.closest<HTMLElement>('[data-testid="new-repair-modal"]')
      ?.scrollTo({ top: 0, behavior: "instant" });
    wizardRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const validateStep = () => {
    if (step === 1) {
      if (clientMode === "new" && (!newName.trim() || !newPhone.trim())) {
        toast.error("Renseignez le nom et le téléphone du client.");
        return false;
      }
      if (clientMode === "new" && !isValidCustomerPhone(newPhone, billingCountry)) {
        toast.error(billingCountry === "CH" ? "Numéro suisse invalide." : "Numéro français invalide.");
        return false;
      }
      if (clientMode === "existing" && !selectedCustomerId) {
        toast.error("Sélectionnez un client existant.");
        return false;
      }
    }
    if (step === 2 && (!effectiveBrand || !model.trim())) {
      toast.error("Sélectionnez la marque et renseignez le modèle.");
      return false;
    }
    if (step === 3) {
      if (!problem || (problem === "Autre" && !problemDetails.trim())) {
        toast.error("Sélectionnez ou décrivez le problème.");
        return false;
      }
      if (addMeeting && (!meetingDate || !meetingTime)) {
        toast.error("Renseignez la date et l’heure du rendez-vous.");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(6, current + 1));
  };

  const back = () => setStep((current) => Math.max(1, current - 1));

  const create = (generateIntake: boolean) => {
    if (creating) return;
    setCreating(true);
    try {
      let customerId = selectedCustomerId;
      if (clientMode === "counter") {
        customerId =
          store.customers.find((customer) => customer.type === "counter")?.id ??
          store.addCustomer({
            name: "Client comptoir",
            type: "counter",
            phone: "",
            email: "",
            device: `${effectiveBrand} ${model}`.trim(),
            lastRepair: issue,
          });
      } else if (clientMode === "new") {
        customerId = store.addCustomer({
          name: newName.trim(),
          phone: normalizeCustomerPhone(newPhone, billingCountry),
          email: newEmail.trim(),
          device: `${effectiveBrand} ${model}`.trim(),
          lastRepair: issue,
        });
      }
      if (!customerId) {
        toast.error("Impossible d’associer le client.");
        return;
      }

      let appointmentId = prefill?.appointmentId;
      if (addMeeting) {
        appointmentId = store.addAppointment({
          customerId,
          device: `${effectiveBrand} ${model}`.trim(),
          issue,
          date: meetingDate,
          time: meetingTime,
          duration: "60 min",
          notes: meetingNote.trim(),
          source: "Prise en charge mobile",
          deviceType,
          deviceBrand: effectiveBrand,
          deviceModel: model.trim(),
          imei: imei.trim(),
          customerPrice: amount,
        });
      }

      const now = new Date().toISOString();
      const intakeCondition: RepairIntakeCondition = {
        generalCondition: conditionValue(
          "generalCondition",
          conditions.generalCondition,
        ) as RepairIntakeCondition["generalCondition"],
        powerState: "Non renseigné",
        chargingState: conditionValue(
          "chargingState",
          conditions.chargingState,
        ) as RepairIntakeCondition["chargingState"],
        screenState: conditionValue("screenState", conditions.screenState) as RepairIntakeCondition["screenState"],
        frameState: conditionValue("frameState", conditions.frameState) as RepairIntakeCondition["frameState"],
        camerasState: conditionValue("camerasState", conditions.camerasState) as RepairIntakeCondition["camerasState"],
        audioState: conditionValue("audioState", conditions.audioState) as RepairIntakeCondition["audioState"],
        buttonsState: conditionValue("buttonsState", conditions.buttonsState) as RepairIntakeCondition["buttonsState"],
        chargingPortState: conditionValue(
          "chargingPortState",
          conditions.chargingPortState,
        ) as RepairIntakeCondition["chargingPortState"],
        biometricState: conditionValue(
          "biometricState",
          conditions.biometricState,
        ) as RepairIntakeCondition["biometricState"],
        networkState: conditionValue("networkState", conditions.networkState) as RepairIntakeCondition["networkState"],
        passcodeState:
          accessMethod === "Aucun"
            ? "Sans code"
            : accessMethod === "Non communiqué"
              ? "Code non fourni"
              : "Code fourni",
        accessMethod:
          accessMethod === "Biométrie"
            ? "Empreinte / biométrie"
            : (accessMethod as RepairIntakeCondition["accessMethod"]),
        accessCode: accessCode.trim(),
        internalIntakeNotes: intakeNotes.trim(),
        visibleDefects: conditionRows
          .filter(({ key }) => conditions[key] && conditions[key] !== "OK")
          .map(({ key, label }) => `${label} : ${conditions[key]}`)
          .join(" · "),
        photos: photoSlots.flatMap((slot) => {
          const dataUrl = photos[slot.key];
          return dataUrl ? [{ id: `photo_${slot.key}_${Date.now()}`, name: slot.label, dataUrl, createdAt: now }] : [];
        }),
        signerName: signerName.trim(),
        signedBy: signature ? signerName.trim() || "Client" : undefined,
        signedAt: signature ? now : undefined,
        signatureDataUrl: signature,
        signatureSignedAt: signature ? now : undefined,
        customerConfirmed: Boolean(signature),
        diagnosticAuthorized: Boolean(signature),
        nonTestableAccepted: Boolean(signature),
        createdAt: now,
        updatedAt: now,
      };

      const repairId = store.addRepair({
        customerId,
        billingCountry,
        currency: billingConfig.currency,
        locale: billingConfig.locale,
        appointmentId,
        deviceType,
        brandId: effectiveBrand,
        brandName: effectiveBrand,
        modelId: model.trim(),
        deviceModel: model.trim(),
        device: `${effectiveBrand} ${model}`.trim(),
        model: model.trim(),
        imei: imei.trim() || "Non renseigné",
        deviceColor: deviceColor.trim(),
        deviceCapacity: deviceCapacity.trim(),
        plannedPaymentMethod,
        issueType: problem,
        issue,
        status: initialStatus,
        amount,
        laborPrice: amount,
        total: amount,
        notes: [intakeNotes.trim(), meetingNote.trim() ? `Déplacement / rendez-vous : ${meetingNote.trim()}` : ""]
          .filter(Boolean)
          .join("\n"),
        droppedAt: prefill?.droppedAt ?? getNowIso(),
        estimatedDoneAt: getTomorrowIso(),
        technician: "Atelier principal",
        intakeCondition,
        selectedPriceSnapshot: {
          source: "manual",
          typeAppareil: deviceType,
          marque: effectiveBrand,
          modele: model.trim(),
          piece: problem,
          reparation: issue,
          qualite: "Saisie mobile",
          prixVentePiece: amount,
          mainOeuvre: 0,
          prixClientTotal: amount,
          selectedAt: now,
        },
        history: [
          "Prise en charge créée depuis le parcours mobile",
          `Moyen de paiement prévu : ${plannedPaymentMethod}`,
          ...(photoCount
            ? [`${photoCount} photo${photoCount > 1 ? "s" : ""} ajoutée${photoCount > 1 ? "s" : ""}`]
            : []),
          ...(signature ? ["Signature client enregistrée"] : ["Signature non recueillie"]),
          ...(generateIntake ? ["Bon de prise en charge généré"] : []),
        ],
      });
      if (!repairId) {
        toast.error("Création du dossier impossible.");
        return;
      }

      store.setSelected("repair", repairId);
      toast.success(
        generateIntake ? "Prise en charge créée · bon disponible dans Documents." : "Prise en charge créée.",
      );
      onClose();
      router.push(`/dashboard/dossiers/_/?id=${repairId}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      ref={wizardRef}
      className="flex min-h-svh w-full flex-col overflow-x-hidden bg-[#FFFFFF] text-[#101828]"
      data-mobile-repair-wizard
    >
      <header className="sticky top-0 z-20 border-[#E4E7EC] border-b bg-[#FFFFFF] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-[#2A9D8F] text-[11px] uppercase tracking-[0.12em]">Étape {step} sur 6</p>
            <h2 className="truncate font-bold text-[20px] tracking-tight">{steps[step - 1]}</h2>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[#E4E7EC] bg-white text-[#667085]"
          >
            <X className="size-5" />
          </button>
        </div>
        <div
          className="mt-3 grid grid-cols-6 gap-1.5"
          aria-label={`Progression : étape ${step} sur 6`}
          aria-valuemax={6}
          aria-valuemin={1}
          aria-valuenow={step}
          role="progressbar"
        >
          {steps.map((label, index) => (
            <div
              key={label}
              className={cn("h-1.5 rounded-full transition", index + 1 <= step ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]")}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-[132px]">
        {step === 1 ? (
          <div className="space-y-5">
            {allowedMarkets.length > 1 && (
              <section className="rounded-[18px] border border-[#D7EFEA] bg-[#FFFFFF] p-4">
                <p className="font-semibold text-[14px]">Pays de facturation / marché</p>
                <p className="mt-1 text-[#667085] text-[12px]">France en euros, Suisse en francs suisses.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {allowedMarkets.map((country) => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => setBillingCountry(country)}
                      className={cn(
                        "rounded-[13px] border bg-white px-3 py-3 text-left",
                        billingCountry === country ? "border-[#2A9D8F] text-[#167B70]" : "border-[#E4E7EC]",
                      )}
                    >
                      <span className="block font-bold text-[13px]">
                        {country === "CH" ? "Suisse · CHF" : "France · €"}
                      </span>
                      <span className="text-[11px]">
                        {country === "CH" ? "Prix en francs suisses" : "Prix en euros"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <div>
              <h3 className="font-bold text-[24px] tracking-tight">Pour qui est l’appareil ?</h3>
              <p className="mt-1 text-[#667085] text-[14px] leading-relaxed">
                Choisissez le parcours le plus rapide pour le client.
              </p>
            </div>
            <div className="grid gap-2.5">
              {[
                { key: "counter" as const, label: "Comptoir", detail: "Sans fiche client complète", icon: User },
                {
                  key: "new" as const,
                  label: "Nouveau client",
                  detail: "Créer une nouvelle fiche",
                  icon: UserRoundPlus,
                },
                {
                  key: "existing" as const,
                  label: "Client existant",
                  detail: "Rechercher dans vos clients",
                  icon: Users,
                },
              ].map((option) => {
                const Icon = option.icon;
                const active = clientMode === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setClientMode(option.key)}
                    className={cn(
                      "flex min-h-[76px] items-center gap-3 rounded-[18px] border bg-white p-4 text-left transition active:scale-[0.99]",
                      active ? "border-[#2A9D8F] shadow-[0_0_0_1px_rgba(42,157,143,0.12)]" : "border-[#E4E7EC]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-[13px]",
                        active ? "bg-[#FFFFFF] text-[#167B70]" : "bg-[#FFFFFF] text-[#667085]",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[15px]">{option.label}</span>
                      <span className="mt-0.5 block text-[#667085] text-[12px]">{option.detail}</span>
                    </span>
                    {active ? (
                      <CheckCircle2 className="size-5 text-[#2A9D8F]" />
                    ) : (
                      <ChevronRight className="size-5 text-[#AAA7A1]" />
                    )}
                  </button>
                );
              })}
            </div>

            {clientMode === "new" ? (
              <section className="space-y-3 rounded-[18px] border border-[#E4E7EC] bg-white p-4">
                <label>
                  <FieldLabel>Nom</FieldLabel>
                  <input className={inputClass} value={newName} onChange={(event) => setNewName(event.target.value)} />
                </label>
                <label>
                  <FieldLabel>Téléphone</FieldLabel>
                  <input
                    className={inputClass}
                    inputMode="tel"
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                    placeholder={store.workshopInfo.country === "CH" ? "+41 79 123 45 67" : "06 12 34 56 78"}
                  />
                </label>
                <label>
                  <FieldLabel optional>Email</FieldLabel>
                  <input
                    className={inputClass}
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                  />
                </label>
              </section>
            ) : null}

            {clientMode === "existing" ? (
              <section className="space-y-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#667085]" />
                  <input
                    className={`${inputClass} pl-11`}
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Nom, téléphone ou email…"
                  />
                </label>
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => {
                    const active = selectedCustomerId === customer.id;
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-[16px] border bg-white p-4 text-left",
                          active ? "border-[#2A9D8F]" : "border-[#E4E7EC]",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-[14px]">{customer.name}</span>
                          <span className="mt-0.5 block truncate text-[#667085] text-[12px]">
                            {customer.phone || "Téléphone non renseigné"}
                          </span>
                          <span className="mt-1 block text-[#98A2B3] text-[11px]">
                            {customer.interventions || 0} intervention{customer.interventions === 1 ? "" : "s"}
                          </span>
                        </span>
                        {active ? <CheckCircle2 className="size-5 shrink-0 text-[#2A9D8F]" /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-[24px] tracking-tight">Quel appareil ?</h3>
              <p className="mt-1 text-[#667085] text-[14px]">
                Sélectionnez le type, puis la marque et le modèle exact.
              </p>
            </div>
            <section>
              <FieldLabel>Type d’appareil</FieldLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {deviceTypes.map((option) => (
                  <ChoiceButton
                    key={option.label}
                    active={deviceType === option.label}
                    icon={option.icon}
                    onClick={() => {
                      setDeviceType(option.label);
                      setBrand("");
                      setCustomBrand("");
                      setModel("");
                      setProblem("");
                      setPrice("");
                    }}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
            </section>
            <section>
              <FieldLabel>Marque</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {brandOptions.slice(0, 12).map((option) => (
                  <ChoiceButton
                    key={option}
                    active={brand === option}
                    onClick={() => {
                      setBrand(option);
                      setCustomBrand("");
                      setModel("");
                      setProblem("");
                      setPrice("");
                    }}
                  >
                    {option}
                  </ChoiceButton>
                ))}
              </div>
              {brand === "Autre" ? (
                <input
                  className={`${inputClass} mt-3`}
                  value={customBrand}
                  onChange={(event) => setCustomBrand(event.target.value)}
                  placeholder="Nom de la marque"
                />
              ) : null}
            </section>
            <section className="space-y-3 rounded-[18px] border border-[#E4E7EC] bg-white p-4">
              <MobileModelTouchSelector
                brand={effectiveBrand}
                options={modelOptions}
                value={model}
                onChange={(nextModel) => {
                  setModel(nextModel);
                  setProblem("");
                  setPrice("");
                }}
              />
              <label>
                <FieldLabel optional>IMEI / numéro de série</FieldLabel>
                <input className={inputClass} value={imei} onChange={(event) => setImei(event.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <FieldLabel optional>Couleur</FieldLabel>
                  <input
                    className={inputClass}
                    value={deviceColor}
                    onChange={(event) => setDeviceColor(event.target.value)}
                  />
                </label>
                <label>
                  <FieldLabel optional>Capacité</FieldLabel>
                  <input
                    className={inputClass}
                    value={deviceCapacity}
                    onChange={(event) => setDeviceCapacity(event.target.value)}
                    placeholder="128 Go"
                  />
                </label>
              </div>
            </section>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-[24px] tracking-tight">Quel est le problème ?</h3>
              <p className="mt-1 text-[#667085] text-[14px]">
                Choisissez la prestation principale et indiquez le prix prévu.
              </p>
            </div>
            <section>
              <FieldLabel>Problème / prestation</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {problemOptions.map((option) => {
                  const active = problem === option.label;
                  return (
                    <button
                      key={`${option.source}-${option.label}`}
                      type="button"
                      onClick={() => {
                        setProblem(option.label);
                        if (option.price > 0) setPrice(String(option.price));
                      }}
                      className={cn(
                        "min-h-[64px] rounded-[14px] border px-3 py-2 text-left transition active:scale-[0.98]",
                        active
                          ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70] shadow-[0_0_0_1px_rgba(42,157,143,0.12)]"
                          : "border-[#E4E7EC] bg-white text-[#101828]",
                      )}
                    >
                      <span className="block font-bold text-[13px] leading-tight">{option.label}</span>
                      <span className="mt-1 block font-semibold text-[#167B70] text-[11px]">
                        {option.price > 0 ? formatCurrency(option.price, billingConfig.currency) : "Prix à saisir"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            <label>
              <FieldLabel optional>Description</FieldLabel>
              <textarea
                className={textareaClass}
                value={problemDetails}
                onChange={(event) => setProblemDetails(event.target.value)}
                placeholder={problem === "Autre" ? "Décrivez le problème…" : "Précision utile pour le technicien…"}
              />
            </label>
            <section className="grid grid-cols-[1fr_112px] gap-3 rounded-[18px] border border-[#E4E7EC] bg-white p-4">
              <label>
                <FieldLabel>Prix client</FieldLabel>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder={billingConfig.currency === "CHF" ? "0.00 CHF" : "0,00 €"}
                />
                {!capabilities.canInvoice ? (
                  <span className="mt-1.5 block text-[#667085] text-[11px]">
                    Usage interne. Ne constitue pas un devis.
                  </span>
                ) : null}
              </label>
              <div className="flex flex-col justify-end pb-3 text-right">
                <span className="text-[#667085] text-[11px]">Total prévu</span>
                <span className="font-bold text-[#167B70] text-[17px]">
                  {formatCurrency(amount, billingConfig.currency)}
                </span>
              </div>
            </section>
            <section>
              <FieldLabel>Moyen de paiement prévu</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {paymentOptions.map((option) => (
                  <ChoiceButton
                    key={option}
                    active={plannedPaymentMethod === option}
                    onClick={() => setPlannedPaymentMethod(option)}
                  >
                    {option}
                  </ChoiceButton>
                ))}
              </div>
            </section>
            <section className="rounded-[18px] border border-[#E4E7EC] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[14px]">Ajouter un rendez-vous ?</p>
                  <p className="mt-0.5 text-[#667085] text-[12px]">Pour une intervention ou un déplacement planifié.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddMeeting((current) => !current)}
                  className={cn(
                    "h-10 min-w-[74px] rounded-full px-4 font-bold text-[13px]",
                    addMeeting ? "bg-[#2A9D8F] text-white" : "bg-[#FFFFFF] text-[#667085]",
                  )}
                >
                  {addMeeting ? "Oui" : "Non"}
                </button>
              </div>
              {addMeeting ? (
                <div className="mt-4 space-y-3 border-[#E4E7EC] border-t pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <FieldLabel>Date</FieldLabel>
                      <input
                        className={inputClass}
                        type="date"
                        value={meetingDate}
                        onChange={(event) => setMeetingDate(event.target.value)}
                      />
                    </label>
                    <label>
                      <FieldLabel>Heure</FieldLabel>
                      <input
                        className={inputClass}
                        type="time"
                        value={meetingTime}
                        onChange={(event) => setMeetingTime(event.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    <FieldLabel optional>Adresse ou note déplacement</FieldLabel>
                    <textarea
                      className={textareaClass}
                      value={meetingNote}
                      onChange={(event) => setMeetingNote(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-[24px] tracking-tight">État d’entrée</h3>
              <p className="mt-1 text-[#667085] text-[14px] leading-relaxed">
                Touchez un état par ligne. Vous pouvez laisser les éléments non vérifiés sans sélection.
              </p>
            </div>
            <div className="space-y-2.5">
              {conditionRows.map((row) => (
                <section key={row.key} className="rounded-[16px] border border-[#E4E7EC] bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-bold text-[13px]">{row.label}</p>
                    <span className="text-[#98A2B3] text-[10px]">{conditions[row.key] ?? "Non renseigné"}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {conditionChoices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() =>
                          setConditions((current) => ({
                            ...current,
                            [row.key]: current[row.key] === choice ? undefined : choice,
                          }))
                        }
                        className={cn(
                          "min-h-10 rounded-[10px] border px-1 font-bold text-[10.5px] transition active:scale-95",
                          conditions[row.key] === choice
                            ? choice === "OK"
                              ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70]"
                              : "border-[#C9A45D] bg-[#FFFFFF] text-[#805C17]"
                            : "border-[#E4E7EC] bg-[#FFFFFF] text-[#667085]",
                        )}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <section className="rounded-[18px] border border-[#E4E7EC] bg-white p-4">
              <FieldLabel>Accès appareil</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {accessMethods.map((option) => (
                  <ChoiceButton key={option} active={accessMethod === option} onClick={() => setAccessMethod(option)}>
                    {option}
                  </ChoiceButton>
                ))}
              </div>
              {["Code PIN", "Mot de passe", "Schéma"].includes(accessMethod) ? (
                <input
                  className={`${inputClass} mt-3`}
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Code ou indication d’accès"
                />
              ) : null}
            </section>
            <label>
              <FieldLabel optional>Notes</FieldLabel>
              <textarea
                className={textareaClass}
                value={intakeNotes}
                onChange={(event) => setIntakeNotes(event.target.value)}
                placeholder="Rayures, choc visible, réserve particulière…"
              />
            </label>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-[24px] tracking-tight">Photos & signature</h3>
              <p className="mt-1 text-[#667085] text-[14px] leading-relaxed">
                Les photos et la signature seront enregistrées dans le dossier.
              </p>
            </div>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <FieldLabel>Photos de l’appareil</FieldLabel>
                <span className="font-semibold text-[#2A9D8F] text-[12px]">{photoCount}/4</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {photoSlots.map((slot) => (
                  <PhotoSlot
                    key={slot.key}
                    label={slot.label}
                    value={photos[slot.key]}
                    onChange={(dataUrl) => setPhotos((current) => ({ ...current, [slot.key]: dataUrl }))}
                  />
                ))}
              </div>
            </section>
            <section className="rounded-[18px] border border-[#E4E7EC] bg-white p-4">
              <label>
                <FieldLabel optional>Nom du signataire</FieldLabel>
                <input
                  className={inputClass}
                  value={signerName}
                  onChange={(event) => setSignerName(event.target.value)}
                  placeholder={clientMode === "counter" ? "Client absent ou comptoir" : chosenCustomer?.name || newName}
                />
              </label>
              <div className="mt-4">
                <SignaturePad signerName={signerName} value={signature} onChange={setSignature} />
              </div>
              <p className="mt-3 rounded-[12px] bg-[#FFFFFF] px-3 py-2.5 text-[#667085] text-[12px] leading-relaxed">
                La signature reste optionnelle lorsque le client n’est pas présent.
              </p>
            </section>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-[24px] tracking-tight">Vérifiez avant création</h3>
              <p className="mt-1 text-[#667085] text-[14px]">Tout pourra encore être modifié depuis le dossier.</p>
            </div>
            <SummaryCard title="Client">
              <SummaryLine
                label="Type"
                value={
                  clientMode === "counter" ? "Comptoir" : clientMode === "new" ? "Nouveau client" : "Client existant"
                }
              />
              <SummaryLine
                label="Nom"
                value={
                  clientMode === "counter" ? "Client comptoir" : clientMode === "new" ? newName : chosenCustomer?.name
                }
              />
              <SummaryLine label="Téléphone" value={clientMode === "new" ? newPhone : chosenCustomer?.phone} />
              {(clientMode === "new" ? newEmail : chosenCustomer?.email) ? (
                <SummaryLine label="Email" value={clientMode === "new" ? newEmail : chosenCustomer?.email} />
              ) : null}
            </SummaryCard>
            <SummaryCard title="Appareil">
              <SummaryLine label="Type" value={deviceType} />
              <SummaryLine label="Marque" value={effectiveBrand} />
              <SummaryLine label="Modèle" value={model} />
              {imei ? <SummaryLine label="IMEI / série" value={imei} /> : null}
              {deviceColor ? <SummaryLine label="Couleur" value={deviceColor} /> : null}
              {deviceCapacity ? <SummaryLine label="Capacité" value={deviceCapacity} /> : null}
            </SummaryCard>
            <SummaryCard title="Intervention">
              <SummaryLine label="Problème" value={issue} />
              <SummaryLine label="Prix client" value={formatCurrency(amount, billingConfig.currency)} />
              <SummaryLine label="Paiement prévu" value={plannedPaymentMethod} />
              {addMeeting ? <SummaryLine label="Rendez-vous" value={`${meetingDate} à ${meetingTime}`} /> : null}
              {meetingNote ? <SummaryLine label="Déplacement" value={meetingNote} /> : null}
            </SummaryCard>
            <SummaryCard title="Anti-litige">
              <SummaryLine
                label="Éléments renseignés"
                value={`${Object.keys(conditions).length}/${conditionRows.length}`}
              />
              <SummaryLine label="OK" value={conditionCounts.OK} />
              <SummaryLine
                label="À signaler"
                value={conditionCounts.Abîmé + conditionCounts.HS + conditionCounts["À tester"]}
              />
              <SummaryLine label="Accès appareil" value={accessMethod} />
            </SummaryCard>
            <SummaryCard title="Preuves">
              <SummaryLine label="Photos ajoutées" value={photoCount} />
              <SummaryLine label="Signature" value={signature ? "Présente" : "Absente"} />
            </SummaryCard>
          </div>
        ) : null}
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-30 border-[#E4E7EC] border-t bg-white px-4 pt-3"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          boxShadow: "0 -12px 30px rgba(16,24,40,0.07)",
        }}
      >
        {step < 6 ? (
          <div className="grid grid-cols-[104px_1fr] gap-3">
            <button
              type="button"
              onClick={step === 1 ? onClose : back}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#E4E7EC] bg-white font-bold text-[#101828] text-[14px]"
            >
              <ArrowLeft className="size-4" />
              {step === 1 ? "Annuler" : "Retour"}
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2A9D8F] font-bold text-[14px] text-white shadow-[0_8px_20px_rgba(42,157,143,0.2)]"
            >
              Suivant
              <ArrowRight className="size-4" />
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={() => create(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2A9D8F] px-4 font-bold text-[13px] text-white disabled:opacity-60"
            >
              <FileText className="size-4" />
              Créer + générer le bon
            </button>
            <div className="grid grid-cols-[104px_1fr] gap-2">
              <button
                type="button"
                onClick={back}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[13px] border border-[#E4E7EC] bg-white font-bold text-[13px]"
              >
                <ArrowLeft className="size-4" />
                Retour
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => create(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[13px] border border-[#B9DED6] bg-[#FFFFFF] font-bold text-[#167B70] text-[13px] disabled:opacity-60"
              >
                <ClipboardCheck className="size-4" />
                Créer la prise en charge
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
