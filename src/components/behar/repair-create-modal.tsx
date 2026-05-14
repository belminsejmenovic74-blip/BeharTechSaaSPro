"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Check, ChevronDown, FileText, Mail, Phone, ReceiptText, Sparkles, Tag, User, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { Combobox, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { RepairIntakeScreen } from "@/components/behar/repair-intake-condition";
import { deviceCatalog } from "@/data/deviceCatalog";
import {
  deviceBrands,
  deviceModels,
  type DeviceType,
  formatEuro,
  getNowIso,
  getTomorrowIso,
  type PriceSnapshot,
  type Repair,
  type RepairIntakeCondition,
  type RepairStatus,
  useBeharStore,
} from "@/lib/behar-store";
import {
  extractPartQuality,
  findCatalogMatches,
  getBestPriceBookItem,
  groupCatalogByQualityLabel,
} from "@/lib/price-book";
import {
  canonicalizeIntervention,
  filterSuggestionChips,
  getDefaultInterventionsByDeviceType,
  INTERVENTION_ALIASES,
  normalizeInterventionHint,
} from "@/lib/repair-intervention";
import { getDeviceSeries } from "@/lib/device-series";
import { COUNTRIES, COUNTRY_NAMES, CALLING_CODES } from "@/lib/countries";
import { usePostalCities, fetchPostalCodeByCity } from "@/hooks/use-postal-cities";
import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";

const UI_DEVICE_TYPES: DeviceType[] = ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"];
const countryOptions = COUNTRY_NAMES;

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function phoneParts(value: unknown): { prefix: string; local: string } {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  if (!match) {
    const digits = digitsOnly(raw);
    if (digits.startsWith("0")) return { prefix: "+33", local: digits.slice(1) };
    return { prefix: "+33", local: digits };
  }
  return { prefix: match[1], local: digitsOnly(match[2]) };
}

