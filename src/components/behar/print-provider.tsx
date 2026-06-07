"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { type BeharDocument, useBeharStore } from "@/lib/behar-store";
import { generatePdfFromElement } from "@/lib/pdf-generator";

import {
  InternalRepairDocument,
  InvoiceDocument,
  PaymentReceiptDocument,
  QuoteDocument,
  RepairIntakeDocument,
  RepairSummaryDocument,
  SaleReceiptDocument,
} from "./printable-documents";

type DocumentType = "intake" | "quote" | "invoice" | "payment" | "internal" | "summary" | "sale-receipt";

interface DocumentContextType {
  print: (type: DocumentType, id: string) => void;
  download: (type: DocumentType, id: string) => void;
  /** Génère le PDF et l'upload vers Supabase Storage, puis enregistre l'URL sur le document (documentId). Résout true si publié. */
  uploadToCloud: (type: DocumentType, id: string, documentId: string, opts?: { silent?: boolean }) => Promise<boolean>;
}

/** Mappe un document du store vers sa cible imprimable côté CLIENT (jamais la fiche interne). */
function clientDocTarget(doc: BeharDocument): { type: DocumentType; id: string } | null {
  switch (doc.type) {
    case "intake":
      return doc.repairId ? { type: "intake", id: doc.repairId } : null;
    case "summary":
      return doc.repairId ? { type: "summary", id: doc.repairId } : null;
    case "quote":
      return doc.quoteId ? { type: "quote", id: doc.quoteId } : null;
    case "invoice":
    case "sale-invoice":
      return doc.invoiceId ? { type: "invoice", id: doc.invoiceId } : null;
    case "payment":
      return doc.paymentId ? { type: "payment", id: doc.paymentId } : null;
    case "sale-receipt":
      return doc.saleId ? { type: "sale-receipt", id: doc.saleId } : null;
    default:
      return null; // "internal" : jamais publié au client
  }
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
  const [activeDoc, setActiveDoc] = useState<{
    type: DocumentType;
    id: string;
    action: "print" | "download" | "upload";
    /** Document store id cible pour l'action upload (où enregistrer fileUrl). */
    documentId?: string;
    /** Upload en arrière-plan : aucun toast (auto-publication). */
    silent?: boolean;
    /** Identifiant unique de la requête, pour rejeter les callbacks périmés. */
    reqId: number;
  } | null>(null);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  /** Empêche les double-clics : tant qu'un download est en cours, on ignore. */
  const inFlightRef = useRef(false);
  /** Compteur pour générer des IDs de requête uniques. */
  const reqCounterRef = useRef(0);

  const print = useCallback((type: DocumentType, id: string) => {
    setActiveDoc({ type, id, action: "print", reqId: ++reqCounterRef.current });
  }, []);

  const download = useCallback((type: DocumentType, id: string) => {
    if (inFlightRef.current) {
      // Un download est déjà en cours — on ne relance pas.
      toast.info("Un téléchargement est déjà en cours…");
      return;
    }
    setActiveDoc({ type, id, action: "download", reqId: ++reqCounterRef.current });
  }, []);

  const uploadResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const uploadToCloud = useCallback(
    (type: DocumentType, id: string, documentId: string, opts?: { silent?: boolean }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        if (inFlightRef.current) {
          resolve(false);
          return;
        }
        uploadResolveRef.current = resolve;
        setActiveDoc({ type, id, action: "upload", documentId, silent: opts?.silent, reqId: ++reqCounterRef.current });
      });
    },
    [],
  );

  // ── Auto-publication des documents client ────────────────────────────────
  // Dès qu'un dossier a un suivi client actif, ses documents (facture, devis, reçu,
  // rapport, bon de dépôt) sont générés en PDF + uploadés dans Supabase Storage en
  // arrière-plan, pour que le client les télécharge directement (jamais la web app).
  const autoAttemptedRef = useRef<Set<string>>(new Set());
  const autoRunningRef = useRef(false);
  // Signature : un document est « à publier » tant qu'il n'a pas de fileUrl.
  const pendingDocsSignature = store.documents
    .filter((d) => !d.fileUrl && clientDocTarget(d))
    .map((d) => d.id)
    .join(",");
  useEffect(() => {
    if (autoRunningRef.current) return;
    // On publie TOUS les documents client (facture, devis, reçu, rapport, bon de dépôt),
    // pas seulement ceux des dossiers partagés, pour garantir que « tout marche ».
    const pick = () =>
      useBeharStore
        .getState()
        .documents.find((d) => !d.fileUrl && !autoAttemptedRef.current.has(d.id) && clientDocTarget(d));
    if (!pick()) return;
    autoRunningRef.current = true;
    void (async () => {
      let next = pick();
      while (next) {
        autoAttemptedRef.current.add(next.id);
        const target = clientDocTarget(next);
        if (target) {
          // eslint-disable-next-line no-await-in-loop
          await uploadToCloud(target.type, target.id, next.id, { silent: true });
        }
        next = pick();
      }
      autoRunningRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDocsSignature, uploadToCloud]);

  // Refs pour découpler les fonctions de résolution du store : on évite que
  // chaque mutation du store ne ré-exécute l'effet de génération PDF.
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const getFilename = useCallback((type: DocumentType, id: string) => {
    const s = storeRef.current;
    if (type === "intake") {
      const repair = s.repairs.find((repair) => repair.id === id);
      return `bon-prise-en-charge-${repair?.number || id}.pdf`;
    }
    if (type === "quote") {
      const quote = s.quotes.find((quote) => quote.id === id);
      return `devis-${quote?.number || id}.pdf`;
    }
    if (type === "invoice") {
      const invoice = s.invoices.find((invoice) => invoice.id === id);
      return `facture-${invoice?.number || id}.pdf`;
    }
    if (type === "payment") {
      const payment = s.payments.find((payment) => payment.id === id);
      return `recu-paiement-${payment?.paymentNumber || id}.pdf`;
    }
    if (type === "internal") {
      const repair = s.repairs.find((repair) => repair.id === id);
      return `fiche-interne-${repair?.number || id}.pdf`;
    }
    if (type === "summary") {
      const repair = s.repairs.find((repair) => repair.id === id);
      return `rapport-reparation-${repair?.number || id}.pdf`;
    }
    if (type === "sale-receipt") {
      const sale = s.sales.find((sale) => sale.id === id);
      return `recu-vente-${sale?.number || id}.pdf`;
    }
    return `document-${id}.pdf`;
  }, []);

  useEffect(() => {
    if (!activeDoc) return;
    const currentReqId = activeDoc.reqId;

    if (activeDoc.action === "print") {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (error) {
          console.error("Print error:", error);
          toast.error("Erreur d'impression");
        } finally {
          // Toujours libérer, même si window.print échoue
          setTimeout(() => {
            setActiveDoc((current) => (current?.reqId === currentReqId ? null : current));
          }, 1500);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // ── Download / Upload ─────────────────────────────────────────────────
    const silent = activeDoc.action === "upload" && Boolean(activeDoc.silent);
    inFlightRef.current = true;
    const processingToast = silent ? undefined : toast.loading("1/3 : Analyse du document…");
    let settled = false;
    let cancelled = false;

    const finish = (kind: "ok" | "error" | "missing" | "timeout", payload?: string, okLabel?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(safetyTimer);
      clearTimeout(startTimer);
      if (!silent) {
        if (kind === "ok") {
          toast.success(okLabel ?? `3/3 : Téléchargé : ${payload}`, { id: processingToast });
        } else if (kind === "missing") {
          toast.error(payload || "Document introuvable.", { id: processingToast });
        } else if (kind === "timeout") {
          toast.error("Impossible de générer le PDF. Réessayez.", { id: processingToast });
        } else {
          toast.error("Impossible de générer le PDF. Réessayez.", { id: processingToast });
        }
      }
      inFlightRef.current = false;
      // Résout la promesse d'upload (true seulement si succès), pour les batchs séquentiels.
      if (uploadResolveRef.current) {
        uploadResolveRef.current(kind === "ok");
        uploadResolveRef.current = null;
      }
      // Libère le state pour permettre une nouvelle génération
      setActiveDoc((current) => (current?.reqId === currentReqId ? null : current));
    };

    // Safety net : si la génération met plus de 45 sec, on libère tout
    const safetyTimer = setTimeout(() => {
      if (cancelled) return;
      finish("timeout");
    }, 45_000);

    const startTimer = setTimeout(async () => {
      if (cancelled) return;
      try {
        if (!hiddenContainerRef.current) {
          finish("missing", "Conteneur PDF absent.");
          return;
        }

        const docElement = hiddenContainerRef.current.querySelector(
          '[data-pdf-paginate="true"], .print-document',
        ) as HTMLElement | null;
        if (!docElement) {
          finish("missing", "Document lié introuvable.");
          return;
        }

        const filename = getFilename(activeDoc.type, activeDoc.id);

        if (activeDoc.action === "upload") {
          // Génère le PDF en data URL puis l'envoie vers Supabase Storage.
          if (!silent) toast.loading("Préparation du document client…", { id: processingToast });
          const dataUrl = await generatePdfFromElement(docElement, filename, "dataurl");
          if (!dataUrl) {
            if (!cancelled) finish("error");
            return;
          }
          const response = await fetch("/api/repair-documents", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              repairId: activeDoc.id,
              documentId: activeDoc.documentId,
              fileName: filename,
              dataUrl,
            }),
          }).catch(() => null);
          if (!response?.ok) {
            // Échec/non configuré : on ne bloque pas, le document reste consultable en local.
            if (!cancelled) {
              if (!silent) {
                toast.message("Document enregistré en local.", {
                  id: processingToast,
                  description: "Upload cloud indisponible (Supabase Storage non configuré).",
                });
              }
              settled = true;
              inFlightRef.current = false;
              if (uploadResolveRef.current) {
                uploadResolveRef.current(false);
                uploadResolveRef.current = null;
              }
              setActiveDoc((current) => (current?.reqId === currentReqId ? null : current));
            }
            return;
          }
          const json = (await response.json().catch(() => null)) as
            | { url?: string; storagePath?: string }
            | null;
          if (json?.url && activeDoc.documentId) {
            storeRef.current.updateDocument(activeDoc.documentId, {
              fileUrl: json.url,
              storagePath: json.storagePath,
            });
          }
          if (!cancelled) finish("ok", filename, "Document prêt — téléchargeable par le client.");
          return;
        }

        toast.loading("2/3 : Création du PDF…", { id: processingToast });
        await generatePdfFromElement(docElement, filename);
        if (!cancelled) finish("ok", filename);
      } catch (error) {
        console.error("Download error:", error);
        if (!cancelled) finish("error");
      }
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(safetyTimer);
      // Si l'effet est démonté avant la fin (changement d'activeDoc, unmount),
      // on dismiss le toast de chargement pour ne jamais le laisser pendre.
      if (!settled) {
        toast.dismiss(processingToast);
        inFlightRef.current = false;
        if (uploadResolveRef.current) {
          uploadResolveRef.current(false);
          uploadResolveRef.current = null;
        }
      }
    };
    // ⚠️ Volontairement, on ne met PAS getFilename en deps : on a déjà découplé
    // via storeRef pour que les mutations du store ne ré-exécutent pas l'effet
    // pendant qu'un PDF est en cours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc]);

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

    if (type === "summary") {
      const repair = store.repairs.find((repair) => repair.id === id);
      const customer = store.customers.find((customer) => customer.id === repair?.customerId);
      if (!repair || !customer) return null;
      return <RepairSummaryDocument repair={repair} customer={customer} workshop={store.workshopInfo} />;
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
    <DocumentContext.Provider value={{ print, download, uploadToCloud }}>
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
        {(activeDoc?.action === "download" || activeDoc?.action === "upload") && renderDocument()}
      </div>
    </DocumentContext.Provider>
  );
}
