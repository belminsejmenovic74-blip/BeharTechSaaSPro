"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { ArrowLeft, Download, Printer } from "lucide-react";

import { generatePdfFromElement } from "@/lib/pdf-generator";
import { generateQrCodeDataUrl, publicAbsoluteUrl } from "@/lib/public-access";
import { buildCertificateData, type CertificateData, certificatePublicPath } from "@/lib/reconditioning-certificate";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

import { BonSortiePrintable, CertificatePrintable, EtiquetteStockPrintable } from "./reconditioning-documents";

type DocKind = "certificat" | "sortie" | "etiquette";

const DOC_TABS: { key: DocKind; label: string }[] = [
  { key: "certificat", label: "Certificat" },
  { key: "sortie", label: "Bon de sortie" },
  { key: "etiquette", label: "Étiquette stock" },
];

export function ReconditioningPrintPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const initialDoc = (params.get("doc") as DocKind) || "certificat";
  const files = useReconditioningStore((s) => s.files);

  const [mounted, setMounted] = useState(false);
  const [doc, setDoc] = useState<DocKind>(initialDoc);
  const [qr, setQr] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const file = files.find((f) => f.id === id);
  const data: CertificateData | null = useMemo(() => (file ? buildCertificateData(file) : null), [file]);

  useEffect(() => {
    if (!data) return;
    let alive = true;
    const url = publicAbsoluteUrl(certificatePublicPath(data));
    generateQrCodeDataUrl(url)
      .then((value) => alive && setQr(value))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [data]);

  const download = async () => {
    if (!printRef.current || !data) return;
    const name = doc === "certificat" ? "Certificat" : doc === "sortie" ? "Bon-de-sortie" : "Etiquette";
    await generatePdfFromElement(printRef.current, `${name}_${data.ref}.pdf`);
  };

  if (!mounted) return <div className="min-h-svh bg-[#FFFFFF]" />;

  if (!data) {
    return (
      <div className="grid min-h-svh place-items-center bg-[#FFFFFF] px-6 text-center">
        <div>
          <p className="font-semibold text-[#1A1916] text-lg">Dossier introuvable</p>
          <p className="mt-1 text-[#6B6B6B] text-sm">Ouvrez ce document depuis l'étape « Certificat & sortie » d'un dossier de reconditionnement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#FFFFFF] print:bg-white">
      {/* Toolbar (cachée à l'impression) */}
      <div className="sticky top-0 z-10 border-[#E8E8E5] border-b bg-white backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3 font-medium text-[#1A1916] text-sm transition hover:bg-[#FFFFFF]"
            onClick={() => window.close()}
            type="button"
          >
            <ArrowLeft className="size-4" />
            Fermer
          </button>

          <div className="inline-flex h-9 items-center rounded-[10px] border border-[#E8E8E5] bg-white p-1">
            {DOC_TABS.map((tab) => (
              <button
                className={cn(
                  "h-7 rounded-[7px] px-3 font-semibold text-[12px] transition",
                  doc === tab.key ? "bg-[#2A9D8F] text-white" : "text-[#6B6B6B] hover:text-[#1A1916]",
                )}
                key={tab.key}
                onClick={() => setDoc(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3 font-medium text-[#1A1916] text-sm transition hover:bg-[#FFFFFF]"
              onClick={download}
              type="button"
            >
              <Download className="size-4" />
              PDF
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#2A9D8F] px-3.5 font-semibold text-sm text-white transition hover:bg-[#238579]"
              onClick={() => window.print()}
              type="button"
            >
              <Printer className="size-4" />
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Zone document */}
      <div className="mx-auto max-w-[860px] px-4 py-8 print:p-0">
        <div
          className={cn(
            "mx-auto bg-white shadow-[0_1px_3px_rgba(26,25,22,0.06)] print:shadow-none",
            doc === "etiquette" ? "w-fit rounded-[14px]" : "w-full rounded-[16px] border border-[#E8E8E5] print:border-0",
          )}
          ref={printRef}
        >
          {doc === "certificat" && <CertificatePrintable data={data} qr={qr} />}
          {doc === "sortie" && <BonSortiePrintable data={data} qr={qr} />}
          {doc === "etiquette" && (
            <div className="grid place-items-center p-6 print:p-0">
              <EtiquetteStockPrintable data={data} qr={qr} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
