"use client";

import { useEffect, useRef, useState } from "react";

import { Plus } from "lucide-react";

import { StatusBadge } from "@/components/behar/primitives";
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
  const suppressNextClickRef = useRef(false);
  const pointerDragRef = useRef<{
    cardId: string;
    fromStatus: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const columnAtPoint = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    return element?.closest<HTMLElement>("[data-kanban-column]")?.dataset.kanbanColumn ?? null;
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      // overscroll-x-contain : en bout de board, le swipe horizontal ne déclenche pas
      // le geste « page précédente » du navigateur (macOS/trackpad).
      className={cn("grid h-full min-h-0 gap-2.5 overflow-x-auto overscroll-x-contain pb-1 kanban-scroll")}
      style={{
        // Une piste par colonne réelle (corrige l'ancien repeat(5) qui faisait passer
        // la 6e colonne « Prêt » à la ligne) + colonnes plus larges pour aérer le board.
        gridTemplateColumns: `repeat(${columns.length}, minmax(${compact ? 150 : 184}px, 1fr))`,
      }}
    >
      {columns.map((column) => (
        <div
          key={column.title}
          data-kanban-column={column.title}
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
          <div
            className={cn(
              "flex h-[690px] min-h-0 min-w-0 flex-col rounded-[14px] border border-[#EEEEEC] bg-white p-3 md:h-full md:min-h-[420px] transition",
              dragOverColumn === column.title && "ring-2 ring-[#2A9D8F]/40",
            )}
          >
            <div className="mb-3 flex shrink-0 items-center gap-2 px-0.5">
              <h3 className="font-semibold text-[#1A1916] text-[15px]">{column.title}</h3>
              <span className="font-semibold text-[#6B6B6B] text-xs">{column.count}</span>
            </div>
            {/* overscroll-y-contain (et pas overscroll-contain) : on bloque la chaîne de scroll
                verticale vers la page, mais le scroll horizontal doit remonter au board —
                sinon la molette gauche/droite ne marche pas quand le curseur est sur les cartes. */}
            <div className="kanban-scroll min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
              {column.cards.map((card) => (
                <RepairCardView
                  card={card}
                  key={card.id}
                  onSelect={(id) => {
                    if (suppressNextClickRef.current) return;
                    onSelect?.(id);
                  }}
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
                  onPointerDown={(e) => {
                    if (!onMoveCard || e.pointerType === "mouse") return;
                    pointerDragRef.current = {
                      cardId: card.id,
                      fromStatus: column.title,
                      startX: e.clientX,
                      startY: e.clientY,
                      active: false,
                    };
                  }}
                  onPointerMove={(e) => {
                    const current = pointerDragRef.current;
                    if (!onMoveCard || !current || current.cardId !== card.id) return;
                    const moved = Math.hypot(e.clientX - current.startX, e.clientY - current.startY);
                    if (!current.active && moved < 8) return;
                    e.preventDefault();
                    current.active = true;
                    setDraggingId(current.cardId);
                    const over = columnAtPoint(e.clientX, e.clientY);
                    setDragOverColumn(over);
                  }}
                  onPointerUp={(e) => {
                    const current = pointerDragRef.current;
                    if (!onMoveCard || !current || current.cardId !== card.id) return;
                    const over = columnAtPoint(e.clientX, e.clientY);
                    const shouldMove = current.active && over && over !== current.fromStatus;
                    if (current.active) {
                      suppressNextClickRef.current = true;
                      window.setTimeout(() => {
                        suppressNextClickRef.current = false;
                      }, 0);
                    }
                    pointerDragRef.current = null;
                    setDraggingId(null);
                    setDragOverColumn(null);
                    if (shouldMove) onMoveCard(current.cardId, current.fromStatus, over);
                  }}
                  onPointerCancel={() => {
                    pointerDragRef.current = null;
                    setDraggingId(null);
                    setDragOverColumn(null);
                  }}
                />
              ))}
            </div>
            {!compact && (
              <button
                className="mt-3 flex shrink-0 items-center gap-2 rounded-xl px-2 py-2.5 text-[#6B6B6B] text-sm transition hover:bg-[#FFFFFF] hover:text-[#1A1916]"
                onClick={() => onAdd?.(column.title)}
                type="button"
              >
                <Plus className="size-4" />
                Ajouter une réparation
              </button>
            )}
          </div>
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Readonly<{
  card: RepairCard;
  selected?: boolean;
  onSelect?: (id: string) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: () => void;
}>) {
  return (
    <button
      className={cn(
        "w-full rounded-[14px] border border-[#E8E8E5] bg-white p-[14px] text-left shadow-[0_1px_2px_rgba(26,25,22,0.035)] transition hover:border-[#2A9D8F]/40",
        selected && "border-[#2A9D8F] bg-[#FFFFFF] shadow-[0_1px_3px_rgba(42,157,143,0.10)]",
        draggable && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      draggable={draggable}
      onClick={() => onSelect?.(card.id)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {card.paymentPaid !== undefined ? (
              <span className={cn("font-semibold text-[10px]", card.paymentPaid ? "text-[#147065]" : "text-[#6B6B6B]")}>
                {card.paymentPaid ? "Payé" : "Non payé"}
              </span>
            ) : null}
            {card.showCounterBadge ? (
              <span className="font-semibold text-[#6B6B6B] text-[10px]">Client comptoir</span>
            ) : null}
            {card.showInvoiceBadge ? (
              <span className="font-semibold text-[#6B6B6B] text-[10px]">Facture à créer</span>
            ) : null}
            {card.showReadyBadge ? <span className="font-semibold text-[#147065] text-[10px]">Prêt</span> : null}
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
