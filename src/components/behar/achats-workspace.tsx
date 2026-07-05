"use client";

import { useMemo, useState } from "react";

import { Package, Plus, ShoppingCart, Smartphone, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { formatEuro, type Purchase, type PurchaseKind, useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

import { PageShell } from "./page-shell";
import {
  Panel,
  PrimaryButton,
  SecondaryButton,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
  TableShell,
} from "./primitives";

const KIND_LABEL: Record<PurchaseKind, string> = {
  piece: "Pièce",
  telephone: "Téléphone",
  accessoire: "Accessoire",
  autre: "Autre",
};

type KindFilter = "tous" | PurchaseKind;

const FILTERS: Array<{ key: KindFilter; label: string }> = [
  { key: "tous", label: "Tous" },
  { key: "piece", label: "Pièces" },
  { key: "telephone", label: "Téléphones" },
  { key: "accessoire", label: "Accessoires" },
];

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function purchaseMonthKey(purchase: Purchase) {
  return (purchase.date || purchase.createdAt || "").slice(0, 7);
}

function KindBadge({ kind }: Readonly<{ kind: PurchaseKind }>) {
  const isPhone = kind === "telephone";
  const Icon = isPhone ? Smartphone : Package;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-xs",
        isPhone ? "border-[#CDE3F5] bg-[#F4F9FE] text-[#1E5A8A]" : "border-[#E1E8E2] bg-[#F5FAF6] text-[#2E6B4F]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {KIND_LABEL[kind]}
    </span>
  );
}

function Kpi({
  label,
  value,
  helper,
  icon: Icon,
}: Readonly<{ label: string; value: string; helper: string; icon: typeof Package }>) {
  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[#6B6B6B] text-xs font-medium tracking-tight">{label}</p>
          <p className="mt-1.5 font-semibold text-[#1A1916] text-[24px] leading-none tracking-tight">{value}</p>
          <p className="mt-1.5 text-[#8A8A85] text-xs">{helper}</p>
        </div>
        <Icon className="h-5 w-5 text-[#B4B4AE]" />
      </div>
    </Panel>
  );
}

const EMPTY_FORM = { kind: "piece" as PurchaseKind, label: "", supplier: "", quantity: "1", unitCost: "" };

export function AchatsWorkspace() {
  const purchases = useBeharStore((s) => s.purchases);
  const addPurchase = useBeharStore((s) => s.addPurchase);
  const deletePurchase = useBeharStore((s) => s.deletePurchase);
  const canViewPurchases = useBeharStore((s) => s.hasPermission("canViewPurchasePrice"));
  const repairs = useBeharStore((s) => s.repairs);

  const [filter, setFilter] = useState<KindFilter>("tous");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((purchase) => {
      if (filter !== "tous" && purchase.kind !== filter) return false;
      if (!q) return true;
      return (
        purchase.label.toLowerCase().includes(q) ||
        (purchase.supplier || "").toLowerCase().includes(q) ||
        (purchase.reference || "").toLowerCase().includes(q) ||
        purchase.number.toLowerCase().includes(q)
      );
    });
  }, [purchases, filter, search]);

  const stats = useMemo(() => {
    const month = currentMonthKey();
    let monthTotal = 0;
    let piecesTotal = 0;
    let phonesTotal = 0;
    let phonesCount = 0;
    for (const purchase of purchases) {
      if (purchaseMonthKey(purchase) === month) monthTotal += purchase.total;
      if (purchase.kind === "telephone") {
        phonesTotal += purchase.total;
        phonesCount += 1;
      } else {
        piecesTotal += purchase.total;
      }
    }
    return { monthTotal, piecesTotal, phonesTotal, phonesCount };
  }, [purchases]);

  // Récap dépenses par fournisseur / origine (top 5) — utile pour piloter les achats.
  const supplierBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const purchase of purchases) {
      const key = (purchase.supplier || purchase.source || "Divers").trim();
      const entry = map.get(key) ?? { total: 0, count: 0 };
      entry.total += purchase.total;
      entry.count += 1;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [purchases]);

  // Résout le rattachement d'un achat à un dossier / dossier reconditionnement / reprise.
  function linkedLabel(purchase: Purchase): string | null {
    if (purchase.repairId) {
      const repair = repairs.find((entry) => entry.id === purchase.repairId);
      return repair ? `Dossier ${repair.number}` : "Dossier lié";
    }
    if (purchase.reconditioningFileId) return "Reconditionnement";
    if (purchase.conditionneRecordId) return "Reprise client";
    return null;
  }

  function submitForm() {
    const label = form.label.trim();
    const unitCost = Number.parseFloat(form.unitCost.replace(",", "."));
    if (!label) {
      toast.error("Indiquez une désignation.");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      toast.error("Indiquez un prix d'achat unitaire valide.");
      return;
    }
    const quantity = Math.max(1, Number.parseInt(form.quantity, 10) || 1);
    addPurchase({
      kind: form.kind,
      source: "Manuel",
      label,
      supplier: form.supplier.trim() || undefined,
      quantity,
      unitCost,
    });
    toast.success("Achat enregistré.");
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  if (!canViewPurchases) {
    return (
      <PageShell title="Achats" subtitle="Accès restreint.">
        <Panel className="p-10 text-center">
          <p className="font-semibold text-[#1A1916] text-sm">Accès non autorisé</p>
          <p className="mt-1.5 text-[#8A8A85] text-xs">
            Les prix d'achat sont réservés aux rôles disposant de la permission « voir les prix d'achat ».
          </p>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Achats"
      subtitle="Traçabilité des entrées : pièces, accessoires et téléphones (rachats + reconditionnement)."
      searchPlaceholder="Rechercher un achat, un fournisseur..."
      searchValue={search}
      onSearchChange={setSearch}
      actions={
        <PrimaryButton onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Nouvel achat
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Achats du mois"
          value={formatEuro(stats.monthTotal)}
          helper="toutes entrées confondues"
          icon={ShoppingCart}
        />
        <Kpi
          label="Pièces & accessoires"
          value={formatEuro(stats.piecesTotal)}
          helper="cumul historique"
          icon={Package}
        />
        <Kpi
          label="Téléphones"
          value={formatEuro(stats.phonesTotal)}
          helper={`${stats.phonesCount} appareil(s)`}
          icon={Smartphone}
        />
        <Kpi label="Entrées" value={String(purchases.length)} helper="achats enregistrés" icon={ShoppingCart} />
      </div>

      {supplierBreakdown.length > 0 && (
        <Panel className="mt-4 p-4 md:p-5">
          <h2 className="mb-3 font-semibold text-[#1A1916] text-sm">Dépenses par fournisseur / origine</h2>
          <div className="flex flex-wrap gap-2">
            {supplierBreakdown.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-2 rounded-full border border-[#E8E8E5] bg-[#FAFAF9] px-3 py-1.5"
              >
                <span className="font-medium text-[#1A1916] text-xs">{entry.name}</span>
                <span className="font-semibold text-[#2E6B4F] text-xs tabular-nums">{formatEuro(entry.total)}</span>
                <span className="text-[#A8A8A2] text-[11px]">· {entry.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {showForm && (
        <Panel className="mt-5 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1916] text-sm">Enregistrer un achat</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full p-1 text-[#8A8A85] hover:bg-[#F2F2EF]"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <label className="md:col-span-1 flex flex-col gap-1 text-xs text-[#6B6B6B]">
              Type
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as PurchaseKind }))}
                className="rounded-[10px] border border-[#E1E1DD] bg-white px-3 py-2 text-sm text-[#1A1916]"
              >
                <option value="piece">Pièce</option>
                <option value="accessoire">Accessoire</option>
                <option value="telephone">Téléphone</option>
                <option value="autre">Autre</option>
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-1 text-xs text-[#6B6B6B]">
              Désignation
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Écran iPhone 13, iPhone 12 128 Go..."
                className="rounded-[10px] border border-[#E1E1DD] bg-white px-3 py-2 text-sm text-[#1A1916]"
              />
            </label>
            <label className="md:col-span-1 flex flex-col gap-1 text-xs text-[#6B6B6B]">
              Fournisseur
              <input
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                placeholder="Fournisseur / origine"
                className="rounded-[10px] border border-[#E1E1DD] bg-white px-3 py-2 text-sm text-[#1A1916]"
              />
            </label>
            <label className="md:col-span-1 flex flex-col gap-1 text-xs text-[#6B6B6B]">
              Quantité
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="rounded-[10px] border border-[#E1E1DD] bg-white px-3 py-2 text-sm text-[#1A1916]"
              />
            </label>
            <label className="md:col-span-1 flex flex-col gap-1 text-xs text-[#6B6B6B]">
              Prix unitaire (€)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.unitCost}
                onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                className="rounded-[10px] border border-[#E1E1DD] bg-white px-3 py-2 text-sm text-[#1A1916]"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <SecondaryButton onClick={() => setShowForm(false)}>Annuler</SecondaryButton>
            <PrimaryButton onClick={submitForm}>Enregistrer</PrimaryButton>
          </div>
        </Panel>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setFilter(entry.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 font-medium text-sm transition-colors",
              filter === entry.key
                ? "border-[#1A1916] bg-[#1A1916] text-white"
                : "border-[#E1E1DD] bg-white text-[#6B6B6B] hover:border-[#CFCFC9]",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <Panel className="mt-4 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <ShoppingCart className="h-8 w-8 text-[#C9C9C3]" />
            <p className="font-medium text-[#1A1916] text-sm">Aucun achat enregistré</p>
            <p className="max-w-sm text-[#8A8A85] text-xs">
              Les réapprovisionnements de stock, les rachats clients et les téléphones reconditionnés publiés en stock
              apparaissent ici automatiquement.
            </p>
          </div>
        ) : (
          <TableShell>
            <table className={tableClassName}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Désignation</th>
                  <th className="px-4 py-3">Origine</th>
                  <th className="px-4 py-3 text-right">Qté</th>
                  <th className="px-4 py-3 text-right">PU</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className={cn(tableCellClassName, "font-mono text-xs text-[#6B6B6B]")}>{purchase.number}</td>
                    <td className={cn(tableCellClassName, "whitespace-nowrap text-xs text-[#6B6B6B]")}>
                      {(purchase.date || purchase.createdAt || "").slice(0, 10)}
                    </td>
                    <td className={tableCellClassName}>
                      <KindBadge kind={purchase.kind} />
                    </td>
                    <td className={cn(tableCellClassName, "font-medium")}>
                      {purchase.label}
                      {purchase.reference && (
                        <span className="ml-1 text-[#A8A8A2] text-xs">· {purchase.reference}</span>
                      )}
                    </td>
                    <td className={cn(tableCellClassName, "text-xs text-[#6B6B6B]")}>
                      <span>{purchase.supplier || "—"}</span>
                      <span className="ml-1 text-[#B4B4AE]">({purchase.source})</span>
                      {linkedLabel(purchase) && (
                        <span className="mt-0.5 block text-[#2E6B4F] text-[11px]">↳ {linkedLabel(purchase)}</span>
                      )}
                    </td>
                    <td className={cn(tableCellClassName, "text-right tabular-nums")}>{purchase.quantity}</td>
                    <td className={cn(tableCellClassName, "text-right tabular-nums")}>
                      {formatEuro(purchase.unitCost)}
                    </td>
                    <td className={cn(tableCellClassName, "text-right font-semibold tabular-nums")}>
                      {formatEuro(purchase.total)}
                    </td>
                    <td className={cn(tableCellClassName, "text-right")}>
                      <button
                        type="button"
                        onClick={() => {
                          deletePurchase(purchase.id);
                          toast.success("Achat supprimé.");
                        }}
                        className="rounded-full p-1.5 text-[#B4B4AE] hover:bg-[#FBEBEB] hover:text-[#C0392B]"
                        aria-label="Supprimer l'achat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </Panel>
    </PageShell>
  );
}
