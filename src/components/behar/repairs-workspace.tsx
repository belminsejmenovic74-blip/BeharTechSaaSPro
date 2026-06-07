"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  FolderOpen,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  Receipt,
  ReceiptText,
  Search,
  Send,
  Trash2,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { KanbanBoard } from "@/components/behar/kanban";
import { RepairModal } from "@/components/behar/repair-create-modal";
import { RepairIntakeScreen } from "@/components/behar/repair-intake-condition";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  type Appointment,
  buildInvoiceLinesFromRepair,
  type Customer,
  formatEuro,
  formatIsoToDisplay,
  type Invoice,
  isTerminalRepairStatus,
  normalizeAppointmentStatus,
  type PaymentMethod,
  paymentMethods,
  type Quote,
  type Repair,
  type RepairStatus,
  useBeharStore,
} from "@/lib/behar-store";
import { displayCustomerName, isCounterCustomer } from "@/lib/customer-display";
import { formatDeviceLabel } from "@/lib/format-device";
import { sendRealSms } from "@/lib/send-sms";
import { cn } from "@/lib/utils";
import type { RepairCard } from "@/mock/repairs";

import { DeviceThumb, Panel, PrimaryButton, SecondaryButton, StatusBadge } from "./primitives";
import { useDocument } from "./print-provider";

const statuses: RepairStatus[] = ["Reçu", "Diagnostic", "En attente", "Devis envoyé", "Devis accepté", "En réparation", "Test final", "Prêt"];

function compactStockText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isAccessoryStockItem(item: { name: string; category?: string; categoryName?: string; part?: string }) {
  const text = compactStockText(`${item.name} ${item.category ?? ""} ${item.categoryName ?? ""} ${item.part ?? ""}`);
  const looksLikeAccessory = /\b(accessoire|coque|etui|housse|chargeur|cable|ecouteurs|verre trempe|protection ecran|film|adaptateur|batterie externe|support voiture)\b/.test(text);
  const looksLikeRepairPart = /\b(ecran|lcd|oled|vitre arriere|connecteur|nappe|camera|haut parleur|micro|vibreur|batterie interne|chassis|carte mere)\b/.test(text);
  return looksLikeAccessory && !looksLikeRepairPart;
}

function nextStatusLabel(from: RepairStatus): string | null {
  switch (from) {
    case "Reçu":
      return "Passer en diagnostic";
    case "Diagnostic":
      return "Mettre en attente";
    case "Devis envoyé":
      return "Marquer devis accepté";
    case "En attente":
      return "Passer en réparation";
    case "Devis accepté":
      return "Passer en réparation";
    case "En réparation":
      return "Passer en test final";
    case "Test final":
      return "Marquer comme prêt";
    default:
      return null;
  }
}

function invoiceUiStatus(inv: Invoice | undefined): "À créer" | "Créée" | "Payée" {
  if (!inv) return "À créer";
  if (inv.status === "Payée") return "Payée";
  return "Créée";
}

function quoteUiSummary(quotes: Quote[], acceptedQuote: Quote | undefined): "Aucun" | "Créé" | "Accepté" {
  const related = quotes;
  if (acceptedQuote) return "Accepté";
  if (related.length > 0) return "Créé";
  return "Aucun";
}

