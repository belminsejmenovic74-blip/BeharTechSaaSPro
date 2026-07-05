"use client";

import { useState } from "react";

import { CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

import { formatEuro, type PaymentMethod, type SettlementStatus, useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

import { Modal, PrimaryButton, SecondaryButton } from "./primitives";

/* ─── Constants ─── */

const settlementStatuses: { label: string; value: SettlementStatus }[] = [
  { label: "Payé", value: "Réglé" },
  { label: "Partiellement payé", value: "Partiellement réglé" },
  { label: "Non payé", value: "Non réglé" },
  { label: "Offert / Garantie / SAV", value: "Offert / Garantie / SAV" },
];

const settlementMethods: PaymentMethod[] = [
  "Espèces",
  "Carte bancaire",
  "SumUp",
  "Stripe",
  "Virement",
  "Chèque",
  "Autre",
];

/* ─── Types ─── */

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

export function todayInputValue(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/* ─── Settlement Modal ─── */

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
}>) {
  const patch = (partial: Partial<SettlementDraft>) => onDraftChange({ ...draft, ...partial });
  const isPaid = draft.status === "Réglé" || draft.status === "Partiellement réglé";
  const isOffert = draft.status === "Offert / Garantie / SAV";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Indiquer le règlement" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Total dossier */}
        <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-4">
          <p className="text-[#6B6B6B] text-xs">Total dossier</p>
          <p className="mt-1 font-bold text-[#1A1916] text-xl">{formatEuro(total)}</p>
          <p className="mt-2 text-[#6B6B6B] text-xs leading-relaxed">Règlement enregistré manuellement.</p>
        </div>

        {/* Statut du paiement */}
        <div>
          <p className="mb-2 font-semibold text-[#1A1916] text-sm">Statut du paiement</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {settlementStatuses.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => {
                  const isNoPayment = entry.value === "Non réglé" || entry.value === "Offert / Garantie / SAV";
                  patch({
                    status: entry.value,
                    amount: isNoPayment ? "0" : entry.value === "Partiellement réglé" ? draft.amount : String(total),
                    method: isNoPayment ? ("" as PaymentMethod) : draft.method,
                    confirmExternal: isNoPayment ? false : draft.confirmExternal,
                  });
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-[12px] border h-11 px-2 text-sm font-medium transition-colors",
                  draft.status === entry.value
                    ? "border-[#2A9D8F] bg-[#E9F4F3] text-[#167B70]"
                    : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:bg-[#FAFAFA]",
                )}
              >
                {draft.status === entry.value && <CheckCircle2 className="size-4 shrink-0" />}
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        {/* Moyen de paiement — affiché uniquement si Payé ou Partiellement payé */}
        {isPaid && (
          <div className="space-y-4 rounded-[14px] border border-[#E8E8E5] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">
                  Moyen de paiement <span className="text-[#C7493B]">*</span>
                </span>
                <select
                  className={cn(
                    "h-11 rounded-[12px] border bg-white px-3 outline-none focus:border-[#2A9D8F]",
                    !draft.method ? "border-red-300 ring-1 ring-red-100" : "border-[#E8E8E5]",
                  )}
                  onChange={(event) => patch({ method: event.target.value as PaymentMethod })}
                  value={draft.method}
                >
                  <option value="" disabled>
                    Sélectionner...
                  </option>
                  {settlementMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">Montant encaissé</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  inputMode="decimal"
                  onChange={(event) => patch({ amount: event.target.value })}
                  type="text"
                  value={draft.amount}
                />
              </label>
              {draft.method === "Autre" && (
                <label className="grid gap-1.5 text-sm md:col-span-2">
                  <span className="font-semibold text-[#1A1916]">Préciser le moyen de paiement</span>
                  <input
                    className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                    onChange={(event) => patch({ customMethod: event.target.value })}
                    type="text"
                    value={draft.customMethod}
                    placeholder="Ex: Chèque cadeau, Bon d'achat..."
                  />
                </label>
              )}
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">Date du règlement</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => patch({ date: event.target.value })}
                  type="date"
                  value={draft.date}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-[#1A1916]">Référence paiement (facultatif)</span>
                <input
                  className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => patch({ externalReference: event.target.value })}
                  placeholder="ID transaction SumUp, réf. virement, n° chèque..."
                  type="text"
                  value={draft.externalReference}
                />
              </label>
            </div>

            {/* Note interne */}
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-[#1A1916]">Note interne (facultatif)</span>
              <textarea
                className="min-h-[84px] rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => patch({ note: event.target.value })}
                placeholder="Note facultative..."
                value={draft.note}
              />
            </label>

            {/* Confirmation encaissement hors logiciel */}
            <label className="flex items-start gap-3 rounded-[14px] border border-[#E8E8E5] bg-white p-4 text-sm cursor-pointer">
              <input
                checked={draft.confirmExternal}
                className="mt-1 size-4 accent-[#2A9D8F]"
                onChange={(event) => patch({ confirmExternal: event.target.checked })}
                type="checkbox"
              />
              <span className="font-semibold text-[#1A1916]">Je confirme que le paiement a été encaissé.</span>
            </label>
          </div>
        )}

        {/* Offert / Garantie / SAV — info */}
        {isOffert && (
          <div className="rounded-[14px] border border-[#D7EFEA] bg-[#F0FAF8] p-4 text-sm">
            <div className="flex items-start gap-3">
              <Info className="size-5 shrink-0 text-[#2A9D8F]" />
              <div>
                <p className="font-semibold text-[#1A1916]">Dossier clôturé sans encaissement</p>
                <p className="mt-1 text-[#6B6B6B]">
                  Le dossier sera marqué comme traité mais aucun montant ne sera comptabilisé dans le chiffre
                  d'affaires. L'historique indiquera clairement « Offert / Garantie / SAV ».
                </p>
              </div>
            </div>
            {/* Note interne optionnelle pour Offert aussi */}
            <label className="mt-3 grid gap-1.5 text-sm">
              <span className="font-semibold text-[#1A1916]">Note interne (facultatif)</span>
              <textarea
                className="min-h-[64px] rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => patch({ note: event.target.value })}
                placeholder="Raison : garantie constructeur, geste commercial, SAV..."
                value={draft.note}
              />
            </label>
          </div>
        )}

        {/* Non payé — info */}
        {draft.status === "Non réglé" && (
          <div className="rounded-[14px] border border-[#E8E8E5] bg-[#FAFAFA] p-4 text-sm">
            <p className="font-semibold text-[#1A1916]">Aucun encaissement</p>
            <p className="mt-1 text-[#6B6B6B]">
              Le règlement sera indiqué comme manquant. Aucun montant ne sera comptabilisé.
            </p>
            {/* Note interne optionnelle */}
            <label className="mt-3 grid gap-1.5 text-sm">
              <span className="font-semibold text-[#1A1916]">Note interne (facultatif)</span>
              <textarea
                className="min-h-[64px] rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => patch({ note: event.target.value })}
                placeholder="Note facultative..."
                value={draft.note}
              />
            </label>
          </div>
        )}

        <p className="rounded-[12px] border border-[#E8E8E5] bg-[#FFFFFF] p-3 text-[#6B6B6B] text-xs leading-relaxed">
          Ce document ne remplace pas une facture. La facture reste le document comptable officiel.
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton className="justify-center" onClick={onClose}>
            Annuler
          </SecondaryButton>
          <PrimaryButton className="justify-center" onClick={onSubmit}>
            {isOffert
              ? "Clôturer sans encaissement"
              : draft.status === "Non réglé"
                ? "Enregistrer (non réglé)"
                : "Enregistrer le règlement"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Hook ─── */

/**
 * Custom hook that encapsulates the settlement modal state and submit logic.
 * Use this in any workspace to avoid duplicating the modal plumbing.
 */
export function useSettlementModal() {
  const store = useBeharStore();
  const [isOpen, setIsOpen] = useState(false);
  const [repairId, setRepairId] = useState("");
  const [draft, setDraft] = useState<SettlementDraft>(defaultSettlementDraft(0));
  const [closeAfterSubmit, setCloseAfterSubmit] = useState(false);

  const open = (targetRepairId: string, options?: { closeAfterSubmit?: boolean }) => {
    const repair = store.repairs.find((r) => r.id === targetRepairId);
    if (!repair) {
      toast.error("Dossier introuvable.");
      return;
    }
    const shouldCloseAfterSubmit = Boolean(options?.closeAfterSubmit);
    const total = repair.total ?? repair.amount ?? 0;
    if (total <= 0 && !shouldCloseAfterSubmit) {
      toast.error("Ajoutez un tarif au dossier avant d'indiquer le règlement.");
      return;
    }
    const payments = store.payments.filter((p) => p.repairId === targetRepairId && p.status === "Payé");
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    setRepairId(targetRepairId);
    setCloseAfterSubmit(shouldCloseAfterSubmit);
    setDraft({
      status: total <= 0 ? "Non réglé" : paidAmount > 0 && paidAmount < total ? "Partiellement réglé" : "Réglé",
      amount: String(Math.max(total - paidAmount, 0) || total),
      date: todayInputValue(),
      method: "" as PaymentMethod,
      customMethod: "",
      externalReference: "",
      note: "",
      confirmExternal: false,
    });
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setCloseAfterSubmit(false);
  };

  const submit = (): boolean => {
    const amount = Number.parseFloat(draft.amount.replace(",", "."));
    const isOffert = draft.status === "Offert / Garantie / SAV";
    const isPaid = draft.status === "Réglé" || draft.status === "Partiellement réglé";

    if (isPaid && !draft.method) {
      toast.error("Choisissez le moyen de paiement.");
      return false;
    }
    if (isPaid && !draft.confirmExternal) {
      toast.error("Confirmez que le paiement a été encaissé.");
      return false;
    }
    if (isPaid && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error("Indiquez un montant valide.");
      return false;
    }

    // Create invoice if needed (only for Payé / Partiellement payé)
    if (isPaid && !store.invoices.some((inv) => inv.repairId === repairId)) {
      store.createInvoiceFromRepair(repairId);
    }

    const settlementInput = {
      status: draft.status,
      amount: Number.isFinite(amount) ? amount : 0,
      date: draft.date,
      method: draft.method,
      customMethod: draft.customMethod,
      externalReference: draft.externalReference,
      note: draft.note,
      confirmExternal: draft.confirmExternal,
    };
    const ok = closeAfterSubmit
      ? store.closeDossierWithSettlement(repairId, settlementInput)
      : store.recordRepairSettlement(repairId, settlementInput);
    if (!ok) {
      toast.error(closeAfterSubmit ? "Clôture impossible. Vérifiez le règlement." : "Règlement impossible à indiquer.");
      return false;
    }
    const id = typeof ok === "string" ? ok : ok ? repairId : "";
    if (!id && isPaid) {
      toast.error("Règlement impossible à indiquer.");
      return false;
    }
    setIsOpen(false);
    setCloseAfterSubmit(false);
    if (closeAfterSubmit) {
      toast.success("Règlement indiqué et dossier clôturé.");
    } else if (isOffert) {
      toast.success("Dossier clôturé sans encaissement — Offert / Garantie / SAV.");
    } else if (draft.status === "Non réglé") {
      toast.success("Statut mis à jour : non réglé.");
    } else {
      toast.success("Règlement enregistré manuellement.");
    }
    return true;
  };

  const total = (() => {
    const repair = store.repairs.find((r) => r.id === repairId);
    return repair?.total ?? repair?.amount ?? 0;
  })();

  return { isOpen, draft, setDraft, open, close, submit, total };
}
