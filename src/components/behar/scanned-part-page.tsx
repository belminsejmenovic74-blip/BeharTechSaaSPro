"use client";

import { useMemo, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, FileText, History, Package, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { BeharLogo } from "@/components/behar/behar-logo";
import { PrimaryButton, SecondaryButton, StatusBadge } from "@/components/behar/primitives";
import { formatEuro, type StockMovementType, useBeharStore } from "@/lib/behar-store";
import { getPartTraceability } from "@/lib/part-traceability";
import { findStockLotByToken, getStockLotsForItem, stockLotInternalCode } from "@/lib/stock-lots";
import { resolveStockItem, stockPrimaryReference } from "@/lib/stock-reference";
import { cn } from "@/lib/utils";

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  supplier_purchase_received: "Entrée depuis facture fournisseur",
  manual_adjustment: "Ajustement manuel",
  repair_part_used: "Sortie vers réparation",
  reconditioning_part_used: "Reconditionnement",
  counter_sale_sold: "Vente comptoir",
  reconditioned_device_sold: "Vente reconditionné",
  reservation_created: "Réservation atelier",
  reservation_released: "Annulation / retour",
  return_to_supplier: "Retour fournisseur",
  stock_transfer_out: "Transfert sortant",
  stock_transfer_in: "Transfert entrant",
  correction: "Correction stock",
};

function displayText(value?: string, fallback = "—") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function shortDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function scannedStatus(stock: number, threshold: number) {
  if (stock === 0) return "Stock épuisé";
  if (stock <= threshold) return "Stock faible";
  return "En stock";
}

