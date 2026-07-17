"use client";

import { useEffect, useState } from "react";
import { Copy, Download, KeyRound, Ban, CheckCircle2, Crown, Mail, UserPlus } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import {
  createFounderClient,
  generateLicenses,
  deactivateLicense,
  fetchLicenses,
  isAdminAuthed,
  loginAdmin,
} from "./actions";
import type { LicenseKey } from "@/lib/supabase/license-types";
import { toast } from "sonner";

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<any[] | null>(null);
  const [authState, setAuthState] = useState<"checking" | "locked" | "unlocked">("checking");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingFounder, setIsCreatingFounder] = useState(false);
  const [founderForm, setFounderForm] = useState({ workshopName: "", email: "", licenseKey: "" });

  useEffect(() => {
    isAdminAuthed().then((ok) => {
      setAuthState(ok ? "unlocked" : "locked");
      if (ok) loadLicenses();
    });
  }, []);

  async function loadLicenses() {
    const data = await fetchLicenses();
    setLicenses(data as LicenseKey[]);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await loginAdmin(password);
    setIsSubmitting(false);
    if (res.success) {
      setPassword("");
      setAuthState("unlocked");
      loadLicenses();
    } else {
      toast.error(res.message || "Accès refusé");
    }
  }

  async function handleGenerate() {
    if (!confirm("Voulez-vous générer 50 nouvelles clés de licence ?")) return;
    setIsGenerating(true);
    const res = await generateLicenses(50);
    setIsGenerating(false);

    if (res.success && res.licenses) {
      setGeneratedBatch(res.licenses);
      toast.success("50 clés générées avec succès !");
      loadLicenses();
    } else {
      toast.error(res.message || "Erreur de génération");
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Voulez-vous désactiver cette clé ?")) return;
    const res = await deactivateLicense(id);
    if (res.success) {
      toast.success("Licence désactivée");
      loadLicenses();
    } else {
      toast.error(res.message || "Erreur");
    }
  }

  async function handleCreateFounder(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingFounder(true);
    const res = await createFounderClient(founderForm);
    setIsCreatingFounder(false);
    if (res.success) {
      toast.success(res.message);
      setFounderForm({ workshopName: "", email: "", licenseKey: "" });
      loadLicenses();
    } else {
      toast.error(res.message);
    }
  }

  function handleExportCsv() {
    if (!generatedBatch) return;

    // Create CSV content
    const headers = ["ID", "Clé Complète", "Lien Téléchargement", "Statut", "Plan"];
    const rows = generatedBatch.map((l) => {
      const downloadLink = `${window.location.origin}/telecharger/${l.token}`;
      return `${l.id},${l.key},${downloadLink},${l.status},${l.plan}`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `behar-tech-licenses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export CSV téléchargé");
  }

  if (authState !== "unlocked") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-[#EAE8E3] bg-white p-8 shadow-sm"
        >
          <div className="flex items-center gap-2 text-[#1A1916]">
            <KeyRound className="size-5 text-[#2A9D8F]" />
            <h1 className="text-lg font-semibold">Espace administrateur</h1>
          </div>
          <p className="mt-1 text-sm text-[#6B6B6B]">Cet espace gère les licences clients. L'accès est réservé.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoFocus
            className="mt-6 w-full rounded-xl border border-[#EAE8E3] bg-white px-4 py-2.5 text-[#1A1916] outline-none focus:border-[#2A9D8F]"
          />
          <PrimaryButton type="submit" disabled={isSubmitting || authState === "checking"} className="mt-4 w-full">
            {isSubmitting ? "Vérification…" : "Accéder"}
          </PrimaryButton>
        </form>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1916] flex items-center gap-2">
            <KeyRound className="size-8 text-[#2A9D8F]" />
            Licences & Téléchargements
          </h1>
          <p className="text-[#6B6B6B] mt-1">Gérez les accès de vos clients et les liens de téléchargement.</p>
        </div>

        <div className="flex items-center gap-3">
          {generatedBatch && (
            <SecondaryButton
              onClick={handleExportCsv}
              className="gap-2 bg-[#E5F5F3] border-[#2A9D8F]/20 text-[#2A9D8F] hover:bg-[#2A9D8F]/20"
            >
              <Download className="size-4" />
              Exporter CSV Complet
            </SecondaryButton>
          )}
          <PrimaryButton onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Génération..." : "Générer 50 clés"}
          </PrimaryButton>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#D8EDEA] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#E8E8E5] bg-[#F3FAF9] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#2A9D8F] p-2.5 text-white">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1916]">
                Donner un accès client fondateur
                <Crown className="size-4 text-[#D69E2E]" />
              </h2>
              <p className="mt-0.5 text-sm text-[#62625E]">
                Pour tes premiers clients : aucun abonnement à choisir, aucun paiement et aucune nouvelle clé.
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-[#B9DDD8] bg-white px-3 py-1 text-xs font-bold text-[#237F74]">
            Tous les accès · sans échéance
          </span>
        </div>

        <form onSubmit={handleCreateFounder} className="grid gap-4 p-6 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-semibold text-[#343431]">
            Nom de l’atelier
            <input
              required
              value={founderForm.workshopName}
              onChange={(event) => setFounderForm((value) => ({ ...value, workshopName: event.target.value }))}
              placeholder="Ex. Réparation Mobile Lyon"
              className="h-11 rounded-xl border border-[#DEDDD8] bg-white px-3.5 font-normal text-[#1A1916] outline-none transition focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/10"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#343431]">
            E-mail du client
            <input
              required
              type="email"
              value={founderForm.email}
              onChange={(event) => setFounderForm((value) => ({ ...value, email: event.target.value }))}
              placeholder="client@atelier.fr"
              className="h-11 rounded-xl border border-[#DEDDD8] bg-white px-3.5 font-normal text-[#1A1916] outline-none transition focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/10"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#343431]">
            Clé déjà remise
            <input
              required
              value={founderForm.licenseKey}
              onChange={(event) =>
                setFounderForm((value) => ({ ...value, licenseKey: event.target.value.toUpperCase() }))
              }
              placeholder="BTP-XXXX-XXXX-XXXX"
              className="h-11 rounded-xl border border-[#DEDDD8] bg-white px-3.5 font-mono font-normal uppercase text-[#1A1916] outline-none transition focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/10"
            />
          </label>
          <PrimaryButton type="submit" disabled={isCreatingFounder} className="h-11 gap-2 lg:px-5">
            <Mail className="size-4" />
            {isCreatingFounder ? "Création…" : "Créer et inviter"}
          </PrimaryButton>
        </form>
        <div className="border-t border-[#EFEFEB] px-6 py-3 text-xs text-[#74746F]">
          La clé rattache automatiquement les anciennes données de l’atelier. Le client clique sur l’e-mail reçu et
          arrive directement dans son espace.
        </div>
      </section>

      {generatedBatch && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl text-[#92400E] text-sm flex gap-3">
          <div className="mt-0.5">
            <KeyRound className="size-4" />
          </div>
          <div>
            <strong>Important :</strong> 50 nouvelles clés viennent d'être générées. C'est le SEUL moment où vous
            pourrez les exporter complètes. Les clés complètes ne seront plus jamais affichées une fois cette page
            rechargée.
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E8E5]">
              <tr>
                <th className="px-6 py-4 font-bold text-[#1A1916]">Aperçu de la Clé</th>
                <th className="px-6 py-4 font-bold text-[#1A1916]">Statut</th>
                <th className="px-6 py-4 font-bold text-[#1A1916]">Plan</th>
                <th className="px-6 py-4 font-bold text-[#1A1916]">Création</th>
                <th className="px-6 py-4 font-bold text-[#1A1916]">Téléchargements</th>
                <th className="px-6 py-4 font-bold text-[#1A1916]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E5]">
              {licenses.map((lic) => (
                <tr key={lic.id} className="hover:bg-[#FAFAF8]/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-[#1A1916]">{lic.key_preview}</td>
                  <td className="px-6 py-4">
                    {lic.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E5F5F3] text-[#2A9D8F] text-xs font-bold">
                        <CheckCircle2 className="size-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626] text-xs font-bold">
                        <Ban className="size-3" /> {lic.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 uppercase text-xs font-bold text-[#6B6B6B]">
                    {lic.founder_access ? "Fondateur" : lic.plan}
                  </td>
                  <td className="px-6 py-4 text-[#6B6B6B]">{new Date(lic.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1A1916]">{lic.download_count}</span>
                      {lic.last_downloaded_at && (
                        <span className="text-xs text-[#A3A3A3]">
                          ({new Date(lic.last_downloaded_at).toLocaleDateString("fr-FR")})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // Note: In reality, we don't know the exact token from the DB.
                          // It is ONLY known right after generation.
                          // So copying a link here will only work for NEWLY generated ones available in memory,
                          // OR we'd need to create a new token or store the full token if the user insists.
                          // The prompt says "stocker le hash du token". But if we only store the hash,
                          // we CANNOT reconstruct the download link later.
                          // Let's implement a "Générer un nouveau lien" if they lost it.
                          toast.error(
                            "Le lien complet n'est disponible qu'à la création ou via l'export CSV pour des raisons de sécurité.",
                          );
                        }}
                        className="p-2 text-[#6B6B6B] hover:text-[#2A9D8F] hover:bg-[#E5F5F3] rounded-lg transition-colors"
                        title="Copier le lien (indisponible pour les anciennes clés sécurisées)"
                      >
                        <Copy className="size-4" />
                      </button>

                      {lic.status === "active" && (
                        <button
                          onClick={() => handleDeactivate(lic.id)}
                          className="p-2 text-[#6B6B6B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Désactiver la licence"
                        >
                          <Ban className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {licenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#6B6B6B]">
                    Aucune licence générée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
