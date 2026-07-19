"use client";

import { useState } from "react";

import type { Invoice, PaymentMethod, SettlementStatus } from "@/lib/behar-store";
import { useBeharStore } from "@/lib/behar-store";

import { ExternalPaymentRequestModal } from "./external-payment-request-modal";

/**
 * Compatibilite temporaire avec les anciens appelants. Les champs financiers
 * ne sont plus affiches ni soumis ; ils seront retires lors de la migration
 * definitive des donnees historiques.
 */
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
  return new Date().toISOString().slice(0, 10);
}

export function defaultSettlementDraft(total: number): SettlementDraft {
  return {
    status: "Non réglé",
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
  isOpen,
  onClose,
  invoice,
}: Readonly<{
  draft: SettlementDraft;
  isOpen: boolean;
  onClose: () => void;
  onDraftChange: (draft: SettlementDraft) => void;
  onSubmit: () => void;
  total: number;
  invoice?: Invoice;
}>) {
  const customer = useBeharStore((state) =>
    invoice ? state.customers.find((entry) => entry.id === invoice.customerId) : undefined,
  );
  if (!invoice) return null;
  return <ExternalPaymentRequestModal customer={customer} invoice={invoice} isOpen={isOpen} onClose={onClose} />;
}

/**
 * Les anciens boutons dossier ouvrent maintenant la demande externe de la
 * facture finalisee rattachee. Aucune ecriture dans payments/invoice.status.
 */
export function useSettlementModal() {
  const store = useBeharStore();
  const [isOpen, setIsOpen] = useState(false);
  const [repairId, setRepairId] = useState("");
  const [draft, setDraft] = useState<SettlementDraft>(defaultSettlementDraft(0));

  const invoice = store.invoices.find(
    (entry) => entry.repairId === repairId && entry.status !== "Brouillon" && entry.status !== "Annulée",
  );

  const open = (targetRepairId: string, _options?: { closeAfterSubmit?: boolean }) => {
    const finalizedInvoice = store.invoices.find(
      (entry) => entry.repairId === targetRepairId && entry.status !== "Brouillon" && entry.status !== "Annulée",
    );
    if (!finalizedInvoice) return;
    setRepairId(targetRepairId);
    setDraft(defaultSettlementDraft(0));
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);
  const submit = () => {
    return false;
  };
  const total = invoice ? invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) : 0;

  return { isOpen, draft, setDraft, open, close, submit, total, invoice };
}
