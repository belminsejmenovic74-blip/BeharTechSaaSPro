"use client";

import { useState } from "react";

import { CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

import { formatEuro, type Invoice, type PaymentMethod, type SettlementStatus, useBeharStore } from "@/lib/behar-store";
import { useCapabilities } from "@/lib/use-capabilities";
import { cn } from "@/lib/utils";

import { Modal, PrimaryButton, SecondaryButton } from "./primitives";

const settlementStatuses: Array<{ label: string; value: SettlementStatus }> = [
  { label: "Réglé", value: "Réglé" },
  { label: "Partiellement réglé", value: "Partiellement réglé" },
  { label: "Non réglé", value: "Non réglé" },
  { label: "Offert / Garantie / SAV", value: "Offert / Garantie / SAV" },
];

const settlementMethods: PaymentMethod[] = [
  "Espèces",
  "Carte bancaire",
  "SumUp",
  "Stripe",
  "Virement",
  "Chèque",
  "TWINT",
  "PayPal",
  "TPE externe",
  "Autre",
];

export type SettlementDraft = {
  status: SettlementStatus;
  amount: string;
  date: string;
  method: PaymentMethod;
  customMethod: string;
  externalReference: string;
  note: string;
  confirmExternal: boolean;
};

export function todayInputValue(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function defaultSettlementDraft(total: number): SettlementDraft {
  return {
    status: "Réglé",
    amount: String(total || 0),
    date: todayInputValue(),
    method: "" as PaymentMethod,
    customMethod: "",
    externalReference: "",
    note: "",
    confirmExternal: false,
  };
}

export function SettlementModal({
  draft,
  isOpen,
  onClose,
  onDraftChange,
  onSubmit,
  total,
}: Readonly<{
  draft: SettlementDraft;
  isOpen: boolean;
  onClose: () => void;
  onDraftChange: (draft: SettlementDraft) => void;
  onSubmit: () => void;
  total: number;
  invoice?: Invoice;
}>) {
  const capabilities = useCapabilities();
  const patch = (value: Partial<SettlementDraft>) => onDraftChange({ ...draft, ...value });
  const isPaid = draft.status === "Réglé" || draft.status === "Partiellement réglé";
  const isOffered = draft.status === "Offert / Garantie / SAV";

  if (!capabilities.canCollectPayment) {
    return (
      <Modal isOpen={isOpen} maxWidth="max-w-lg" onClose={onClose} title="Marquer comme restitué">
        <div className="space-y-5">
          <section className="flex items-start gap-3 rounded-[14px] border border-[#D7EFEA] bg-[#F1FAF8] p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-[#2A9D8F]" />
            <div className="text-sm">
              <p className="font-semibold text-[#101828]">Confirmer la restitution au client</p>
              <p className="mt-1 leading-relaxed text-[#667085]">
                Le dossier passera au statut Rendu. Aucun montant, règlement ou chiffre d’affaires ne sera enregistré.
              </p>
            </div>
          </section>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <SecondaryButton className="justify-center" onClick={onClose}>
              Annuler
            </SecondaryButton>
            <PrimaryButton className="justify-center" onClick={onSubmit}>
              Marquer comme restitué
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} maxWidth="max-w-2xl" onClose={onClose} title="Téléphone rendu · indiquer le règlement">
      <div className="space-y-5">
        <section className="rounded-[14px] border border-[#E4E7EC] bg-[#F8FAFC] p-4">
          <p className="text-[#667085] text-xs">Total du dossier</p>
          <p className="mt-1 font-bold text-[#101828] text-2xl">{formatEuro(total)}</p>
          <p className="mt-2 text-[#667085] text-xs leading-relaxed">
            Cette saisie est une déclaration. Le règlement est encaissé hors Behar Tech Pro par l’atelier, son TPE ou
            son prestataire. Behar Tech Pro ne traite pas le paiement.
          </p>
        </section>

        <section>
          <p className="mb-2 font-semibold text-[#101828] text-sm">Situation au moment de la restitution</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {settlementStatuses.map((entry) => (
              <button
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border px-2 text-center font-medium text-sm transition",
                  draft.status === entry.value
                    ? "border-[#2A9D8F] bg-[#E9F4F3] text-[#167B70]"
                    : "border-[#E4E7EC] bg-white text-[#667085]",
                )}
                key={entry.value}
                onClick={() => {
                  const noTurnover = entry.value === "Non réglé" || entry.value === "Offert / Garantie / SAV";
                  patch({
                    status: entry.value,
                    amount: noTurnover ? "0" : entry.value === "Réglé" ? String(total) : draft.amount,
                    method: noTurnover ? ("" as PaymentMethod) : draft.method,
                    confirmExternal: noTurnover ? false : draft.confirmExternal,
                  });
                }}
                type="button"
              >
                {draft.status === entry.value ? <CheckCircle2 className="size-4 shrink-0" /> : null}
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        {isPaid ? (
          <section className="space-y-4 rounded-[14px] border border-[#E4E7EC] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#101828]">Moyen de paiement *</span>
                <select
                  className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => patch({ method: event.target.value as PaymentMethod })}
                  value={draft.method}
                >
                  <option disabled value="">
                    Sélectionner…
                  </option>
                  {settlementMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#101828]">Montant réglé</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  inputMode="decimal"
                  onChange={(event) => patch({ amount: event.target.value })}
                  value={draft.amount}
                />
              </label>
              {draft.method === "Autre" ? (
                <label className="grid gap-1.5 text-sm md:col-span-2">
                  <span className="font-semibold text-[#101828]">Préciser le moyen</span>
                  <input
                    className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                    onChange={(event) => patch({ customMethod: event.target.value })}
                    value={draft.customMethod}
                  />
                </label>
              ) : null}
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#101828]">Date du règlement</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => patch({ date: event.target.value })}
                  type="date"
                  value={draft.date}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#101828]">Référence externe facultative</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => patch({ externalReference: event.target.value })}
                  placeholder="Réf. TPE, SumUp, virement…"
                  value={draft.externalReference}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-[#101828]">Note interne facultative</span>
              <textarea
                className="min-h-[72px] rounded-[12px] border border-[#E4E7EC] bg-white px-3 py-2 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => patch({ note: event.target.value })}
                value={draft.note}
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#D7EFEA] bg-[#F1FAF8] p-4 text-sm">
              <input
                checked={draft.confirmExternal}
                className="mt-0.5 size-4 accent-[#2A9D8F]"
                onChange={(event) => patch({ confirmExternal: event.target.checked })}
                type="checkbox"
              />
              <span className="font-semibold text-[#101828]">
                Je confirme que le règlement a été encaissé hors Behar Tech Pro.
              </span>
            </label>
          </section>
        ) : (
          <section className="flex items-start gap-3 rounded-[14px] border border-[#E4E7EC] bg-[#F8FAFC] p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-[#2A9D8F]" />
            <div className="text-sm">
              <p className="font-semibold text-[#101828]">
                {isOffered ? "Restitution sans chiffre d’affaires" : "Restitution sans règlement"}
              </p>
              <p className="mt-1 text-[#667085]">
                Le téléphone sera marqué rendu, mais aucun montant ne sera ajouté au CA encaissé.
              </p>
            </div>
          </section>
        )}

        <p className="rounded-[12px] border border-[#E4E7EC] bg-white p-3 text-[#667085] text-xs">
          La déclaration alimentera le CA encaissé du tableau de bord. La facture reste le document comptable officiel.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton className="justify-center" onClick={onClose}>
            Annuler
          </SecondaryButton>
          <PrimaryButton className="justify-center" onClick={onSubmit}>
            {isPaid ? "Enregistrer le règlement" : "Marquer le téléphone rendu"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

export function useSettlementModal() {
  const store = useBeharStore();
  const capabilities = useCapabilities();
  const [isOpen, setIsOpen] = useState(false);
  const [repairId, setRepairId] = useState("");
  const [markReturned, setMarkReturned] = useState(true);
  const [draft, setDraft] = useState<SettlementDraft>(defaultSettlementDraft(0));

  const repair = store.repairs.find((entry) => entry.id === repairId);
  const invoice = store.invoices.find(
    (entry) => entry.repairId === repairId && entry.status !== "Brouillon" && entry.status !== "Annulée",
  );
  const invoiceTotal = invoice?.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) ?? 0;
  const total = invoiceTotal || repair?.total || repair?.amount || 0;

  const open = (targetRepairId: string, options?: { closeAfterSubmit?: boolean }) => {
    const target = store.repairs.find((entry) => entry.id === targetRepairId);
    if (!target) {
      toast.error("Dossier introuvable.");
      return;
    }
    const targetInvoice = store.invoices.find(
      (entry) => entry.repairId === targetRepairId && entry.status !== "Brouillon" && entry.status !== "Annulée",
    );
    const targetTotal =
      targetInvoice?.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) ||
      target.total ||
      target.amount ||
      0;
    setRepairId(targetRepairId);
    setMarkReturned(options?.closeAfterSubmit === true);
    setDraft(defaultSettlementDraft(targetTotal));
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);
  const submit = (): boolean => {
    if (!capabilities.canCollectPayment) {
      const saved = store.markRepairReturned(repairId);
      if (!saved) {
        toast.error("Impossible d’enregistrer la restitution.");
        return false;
      }
      setIsOpen(false);
      toast.success("Téléphone marqué comme restitué.");
      return true;
    }
    const isPaid = draft.status === "Réglé" || draft.status === "Partiellement réglé";
    const amount = Number.parseFloat(draft.amount.replace(",", "."));
    if (isPaid && !draft.method) {
      toast.error("Choisissez le moyen de paiement.");
      return false;
    }
    if (isPaid && !draft.confirmExternal) {
      toast.error("Confirmez que le règlement a été encaissé hors Behar Tech Pro.");
      return false;
    }
    if (isPaid && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error("Indiquez un montant réglé valide.");
      return false;
    }
    if (isPaid && !store.invoices.some((entry) => entry.repairId === repairId)) {
      store.createInvoiceFromRepair(repairId);
    }
    const saved = store.recordExternalRepairSettlement(repairId, {
      status: draft.status,
      amount: Number.isFinite(amount) ? amount : 0,
      date: draft.date,
      method: draft.method || undefined,
      customMethod: draft.customMethod,
      externalReference: draft.externalReference,
      note: draft.note,
      confirmExternal: draft.confirmExternal,
      markReturned,
    });
    if (!saved) {
      toast.error("Impossible d’enregistrer la restitution.");
      return false;
    }
    setIsOpen(false);
    toast.success(
      isPaid
        ? "Téléphone rendu — règlement externe ajouté au CA encaissé."
        : "Téléphone marqué comme rendu, sans montant ajouté au CA.",
    );
    return true;
  };

  return { isOpen, draft, setDraft, open, close, submit, total, invoice };
}
