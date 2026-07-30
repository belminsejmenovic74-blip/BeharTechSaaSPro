"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  type BeharDocument,
  getBillingWorkshopInfo,
  isWorkshopBillingProfileComplete,
  useBeharStore,
  type WorkshopCountry,
} from "@/lib/behar-store";
import { withBillingRegistration } from "@/lib/capabilities";
import { generatePdfFromElement } from "@/lib/pdf-generator";
import { getCapabilitiesSnapshot, useCapabilities } from "@/lib/use-capabilities";
import { getDocumentFilename } from "@/lib/workshop-country";
import { downloadPdfFile } from "@/lib/download-file.client";
import { downloadDocumentPdf, printDocument, printDocumentPdf } from "@/lib/documents/document-actions";
import { Modal, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import {
  RepairIntakeDocument,
  QuoteDocument,
  InvoiceDocument,
  PaymentReceiptDocument,
  InternalRepairDocument,
  RepairSummaryDocument,
  SaleReceiptDocument,
  DiagnosticReportDocument,
} from "./printable-documents";

type DocumentType =
  | "intake"
  | "quote"
  | "invoice"
  | "payment"
  | "internal"
  | "summary"
  | "sale-receipt"
  | "diagnostic_report";

interface DocumentContextType {
  print: (type: DocumentType, id: string) => void;
  download: (type: DocumentType, id: string) => void;
  preview: (type: DocumentType, id: string) => void;
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
    case "diagnostic_report":
      return doc.repairId ? { type: "diagnostic_report", id: doc.repairId } : null;
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

function documentForTarget(documents: BeharDocument[], type: DocumentType, id: string): BeharDocument | undefined {
  return documents.find((doc) => {
    if (type === "intake") return doc.type === "intake" && doc.repairId === id;
    if (type === "summary") return doc.type === "summary" && doc.repairId === id;
    if (type === "diagnostic_report") return doc.type === "diagnostic_report" && doc.repairId === id;
    if (type === "internal") return doc.type === "internal" && doc.repairId === id;
    if (type === "quote") return doc.type === "quote" && doc.quoteId === id;
    if (type === "invoice") return (doc.type === "invoice" || doc.type === "sale-invoice") && doc.invoiceId === id;
    if (type === "payment") return doc.type === "payment" && doc.paymentId === id;
    if (type === "sale-receipt")
      return (doc.type === "sale-receipt" || doc.type === "sale-invoice") && doc.saleId === id;
    return false;
  });
}

const DocumentContext = createContext<DocumentContextType | null>(null);

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) throw new Error("useDocument must be used within DocumentProvider");
  return context;
}

export const usePrint = useDocument;

