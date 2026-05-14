"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useBeharStore } from "@/lib/behar-store";
import { generatePdfFromElement } from "@/lib/pdf-generator";

import {
  InternalRepairDocument,
  InvoiceDocument,
  PaymentReceiptDocument,
  QuoteDocument,
  RepairIntakeDocument,
  SaleReceiptDocument,
} from "./printable-documents";

type DocumentType = "intake" | "quote" | "invoice" | "payment" | "internal" | "sale-receipt";

interface DocumentContextType {
  print: (type: DocumentType, id: string) => void;
  download: (type: DocumentType, id: string) => void;
}

const DocumentContext = createContext<DocumentContextType | null>(null);

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) throw new Error("useDocument must be used within DocumentProvider");
  return context;
}

// Keeping the old name for backward compatibility if needed, but exporting useDocument
export const usePrint = useDocument;

export function PrintProvider({ children }: { children: ReactNode }) {
  const store = useBeharStore();
  const [activeDoc, setActiveDoc] = useState<{ type: DocumentType; id: string; action: "print" | "download" } | null>(
    null,
  );
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const print = (type: DocumentType, id: string) => {
    setActiveDoc({ type, id, action: "print" });
  };

  const download = (type: DocumentType, id: string) => {
    setActiveDoc({ type, id, action: "download" });
  };

  const getFilename = useCallback(
    (type: DocumentType, id: string) => {
      if (type === "intake") {
        const repair = store.repairs.find((repair) => repair.id === id);
        return `bon-prise-en-charge-${repair?.number || id}.pdf`;
      }
      if (type === "quote") {
        const quote = store.quotes.find((quote) => quote.id === id);
        return `devis-${quote?.number || id}.pdf`;
      }
      if (type === "invoice") {
        const invoice = store.invoices.find((invoice) => invoice.id === id);
        return `facture-${invoice?.number || id}.pdf`;
      }
      if (type === "payment") {
        const payment = store.payments.find((payment) => payment.id === id);
        return `recu-paiement-${payment?.paymentNumber || id}.pdf`;
      }
      if (type === "internal") {
        const repair = store.repairs.find((repair) => repair.id === id);
        return `fiche-interne-${repair?.number || id}.pdf`;
      }
      if (type === "sale-receipt") {
        const sale = store.sales.find((s) => s.id === id);
        return `recu-vente-${sale?.number || id}.pdf`;
      }
      return `document-${id}.pdf`;
    },
    [store.invoices, store.payments, store.quotes, store.repairs, store.sales],
  );

  useEffect(() => {
    if (!activeDoc) return;

    if (activeDoc.action === "print") {
      const timer = setTimeout(() => {
        try {
          window.print();
          setTimeout(() => setActiveDoc(null), 2000);
        } catch (error) {
          console.error("Print error:", error);
          toast.error("Erreur d'impression");
          setActiveDoc(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    if (activeDoc.action === "download") {
      const processingToast = toast.loading("1/3 : Analyse du document...");

      const timer = setTimeout(async () => {
        try {
          if (!hiddenContainerRef.current) throw new Error("Conteneur absent");

          const docElement = hiddenContainerRef.current.querySelector('[data-pdf-paginate="true"], .print-document') as HTMLElement;
          if (!docElement) throw new Error("Contenu introuvable (rendu en cours...)");

          toast.loading("2/3 : Création du PDF...", { id: processingToast });
          const filename = getFilename(activeDoc.type, activeDoc.id);

          await generatePdfFromElement(docElement, filename);
          toast.success(`3/3 : Téléchargé : ${filename}`, { id: processingToast });
        } catch (error) {
          console.error("Download error:", error);
          toast.error(`Erreur : ${error instanceof Error ? error.message : "Échec"}`, { id: processingToast });
        } finally {
          setActiveDoc(null);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [activeDoc, getFilename]);

  const renderDocument = () => {
    if (!activeDoc) return null;

    const { type, id } = activeDoc;

    if (type === "intake") {
      const repair = store.repairs.find((repair) => repair.id === id);
      const customer = store.customers.find((customer) => customer.id === repair?.customerId);
      if (!repair || !customer) return null;
      return <RepairIntakeDocument repair={repair} customer={customer} workshop={store.workshopInfo} />;
    }

    if (type === "quote") {
      const quote = store.quotes.find((quote) => quote.id === id);
      const customer = store.customers.find((customer) => customer.id === quote?.customerId);
      const repair = store.repairs.find((repair) => repair.id === quote?.repairId);
      if (!quote || !customer) return null;
      return <QuoteDocument quote={quote} customer={customer} repair={repair} workshop={store.workshopInfo} />;
    }

    if (type === "invoice") {
      const invoice = store.invoices.find((invoice) => invoice.id === id);
      const customer = store.customers.find((customer) => customer.id === invoice?.customerId);
      const repair = store.repairs.find((repair) => repair.id === invoice?.repairId);
      const quote = store.quotes.find((quote) => quote.id === invoice?.quoteId);
      if (!invoice || !customer) return null;
      return (
        <InvoiceDocument
          customer={customer}
          invoice={invoice}
          quote={quote}
          repair={repair}
          workshop={store.workshopInfo}
        />
      );
    }

    if (type === "payment") {
      const payment = store.payments.find((payment) => payment.id === id);
      const customer = store.customers.find((customer) => customer.id === payment?.customerId);
      const invoice = store.invoices.find((invoice) => invoice.id === payment?.invoiceId);
      const repair = store.repairs.find((repair) => repair.id === (payment?.repairId ?? invoice?.repairId));
      if (!payment || !customer) return null;
      return (
        <PaymentReceiptDocument
          customer={customer}
          invoice={invoice}
          payment={payment}
          repair={repair}
          workshop={store.workshopInfo}
        />
      );
    }

    if (type === "internal") {
      const repair = store.repairs.find((repair) => repair.id === id);
      const customer = store.customers.find((customer) => customer.id === repair?.customerId);
      if (!repair || !customer) return null;
      return <InternalRepairDocument repair={repair} customer={customer} workshop={store.workshopInfo} />;
    }

    if (type === "sale-receipt") {
      const sale = store.sales.find((s) => s.id === id);
      const customer = store.customers.find((c) => c.id === sale?.customerId) || store.customers[0];
      if (!sale) return null;
      return <SaleReceiptDocument sale={sale} customer={customer!} workshop={store.workshopInfo} />;
    }

    return null;
  };

  return (
    <DocumentContext.Provider value={{ print, download }}>
      {children}
      {/* Container for printing - visible only during print media query */}
      <div className="hidden print:block">
        <div className="print-document">{activeDoc?.action === "print" && renderDocument()}</div>
      </div>

      {/* Hidden container for PDF capture - must stay in DOM and be somewhat visible for html2canvas */}
      <div
        ref={hiddenContainerRef}
        style={{
          position: "absolute",
          top: "-5000px",
          left: "0",
          width: "794px",
          opacity: 1,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {activeDoc?.action === "download" && renderDocument()}
      </div>
    </DocumentContext.Provider>
  );
}
