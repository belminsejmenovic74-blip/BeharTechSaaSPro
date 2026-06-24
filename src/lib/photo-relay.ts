// photo-relay — relais cross-device des photos via Supabase Realtime (broadcast).
// Le PC (récepteur) et le téléphone (émetteur) rejoignent le même canal `recond-capture:{token}`.
// Les photos (data URL) sont découpées en chunks pour ne pas dépasser la taille max d'un message.

import { getSupabase } from "@/lib/supabase/client";

const CHUNK_SIZE = 80_000;
const channelName = (token: string) => `recond-capture:${token}`;

export type RelayPhoto = { slot: string; dataUrl: string };

export function makeRelayToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

type ChunkPayload = { id?: string; slot?: string; index?: number; total?: number; data?: string };

/** Côté PC : reçoit les photos. Renvoie une fonction de fermeture, ou null si Supabase non configuré. */
export function openReceiverRelay(
  token: string,
  handlers: { onPhoto: (photo: RelayPhoto) => void; onPeer?: () => void },
): (() => void) | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  const channel = supabase.channel(channelName(token), { config: { broadcast: { self: false } } });
  const buffers = new Map<string, { slot: string; total: number; parts: string[]; received: number }>();

  channel.on("broadcast", { event: "hello" }, () => handlers.onPeer?.());
  channel.on("broadcast", { event: "chunk" }, (message) => {
    const p = message.payload as ChunkPayload;
    if (typeof p.id !== "string" || typeof p.index !== "number" || typeof p.total !== "number") return;
    let buf = buffers.get(p.id);
    if (!buf) {
      buf = { slot: p.slot ?? "", total: p.total, parts: new Array(p.total).fill(""), received: 0 };
      buffers.set(p.id, buf);
    }
    if (buf.parts[p.index] === "") buf.received += 1;
    buf.parts[p.index] = String(p.data ?? "");
    if (buf.received >= buf.total) {
      handlers.onPhoto({ slot: buf.slot, dataUrl: buf.parts.join("") });
      buffers.delete(p.id);
    }
  });
  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export type SenderRelay = { send: (photo: RelayPhoto) => Promise<void>; close: () => void };

/** Côté téléphone : envoie les photos. Renvoie l'API d'envoi, ou null si Supabase non configuré. */
export function openSenderRelay(token: string, handlers?: { onConnected?: () => void }): SenderRelay | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  const channel = supabase.channel(channelName(token), { config: { broadcast: { self: false } } });
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      void channel.send({ type: "broadcast", event: "hello", payload: {} });
      handlers?.onConnected?.();
    }
  });

  const send = async ({ slot, dataUrl }: RelayPhoto) => {
    const id = Math.random().toString(36).slice(2, 9);
    const total = Math.max(1, Math.ceil(dataUrl.length / CHUNK_SIZE));
    for (let i = 0; i < total; i += 1) {
      const data = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await channel.send({ type: "broadcast", event: "chunk", payload: { id, slot, index: i, total, data } });
    }
  };

  return { send, close: () => void supabase.removeChannel(channel) };
}
