"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Info,
  Landmark,
  Layers,
  Link2,
  Minus,
  Package,
  PackagePlus,
  Plus,
  Printer,
  ScanLine,
  Search,
  Shuffle,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  type Customer,
  formatEuro,
  type PaymentMethod,
  type Repair,
  type Sale,
  type SaleLine,
  type StockItem,
  useBeharStore,
} from "@/lib/behar-store";
import { realProductImage } from "@/lib/real-product-images";

import { useDocument } from "./print-provider";

type CartLine = Omit<SaleLine, "id">;

type Step = "cashier" | "checkout" | "success";

type CategoryKey = "accessoires" | "pieces" | "telephones" | "protections" | "chargeurs" | "cables" | "divers";

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: "accessoires", label: "Accessoires" },
  { key: "pieces", label: "Pièces" },
  { key: "telephones", label: "Téléphones" },
  { key: "protections", label: "Protections" },
  { key: "chargeurs", label: "Chargeurs" },
  { key: "cables", label: "Câbles" },
  { key: "divers", label: "Divers" },
];

const PIECE_KEYWORDS = [
  "écran",
  "ecran",
  "batterie",
  "connecteur",
  "caméra",
  "camera",
  "micro",
  "haut-parleur",
  "haut parleur",
  "bouton",
  "carte mère",
  "carte mere",
  "vibreur",
  "nappe",
  "lecteur",
];