function InfoRow({
  label,
  value,
  mono,
}: Readonly<{
  label: string;
  value: string;
  mono?: boolean;
}>) {
  return (
    <div className="flex items-start justify-between gap-4 border-[#E4E7EC] border-b py-3 last:border-0">
      <dt className="text-[#667085] text-sm">{label}</dt>
      <dd className={cn("min-w-0 text-right font-semibold text-[#101828] text-sm", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: Readonly<{
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}>) {
  return (
    <section className="rounded-[18px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-[#2A9D8F]" />
        <h2 className="font-semibold text-[#101828] text-base">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function ScannedPartPage({ scanToken }: Readonly<{ scanToken: string }>) {
  const store = useBeharStore();
  const router = useRouter();
  const connected = Boolean(store._hasHydrated && store.sessionUserId);
  const canViewPurchasePrice = connected && store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = connected && store.hasPermission("canViewSupplier");
  const canManageStock = connected && store.hasPermission("canManageStock");
  const canUseStockItem = connected && store.hasPermission("canUseStockItem");
  // Un QR peut cibler soit une pièce (scanToken pièce), soit un LOT précis
  // (id de ligne de facture) : deux lots d'une même pièce ont un QR distinct.
  const scannedLot = useMemo(() => findStockLotByToken(store, store.stockItems, scanToken), [scanToken, store]);
  const item = useMemo(
    () => resolveStockItem(store.stockItems, scanToken, { includeDisabledScanToken: true }) ?? scannedLot?.item,
    [scanToken, store.stockItems, scannedLot],
  );
  const primaryReference = item ? stockPrimaryReference(item) : "";
  const trace = useMemo(() => getPartTraceability(store, primaryReference), [store, primaryReference]);
  const lots = useMemo(() => (item ? getStockLotsForItem(store, item) : []), [item, store]);
  const originInvoice =
    trace.supplierInvoices.find((invoice) => invoice.id === item?.originSupplierInvoiceId) ?? trace.supplierInvoices[0];
  const originLine =
    trace.supplierInvoiceLines.find((line) => line.id === item?.originSupplierInvoiceLineId) ??
    trace.supplierInvoiceLines[0];
  const originDate = originInvoice?.purchaseDate ?? originLine?.createdAt ?? item?.createdAt;

  function goStock() {
    if (item) store.setSelected("stockItem", item.id);
    router.push(`/dashboard/stock?ref=${encodeURIComponent(primaryReference)}`);
  }

  function useInRepair() {
    if (!item) return;
    store.setSelected("stockItem", item.id);
    router.push("/dashboard/reparations");
    toast.success("Pièce sélectionnée. Ouvrez le dossier réparation pour l'ajouter.");
  }

  function adjustStock() {
    if (!item) return;
    const delta = Number(window.prompt("Ajustement stock (+ ou -)", "1") || 0);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Ajustement invalide");
      return;
    }
    store.adjustStock(item.id, delta, "Ajustement depuis QR étiquette");
    toast.success("Ajustement stock enregistré.");
  }

  if (!store._hasHydrated) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] px-4 py-5 text-[#101828]">
        <BeharLogo size="md" />
        <div className="mt-12 rounded-[18px] border border-[#E4E7EC] bg-white p-5 text-[#667085] text-sm">
          Chargement de la pièce scannée…
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] px-4 py-5 text-[#101828]">
        <BeharLogo size="md" />
        <section className="mt-8 rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="grid size-12 place-items-center rounded-[14px] bg-[#FBEBEB] text-[#B42318]">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="mt-5 font-semibold text-[#101828] text-2xl tracking-tight">Pièce introuvable</h1>
          <p className="mt-2 text-[#667085] text-sm">
            La référence scannée ne correspond à aucune pièce stockée sur cet appareil.
          </p>
          <p className="mt-4 rounded-[12px] bg-[#F9FAFB] px-3 py-2 font-mono text-[#101828] text-sm">
            {scanToken.startsWith("sp_") ? "QR non reconnu" : displayText(scanToken)}
          </p>
          <SecondaryButton className="mt-5 w-full" onClick={() => router.push("/dashboard/stock")}>
            Voir le stock
            <ArrowRight className="size-4" />
          </SecondaryButton>
        </section>
      </main>
    );
  }

  if (item.scanEnabled === false) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] px-4 py-5 text-[#101828]">
        <BeharLogo size="md" />
        <section className="mx-auto mt-8 max-w-2xl rounded-[20px] border border-[#E4E7EC] bg-white p-5">
          <h1 className="font-semibold text-2xl">Pièce introuvable</h1>
          <p className="mt-2 text-[#667085] text-sm">Ce QR code n'est plus actif.</p>
        </section>
      </main>
    );
  }

  if (item.active === false) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] px-4 py-5 text-[#101828]">
        <BeharLogo size="md" />
        <section className="mx-auto mt-8 max-w-2xl rounded-[20px] border border-[#E4E7EC] bg-white p-5">
          <h1 className="font-semibold text-2xl">Pièce archivée</h1>
          <p className="mt-2 text-[#667085] text-sm">Cette référence existe mais n'est plus active dans le stock.</p>
        </section>
      </main>
    );
  }

  const lotStock = lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
  const availableStock = lots.length ? lotStock : item.stock;
  const reservedStock = Math.max(0, item.stock - availableStock);
  const status = scannedStatus(availableStock, item.threshold);
  const invoiceUrl = originInvoice?.originalFileUrl;

  return (
    <main className="min-h-screen bg-[#F9FAFB] px-4 py-5 text-[#101828]">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-3">
          <BeharLogo size="md" />
          <span className="rounded-full border border-[#E4E7EC] bg-white px-3 py-1 font-medium text-[#667085] text-xs">
            Scan pièce
          </span>
        </header>

        <section className="mt-6 rounded-[22px] border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-[16px] bg-[#ECF8F5] text-[#167B70]">
              <Package className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#667085] text-sm">Pièce scannée</p>
              <h1 className="mt-1 font-semibold text-[#101828] text-2xl leading-tight tracking-tight">
                {item.displayName ?? item.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          <dl className="mt-5 rounded-[16px] bg-[#F9FAFB] px-4">
            <InfoRow label="Référence interne" mono value={displayText(primaryReference)} />
            {item.internalCode && item.internalCode !== primaryReference && (
              <InfoRow label="Code interne" mono value={displayText(item.internalCode)} />
            )}
            {scannedLot?.lot && (
              <>
                <InfoRow
                  label="N° interne du lot"
                  mono
                  value={displayText(stockLotInternalCode(item.internalCode, scannedLot.lot))}
                />
                {(canViewSupplier || !connected) && scannedLot.lot.supplierName && (
                  <InfoRow label="Fournisseur du lot" value={displayText(scannedLot.lot.supplierName)} />
                )}
                {scannedLot.lot.invoiceNumber && (
                  <InfoRow label="Facture d'achat" mono value={displayText(scannedLot.lot.invoiceNumber)} />
                )}
                <InfoRow label="Reçu le" value={shortDate(scannedLot.lot.purchaseDate)} />
                <InfoRow label="Restant sur ce lot" value={String(scannedLot.lot.quantityRemaining)} />
                {canViewPurchasePrice && scannedLot.lot.unitCost !== undefined && (
                  <InfoRow label="Coût unitaire du lot" mono value={formatEuro(scannedLot.lot.unitCost)} />
                )}
              </>
            )}
            <InfoRow
              label="Modèle compatible"
              value={item.compatibleModels.length ? item.compatibleModels.join(" / ") : "Non défini"}
            />
            <InfoRow label="Catégorie" value={displayText(item.categoryName || item.category)} />
            <InfoRow label="Qualité" value={displayText(item.quality)} />
            <InfoRow label="Emplacement" value={displayText(item.location, "Non renseigné")} />
            <InfoRow label="Stock disponible" value={String(availableStock)} />
            {reservedStock > 0 && <InfoRow label="Stock réservé" value={String(reservedStock)} />}
            <InfoRow label="Stock utilisable" value={String(Math.max(0, availableStock - reservedStock))} />
            {canViewPurchasePrice && (
              <InfoRow label="Prix d'achat moyen" value={formatEuro(item.averagePurchasePrice ?? item.purchasePrice)} />
            )}
            {canViewSupplier && (
              <InfoRow label="Fournisseur principal" value={displayText(item.primarySupplier ?? item.supplier)} />
            )}
            {connected && <InfoRow label="Facture d'origine" value={displayText(originInvoice?.invoiceNumber)} />}
            {connected && <InfoRow label="Date d'achat" value={shortDate(originDate)} />}
          </dl>
        </section>

        <div className="mt-4 grid gap-3">
          {connected && (
            <Section icon={FileText} title="Origine">
              <dl className="rounded-[14px] bg-[#F9FAFB] px-3">
                <InfoRow
                  label="Fournisseur"
                  value={displayText(originInvoice?.supplierName ?? originLine?.supplierName)}
                />
                <InfoRow label="Facture" value={displayText(originInvoice?.invoiceNumber)} />
                <InfoRow label="Date achat" value={shortDate(originDate)} />
              </dl>
              <SecondaryButton
                className="mt-3 w-full"
                disabled={!invoiceUrl}
                onClick={() => invoiceUrl && window.open(invoiceUrl, "_blank", "noopener,noreferrer")}
              >
                <FileText className="size-4" />
                Voir la facture
              </SecondaryButton>
            </Section>
          )}

          {connected && (
            <Section icon={Package} title="Lots disponibles">
              <div className="space-y-2">
                {lots.map((lot) => (
                  <div className="rounded-[14px] border border-[#E4E7EC] bg-[#F9FAFB] p-3" key={lot.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#101828] text-sm">
                          {displayText(lot.supplierName, "Fournisseur non renseigné")}
                        </p>
                        <p className="mt-1 truncate text-[#667085] text-xs">
                          {displayText(lot.invoiceNumber, "Sans facture")} · reçu le {shortDate(lot.purchaseDate)}
                        </p>
                      </div>
                      <p className="font-semibold text-[#167B70] text-sm tabular-nums">
                        {lot.quantityRemaining} / {lot.quantityPurchased}
                      </p>
                    </div>
                    {canViewPurchasePrice && lot.unitCost != null && (
                      <p className="mt-2 text-[#667085] text-xs">Prix d'achat : {formatEuro(lot.unitCost)}</p>
                    )}
                  </div>
                ))}
                {!lots.length && (
                  <p className="rounded-[14px] bg-[#F9FAFB] px-3 py-4 text-[#667085] text-sm">
                    Aucun lot structuré ; le stock de la pièce reste disponible.
                  </p>
                )}
              </div>
            </Section>
          )}

          {connected && (
            <Section icon={History} title="Historique">
              <div className="space-y-2">
                {trace.movements.slice(0, 8).map((movement) => (
                  <div key={movement.id} className="rounded-[14px] border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#101828] text-sm">{MOVEMENT_LABELS[movement.movementType]}</p>
                        <p className="mt-1 text-[#667085] text-xs">
                          {movement.reason || movement.note || "Mouvement stock"}
                        </p>
                        <p className="mt-1 font-mono text-[#98A2B3] text-[11px]">{shortDate(movement.createdAt)}</p>
                      </div>
                      <p
                        className={cn(
                          "font-semibold text-sm tabular-nums",
                          movement.quantityDelta < 0 ? "text-[#B42318]" : "text-[#167B70]",
                        )}
                      >
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {movement.quantityDelta}
                      </p>
                    </div>
                  </div>
                ))}
                {!trace.movements.length && (
                  <p className="rounded-[14px] bg-[#F9FAFB] px-3 py-4 text-[#667085] text-sm">
                    Aucun mouvement stock lié à cette référence.
                  </p>
                )}
              </div>
            </Section>
          )}

          {connected && (
            <Section icon={Wrench} title="Réparations liées">
              <div className="space-y-2">
                {trace.repairUsages.map(({ repair, customer, part, usedAt }) => (
                  <div
                    key={`${repair.id}-${part.stockItemId}-${part.reference}`}
                    className="rounded-[14px] border border-[#E4E7EC] bg-[#F9FAFB] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#101828] text-sm">{repair.number}</p>
                        <p className="mt-1 text-[#667085] text-xs">
                          {customer?.name || "Client"} · {repair.device || repair.model || "Appareil"}
                        </p>
                        <p className="mt-1 text-[#667085] text-xs">{shortDate(usedAt)}</p>
                      </div>
                      <StatusBadge status={repair.status} />
                    </div>
                    <SecondaryButton
                      className="mt-3 h-9 w-full text-xs"
                      onClick={() => router.push(`/dashboard/dossiers/${repair.id}`)}
                    >
                      Voir dossier
                    </SecondaryButton>
                  </div>
                ))}
                {!trace.repairUsages.length && (
                  <p className="rounded-[14px] bg-[#F9FAFB] px-3 py-4 text-[#667085] text-sm">
                    Aucune réparation liée à cette pièce.
                  </p>
                )}
              </div>
            </Section>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-4 border-[#E4E7EC] border-t bg-[#F9FAFB]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto grid max-w-2xl gap-2">
            {connected && (
              <PrimaryButton disabled={!canUseStockItem || availableStock <= 0} onClick={useInRepair}>
                <Plus className="size-4" />
                Utiliser dans une réparation
              </PrimaryButton>
            )}
            <SecondaryButton onClick={goStock}>
              <Package className="size-4" />
              Voir fiche stock
            </SecondaryButton>
            {canManageStock && (
              <SecondaryButton onClick={adjustStock}>
                <History className="size-4" />
                Ajuster stock
              </SecondaryButton>
            )}
            {connected && invoiceUrl && (
              <SecondaryButton onClick={() => window.open(invoiceUrl, "_blank", "noopener,noreferrer")}>
                <FileText className="size-4" />
                Voir la facture
              </SecondaryButton>
            )}
          </div>
        </div>

        <p className="mt-4 pb-5 text-center text-[#98A2B3] text-xs">Accès sécurisé Behar Tech Pro</p>
      </div>
    </main>
  );
}
