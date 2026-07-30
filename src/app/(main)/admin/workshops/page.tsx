"use client";

import { useEffect, useState } from "react";

import { Building2, History, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";

import {
  type AdminAuditRow,
  type AdminWorkshopRow,
  fetchAdminWorkshops,
  fetchWorkshopAudit,
  isWorkshopAdminAuthed,
  loginWorkshopAdmin,
  setWorkshopPlan,
  setWorkshopRegistration,
} from "./actions";

const PLAN_OPTIONS = ["free", "starter", "pro", "business"];

const inputCls =
  "h-11 w-full rounded-[12px] border border-[#E4E7EC] bg-white px-3 text-[#101828] text-sm outline-none focus:border-[#2A9D8F]";

const FIELD_LABELS: Record<string, string> = {
  siret: "Numéro d’immatriculation",
  has_billing: "Facturation",
  plan: "Forfait",
};

export default function AdminWorkshopsPage() {
  const [authState, setAuthState] = useState<"checking" | "locked" | "unlocked">("checking");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workshops, setWorkshops] = useState<AdminWorkshopRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [audit, setAudit] = useState<AdminAuditRow[]>([]);
  const [blockingError, setBlockingError] = useState("");

  useEffect(() => {
    isWorkshopAdminAuthed().then((ok) => {
      setAuthState(ok ? "unlocked" : "locked");
      if (ok) void load();
    });
  }, []);

  async function load() {
    try {
      const rows = await fetchAdminWorkshops();
      setBlockingError("");
      setWorkshops(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, row.siret ?? ""])));
    } catch (error) {
      setWorkshops([]);
      setBlockingError(error instanceof Error ? error.message : "Console indisponible.");
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await loginWorkshopAdmin(password);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.message || "Accès refusé");
      return;
    }
    setPassword("");
    setAuthState("unlocked");
    void load();
  }

  async function applyRegistration(row: AdminWorkshopRow, hasBilling: boolean) {
    setBusyId(row.id);
    const result = await setWorkshopRegistration({
      workshopId: row.id,
      registrationNumber: drafts[row.id] ?? "",
      hasBilling,
    });
    setBusyId(null);
    if (!result.success) {
      toast.error(result.message || "Modification refusée.");
      return;
    }
    toast.success(hasBilling ? "Facturation activée." : "Facturation retirée.");
    void load();
  }

  async function applyPlan(row: AdminWorkshopRow, plan: string) {
    setBusyId(row.id);
    const result = await setWorkshopPlan({ workshopId: row.id, plan });
    setBusyId(null);
    if (!result.success) {
      toast.error(result.message || "Forfait non modifié.");
      return;
    }
    toast.success("Forfait mis à jour.");
    void load();
  }

  async function toggleAudit(workshopId: string) {
    if (auditFor === workshopId) {
      setAuditFor(null);
      setAudit([]);
      return;
    }
    setAuditFor(workshopId);
    setAudit(await fetchWorkshopAudit(workshopId));
  }

  if (authState === "checking") {
    return <div className="grid min-h-[60vh] place-items-center text-[#667085] text-sm">Vérification…</div>;
  }

  if (authState === "locked") {
    return (
      <div className="grid min-h-[70vh] place-items-center px-5">
        <form
          className="w-full max-w-[400px] rounded-[18px] border border-[#E4E7EC] bg-white p-6 shadow-sm"
          onSubmit={handleLogin}
        >
          <ShieldCheck className="size-6 text-[#2A9D8F]" />
          <h1 className="mt-3 font-bold text-[#101828] text-xl">Console ateliers</h1>
          <p className="mt-1 text-[#667085] text-sm">Accès réservé à l’administration Behar Tech.</p>
          <input
            autoFocus
            className={`${inputCls} mt-5`}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe administrateur"
            type="password"
            value={password}
          />
          <PrimaryButton className="mt-4 w-full justify-center" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Vérification…" : "Ouvrir la console"}
          </PrimaryButton>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Building2 className="size-6 text-[#2A9D8F]" />
        <div>
          <h1 className="font-bold text-[#101828] text-2xl tracking-tight">Ateliers</h1>
          <p className="text-[#667085] text-sm">
            Immatriculation, capacité de facturation et forfait. Toute modification est journalisée.
          </p>
        </div>
      </header>

      {blockingError ? (
        <p className="rounded-[18px] border border-[#F2C8C3] bg-white p-6 text-[#7A271A] text-sm">{blockingError}</p>
      ) : null}

      {!blockingError && workshops.length === 0 ? (
        <p className="rounded-[18px] border border-[#E4E7EC] bg-white p-6 text-[#667085] text-sm">
          Aucun atelier. Vérifiez que la service key Supabase est configurée sur ce serveur.
        </p>
      ) : null}

      <div className="space-y-3">
        {workshops.map((row) => (
          <section className="rounded-[18px] border border-[#E4E7EC] bg-white p-4" key={row.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#101828] text-[15px]">{row.commercialName || row.name}</p>
                <p className="text-[#667085] text-xs">
                  {row.country} · créé le {new Date(row.createdAt).toLocaleDateString("fr-FR")} · {row.id}
                </p>
              </div>
              <span
                className={
                  row.hasBilling
                    ? "rounded-full bg-[#F1FAF8] px-3 py-1 font-semibold text-[#1E7A6E] text-xs"
                    : "rounded-full bg-[#F9FAFB] px-3 py-1 font-semibold text-[#667085] text-xs"
                }
              >
                {row.hasBilling ? "Facturation active" : "Sans facturation"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px_auto]">
              <label className="block">
                <span className="mb-1 block text-[#667085] text-xs">
                  {row.country === "CH" ? "IDE / UID" : "SIRET"}
                </span>
                <input
                  className={inputCls}
                  onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                  placeholder={row.country === "CH" ? "CHE-123.456.789" : "12345678900012"}
                  value={drafts[row.id] ?? ""}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[#667085] text-xs">Forfait</span>
                <select
                  className={inputCls}
                  disabled={busyId === row.id}
                  onChange={(event) => void applyPlan(row, event.target.value)}
                  value={row.plan ?? ""}
                >
                  {row.plan && !PLAN_OPTIONS.includes(row.plan) ? <option value={row.plan}>{row.plan}</option> : null}
                  {row.plan ? null : <option value="">Aucun</option>}
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                {row.hasBilling ? (
                  <SecondaryButton disabled={busyId === row.id} onClick={() => void applyRegistration(row, false)}>
                    Retirer la facturation
                  </SecondaryButton>
                ) : (
                  <PrimaryButton disabled={busyId === row.id} onClick={() => void applyRegistration(row, true)}>
                    Activer la facturation
                  </PrimaryButton>
                )}
                {row.hasBilling ? (
                  <SecondaryButton disabled={busyId === row.id} onClick={() => void applyRegistration(row, true)}>
                    Corriger le numéro
                  </SecondaryButton>
                ) : null}
              </div>
            </div>

            <button
              className="mt-3 inline-flex items-center gap-1.5 text-[#667085] text-xs hover:text-[#101828]"
              onClick={() => void toggleAudit(row.id)}
              type="button"
            >
              <History className="size-3.5" />
              {auditFor === row.id ? "Masquer l’historique" : "Historique des modifications"}
            </button>

            {auditFor === row.id ? (
              <div className="mt-3 overflow-x-auto rounded-[12px] border border-[#E4E7EC]">
                {audit.length === 0 ? (
                  <p className="p-3 text-[#667085] text-xs">Aucune modification enregistrée.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9FAFB] text-[#667085]">
                      <tr>
                        <th className="p-2 font-semibold">Date</th>
                        <th className="p-2 font-semibold">Opérateur</th>
                        <th className="p-2 font-semibold">Champ</th>
                        <th className="p-2 font-semibold">Avant</th>
                        <th className="p-2 font-semibold">Après</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E7EC]">
                      {audit.map((entry) => (
                        <tr key={entry.id}>
                          <td className="p-2 text-[#667085]">{new Date(entry.createdAt).toLocaleString("fr-FR")}</td>
                          <td className="p-2 text-[#667085]">{entry.actor}</td>
                          <td className="p-2 text-[#101828]">{FIELD_LABELS[entry.field] ?? entry.field}</td>
                          <td className="p-2 text-[#667085]">{entry.previousValue ?? "—"}</td>
                          <td className="p-2 font-medium text-[#101828]">{entry.nextValue ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
