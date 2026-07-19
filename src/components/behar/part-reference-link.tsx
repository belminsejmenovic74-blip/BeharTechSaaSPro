"use client";

import { useMemo, useState } from "react";
import type React from "react";

import { useRouter } from "next/navigation";

import { ExternalLink, FileText, History, Package, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatEuro, type StockMovementType, useBeharStore } from "@/lib/behar-store";
import { getPartTraceability } from "@/lib/part-traceability";
import { stockPrimaryReference } from "@/lib/stock-reference";
import { cn } from "@/lib/utils";

import { Modal, PrimaryButton, SecondaryButton, StatusBadge } from "./primitives";

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  supplier_purchase_received: "Achat fournisseur",
  manual_adjustment: "Ajustement manuel",
  repair_part_used: "Sortie réparation",
  reconditioning_part_used: "Reconditionnement",
  counter_sale_sold: "Vente comptoir",
  reconditioned_device_sold: "Vente reconditionné",
  reservation_created: "Réservation atelier",
  reservation_released: "Annulation / retour stock",
  return_to_supplier: "Retour fournisseur",
  stock_transfer_out: "Transfert sortant",
  stock_transfer_in: "Transfert entrant",
  correction: "Correction",
};

function shortDate(value?: string) {
  return value ? value.slice(0, 10) : "—";
}

