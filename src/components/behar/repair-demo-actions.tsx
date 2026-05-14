"use client";

import { useState } from "react";

import Link from "next/link";

import { FileText, Mail, MessageCircle, PackageCheck, WalletCards } from "lucide-react";

import { DetailRow, PrimaryButton, SecondaryButton, StatusBadge, SuccessNote } from "@/components/behar/primitives";
import { demoScenario } from "@/mock/demo";
import { initialMessageLogs } from "@/mock/messageLogs";

export function RepairDemoActions() {
  const [partSelected, setPartSelected] = useState(false);
  const [paid, setPaid] = useState(false);
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<typeof initialMessageLogs>([]);

  const sendLog = (channel: "SMS" | "Email") => {
    const log = channel === "SMS" ? initialMessageLogs[0] : initialMessageLogs[1];
    setLogs((current) => (current.some((item) => item.id === log.id) ? current : [...current, log]));
    setMessage(`${channel} simulé envoyé et ajouté dans message_logs.`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const cashIn = () => {
    setPaid(true);
    setMessage("Paiement simulé reçu. Le reçu est disponible, sans obligation d’envoi au client.");
    window.setTimeout(() => setMessage(""), 3500);
  };

  return (
    <div className="space-y-5">
      {message && <SuccessNote>{message}</SuccessNote>}

      <div className="rounded-2xl border border-black/[0.06] bg-white/75 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-[#1A1916]">Pièce sélectionnée depuis le stock</h3>
          <StatusBadge status={partSelected ? "En stock" : "En attente"} />
        </div>
        <select
          className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]/50"
          onChange={(event) => setPartSelected(Boolean(event.target.value))}
          value={partSelected ? demoScenario.part.reference : ""}
        >
          <option value="">Sélectionner une pièce</option>
          <option value={demoScenario.part.reference}>
            {demoScenario.part.part} — {demoScenario.part.reference}
          </option>
        </select>

        {partSelected && (
          <dl className="mt-4 divide-y divide-black/[0.06]">
            <DetailRow label="Prix d’achat interne" value={demoScenario.part.purchasePrice} />
            <DetailRow label="Prix de vente client" value={demoScenario.part.salePrice} />
            <DetailRow label="Marge" value={demoScenario.part.margin} />
            <DetailRow label="Stock actuel" value={`${demoScenario.part.stockBefore} unités`} />
            <DetailRow label="Après utilisation" value={`${demoScenario.part.stockAfter} unités`} />
          </dl>
        )}
      </div>

      <div className="grid gap-2">
        <SecondaryButton className="w-full" onClick={() => sendLog("SMS")}>
          <MessageCircle className="size-4" />
          Envoyer SMS
        </SecondaryButton>
        <SecondaryButton className="w-full" onClick={() => sendLog("Email")}>
          <Mail className="size-4" />
          Envoyer email
        </SecondaryButton>
        <SecondaryButton className="w-full" onClick={() => setPartSelected(true)}>
          <PackageCheck className="size-4" />
          Utiliser la pièce stock
        </SecondaryButton>
        <PrimaryButton className="w-full" onClick={cashIn}>
          <WalletCards className="size-4" />
          Encaisser 189,00 €
        </PrimaryButton>
      </div>

      {paid && (
        <div className="rounded-2xl border border-[#2A9D8F]/20 bg-[#EAF6F2] p-4">
          <p className="font-semibold text-[#1A1916]">Paiement simulé encaissé</p>
          <p className="mt-1 text-[#6B6B6B] text-sm">
            Le réparateur peut s’arrêter ici, imprimer le reçu, ou l’envoyer plus tard.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SecondaryButton asChild>
              <Link href="/dashboard/documents" prefetch={false}>
                <FileText className="size-4" />
                Voir reçu / facture
              </Link>
            </SecondaryButton>
            <SecondaryButton onClick={() => sendLog("SMS")}>SMS reçu simulé</SecondaryButton>
            <SecondaryButton onClick={() => sendLog("Email")}>Email reçu simulé</SecondaryButton>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="rounded-2xl border border-black/[0.06] bg-white/75 p-4">
          <h3 className="mb-3 font-semibold text-[#1A1916]">message_logs</h3>
          <div className="space-y-3">
            {logs.map((log) => (
              <div className="text-sm" key={log.id}>
                <p className="font-medium">
                  {log.channel} · {log.sentAt}
                </p>
                <p className="text-[#6B6B6B]">{log.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
