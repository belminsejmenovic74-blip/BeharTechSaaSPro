"use client";

import { useState } from "react";

import { toast } from "sonner";

import type { Invoice, PaymentMethod, SettlementStatus } from "@/lib/behar-store";
import { useBeharStore } from "@/lib/behar-store";

import { ComingSoonModal } from "./coming-soon-integration";

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
  if (!invoice) return null;
  return <ComingSoonModal isOpen={isOpen} name="Paiements externes" onClose={onClose} />;
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
    if (!finalizedInvoice) {
      toast.error("Finalisez d'abord la facture du dossier.");
      return;
    }
    setRepairId(targetRepairId);
    setDraft(defaultSettlementDraft(0));
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);
  const submit = () => {
    // Garde-fou : les anciens appelants ne peuvent plus enregistrer un resultat financier.
    toast.info("Utilisez la demande Stripe ou SumUp.");
    return false;
  };
  const total = invoice ? invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) : 0;

  return { isOpen, draft, setDraft, open, close, submit, total, invoice };
}
