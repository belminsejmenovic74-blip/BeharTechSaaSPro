"use client";

import { useState } from "react";

import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

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
import { demoImportRows } from "@/mock/demo";

export function StockImportModal() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const importStockItems = useBeharStore((state) => state.importStockItems);

  if (!open) {
    return (
      <PrimaryButton onClick={() => setOpen(true)}>
        <UploadCloud className="size-4" />
        Importer un fichier
      </PrimaryButton>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-4 backdrop-blur-sm">
      <Panel className="mx-auto my-8 max-w-6xl p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-2xl text-[#1A1916]">Importer un stock Excel / CSV</h2>
            <p className="mt-2 text-[#6B6B6B] text-sm">
              Démo mockée prête pour CSV/XLSX : aperçu, mapping colonnes, doublons et actions par ligne.
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
              <input accept=".csv,.xlsx" className="sr-only" onChange={() => setLoaded(true)} type="file" />
            </label>
            <SecondaryButton className="w-full" onClick={() => setLoaded(true)}>
              Charger l’exemple IP13-SCR
            </SecondaryButton>
          </div>

          <div className="min-w-0">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-[#EAF6F2] p-4">
                <p className="font-semibold text-2xl text-[#1A1916]">{loaded ? 2 : 0}</p>
                <p className="text-[#6B6B6B] text-sm">pièces ajoutées</p>
              </div>
              <div className="rounded-2xl bg-[#F6F7F4] p-4">
                <p className="font-semibold text-2xl text-[#1A1916]">{loaded ? 1 : 0}</p>
                <p className="text-[#6B6B6B] text-sm">pièce mise à jour</p>
              </div>
              <div className="rounded-2xl bg-[#FFF7E8] p-4">
                <p className="font-semibold text-2xl text-[#1A1916]">{loaded ? 1 : 0}</p>
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
                  <span className="rounded-xl bg-[#FAFAF8] px-3 py-2" key={item}>
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
                  {(loaded ? demoImportRows : []).map((row) => (
                    <tr key={row.reference}>
                      <td className={tableCellClassName}>{row.reference}</td>
                      <td className={tableCellClassName}>{row.part}</td>
                      <td className={tableCellClassName}>{row.purchasePrice}</td>
                      <td className={tableCellClassName}>{row.salePrice}</td>
                      <td className={tableCellClassName}>{row.stock}</td>
                      <td className={tableCellClassName}>
                        <StatusBadge
                          status={
                            row.action === "Ignorer" ? "En attente" : row.action === "Créer" ? "Actif" : "En stock"
                          }
                        />
                        <span className="ml-2">{row.action}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loaded && (
                <p className="p-5 text-[#6B6B6B] text-sm">Charge un fichier ou l’exemple pour afficher l’aperçu.</p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <SecondaryButton onClick={() => setOpen(false)}>Annuler</SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  importStockItems(
                    demoImportRows
                      .filter((row) => row.action !== "Ignorer")
                      .map((row) => ({
                        reference: row.reference,
                        part: row.part,
                        category: "Écrans",
                        purchasePrice: parseEuro(row.purchasePrice),
                        salePrice: parseEuro(row.salePrice),
                        stock: Number(row.stock),
                        threshold: 5,
                        supplier: "MobileParts France",
                      })),
                  );
                  toast.success("Import stock appliqué au store local");
                  setOpen(false);
                }}
              >
                Valider l’import simulé
              </PrimaryButton>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function parseEuro(value: string) {
  return Number(value.replace(/\s/g, "").replace("€", "").replace(",", ".").trim()) || 0;
}
