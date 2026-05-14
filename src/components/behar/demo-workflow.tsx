"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { CheckCircle2, FileArchive, RotateCcw, Send, Sparkles, WalletCards } from "lucide-react";

import { DemoTimeline } from "@/components/behar/demo-timeline";
import {
  DetailRow,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  SuccessNote,
} from "@/components/behar/primitives";
import { demoDocuments, demoScenario, demoSteps, demoTimeline } from "@/mock/demo";
import { initialMessageLogs } from "@/mock/messageLogs";

const storageKey = "behar-demo-workflow";

type DemoState = {
  completed: string[];
  invoicePaid: boolean;
  stockAfter: number;
  messages: typeof initialMessageLogs;
  toast: string;
};

const initialState: DemoState = {
  completed: [],
  invoicePaid: false,
  stockAfter: demoScenario.part.stockBefore,
  messages: [],
  toast: "",
};

export function DemoWorkflow() {
  const [state, setState] = useState<DemoState>(initialState);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      setState(JSON.parse(raw));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const progress = Math.round((state.completed.length / demoSteps.length) * 100);
  const nextStep = useMemo(() => demoSteps.find((step) => !state.completed.includes(step.id)), [state.completed]);

  const completeStep = (stepId: string) => {
    setState((current) => {
      const completed = current.completed.includes(stepId) ? current.completed : [...current.completed, stepId];
      const invoicePaid = stepId === "payment" ? true : current.invoicePaid;
      const stockAfter = stepId === "repair" ? demoScenario.part.stockAfter : current.stockAfter;

      return {
        ...current,
        completed,
        invoicePaid,
        stockAfter,
        messages: stepId === "summary" && current.messages.length === 0 ? initialMessageLogs : current.messages,
        toast: `Étape validée : ${demoSteps.find((step) => step.id === stepId)?.title}`,
      };
    });
    window.setTimeout(() => setState((current) => ({ ...current, toast: "" })), 2800);
  };

  const resetDemo = () => {
    window.localStorage.removeItem(storageKey);
    setState({ ...initialState, toast: "Parcours réinitialisé. Tu peux recommencer." });
    window.setTimeout(() => setState((current) => ({ ...current, toast: "" })), 2800);
  };

  const simulateMessage = (channel: "SMS" | "Email") => {
    const log = channel === "SMS" ? initialMessageLogs[0] : initialMessageLogs[1];
    setState((current) => ({
      ...current,
      messages: current.messages.some((item) => item.id === log.id) ? current.messages : [...current.messages, log],
      toast: `${channel} simulé ajouté à l’historique message_logs.`,
    }));
    window.setTimeout(() => setState((current) => ({ ...current, toast: "" })), 2800);
  };

  return (
    <div className="space-y-5">
      {state.toast && <SuccessNote>{state.toast}</SuccessNote>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-[#2A9D8F] text-sm">Parcours guidé · Données locales</p>
              <h2 className="mt-1 font-semibold text-2xl text-[#1A1916]">Parcours complet Belmin / iPhone 13</h2>
              <p className="mt-2 text-[#6B6B6B] text-sm">
                Clique les étapes dans l’ordre pour simuler client, réparation, devis, facture, paiement et documents.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton onClick={resetDemo}>
                <RotateCcw className="size-4" />
                Réinitialiser le parcours
              </SecondaryButton>
              <SecondaryButton asChild>
                <Link href="/dashboard/documents" prefetch={false}>
                  <FileArchive className="size-4" />
                  Exporter le dossier
                </Link>
              </SecondaryButton>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-black/[0.07] bg-[#FAFAF8] p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-[#1A1916]">Progression</span>
              <span className="font-semibold text-[#2A9D8F]">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-[#2A9D8F] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {demoSteps.map((step) => {
              const Icon = step.icon;
              const done = state.completed.includes(step.id);
              const current = nextStep?.id === step.id;

              return (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${
                    done
                      ? "border-[#2A9D8F]/25 bg-[#EAF6F2]"
                      : current
                        ? "border-[#2A9D8F] bg-white shadow-[0_14px_34px_rgba(42,157,143,0.10)]"
                        : "border-black/[0.07] bg-white/78"
                  }`}
                  key={step.id}
                  onClick={() => completeStep(step.id)}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#E8F7F3] text-[#2A9D8F]">
                      {done ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                    </span>
                    <span>
                      <span className="block font-semibold text-[#1A1916]">{step.title}</span>
                      <span className="mt-1 block text-[#6B6B6B] text-sm">{step.description}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-[#1A1916] text-xl">Résumé live</h2>
              <p className="mt-1 text-[#6B6B6B] text-sm">État local du parcours guidé</p>
            </div>
            <StatusBadge status={state.invoicePaid ? "Payée" : "Brouillon"} />
          </div>
          <dl className="divide-y divide-black/[0.06]">
            <DetailRow label="Client" value={demoScenario.client.name} />
            <DetailRow label="Appareil" value={demoScenario.repair.device} />
            <DetailRow label="Statut réparation" value={demoScenario.repair.status} />
            <DetailRow label="Stock avant" value={`${demoScenario.part.stockBefore} unités`} />
            <DetailRow label="Stock après" value={`${state.stockAfter} unités`} />
            <DetailRow label="Marge pièce" value={demoScenario.part.margin} />
            <DetailRow emphasize label="Marge totale estimée" value={demoScenario.margins.total} />
            <DetailRow label="Paiement" value={state.invoicePaid ? "Réussi" : "Non payé"} />
          </dl>

          <div className="mt-6 grid gap-2">
            <PrimaryButton onClick={() => completeStep("payment")}>
              <WalletCards className="size-4" />
              Marquer comme payé
            </PrimaryButton>
            <SecondaryButton onClick={() => simulateMessage("SMS")}>
              <Send className="size-4" />
              Envoyer SMS simulé
            </SecondaryButton>
            <SecondaryButton onClick={() => simulateMessage("Email")}>
              <Send className="size-4" />
              Envoyer email simulé
            </SecondaryButton>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-6">
          <h2 className="mb-4 font-semibold text-[#1A1916] text-xl">Timeline complète</h2>
          <DemoTimeline items={demoTimeline} />
        </Panel>

        <Panel className="p-6">
          <h2 className="mb-4 font-semibold text-[#1A1916] text-xl">Documents disponibles</h2>
          <div className="space-y-3">
            {demoDocuments.map((doc) => (
              <Link
                className="block rounded-2xl border border-black/[0.07] bg-white/76 p-4 transition hover:bg-[#EAF6F2]"
                href="/dashboard/documents"
                key={doc.id}
                prefetch={false}
              >
                <span className="font-semibold text-[#1A1916]">{doc.title}</span>
                <span className="mt-1 block text-[#6B6B6B] text-sm">{doc.description}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      <Panel className="p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-[#1A1916] text-xl">
          <Sparkles className="size-5 text-[#2A9D8F]" />
          Historique message_logs simulé
        </h2>
        {state.messages.length === 0 ? (
          <p className="text-[#6B6B6B] text-sm">Aucun message simulé pour l’instant.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {state.messages.map((message) => (
              <div className="rounded-2xl border border-black/[0.07] bg-white/78 p-4 text-sm" key={message.id}>
                <p className="font-semibold text-[#1A1916]">
                  {message.channel} · {message.status}
                </p>
                <p className="mt-1 text-[#6B6B6B]">{message.sentAt}</p>
                {"subject" in message && message.subject && <p className="mt-2 font-medium">{message.subject}</p>}
                <p className="mt-2 text-[#1A1916]">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
