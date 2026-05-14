"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Panel, StatusBadge } from "@/components/behar/primitives";
import { cn } from "@/lib/utils";
import type { RepairCard } from "@/mock/repairs";

export function KanbanBoard({
  columns,
  selectedId,
  compact,
  onSelect,
  onAdd,
  onMoveCard,
}: Readonly<{
  columns: Array<{ title: string; count: number; cards: RepairCard[] }>;
  selectedId: string;
  compact?: boolean;
  onSelect?: (id: string) => void;
  onAdd?: (status: string) => void;
  onMoveCard?: (cardId: string, fromStatus: string, toStatus: string) => void;
}>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "grid gap-2.5 overflow-x-auto pb-1",
        compact ? "grid-cols-[repeat(4,minmax(160px,1fr))]" : "grid-cols-[repeat(5,minmax(164px,1fr))]",
      )}
    >
      {columns.map((column) => (
        <div
          key={column.title}
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
            if (!onMoveCard) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverColumn !== column.title) setDragOverColumn(column.title);
          }}
          onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOverColumn((current) => (current === column.title ? null : current));
          }}
          onDrop={(e: React.DragEvent<HTMLDivElement>) => {
            if (!onMoveCard) return;
            e.preventDefault();
            const cardId = e.dataTransfer.getData("text/repair-id");
            const fromStatus = e.dataTransfer.getData("text/from-status");
            setDragOverColumn(null);
            setDraggingId(null);
            if (cardId && fromStatus !== column.title) {
              onMoveCard(cardId, fromStatus, column.title);
            }
          }}
          className="contents"
        >
          <Panel
            className={cn(
              "flex h-[690px] min-w-0 flex-col rounded-[14px] p-3 shadow-[0_8px_22px_rgba(26,25,22,0.025)] md:h-full md:min-h-[500px] transition",
              dragOverColumn === column.title && "ring-2 ring-[#2A9D8F]/40 bg-[#F3FBF8]/30",
            )}
          >
            <div className="mb-3 flex shrink-0 items-center gap-2 px-0.5">
              <h3 className="font-semibold text-[#1A1916] text-[15px]">{column.title}</h3>
              <span className="rounded-full bg-[#F1F1EF] px-2 py-0.5 font-medium text-[#6B6B6B] text-xs">
                {column.count}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
              {column.cards.map((card) => (
                <RepairCardView
                  card={card}
                  key={card.id}
                  onSelect={onSelect}
                  selected={card.id === selectedId}
                  draggable={Boolean(onMoveCard)}
                  isDragging={draggingId === card.id}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/repair-id", card.id);
                    e.dataTransfer.setData("text/from-status", column.title);
                    setDraggingId(card.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverColumn(null);
                  }}
                />
              ))}
            </div>
            {!compact && (
              <button
                className="mt-3 flex shrink-0 items-center gap-2 rounded-xl px-2 py-2.5 text-[#6B6B6B] text-sm transition hover:bg-[#FAFAF8] hover:text-[#1A1916]"
                onClick={() => onAdd?.(column.title)}
                type="button"
              >
                <Plus className="size-4" />
                Ajouter une réparation
              </button>
            )}
          </Panel>
        </div>
      ))}
    </div>
  );
}

function RepairCardView({
  card,
  selected,
  onSelect,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
}: Readonly<{
  card: RepairCard;
  selected?: boolean;
  onSelect?: (id: string) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
}>) {
  return (
    <button
      className={cn(
        "w-full rounded-[14px] border border-[#E7E4DC] bg-white/95 p-[14px] text-left shadow-[0_10px_28px_rgba(26,25,22,0.035)] backdrop-blur-[2px] transition hover:border-[#2A9D8F]/40",
        selected && "border-[#2A9D8F] bg-[#F3FBFA] shadow-[0_14px_32px_rgba(42,157,143,0.10)]",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      draggable={draggable}
      onClick={() => onSelect?.(card.id)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      type="button"
    >
      <div className="min-w-0">
        {card.number && (
          <p className="mb-2 font-semibold text-[#2A9D8F] text-[11px] uppercase tracking-[0.04em]">{card.number}</p>
        )}
        <h4 className="truncate font-semibold text-[#1A1916] text-[13px] leading-tight">{card.device}</h4>
        <p className="mt-1 line-clamp-2 text-[#6B6B6B] text-[11px] leading-snug">{card.issue}</p>
        <p className="mt-2 truncate font-medium text-[#1A1916] text-[11px]">{card.customer}</p>
        {card.totalLabel && (
          <p className="mt-3 font-semibold text-[#1A1916] text-[13px] tabular-nums">{card.totalLabel}</p>
        )}
        {(card.paymentPaid !== undefined || card.showCounterBadge || card.showInvoiceBadge || card.showReadyBadge) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.paymentPaid !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-semibold text-[10px]",
                  card.paymentPaid ? "bg-[#E7F5F1] text-[#147065]" : "bg-[#F1F1EF] text-[#6B6B6B]",
                )}
              >
                {card.paymentPaid ? "Payé" : "Non payé"}
              </span>
            ) : null}
            {card.showCounterBadge ? (
              <span className="rounded-full bg-[#EEF7FF] px-2 py-0.5 font-semibold text-[#426996] text-[10px]">
                Client comptoir
              </span>
            ) : null}
            {card.showInvoiceBadge ? (
              <span className="rounded-full bg-[#FCF1DF] px-2 py-0.5 font-semibold text-[#9A6A17] text-[10px]">
                Facture à créer
              </span>
            ) : null}
            {card.showReadyBadge ? (
              <span className="rounded-full bg-[#E7F5F1] px-2 py-0.5 font-semibold text-[#147065] text-[10px]">
                Prêt
              </span>
            ) : null}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 pt-2">
          <p className="truncate text-[#6B6B6B] text-[10px]">{card.time}</p>
          <StatusBadge className="h-6 shrink-0 px-2 text-[10px]" status={card.status} />
        </div>
      </div>
    </button>
  );
}