function isRefurbishedPhoneItem(item: StockItem) {
  const cat = (item.categoryName || item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const hay = `${cat} ${name}`;
  const accessoryOrPart =
    hay.includes("accessoire") ||
    hay.includes("coque") ||
    hay.includes("protection") ||
    hay.includes("verre") ||
    hay.includes("chargeur") ||
    hay.includes("câble") ||
    hay.includes("cable") ||
    PIECE_KEYWORDS.some((kw) => hay.includes(kw));
  if (accessoryOrPart) return false;
  return (
    item.deviceType === "Smartphone" &&
    (hay.includes("recondition") ||
      hay.includes("occasion") ||
      hay.includes("téléphone") ||
      hay.includes("telephone") ||
      hay.includes("smartphone") ||
      hay.includes("appareil"))
  );
}

function matchCategory(item: StockItem, key: CategoryKey): boolean {
  const cat = (item.categoryName || item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const device = (item.deviceType || "").toLowerCase();
  const hay = `${cat} ${name} ${device}`;
  switch (key) {
    case "accessoires":
      return true;
    case "pieces":
      return PIECE_KEYWORDS.some((kw) => hay.includes(kw));
    case "telephones":
      return isRefurbishedPhoneItem(item);
    case "protections":
      return hay.includes("protection") || hay.includes("verre") || hay.includes("vitre trempée") || hay.includes("coque");
    case "chargeurs":
      return hay.includes("chargeur") || hay.includes("adaptateur") || hay.includes("alimentation");
    case "cables":
      return hay.includes("câble") || hay.includes("cable") || hay.includes("usb") || hay.includes("lightning");
    case "divers":
      return (
        !PIECE_KEYWORDS.some((kw) => hay.includes(kw)) &&
        !hay.includes("accessoire") &&
        !hay.includes("coque") &&
        !hay.includes("protection") &&
        !hay.includes("chargeur") &&
        !hay.includes("câble") &&
        !hay.includes("cable") &&
        device !== "smartphone"
      );
    default:
      return true;
  }
}

// §4 — la vente comptoir n'affiche que les articles explicitement activés pour le comptoir.
const isSellable = (item: StockItem) => item.active !== false && item.counterSaleEnabled === true && item.stock > 0 && item.salePrice > 0;

const PAYMENT_OPTIONS: Array<{ key: PaymentMethod; label: string; icon: typeof CreditCard }> = [
  { key: "TPE externe", label: "TPE ext.", icon: CreditCard },
  { key: "Espèces hors Behar Tech", label: "Espèces ext.", icon: Banknote },
  { key: "Autre", label: "Mixte / autre", icon: Shuffle },
  { key: "Virement", label: "Virement", icon: Landmark },
];

function formatPaymentLabel(method?: PaymentMethod) {
  if (!method) return "—";
  if (method === "Carte") return "TPE externe";
  if (method === "Espèces") return "Espèces hors Behar Tech";
  if (method === "En ligne") return "Lien externe";
  return method;
}

export function CashRegister({ onViewHistory }: Readonly<{ onViewHistory?: () => void }>) {
  const store = useBeharStore();
  const router = useRouter();
  const { print, download } = useDocument();

  const [step, setStep] = useState<Step>("cashier");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryKey>("accessoires");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TPE externe");

  const [serialDraft, setSerialDraft] = useState<Record<string, string>>({});
  const [conditionDraft, setConditionDraft] = useState<Record<string, string>>({});
  const [warrantyDraft, setWarrantyDraft] = useState<Record<string, number>>({});

  const [clientType, setClientType] = useState<"comptoir" | "existing" | "new">("comptoir");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [attachRepair, setAttachRepair] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState("");

  const [mode, setMode] = useState<"products" | "repair">("products");
  const [cashRepairId, setCashRepairId] = useState("");
  const [repairPaymentMethod, setRepairPaymentMethod] = useState<PaymentMethod>("TPE externe");

  const [completedSaleId, setCompletedSaleId] = useState<string>("");

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "cashier") {
      searchRef.current?.focus();
    }
  }, [step]);

  const sellable = useMemo(() => store.stockItems.filter(isSellable), [store.stockItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellable.filter((item) => {
      if (!matchCategory(item, category)) return false;
      if (!q) return true;
      const hay = `${item.name} ${item.sku ?? ""} ${item.brandName ?? ""} ${item.reference ?? ""} ${(item.compatibleModels ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sellable, category, search]);

  const frequent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sale of store.sales) {
      for (const line of sale.lines) {
        counts.set(line.stockItemId, (counts.get(line.stockItemId) ?? 0) + line.quantity);
      }
    }
    const ranked = sellable.slice().sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
    const top = ranked.filter((item) => counts.has(item.id)).slice(0, 4);
    if (top.length >= 3) return top;
    const padded = [...top];
    for (const item of sellable) {
      if (padded.length >= 4) break;
      if (!padded.find((entry) => entry.id === item.id)) padded.push(item);
    }
    return padded.slice(0, 4);
  }, [sellable, store.sales]);

  const namedCustomers = useMemo(
    () => store.customers.filter((c) => c.type !== "counter" && c.name !== "Anonyme"),
    [store.customers],
  );
  const customerMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return namedCustomers.slice(0, 6);
    return namedCustomers
      .filter((c) => `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [namedCustomers, customerSearch]);

  const eligibleRepairs = useMemo(() => {
    return store.repairs.filter((r) => {
      const invoiced = store.invoices.some((i) => i.repairId === r.id && i.status !== "Annulée");
      const paid = store.payments.some((p) => p.repairId === r.id && p.status === "Payé");
      return !invoiced && !paid;
    });
  }, [store.repairs, store.invoices, store.payments]);

  const subtotal = cart.reduce((sum, line) => sum + line.total, 0);
  const taxRate = 0.2;
  const preTax = Math.round((subtotal / (1 + taxRate)) * 100) / 100;
  const extractedTax = Math.round((subtotal - preTax) * 100) / 100;

  const refurbishedLines = cart.filter((l) => l.itemKind === "refurbished-phone");

  const addToCart = (item: StockItem) => {
    if (!isSellable(item)) {
      toast.error("Ce produit n'est pas disponible à la vente.");
      return;
    }
    setCart((current) => {
      const existing = current.find((line) => line.stockItemId === item.id);
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (item.stock < nextQty) {
        toast.error(`Stock insuffisant pour ${item.name} (${item.stock} disponible).`);
        return current;
      }
      if (existing) {
        return current.map((line) =>
          line.stockItemId === item.id ? { ...line, quantity: nextQty, total: nextQty * line.unitPrice } : line,
        );
      }
      const isPhone = isRefurbishedPhoneItem(item);
      const line: CartLine = {
        stockItemId: item.id,
        name: item.name,
        sku: item.sku,
        itemKind: isPhone ? "refurbished-phone" : "accessory",
        warrantyMonths: isPhone ? 12 : 3,
        quantity: 1,
        unitPrice: item.salePrice,
        total: item.salePrice,
        purchasePriceInternal: item.purchasePrice,
        supplierInternal: item.supplier,
      };
      return [...current, line];
    });
  };

  const updateQty = (stockItemId: string, delta: number) => {
    setCart((current) => {
      const line = current.find((l) => l.stockItemId === stockItemId);
      if (!line) return current;
      const next = line.quantity + delta;
      if (next <= 0) return current.filter((l) => l.stockItemId !== stockItemId);
      const item = store.stockItems.find((i) => i.id === stockItemId);
      if (item && item.stock < next) {
        toast.error(`Stock insuffisant : ${item.stock} disponible.`);
        return current;
      }
      return current.map((l) => (l.stockItemId === stockItemId ? { ...l, quantity: next, total: next * l.unitPrice } : l));
    });
  };

  const removeLine = (stockItemId: string) => {
    setCart((current) => current.filter((l) => l.stockItemId !== stockItemId));
  };

  const clearCart = () => setCart([]);

  const goCheckout = () => {
    if (!cart.length) {
      toast.error("Ajoutez un produit pour commencer la vente.");
      return;
    }
    if (subtotal <= 0) {
      toast.error("Le total doit être supérieur à 0 €.");
      return;
    }
    for (const line of cart) {
      const item = store.stockItems.find((i) => i.id === line.stockItemId);
      if (!item || item.stock < line.quantity) {
        toast.error(`Stock insuffisant pour ${line.name}.`);
        return;
      }
    }
    setStep("checkout");
  };

  const goBackToCashier = () => setStep("cashier");

  const finalize = () => {
    const finalCart: CartLine[] = cart.map((line) => {
      if (line.itemKind !== "refurbished-phone") return line;
      return {
        ...line,
        serialNumber: serialDraft[line.stockItemId]?.trim() || line.serialNumber,
        conditionLabel: conditionDraft[line.stockItemId]?.trim() || line.conditionLabel,
        warrantyMonths: warrantyDraft[line.stockItemId] ?? line.warrantyMonths,
      };
    });

    let customerId = "counter";
    let customerName = "Vente comptoir";

    if (attachRepair && selectedRepairId) {
      const repair = store.repairs.find((r) => r.id === selectedRepairId);
      if (!repair) {
        toast.error("Réparation introuvable.");
        return;
      }
      const repairCustomer = store.customers.find((c) => c.id === repair.customerId);
      const saleId = store.addSale({
        customerId: repair.customerId,
        customerName: repairCustomer?.name || "Vente comptoir",
        lines: finalCart,
        repairId: selectedRepairId,
        status: "Rattachée",
      });
      if (!saleId) {
        toast.error("Impossible de créer la vente rattachée.");
        return;
      }
      const ok = store.addSaleLinesToRepair(selectedRepairId, finalCart, saleId);
      if (!ok) {
        store.deleteSale(saleId);
        toast.error("Cette réparation est déjà facturée. Créez une vente séparée.");
        return;
      }
      store.setSelected("sale", saleId);
      setCompletedSaleId(saleId);
      toast.success("Produits rattachés au dossier réparation.");
      setStep("success");
      return;
    }

    if (clientType === "existing") {
      const customer = store.customers.find((c) => c.id === selectedCustomerId);
      if (!customer) {
        toast.error("Sélectionnez un client existant.");
        return;
      }
      customerId = customer.id;
      customerName = customer.name;
    }

    if (clientType === "new") {
      const name = newClient.name.trim();
      if (!name) {
        toast.error("Le nom du client est obligatoire.");
        return;
      }
      const existing = namedCustomers.find(
        (c) =>
          c.name.trim().toLowerCase() === name.toLowerCase() &&
          (!newClient.phone || c.phone.replace(/\D/g, "") === newClient.phone.replace(/\D/g, "")),
      );
      customerId =
        existing?.id ||
        store.addCustomer({
          name,
          phone: newClient.phone.trim(),
          email: newClient.email.trim(),
          source: "Vente comptoir",
        });
      customerName = existing?.name || name;
    }

    const saleId = store.addSale({ customerId, customerName, lines: finalCart });
    if (!saleId) {
      toast.error("Encaissement impossible : vérifiez votre permission de vente.");
      return;
    }
    const paymentId = store.paySale(saleId, paymentMethod);
    if (!paymentId) {
      store.deleteSale(saleId);
      toast.error("Validation impossible : stock insuffisant ou erreur.");
      return;
    }
    store.setSelected("sale", saleId);
    setCompletedSaleId(saleId);
    toast.success("Vente validée.");
    setStep("success");
  };

  const finalizeRepairPayment = () => {
    if (!cashRepairId) {
      toast.error("Sélectionnez un dossier à régler.");
      return;
    }
    const repair = store.repairs.find((r) => r.id === cashRepairId);
    if (!repair) {
      toast.error("Réparation introuvable.");
      return;
    }
    const amount = repair.total ?? repair.amount ?? 0;
    if (amount <= 0) {
      toast.error("Renseignez d'abord un montant sur la réparation.");
      return;
    }
    const paymentId = store.markRepairAsPaid(cashRepairId, repairPaymentMethod);
    if (!paymentId) {
      toast.error("Règlement impossible : dossier déjà réglé.");
      return;
    }
    toast.success("Règlement indiqué.");
    setCashRepairId("");
    setRepairPaymentMethod("TPE externe");
  };

  const startNewSale = () => {
    setCart([]);
    setSearch("");
    setCategory("accessoires");
    setPaymentMethod("TPE externe");
    setClientType("comptoir");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setNewClient({ name: "", phone: "", email: "" });
    setAttachRepair(false);
    setSelectedRepairId("");
    setSerialDraft({});
    setConditionDraft({});
    setWarrantyDraft({});
    setCompletedSaleId("");
    setStep("cashier");
  };

  const completedSale: Sale | undefined = completedSaleId
    ? store.sales.find((s) => s.id === completedSaleId)
    : undefined;
  const completedDocument = completedSale ? store.documents.find((d) => d.saleId === completedSale.id) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {step === "cashier" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="inline-flex shrink-0 self-start rounded-[10px] border border-[#E8E8E5] bg-[#FAFAFA] p-1">
            {(
              [
                ["products", "Vente produits"],
                ["repair", "Indiquer règlement"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-[8px] px-4 py-2 text-[13px] font-semibold transition ${
                  mode === value ? "bg-white text-[#11998E] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1916]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "products" ? (
            <CashierStep
              search={search}
              setSearch={setSearch}
              searchRef={searchRef}
              category={category}
              setCategory={setCategory}
              filtered={filtered}
              frequent={frequent}
              cart={cart}
              addToCart={addToCart}
              updateQty={updateQty}
              removeLine={removeLine}
              clearCart={clearCart}
              subtotal={subtotal}
              preTax={preTax}
              extractedTax={extractedTax}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              attachRepair={attachRepair}
              setAttachRepair={setAttachRepair}
              refurbishedLines={refurbishedLines}
              goCheckout={goCheckout}
            />
          ) : (
            <RepairCashStep
              eligibleRepairs={eligibleRepairs}
              customers={store.customers}
              selectedRepairId={cashRepairId}
              setSelectedRepairId={setCashRepairId}
              paymentMethod={repairPaymentMethod}
              setPaymentMethod={setRepairPaymentMethod}
              onSettle={finalizeRepairPayment}
            />
          )}
        </div>
      ) : null}

      {step === "checkout" ? (
        <CheckoutStep
          cart={cart}
          subtotal={subtotal}
          preTax={preTax}
          extractedTax={extractedTax}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          clientType={clientType}
          setClientType={setClientType}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch}
          customerMatches={customerMatches}
          newClient={newClient}
          setNewClient={setNewClient}
          attachRepair={attachRepair}
          setAttachRepair={setAttachRepair}
          selectedRepairId={selectedRepairId}
          setSelectedRepairId={setSelectedRepairId}
          eligibleRepairs={eligibleRepairs}
          repairCustomers={store.customers}
          refurbishedLines={refurbishedLines}
          serialDraft={serialDraft}
          setSerialDraft={setSerialDraft}
          conditionDraft={conditionDraft}
          setConditionDraft={setConditionDraft}
          warrantyDraft={warrantyDraft}
          setWarrantyDraft={setWarrantyDraft}
          finalize={finalize}
          onBack={goBackToCashier}
        />
      ) : null}

      {step === "success" && completedSale ? (
        <SuccessStep
          sale={completedSale}
          hasDocument={Boolean(completedDocument)}
          onPrint={() => print("sale-receipt", completedSale.id)}
          onDownload={() => download("sale-receipt", completedSale.id)}
          onOpenReceipt={() => {
            if (completedDocument) {
              store.setSelected("document", completedDocument.id);
              router.push(`/print/document/${completedDocument.id}`);
            } else {
              print("sale-receipt", completedSale.id);
            }
          }}
          onNewSale={startNewSale}
          onOpenRepair={() => {
            if (completedSale.repairId) {
              store.setSelected("repair", completedSale.repairId);
              router.push("/dashboard/reparations");
            }
          }}
          onViewHistory={onViewHistory}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------ Repair settlement ------------------------------ */

const REPAIR_PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: "Carte", label: "Carte", icon: CreditCard },
  { value: "Espèces", label: "Espèces", icon: Banknote },
  { value: "Virement", label: "Virement", icon: Landmark },
];

interface RepairCashStepProps {
  eligibleRepairs: Repair[];
  customers: Customer[];
  selectedRepairId: string;
  setSelectedRepairId: (id: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  onSettle: () => void;
}

function RepairCashStep({
  eligibleRepairs,
  customers,
  selectedRepairId,
  setSelectedRepairId,
  paymentMethod,
  setPaymentMethod,
  onSettle,
}: Readonly<RepairCashStepProps>) {
  const [query, setQuery] = useState("");
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Client comptoir";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eligibleRepairs;
    return eligibleRepairs.filter((r) =>
      `${r.number} ${r.device} ${r.deviceModel ?? ""} ${r.issue} ${customerName(r.customerId)}`
        .toLowerCase()
        .includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleRepairs, query, customers]);

  const selected = eligibleRepairs.find((r) => r.id === selectedRepairId);
  const amount = selected ? (selected.total ?? selected.amount ?? 0) : 0;

  return (
    <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* Liste des dossiers à régler */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-[#8A8A8A]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un dossier (n°, client, appareil)…"
            className="h-12 w-full rounded-[10px] border border-[#E8E8E5] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#11998E]"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="grid place-items-center rounded-[12px] border border-dashed border-[#E8E8E5] bg-[#FAFAFA] p-10 text-center">
              <Wrench className="mb-3 size-8 text-[#C9C7C0]" />
              <p className="text-sm font-medium text-[#1A1916]">Aucun dossier à régler</p>
              <p className="mt-1 text-xs text-[#6B6B6B]">
                Les dossiers déjà facturés ou réglés n'apparaissent pas ici.
              </p>
            </div>
          ) : (
            filtered.map((r) => {
              const active = r.id === selectedRepairId;
              const total = r.total ?? r.amount ?? 0;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRepairId(r.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[12px] border px-4 py-3 text-left transition ${
                    active ? "border-[#11998E] bg-[#F1FAF8]" : "border-[#E8E8E5] bg-white hover:border-[#11998E]/40"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1A1916]">
                      {customerName(r.customerId)} · {r.device || r.deviceModel || "Appareil"}
                    </p>
                    <p className="truncate text-xs text-[#6B6B6B]">
                      {r.number} — {r.issue || "Intervention"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#1A1916]">
                    {total > 0 ? formatEuro(total) : "À définir"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Panneau de règlement */}
      <aside className="flex min-h-0 shrink-0 flex-col gap-4 rounded-[14px] border border-[#E8E8E5] bg-white p-5">
        <h3 className="font-semibold text-[#1A1916] text-[18px] tracking-tight">Règlement dossier</h3>

        {selected ? (
          <>
            <div className="rounded-[10px] bg-[#FAFAFA] p-4">
              <p className="text-xs text-[#6B6B6B]">Client</p>
              <p className="text-sm font-semibold text-[#1A1916]">{customerName(selected.customerId)}</p>
              <p className="mt-2 text-xs text-[#6B6B6B]">Appareil</p>
              <p className="text-sm font-medium text-[#1A1916]">
                {selected.device || selected.deviceModel || "Appareil"}
              </p>
              <p className="mt-2 text-xs text-[#6B6B6B]">Intervention</p>
              <p className="text-sm font-medium text-[#1A1916]">{selected.issue || "—"}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-[#6B6B6B]">Mode de paiement</p>
              <div className="grid grid-cols-3 gap-2">
                {REPAIR_PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`flex flex-col items-center gap-1 rounded-[10px] border px-2 py-3 text-xs font-semibold transition ${
                      paymentMethod === value
                        ? "border-[#11998E] bg-[#F1FAF8] text-[#11998E]"
                        : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:border-[#11998E]/40"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between border-t border-[#F7F7F7] pt-3">
              <span className="text-sm text-[#6B6B6B]">Total à régler</span>
                <span className="text-[22px] font-bold tabular-nums text-[#1A1916]">
                  {amount > 0 ? formatEuro(amount) : "À définir"}
                </span>
              </div>
              <button
                type="button"
                disabled={amount <= 0}
                onClick={onSettle}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#11998E] text-[15px] font-semibold text-white transition hover:bg-[#0F8C82] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="size-5" />
                Indiquer règlement
              </button>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-center">
            <p className="text-sm text-[#6B6B6B]">Sélectionnez un dossier à gauche pour indiquer son règlement.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------------------------------- Cashier ---------------------------------- */

interface CashierStepProps {
  search: string;
  setSearch: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  category: CategoryKey;
  setCategory: (v: CategoryKey) => void;
  filtered: StockItem[];
  frequent: StockItem[];
  cart: CartLine[];
  addToCart: (item: StockItem) => void;
  updateQty: (id: string, delta: number) => void;
  removeLine: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  preTax: number;
  extractedTax: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  attachRepair: boolean;
  setAttachRepair: (v: boolean) => void;
  refurbishedLines: CartLine[];
  goCheckout: () => void;
}

function CashierStep(props: CashierStepProps) {
  const {
    search,
    setSearch,
    searchRef,
    category,
    setCategory,
    filtered,
    frequent,
    cart,
    addToCart,
    updateQty,
    removeLine,
    clearCart,
    subtotal,
    preTax,
    extractedTax,
    paymentMethod,
    setPaymentMethod,
    attachRepair,
    setAttachRepair,
    refurbishedLines,
    goCheckout,
  } = props;

  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const addExactSearchMatch = () => {
    const q = search.trim().toLowerCase();
    if (!q) return false;
    const exactMatches = filtered.filter((item) =>
      [item.sku, item.reference, item.name]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === q),
    );
    if (exactMatches.length !== 1) return false;
    addToCart(exactMatches[0]);
    setSearch("");
    return true;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="hidden shrink-0 justify-end md:flex md:-mt-14">
        <button
          type="button"
          onClick={() => searchRef.current?.focus()}
          className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[8px] bg-[#11998E] px-7 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(17,153,142,0.20)] transition hover:bg-[#0F8C82]"
        >
          <PackagePlus className="size-4" strokeWidth={1.8} />
          Ouvrir la caisse
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* Catalogue column */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        {/* Sticky header: search + add piece + categories */}
        <div className="shrink-0 space-y-3">
          <div className="flex flex-col gap-2 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-[#8A8A8A]" />
              <ScanLine className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-[#8A8A8A]" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && addExactSearchMatch()) {
                    event.preventDefault();
                  }
                }}
                placeholder="Rechercher un produit, SKU ou scanner…"
                className="h-[60px] w-full rounded-[8px] border border-[#E8E8E5] bg-white pl-12 pr-12 text-[15px] text-[#1A1916] shadow-[0_1px_2px_rgba(26,25,22,0.03)] outline-none transition focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10 placeholder:text-[#8F8B84]"
                aria-label="Rechercher un produit"
              />
            </div>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="inline-flex h-[60px] w-full shrink-0 items-center justify-center gap-2 rounded-[8px] border border-[#E8E8E5] bg-white px-5 text-[14px] font-semibold text-[#1A1916] shadow-[0_1px_2px_rgba(26,25,22,0.03)] transition hover:border-[#2A9D8F]/40 hover:text-[#2A9D8F] xl:w-auto"
              aria-label="Ajouter une pièce"
            >
              <PackagePlus className="size-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">Ajouter une pièce</span>
            </button>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`shrink-0 rounded-full px-5 py-3 text-[13px] font-semibold transition ${
                  category === cat.key
                    ? "bg-[#11998E] text-white shadow-[0_8px_18px_rgba(17,153,142,0.22)]"
                    : "border border-[#E8E8E5] bg-white text-[#6B6B6B] hover:border-[#2A9D8F]/40 hover:text-[#1A1916]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable: grid only */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-3 pr-1">
          <h2 className="text-[20px] font-semibold tracking-tight text-[#1A1916]">Catalogue</h2>
          {filtered.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-[#E8E8E5] bg-white py-14 text-center">
              <Package className="mx-auto mb-3 size-7 text-[#8A8A8A]" strokeWidth={1.6} />
              <p className="text-[#6B6B6B] text-sm">Aucun produit ne correspond à votre recherche.</p>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-[#2A9D8F]/40 bg-[#EAF6F2] px-4 text-[12.5px] font-medium text-[#147065] transition hover:bg-[#D8EEE9]"
              >
                <PackagePlus className="size-3.5" />
                Ajouter une pièce à la volée
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {filtered.map((item) => (
                <ProductCard key={item.id} item={item} onClick={() => addToCart(item)} />
              ))}
            </div>
          )}

          {frequent.length > 0 ? <FrequentProducts items={frequent} onAdd={addToCart} /> : null}

          <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#CFEFEB] bg-[#F5FFFD] px-4 py-3 text-[12.5px] text-[#6B6B6B]">
            <span className="inline-flex items-center gap-2">
              <Info className="size-4 shrink-0 text-[#2A9D8F]" />
              Les champs IMEI, État et Garantie apparaissent uniquement lors de la vente d'un téléphone reconditionné.
            </span>
          </div>
        </div>

        {quickAddOpen ? (
          <QuickAddStockModal
            onClose={() => setQuickAddOpen(false)}
            onCreated={(item) => {
              setQuickAddOpen(false);
              addToCart(item);
              toast.success(`${item.name} créé et ajouté au panier`);
            }}
          />
        ) : null}
      </section>

      {/* Cart column */}
      <aside className="flex min-h-0 shrink-0 flex-col gap-3 xl:overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] border border-[#E8E8E5] bg-white shadow-[0_10px_30px_rgba(26,25,22,0.06)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[#E8E8E5] px-5 py-5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1A1916] text-[20px] tracking-tight">Panier</h3>
              <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 text-[#6B6B6B] text-[11px] font-medium">
                {cart.length} {cart.length > 1 ? "articles" : "article"}
              </span>
            </div>
            {cart.length > 0 ? (
              <button
                type="button"
                onClick={clearCart}
                className="grid size-8 place-items-center rounded-full text-[#8A8A8A] transition hover:bg-[#F7F7F7] hover:text-[#B42318]"
                aria-label="Vider le panier"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {cart.length === 0 ? (
              <div className="px-3 py-14 text-center">
                <Package className="mx-auto mb-3 size-7 text-[#8A8A8A]" strokeWidth={1.6} />
                <p className="text-[#6B6B6B] text-sm">Ajoutez un produit pour commencer la vente.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map((line) => (
                  <CartLineRow
                    key={line.stockItemId}
                    line={line}
                    onIncrement={() => updateQty(line.stockItemId, 1)}
                    onDecrement={() => updateQty(line.stockItemId, -1)}
                    onRemove={() => removeLine(line.stockItemId)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-[#E8E8E5] bg-white px-5 py-5">
            <div className="space-y-2 text-[15px]">
              <Row label="Sous-total" value={formatEuro(preTax)} />
              <Row label="TVA (20 %)" value={formatEuro(extractedTax)} />
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <span className="font-semibold text-[#1A1916] text-[18px]">Total</span>
              <span className="font-bold text-[#11998E] text-[32px] tabular-nums tracking-tight">{formatEuro(subtotal)}</span>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-[#6B6B6B] text-[12px] font-medium">Paiement</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <PaymentButton
                    key={opt.key}
                    icon={opt.icon}
                    label={opt.label}
                    active={paymentMethod === opt.key}
                    onClick={() => setPaymentMethod(opt.key)}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAttachRepair(!attachRepair)}
              className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border text-[13px] font-medium transition ${
                attachRepair
                  ? "border-[#2A9D8F]/40 bg-[#EAF6F2] text-[#147065]"
                  : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:border-[#2A9D8F]/40 hover:text-[#1A1916]"
              }`}
            >
              <Link2 className="size-4" />
              {attachRepair ? "Rattachée à un dossier" : "Rattacher à un dossier"}
            </button>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={goCheckout}
              className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[8px] bg-[#11998E] font-semibold text-[15px] text-white shadow-[0_10px_22px_rgba(17,153,142,0.24)] transition hover:bg-[#0F8C82] disabled:cursor-not-allowed disabled:bg-[#C7D9D5] disabled:shadow-none"
            >
              Valider la vente
              <ArrowRight className="size-4" />
            </button>

            {refurbishedLines.length > 0 ? (
              <p className="mt-2 text-[#8A8A8A] text-[11px]">
                {refurbishedLines.length} téléphone(s) reconditionné(s) — vous renseignerez IMEI / état à l'étape suivante.
              </p>
            ) : null}
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}

/* ---------------------------------- Product card ---------------------------------- */

function ProductCard({ item, onClick }: Readonly<{ item: StockItem; onClick: () => void }>) {
  const lowStock = item.stock <= (item.threshold || 0);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ajouter ${item.name} au panier`}
      className="group flex min-h-[236px] flex-col overflow-hidden rounded-[8px] border border-[#E8E8E5] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.03)] transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/50 hover:shadow-[0_10px_24px_rgba(26,25,22,0.08)] active:scale-[0.99]"
    >
      <div className="mb-4 flex h-[116px] items-center justify-center">
        <ProductThumb item={item} size={104} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="line-clamp-2 font-semibold text-[#1A1916] text-[14px] leading-tight tracking-tight">{item.name}</p>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="font-bold text-[#11998E] text-[17px] tabular-nums">{formatEuro(item.salePrice)}</span>
        </div>
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-[12px]">
          <Layers className="size-3 text-[#8A8A8A]" strokeWidth={1.8} />
          <span className={lowStock ? "text-[#B42318]" : "text-[#6B6B6B]"}>Stock {item.stock}</span>
          {item.sku ? <span className="ml-auto truncate font-mono text-[#8A8A8A] text-[10.5px]">{item.sku}</span> : null}
        </div>
      </div>
    </button>
  );
}

function ProductThumb({ item, size = 64 }: Readonly<{ item: StockItem; size?: number }>) {
  const src = realProductImage(item.name, item.categoryName || item.category);
  if (src) {
    return (
      <img
        alt=""
        aria-hidden
        className="max-h-full max-w-full object-contain mix-blend-multiply"
        src={src}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid place-items-center rounded-[12px] bg-[#FAFAFA] text-[#2A9D8F] shadow-[inset_0_0_0_1px_rgba(42,157,143,0.08)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Package className="size-[42%]" strokeWidth={1.6} />
    </div>
  );
}

function FrequentProducts({
  items,
  onAdd,
}: Readonly<{ items: StockItem[]; onAdd: (item: StockItem) => void }>) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, 3);
  return (
    <section className="rounded-[8px] border border-[#E8E8E5] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[#1A1916]">Produits fréquemment vendus</h3>
        {items.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex h-8 items-center justify-center rounded-[8px] border border-[#E8E8E5] px-4 text-[12px] font-medium text-[#6B6B6B] transition hover:border-[#2A9D8F]/50 hover:text-[#1A1916]"
          >
            {showAll ? "Réduire" : "Voir tout"}
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAdd(item)}
            className="flex min-w-0 items-center gap-3 rounded-[8px] border border-[#E8E8E5] bg-white p-2.5 text-left transition hover:border-[#2A9D8F]/50 hover:bg-[#F7FCFA]"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-[8px] border border-[#E8E8E5] bg-[#FAFAFA]">
              <ProductThumb item={item} size={46} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium text-[#1A1916]">{item.name}</span>
              <span className="mt-1 block text-[12px] font-semibold text-[#1A1916] tabular-nums">
                {formatEuro(item.salePrice)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------- Cart line row ---------------------------------- */

function CartLineRow({
  line,
  onIncrement,
  onDecrement,
  onRemove,
}: Readonly<{
  line: CartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}>) {
  return (
    <li className="border-[#E8E8E5] border-b py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="grid size-[72px] shrink-0 place-items-center rounded-[8px] border border-[#E8E8E5] bg-[#FAFAFA] text-[#2A9D8F]">
          <LineThumb name={line.name} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold text-[#1A1916] text-[13.5px] leading-tight">{line.name}</p>
              <p className="mt-1 text-[#11998E] text-[12px] font-semibold tabular-nums">{formatEuro(line.unitPrice)}</p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="-mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[#8A8A8A] transition hover:bg-[#F7F7F7] hover:text-[#B42318]"
              aria-label="Supprimer"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-[#E8E8E5] bg-white px-1">
              <button
                type="button"
                onClick={onDecrement}
                className="grid size-7 place-items-center rounded-[6px] text-[#1A1916] transition hover:bg-[#FAFAFA]"
                aria-label="Diminuer"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="min-w-[24px] text-center font-medium text-[#1A1916] text-[13px] tabular-nums">{line.quantity}</span>
              <button
                type="button"
                onClick={onIncrement}
                className="grid size-7 place-items-center rounded-[6px] text-[#1A1916] transition hover:bg-[#FAFAFA]"
                aria-label="Augmenter"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <span className="font-semibold text-[#1A1916] text-[14px] tabular-nums">{formatEuro(line.total)}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

function LineThumb({ name }: Readonly<{ name: string }>) {
  const src = realProductImage(name);
  if (src) return <img alt="" aria-hidden className="max-h-[58px] max-w-[58px] object-contain mix-blend-multiply" src={src} />;
  return <Package className="size-5" strokeWidth={1.6} />;
}

/* ---------------------------------- Payment button ---------------------------------- */

function PaymentButton({
  icon: Icon,
  label,
  active,
  onClick,
}: Readonly<{ icon: typeof CreditCard; label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[58px] flex-row items-center justify-center gap-3 rounded-[8px] border text-[14px] font-semibold transition ${
        active
          ? "border-[#11998E] bg-[#EAF6F2] text-[#147065]"
          : "border-[#E8E8E5] bg-white text-[#1A1916] hover:border-[#2A9D8F]/40 hover:text-[#1A1916]"
      }`}
    >
      <Icon className="size-4" strokeWidth={1.8} />
      {label}
    </button>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916] tabular-nums">{value}</span>
    </div>
  );
}

/* ---------------------------------- Checkout step ---------------------------------- */

interface CheckoutStepProps {
  cart: CartLine[];
  subtotal: number;
  preTax: number;
  extractedTax: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  clientType: "comptoir" | "existing" | "new";
  setClientType: (v: "comptoir" | "existing" | "new") => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (v: string) => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  customerMatches: ReturnType<typeof useBeharStore.getState>["customers"];
  newClient: { name: string; phone: string; email: string };
  setNewClient: (v: { name: string; phone: string; email: string }) => void;
  attachRepair: boolean;
  setAttachRepair: (v: boolean) => void;
  selectedRepairId: string;
  setSelectedRepairId: (v: string) => void;
  eligibleRepairs: ReturnType<typeof useBeharStore.getState>["repairs"];
  repairCustomers: ReturnType<typeof useBeharStore.getState>["customers"];
  refurbishedLines: CartLine[];
  serialDraft: Record<string, string>;
  setSerialDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  conditionDraft: Record<string, string>;
  setConditionDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  warrantyDraft: Record<string, number>;
  setWarrantyDraft: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  finalize: () => void;
  onBack: () => void;
}

function CheckoutStep(props: CheckoutStepProps) {
  const {
    cart,
    subtotal,
    preTax,
    extractedTax,
    paymentMethod,
    setPaymentMethod,
    clientType,
    setClientType,
    selectedCustomerId,
    setSelectedCustomerId,
    customerSearch,
    setCustomerSearch,
    customerMatches,
    newClient,
    setNewClient,
    attachRepair,
    setAttachRepair,
    selectedRepairId,
    setSelectedRepairId,
    eligibleRepairs,
    repairCustomers,
    refurbishedLines,
    serialDraft,
    setSerialDraft,
    conditionDraft,
    setConditionDraft,
    warrantyDraft,
    setWarrantyDraft,
    finalize,
    onBack,
  } = props;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-[12.5px] font-medium transition hover:border-[#2A9D8F]/40"
        >
          <ArrowLeft className="size-3.5" />
          Retour à la caisse
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 md:flex-row md:gap-6">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 md:overflow-y-auto md:pr-2">
          <div className="rounded-[18px] border border-[#E8E8E5] bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Rattachement (optionnel)</h3>
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#6B6B6B] text-[13px]">
                <input
                  type="checkbox"
                  checked={attachRepair}
                  onChange={(event) => {
                    setAttachRepair(event.target.checked);
                    if (!event.target.checked) setSelectedRepairId("");
                  }}
                  className="size-4 rounded border-[#E8E8E5] text-[#2A9D8F] focus:ring-[#2A9D8F]/30"
                />
                Rattacher à une réparation
              </label>
            </div>
            {attachRepair ? (
              eligibleRepairs.length === 0 ? (
                <p className="rounded-[12px] bg-[#FAFAFA] px-3 py-2 text-[#6B6B6B] text-sm">
                  Aucune réparation non facturée disponible.
                </p>
              ) : (
                <select
                  value={selectedRepairId}
                  onChange={(event) => setSelectedRepairId(event.target.value)}
                  className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] outline-none focus:border-[#2A9D8F]"
                >
                  <option value="">Sélectionner une réparation…</option>
                  {eligibleRepairs.map((repair) => {
                    const customer = repairCustomers.find((c) => c.id === repair.customerId);
                    return (
                      <option key={repair.id} value={repair.id}>
                        {repair.number} — {customer?.name || "Client comptoir"} — {repair.deviceModel || repair.device}
                      </option>
                    );
                  })}
                </select>
              )
            ) : (
              <p className="text-[#8A8A8A] text-[12px]">Pour une vente comptoir simple, laissez cette option désactivée.</p>
            )}
          </div>

          {!attachRepair ? (
            <div className="rounded-[18px] border border-[#E8E8E5] bg-white p-5">
              <h3 className="mb-3 font-semibold text-[#1A1916] text-[15px] tracking-tight">Client</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ClientChip
                  label="Vente comptoir"
                  description="Client anonyme — par défaut"
                  active={clientType === "comptoir"}
                  onClick={() => setClientType("comptoir")}
                />
                <ClientChip
                  label="Client existant"
                  description="Rattacher à un client"
                  active={clientType === "existing"}
                  onClick={() => setClientType("existing")}
                />
                <ClientChip
                  label="Nouveau client"
                  description="Créer rapidement"
                  active={clientType === "new"}
                  onClick={() => setClientType("new")}
                />
              </div>

              {clientType === "existing" ? (
                <div className="mt-4 space-y-3">
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Rechercher par nom, téléphone, email…"
                    className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] outline-none focus:border-[#2A9D8F]"
                  />
                  <div className="grid gap-2">
                    {customerMatches.length === 0 ? (
                      <p className="rounded-[12px] bg-[#FAFAFA] px-3 py-2 text-[#6B6B6B] text-sm">Aucun client correspondant.</p>
                    ) : (
                      customerMatches.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className={`flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 text-left transition ${
                            selectedCustomerId === customer.id
                              ? "border-[#2A9D8F] bg-[#EAF6F2]"
                              : "border-[#E8E8E5] bg-white hover:border-[#2A9D8F]/40"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#1A1916] text-[13.5px]">{customer.name}</p>
                            <p className="truncate text-[#8A8A8A] text-[11.5px]">
                              {customer.phone || customer.email || "Sans contact"}
                            </p>
                          </div>
                          {selectedCustomerId === customer.id ? (
                            <CheckCircle2 className="size-4 shrink-0 text-[#2A9D8F]" />
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {clientType === "new" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={newClient.name}
                    onChange={(event) => setNewClient({ ...newClient, name: event.target.value })}
                    placeholder="Nom *"
                    className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] outline-none focus:border-[#2A9D8F]"
                  />
                  <input
                    value={newClient.phone}
                    onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })}
                    placeholder="Téléphone (optionnel)"
                    className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] outline-none focus:border-[#2A9D8F]"
                  />
                  <input
                    value={newClient.email}
                    onChange={(event) => setNewClient({ ...newClient, email: event.target.value })}
                    type="email"
                    placeholder="Email (optionnel)"
                    className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] outline-none focus:border-[#2A9D8F] sm:col-span-2"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {refurbishedLines.length > 0 ? (
            <div className="rounded-[18px] border border-[#E8E8E5] bg-white p-5">
              <h3 className="mb-1 font-semibold text-[#1A1916] text-[15px] tracking-tight">Téléphones reconditionnés</h3>
              <p className="mb-3 text-[#6B6B6B] text-[12.5px]">IMEI, état et garantie ne sont demandés que pour ces lignes.</p>
              <div className="space-y-3">
                {refurbishedLines.map((line) => (
                  <div key={line.stockItemId} className="rounded-[14px] border border-[#E8E8E5] bg-[#FAFAFA] p-3">
                    <p className="mb-2 font-medium text-[#1A1916] text-[13.5px]">{line.name}</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={serialDraft[line.stockItemId] ?? ""}
                        onChange={(event) =>
                          setSerialDraft((current) => ({ ...current, [line.stockItemId]: event.target.value }))
                        }
                        placeholder="IMEI / n° série"
                        className="h-10 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13px] outline-none focus:border-[#2A9D8F]"
                      />
                      <select
                        value={conditionDraft[line.stockItemId] ?? ""}
                        onChange={(event) =>
                          setConditionDraft((current) => ({ ...current, [line.stockItemId]: event.target.value }))
                        }
                        className="h-10 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13px] outline-none focus:border-[#2A9D8F]"
                      >
                        <option value="">État…</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Bon">Bon</option>
                        <option value="Correct">Correct</option>
                        <option value="Reconditionné Grade A">Reconditionné Grade A</option>
                        <option value="Reconditionné Grade B">Reconditionné Grade B</option>
                      </select>
                      <select
                        value={warrantyDraft[line.stockItemId] ?? line.warrantyMonths ?? 12}
                        onChange={(event) =>
                          setWarrantyDraft((current) => ({
                            ...current,
                            [line.stockItemId]: Number(event.target.value) || 0,
                          }))
                        }
                        className="h-10 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[13px] outline-none focus:border-[#2A9D8F]"
                      >
                        <option value={0}>Sans garantie</option>
                        <option value={3}>Garantie 3 mois</option>
                        <option value={6}>Garantie 6 mois</option>
                        <option value={12}>Garantie 12 mois</option>
                        <option value={24}>Garantie 24 mois</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="flex shrink-0 flex-col gap-3 md:w-[340px] md:overflow-hidden 2xl:w-[380px]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#E8E8E5] bg-white shadow-[0_1px_3px_rgba(26,25,22,0.05)]">
            <div className="shrink-0 border-b border-[#E8E8E5] px-5 py-4">
              <h3 className="font-semibold text-[#1A1916] text-[16px] tracking-tight">Récapitulatif</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <ul className="space-y-2">
                {cart.map((line) => (
                  <li key={line.stockItemId} className="flex items-start justify-between gap-2 text-[13px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#1A1916]">{line.name}</p>
                      <p className="text-[#8A8A8A] text-[11.5px]">
                        {line.quantity} × {formatEuro(line.unitPrice)}
                      </p>
                    </div>
                    <span className="font-medium text-[#1A1916] tabular-nums">{formatEuro(line.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 border-t border-[#E8E8E5] bg-[#FAFAFA] px-5 py-4">
              <div className="space-y-1.5 text-[13px]">
                <Row label="Sous-total" value={formatEuro(preTax)} />
                <Row label="TVA (20 %)" value={formatEuro(extractedTax)} />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-medium text-[#1A1916] text-[15px]">Total TTC</span>
                <span className="font-bold text-[#2A9D8F] text-[26px] tabular-nums tracking-tight">{formatEuro(subtotal)}</span>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[#6B6B6B] text-[12px] font-medium">Paiement</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <PaymentButton
                      key={opt.key}
                      icon={opt.icon}
                      label={opt.label}
                      active={paymentMethod === opt.key}
                      onClick={() => setPaymentMethod(opt.key)}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={finalize}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#2A9D8F] font-semibold text-[14px] text-white shadow-[0_4px_12px_rgba(42,157,143,0.25)] transition hover:bg-[#23867a]"
              >
                <CheckCircle2 className="size-4" />
                Valider le règlement
              </button>
              <p className="mt-2 text-[#8A8A8A] text-[11px]">Le stock est décrémenté uniquement après cette validation.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ClientChip({
  label,
  description,
  active,
  onClick,
}: Readonly<{ label: string; description: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-[14px] border p-3 text-left transition ${
        active ? "border-[#2A9D8F] bg-[#EAF6F2]" : "border-[#E8E8E5] bg-white hover:border-[#2A9D8F]/40"
      }`}
    >
      <span className="font-medium text-[#1A1916] text-[13px]">{label}</span>
      <span className={`text-[11px] leading-tight ${active ? "text-[#147065]" : "text-[#8A8A8A]"}`}>{description}</span>
    </button>
  );
}

/* ---------------------------------- Success step ---------------------------------- */

/* ---------------------------------- Quick add stock modal ---------------------------------- */

const QUICK_CATEGORIES = [
  "Coque",
  "Protection écran",
  "Écran",
  "Batterie",
  "Connecteur de charge",
  "Caméra",
  "Haut-parleur",
  "Micro",
  "Câble / chargeur",
  "Accessoire",
  "Console",
  "PC",
  "Autre",
];

function QuickAddStockModal({
  onClose,
  onCreated,
}: Readonly<{ onClose: () => void; onCreated: (item: StockItem) => void }>) {
  const store = useBeharStore();
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState("Coque");
  const [salePrice, setSalePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Le nom du produit est obligatoire.");
      return;
    }
    const price = Number(salePrice.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Prix de vente obligatoire et supérieur à 0 €.");
      return;
    }
    const stock = Math.max(1, Math.floor(Number(quantity) || 1));

    const id = store.addStockItem({
      name: cleanName,
      sku: sku.trim() || undefined,
      part: cleanName,
      reference: sku.trim() || undefined,
      category: categoryName,
      categoryName,
      compatibleModels: [],
      modelIds: [],
      skipModelInference: true,
      purchasePrice: 0,
      salePrice: price,
      stock,
      quantity: stock,
      threshold: 1,
      supplier: "Comptoir",
      leadTime: "Disponible atelier",
    });
    if (!id) {
      toast.error("Impossible de créer la pièce : vérifiez vos droits stock.");
      return;
    }
    const created = useBeharStore.getState().stockItems.find((item) => item.id === id);
    if (!created) {
      toast.error("Pièce créée mais introuvable en stock.");
      return;
    }
    onCreated(created);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1916]/30 p-4">
      <div className="w-full max-w-md rounded-[20px] border border-[#E8E8E5] bg-white shadow-[0_18px_45px_rgba(26,25,22,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E8E8E5] px-5 py-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="size-4 text-[#2A9D8F]" strokeWidth={1.8} />
            <h3 className="font-semibold text-[#1A1916] text-[16px] tracking-tight">Ajouter une pièce</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F7F7F7] hover:text-[#1A1916]"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-[#6B6B6B] text-[12px] font-medium">Nom du produit *</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Coque transparente iPhone 13"
              className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] outline-none focus:border-[#2A9D8F]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[#6B6B6B] text-[12px] font-medium">Catégorie</span>
              <select
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] outline-none focus:border-[#2A9D8F]"
              >
                {QUICK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[#6B6B6B] text-[12px] font-medium">SKU (optionnel)</span>
              <input
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="REF-..."
                className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 font-mono text-[13px] text-[#1A1916] outline-none focus:border-[#2A9D8F]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[#6B6B6B] text-[12px] font-medium">Prix de vente TTC *</span>
              <div className="relative">
                <input
                  inputMode="decimal"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  placeholder="0,00"
                  className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white pl-3 pr-9 text-[14px] text-[#1A1916] tabular-nums outline-none focus:border-[#2A9D8F]"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#8A8A8A] text-[13px]">€</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[#6B6B6B] text-[12px] font-medium">Stock initial</span>
              <input
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[14px] text-[#1A1916] tabular-nums outline-none focus:border-[#2A9D8F]"
              />
            </label>
          </div>

          <p className="text-[#8A8A8A] text-[11.5px]">
            Crée la pièce en stock et l'ajoute directement au panier. Vous pourrez compléter (achat, fournisseur, modèle compatible) plus tard depuis l'onglet Stock.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E8E8E5] bg-[#FAFAFA] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#E8E8E5] bg-white px-4 text-[13px] font-medium text-[#1A1916] transition hover:bg-[#F7F7F7]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2A9D8F] px-4 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(42,157,143,0.25)] transition hover:bg-[#23867a]"
          >
            <Plus className="size-3.5" />
            Créer et ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessStep({
  sale,
  hasDocument,
  onPrint,
  onDownload,
  onOpenReceipt,
  onNewSale,
  onOpenRepair,
  onViewHistory,
}: Readonly<{
  sale: Sale;
  hasDocument: boolean;
  onPrint: () => void;
  onDownload: () => void;
  onOpenReceipt: () => void;
  onNewSale: () => void;
  onOpenRepair: () => void;
  onViewHistory?: () => void;
}>) {
  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto py-6 md:py-10">
      <div className="w-full max-w-md rounded-[24px] border border-[#E8E8E5] bg-white p-6 shadow-[0_8px_28px_rgba(26,25,22,0.06)] md:p-8">
        <div className="grid mx-auto mb-4 size-14 place-items-center text-[#2A9D8F]">
          <CheckCircle2 className="size-9" strokeWidth={2} />
        </div>
        <h2 className="text-center font-semibold text-[#1A1916] text-[20px] tracking-tight">Vente validée</h2>
        <p className="mt-1 text-center font-mono text-[#2A9D8F] text-[13px]">{sale.number}</p>

        <div className="mt-5 space-y-2 rounded-[14px] bg-[#FAFAFA] p-4 text-[13px]">
          <Row label="Total TTC" value={formatEuro(sale.total)} />
          <Row label="Paiement" value={formatPaymentLabel(sale.paymentMethod)} />
          <Row label="Client" value={sale.customerName || "Vente comptoir"} />
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onNewSale}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2A9D8F] font-semibold text-[14px] text-white shadow-[0_4px_12px_rgba(42,157,143,0.25)] transition hover:bg-[#23867a]"
          >
            <Plus className="size-4" />
            Nouvelle vente
          </button>
          {hasDocument ? (
            <>
              <button
                type="button"
                onClick={onOpenReceipt}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[13px] text-[#1A1916] transition hover:bg-[#FAFAFA]"
              >
                <FileText className="size-4" />
                Ouvrir le reçu
              </button>
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[13px] text-[#1A1916] transition hover:bg-[#FAFAFA]"
              >
                <Printer className="size-4" />
                Imprimer reçu
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[13px] text-[#1A1916] transition hover:bg-[#FAFAFA]"
              >
                <Download className="size-4" />
                Télécharger reçu PDF
              </button>
            </>
          ) : (
            <p className="text-center text-[#8A8A8A] text-[12px]">
              Reçu non disponible pour cette vente (vente rattachée — voir la facture du dossier réparation).
            </p>
          )}
          {sale.repairId ? (
            <button
              type="button"
              onClick={onOpenRepair}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-medium text-[13px] text-[#1A1916] transition hover:bg-[#FAFAFA]"
            >
              <Wrench className="size-4" />
              Ouvrir la réparation liée
            </button>
          ) : null}
          {onViewHistory ? (
            <button
              type="button"
              onClick={onViewHistory}
              className="mt-1 inline-flex h-10 items-center justify-center gap-2 text-[12px] text-[#6B6B6B] transition hover:text-[#1A1916]"
            >
              <FileText className="size-3.5" />
              Voir dans l'historique
            </button>
          ) : null}
          {sale.customerName && sale.customerName !== "Vente comptoir" && sale.customerName !== "Client comptoir" ? (
            <p className="text-center text-[#8A8A8A] text-[11px]">
              <User className="mr-1 inline size-3" />
              Facture nominative disponible depuis Documents.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