export function PrintProvider({ children }: { children: ReactNode }) {
  const store = useBeharStore();
  const capabilities = useCapabilities();
  const [activeDoc, setActiveDoc] = useState<{
    type: DocumentType;
    id: string;
    action: "print" | "download" | "upload" | "preview";
    /** Document store id cible pour l'action upload (où enregistrer fileUrl). */
    documentId?: string;
    /** Upload en arrière-plan : aucun toast (auto-publication). */
    silent?: boolean;
    /** Identifiant unique de la requête, pour rejeter les callbacks périmés. */
    reqId: number;
  } | null>(null);

  const [warningModal, setWarningModal] = useState<{
    type: DocumentType;
    id: string;
    action: "download" | "upload";
    documentId?: string;
    resolve?: (ok: boolean) => void;
  } | null>(null);

  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  /** Empêche les double-clics : tant qu'un download est en cours, on ignore. */
  const inFlightRef = useRef(false);
  /** Compteur pour générer des IDs de requête uniques. */
  const reqCounterRef = useRef(0);
  const pendingPreviewsRef = useRef<Map<number, Window | null>>(new Map());

  const getMissingIndispensableFields = useCallback((type: DocumentType, id: string): string[] => {
    const state = useBeharStore.getState();
    const missing: string[] = [];

    // 1. Nom de l'atelier
    if (!state.workshopInfo.name?.trim()) {
      missing.push("Nom de l'atelier");
    }
    // 2. Adresse minimale
    if (!state.workshopInfo.address?.trim()) {
      missing.push("Adresse de l'atelier");
    }

    let docLines: any[] = [];
    let docNumberValue = "";
    let docCurrency = "";
    let hasCustomer = false;
    let totalCalculable = false;

    if (type === "quote") {
      const quote = state.quotes.find((q) => q.id === id);
      if (quote) {
        docLines = quote.lines || [];
        docNumberValue = quote.number || "";
        docCurrency = quote.currency || "";
        hasCustomer = Boolean(quote.customerId || quote.clientSnapshot?.name);
        const total = quote.totalTtc ?? quote.totalAmount ?? 0;
        totalCalculable = Number.isFinite(total);
      } else {
        missing.push("Devis introuvable");
      }
    } else if (type === "invoice") {
      const invoice = state.invoices.find((inv) => inv.id === id);
      if (invoice) {
        docLines = invoice.lines || [];
        docNumberValue = invoice.number || "";
        docCurrency = invoice.currency || "";
        hasCustomer = Boolean(invoice.customerId);
        const total = invoice.lines?.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0) ?? 0;
        totalCalculable = Number.isFinite(total);
      } else {
        missing.push("Facture introuvable");
      }
    } else if (type === "payment") {
      const payment = state.payments.find((p) => p.id === id);
      if (payment) {
        docNumberValue = payment.paymentNumber || "";
        docCurrency = payment.currency || "";
        hasCustomer = Boolean(payment.customerId);
        totalCalculable = Number.isFinite(payment.amount);
        docLines = [1];
      } else {
        missing.push("Paiement introuvable");
      }
    } else if (type === "sale-receipt") {
      const sale = state.sales.find((s) => s.id === id);
      if (sale) {
        docLines = sale.lines || [];
        docNumberValue = sale.number || "";
        docCurrency = sale.currency || "";
        hasCustomer = Boolean(sale.customerId);
        totalCalculable = Number.isFinite(sale.total);
      } else {
        missing.push("Vente introuvable");
      }
    } else if (type === "intake" || type === "internal" || type === "summary" || type === "diagnostic_report") {
      const repair = state.repairs.find((r) => r.id === id);
      if (repair) {
        docNumberValue = repair.number || "";
        docCurrency = repair.currency || "";
        hasCustomer = Boolean(repair.customerId);
        totalCalculable = Number.isFinite(repair.total ?? repair.amount);
        docLines = [1];
      } else {
        missing.push("Réparation introuvable");
      }
    }

    if (!docNumberValue?.trim()) {
      missing.push("Numéro de document");
    }

    // Fallback to workshop currency if document currency is not set
    const finalCurrency = docCurrency?.trim() || state.workshopInfo?.currency || "EUR";
    if (!finalCurrency) {
      missing.push("Devise du document");
    }
    if (!hasCustomer) {
      missing.push("Client");
    }
    if (docLines.length === 0) {
      missing.push("Au moins une ligne de document");
    }
    if (!totalCalculable) {
      missing.push("Total calculable");
    }

    return missing;
  }, []);

  const print = useCallback((type: DocumentType, id: string) => {
    if (["quote", "invoice", "payment", "sale-receipt"].includes(type) && !getCapabilitiesSnapshot().canInvoice) {
      return;
    }
    const document = documentForTarget(useBeharStore.getState().documents, type, id);
    if (document?.fileUrl && printDocumentPdf(document)) return;
    if (document && printDocument(document)) return;
    setActiveDoc({ type, id, action: "print", reqId: ++reqCounterRef.current });
  }, []);

  const preview = useCallback((type: DocumentType, id: string) => {
    if (["quote", "invoice", "payment", "sale-receipt"].includes(type) && !getCapabilitiesSnapshot().canInvoice) {
      return;
    }
    const newWin = window.open("", "_blank");
    if (newWin) {
      newWin.document.title = "Génération du PDF...";
      newWin.document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background-color: #FFFFFF; color: #101828; margin: 0;">
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Génération de l'aperçu PDF...</div>
          <div style="font-size: 14px; color: #667085;">Veuillez patienter quelques instants.</div>
        </div>
      `;
    }
    const reqId = ++reqCounterRef.current;
    pendingPreviewsRef.current.set(reqId, newWin);
    setActiveDoc({ type, id, action: "preview", reqId });
  }, []);

  const download = useCallback(
    (type: DocumentType, id: string) => {
      if (["quote", "invoice", "payment", "sale-receipt"].includes(type) && !getCapabilitiesSnapshot().canInvoice) {
        return;
      }
      if (inFlightRef.current) {
        toast.info("Un téléchargement est déjà en cours…");
        return;
      }

      const publishedDocument = documentForTarget(useBeharStore.getState().documents, type, id);
      if (publishedDocument?.fileUrl) {
        downloadDocumentPdf(publishedDocument);
        return;
      }

      const missingFields = getMissingIndispensableFields(type, id);
      if (missingFields.length > 0) {
        toast.error(
          `Impossible de générer le document. Les informations indispensables suivantes sont manquantes : ${missingFields.join(", ")}`,
        );
        return;
      }

      const state = useBeharStore.getState();
      const billingCountry =
        type === "quote"
          ? state.quotes.find((quote) => quote.id === id)?.billingCountry
          : type === "invoice"
            ? state.invoices.find((invoice) => invoice.id === id)?.billingCountry
            : undefined;

      const isComplete = billingCountry ? isWorkshopBillingProfileComplete(state.workshopInfo, billingCountry) : true;

      if (!isComplete) {
        setWarningModal({
          type,
          id,
          action: "download",
        });
        return;
      }

      setActiveDoc({ type, id, action: "download", reqId: ++reqCounterRef.current });
    },
    [getMissingIndispensableFields],
  );

  const uploadResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const uploadToCloud = useCallback(
    (type: DocumentType, id: string, documentId: string, opts?: { silent?: boolean }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        if (["quote", "invoice", "payment", "sale-receipt"].includes(type) && !getCapabilitiesSnapshot().canInvoice) {
          resolve(false);
          return;
        }
        if (inFlightRef.current) {
          resolve(false);
          return;
        }

        const missingFields = getMissingIndispensableFields(type, id);
        if (missingFields.length > 0) {
          if (!opts?.silent) {
            toast.error(
              `Impossible de générer le document. Les informations indispensables suivantes sont manquantes : ${missingFields.join(", ")}`,
            );
          }
          resolve(false);
          return;
        }

        const state = useBeharStore.getState();
        const billingCountry =
          type === "quote"
            ? state.quotes.find((quote) => quote.id === id)?.billingCountry
            : type === "invoice"
              ? state.invoices.find((invoice) => invoice.id === id)?.billingCountry
              : undefined;

        const isComplete = billingCountry ? isWorkshopBillingProfileComplete(state.workshopInfo, billingCountry) : true;

        if (!isComplete && !opts?.silent) {
          setWarningModal({
            type,
            id,
            action: "upload",
            documentId,
            resolve,
          });
          return;
        }

        uploadResolveRef.current = resolve;
        setActiveDoc({ type, id, action: "upload", documentId, silent: opts?.silent, reqId: ++reqCounterRef.current });
      });
    },
    [getMissingIndispensableFields],
  );

  // ── Auto-publication des documents client ────────────────────────────────
  const autoAttemptedRef = useRef<Set<string>>(new Set());
  const autoRunningRef = useRef(false);
  const pendingDocsSignature = store.documents
    .filter(
      (d) =>
        !d.fileUrl &&
        clientDocTarget(d) &&
        (capabilities.canInvoice || !["quote", "invoice", "payment", "sale-receipt", "sale-invoice"].includes(d.type)),
    )
    .map((d) => d.id)
    .join(",");
  useEffect(() => {
    if (autoRunningRef.current) return;
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

  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const getFilename = useCallback((type: DocumentType, id: string) => {
    const s = storeRef.current;
    if (type === "intake") {
      const repair = s.repairs.find((repair) => repair.id === id);
      return getDocumentFilename(type, repair?.number || id);
    }
    if (type === "quote") {
      const quote = s.quotes.find((quote) => quote.id === id);
      return getDocumentFilename(type, quote?.number || id);
    }
    if (type === "invoice") {
      const invoice = s.invoices.find((invoice) => invoice.id === id);
      return getDocumentFilename(type, invoice?.number || id);
    }
    if (type === "payment") {
      const payment = s.payments.find((payment) => payment.id === id);
      const invoice = s.invoices.find((invoice) => invoice.id === payment?.invoiceId);
      return getDocumentFilename(type, invoice?.number || payment?.paymentNumber || id);
    }
    if (type === "internal") {
      const repair = s.repairs.find((repair) => repair.id === id);
      return getDocumentFilename(type, repair?.number || id);
    }
    if (type === "summary" || type === "diagnostic_report") {
      const repair = s.repairs.find((repair) => repair.id === id);
      return getDocumentFilename(type, repair?.number || id);
    }
    if (type === "sale-receipt") {
      const sale = s.sales.find((sale) => sale.id === id);
      return getDocumentFilename(type, sale?.number || id);
    }
    return `document-${id}.pdf`;
  }, []);

  useEffect(() => {
    if (!activeDoc) return;
    const currentReqId = activeDoc.reqId;

    if (activeDoc.action === "print") {
      inFlightRef.current = true;
      const processingToast = toast.loading("Préparation du PDF à imprimer…");
      let settled = false;
      let cancelled = false;

      const finish = (kind: "ok" | "error" | "missing" | "timeout", payload?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        clearTimeout(startTimer);
        inFlightRef.current = false;
        if (kind === "ok") {
          toast.success("Document prêt pour impression.", { id: processingToast });
        } else if (kind === "missing") {
          toast.error(payload || "Document lié introuvable.", { id: processingToast });
        } else if (kind === "timeout") {
          toast.error("Impossible de préparer l'impression. Réessayez.", { id: processingToast });
        } else {
          toast.error("Erreur d'impression PDF.", { id: processingToast });
        }
        setActiveDoc((current) => (current?.reqId === currentReqId ? null : current));
      };

      const safetyTimer = setTimeout(() => {
        if (!cancelled) finish("timeout");
      }, 45_000);

      const startTimer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const docElement = hiddenContainerRef.current?.querySelector(
            '[data-pdf-paginate="true"], .print-document',
          ) as HTMLElement | null;
          if (!docElement) {
            finish("missing", "Aucun document imprimable détecté.");
            return;
          }

          const filename = getFilename(activeDoc.type, activeDoc.id);
          const blob = await generatePdfFromElement(docElement, filename, "blob");
          if (cancelled || !blob) return;
          const blobUrl = URL.createObjectURL(blob);
          const printWindow = window.open(blobUrl, "_blank", "popup=yes,width=920,height=1200,noopener,noreferrer");
          if (printWindow) {
            window.setTimeout(() => {
              try {
                printWindow.focus();
                printWindow.print();
              } catch {
                // Le lecteur PDF du navigateur peut ignorer l'impression automatique.
              }
            }, 900);
          } else {
            downloadPdfFile(blob, filename);
          }
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 90_000);
          finish("ok");
        } catch (error) {
          console.error("Print error:", error);
          if (!cancelled) finish("error");
        }
      }, 900);

      return () => {
        cancelled = true;
        clearTimeout(startTimer);
        clearTimeout(safetyTimer);
        if (!settled) {
          toast.dismiss(processingToast);
          inFlightRef.current = false;
        }
      };
    }

    if (activeDoc.action === "preview") {
      const newWin = pendingPreviewsRef.current.get(currentReqId) ?? null;
      inFlightRef.current = true;
      const processingToast = toast.loading("Génération du document pour l'aperçu…");
      let settled = false;
      let cancelled = false;

      const finish = (kind: "ok" | "error" | "missing" | "timeout", payload?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        clearTimeout(startTimer);

        toast.dismiss(processingToast);
        inFlightRef.current = false;

        if (kind !== "ok" && newWin) {
          newWin.document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background-color: #FFFFFF; color: #101828; margin: 0; padding: 20px; text-align: center;">
              <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #D9383A;">Erreur de génération</div>
              <div style="font-size: 14px; color: #667085; margin-bottom: 16px;">${payload || "Impossible de prévisualiser ce document."}</div>
              <button onclick="window.close()" style="height: 36px; padding: 0 16px; border: none; border-radius: 8px; background-color: #101828; color: white; font-weight: 600; cursor: pointer; border: 1px solid #101828;">Fermer l'onglet</button>
            </div>
          `;
        }

        pendingPreviewsRef.current.delete(currentReqId);
        setActiveDoc((current) => (current?.reqId === currentReqId ? null : current));
      };

      const safetyTimer = setTimeout(() => {
        if (cancelled) return;
        finish("timeout", "La génération du PDF a expiré.");
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

          const blob = await generatePdfFromElement(docElement, filename, "blob");

          if (!cancelled && blob) {
            const blobUrl = URL.createObjectURL(blob);
            if (newWin) {
              newWin.location.href = blobUrl;
            }
            toast.success("Aperçu généré !");
            finish("ok");
          } else {
            finish("error", "Aucun PDF généré.");
          }
        } catch (error) {
          console.error("Preview error:", error);
          if (!cancelled) finish("error");
        }
      }, 1200);

      return () => {
        cancelled = true;
        clearTimeout(startTimer);
        clearTimeout(safetyTimer);
        if (!settled) {
          toast.dismiss(processingToast);
          inFlightRef.current = false;
          const currentWin = pendingPreviewsRef.current.get(currentReqId);
          if (currentWin) currentWin.close();
          pendingPreviewsRef.current.delete(currentReqId);
        }
      };
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
      if (uploadResolveRef.current) {
        uploadResolveRef.current(kind === "ok");
        uploadResolveRef.current = null;
      }
      setActiveDoc((current) => (current?.reqId === currentReqId ? null : current));
    };

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
          const json = (await response.json().catch(() => null)) as { url?: string; storagePath?: string } | null;
          if (json?.url && activeDoc.documentId) {
            storeRef.current.updateDocument(activeDoc.documentId, {
              fileUrl: json.url,
              storagePath: json.storagePath,
            });
          }
          if (!cancelled) finish("ok", filename, "Document prêt — téléchargeable par le client.");
          return;
        }

        if (!silent) toast.loading("2/3 : Création du PDF…", { id: processingToast });
        const blob = await generatePdfFromElement(docElement, filename, "blob");
        if (!cancelled && blob) {
          if (activeDoc.action === "download") {
            downloadPdfFile(blob, filename);
            if (!silent) toast.success("Document téléchargé !", { id: processingToast });
            finish("ok");
            return;
          }

          downloadPdfFile(blob, filename);
          const blobUrl = URL.createObjectURL(blob);
          const newWin = window.open(blobUrl, "_blank");
          if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
            if (!silent) {
              toast.success("Document généré ! Cliquez ici si le fichier ne s'est pas ouvert :", {
                id: processingToast,
                action: {
                  label: "Ouvrir",
                  onClick: () => {
                    window.open(blobUrl, "_blank");
                  },
                },
                duration: 15000,
              });
            }
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
          } else {
            if (!silent) {
              toast.success("Document téléchargé et ouvert dans un nouvel onglet.", { id: processingToast });
            }
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);
          }
          finish("ok", filename);
        } else {
          finish("error", "Aucun PDF généré.");
        }
      } catch (error) {
        console.error("Download error:", error);
        if (!cancelled) finish("error");
      }
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(safetyTimer);
      if (!settled) {
        toast.dismiss(processingToast);
        inFlightRef.current = false;
        if (uploadResolveRef.current) {
          uploadResolveRef.current(false);
          uploadResolveRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc]);

  const renderDocument = () => {
    if (!activeDoc) return null;

    const { type, id } = activeDoc;
    const workshopFor = (country: Parameters<typeof getBillingWorkshopInfo>[1]) => {
      const workshop = getBillingWorkshopInfo(store.workshopInfo, country);
      return withBillingRegistration(workshop, capabilities.registrationNumber);
    };

    if (type === "intake") {
      const repair = store.repairs.find((repair) => repair.id === id);
      const customer = store.customers.find((customer) => customer.id === repair?.customerId);
      if (!repair || !customer) return null;
      return (
        <RepairIntakeDocument
          repair={repair}
          customer={customer}
          workshop={workshopFor(repair.billingCountry)}
          showClientAmount={capabilities.canInvoice}
        />
      );
    }

    if (type === "quote") {
      const quote = store.quotes.find((quote) => quote.id === id);
      const customer = store.customers.find((customer) => customer.id === quote?.customerId);
      const repair = store.repairs.find((repair) => repair.id === quote?.repairId);
      if (!quote || !customer) return null;
      return (
        <QuoteDocument quote={quote} customer={customer} repair={repair} workshop={workshopFor(quote.billingCountry)} />
      );
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
          workshop={workshopFor(invoice.billingCountry)}
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
          workshop={workshopFor(payment.billingCountry)}
        />
      );
    }

    if (type === "internal") {
      const repair = store.repairs.find((repair) => repair.id === id);
      const customer = store.customers.find((customer) => customer.id === repair?.customerId);
      if (!repair || !customer) return null;
      return (
        <InternalRepairDocument repair={repair} customer={customer} workshop={workshopFor(repair.billingCountry)} />
      );
    }

    if (type === "summary") {
      const repair = store.repairs.find((repair) => repair.id === id);
      const customer = store.customers.find((customer) => customer.id === repair?.customerId);
      if (!repair || !customer) return null;
      return (
        <RepairSummaryDocument
          repair={repair}
          customer={customer}
          workshop={workshopFor(repair.billingCountry)}
          showClientAmount={capabilities.canInvoice}
        />
      );
    }

    if (type === "diagnostic_report") {
      const repair = store.repairs.find((repair) => repair.id === id);
      const customer = store.customers.find((customer) => customer.id === repair?.customerId);
      if (!repair || !customer) return null;
      return (
        <DiagnosticReportDocument repair={repair} customer={customer} workshop={workshopFor(repair.billingCountry)} />
      );
    }

    if (type === "sale-receipt") {
      const sale = store.sales.find((s) => s.id === id);
      const customer = store.customers.find((c) => c.id === sale?.customerId) || store.customers[0];
      if (!sale) return null;
      return <SaleReceiptDocument sale={sale} customer={customer!} workshop={workshopFor(sale.billingCountry)} />;
    }

    return null;
  };

  return (
    <DocumentContext.Provider value={{ print, download, preview, uploadToCloud }}>
      {children}
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
        {(activeDoc?.action === "download" ||
          activeDoc?.action === "upload" ||
          activeDoc?.action === "preview" ||
          activeDoc?.action === "print") &&
          renderDocument()}
      </div>

      <Modal
        isOpen={warningModal !== null}
        onClose={() => {
          if (warningModal?.resolve) warningModal.resolve(false);
          setWarningModal(null);
        }}
        title="Paramètres légaux incomplets"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#667085] leading-relaxed">
            Certaines informations légales sont incomplètes. Le document peut être généré, mais vérifiez vos paramètres
            avec votre comptable.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <PrimaryButton
              className="w-full justify-center text-center"
              onClick={() => {
                if (warningModal) {
                  const { type, id, action, documentId, resolve } = warningModal;
                  if (action === "download") {
                    setActiveDoc({ type, id, action: "download", reqId: ++reqCounterRef.current });
                  } else if (action === "upload") {
                    uploadResolveRef.current = resolve ?? null;
                    setActiveDoc({ type, id, action: "upload", documentId, reqId: ++reqCounterRef.current });
                  }
                }
                setWarningModal(null);
              }}
            >
              Télécharger quand même
            </PrimaryButton>
            <SecondaryButton
              className="w-full justify-center text-center"
              onClick={() => {
                if (warningModal?.resolve) warningModal.resolve(false);
                setWarningModal(null);
                window.location.href = "/dashboard/parametres";
              }}
            >
              Compléter les paramètres
            </SecondaryButton>
          </div>
        </div>
      </Modal>
    </DocumentContext.Provider>
  );
}