function TraceSection({
  title,
  icon: Icon,
  children,
}: Readonly<{ title: string; icon: LucideIcon; children: React.ReactNode }>) {
  return (
    <section className="rounded-[8px] border border-[#E4E7EC] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-[#2A9D8F]" />
        <h3 className="font-semibold text-[#101828] text-sm">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TraceRow({ label, value }: Readonly<{ label: string; value?: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-[#F0F0ED] border-t py-2 first:border-t-0">
      <dt className="text-[#667085] text-xs">{label}</dt>
      <dd className="min-w-0 text-[#101828] text-xs font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function EmptyTrace({ label }: Readonly<{ label: string }>) {
  return <p className="rounded-[8px] bg-[#F9FAFB] px-3 py-2 text-[#667085] text-xs">{label}</p>;
}

function PartTraceabilityModal({
  reference,
  onClose,
}: Readonly<{
  reference: string;
  onClose: () => void;
}>) {
  const router = useRouter();
  const store = useBeharStore();
  const trace = useMemo(() => getPartTraceability(store, reference), [store, reference]);
  const item = trace.stockItem;
  const canViewPurchasePrice = store.hasPermission("canViewPurchasePrice");
  const canViewSupplier = store.hasPermission("canViewSupplier");
  const primaryPurchase = trace.purchases[0];
  const primaryLine = trace.supplierInvoiceLines[0];
  const primaryInvoice = trace.supplierInvoices[0];

  const goToRepair = (repairId: string) => {
    store.setSelected("repair", repairId);
    router.push(`/dashboard/dossiers/${repairId}`);
    onClose();
  };

  const goToCustomer = (customerId?: string) => {
    if (!customerId) return;
    store.setSelected("customer", customerId);
    router.push("/dashboard/clients");
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Traçabilité pièce · ${trace.reference}`} maxWidth="max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <TraceSection title="Infos pièce" icon={Package}>
          <dl>
            <TraceRow label="Nom" value={item?.name} />
            <TraceRow
              label="Référence / SKU"
              value={<span className="font-mono">{item ? stockPrimaryReference(item) : reference}</span>}
            />
            <TraceRow label="Code interne" value={<span className="font-mono">{item?.internalCode}</span>} />
            <TraceRow label="Modèle compatible" value={item?.compatibleModels?.join(", ")} />
            <TraceRow label="Catégorie" value={item?.categoryName || item?.category} />
            <TraceRow label="Qualité" value={item?.quality} />
            <TraceRow label="Stock actuel" value={item?.stock} />
            <TraceRow label="Stock minimum" value={item?.threshold} />
            <TraceRow label="Nom fournisseur" value={item?.rawName} />
            <TraceRow label="EAN" value={item?.ean} />
            <TraceRow label="Garantie" value={item?.supplierWarranty} />
            <TraceRow label="Marque fournisseur" value={item?.supplierBrand} />
            {canViewPurchasePrice && (
              <>
                <TraceRow
                  label="Prix achat moyen"
                  value={formatEuro(item?.averagePurchasePrice ?? item?.purchasePrice ?? 0)}
                />
                <TraceRow
                  label="Dernier prix achat"
                  value={formatEuro(item?.lastPurchasePrice ?? item?.purchasePrice ?? 0)}
                />
              </>
            )}
          </dl>
        </TraceSection>

        <TraceSection title="Origine achat" icon={FileText}>
          {primaryPurchase || primaryLine || primaryInvoice ? (
            <>
              <dl>
                {canViewSupplier && (
                  <TraceRow label="Fournisseur" value={primaryInvoice?.supplierName || primaryPurchase?.supplier} />
                )}
                <TraceRow
                  label="Numéro facture"
                  value={
                    <span className="font-mono">{primaryInvoice?.invoiceNumber || primaryPurchase?.invoiceNumber}</span>
                  }
                />
                <TraceRow
                  label="Date d'achat"
                  value={shortDate(primaryInvoice?.purchaseDate || primaryPurchase?.date)}
                />
                {canViewPurchasePrice && (
                  <>
                    <TraceRow
                      label="Prix HT"
                      value={formatEuro(primaryLine?.unitPurchasePriceExclTax ?? primaryPurchase?.unitCost ?? 0)}
                    />
                    <TraceRow
                      label="TVA"
                      value={
                        primaryLine?.taxRate
                          ? `${primaryLine.taxRate}%`
                          : formatEuro(primaryLine?.taxAmount ?? primaryPurchase?.taxAmount ?? 0)
                      }
                    />
                    <TraceRow
                      label="Prix TTC"
                      value={formatEuro(
                        primaryLine?.lineTotalInclTax ??
                          primaryPurchase?.totalIncludingTax ??
                          primaryPurchase?.total ??
                          0,
                      )}
                    />
                  </>
                )}
                <TraceRow
                  label="Quantité achetée"
                  value={primaryLine?.quantityPurchased ?? primaryPurchase?.quantity}
                />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryButton
                  className="h-9 px-3 text-xs"
                  disabled={!primaryInvoice?.originalFileUrl}
                  onClick={() =>
                    primaryInvoice?.originalFileUrl && window.open(primaryInvoice.originalFileUrl, "_blank")
                  }
                >
                  <ExternalLink className="size-3.5" />
                  Voir facture
                </SecondaryButton>
                <SecondaryButton
                  className="h-9 px-3 text-xs"
                  onClick={() => {
                    router.push("/dashboard/achats");
                    onClose();
                  }}
                >
                  Voir achat fournisseur
                </SecondaryButton>
              </div>
            </>
          ) : (
            <EmptyTrace label="Aucune origine achat structurée reliée à cette référence." />
          )}
        </TraceSection>

        <TraceSection title="Réparations liées" icon={Wrench}>
          {trace.repairUsages.length ? (
            <div className="space-y-2">
              {trace.repairUsages.map(({ repair, customer, part, usedAt, technician }) => (
                <div key={`${repair.id}-${part.stockItemId}`} className="rounded-[8px] border border-[#E4E7EC] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#101828] text-sm">{repair.number}</p>
                      <p className="text-[#667085] text-xs">
                        {customer?.name || "Client"} · {repair.device}
                      </p>
                      {repair.imei && <p className="font-mono text-[#667085] text-[11px]">IMEI {repair.imei}</p>}
                    </div>
                    <StatusBadge status={repair.status} />
                  </div>
                  <div className="mt-2 grid gap-1 text-[#667085] text-xs sm:grid-cols-3">
                    <span>Date : {shortDate(usedAt)}</span>
                    <span>Qté : {part.quantity}</span>
                    <span>Tech : {technician || "—"}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <PrimaryButton className="h-8 px-3 text-xs" onClick={() => goToRepair(repair.id)}>
                      Voir dossier
                    </PrimaryButton>
                    <SecondaryButton className="h-8 px-3 text-xs" onClick={() => goToCustomer(customer?.id)}>
                      Voir client
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTrace label="Aucune réparation ne consomme encore cette référence." />
          )}
        </TraceSection>

        <TraceSection title="Historique mouvements" icon={History}>
          {trace.movements.length ? (
            <div className="space-y-2">
              {trace.movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-start justify-between gap-3 rounded-[8px] border border-[#E4E7EC] p-3"
                >
                  <div>
                    <p className="font-semibold text-[#101828] text-xs">{MOVEMENT_LABEL[movement.movementType]}</p>
                    <p className="mt-0.5 text-[#667085] text-[11px]">
                      {movement.reason || movement.note || "Mouvement stock"}
                    </p>
                    <p className="mt-1 font-mono text-[#98A2B3] text-[10.5px]">{shortDate(movement.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-semibold text-sm",
                        movement.quantityDelta < 0 ? "text-[#B42318]" : "text-[#167B70]",
                      )}
                    >
                      {movement.quantityDelta > 0 ? "+" : ""}
                      {movement.quantityDelta}
                    </p>
                    <p className="text-[#667085] text-[11px]">
                      {movement.quantityBefore} → {movement.quantityAfter}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTrace label="Aucun mouvement stock enregistré pour cette référence." />
          )}
        </TraceSection>
      </div>
    </Modal>
  );
}

export function PartReferenceLink({
  reference,
  className,
  children,
  stopPropagation = true,
}: Readonly<{
  reference?: string;
  className?: string;
  children?: React.ReactNode;
  stopPropagation?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  if (!reference) return <span className={className}>—</span>;
  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex max-w-full items-center rounded-[6px] font-mono font-semibold text-[#167B70] text-xs underline-offset-2 hover:underline",
          className,
        )}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          setOpen(true);
        }}
      >
        {children ?? reference}
      </button>
      {open && <PartTraceabilityModal reference={reference} onClose={() => setOpen(false)} />}
    </>
  );
}
