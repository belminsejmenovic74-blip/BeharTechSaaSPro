"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Download, LogOut, Printer } from "lucide-react";
import { toast } from "sonner";

import { generatePdfFromElement } from "@/lib/pdf-generator";
import { useBeharStore } from "@/lib/behar-store";

import {
  getDocumentFileName,
  getDocumentPreviewTitle,
  getDocumentTypeLabel,
  isInternalDocument,
  LocalPrintableDocument,
} from "./local-printable-document";

const COLORS = { bg: "#FFFFFF", text: "#1A1916", sub: "#6B6B6B", accent: "#2A9D8F", border: "#E8E8E5" };

export function LocalDocumentPrintPage({
  documentId,
  publicMode: publicModeProp,
  autoPrint: autoPrintProp,
}: Readonly<{ documentId: string; publicMode?: boolean; autoPrint?: boolean }>) {
  const router = useRouter();
  const store = useBeharStore();
  const hydrated = useBeharStore((state) => state._hasHydrated);

  // En export statique, les query params (`?public=1&print=1`) sont lus côté
  // client. Les props (si fournies) restent prioritaires.
  const [query, setQuery] = useState<{ publicMode: boolean; autoPrint: boolean }>({
    publicMode: publicModeProp ?? false,
    autoPrint: autoPrintProp ?? false,
  });
  useEffect(() => {
    if (publicModeProp !== undefined && autoPrintProp !== undefined) return;
    const params = new URLSearchParams(window.location.search);
    setQuery({
      publicMode: publicModeProp ?? params.get("public") === "1",
      autoPrint: autoPrintProp ?? params.get("print") === "1",
    });
  }, [publicModeProp, autoPrintProp]);
  const publicMode = query.publicMode;
  const autoPrint = query.autoPrint;
  const document = useMemo(
    () => store.documents.find((entry) => entry.id === documentId),
    [documentId, store.documents],
  );
  const documentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const blocked = publicMode && isInternalDocument(document);
  const title = blocked ? "Document privé" : getDocumentPreviewTitle(document);
  const shopName = store.workshopInfo.brand || store.workshopInfo.commercialName || store.workshopInfo.name || "Atelier";

  useEffect(() => {
    if (!hydrated || !autoPrint || blocked || !document) return;
    const timer = window.setTimeout(() => window.print(), 650);
    return () => window.clearTimeout(timer);
  }, [autoPrint, blocked, document, hydrated]);

  const downloadPdf = async () => {
    if (!document) {
      toast.error("Document introuvable");
      return;
    }
    const target = documentRef.current?.querySelector(
      '[data-pdf-paginate="true"], .print-document',
    ) as HTMLElement | null;
    if (!target) {
      toast.error("Aucun aperçu imprimable détecté");
      return;
    }
    setDownloading(true);
    try {
      await generatePdfFromElement(target, getDocumentFileName(document, store));
      toast.success("PDF téléchargé");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de générer le PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center" style={{ background: COLORS.bg, color: COLORS.sub }}>
        Chargement du document...
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      <header className="no-print sticky top-0 z-20 border-b bg-white" style={{ borderColor: COLORS.border }}>
        <div className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-bold tracking-tight">{shopName}</span>
          </div>
          {publicMode ? (
            <span className="rounded-[8px] border bg-white px-3 py-1.5 font-semibold text-[12px]" style={{ borderColor: COLORS.border, color: COLORS.sub }}>
              Document client
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden h-10 items-center gap-2 rounded-[10px] border bg-white px-3 text-[13px] sm:inline-flex" style={{ borderColor: COLORS.border }}>
                <span className="size-2 rounded-full" style={{ background: COLORS.accent }} />
                En ligne
              </span>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border bg-white px-3 font-medium text-[13px]"
                onClick={() => router.back()}
                style={{ borderColor: COLORS.border }}
                type="button"
              >
                <LogOut className="size-4" />
                Quitter
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={`mx-auto grid w-full gap-5 px-5 py-5 ${publicMode ? "max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_190px]" : "max-w-[1240px] lg:grid-cols-[190px_minmax(0,1fr)_190px]"}`}>
        {!publicMode && (
          <aside className="no-print">
            <h1 className="font-bold text-[26px] leading-tight tracking-tight">{title}</h1>
            <button
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-[12px] border bg-white px-4 font-medium text-[14px]"
              onClick={() => router.back()}
              style={{ borderColor: COLORS.border }}
              type="button"
            >
              <ArrowLeft className="size-4" />
              Retour
            </button>
          </aside>
        )}

        <section className="min-w-0">
          {publicMode && (
            <div className="no-print mb-5">
              <h1 className="font-bold text-[26px] leading-tight tracking-tight">{title}</h1>
              <p className="mt-1 text-[14px]" style={{ color: COLORS.sub }}>Document partagé par {shopName}.</p>
            </div>
          )}
          <div className="mx-auto w-full max-w-[850px] rounded-[16px] border bg-white p-4 shadow-[0_1px_3px_rgba(26,25,22,0.04)] print:border-0 print:bg-white print:p-0 print:shadow-none" style={{ borderColor: COLORS.border }}>
            {blocked ? (
              <div className="grid min-h-[520px] place-items-center rounded-[14px] bg-white p-10 text-center">
                <div>
                  <p className="font-bold text-[18px]">Document interne non disponible côté client.</p>
                  <p className="mt-2 text-[14px]" style={{ color: COLORS.sub }}>
                    Les fiches intervention et données internes restent uniquement visibles atelier.
                  </p>
                </div>
              </div>
            ) : (
              <div ref={documentRef}>
                <LocalPrintableDocument document={document} store={store} />
              </div>
            )}
          </div>
        </section>

        <aside className="no-print flex items-start justify-end">
          <div className="grid w-full max-w-[180px] gap-2">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border bg-white px-3 font-semibold text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={blocked || !document}
              onClick={() => window.print()}
              style={{ borderColor: COLORS.accent, color: COLORS.accent }}
              type="button"
            >
              <Printer className="size-4" />
              Imprimer
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border bg-white px-3 font-semibold text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={blocked || !document || downloading}
              onClick={() => void downloadPdf()}
              style={{ borderColor: COLORS.border, color: COLORS.text }}
              type="button"
            >
              <Download className="size-4" />
              {downloading ? "PDF..." : "Télécharger"}
            </button>
            {document ? (
              <p className="mt-2 rounded-[12px] border bg-white p-3 text-[12px] leading-relaxed" style={{ borderColor: COLORS.border, color: COLORS.sub }}>
                {getDocumentTypeLabel(document.type)}
                <br />
                {document.title}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
