import "server-only";

import { providerJson } from "./http";

type SumUpReaderResponse = { id?: string; name?: string };

function readerUrl(merchantCode: string, readerId?: string) {
  const base = `https://api.sumup.com/v0.1/merchants/${encodeURIComponent(merchantCode)}/readers`;
  return readerId ? `${base}/${encodeURIComponent(readerId)}` : base;
}

export async function pairSumUpReader(input: {
  accessToken: string;
  merchantCode: string;
  pairingCode: string;
  readerName: string;
}) {
  const response = await fetch(readerUrl(input.merchantCode), {
    method: "POST",
    headers: { authorization: `Bearer ${input.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ pairing_code: input.pairingCode, name: input.readerName }),
    cache: "no-store",
  });
  const reader = await providerJson<SumUpReaderResponse>(response, "Association du terminal SumUp impossible.");
  if (!reader.id || !reader.name) throw new Error("Identifiant du terminal SumUp absent.");
  return { readerId: reader.id, readerName: reader.name };
}

export async function unpairSumUpReader(input: { accessToken: string; merchantCode: string; readerId: string }) {
  const response = await fetch(readerUrl(input.merchantCode, input.readerId), {
    method: "DELETE",
    headers: { authorization: `Bearer ${input.accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Dissociation du terminal SumUp impossible.");
}