export function RepairsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    workshopInfo,
    repairs,
    customers,
    quotes,
    invoices,
    payments,
    documents,
    stockItems,
    appointments,
    selectedRepairId,
    setSelected,
    convertQuoteToInvoice,
    addInvoice,
    markInvoicePaid,
    addPartToRepair,
    addSaleLinesToRepair,
    markRepairSaleLineDelivered,
    removePartFromRepair,
    sendMessage,
    updateRepair,
    updateAppointment,
    changeRepairStatus,
    deleteRepair,
    createRepairFromAppointment,
    createInvoiceFromRepair,
    confirmPartUsage,
    addRepair,
    addDocument,
  } = useBeharStore(
    useShallow((s) => ({
      workshopInfo: s.workshopInfo,
      repairs: s.repairs,
      customers: s.customers,
      quotes: s.quotes,
      invoices: s.invoices,
      payments: s.payments,
      documents: s.documents,
      stockItems: s.stockItems,
      appointments: s.appointments,
      selectedRepairId: s.selectedRepairId,
      setSelected: s.setSelected,
      convertQuoteToInvoice: s.convertQuoteToInvoice,
      addInvoice: s.addInvoice,
      markInvoicePaid: s.markInvoicePaid,
      addPartToRepair: s.addPartToRepair,
      addSaleLinesToRepair: s.addSaleLinesToRepair,
      markRepairSaleLineDelivered: s.markRepairSaleLineDelivered,
      removePartFromRepair: s.removePartFromRepair,
      sendMessage: s.sendMessage,
      updateRepair: s.updateRepair,
      updateAppointment: s.updateAppointment,
      changeRepairStatus: s.changeRepairStatus,
      deleteRepair: s.deleteRepair,
      createRepairFromAppointment: s.createRepairFromAppointment,
      createInvoiceFromRepair: s.createInvoiceFromRepair,
      confirmPartUsage: s.confirmPartUsage,
      addRepair: s.addRepair,
      addDocument: s.addDocument,
    })),
  );
  const { print, download } = useDocument();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draftStatus, setDraftStatus] = useState<RepairStatus>("Reçu");
  const [selectedStockItemId, setSelectedStockItemId] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepairStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [repairPayMethod, setRepairPayMethod] = useState<PaymentMethod>("TPE externe");
  const [importOpen, setImportOpen] = useState(false);
  const [prefillFromQuote, setPrefillFromQuote] = useState<any>(null);
  const [detailMode, setDetailMode] = useState<"repair" | "intake">("repair");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [repairPendingDelete, setRepairPendingDelete] = useState<{
    id: string;
    number: string;
    status: RepairStatus;
  } | null>(null);

  const selectedRepair = repairs.find((repair) => repair.id === selectedRepairId);

  const selectedStockItem = stockItems.find((item) => item.id === selectedStockItemId);
  const maxPartQuantity = Math.max(1, selectedStockItem?.stock ?? 1);
  const selectedCustomer = selectedRepair
    ? customers.find((customer) => customer.id === selectedRepair.customerId)
    : undefined;
  const selectedLinkedAppointment = selectedRepair
    ? selectedRepair.appointmentId
      ? appointments.find((appointment) => appointment.id === selectedRepair.appointmentId)
      : appointments.find((appointment) => appointment.repairId === selectedRepair.id)
    : undefined;
  const relatedQuotes = selectedRepair
    ? quotes.filter((quote) => quote.repairId === selectedRepair.id || selectedRepair.quoteIds?.includes(quote.id))
    : [];
  const acceptedQuote = relatedQuotes.find((quote) => quote.status === "Accepté");
  const relatedInvoices = selectedRepair
    ? invoices.filter(
        (invoice) => invoice.repairId === selectedRepair.id || selectedRepair.invoiceIds?.includes(invoice.id),
      )
    : [];
  const relatedPayments = selectedRepair
    ? payments.filter(
        (payment) => payment.repairId === selectedRepair.id || selectedRepair.paymentIds?.includes(payment.id),
      )
    : [];
  const acceptedQuoteInvoice = acceptedQuote
    ? (invoices.find((invoice) => invoice.id === acceptedQuote.invoiceId) ??
      invoices.find((invoice) => invoice.quoteId === acceptedQuote.id))
    : undefined;
  const primaryInvoice = acceptedQuoteInvoice ?? relatedInvoices[0];

  const repairPaidAmount = relatedPayments
    .filter((payment) => payment.status === "Payé")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalClientAmount =
    typeof selectedRepair?.total === "number" && Number.isFinite(selectedRepair.total)
      ? selectedRepair.total
      : typeof selectedRepair?.amount === "number" && Number.isFinite(selectedRepair.amount)
        ? selectedRepair.amount
        : 0;
  const resteAPayer =
    typeof totalClientAmount === "number" && Number.isFinite(totalClientAmount)
      ? Math.max(0, totalClientAmount - repairPaidAmount)
      : 0;

  const paymentLabel = repairPaidAmount >= totalClientAmount && totalClientAmount > 0 ? "Payé" : "Non payé";

  const filteredRepairs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repairs.filter((repair) => {
      if (statusFilter !== "all" && repair.status !== statusFilter) return false;

      const paid = payments
        .filter((payment) => payment.repairId === repair.id && payment.status === "Payé")
        .reduce((sum, payment) => sum + payment.amount, 0);
      const total = typeof repair.total === "number" ? repair.total : (repair.amount ?? 0);
      if (paymentFilter === "paid" && !(paid >= total && total > 0)) return false;
      if (paymentFilter === "unpaid" && !(total > 0 && paid < total)) return false;

      if (!q) return true;
      const cust = customers.find((c) => c.id === repair.customerId);
      const displayName = displayCustomerName(cust);
      const needle = `${repair.number} ${repair.device} ${repair.issue} ${displayName}`.toLowerCase();
      return needle.includes(q);
    });
  }, [repairs, search, statusFilter, paymentFilter, payments, customers]);

  const accessoryStockItems = useMemo(() => stockItems.filter(isAccessoryStockItem), [stockItems]);
  const compatibleStockItems = selectedRepair
    ? accessoryStockItems.filter(
        (item) =>
          item.modelIds.includes(selectedRepair.modelId ?? "") ||
          item.compatibleModels.includes(selectedRepair.deviceModel ?? selectedRepair.model),
      )
    : [];
  const genericStockItems = selectedRepair
    ? accessoryStockItems.filter((item) => !compatibleStockItems.some((compatible) => compatible.id === item.id))
    : accessoryStockItems;

  const columns = useMemo(
    () =>
      statuses.map((status) => ({
        title: status,
        count: filteredRepairs.filter((repair) => repair.status === status).length,
        cards: filteredRepairs
          .filter((repair) => repair.status === status)
          .map((repair) => {
            const customer = customers.find((entry) => entry.id === repair.customerId);
            const invs = invoices.filter((i) => i.repairId === repair.id);
            const pays = payments.filter((p) => p.repairId === repair.id && p.status === "Payé");
            const paid = pays.reduce((s, p) => s + p.amount, 0);
            const total = typeof repair.total === "number" ? repair.total : (repair.amount ?? 0);
            const hasInvoice = invs.length > 0 || Boolean(repair.invoiceIds?.length);
            return {
              id: repair.id,
              shop_id: repair.shopId,
              number: repair.number,
              device: repair.device,
              issue: repair.issue,
              customer: displayCustomerName(customer),
              time: formatIsoToDisplay(repair.droppedAt),
              status: repair.status,
              totalLabel: formatEuro(total),
              paidLabel: formatEuro(paid),
              paymentPaid: total > 0 && paid >= total,
              showCounterBadge: isCounterCustomer(customer),
              showInvoiceBadge: total > 0 && !hasInvoice,
              showReadyBadge: repair.status === "Prêt",
            } satisfies RepairCard;
          }),
      })),
    [filteredRepairs, customers, invoices, payments],
  );

  const openCreate = (status: RepairStatus = "Reçu") => {
    setDraftStatus(status);
    setModal("create");
  };

  const ensureIntakeDocument = () => {
    if (!selectedRepair) return "";
    const existing = documents.find(
      (document) => document.type === "intake" && document.repairId === selectedRepair.id,
    );
    if (existing) return existing.id;
    return addDocument({
      type: "intake",
      title: `Bon de prise en charge - ${selectedRepair.number}`,
      customerId: selectedRepair.customerId,
      repairId: selectedRepair.id,
    });
  };

  const openIntakeDocuments = () => {
    const documentId = ensureIntakeDocument();
    if (documentId) setSelected("document", documentId);
    router.push("/dashboard/documents");
  };

  const deleteRepairAction = () => {
    if (!selectedRepair) {
      toast.error("Aucun dossier sélectionné.");
      return;
    }
    setRepairPendingDelete({
      id: selectedRepair.id,
      number: selectedRepair.number,
      status: selectedRepair.status,
    });
  };

  const confirmDeleteRepair = () => {
    if (!repairPendingDelete) return;
    const repairId = repairPendingDelete.id;
    const repairNumber = repairPendingDelete.number;
    setRepairPendingDelete(null);
    deleteRepair(repairId);
    // Vérification post-suppression : si la réparation est toujours là,
    // c'est qu'une permission a bloqué (canDeleteRepair non accordé) ou
    // un autre garde-fou. On informe explicitement l'utilisateur.
    const stillExists = useBeharStore.getState().repairs.some((r) => r.id === repairId);
    if (stillExists) {
      toast.error("Impossible de supprimer cette réparation. Vérifiez vos permissions ou réessayez.");
      return;
    }
    toast.success(`Réparation ${repairNumber} supprimée.`);
  };

  useEffect(() => {
    setDetailMode("repair");
  }, [selectedRepairId]);

  useEffect(() => {
    if (searchParams?.get("create") === "1") {
      setDraftStatus("Reçu");
      setModal("create");
      router.replace("/dashboard/reparations");
    }
  }, [searchParams, router]);

  const createQuoteAction = () => {
    if (!selectedRepair) return;
    if (!["Reçu", "Diagnostic", "En attente", "Devis accepté"].includes(selectedRepair.status)) {
      toast.error("Création de devis impossible à ce stade du dossier.");
      return;
    }
    const cust = selectedCustomer;
    if (!cust) {
      toast.error("Ajoutez un client avant de créer un devis.");
      return;
    }
    if (totalClientAmount <= 0) {
      toast.error("Ajoutez un tarif avant de créer un devis.");
      return;
    }
    if (acceptedQuote) {
      toast.info(`Le devis accepté ${acceptedQuote.number} est déjà lié à cette réparation.`);
      setSelected("quote", acceptedQuote.id);
      return;
    }
    if (relatedQuotes.length > 0) {
      const existing = relatedQuotes[0];
      const ok = window.confirm(
        `Un devis (${existing.number} — ${existing.status}) existe déjà pour cette réparation.\n\nVoulez-vous créer un nouveau devis ?`,
      );
      if (!ok) {
        setSelected("quote", existing.id);
        return;
      }
    }
    setSelected("repair", selectedRepair.id);
    router.push("/dashboard/devis?create=1&origin=repair");
    toast.success("Préparation du nouveau devis à partir de cette réparation.");
  };

  const createInvoiceAction = () => {
    if (!selectedRepair) return;

    const existingByQuote = acceptedQuote ? invoices.find((inv) => inv.quoteId === acceptedQuote.id) : undefined;
    const existingByRepair = invoices.find((inv) => inv.repairId === selectedRepair.id);
    const existingInvoice = existingByQuote ?? existingByRepair;

    if (existingInvoice) {
      setSelected("invoice", existingInvoice.id);
      router.push("/dashboard/factures");
      toast.info("Cette facture existe déjà.");
      return;
    }

    if (acceptedQuote) {
      const invoiceId = convertQuoteToInvoice(acceptedQuote.id);
      if (invoiceId) {
        setSelected("invoice", invoiceId);
        router.push("/dashboard/factures");
        toast.success(`Facture créée depuis le devis ${acceptedQuote.number}`);
        return;
      }
    }

    const built = buildInvoiceLinesFromRepair(selectedRepair);
    if (!built.ok || !built.lines.length) {
      toast.error("Ajoutez un tarif avant de créer une facture.");
      return;
    }

    const id = addInvoice({
      customerId: selectedRepair.customerId,
      repairId: selectedRepair.id,
      lines: built.lines,
      status: "Envoyée",
      sourceType: "repair",
      sourceNumber: selectedRepair.number,
    });

    if (id) {
      setSelected("invoice", id);
      router.push("/dashboard/factures");
      toast.success("Facture créée. Le paiement est en attente.");
    } else {
      toast.error("Impossible de créer la facture.");
    }
  };

  const markPaidAction = (method: PaymentMethod = "Carte") => {
    if (!selectedRepair) return;
    if (!primaryInvoice?.id) {
      const id = createInvoiceFromRepair(selectedRepair.id);
      if (!id) {
        toast.error("Ajoutez un tarif avant de créer une facture.");
        return;
      }
      const pid = markInvoicePaid(id, method, paymentNote);
      if (pid) {
        toast.success("Paiement enregistré.");
        setPaymentNote("");
      } else toast.error("Encaissement impossible pour le moment.");
      return;
    }
    if (primaryInvoice.status === "Payée") {
      toast.info("Cette réparation est déjà payée.");
      return;
    }
    const pid = markInvoicePaid(primaryInvoice.id, method, paymentNote);
    if (pid) {
      toast.success("Paiement enregistré.");
      setPaymentNote("");
    } else toast.error("Encaissement impossible pour le moment.");
  };

  const normalizePartQuantity = (value: number) => {
    if (!Number.isFinite(value) || value < 1) return 1;
    return Math.min(Math.floor(value), maxPartQuantity);
  };

  const addSelectedPart = () => {
    if (!(selectedRepair && selectedStockItem)) {
      toast.error("Sélectionnez un produit du stock.");
      return;
    }
    if (primaryInvoice || repairPaidAmount > 0) {
      toast.error("Cette réparation est déjà facturée. Créez une vente séparée.");
      return;
    }
    const quantity = normalizePartQuantity(partQuantity);
    if (quantity > selectedStockItem.stock) {
      setPartQuantity(maxPartQuantity);
      toast.error(`Stock insuffisant pour ${selectedStockItem.name} (${selectedStockItem.stock} disponible).`);
      return;
    }
    const ok = addSaleLinesToRepair(selectedRepair.id, [
      {
        stockItemId: selectedStockItem.id,
        name: selectedStockItem.name,
        sku: selectedStockItem.sku,
        quantity,
        unitPrice: selectedStockItem.salePrice,
        total: selectedStockItem.salePrice * quantity,
        purchasePriceInternal: selectedStockItem.purchasePrice,
        supplierInternal: selectedStockItem.supplier,
      },
    ]);
    if (ok) {
      toast.success("Produit ajouté au dossier.");
      setSelectedStockItemId("");
      setPartQuantity(1);
    } else {
      toast.error(`Stock insuffisant pour ${selectedStockItem.name}.`);
    }
  };

  const send = async (channel: "SMS" | "Email") => {
    if (!(selectedRepair && selectedCustomer)) {
      toast.error("Aucun client lié à cette réparation.");
      return;
    }

    if (channel === "Email") {
      sendMessage({
        customerId: selectedCustomer.id,
        repairId: selectedRepair.id,
        channel,
        subject: "Votre réparation est prête",
        body: `Bonjour ${displayCustomerName(selectedCustomer)}, votre ${selectedRepair.device} est prêt.`,
      });
      toast.success("Email ajouté à l’historique.");
      return;
    }

    const message = `Bonjour ${displayCustomerName(selectedCustomer)}, votre ${selectedRepair.device} est prêt. — Behar Tech`;

    if (!/^(\+?\d[\d\s.-]{7,})$/.test(selectedCustomer.phone)) {
      toast.error("Numéro de téléphone invalide ou manquant.");
      return;
    }

    if (!window.confirm(`Envoyer ce SMS au client (${selectedCustomer.phone}) ?\n\n"${message}"`)) {
      return;
    }

    setIsSendingSms(true);
    try {
      await sendRealSms(selectedCustomer.phone, message);
      toast.success("SMS envoyé.");
      sendMessage({
        body: message,
        channel: "SMS",
        customerId: selectedCustomer.id,
        repairId: selectedRepair.id,
        subject: "Réparation prête",
      });

      updateRepair(selectedRepair.id, {
        history: [...selectedRepair.history, `SMS envoyé à ${selectedCustomer.phone}`],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l’envoi.");
    } finally {
      setIsSendingSms(false);
    }
  };

  const primaryAction =
    selectedRepair &&
    (() => {
      const st = selectedRepair.status;
      if (isTerminalRepairStatus(st)) {
        return null;
      }
      if (st !== "Prêt") {
        const next = (
          {
            Reçu: "Diagnostic" as RepairStatus,
            Diagnostic: "En attente" as RepairStatus,
            "En attente": "En réparation" as RepairStatus,
            "Devis envoyé": "Devis accepté" as RepairStatus,
            "Devis accepté": "En réparation" as RepairStatus,
            "En réparation": "Test final" as RepairStatus,
            "Test final": "Prêt" as RepairStatus,
          } as Partial<Record<RepairStatus, RepairStatus>>
        )[st];
        if (!next) return null;
        return {
          label: nextStatusLabel(st) ?? "Avancer",
          onClick: () => changeRepairStatus(selectedRepair.id, next),
        };
      }

      if (totalClientAmount <= 0) {
        return {
          label: "Ajouter un tarif",
          onClick: () => setModal("edit"),
        };
      }

      if (!primaryInvoice) {
        return {
          label: "Créer facture",
          onClick: createInvoiceAction,
        };
      }

      if (primaryInvoice.status !== "Payée" && resteAPayer > 0) {
        return {
          label: `Marquer payée (${formatEuro(resteAPayer)})`,
          onClick: () => markPaidAction(repairPayMethod),
        };
      }

      const payRec = payments.find((p) => p.invoiceId === primaryInvoice.id && p.status === "Payé");
      return {
        label: "Voir reçu",
        onClick: () => {
          if (payRec) print("payment", payRec.id);
          else toast.info("Téléchargez le reçu depuis la facture une fois le paiement enregistré.");
        },
      };
    })();

  const subtleHintCounter =
    isCounterCustomer(selectedCustomer) &&
    "Vous pouvez facturer un client comptoir et compléter son identité plus tard.";
  const plannedEntries = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const linkedRepair = findRepairForAppointment(appointment, repairs);
          const status = normalizeAppointmentStatus(appointment.status, appointment.confirmed, Boolean(linkedRepair));
          return !linkedRepair && (status === "En attente" || status === "Confirmé" || status === "Arrivé");
        })
        .sort((a, b) => appointmentSortKey(a).localeCompare(appointmentSortKey(b)))
        .slice(0, 6),
    [appointments, repairs],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      {/* Mobile : barre recherche compacte + chips statut horizontaux */}
      <div className="md:hidden">
        <label className="relative block">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3.5 size-4 text-[#6B6B6B]" />
          <Input
            className="h-12 rounded-[14px] border-[#E8E8E5] bg-white pr-4 pl-10 text-sm placeholder:text-[#6B6B6B]"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            type="search"
            value={search}
          />
        </label>
        <div className="-mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {(["all", ...statuses] as const).map((s) => {
            const active = statusFilter === s;
            const label = s === "all" ? "Tous" : s;
            const count = s === "all" ? filteredRepairs.length : repairs.filter((r) => r.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s as RepairStatus | "all")}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold tracking-tight transition active:scale-95",
                  active ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-[#1A1916]",
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-bold",
                    active ? "bg-white/25 text-white" : "bg-[#F7F7F7] text-[#6B6B6B]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <PrimaryButton className="mt-3 h-11 w-full gap-2" onClick={() => openCreate()}>
          <Plus className="size-4" /> Nouvelle prise en charge
        </PrimaryButton>
      </div>

      <PlannedEntriesPanel
        appointments={plannedEntries}
        customers={customers}
        onCreateRepair={(appointment) => {
          const status = normalizeAppointmentStatus(appointment.status, appointment.confirmed);
          if (status !== "Arrivé") {
            toast.info("Marquez d'abord le client comme arrivé.");
            return;
          }
          const repairId = createRepairFromAppointment(appointment.id);
          if (!repairId) {
            toast.error("Réparation déjà liée ou impossible à créer.");
            return;
          }
          setSelected("repair", repairId);
          toast.success("Dossier créé depuis le rendez-vous");
        }}
        onMarkArrived={(appointment) => {
          updateAppointment(appointment.id, { confirmed: true, status: "Arrivé" });
          toast.success("Client marqué comme arrivé");
        }}
        onOpenAppointment={(appointment) => {
          setSelected("appointment", appointment.id);
          router.push("/dashboard/rendez-vous");
        }}
      />

      {/* Desktop : ancienne barre filtres + actions */}
      <div className="hidden shrink-0 md:flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block w-full min-w-[200px] max-w-[400px] sm:max-w-[320px]">
            <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3.5 size-4 text-[#6B6B6B]" />
            <Input
              className="h-11 rounded-[14px] border-[#E8E8E5] bg-white pr-4 pl-10 text-sm placeholder:text-[#6B6B6B]"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dossier, appareil, client…"
              type="search"
              value={search}
            />
          </label>
          <select
            className={cn(
              "h-11 cursor-pointer rounded-[14px] border border-[#E8E8E5] bg-white px-3.5 font-medium text-[#1A1916] text-sm shadow-[0_4px_14px_rgba(26,25,22,0.025)] outline-none transition focus:border-[#2A9D8F]",
            )}
            onChange={(event) =>
              setStatusFilter(event.target.value === "all" ? "all" : (event.target.value as RepairStatus))
            }
            value={statusFilter}
          >
            <option value="all">Statut · Tous</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="h-11 cursor-pointer rounded-[14px] border border-[#E8E8E5] bg-white px-3.5 font-medium text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]"
            onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}
            value={paymentFilter}
          >
            <option value="all">Paiement · Tous</option>
            <option value="unpaid">Non payé</option>
            <option value="paid">Payé</option>
          </select>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SecondaryButton className="h-11 gap-2 px-4" onClick={() => setImportOpen(true)}>
            <FileText className="size-4" />
            Importer d'un devis
          </SecondaryButton>
          <PrimaryButton className="h-11 shrink-0 gap-2 px-6" onClick={() => openCreate()}>
            <Plus className="size-4" />
            Nouvelle prise en charge
          </PrimaryButton>
        </div>
      </div>

      {/* Mobile : liste verticale (pas de kanban — il déborde sur iPhone) */}
      <div className="md:hidden">
        {filteredRepairs.length === 0 ? (
          <div className="rounded-[20px] bg-white p-10 text-center shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
            <p className="text-[#6B6B6B] text-sm">
              {search || statusFilter !== "all"
                ? "Aucun dossier ne correspond aux filtres."
                : "Aucun dossier pour l'instant."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filteredRepairs.map((repair) => {
              const customer = customers.find((c) => c.id === repair.customerId);
              const paid = payments
                .filter((p) => p.repairId === repair.id && p.status === "Payé")
                .reduce((s, p) => s + p.amount, 0);
              const total = typeof repair.total === "number" ? repair.total : (repair.amount ?? 0);
              const fullyPaid = total > 0 && paid >= total;
              const linkedAppointment = repair.appointmentId
                ? appointments.find((a) => a.id === repair.appointmentId)
                : appointments.find((a) => a.repairId === repair.id);
              return (
                <li key={repair.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected("repair", repair.id);
                      setMobileDetailOpen(true);
                    }}
                    className="flex w-full items-start gap-3 rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#FAFAFA] text-[#1A1916]">
                      <Wrench className="size-[18px]" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                          {displayCustomerName(customer)}
                        </p>
                        <span className="shrink-0 font-mono text-[#6B6B6B] text-[10.5px]">{repair.number}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[#1A1916] text-[13px]">{formatDeviceLabel(repair)}</p>
                      <p className="mt-0.5 truncate text-[#6B6B6B] text-[12px]">{repair.issue}</p>
                      {linkedAppointment && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[#2A9D8F] text-[11px] font-medium">
                          <CalendarDays className="size-3" />
                          Depuis RDV · {linkedAppointment.date}
                          {linkedAppointment.time ? ` · ${linkedAppointment.time}` : ""}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StatusBadge status={repair.status} />
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums",
                            fullyPaid ? "bg-[#EAF6F2] text-[#2A9D8F]" : "bg-[#FDECEC] text-[#B42318]",
                          )}
                        >
                          {fullyPaid ? "Payé" : formatEuro(Math.max(0, total - paid))}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <section
        className={cn(
          // Mobile : overlay full-screen when detail open. Desktop : grid.
          mobileDetailOpen && selectedRepair
            ? "fixed inset-0 z-40 block overflow-y-auto bg-white md:relative md:inset-auto md:z-auto md:bg-transparent md:overflow-visible"
            : "hidden md:grid",
          "md:grid md:min-h-0 md:flex-1 md:gap-4 md:grid-rows-[minmax(0,1fr)]",
          detailMode === "intake" && selectedRepair
            ? "md:grid-cols-1"
            : "xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] 2xl:grid-cols-[minmax(0,1fr)_400px]",
        )}
      >
        {/* Kanban : desktop uniquement */}
        <div className="hidden md:flex md:min-h-0 md:h-full md:flex-col md:overflow-hidden">
          {!(detailMode === "intake" && selectedRepair) && (
            <KanbanBoard
              columns={columns}
              onAdd={(status) => openCreate(status as RepairStatus)}
              onSelect={(id) => setSelected("repair", id)}
              selectedId={selectedRepair?.id ?? ""}
              onMoveCard={(cardId, _from, toStatus) => {
                if (!statuses.includes(toStatus as RepairStatus)) return;
                changeRepairStatus(cardId, toStatus as RepairStatus);
                toast.success(`Statut : ${toStatus}`);
              }}
            />
          )}
        </div>

        {importOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <Panel className="w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-[#1A1916]">Choisir un devis</h3>
                <button onClick={() => setImportOpen(false)}>
                  <X className="size-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {quotes
                  .filter((q) => q.status === "Accepté" || q.status === "Envoyé")
                  .map((q) => {
                    const c = customers.find((cust) => cust.id === q.customerId);
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          const total = q.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
                          const firstLine = q.lines[0]?.description || "";
                          const [issue, device] = firstLine.includes(" — ") ? firstLine.split(" — ") : [firstLine, ""];

                          setPrefillFromQuote({
                            customerId: q.customerId,
                            device: device.trim() || "Appareil",
                            model: device.trim() || "",
                            issue: issue.trim() || "Réparation",
                            amount: total,
                            notes: q.notes || "",
                            quoteId: q.id,
                          });
                          setModal("create");
                          setImportOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E8E8E5] hover:border-[#2A9D8F] hover:bg-[#F1FAF8] transition-all text-left"
                      >
                        <div>
                          <p className="font-bold text-sm text-[#1A1916]">
                            {q.number} — {c?.name}
                          </p>
                          <p className="text-xs text-[#6B6B6B]">{q.lines[0]?.description || "Sans description"}</p>
                        </div>
                        <span className="text-xs font-bold text-[#2A9D8F]">
                          {formatEuro(q.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0))}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </Panel>
          </div>
        )}

        <Panel className="flex min-h-0 flex-col overflow-hidden rounded-none md:rounded-[20px] border-0 md:border md:border-[#E8E8E5] bg-white p-4 md:p-[18px] shadow-none md:shadow-[0_12px_40px_rgba(26,25,22,0.045)] xl:max-h-[calc(100svh-168px)]">
          {/* Mobile back button */}
          <div className="md:hidden -mx-4 -mt-4 mb-3 sticky top-0 z-10 flex items-center gap-3 border-b border-[#F7F7F7] bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="grid size-9 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white text-[#1A1916] transition active:scale-90"
              aria-label="Retour à la liste"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Détail réparation</span>
          </div>
          {selectedRepair ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-4 shrink-0 border-[#E8E8E5] border-b pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1A1916] text-[11px] uppercase tracking-[0.08em]">Réparation</p>
                    <h2 className="mt-1 truncate font-semibold text-[#1A1916] text-[22px] leading-tight tracking-tight">
                      {selectedRepair.number}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedRepair.status} />
                      {selectedLinkedAppointment ? (
                        <span className="inline-flex rounded-[7px] border border-[#D7EFEA] bg-[#F6FCFA] px-2 py-0.5 font-semibold text-[#167B70] text-[11px]">
                          Depuis RDV
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-3.5 font-medium text-[#1A1916] text-sm hover:bg-[#FAFAFA]"
                          type="button"
                        >
                          Actions
                          <MoreHorizontal className="size-4 text-[#6B6B6B]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[220px]" sideOffset={6}>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setModal("edit")}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Edit3 className="mr-2 size-4" /> Modifier la réparation
                        </DropdownMenuItem>
                        {isCounterCustomer(selectedCustomer) ? (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setModal("edit")}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <WalletCards className="mr-2 size-4" /> Compléter le client
                          </DropdownMenuItem>
                        ) : null}
                        {selectedRepair &&
                          ["Reçu", "Diagnostic", "En attente", "Devis accepté"].includes(selectedRepair.status) && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => createQuoteAction()}
                              onSelect={(e) => e.preventDefault()}
                            >
                              <FileText className="mr-2 size-4" /> Créer un devis
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setDetailMode("intake")}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <ReceiptText className="mr-2 size-4" /> Anti-litige
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={!(selectedRepair && primaryInvoice)}
                          onClick={() => {
                            const inv = primaryInvoice ?? invoices.find((i) => i.repairId === selectedRepair!.id);
                            if (inv) {
                              router.push("/dashboard/factures");
                              setSelected("invoice", inv.id);
                            }
                          }}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <FileText className="mr-2 size-4" /> Voir facture
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={!(selectedRepair && primaryInvoice)}
                          onClick={() => {
                            const inv = primaryInvoice ?? invoices.find((i) => i.repairId === selectedRepair!.id);
                            if (inv) download("invoice", inv.id);
                          }}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Receipt className="mr-2 size-4" /> Télécharger PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={!(selectedRepair && primaryInvoice)}
                          onClick={() => {
                            const inv = primaryInvoice ?? invoices.find((i) => i.repairId === selectedRepair!.id);
                            if (inv) print("invoice", inv.id);
                          }}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Printer className="mr-2 size-4" /> Imprimer facture
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={selectedRepair.status !== "Prêt"}
                          onClick={() => send("Email")}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Mail className="mr-2 size-4" /> Email au client
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={
                            selectedRepair.status !== "Prêt" ||
                            isSendingSms ||
                            !selectedCustomer?.phone ||
                            selectedCustomer.phone === "Non renseigné" ||
                            !/^(\+?\d[\d\s.-]{7,})$/.test(selectedCustomer.phone ?? "")
                          }
                          onClick={() => send("SMS")}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Send className="mr-2 size-4" /> SMS prêt
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-[#B42318]"
                          onClick={deleteRepairAction}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="mr-2 size-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                      aria-label="Fermer le panneau"
                      className="grid size-10 place-items-center rounded-[12px] text-[#6B6B6B] hover:bg-[#FAFAFA]"
                      onClick={() => setSelected("repair", "")}
                      type="button"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>
              </div>

              {detailMode === "intake" ? (
                <RepairIntakeScreen
                  customer={selectedCustomer}
                  onBack={() => setDetailMode("repair")}
                  onDownload={() => {
                    ensureIntakeDocument();
                    download("intake", selectedRepair.id);
                  }}
                  onOpenDocuments={openIntakeDocuments}
                  onSave={(intakeCondition) => {
                    ensureIntakeDocument();
                    updateRepair(selectedRepair.id, { intakeCondition });
                  }}
                  repair={selectedRepair}
                />
              ) : (
                <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 pb-4">
                  <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FAFAFA]/80 px-5 py-4">
                    {primaryAction ? (
                      <>
                        {selectedRepair.status === "Prêt" && primaryInvoice?.status !== "Payée" && resteAPayer > 0 && (
                          <div className="mt-4 space-y-2 rounded-[12px] border border-[#E8E8E5] bg-white p-3">
                            <p className="text-[#6B6B6B] text-xs">Moyen de règlement indiqué</p>
                            <select
                              className="h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-2 text-sm outline-none focus:border-[#2A9D8F]"
                              onChange={(event) => setRepairPayMethod(event.target.value as PaymentMethod)}
                              value={repairPayMethod}
                            >
                              {paymentMethods.map((m) => (
                                <option key={m} value={m}>
                                  {m === "Carte" ? "TPE externe" : m === "Espèces" ? "Espèces hors Behar Tech" : m === "En ligne" ? "Lien externe" : m}
                                </option>
                              ))}
                            </select>
                            <textarea
                              className="min-h-[48px] w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 py-2 text-xs outline-none placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]"
                              onChange={(e) => setPaymentNote(e.target.value)}
                              placeholder="Note facultative…"
                              value={paymentNote}
                            />
                          </div>
                        )}
                        <PrimaryButton className="mt-4 h-11 w-full" onClick={primaryAction.onClick}>
                          {primaryAction.label.startsWith("Marquer payée") ? (
                            <CreditCard className="mr-2 size-4" />
                          ) : primaryAction.label === "Voir reçu" ? (
                            <Receipt className="mr-2 size-4" />
                          ) : primaryAction.label === "Créer facture" ? (
                            <FileText className="mr-2 size-4" />
                          ) : primaryAction.label === "Ajouter un tarif" ? (
                            <Edit3 className="mr-2 size-4" />
                          ) : (
                            <Wrench className="mr-2 size-4" />
                          )}
                          {primaryAction.label}
                        </PrimaryButton>
                        {subtleHintCounter ? (
                          <p className="mt-3 text-[#6B6B6B] text-[11px] leading-relaxed">{subtleHintCounter}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-[#6B6B6B] text-sm">Aucune action disponible pour ce statut.</p>
                    )}
                  </div>

                  <button
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#2A9D8F]/35 bg-white px-4 font-semibold text-[#167B70] text-sm transition hover:bg-[#F3FBF8]"
                    onClick={() => router.push(`/dashboard/dossiers/${selectedRepair.id}`)}
                    type="button"
                  >
                    <FolderOpen className="size-4" />
                    Ouvrir le dossier complet
                  </button>

                  <section className="rounded-[16px] border border-[#E8E8E5]/90 bg-white px-[18px] py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <h3 className="font-semibold text-[#1A1916] text-xs uppercase tracking-[0.06em]">Client</h3>
                    <Link
                      href={`/dashboard/clients?id=${selectedCustomer?.id}`}
                      className="mt-3 block font-semibold text-[#1A1916] text-lg hover:text-[#2A9D8F] transition-colors"
                    >
                      {displayCustomerName(selectedCustomer)}
                    </Link>
                    {isCounterCustomer(selectedCustomer) ? (
                      <button
                        className="mt-2 cursor-pointer rounded-lg border border-transparent bg-transparent px-0 font-medium text-[#2A9D8F] text-sm hover:underline"
                        onClick={() => setModal("edit")}
                        type="button"
                      >
                        Compléter le client
                      </button>
                    ) : null}
                    {!isCounterCustomer(selectedCustomer) && selectedCustomer ? (
                      <div className="mt-2 space-y-1 text-[#6B6B6B] text-sm">
                        {selectedCustomer.phone && selectedCustomer.phone !== "Non renseigné" ? (
                          <p>{selectedCustomer.phone}</p>
                        ) : (
                          <p>Téléphone non renseigné</p>
                        )}
                        {selectedCustomer.email && selectedCustomer.email !== "Non renseigné" ? (
                          <p>{selectedCustomer.email}</p>
                        ) : (
                          <p>E-mail non renseigné</p>
                        )}
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-[16px] border border-[#E8E8E5]/90 bg-white px-[18px] py-4">
                    <h3 className="font-semibold text-[#1A1916] text-xs uppercase tracking-[0.06em]">Appareil</h3>
                    <p className="mt-3 font-semibold text-[#1A1916] text-[15px]">
                      {[
                        selectedRepair.deviceType,
                        selectedRepair.brandName,
                        selectedRepair.deviceModel ?? selectedRepair.model,
                      ]
                        .filter(Boolean)
                        .join(" · ") || selectedRepair.device}
                    </p>
                    {selectedRepair.imei?.trim() ? (
                      <p className="mt-1 text-[#6B6B6B] text-[13px]">IMEI / série : {selectedRepair.imei.trim()}</p>
                    ) : null}
                    <p className="mt-3 text-[#1A1916] text-sm">{selectedRepair.issue}</p>
                  </section>

                  <section className="rounded-[16px] border border-[#E8E8E5]/90 bg-white px-[18px] py-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#1A1916] text-xs uppercase tracking-[0.06em]">Total client</h3>
                        <p className="mt-2 font-semibold text-[#1A1916] text-[26px] leading-none tabular-nums">
                          {formatEuro(totalClientAmount)}
                          {workshopInfo.vatApplicable ? (
                            <span className="ml-1.5 text-xs font-medium text-[#6B6B6B]">TTC</span>
                          ) : null}
                        </p>
                      </div>
                      <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 font-semibold text-[#6B6B6B] text-[11px]">
                        {paymentLabel}
                      </span>
                    </div>
                    {resteAPayer > 0 ? (
                      <p className="mt-3 text-[#6B6B6B] text-[13px]">
                        Reste à payer <span className="font-semibold text-[#2A9D8F]">{formatEuro(resteAPayer)}</span>
                      </p>
                    ) : null}
                  </section>

                  <section className="rounded-[16px] border border-[#E8E8E5] px-[14px] py-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-[#1A1916] text-sm">Produits et accessoires</h3>
                      {(selectedRepair.repairSaleLines?.length ?? 0) > 0 ? (
                        <span className="rounded-[7px] border border-[#D7EFEA] bg-[#F6FCFA] px-2 py-0.5 font-semibold text-[#147065] text-xs">
                          {selectedRepair.repairSaleLines?.length ?? 0}
                        </span>
                      ) : null}
                    </div>
                    {primaryInvoice || repairPaidAmount > 0 ? (
                      <p className="mt-3 rounded-[12px] border border-[#F2C8C3] bg-[#FFF7F6] p-3 text-[#7A271A] text-xs">
                        Cette réparation est déjà facturée. Créez une vente séparée.
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_80px_auto] gap-2">
                        <select
                          aria-label="Produit du stock"
                          className="h-10 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-sm"
                          onChange={(event) => {
                            setSelectedStockItemId(event.target.value);
                            setPartQuantity(1);
                          }}
                          value={selectedStockItemId}
                        >
                          <option value="">Ajouter un accessoire</option>
                          {compatibleStockItems.length > 0 ? (
                            <optgroup label="Compatibles">
                              {compatibleStockItems.map((item) => (
                                <option disabled={item.stock <= 0} key={item.id} value={item.id}>
                                  {item.name} · {formatEuro(item.salePrice)} · ×{item.stock}
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                          <optgroup label="Accessoires généraux">
                            {genericStockItems.map((item) => (
                              <option disabled={item.stock <= 0} key={item.id} value={item.id}>
                                {item.name} · {formatEuro(item.salePrice)} · ×{item.stock}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <input
                          aria-label="Quantité"
                          className="h-10 rounded-[12px] border border-[#E8E8E5] bg-white px-2 text-center text-sm"
                          max={maxPartQuantity}
                          min={1}
                          onBlur={() => setPartQuantity(normalizePartQuantity(partQuantity))}
                          onChange={(event) => setPartQuantity(normalizePartQuantity(Number(event.target.value)))}
                          step={1}
                          type="number"
                          value={partQuantity}
                        />
                        <SecondaryButton
                          aria-label="Ajouter au dossier"
                          className="h-10 px-2"
                          disabled={!(selectedStockItem && selectedStockItem.stock > 0)}
                          onClick={addSelectedPart}
                        >
                          <Plus className="size-4" />
                        </SecondaryButton>
                      </div>
                    )}
                    {!primaryInvoice && repairPaidAmount <= 0 && accessoryStockItems.length === 0 ? (
                      <p className="mt-3 rounded-[12px] border border-[#E8E8E5] bg-[#FAFAFA] p-3 text-[#6B6B6B] text-xs">
                        Aucun accessoire de comptoir disponible dans le stock. Les pièces techniques restent dans la
                        zone stock/réparation.
                      </p>
                    ) : null}
                    <div className="mt-4 space-y-2">
                      {(selectedRepair.repairSaleLines?.length ?? 0) === 0 ? (
                        <p className="text-[#6B6B6B] text-xs">Aucun produit ajouté à cette réparation.</p>
                      ) : (
                        (selectedRepair.repairSaleLines ?? []).map((line) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-[12px] border border-[#EFECE5] px-3 py-2 text-sm"
                            key={line.id}
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-[#1A1916]">{line.name}</p>
                              <p className="text-[#6B6B6B] text-xs">
                                {line.sku ? `SKU ${line.sku} · ` : ""}Qté {line.quantity} · {formatEuro(line.unitPrice)}{" "}
                                / u · ligne {formatEuro(line.total)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold text-[#6B6B6B]">
                                {line.status === "draft"
                                  ? "À remettre"
                                  : line.status === "confirmed"
                                    ? "Remis"
                                    : line.status === "invoiced"
                                      ? "Facturé"
                                      : "Payé"}
                              </span>
                              {!line.stockDecremented && line.status === "draft" ? (
                                <button
                                  className="h-8 rounded-lg bg-[#E8F7F3] px-2 text-[#167B70] text-[11px] font-bold hover:bg-[#D7F0E9] transition"
                                  onClick={() => {
                                    if (
                                      window.confirm(`Marquer ${line.name} comme remis ? Le stock sera décrémenté.`)
                                    ) {
                                      const ok = markRepairSaleLineDelivered(selectedRepair.id, line.id);
                                      toast[ok ? "success" : "error"](
                                        ok
                                          ? "Accessoire remis et stock décrémenté."
                                          : "Stock insuffisant ou ligne déjà traitée.",
                                      );
                                    }
                                  }}
                                >
                                  Marquer remis
                                </button>
                              ) : null}
                              {line.status === "draft" ? (
                                <button
                                  aria-label={`Retirer`}
                                  className="grid size-8 place-items-center rounded-lg text-[#B42318] hover:bg-[#FFF5F5]"
                                  onClick={() => {
                                    updateRepair(selectedRepair.id, {
                                      repairSaleLines: (selectedRepair.repairSaleLines ?? []).filter(
                                        (entry) => entry.id !== line.id,
                                      ),
                                    });
                                    toast.success("Produit retiré.");
                                  }}
                                  type="button"
                                >
                                  <X className="size-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <p className="px-1 pt-1 text-[#6B6B6B] text-[12px] leading-relaxed">
                    Documents, anti-litige, suivi client et historique complet sont dans le dossier.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-14 text-center">
              <DeviceThumb />
              <p className="text-[#1A1916] text-sm">Sélectionnez une carte ou créez une prise en charge.</p>
              <SecondaryButton className="h-10" onClick={() => openCreate()}>
                Nouvelle prise en charge
              </SecondaryButton>
            </div>
          )}
        </Panel>
      </section>

      {modal && (
        <RepairModal
          key={modal + (prefillFromQuote?.quoteId || selectedRepair?.id || "new")}
          initial={prefillFromQuote || (modal === "edit" ? selectedRepair : undefined)}
          initialStatus={draftStatus}
          onClose={() => {
            setModal(null);
            setPrefillFromQuote(null);
          }}
        />
      )}

      <AlertDialog open={Boolean(repairPendingDelete)} onOpenChange={(open) => !open && setRepairPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la réparation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {repairPendingDelete ? (
                <>
                  La réparation{repairPendingDelete.status === "Prêt" ? " prête" : ""} {repairPendingDelete.number} sera
                  retirée du tableau. Les factures, devis et reçus déjà créés restent conservés.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-[#B42318] text-white hover:bg-[#991B1B]" onClick={confirmDeleteRepair}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PlannedEntriesPanel({
  appointments,
  customers,
  onCreateRepair,
  onMarkArrived,
  onOpenAppointment,
}: Readonly<{
  appointments: Appointment[];
  customers: Customer[];
  onCreateRepair: (appointment: Appointment) => void;
  onMarkArrived: (appointment: Appointment) => void;
  onOpenAppointment: (appointment: Appointment) => void;
}>) {
  return (
    <Panel className="shrink-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#1A1916] text-[15px] tracking-tight md:text-[17px]">Entrées prévues</h2>
          <p className="mt-1 text-[#6B6B6B] text-[12px] md:text-[13px]">
            Rendez-vous confirmés ou en attente, pas encore dans le pipeline atelier.
          </p>
        </div>
        <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 font-semibold text-[#6B6B6B] text-xs">
          {appointments.length}
        </span>
      </div>
      {appointments.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#E8E8E5] bg-[#FAFAFA] px-4 py-5 text-center text-[#6B6B6B] text-sm">
          Aucun rendez-vous à transformer pour le moment.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {appointments.map((appointment) => {
            const customer = customers.find((entry) => entry.id === appointment.customerId);
            const status = normalizeAppointmentStatus(appointment.status, appointment.confirmed);
            const arrived = status === "Arrivé";
            return (
              <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FAFAFA] p-4" key={appointment.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-[#1A1916] text-xs">
                      {appointment.date} · {appointment.time}
                    </p>
                    <p className="mt-1 truncate font-semibold text-[#1A1916] text-sm">
                      {customer?.name || "Client comptoir"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 font-semibold text-[#167B70] text-[11px]">
                    {status}
                  </span>
                </div>
                <p className="mt-3 truncate font-medium text-[#1A1916] text-sm">{appointment.device}</p>
                <p className="mt-1 truncate text-[#6B6B6B] text-[13px]">{appointment.issue}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <SecondaryButton className="h-9 px-2 text-xs" onClick={() => onOpenAppointment(appointment)}>
                    RDV
                  </SecondaryButton>
                  <SecondaryButton
                    className="h-9 px-2 text-xs"
                    disabled={arrived}
                    onClick={() => onMarkArrived(appointment)}
                  >
                    Arrivé
                  </SecondaryButton>
                  <PrimaryButton
                    className="h-9 px-2 text-xs"
                    disabled={!arrived}
                    onClick={() => onCreateRepair(appointment)}
                  >
                    Créer
                  </PrimaryButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function findRepairForAppointment(appointment: Appointment, repairs: { id: string; appointmentId?: string }[]) {
  return (
    repairs.find((repair) => repair.id === appointment.repairId) ??
    repairs.find((repair) => repair.appointmentId === appointment.id)
  );
}

function appointmentSortKey(appointment: Appointment) {
  return `${appointment.date || ""} ${appointment.time || ""}`;
}
