"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Download, FileUp, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { PriceTreeView } from "./price-tree-view";
import { toast } from "sonner";
import * as xlsx from "xlsx";

import { PageShell } from "@/components/behar/page-shell";
import { Combobox, Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { useBeharStore } from "@/lib/behar-store";
import {
  computePriceBookTotals,
  formatEuroPriceBook,
  normalizePriceBookStructure,
  PRICE_BOOK_DEVICE_LABELS,
  PRICE_BOOK_SOURCE_LABELS,
  type PriceBookDeviceType,
  type PriceBookItem,
  type PriceBookSource,
} from "@/lib/price-book";
import { deviceCatalog } from "@/data/deviceCatalog";

type ImportDuplicateAction = "update" | "ignore" | "create";

type ImportPreview = {
  validLines: Partial<PriceBookItem>[];
  errorCount: number;
  duplicateAction: ImportDuplicateAction;
};

type FormState = {
  id?: string;
  typeAppareil: PriceBookDeviceType;
  marque: string;
  modele: string;
  reparation: string;
  piece: string;
  qualite: string;
  sku: string;
  prixAchat: string;
  prixVentePiece: string;
  mainOeuvre: string;
  prixClientFinal: string;
  fournisseur: string;
  garantie: string;
  stockDisponible: string;
  notes: string;
};

const emptyForm: FormState = {
  typeAppareil: "smartphone",
  marque: "",
  modele: "",
  reparation: "",
  piece: "",
  qualite: "Standard",
  sku: "",
  prixAchat: "",
  prixVentePiece: "",
  mainOeuvre: "",
  prixClientFinal: "",
  fournisseur: "",
  garantie: "",
  stockDisponible: "",
  notes: "",
};

const PAGE_SIZE = 25;

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const exportCatalogueCsv = (items: PriceBookItem[]) => {
  const headers = [
    "typeAppareil",
    "marque",
    "modele",
    "reparation",
    "piece",
    "qualite",
    "sku",
    "prixAchat",
    "mainOeuvre",
    "prixVentePiece",
    "prixClientTotal",
    "marge",
    "fournisseur",
    "stockDisponible",
    "dateMaj",
    "notes",
  ];
  const lines = [headers.join(";")];
  for (const item of items) {
    lines.push(
      [
        item.typeAppareil,
        item.marque,
        item.modele,
        item.reparation,
        item.piece,
        item.qualite,
        item.sku ?? "",
        item.prixAchat,
        item.mainOeuvre,
        item.prixVentePiece,
        item.prixClientTotal,
        item.marge,
        item.fournisseur ?? "",
        item.stockDisponible ?? "",
        item.updatedAt,
        item.notes ?? "",
      ]
        .map(csvEscape)
        .join(";"),
    );
  }
  const csv = `﻿${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `catalogue-prix-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function CataloguePrixPage() {
  const router = useRouter();
  const items = useBeharStore((s) => s.priceBookItems);
  const deviceBrands = useBeharStore((s) => s.deviceBrands);
  const deviceModels = useBeharStore((s) => s.deviceModels);
  const addItem = useBeharStore((s) => s.addPriceBookItem);
  const updateItem = useBeharStore((s) => s.updatePriceBookItem);
  const deleteItem = useBeharStore((s) => s.deletePriceBookItem);
  const toggleItem = useBeharStore((s) => s.togglePriceBookItem);
  const loadPreloadedCatalog = useBeharStore((s) => s.loadPreloadedCatalog);

  useEffect(() => {
    loadPreloadedCatalog();
  }, [loadPreloadedCatalog]);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | PriceBookDeviceType>("all");
  const [filterMarque, setFilterMarque] = useState<string>("all");
  const [filterReparation, setFilterReparation] = useState<string>("all");
  const [filterQualite, setFilterQualite] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | PriceBookSource>("all");
  const [page, setPage] = useState(1);

  const [view, setView] = useState<"tree" | "table">("tree");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && !search.trim()) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const marques = useMemo(() => Array.from(new Set(items.map((i) => i.marque))).sort(), [items]);
  const reparations = useMemo(() => Array.from(new Set(items.map((i) => i.reparation))).sort(), [items]);
  const qualites = useMemo(() => Array.from(new Set(items.map((i) => i.qualite))).sort(), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterType !== "all" && item.typeAppareil !== filterType) return false;
      if (filterMarque !== "all" && item.marque !== filterMarque) return false;
      if (filterReparation !== "all" && item.reparation !== filterReparation) return false;
      if (filterQualite !== "all" && item.qualite !== filterQualite) return false;
      if (filterSource !== "all" && item.source !== filterSource) return false;
      if (!q) return true;
      const haystack = [
        item.marque,
        item.modele,
        item.reparation,
        item.piece,
        item.qualite,
        item.sku ?? "",
        item.fournisseur ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, filterType, filterMarque, filterReparation, filterQualite, filterSource]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const formTotals = computePriceBookTotals(
    Number.parseFloat(form.prixVentePiece.replace(",", ".")) || 0,
    Number.parseFloat(form.mainOeuvre.replace(",", ".")) || 0,
    Number.parseFloat(form.prixAchat.replace(",", ".")) || 0,
  );

  const openCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: "array" });

        let sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes("import behar tech"));
        if (!sheetName) sheetName = workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet) as any[];

        let errorCount = 0;
        const validLines: Partial<PriceBookItem>[] = [];

        rows.forEach((row) => {
          const getVal = (keys: string[]) => {
            const key = Object.keys(row).find((k) => keys.includes(k.toLowerCase().trim()));
            return key ? String(row[key]) : "";
          };

          const typeAppareilRaw = getVal(["typeappareil", "type appareil", "type"]);
          const typeAppareil = Object.keys(PRICE_BOOK_DEVICE_LABELS).includes(typeAppareilRaw.toLowerCase())
            ? (typeAppareilRaw.toLowerCase() as PriceBookDeviceType)
            : "smartphone";

          const marque = getVal(["marque"]);
          const modele = getVal(["modèle", "modele"]);
          const reparation = getVal(["réparation", "reparation"]);
          const piece = getVal(["pièce", "piece"]);
          const qualite = getVal(["qualité", "qualite"]) || "Standard";
          const sku = getVal(["sku", "référence", "reference"]);
          const fournisseur = getVal(["fournisseur"]);

          const parsePrice = (v: string) => Number.parseFloat(v.replace(",", ".")) || 0;
          const prixAchat = parsePrice(getVal(["prix achat", "prix d'achat", "prixachat"]));
          const prixVentePiece = parsePrice(getVal(["prix vente", "prix de vente", "prixventepiece"]));
          const mainOeuvre = parsePrice(getVal(["main oeuvre", "main-d'œuvre", "mainoeuvre", "m.o."]));
          const stockDisponibleRaw = getVal(["stock", "stock disponible", "stockdisponible"]);
          const stockDisponible = stockDisponibleRaw ? Number.parseFloat(stockDisponibleRaw) : undefined;
          const notes = getVal(["notes", "remarques"]);

          if (!marque || !modele || !reparation || !piece) {
            errorCount++;
            return;
          }

          const normalized = normalizePriceBookStructure({
            // Champs minimaux pour la normalisation (les chiffres sont remplis après)
            id: "tmp",
            source: "workshop_import",
            typeAppareil,
            marque,
            modele,
            reparation,
            piece,
            qualite,
            prixAchat: 0,
            mainOeuvre: 0,
            prixVentePiece: 0,
            prixClientTotal: 0,
            marge: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as PriceBookItem);

          validLines.push({
            typeAppareil,
            marque: normalized.item.marque,
            modele: normalized.item.modele,
            reparation: normalized.item.reparation,
            piece: normalized.item.piece,
            qualite: normalized.item.qualite,
            sku: sku || undefined,
            prixAchat,
            prixVentePiece,
            mainOeuvre,
            fournisseur: fournisseur || undefined,
            stockDisponible,
            notes: [normalized.needsReview ? "[À vérifier import]" : "", notes || ""].filter(Boolean).join(" ").trim() || undefined,
            source: "workshop_import",
          });
        });

        setImportPreview({
          validLines,
          errorCount,
          duplicateAction: "update",
        });
      } catch (err) {
        toast.error("Erreur lors de la lecture du fichier");
        console.error(err);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const executeImport = () => {
    if (!importPreview) return;
    const { validLines, duplicateAction } = importPreview;

    let created = 0;
    let updated = 0;
    let ignored = 0;

    validLines.forEach((line) => {
      const existing = items.find(
        (i) =>
          i.typeAppareil === line.typeAppareil &&
          i.marque.toLowerCase() === line.marque?.toLowerCase() &&
          i.modele.toLowerCase() === line.modele?.toLowerCase() &&
          i.reparation.toLowerCase() === line.reparation?.toLowerCase() &&
          (i.qualite ?? "").toLowerCase() === (line.qualite ?? "").toLowerCase() &&
          (!line.sku || !i.sku || i.sku.toLowerCase() === line.sku.toLowerCase()),
      );

      if (existing) {
        if (duplicateAction === "update") {
          updateItem(existing.id, line);
          updated++;
        } else if (duplicateAction === "create") {
          addItem({ ...line, source: "workshop_import" } as any);
          created++;
        } else {
          ignored++;
        }
      } else {
        addItem({ ...line, source: "workshop_import" } as any);
        created++;
      }
    });

    toast.success(`Import terminé : ${created} créés, ${updated} mis à jour, ${ignored} ignorés.`);
    setImportPreview(null);
  };

  const openEdit = (item: PriceBookItem) => {
    setForm({
      id: item.id,
      typeAppareil: item.typeAppareil,
      marque: item.marque,
      modele: item.modele,
      reparation: item.reparation,
      piece: item.piece,
      qualite: item.qualite,
      sku: item.sku ?? "",
      prixAchat: String(item.prixAchat ?? ""),
      prixVentePiece: String(item.prixVentePiece ?? ""),
      mainOeuvre: String(item.mainOeuvre ?? ""),
      prixClientFinal: item.prixClientTotal > 0 ? String(item.prixClientTotal) : "",
      fournisseur: item.fournisseur ?? "",
      garantie: item.garantie ?? "",
      stockDisponible: item.stockDisponible !== undefined ? String(item.stockDisponible) : "",
      notes: item.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.marque.trim() || !form.modele.trim() || !form.reparation.trim() || !form.piece.trim()) {
      toast.error("Marque, modèle, réparation et pièce sont obligatoires.");
      return;
    }
    let prixVentePiece = Number.parseFloat(form.prixVentePiece.replace(",", ".")) || 0;
    let mainOeuvre = Number.parseFloat(form.mainOeuvre.replace(",", ".")) || 0;
    const prixClientFinal = Number.parseFloat(form.prixClientFinal.replace(",", ".")) || 0;
    // Si l'utilisateur a saisi un prix client final différent du calcul, on redistribue
    if (prixClientFinal > 0) {
      const computed = prixVentePiece + mainOeuvre;
      if (computed !== prixClientFinal) {
        if (prixVentePiece > 0 && mainOeuvre > 0) {
          const ratio = prixClientFinal / (computed || 1);
          prixVentePiece = Math.round(prixVentePiece * ratio * 100) / 100;
          mainOeuvre = Math.round(mainOeuvre * ratio * 100) / 100;
        } else if (prixVentePiece === 0 && mainOeuvre === 0) {
          // Aucun détail saisi : mettre tout en prixVentePiece
          prixVentePiece = prixClientFinal;
        } else if (prixVentePiece === 0) {
          mainOeuvre = prixClientFinal;
        } else {
          prixVentePiece = prixClientFinal;
          mainOeuvre = 0;
        }
      }
    }
    const payload = {
      typeAppareil: form.typeAppareil,
      marque: form.marque,
      modele: form.modele,
      reparation: form.reparation,
      piece: form.piece,
      qualite: form.qualite || "Standard",
      sku: form.sku || undefined,
      prixAchat: Number.parseFloat(form.prixAchat.replace(",", ".")) || 0,
      prixVentePiece,
      mainOeuvre,
      fournisseur: form.fournisseur || undefined,
      garantie: form.garantie || undefined,
      stockDisponible: form.stockDisponible ? Number.parseFloat(form.stockDisponible.replace(",", ".")) : undefined,
      notes: form.notes || undefined,
    };
    if (form.id) {
      updateItem(form.id, payload);
      toast.success("Prix mis à jour");
    } else {
      addItem({ ...payload, source: "manual" });
      toast.success("Prix ajouté au catalogue");
    }
    setShowForm(false);
    setForm(emptyForm);
  };

  const handleDelete = (item: PriceBookItem) => {
    if (typeof window !== "undefined" && !window.confirm(`Supprimer "${item.piece}" ?`)) return;
    deleteItem(item.id);
    toast.success("Ligne supprimée");
  };

  return (
    <PageShell title="Catalogue prix atelier">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/parametres"
            className="inline-flex items-center gap-2 text-[#6B6B6B] text-sm hover:text-[#1A1916]"
          >
            <ArrowLeft className="size-4" /> Retour aux paramètres
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".csv, .xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <SecondaryButton onClick={() => fileInputRef.current?.click()}>
              <FileUp className="mr-2 size-4" /> Importer un catalogue
            </SecondaryButton>
            <SecondaryButton onClick={() => exportCatalogueCsv(filtered)}>
              <Download className="mr-2 size-4" /> Export CSV
            </SecondaryButton>
            <PrimaryButton onClick={openCreate}>
              <Plus className="mr-2 size-4" /> Ajouter un prix
            </PrimaryButton>
          </div>
        </div>

        <Panel className="p-5">
          <div className="grid gap-3 md:grid-cols-6">
            <label className="relative md:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher (marque, modèle, pièce, SKU…)"
                className="h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white pr-3 pl-10 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
              />
            </label>
            <FilterSelect
              value={filterType}
              onChange={(value) => {
                setFilterType(value as "all" | PriceBookDeviceType);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tous types" },
                ...Object.entries(PRICE_BOOK_DEVICE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <FilterSelect
              value={filterMarque}
              onChange={(value) => {
                setFilterMarque(value);
                setPage(1);
              }}
              options={[{ value: "all", label: "Toutes marques" }, ...marques.map((m) => ({ value: m, label: m }))]}
            />
            <FilterSelect
              value={filterReparation}
              onChange={(value) => {
                setFilterReparation(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Toutes réparations" },
                ...reparations.map((r) => ({ value: r, label: r })),
              ]}
            />
            <FilterSelect
              value={filterQualite}
              onChange={(value) => {
                setFilterQualite(value);
                setPage(1);
              }}
              options={[{ value: "all", label: "Toutes qualités" }, ...qualites.map((q) => ({ value: q, label: q }))]}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FilterSelect
              value={filterSource}
              onChange={(value) => {
                setFilterSource(value as "all" | PriceBookSource);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Toutes sources" },
                ...Object.entries(PRICE_BOOK_SOURCE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <span className="text-[#6B6B6B] text-sm">
              {filtered.length} ligne{filtered.length > 1 ? "s" : ""} sur {items.length}
            </span>
            <div className="ml-auto inline-flex rounded-full border border-[#E7E4DC] bg-white p-1 text-xs">
              <button
                className={`rounded-full px-3 py-1 transition ${view === "tree" ? "bg-[#E8F7F3] text-[#167B70]" : "text-[#6B6B6B] hover:text-[#1A1916]"}`}
                onClick={() => setView("tree")}
                type="button"
              >
                Arborescence
              </button>
              <button
                className={`rounded-full px-3 py-1 transition ${view === "table" ? "bg-[#E8F7F3] text-[#167B70]" : "text-[#6B6B6B] hover:text-[#1A1916]"}`}
                onClick={() => setView("table")}
                type="button"
              >
                Tableau détaillé
              </button>
            </div>
          </div>
        </Panel>

        {view === "tree" && (
          <Panel className="p-2">
            <PriceTreeView
              items={filtered}
              deviceModels={deviceModels}
              deviceBrands={deviceBrands}
              onEdit={openEdit}
              onPatch={(id, patch) => {
                updateItem(id, patch);
              }}
              onDelete={handleDelete}
            />
          </Panel>
        )}

        {view === "table" && (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead className="bg-[#FAFAF8] text-[#6B6B6B] text-xs uppercase tracking-wide">
                <tr>
                  <Th>Marque</Th>
                  <Th>Modèle</Th>
                  <Th>Réparation</Th>
                  <Th>Pièce</Th>
                  <Th>Qualité</Th>
                  <Th align="right">Achat</Th>
                  <Th align="right">Vente pièce</Th>
                  <Th align="right">M.O.</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Marge</Th>
                  <Th>Fournisseur</Th>
                  <Th align="right">Stock</Th>
                  <Th>Source</Th>
                  <Th>Statut</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center text-[#6B6B6B]">
                      Aucune ligne. Ajoutez un prix ou modifiez vos filtres.
                    </td>
                  </tr>
                ) : (
                  visible.map((item) => (
                    <tr key={item.id} className="border-[#EFEDE6] border-t hover:bg-[#FAFAF8]/60">
                      <Td>{item.marque}</Td>
                      <Td>{item.modele}</Td>
                      <Td>{item.reparation}</Td>
                      <Td>{item.piece}</Td>
                      <Td>{item.qualite}</Td>
                      <Td align="right">{formatEuroPriceBook(item.prixAchat)}</Td>
                      <Td align="right">{formatEuroPriceBook(item.prixVentePiece)}</Td>
                      <Td align="right">{formatEuroPriceBook(item.mainOeuvre)}</Td>
                      <Td align="right" className="font-semibold text-[#1A1916]">
                        {formatEuroPriceBook(item.prixClientTotal)}
                      </Td>
                      <Td align="right">
                        <span className={item.marge < 0 ? "text-red-600" : "text-[#2A9D8F]"}>
                          {formatEuroPriceBook(item.marge)}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <span>{item.fournisseur ?? "—"}</span>
                          {item.stockItemId && (
                            <span className="text-[10px] text-[#167B70] font-medium flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-[#167B70]" />
                              Stock lié
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td align="right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={item.stockDisponible !== undefined && item.stockDisponible > 0 ? "font-semibold text-[#167B70]" : ""}>
                            {item.stockDisponible !== undefined ? `${item.stockDisponible} dispo` : "—"}
                          </span>
                          {item.stockItemId && (
                            <button
                              type="button"
                              onClick={() => router.push("/dashboard/stock")}
                              className="text-[10px] text-[#6B6B6B] hover:text-[#167B70] underline"
                            >
                              Voir dans Stock
                            </button>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[#6B6B6B] text-xs">
                          {PRICE_BOOK_SOURCE_LABELS[item.source]}
                        </span>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id, !item.isActive)}
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            item.isActive ? "bg-[#2A9D8F]/10 text-[#1d6f65]" : "bg-[#F1EFE8] text-[#8A8984]"
                          }`}
                        >
                          {item.isActive ? "Actif" : "Inactif"}
                        </button>
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="grid size-8 place-items-center rounded-lg text-[#6B6B6B] hover:bg-[#F1EFE8] hover:text-[#1A1916]"
                            aria-label="Modifier"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="grid size-8 place-items-center rounded-lg text-[#6B6B6B] hover:bg-red-50 hover:text-red-600"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-[#EFEDE6] border-t px-4 py-3 text-sm">
              <span className="text-[#6B6B6B]">
                Page {safePage} / {totalPages}
              </span>
              <div className="flex gap-2">
                <SecondaryButton onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}>
                  Précédent
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                >
                  Suivant
                </SecondaryButton>
              </div>
            </div>
          )}
        </Panel>
        )}

        {showForm && (
          <FormDialog
            form={form}
            setForm={setForm}
            totals={formTotals}
            items={items}
            marques={marques}
            onCancel={() => {
              setShowForm(false);
              setForm(emptyForm);
            }}
            onSave={handleSave}
          />
        )}

        {importPreview && (
          <ImportPreviewDialog
            preview={importPreview}
            setPreview={setImportPreview}
            onCancel={() => setImportPreview(null)}
            onConfirm={executeImport}
          />
        )}
      </div>
    </PageShell>
  );
}

function Th({ children, align = "left" }: Readonly<{ children: React.ReactNode; align?: "left" | "right" }>) {
  return (
    <th className={`px-3 py-2 font-medium text-xs ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>
  );
}

function Td({
  children,
  align = "left",
  className,
}: Readonly<{ children: React.ReactNode; align?: "left" | "right"; className?: string }>) {
  return (
    <td className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"} text-[#1A1916] ${className ?? ""}`}>
      {children}
    </td>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}>) {
  const labels = options.map((o) => o.label);
  const labelByValue = new Map(options.map((o) => [o.value, o.label] as const));
  const valueByLabel = new Map(options.map((o) => [o.label, o.value] as const));
  const currentLabel = labelByValue.get(value) ?? "";
  return (
    <Combobox
      onChange={(label) => {
        const next = valueByLabel.get(label);
        if (next !== undefined) onChange(next);
      }}
      options={labels}
      placeholder="Filtrer…"
      value={currentLabel}
    />
  );
}

function FormDialog({
  form,
  setForm,
  totals,
  items,
  marques,
  onCancel,
  onSave,
}: Readonly<{
  form: FormState;
  setForm: (next: FormState) => void;
  totals: { prixClientTotal: number; marge: number; margePourcentage: number };
  items: PriceBookItem[];
  marques: string[];
  onCancel: () => void;
  onSave: () => void;
}>) {
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[18px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#1A1916] text-xl">{form.id ? "Modifier le prix" : "Ajouter un prix"}</h2>
          <button type="button" onClick={onCancel} className="text-[#6B6B6B] text-sm hover:text-[#1A1916]">
            Fermer
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Type appareil">
            <Combobox
              onChange={(label) => {
                const entry = Object.entries(PRICE_BOOK_DEVICE_LABELS).find(([, l]) => l === label);
                if (entry) update("typeAppareil", entry[0] as PriceBookDeviceType);
              }}
              options={Object.values(PRICE_BOOK_DEVICE_LABELS)}
              value={PRICE_BOOK_DEVICE_LABELS[form.typeAppareil] ?? ""}
            />
          </Field>
          <Field label="Marque *">
            <Combobox
              ariaLabel="Marque"
              inputTestId="price-modal-brand"
              allowCreate
              createLabel="Ajouter la marque"
              onChange={(next) => {
                update("marque", next);
                update("modele", "");
              }}
              options={Array.from(new Set([
                ...deviceCatalog.filter(b => b.category === form.typeAppareil).map(b => b.brand),
                ...marques
              ])).sort()}
              value={form.marque}
              placeholder="Apple, Samsung..."
            />
          </Field>
          <Field label="Modèle *">
            <Combobox
              ariaLabel="Modèle"
              inputTestId="price-modal-model"
              allowCreate
              createLabel="Ajouter ce modèle"
              disabled={!form.marque.trim()}
              onChange={(next) => update("modele", next)}
              options={Array.from(new Set([
                ...(deviceCatalog.find(b => b.brand.toLowerCase() === form.marque.toLowerCase() || b.aliases.some(a => a.toLowerCase() === form.marque.toLowerCase()))?.models || []),
                ...items.filter(i => i.marque.toLowerCase() === form.marque.toLowerCase()).map(i => i.modele)
              ])).sort()}
              placeholder={form.marque.trim() ? "iPhone 11, Galaxy A52..." : "Choisissez d'abord une marque"}
              value={form.modele}
            />
          </Field>
          <Field label="Réparation *">
            <input
              value={form.reparation}
              onChange={(event) => update("reparation", event.target.value)}
              className={inputClass}
              placeholder="Remplacement écran"
              data-testid="price-modal-repair"
            />
          </Field>
          <Field label="Pièce *">
            <input
              value={form.piece}
              onChange={(event) => update("piece", event.target.value)}
              className={inputClass}
              placeholder="Écran iPhone 11 OLED Premium"
            />
          </Field>
          <Field label="Qualité">
            <input
              value={form.qualite}
              onChange={(event) => update("qualite", event.target.value)}
              className={inputClass}
              placeholder="OLED Premium"
            />
          </Field>
          <Field label="SKU">
            <input value={form.sku} onChange={(event) => update("sku", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Fournisseur">
            <input
              value={form.fournisseur}
              onChange={(event) => update("fournisseur", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Prix achat (€)">
            <input
              value={form.prixAchat}
              onChange={(event) => update("prixAchat", event.target.value)}
              className={inputClass}
              inputMode="decimal"
            />
          </Field>
          <Field label="Prix vente pièce (€)">
            <input
              value={form.prixVentePiece}
              onChange={(event) => update("prixVentePiece", event.target.value)}
              className={inputClass}
              inputMode="decimal"
            />
          </Field>
          <Field label="Main-d’œuvre (€)">
            <input
              value={form.mainOeuvre}
              onChange={(event) => update("mainOeuvre", event.target.value)}
              className={inputClass}
              inputMode="decimal"
            />
          </Field>
          <Field label="Prix client final (€) — optionnel, prioritaire">
            <input
              value={form.prixClientFinal}
              onChange={(event) => update("prixClientFinal", event.target.value)}
              className={`${inputClass} border-[#2A9D8F]/40 font-semibold text-[#167B70]`}
              inputMode="decimal"
              placeholder={String(totals.prixClientTotal || "")}
              data-testid="price-modal-client-price"
            />
          </Field>
          <Field label="Garantie">
            <input
              value={form.garantie}
              onChange={(event) => update("garantie", event.target.value)}
              className={inputClass}
              placeholder="6 mois"
            />
          </Field>
          <Field label="Stock disponible">
            <input
              value={form.stockDisponible}
              onChange={(event) => update("stockDisponible", event.target.value)}
              className={inputClass}
              inputMode="numeric"
            />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              className={`${inputClass} h-20 py-2`}
            />
          </Field>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-[14px] bg-[#FAFAF8] p-4 text-sm">
          <Stat label="Total client" value={formatEuroPriceBook(totals.prixClientTotal)} highlight />
          <Stat label="Marge" value={formatEuroPriceBook(totals.marge)} tone={totals.marge < 0 ? "danger" : "ok"} />
          <Stat label="Marge %" value={`${totals.margePourcentage.toFixed(1)} %`} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={onCancel}>Annuler</SecondaryButton>
          <PrimaryButton onClick={onSave}>{form.id ? "Enregistrer" : "Ajouter"}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10";

function Field({
  label,
  children,
  className,
}: Readonly<{ label: string; children: React.ReactNode; className?: string }>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block font-medium text-[#1A1916] text-xs">{label}</span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  highlight,
  tone,
}: Readonly<{
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "ok" | "danger";
}>) {
  return (
    <div>
      <div className="text-[#6B6B6B] text-xs">{label}</div>
      <div
        className={`font-semibold text-lg ${
          highlight ? "text-[#1A1916]" : tone === "danger" ? "text-red-600" : "text-[#2A9D8F]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ImportPreviewDialog({
  preview,
  setPreview,
  onCancel,
  onConfirm,
}: Readonly<{
  preview: ImportPreview;
  setPreview: (p: ImportPreview) => void;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[18px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#1A1916] text-xl">Aperçu avant import</h2>
          <button type="button" onClick={onCancel} className="text-[#6B6B6B] text-sm hover:text-[#1A1916]">
            Fermer
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#E7E4DC] p-4 text-center">
            <div className="text-[#6B6B6B] text-xs">Lignes valides</div>
            <div className="mt-1 font-semibold text-[#2A9D8F] text-2xl">{preview.validLines.length}</div>
          </div>
          <div className="rounded-xl border border-[#E7E4DC] p-4 text-center">
            <div className="text-[#6B6B6B] text-xs">Lignes en erreur</div>
            <div
              className={`mt-1 font-semibold text-2xl ${preview.errorCount > 0 ? "text-red-500" : "text-[#1A1916]"}`}
            >
              {preview.errorCount}
            </div>
          </div>
          <div className="rounded-xl border border-[#E7E4DC] p-4 text-center">
            <div className="text-[#6B6B6B] text-xs">Total lu</div>
            <div className="mt-1 font-semibold text-[#1A1916] text-2xl">
              {preview.validLines.length + preview.errorCount}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-medium text-[#1A1916] text-sm">Que faire en cas de doublon ?</label>
          <div className="text-xs text-[#6B6B6B] mb-2">
            Un doublon est détecté par SKU/référence si présent, sinon par type + marque + modèle + réparation.
            correspondent.
          </div>
          {(() => {
            const labels: Record<ImportDuplicateAction, string> = {
              update: "Mettre à jour les prix existants",
              ignore: "Ignorer et conserver les prix existants",
              create: "Créer quand même un doublon",
            };
            return (
              <Combobox
                onChange={(label) => {
                  const entry = Object.entries(labels).find(([, l]) => l === label);
                  if (entry) setPreview({ ...preview, duplicateAction: entry[0] as ImportDuplicateAction });
                }}
                options={Object.values(labels)}
                value={labels[preview.duplicateAction]}
              />
            );
          })()}
        </div>

        <div className="mb-6">
          <h3 className="mb-2 font-medium text-[#1A1916] text-sm">Aperçu des premières lignes</h3>
          <div className="overflow-x-auto rounded-xl border border-[#E7E4DC]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] text-[#6B6B6B]">
                <tr>
                  <th className="px-3 py-2 font-medium">Modèle</th>
                  <th className="px-3 py-2 font-medium">Réparation</th>
                  <th className="px-3 py-2 font-medium">Pièce</th>
                  <th className="px-3 py-2 font-medium text-right">Vente Pièce</th>
                  <th className="px-3 py-2 font-medium text-right">M.O.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E4DC]">
                {preview.validLines.slice(0, 5).map((line, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{line.modele}</td>
                    <td className="px-3 py-2">{line.reparation}</td>
                    <td className="px-3 py-2">{line.piece}</td>
                    <td className="px-3 py-2 text-right">{formatEuroPriceBook(line.prixVentePiece ?? 0)}</td>
                    <td className="px-3 py-2 text-right">{formatEuroPriceBook(line.mainOeuvre ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.validLines.length > 5 && (
            <div className="mt-2 text-center text-[#6B6B6B] text-xs">
              Et {preview.validLines.length - 5} autres lignes...
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onCancel}>Annuler</SecondaryButton>
          <PrimaryButton onClick={onConfirm} disabled={preview.validLines.length === 0}>
            Confirmer l'import
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
