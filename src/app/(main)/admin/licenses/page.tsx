"use client";

import { useEffect, useState } from "react";
import { Copy, Download, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { generateLicenses, deactivateLicense, fetchLicenses } from "./actions";
import { LicenseKey } from "@/lib/supabase/license-types";
import { toast } from "sonner";

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<any[] | null>(null);

  useEffect(() => {
    loadLicenses();
  }, []);

  async function loadLicenses() {
    const data = await fetchLicenses();
    setLicenses(data as LicenseKey[]);
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

  function handleExportCsv() {
    if (!generatedBatch) return;
    
    // Create CSV content
    const headers = ["ID", "Clé Complète", "Lien Téléchargement", "Statut", "Plan"];
    const rows = generatedBatch.map(l => {
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
            <SecondaryButton onClick={handleExportCsv} className="gap-2 bg-[#E5F5F3] border-[#2A9D8F]/20 text-[#2A9D8F] hover:bg-[#2A9D8F]/20">
              <Download className="size-4" />
              Exporter CSV Complet
            </SecondaryButton>
          )}
          <PrimaryButton onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Génération..." : "Générer 50 clés"}
          </PrimaryButton>
        </div>
      </div>

      {generatedBatch && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl text-[#92400E] text-sm flex gap-3">
          <div className="mt-0.5"><KeyRound className="size-4" /></div>
          <div>
            <strong>Important :</strong> 50 nouvelles clés viennent d'être générées. C'est le SEUL moment où vous pourrez les exporter complètes. Les clés complètes ne seront plus jamais affichées une fois cette page rechargée.
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
              {licenses.map(lic => (
                <tr key={lic.id} className="hover:bg-[#FAFAF8]/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-[#1A1916]">{lic.key_preview}</td>
                  <td className="px-6 py-4">
                    {lic.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E5F5F3] text-[#2A9D8F] text-xs font-bold">
                        <CheckCircle2 className="size-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626] text-xs font-bold">
                        <Ban className="size-3" /> {lic.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 uppercase text-xs font-bold text-[#6B6B6B]">{lic.plan}</td>
                  <td className="px-6 py-4 text-[#6B6B6B]">{new Date(lic.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1A1916]">{lic.download_count}</span>
                      {lic.last_downloaded_at && (
                        <span className="text-xs text-[#A3A3A3]">
                          ({new Date(lic.last_downloaded_at).toLocaleDateString('fr-FR')})
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
                          toast.error("Le lien complet n'est disponible qu'à la création ou via l'export CSV pour des raisons de sécurité.");
                        }}
                        className="p-2 text-[#6B6B6B] hover:text-[#2A9D8F] hover:bg-[#E5F5F3] rounded-lg transition-colors"
                        title="Copier le lien (indisponible pour les anciennes clés sécurisées)"
                      >
                        <Copy className="size-4" />
                      </button>
                      
                      {lic.status === 'active' && (
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
