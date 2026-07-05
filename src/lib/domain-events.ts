"use client";

import type { Sale } from "@/lib/behar-store";

export type DomainEvent =
  | { type: "counter_sale.completed"; sale: Sale; paymentId: string; occurredAt: string }
  | { type: "counter_sale.cancelled"; sale: Sale; occurredAt: string }
  | { type: "stock.movement_created"; movementId: string; occurredAt: string }
  | { type: "reconditioning.device_sold"; deviceId: string; saleId: string; occurredAt: string }
  | { type: "public_certificate.updated"; deviceId: string; publicToken: string; occurredAt: string };

type DomainEventType = DomainEvent["type"];
type Handler<T extends DomainEventType> = (event: Extract<DomainEvent, { type: T }>) => void;

const handlers = new Map<DomainEventType, Set<(event: DomainEvent) => void>>();

export function subscribeDomainEvent<T extends DomainEventType>(type: T, handler: Handler<T>): () => void {
  const typed = handler as (event: DomainEvent) => void;
  const bucket = handlers.get(type) ?? new Set<(event: DomainEvent) => void>();
  bucket.add(typed);
  handlers.set(type, bucket);
  return () => {
    bucket.delete(typed);
    if (!bucket.size) handlers.delete(type);
  };
}

export function publishDomainEvent(event: DomainEvent): void {
  const bucket = handlers.get(event.type);
  if (!bucket?.size) return;
  for (const handler of bucket) {
    try {
      handler(event);
    } catch (error) {
      console.error("[domain-events] handler failed", event.type, error);
    }
  }
}