function formatPhoneLocal(prefix: string, value: unknown): string {
  const digits = digitsOnly(value).slice(0, 15);
  if (prefix === "+33") {
    const isZero = digits.startsWith("0");
    const maxLen = isZero ? 10 : 9;
    const toFormat = digits.slice(0, maxLen);
    if (isZero) {
      return toFormat.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    } else {
      return toFormat.replace(/(\d)(?=(?:\d{2})+$)/g, "$1 ").trim();
    }
  }
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function isValidPhoneNumber(value: unknown): boolean {
  const compact = String(value ?? "").trim().replace(/[\s().-]/g, "");
  if (!compact) return true;
  if (!/^\+\d{7,15}$/.test(compact)) return false;
  if (compact.startsWith("+33")) return /^\+33[1-9]\d{8}$/.test(compact);
  return true;
}



function uiTypeToPriceBook(t: string): import("@/lib/price-book").PriceBookDeviceType {
  const m: Record<string, import("@/lib/price-book").PriceBookDeviceType> = {
    Smartphone: "smartphone",
    Tablette: "tablet",
    Ordinateur: "computer",
    Console: "console",
    Autre: "other",
  };
  return m[t] ?? "other";
}

const INTERVENTION_ALIASES_EXT: Record<string, string[]> = {
  "Face ID / capteur": ["face id", "faceid", "face-id", "id face", "capteur face id", "nappe face id", "face id cassé"],
};

function buildQuoteLines(snapshot: PriceSnapshot, modelFull: string, issueLabel: string, finalPrice: number) {
  const lineId = () => `line_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const interventionLabel = (issueLabel || snapshot.reparation || snapshot.piece || "Réparation")
    .replace(/^Remplacement\s+/i, "Remplacement ")
    .trim();
  const tail = modelFull.trim();
  const total = finalPrice > 0 ? finalPrice : snapshot.prixClientTotal;
  if (total <= 0) return [];
  const description = (tail ? `${interventionLabel} — ${tail}` : interventionLabel).replace(/\s+/g, " ").trim();
  return [
    {
      id: lineId(),
      description,
      quantity: 1,
      unitPrice: total,
      total,
    },
  ];
}

export function RepairModal({
  initial,
  initialStatus,
  onClose,
}: Readonly<{ initial?: Repair; initialStatus: RepairStatus; onClose: () => void }>) {
  const {
    customers,
    priceBookItems,
    addCustomer,
    addPriceBookItem,
    addAppointment,
    updateRepair,
    addQuote,
    setSelected,
    addRepair,
  } = useBeharStore(
    useShallow((s) => ({
      customers: s.customers,
      priceBookItems: s.priceBookItems,
      addCustomer: s.addCustomer,
      addPriceBookItem: s.addPriceBookItem,
      addAppointment: s.addAppointment,
      updateRepair: s.updateRepair,
      addQuote: s.addQuote,
      setSelected: s.setSelected,
      addRepair: s.addRepair,
    })),
  );
  const router = useRouter();

  useEffect(() => {
    useBeharStore.getState().loadPreloadedCatalog();
  }, []);

  const [clientType, setClientType] = useState<"existant" | "nouveau" | "anonyme">("existant");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initial?.customerId || "");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState<(typeof countryOptions)[number]>("France");

  const [deviceType, setDeviceType] = useState<DeviceType>(initial?.deviceType ?? "Smartphone");
  const [marque, setMarque] = useState(initial?.brandName ?? "");
  const [modele, setModele] = useState(initial?.deviceModel ?? initial?.model ?? "");

  const [intervention, setIntervention] = useState(initial?.issue ?? "");
  const [interventionSearch, setInterventionSearch] = useState("");
  const [prixPiece, setPrixPiece] = useState("");
  const [mainOeuvre, setMainOeuvre] = useState("");
  const [customInterventionOpen, setCustomInterventionOpen] = useState(false);
  const [customInterventionName, setCustomInterventionName] = useState("");
  const [customInterventionPurchase, setCustomInterventionPurchase] = useState("");
  const [customInterventionSale, setCustomInterventionSale] = useState("");
  const [customInterventionLabor, setCustomInterventionLabor] = useState("");
  const [customInterventionFinal, setCustomInterventionFinal] = useState("");
  const [customInterventionSave, setCustomInterventionSave] = useState(true);
  // Anti-litige optionnel pendant la création
  const [view, setView] = useState<"form" | "intake">("form");
  const [intakeDraft, setIntakeDraft] = useState<RepairIntakeCondition | undefined>(initial?.intakeCondition);

  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("");

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [prixAchat, setPrixAchat] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [skuAdv, setSkuAdv] = useState("");
  const [stockAdv, setStockAdv] = useState("");
  const [garantieAdv, setGarantieAdv] = useState("");
  const [notesInternes, setNotesInternes] = useState("");
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  const [rdvOui, setRdvOui] = useState(false);
  const [rdvDate, setRdvDate] = useState("");
  const [rdvTime, setRdvTime] = useState("");
  const [rdvDuration, setRdvDuration] = useState("60 min");
  const [rdvMotif, setRdvMotif] = useState("");

  useEffect(() => {
    if (!initial) return;
    setClientType("existant");
    setSelectedCustomerId(initial.customerId);
    setDeviceType(initial.deviceType ?? "Smartphone");
    setMarque(initial.brandName ?? "");
    setModele(initial.deviceModel ?? initial.model ?? "");
    setIntervention(initial.issue ?? "");
    const snap = initial.selectedPriceSnapshot;
    if (snap) {
      setPrixPiece(String(snap.prixVentePiece ?? ""));
      setMainOeuvre(String(snap.mainOeuvre ?? ""));
      setSelectedCatalogId(snap.priceBookItemId ?? null);
      setSelectedQuality(snap.qualite ?? "");
    }
    setNotesInternes(initial.notes ?? "");
    if ((initial as any).amount && !snap) {
      setMainOeuvre(String((initial as any).amount));
    }
    if (initial.brandName && (initial.deviceModel || initial.model)) {
      setSelectedSeries(getDeviceSeries(initial.brandName, initial.deviceModel ?? initial.model ?? ""));
    }
  }, [initial?.id ?? null, (initial as any)?.quoteId ?? null]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const chosenCustomer = customers.find((c) => c.id === selectedCustomerId);
  const newPhoneParts = phoneParts(newPhone);
  const newPhoneLocal = formatPhoneLocal(newPhoneParts.prefix, newPhoneParts.local);
  const { cities: newPostalCities } = usePostalCities(newPostalCode, newCountry);
  const { suggestions: newAddressSuggestions } = useAddressAutocomplete(newAddress, newCountry);
  const setNewInternationalPhone = (prefixValue: string, localValue: string) => {
    const normalizedPrefix = `+${digitsOnly(prefixValue).slice(0, 4) || "33"}`;
    const local = formatPhoneLocal(normalizedPrefix, localValue);
    setNewPhone(local ? `${normalizedPrefix} ${local}` : normalizedPrefix);
  };
  const setNewPostal = (value: string) => {
    const maxLength = newCountry === "Suisse" ? 4 : 5;
    const postalCode = digitsOnly(value).slice(0, maxLength);
    setNewPostalCode(postalCode);
  };
  
  const priceBookType = useMemo(() => uiTypeToPriceBook(deviceType), [deviceType]);

  const brandOptions = useMemo(() => {
    // Source 1: Official Catalog
    const fromOfficial = deviceCatalog
      .filter((entry) => entry.category === priceBookType)
      .map((entry) => entry.brand);
      
    // Source 2: Store/Mocks
    const fromStore = deviceBrands
      .filter((entry) => entry.deviceTypes.includes(deviceType))
      .map((entry) => entry.name);
      
    // Source 3: Price Book (existing items)
    const fromCatalog = priceBookItems
      .filter((entry) => entry.typeAppareil === priceBookType)
      .map((entry) => entry.marque);
      
    return Array.from(new Set([...fromOfficial, ...fromStore, ...fromCatalog])).sort((a, b) => a.localeCompare(b, "fr"));
  }, [deviceType, priceBookType, priceBookItems]);

  const modelsBySeries = useMemo(() => {
    const normalizedBrand = marque.trim().toLowerCase();
    
    // Official Catalog
    const fromOfficial = deviceCatalog
      .find(b => b.brand.toLowerCase() === normalizedBrand || b.aliases.some(a => a.toLowerCase() === normalizedBrand))
      ?.models || [];
      
    // Store
    const matchingBrandIds = deviceBrands
      .filter((entry) => entry.name.toLowerCase() === normalizedBrand)
      .map((entry) => entry.id);
    const fromStore = deviceModels
      .filter((entry) => entry.deviceType === deviceType)
      .filter((entry) => matchingBrandIds.length === 0 || matchingBrandIds.includes(entry.brandId))
      .map((entry) => entry.name);
      
    // Price Book
    const fromCatalog = priceBookItems
      .filter((entry) => entry.typeAppareil === priceBookType)
      .filter((entry) => !normalizedBrand || entry.marque.toLowerCase() === normalizedBrand)
      .filter((entry) => entry.isActive !== false)
      .map((entry) => entry.modele);
      
    const allModels = Array.from(new Set([...fromOfficial, ...fromStore, ...fromCatalog]));
    
    const map = new Map<string, string[]>();
    for (const m of allModels) {
      const series = getDeviceSeries(marque, m);
      if (!map.has(series)) map.set(series, []);
      map.get(series)!.push(m);
    }
    
    return map;
  }, [deviceType, marque, priceBookType, priceBookItems, deviceBrands, deviceModels]);

  const seriesOptions = useMemo(() => {
    return Array.from(modelsBySeries.keys()).sort((a, b) => a.localeCompare(b, "fr"));
  }, [modelsBySeries]);

  const [selectedSeries, setSelectedSeries] = useState("");
  
  // Tous les modèles dispo pour la marque, toutes gammes confondues — permet la recherche transversale.
  const allModelsForBrand = useMemo(() => {
    const out: string[] = [];
    for (const list of modelsBySeries.values()) out.push(...list);
    return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b, "fr"));
  }, [modelsBySeries]);

  const modelOptions = useMemo(() => {
    // Si une gamme est choisie, on filtre ; sinon on expose tous les modèles de la marque
    // pour qu'un réparateur puisse taper "iPhone XR" directement sans avoir à deviner la gamme.
    if (!selectedSeries) return allModelsForBrand;
    return (modelsBySeries.get(selectedSeries) || []).sort((a, b) => a.localeCompare(b, "fr"));
  }, [modelsBySeries, selectedSeries, allModelsForBrand]);

  const interventionForMatch = useMemo(() => normalizeInterventionHint(intervention), [intervention]);

  const catalogPool = useMemo(() => {
    return findCatalogMatches(priceBookItems, {
      typeAppareil: uiTypeToPriceBook(deviceType),
      marque,
      modele,
      interventionHint: interventionForMatch || intervention,
    });
  }, [priceBookItems, deviceType, marque, modele, intervention, interventionForMatch]);

  const catalogByQuality = useMemo(() => groupCatalogByQualityLabel(catalogPool), [catalogPool]);
  const selectedInterventionKey = useMemo(
    () => canonicalizeIntervention((interventionForMatch || intervention || "").trim()),
    [intervention, interventionForMatch],
  );
  const qualityOptionsForIntervention = useMemo(() => {
    if (!selectedInterventionKey) return [];
    const matches = catalogPool.filter((item) => canonicalizeIntervention(item.reparation) === selectedInterventionKey);
    const byQuality = groupCatalogByQualityLabel(matches);
    const options: Array<{ label: string; itemId: string; price: number; item: (typeof matches)[number] }> = [];
    for (const [q, items] of byQuality.entries()) {
      const best = getBestPriceBookItem(items);
      if (!best) continue;
      options.push({ label: q, itemId: best.id, price: best.prixClientTotal, item: best });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [catalogPool, selectedInterventionKey]);

  // Auto-sélection d'une qualité si une seule existe (uniquement après intervention choisie)
  useEffect(() => {
    if (!selectedInterventionKey) return;
    if (selectedCatalogId) return;
    if (qualityOptionsForIntervention.length !== 1) return;
    const only = qualityOptionsForIntervention[0];
    setSelectedCatalogId(only.itemId);
    setSelectedQuality(only.label);
    setPrixPiece(String(only.item.prixVentePiece));
    setMainOeuvre(String(only.item.mainOeuvre));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInterventionKey, qualityOptionsForIntervention.length]);
  const interventionCards = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        price: number;
        labor: number;
        itemId?: string;
      }
    >();

    // 1. Catalog Items
    for (const item of catalogPool) {
      const label = canonicalizeIntervention(item.reparation);
      const existing = map.get(label);
      // Keep cheapest or first found
      if (!existing || (item.prixClientTotal > 0 && item.prixClientTotal < existing.price)) {
        map.set(label, { label, price: item.prixClientTotal, labor: item.mainOeuvre, itemId: item.id });
      }
    }

    // 2. Standard Items (Merge)
    for (const fallback of getDefaultInterventionsByDeviceType(deviceType)) {
      const canonicalFallback = canonicalizeIntervention(fallback);
      if (!map.has(canonicalFallback)) {
        map.set(canonicalFallback, { label: canonicalFallback, price: 0, labor: 0 });
      }
    }

    const all = Array.from(map.values());

    // 3. Filtering by search
    const q = interventionSearch.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    if (!q) return all.sort((a, b) => a.label.localeCompare(b.label, "fr"));

    return all
      .filter((entry) => {
        const labelNorm = entry.label.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
        if (labelNorm.includes(q)) return true;
        // Also check aliases
        const aliases = [
          ...(INTERVENTION_ALIASES[entry.label] || []),
          ...(INTERVENTION_ALIASES_EXT[entry.label] || []),
        ];
        return aliases.some((a) => a.toLowerCase().includes(q));
      })
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [catalogPool, deviceType, interventionSearch]);

  const selectedCatalogItem = useMemo(
    () => (selectedCatalogId ? priceBookItems.find((i) => i.id === selectedCatalogId) : undefined),
    [selectedCatalogId, priceBookItems],
  );

  const prixPieceNum = parseFloat(prixPiece.replace(",", ".") || "0") || 0;
  const mainNum = parseFloat(mainOeuvre.replace(",", ".") || "0") || 0;
  const totalClient = prixPieceNum + mainNum;

  const summarySource: "Catalogue atelier" | "Tarif manuel" | "À compléter" = useMemo(() => {
    if (!intervention) return "À compléter";
    if (totalClient <= 0) return "À compléter";
    if (selectedCatalogId && selectedCatalogItem) return "Catalogue atelier";
    return "Tarif manuel";
  }, [intervention, totalClient, selectedCatalogId, selectedCatalogItem]);

  const modelFull = modele ? `${marque} ${modele}`.replace(/\s+/g, " ").trim() : (marque || "");
  const summaryQuality = useMemo(() => {
    if (selectedCatalogItem) return extractPartQuality(selectedCatalogItem);
    return selectedQuality || "";
  }, [selectedCatalogItem, selectedQuality]);

  const resolveCustomerId = (): string => {
    if (clientType === "anonyme") {
      return addCustomer({
        name: "Client comptoir",
        phone: "Non renseigné",
        email: "Non renseigné",
        device: modelFull,
        lastRepair: intervention,
      });
    }
    if (clientType === "nouveau") {
      const address = [newAddress.trim(), [newPostalCode, newCity].filter(Boolean).join(" "), newCountry]
        .filter(Boolean)
        .join(", ");
      return addCustomer({
        name: newName.trim() || "Nouveau client",
        phone: newPhone.trim() || "Non renseigné",
        email: newEmail.trim() || "Non renseigné",
        address,
        device: modelFull,
        lastRepair: intervention,
      });
    }
    return selectedCustomerId;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const intent = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "repair";
    const withQuote = intent === "repair-quote";

    if (!marque.trim()) {
      toast.error("Sélectionnez une marque.");
      return;
    }

    if (!modele.trim()) {
      toast.error("Sélectionnez un modèle.");
      return;
    }

    if (!intervention.trim()) {
      toast.error("Sélectionnez une intervention.");
      return;
    }

    if (clientType === "nouveau" && newPhone.trim() && !isValidPhoneNumber(newPhone)) {
      toast.error("Numéro client invalide.");
      return;
    }

    const customerId = resolveCustomerId();
    if (clientType === "existant" && !customerId) {
      toast.error("Sélectionnez un client.");
      return;
    }

    const finalIssue = canonicalizeIntervention(intervention.trim());
    let savedPbId: string | undefined;

    if (saveToCatalog && !initial) {
      savedPbId = addPriceBookItem({
        source: "manual",
        typeAppareil: uiTypeToPriceBook(deviceType),
        marque,
        modele,
        reparation: finalIssue,
        piece: finalIssue,
        qualite: "Personnalisé",
        prixAchat: parseFloat(prixAchat.replace(",", ".") || "0") || 0,
        prixVentePiece: prixPieceNum,
        mainOeuvre: mainNum,
        fournisseur: fournisseur || undefined,
        sku: skuAdv || undefined,
        stockDisponible: stockAdv ? parseInt(stockAdv, 10) : undefined,
        garantie: garantieAdv || undefined,
        notes: notesInternes || undefined,
      });
    }

    const fromCatalog = Boolean(selectedCatalogItem && selectedCatalogId);
    let snapshot: PriceSnapshot;

    if (fromCatalog && selectedCatalogItem) {
      snapshot = {
        source: "catalogue",
        priceBookItemId: selectedCatalogItem.id,
        typeAppareil: deviceType,
        marque,
        modele,
        piece: selectedCatalogItem.piece,
        reparation: selectedCatalogItem.reparation,
        qualite: selectedCatalogItem.qualite,
        sku: selectedCatalogItem.sku,
        fournisseur: selectedCatalogItem.fournisseur,
        prixAchat: selectedCatalogItem.prixAchat,
        prixVentePiece: prixPieceNum,
        mainOeuvre: mainNum,
        prixClientTotal: totalClient,
        marge: selectedCatalogItem.marge,
        garantie: selectedCatalogItem.garantie,
        notes: notesInternes || selectedCatalogItem.notes,
        stockDisponible: selectedCatalogItem.stockDisponible,
        selectedAt: new Date().toISOString(),
      };
    } else {
      snapshot = {
        source: "manual",
        priceBookItemId: savedPbId,
        typeAppareil: deviceType,
        marque,
        modele,
        piece: finalIssue,
        reparation: finalIssue,
        qualite: "Personnalisé",
        sku: skuAdv || undefined,
        fournisseur: fournisseur || undefined,
        prixAchat: prixAchat ? parseFloat(prixAchat.replace(",", ".")) : undefined,
        prixVentePiece: prixPieceNum,
        mainOeuvre: mainNum,
        prixClientTotal: totalClient,
        marge:
          prixAchat && parseFloat(prixAchat.replace(",", "."))
            ? totalClient - parseFloat(prixAchat.replace(",", "."))
            : undefined,
        garantie: garantieAdv || undefined,
        notes: notesInternes || undefined,
        stockDisponible: stockAdv ? parseInt(stockAdv, 10) : undefined,
        selectedAt: new Date().toISOString(),
      };
    }

    let appointmentId: string | undefined;
    if (rdvOui) {
      if (!rdvDate || !rdvTime || !rdvMotif.trim()) {
        toast.error("Remplissez date, heure et motif du rendez-vous.");
        return;
      }
      const aid = addAppointment({
        customerId,
        device: modelFull,
        issue: rdvMotif.trim(),
        date: rdvDate,
        time: rdvTime,
        duration: rdvDuration || "60 min",
        notes: "",
      });
      if (!aid) {
        toast.error("Impossible de créer le rendez-vous.");
        return;
      }
      appointmentId = aid;
    }

    const deviceLabel = modelFull;
    const histCreate = ["Réparation créée"];
    if (fromCatalog) histCreate.push("Tarif issu du catalogue atelier");
    else histCreate.push("Tarif saisi manuellement");
    if (saveToCatalog) histCreate.push("Tarif enregistré dans le catalogue");
    if (appointmentId) histCreate.push("Rendez-vous créé");

    const basePayload = {
      customerId,
      deviceType,
      brandId: marque,
      brandName: marque,
      modelId: modele,
      deviceModel: modele,
      issueType: "Diagnostic",
      device: deviceLabel,
      model: modele || marque,
      issue: finalIssue,
      status: (initial?.status ?? initialStatus) as RepairStatus,
      amount: totalClient,
      laborPrice: mainNum,
      total: totalClient,
      notes: notesInternes || "",
      technician: "Atelier principal",
      imei: "Non renseigné",
      estimatedDoneAt: getTomorrowIso(),
      appointmentId,
      selectedPriceSnapshot: snapshot,
      ...(intakeDraft ? { intakeCondition: intakeDraft } : {}),
    };

    if (initial) {
      updateRepair(initial.id, {
        ...basePayload,
        history: [...initial.history, "Fiche réparation mise à jour"],
      });
      if (withQuote && totalClient > 0) {
        const lines = buildQuoteLines(snapshot, modelFull, finalIssue, totalClient);
        if (lines.length) {
          const quoteId = addQuote({ customerId, repairId: initial.id, lines });
          if (quoteId) {
            toast.success("Réparation mise à jour et devis créé");
            setSelected("quote", quoteId);
            onClose();
            router.push("/dashboard/devis");
            return;
          }
        }
      }
      toast.success("Réparation modifiée");
      onClose();
      return;
    }

    const repairId = addRepair({
      ...basePayload,
      droppedAt: getNowIso(),
      history: histCreate,
    });
    if (!repairId) {
      toast.error("Création impossible.");
      return;
    }

    if (withQuote) {
      if (totalClient <= 0) {
        toast.error("Ajoutez un tarif pour créer un devis.");
        return;
      }
      const lines = buildQuoteLines(snapshot, modelFull, finalIssue, totalClient);
      if (!lines.length) {
        toast.error("Aucune ligne de devis.");
        return;
      }
      const quoteId = addQuote({ customerId, repairId, lines });
      if (quoteId) {
        toast.success("Réparation et devis créés");
        setSelected("quote", quoteId);
        onClose();
        router.push("/dashboard/devis");
        return;
      }
      toast.error("Devis non créé");
      return;
    }

    toast.success("Réparation créée");
    setSelected("repair", repairId);
    onClose();
    router.push("/dashboard/reparations");
  };

  const suggestionChips = filterSuggestionChips(intervention, deviceType);
  const canSubmitQuote = totalClient > 0 && intervention.trim().length > 0;

  // Minimums pour créer une réparation : client résolvable + appareil + intervention.
  // Le prix peut être vide (diagnostic sans prix accepté), mais l'intervention reste obligatoire.
  const hasClient =
    clientType === "anonyme" ||
    (clientType === "nouveau" && newName.trim().length > 0) ||
    (clientType === "existant" && selectedCustomerId.length > 0);
  const canSubmitRepair = hasClient && marque.trim().length > 0 && modele.trim().length > 0 && intervention.trim().length > 0;
  const missingSummary: string[] = [];
  if (!hasClient) missingSummary.push("client");
  if (!marque.trim()) missingSummary.push("marque");
  if (!modele.trim()) missingSummary.push("modèle");
  if (!intervention.trim()) missingSummary.push("intervention");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#1A1916]/20 p-4 backdrop-blur-sm"
      data-testid="new-repair-modal"
    >
      <div className={`relative flex w-full ${view === "intake" ? "max-w-6xl" : "max-w-5xl"} flex-col overflow-hidden rounded-[20px] border border-[#E7E4DC] bg-white shadow-2xl md:max-h-[92vh] ${view === "intake" ? "" : "md:flex-row"}`}>
        {view === "intake" ? (
          <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
            <RepairIntakeScreen
              repair={{
                id: initial?.id ?? "draft",
                shopId: "shop_atelier_belmin",
                number: initial?.number ?? "Nouvelle réparation",
                customerId: resolveCustomerId() || "",
                deviceType,
                brandName: marque || "—",
                brandId: marque,
                model: modele || marque,
                deviceModel: modele,
                modelId: modele,
                device: modelFull || "Appareil",
                issue: intervention || "—",
                issueType: "Diagnostic",
                status: (initial?.status ?? "Nouvelle") as RepairStatus,
                amount: 0,
                laborPrice: 0,
                total: 0,
                notes: "",
                droppedAt: getNowIso(),
                history: [],
                technician: "Atelier principal",
                imei: "Non renseigné",
                intakeCondition: intakeDraft,
              } as unknown as Repair}
              customer={chosenCustomer}
              onBack={() => setView("form")}
              onDownload={() => {
                toast.info("Le bon de prise en charge sera disponible après création.");
              }}
              onOpenDocuments={() => {
                toast.info("Les documents seront disponibles après création de la réparation.");
              }}
              onSave={(intakeCondition) => {
                setIntakeDraft(intakeCondition);
                toast.success("État d'entrée enregistré pour cette réparation.");
              }}
            />
          </div>
        ) : (
        <>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 md:max-h-[92vh] md:p-8">
          <div className="mb-7 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#1A1916] text-[20px] tracking-tight">
                  {initial ? "Modifier la réparation" : "Nouvelle réparation"}
              </h2>
              <p className="mt-1 text-[#8A8984] text-[14px]">Client → Appareil → Intervention → Tarif client</p>
            </div>
            <button className="grid size-9 place-items-center rounded-full text-[#8A8984] transition hover:bg-[#F6F7F4] hover:text-[#6B6B6B]" onClick={onClose} type="button">
              <X className="size-5" />
            </button>
          </div>

          <form className="space-y-6" id="repair-quick-form" onSubmit={handleSubmit}>
            {/* 1 Client */}
            <section className="space-y-4">
              <h3 className="text-[14px] text-[#1A1916] font-medium"><span className="text-[#2A9D8F]">1.</span> Client</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                {(["existant", "nouveau", "anonyme"] as const).map((m) => (
                  <label className="flex cursor-pointer items-center gap-2" key={m}>
                    <input
                      checked={clientType === m}
                      className="accent-[#167B70]"
                      name="clientType"
                      onChange={() => setClientType(m)}
                      type="radio"
                    />
                    {m === "existant" ? "Client existant" : m === "nouveau" ? "Nouveau client" : "Client comptoir"}
                  </label>
                ))}
              </div>

              {clientType === "anonyme" && (
                <p className="rounded-lg border border-[#E7E4DC] bg-[#FAFAF8] px-3 py-2 text-[#6B6B6B] text-sm">
                  Client comptoir — informations à compléter plus tard.
                </p>
              )}

              {clientType === "existant" && (
                <div className="space-y-2">
                  <label className="text-[#6B6B6B] text-xs">Sélectionner un client</label>
                    <Combobox
                      ariaLabel="Sélectionner un client"
                      inputTestId="repair-customer-select"
                      leftIcon={<User className="size-4" />}
                    onChange={(name) => {
                      setCustomerSearch(name);
                      const match = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
                      setSelectedCustomerId(match ? match.id : "");
                    }}
                    options={filteredCustomers.map((c) => c.name)}
                    placeholder="Nom du client…"
                    value={chosenCustomer?.name ?? ""}
                  />
                </div>
              )}

              {clientType === "nouveau" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    className="h-11 rounded-xl border border-[#E7E4DC] px-3 text-sm"
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom *"
                    value={newName}
                  />
                  <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[90px_1fr] gap-2">
                    <select
                      aria-label="Indicatif client"
                      className="min-w-0 h-11 w-full rounded-xl border border-[#E7E4DC] pl-3 pr-6 text-sm appearance-none bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B6B6B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[position:right_8px_center] bg-no-repeat overflow-hidden text-ellipsis"
                      onChange={(e) => setNewInternationalPhone(e.target.value, newPhoneParts.local)}
                      value={(CALLING_CODES as readonly string[]).includes(newPhoneParts.prefix) ? newPhoneParts.prefix : "+33"}
                    >
                      {CALLING_CODES.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                    <input
                      aria-label="Téléphone client"
                      className="min-w-0 h-11 w-full rounded-xl border border-[#E7E4DC] px-3 text-sm"
                      inputMode="tel"
                      onChange={(e) => setNewInternationalPhone(newPhoneParts.prefix, e.target.value)}
                      placeholder={newPhoneParts.prefix === "+33" ? "6 12 34 56 78" : "Numéro local"}
                      value={newPhoneLocal}
                    />
                  </div>
                  <div className="relative min-w-0">
                    <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6B6B6B]" />
                    <input
                      className="min-w-0 h-11 w-full rounded-xl border border-[#E7E4DC] py-2 pr-3 pl-10 text-sm"
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Email (optionnel)"
                      type="email"
                      value={newEmail}
                    />
                  </div>
                  <select
                    className="h-11 rounded-xl border border-[#E7E4DC] px-3 pr-8 text-sm appearance-none bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B6B6B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat"
                    onChange={(e) => {
                      setNewCountry(e.target.value as (typeof countryOptions)[number]);
                      if (e.target.value === "Suisse" && newPhoneParts.prefix === "+33") {
                        setNewInternationalPhone("+41", newPhoneParts.local);
                      }
                    }}
                    value={newCountry}
                  >
                    {countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
                  </select>
                  <input
                    className="h-11 rounded-xl border border-[#E7E4DC] px-3 text-sm"
                    inputMode="numeric"
                    onChange={(e) => setNewPostal(e.target.value)}
                    placeholder="Code postal"
                    value={newPostalCode}
                  />
                  <div className="relative">
                    <input
                      className="h-11 w-full rounded-xl border border-[#E7E4DC] px-3 text-sm"
                      onChange={(e) => setNewCity(e.target.value)}
                      onBlur={() => {
                        if (newCity && !newPostalCode && newCountry === "France") {
                          fetchPostalCodeByCity(newCity, newCountry).then((code) => {
                            if (code) setNewPostalCode(code);
                          });
                        }
                      }}
                      placeholder="Ville"
                      value={newCity}
                      list="city-suggestions"
                    />
                    {newPostalCities.length > 0 && (
                      <datalist id="city-suggestions">
                        {newPostalCities.map((city) => <option key={city} value={city} />)}
                      </datalist>
                    )}
                  </div>
                  <input
                    className="h-11 rounded-xl border border-[#E7E4DC] px-3 text-sm sm:col-span-3"
                    list="repair-address-suggestions"
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAddress(val);
                      const match = newAddressSuggestions.find(s => s.label === val || s.name === val);
                      if (match) {
                        setNewAddress(match.name);
                        if (match.postcode) setNewPostalCode(match.postcode);
                        if (match.city) setNewCity(match.city);
                      }
                    }}
                    placeholder="Adresse client"
                    value={newAddress}
                  />
                  {newAddressSuggestions.length > 0 && (
                    <datalist id="repair-address-suggestions">
                      {newAddressSuggestions.map((s) => (
                        <option key={s.label} value={s.label} />
                      ))}
                    </datalist>
                  )}
                </div>
              )}
            </section>

            {/* 2 Appareil */}
            <section className="space-y-4 border-[#F1F1EF] border-t pt-5">
              <h3 className="text-[14px] text-[#1A1916] font-medium"><span className="text-[#2A9D8F]">2.</span> Appareil</h3>
              <div className="flex flex-wrap gap-2">
                {UI_DEVICE_TYPES.map((t) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      deviceType === t
                        ? "border-[#2A9D8F] bg-[#E8F7F3] text-[#1A1916]"
                        : "border-[#E7E4DC] bg-white text-[#6B6B6B] hover:border-[#2A9D8F]/50"
                    }`}
                    key={t}
                    data-testid={
                      {
                        Smartphone: "device-type-smartphone",
                        Tablette: "device-type-tablet",
                        Ordinateur: "device-type-computer",
                        Console: "device-type-console",
                        Autre: "device-type-other",
                      }[t]
                    }
                    onClick={() => {
                      setDeviceType(t);
                      setMarque("");
                      setModele("");
                      setIntervention("");
                      setSelectedCatalogId(null);
                      setSelectedQuality("");
                    }}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {deviceType && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[#6B6B6B] text-xs">Marque</label>
                    <Combobox
                      ariaLabel="Marque"
                      allowCreate
                      createLabel="Ajouter la marque"
                      inputTestId="repair-brand-select"
                      onChange={(next) => {
                        setMarque(next);
                        setSelectedSeries("");
                        setModele("");
                        setIntervention("");
                        setInterventionSearch("");
                        setSelectedCatalogId(null);
                        setSelectedQuality("");
                        setPrixPiece("");
                        setMainOeuvre("");
                      }}
                      options={brandOptions}
                      placeholder="Apple, Samsung, Sony…"
                      value={marque}
                    />
                  </div>
                  {marque && (
                    <>
                      <div>
                        <label className="mb-1 block text-[#6B6B6B] text-xs">Gamme / Série</label>
                        <Combobox
                          ariaLabel="Gamme / Série"
                          disabled={!marque.trim()}
                          inputTestId="repair-variant-select"
                          onChange={(next) => {
                            setSelectedSeries(next);
                            setModele("");
                            setIntervention("");
                            setInterventionSearch("");
                            setSelectedCatalogId(null);
                            setSelectedQuality("");
                            setPrixPiece("");
                            setMainOeuvre("");
                          }}
                          options={seriesOptions}
                          placeholder="Ex. iPhone 13, Galaxy S…"
                          value={selectedSeries}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[#6B6B6B] text-xs">
                          Modèle{!selectedSeries ? " (recherche libre)" : ""}
                        </label>
                        <Combobox
                          ariaLabel="Modèle"
                          allowCreate
                          createLabel="Utiliser ce modèle quand même"
                          inputTestId="repair-model-select"
                          leftIcon={<Tag className="size-4" />}
                          onChange={(next) => {
                            setModele(next);
                            // Si l'utilisateur tape directement un modèle sans choisir la gamme,
                            // on déduit la gamme automatiquement pour garder l'UX cohérente.
                            if (next && marque) {
                              const inferredSeries = getDeviceSeries(marque, next);
                              if (inferredSeries && inferredSeries !== selectedSeries) {
                                setSelectedSeries(inferredSeries);
                              }
                            }
                            setIntervention("");
                            setInterventionSearch("");
                            setSelectedCatalogId(null);
                            setSelectedQuality("");
                            setPrixPiece("");
                            setMainOeuvre("");
                          }}
                          options={modelOptions}
                          placeholder="Ex. iPhone XR, Switch OLED, ThinkPad…"
                          value={modele}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* 3 Intervention */}
            <section className="space-y-4 border-[#F1F1EF] border-t pt-5">
              <h3 className="text-[14px] text-[#1A1916] font-medium"><span className="text-[#2A9D8F]">3.</span> Intervention</h3>

              {!modele ? (
                <div className="rounded-xl border border-dashed border-[#E7E4DC] bg-[#FAFAF8] py-8 text-center">
                  <p className="text-[#6B6B6B] text-sm">Sélectionnez un modèle pour voir les interventions disponibles.</p>
                </div>
              ) : (
                <>
                  <input
                    className="h-11 w-full rounded-xl border border-[#E7E4DC] px-3 text-sm focus:border-[#2A9D8F] focus:outline-none"
                    onChange={(e) => setInterventionSearch(e.target.value)}
                    placeholder="Filtrer: vitre, batterie, connecteur, sim..."
                    value={interventionSearch}
                  />

                  <div className="flex flex-wrap gap-2">
                    {interventionCards.map((entry) => {
                      const isSelected = intervention === entry.label;
                      return (
                        <button
                          className={`group relative flex min-w-[120px] flex-col rounded-xl border p-3 text-left transition ${
                            isSelected
                              ? "border-[#2A9D8F] bg-[#E8F7F3]"
                              : "border-[#E7E4DC] bg-white hover:border-[#2A9D8F]/50"
                          }`}
                          key={entry.label}
                          onClick={() => {
                            setIntervention(entry.label);
                            setInterventionSearch(entry.label);
                            setSelectedCatalogId(null);
                            setSelectedQuality("");
                            // If it has a price in catalog, it will be auto-selected by useEffect
                          }}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-semibold text-xs ${isSelected ? "text-[#167B70]" : "text-[#1A1916]"}`}>
                              {entry.label}
                            </span>
                            {isSelected && <Check className="size-3 text-[#2A9D8F]" />}
                          </div>
                          <div className="mt-1 flex flex-col">
                            {entry.price > 0 ? (
                              <span className="font-bold text-[#2A9D8F] text-sm">{formatEuro(entry.price)}</span>
                            ) : (
                              <span className="text-[#6B6B6B] text-xs italic">Prix à définir</span>
                            )}
                            {entry.itemId && (
                              <span className={`text-[10px] mt-0.5 ${
                                priceBookItems.find(i => i.id === entry.itemId)?.stockDisponible ?? 0 > 0 
                                  ? "text-[#167B70]" 
                                  : "text-red-500 font-medium"
                              }`}>
                                Stock: {priceBookItems.find(i => i.id === entry.itemId)?.stockDisponible ?? 0}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    <button
                      className="flex min-w-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E7E4DC] bg-[#FAFAF8] p-3 text-[#6B6B6B] transition hover:border-[#2A9D8F]/50 hover:bg-white"
                      onClick={() => setCustomInterventionOpen((prev) => !prev)}
                      type="button"
                    >
                      <span className="text-xs">+ Ajouter</span>
                      <span className="text-[10px]">Intervention</span>
                    </button>
                  </div>

                  {interventionCards.length === 0 && interventionSearch.trim() && (
                    <p className="py-2 text-[#6B6B6B] text-xs">
                      Aucune intervention trouvée. Utilisez le bouton "+ Ajouter" pour en créer une personnalisée.
                    </p>
                  )}
                </>
              )}
              {customInterventionOpen && (
                <div className="grid gap-2 rounded-xl border border-[#E7E4DC] bg-[#FAFAF8] p-3 sm:grid-cols-2">
                  <input
                    className="h-10 rounded-lg border border-[#E7E4DC] bg-white px-3 text-sm sm:col-span-2"
                    onChange={(e) => setCustomInterventionName(e.target.value)}
                    placeholder="Nom intervention (ex: Lecteur carte SIM)"
                    value={customInterventionName}
                  />
                  <input
                    className="h-10 rounded-lg border border-[#E7E4DC] bg-white px-3 text-sm"
                    inputMode="decimal"
                    onChange={(e) => setCustomInterventionPurchase(e.target.value)}
                    placeholder="Prix achat conseillé (optionnel)"
                    value={customInterventionPurchase}
                  />
                  <input
                    className="h-10 rounded-lg border border-[#E7E4DC] bg-white px-3 text-sm"
                    inputMode="decimal"
                    onChange={(e) => setCustomInterventionSale(e.target.value)}
                    placeholder="Prix vente conseillé"
                    value={customInterventionSale}
                  />
                  <input
                    className="h-10 rounded-lg border border-[#E7E4DC] bg-white px-3 text-sm"
                    inputMode="decimal"
                    onChange={(e) => setCustomInterventionLabor(e.target.value)}
                    placeholder="Main-d'œuvre conseillée"
                    value={customInterventionLabor}
                  />
                  <input
                    className="h-10 rounded-lg border border-[#2A9D8F]/40 bg-white px-3 text-sm"
                    inputMode="decimal"
                    onChange={(e) => setCustomInterventionFinal(e.target.value)}
                    placeholder="Prix client final (€)"
                    value={customInterventionFinal}
                  />
                  <label className="flex items-center gap-2 text-xs sm:col-span-2">
                    <input
                      checked={customInterventionSave}
                      className="accent-[#2A9D8F]"
                      onChange={(e) => setCustomInterventionSave(e.target.checked)}
                      type="checkbox"
                    />
                    Enregistrer pour les prochaines fois
                  </label>
                  <button
                    className="rounded-lg bg-[#2A9D8F] px-3 py-2 font-medium text-white text-xs sm:col-span-2"
                    onClick={() => {
                      const name = customInterventionName.trim();
                      if (!name) {
                        toast.error("Nom d'intervention requis.");
                        return;
                      }
                      const sale = parseFloat(customInterventionSale.replace(",", ".") || "0") || 0;
                      const labor = parseFloat(customInterventionLabor.replace(",", ".") || "0") || 0;
                      const purchase = parseFloat(customInterventionPurchase.replace(",", ".") || "0") || 0;
                      const finalPrice = parseFloat(customInterventionFinal.replace(",", ".") || "0") || 0;

                      let pieceValue = sale;
                      let laborValue = labor;
                      if (finalPrice > 0) {
                        if (sale + labor !== finalPrice) {
                          if (sale > 0 && labor === 0) {
                            pieceValue = finalPrice;
                          } else if (labor > 0 && sale === 0) {
                            laborValue = finalPrice;
                            pieceValue = 0;
                          } else if (sale === 0 && labor === 0) {
                            pieceValue = finalPrice;
                          } else {
                            const ratio = finalPrice / (sale + labor || 1);
                            pieceValue = Math.round(sale * ratio * 100) / 100;
                            laborValue = Math.round(labor * ratio * 100) / 100;
                          }
                        }
                      }

                      setIntervention(canonicalizeIntervention(name));
                      setInterventionSearch(name);
                      setPrixPiece(String(pieceValue));
                      setMainOeuvre(String(laborValue));
                      if (purchase > 0) setPrixAchat(String(purchase));
                      setSaveToCatalog(customInterventionSave);
                      setSelectedCatalogId(null);
                      setCustomInterventionOpen(false);
                      toast.success(
                        customInterventionSave
                          ? "Intervention enregistrée pour les prochaines fois."
                          : "Intervention ajoutée à cette réparation.",
                      );
                    }}
                    type="button"
                  >
                    Utiliser cette intervention
                  </button>
                </div>
              )}
            </section>

            {/* Catalogue (aide) */}
            {catalogPool.length > 0 && marque.trim() && modele.trim() && (
              <div className="rounded-xl border border-[#E8F7F3] bg-[#F8FCFA] p-4">
                  <p className="mb-2 font-semibold text-[#167B70] text-sm">Catalogue atelier</p>

                  {selectedInterventionKey && qualityOptionsForIntervention.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[#6B6B6B] text-xs">
                        Qualité pièce disponible pour <span className="font-medium text-[#1A1916]">{intervention}</span>
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {qualityOptionsForIntervention.map((opt) => {
                          const active = selectedCatalogId === opt.itemId || selectedQuality === opt.label;
                          return (
                            <button
                              className={`rounded-lg border p-3 text-left text-sm transition ${
                                active
                                  ? "border-[#167B70] bg-white shadow-sm"
                                  : "border-[#E7E4DC] bg-white hover:border-[#167B70]/40"
                              }`}
                              key={opt.itemId}
                              onClick={() => {
                                setSelectedCatalogId(opt.itemId);
                                setSelectedQuality(opt.label);
                                setPrixPiece(String(opt.item.prixVentePiece));
                                setMainOeuvre(String(opt.item.mainOeuvre));
                              }}
                              type="button"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-[#1A1916]">{opt.label}</span>
                                <div className="text-right">
                                  <span className="block font-semibold text-[#167B70]">{formatEuro(opt.price)}</span>
                                  <span className={`text-[10px] ${opt.item.stockDisponible ?? 0 > 0 ? "text-[#167B70]" : "text-red-500 font-medium"}`}>
                                    Stock: {opt.item.stockDisponible ?? 0}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1 text-[#6B6B6B] text-xs">{opt.item.piece}</div>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        className="mt-1 text-[#167B70] text-xs underline"
                        onClick={() => {
                          setSelectedCatalogId(null);
                          setSelectedQuality("");
                        }}
                        type="button"
                      >
                        Ignorer le catalogue et saisir un tarif manuel
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-48 space-y-3 overflow-y-auto">
                      {[...catalogByQuality.entries()].map(([quality, items]) => {
                        const best = getBestPriceBookItem(items);
                        if (!best) return null;
                        const active = selectedCatalogId === best.id;
                        return (
                          <button
                            className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                              active
                                ? "border-[#167B70] bg-white shadow-sm"
                                : "border-[#E7E4DC] bg-white hover:border-[#167B70]/40"
                            }`}
                            key={quality}
                            onClick={() => {
                              setSelectedCatalogId(best.id);
                              setSelectedQuality(extractPartQuality(best));
                              setPrixPiece(String(best.prixVentePiece));
                              setMainOeuvre(String(best.mainOeuvre));
                            }}
                            type="button"
                          >
                            <span className="font-medium text-[#1A1916]">{best.reparation}</span>
                            <span className="text-[#6B6B6B]"> · {extractPartQuality(best)}</span>
                            <div className="mt-1 flex justify-between items-end text-[#167B70]">
                              <div>
                                <span className="block text-[#167B70] text-xs">Prix client proposé</span>
                                <span className="font-semibold">{formatEuro(best.prixClientTotal)}</span>
                              </div>
                              <span className={`text-[10px] font-medium ${best.stockDisponible ?? 0 > 0 ? "text-[#167B70]" : "text-red-500"}`}>
                                Stock: {best.stockDisponible ?? 0}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {/* 4 Tarif */}
            {intervention && (
              <section className="space-y-4 border-[#F1F1EF] border-t pt-5">
                <h3 className="text-[14px] text-[#1A1916] font-medium"><span className="text-[#2A9D8F]">4.</span> Tarif client</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs">
                    <span className="text-[#6B6B6B]">Prix pièce / prestation (€)</span>
                    <input
                      className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] px-3 text-sm focus:border-[#2A9D8F] focus:outline-none"
                      inputMode="decimal"
                      onChange={(e) => {
                        setSelectedCatalogId(null);
                        setSelectedQuality("");
                        setPrixPiece(e.target.value);
                      }}
                      placeholder="0.00"
                      value={prixPiece}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="text-[#6B6B6B]">Main-d&apos;œuvre (€)</span>
                    <input
                      className="mt-1 h-11 w-full rounded-xl border border-[#E7E4DC] px-3 text-sm focus:border-[#2A9D8F] focus:outline-none"
                      inputMode="decimal"
                      onChange={(e) => {
                        setSelectedCatalogId(null);
                        setSelectedQuality("");
                        setMainOeuvre(e.target.value);
                      }}
                      placeholder="0.00"
                      value={mainOeuvre}
                    />
                  </label>
                  <div className="flex flex-col justify-end">
                    <span className="text-[#6B6B6B] text-xs">Total client</span>
                    {totalClient > 0 ? (
                      <span className="font-bold text-[#167B70] text-xl">{formatEuro(totalClient)}</span>
                    ) : (
                      <span className="font-bold text-[#6B6B6B] text-xl">—</span>
                    )}
                  </div>
                </div>
                {totalClient <= 0 && (
                  <p className="text-[#6B6B6B] text-[11px] italic">
                    Aucun tarif défini. Vous pourrez le compléter plus tard sur la fiche réparation.
                  </p>
                )}
              </section>
            )}

            <div className="rounded-xl border border-[#E7E4DC] bg-[#FAFAF8] p-3">
              <button
                className="flex w-full cursor-pointer items-center justify-between font-medium text-[#1A1916] text-sm"
                onClick={() => setAdvancedOpen((o) => !o)}
                type="button"
              >
                Options avancées
                <ChevronDown className={`size-4 transition ${advancedOpen ? "rotate-180" : ""}`} />
              </button>
              {advancedOpen && (
                <div className="mt-4 grid gap-3 border-[#E7E4DC] border-t pt-4 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="text-[#6B6B6B]">Prix achat interne (€)</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2 text-sm"
                      onChange={(e) => setPrixAchat(e.target.value)}
                      value={prixAchat}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="text-[#6B6B6B]">Fournisseur</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2 text-sm"
                      onChange={(e) => setFournisseur(e.target.value)}
                      value={fournisseur}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="text-[#6B6B6B]">SKU</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2 text-sm"
                      onChange={(e) => setSkuAdv(e.target.value)}
                      value={skuAdv}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="text-[#6B6B6B]">Stock (interne)</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2 text-sm"
                      onChange={(e) => setStockAdv(e.target.value)}
                      value={stockAdv}
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-[#6B6B6B]">Garantie</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2 text-sm"
                      onChange={(e) => setGarantieAdv(e.target.value)}
                      value={garantieAdv}
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-[#6B6B6B]">Notes internes</span>
                    <textarea
                      className="mt-1 min-h-[64px] w-full rounded-lg border border-[#E7E4DC] px-2 py-1 text-sm"
                      onChange={(e) => setNotesInternes(e.target.value)}
                      value={notesInternes}
                    />
                  </label>
                  <label className="flex items-center gap-2 sm:col-span-2">
                    <input
                      checked={saveToCatalog}
                      className="accent-[#167B70]"
                      onChange={(e) => setSaveToCatalog(e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-sm">Enregistrer ce tarif dans le catalogue atelier</span>
                  </label>
                </div>
              )}
            </div>

            {/* RDV */}
            <section className="space-y-2 border-[#E7E4DC] border-t pt-4">
              <p className="font-medium text-[#1A1916] text-sm">Ajouter un rendez-vous ?</p>
              <div className="flex gap-6 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    checked={!rdvOui}
                    className="accent-[#167B70]"
                    onChange={() => setRdvOui(false)}
                    type="radio"
                  />
                  Non
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    checked={rdvOui}
                    className="accent-[#167B70]"
                    onChange={() => {
                      setRdvOui(true);
                      setRdvMotif((m) => {
                        if (m.trim()) return m;
                        if (!intervention.trim()) return m;
                        return `${intervention.trim()} — ${modelFull}`;
                      });
                    }}
                    type="radio"
                  />
                  Oui
                </label>
              </div>
              {rdvOui && (
                <div className="grid gap-2 rounded-xl bg-[#FAFAF8] p-3 sm:grid-cols-2">
                  <label className="text-xs">
                    Date *
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2"
                      onChange={(e) => setRdvDate(e.target.value)}
                      required={rdvOui}
                      type="date"
                      value={rdvDate}
                    />
                  </label>
                  <label className="text-xs">
                    Heure *
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2"
                      onChange={(e) => setRdvTime(e.target.value)}
                      required={rdvOui}
                      type="time"
                      value={rdvTime}
                    />
                  </label>
                  <label className="text-xs">
                    Durée
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2"
                      onChange={(e) => setRdvDuration(e.target.value)}
                      value={rdvDuration}
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    Motif *
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[#E7E4DC] px-2"
                      onChange={(e) => setRdvMotif(e.target.value)}
                      placeholder={`${intervention || "Intervention"} — ${modelFull}`}
                      value={rdvMotif}
                    />
                  </label>
                </div>
              )}
            </section>

            {/* État d'entrée / anti-litige (optionnel) */}
            <section className="space-y-3 rounded-[16px] border border-[#E7E4DC] bg-[#FAFAF8] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[#1A1916] text-sm flex items-center gap-2">
                    <ReceiptText className="size-4 text-[#2A9D8F]" />
                    État d'entrée / anti-litige
                  </p>
                  <p className="mt-1 text-[#6B6B6B] text-xs">
                    Optionnel — notez l'état visible de l'appareil au dépôt pour éviter les litiges.
                  </p>
                </div>
                {intakeDraft ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAF6F2] px-2.5 py-1 text-[11px] font-semibold text-[#147065]">
                    <Check className="size-3" /> État d'entrée préparé
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-[#FCEFCC] px-2.5 py-1 text-[11px] font-semibold text-[#8A6914]">
                    Optionnel
                  </span>
                )}
              </div>
              <SecondaryButton
                className="h-10"
                onClick={() => setView("intake")}
                type="button"
              >
                {intakeDraft ? "Modifier l'état d'entrée" : "Compléter l'état d'entrée"}
              </SecondaryButton>
            </section>
          </form>
        </div>

        {/* Résumé */}
        <aside className="flex w-full flex-col border-[#F1F1EF] border-t bg-[#FAFAF8] p-6 md:w-[320px] md:border-t-0 md:border-l">
          <div className="mb-5">
            <h3 className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Résumé</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[#6B6B6B] text-xs">Client</dt>
              <dd className="font-medium">
                {clientType === "anonyme"
                  ? "Client comptoir"
                  : clientType === "nouveau"
                    ? newName || "—"
                    : (chosenCustomer?.name ?? "—")}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B6B6B] text-xs">Appareil</dt>
              <dd className="font-medium">{modelFull || "—"}</dd>
            </div>
            <div>
              <dt className="text-[#6B6B6B] text-xs">Intervention</dt>
              <dd className="font-medium">{intervention || "—"}</dd>
            </div>
            <div>
              <dt className="text-[#6B6B6B] text-xs">Qualité</dt>
              <dd>{summaryQuality || "—"}</dd>
            </div>
            <div>
              <dt className="text-[#6B6B6B] text-xs">Tarif client</dt>
              <dd>
                Pièce {formatEuro(prixPieceNum)} · M.O. {formatEuro(mainNum)}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B6B6B] text-xs">Total</dt>
              <dd className="font-semibold text-[#1A1916] text-[24px] tracking-tight">
                {totalClient > 0 ? formatEuro(totalClient) : "À définir"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B6B6B] text-xs">Source</dt>
              <dd>{summarySource}</dd>
            </div>
          </dl>

          {!canSubmitQuote && (
            <p className="mt-4 rounded-lg border border-[#F2DFA7] bg-[#FFF8EB] px-3 py-2 text-[#9A6A17] text-xs">
              Ajoutez un tarif pour créer un devis.
            </p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <SecondaryButton
              className="h-11 w-full justify-center gap-2"
              disabled={!canSubmitQuote}
              form="repair-quick-form"
              type="submit"
              value="repair-quote"
            >
              <FileText className="size-4" />
              Créer réparation + devis
            </SecondaryButton>
            <PrimaryButton
              className="h-11 w-full justify-center gap-2"
              disabled={!canSubmitRepair}
              form="repair-quick-form"
              type="submit"
              value="repair"
            >
              <Check className="size-4" />
              {initial ? "Enregistrer" : "Créer réparation"}
            </PrimaryButton>
            {!canSubmitRepair && missingSummary.length > 0 && (
              <p className="text-[#B0AEA8] text-[11px] text-center">
                Manquant : {missingSummary.join(", ")}.
              </p>
            )}
          </div>
        </aside>
        </>
        )}
      </div>
    </div>
  );
}
