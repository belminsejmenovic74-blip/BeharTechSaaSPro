"use client";

import { useState } from "react";

import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import * as xlsx from "xlsx";

import {
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
} from "@/components/behar/primitives";
import { useBeharStore } from "@/lib/behar-store";

type ImportRow = {
  reference: string;
  part: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  threshold: number;
  supplier: string;
};

export function StockImportModal() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [ignoredRows, setIgnoredRows] = useState(0);
  const importStockItems = useBeharStore((state) => state.importStockItems);

  if (!open) {
    return (
      <PrimaryButton onClick={() => setOpen(true)}>
        <UploadCloud className="size-4" />
        Importer un fichier
      </PrimaryButton>
    );
  }

  const readFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        toast.error("Fichier vide.");
        return;
      }
      const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed = rawRows.map(parseImportRow);
      const valid = parsed.filter((row): row is ImportRow => row !== null);
      setRows(valid);
      setIgnoredRows(parsed.length - valid.length);
      toast.success(`${valid.length} ligne(s) prêtes à importer.`);
    } catch {
      toast.error("Lecture du fichier impossible.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-0 md:p-4">
      <Panel className="mx-auto my-0 min-h-svh max-w-none rounded-none p-5 md:my-8 md:max-w-6xl md:min-h-0 md:rounded-[20px] md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-2xl text-[#1A1916]">Importer un stock Excel / CSV</h2>
            <p className="mt-2 text-[#6B6B6B] text-sm">
              Chargez votre fichier fournisseur, contrôlez l'aperçu, puis ajoutez les pièces au stock.
            </p>
          </div>
          <button aria-label="Fermer" className="text-[#6B6B6B]" onClick={() => setOpen(false)} type="button">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-[#2A9D8F]/35 border-dashed bg-[#EAF6F2]/60 p-8 text-center">
              <FileSpreadsheet className="mb-4 size-12 text-[#2A9D8F]" />
              <span className="font-semibold text-[#1A1916]">Glisser-déposer un fichier ici</span>
              <span className="mt-2 text-[#6B6B6B] text-sm">
                Colonnes attendues : Référence, Pièce, Catégorie, Prix d’achat, Prix de vente, Stock, Seuil,
                Fournisseur.
              </span>
              <span className="mt-5 inline-flex rounded-xl bg-[#159A8D] px-4 py-2 font-medium text-white">
                Choisir un fichier
              </span>
              <input
                accept=".csv,.xlsx"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file);
                }}
                type="file"
              />
            </label>
          </div>

          <div className="min-w-0">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E8E8E5] bg-white p-4">
                <p className="font-semibold text-2xl text-[#1A1916]">{rows.length}</p>
                <p className="text-[#6B6B6B] text-sm">pièces prêtes</p>
              </div>
              <div className="rounded-2xl border border-[#E8E8E5] bg-white p-4">
                <p className="font-semibold text-2xl text-[#1A1916]">{rows.filter((row) => row.stock > 0).length}</p>
                <p className="text-[#6B6B6B] text-sm">en stock</p>
              </div>
              <div className="rounded-2xl border border-[#E8E8E5] bg-white p-4">
                <p className="font-semibold text-2xl text-[#1A1916]">{ignoredRows}</p>
                <p className="text-[#6B6B6B] text-sm">ligne ignorée</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-black/[0.07] bg-white/76 p-4">
              <h3 className="mb-3 font-semibold text-[#1A1916]">Mapping colonnes Behar Tech</h3>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                {[
                  "Référence → reference",
                  "Pièce → part",
                  "Catégorie → category",
                  "Prix d’achat → purchasePrice",
                  "Prix de vente → salePrice",
                  "Stock → stock",
                  "Seuil → threshold",
                  "Fournisseur → supplier",
                ].map((item) => (
                  <span className="rounded-xl bg-[#FAFAFA] px-3 py-2" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-black/[0.07]">
              <table className={`${tableClassName} min-w-[900px]`}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className="px-4 py-4">Référence</th>
                    <th className="px-4 py-4">Pièce</th>
                    <th className="px-4 py-4">Prix achat</th>
                    <th className="px-4 py-4">Prix vente</th>
                    <th className="px-4 py-4">Stock</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.reference}>
                      <td className={tableCellClassName}>{row.reference}</td>
                      <td className={tableCellClassName}>{row.part}</td>
                      <td className={tableCellClassName}>{formatImportEuro(row.purchasePrice)}</td>
                      <td className={tableCellClassName}>{formatImportEuro(row.salePrice)}</td>
                      <td className={tableCellClassName}>{row.stock}</td>
                      <td className={tableCellClassName}>
                        <StatusBadge status={row.stock > 0 ? "En stock" : "En attente"} />
                        <span className="ml-2">{row.stock > 0 ? "Importer" : "À vérifier"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="p-5 text-[#6B6B6B] text-sm">Chargez un fichier pour afficher l'aperçu.</p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <SecondaryButton onClick={() => setOpen(false)}>Annuler</SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  if (!rows.length) {
                    toast.error("Aucune ligne à importer.");
                    return;
                  }
                  importStockItems(
                    rows.map((row) => ({
                      reference: row.reference,
                      part: row.part,
                      category: row.category,
                      purchasePrice: row.purchasePrice,
                      salePrice: row.salePrice,
                      stock: row.stock,
                      threshold: row.threshold,
                      supplier: row.supplier,
                    })),
                  );
                  toast.success("Stock importé.");
                  setOpen(false);
                }}
              >
                Valider l’import
              </PrimaryButton>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function readCell(row: Record<string, unknown>, names: string[]) {
  const entries = Object.entries(row);
  for (const name of names.map(normalizeHeader)) {
    const found = entries.find(([key]) => normalizeHeader(key) === name);
    if (found) return String(found[1] ?? "").trim();
  }
  return "";
}

function parseImportNumber(value: string) {
  const normalized = value.replace(/\s/g, "").replace("€", "").replace(",", ".").trim();
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseImportRow(row: Record<string, unknown>): ImportRow | null {
  const reference = readCell(row, ["Référence", "Reference", "SKU", "Ref"]);
  const part = readCell(row, ["Pièce", "Piece", "Part", "Nom", "Name"]);
  if (!reference || !part) return null;
  return {
    reference,
    part,
    category: readCell(row, ["Catégorie", "Categorie", "Category"]) || "Pièces",
    purchasePrice: parseImportNumber(readCell(row, ["Prix d'achat", "Prix achat", "Purchase price", "Cost"])),
    salePrice: parseImportNumber(readCell(row, ["Prix de vente", "Prix vente", "Sale price", "Price"])),
    stock: Math.max(0, Math.round(parseImportNumber(readCell(row, ["Stock", "Quantité", "Quantite", "Qty"])))),
    threshold: Math.max(0, Math.round(parseImportNumber(readCell(row, ["Seuil", "Threshold", "Alerte"])) || 1)),
    supplier: readCell(row, ["Fournisseur", "Supplier"]) || "Non renseigné",
  };
}

function formatImportEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}
