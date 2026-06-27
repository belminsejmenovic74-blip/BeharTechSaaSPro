import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";
import { BeharLogo } from "@/components/behar/behar-logo";
import { Monitor, Apple, Smartphone, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Server action style page
export default async function DownloadPage({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || typeof token !== 'string') {
    return notFound();
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-[#6B6B6B]">Erreur de configuration serveur.</p>
      </div>
    );
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data, error } = await supabase
    .from('license_keys')
    .select('id, status, created_at, plan, download_count')
    .eq('download_token_hash', tokenHash)
    .single();

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <div className="bg-white rounded-[24px] border border-[#E8E8E5] p-8 max-w-md w-full text-center shadow-sm">
          <div className="size-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-6">
            <span className="text-2xl">✕</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1916] mb-2">Lien invalide ou expiré.</h1>
          <p className="text-[#6B6B6B]">Ce lien de téléchargement n'existe pas ou n'est plus valide.</p>
        </div>
      </div>
    );
  }

  if (data.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <div className="bg-white rounded-[24px] border border-[#E8E8E5] p-8 max-w-md w-full text-center shadow-sm">
          <div className="size-16 rounded-full bg-orange-50 text-orange-500 mx-auto flex items-center justify-center mb-6">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1916] mb-2">Licence inactive</h1>
          <p className="text-[#6B6B6B]">Cette licence n'est plus active. Veuillez contacter le support.</p>
        </div>
      </div>
    );
  }

  // Si on est là, la licence est bonne.
  // Increment download count (this happens on page load, which is fine since the user "accessed" the download page)
  await supabase
    .from('license_keys')
    .update({ 
      download_count: data.download_count + 1,
      last_downloaded_at: new Date().toISOString()
    })
    .eq('id', data.id);

  const RELEASES_BASE_URL = "https://github.com/belminsejmenovic74-blip/BeharTechSaaSPro/releases/latest/download";

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans">
      <header className="h-20 bg-white border-b border-[#E8E8E5] flex items-center px-6 sticky top-0 z-10">
        <div className="max-w-[1000px] mx-auto w-full flex items-center gap-2">
          <BeharLogo size="md" />
          <span className="font-bold text-[#1A1916] tracking-tight">BEHAR • TECH PRO</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-[800px] w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-[#1A1916] mb-4">Télécharger Behar Tech Pro</h1>
            <p className="text-xl text-[#6B6B6B]">Choisissez votre version pour commencer.</p>
          </div>

          <div className="bg-white rounded-[32px] border border-[#E8E8E5] p-8 md:p-12 shadow-[0_32px_64px_rgba(26,25,22,0.06)]">
            <div className="flex items-center gap-3 p-4 bg-[#E5F5F3] rounded-2xl mb-12">
              <CheckCircle2 className="size-6 text-[#2A9D8F]" />
              <div>
                <div className="font-bold text-[#1A1916]">Votre accès est prêt.</div>
                <div className="text-sm text-[#2A9D8F]">Licence active • Plan {data.plan.toUpperCase()} • Valide</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <a 
                href={`${RELEASES_BASE_URL}/Behar-Tech-Pro-Windows.exe`}
                className="group border border-[#E8E8E5] rounded-2xl p-6 flex flex-col items-center text-center hover:border-[#2A9D8F] hover:shadow-lg transition-all"
              >
                <div className="size-16 rounded-full bg-[#FAFAF8] flex items-center justify-center mb-6 group-hover:bg-[#E5F5F3] group-hover:text-[#2A9D8F] transition-colors">
                  <Monitor className="size-8 text-[#1A1916] group-hover:text-[#2A9D8F] transition-colors" />
                </div>
                <h3 className="font-bold text-[#1A1916] mb-2">Windows</h3>
                <p className="text-sm text-[#6B6B6B] mb-6">Windows 10 ou 11 (64-bit)</p>
                <span className="mt-auto inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#FAFAF8] border border-[#E8E8E5] text-sm font-semibold text-[#1A1916] group-hover:bg-[#2A9D8F] group-hover:text-white group-hover:border-[#2A9D8F] transition-colors">
                  Télécharger
                </span>
              </a>

              <a 
                href={`${RELEASES_BASE_URL}/Behar-Tech-Pro-macOS.dmg`}
                className="group border border-[#E8E8E5] rounded-2xl p-6 flex flex-col items-center text-center hover:border-[#2A9D8F] hover:shadow-lg transition-all"
              >
                <div className="size-16 rounded-full bg-[#FAFAF8] flex items-center justify-center mb-6 group-hover:bg-[#E5F5F3] group-hover:text-[#2A9D8F] transition-colors">
                  <Apple className="size-8 text-[#1A1916] group-hover:text-[#2A9D8F] transition-colors" />
                </div>
                <h3 className="font-bold text-[#1A1916] mb-2">macOS</h3>
                <p className="text-sm text-[#6B6B6B] mb-6">Mac Intel ou Apple Silicon</p>
                <span className="mt-auto inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#FAFAF8] border border-[#E8E8E5] text-sm font-semibold text-[#1A1916] group-hover:bg-[#2A9D8F] group-hover:text-white group-hover:border-[#2A9D8F] transition-colors">
                  Télécharger
                </span>
              </a>

              <a 
                href={`${RELEASES_BASE_URL}/Behar-Tech-Pro-Android.apk`}
                className="group border border-[#E8E8E5] rounded-2xl p-6 flex flex-col items-center text-center hover:border-[#2A9D8F] hover:shadow-lg transition-all"
              >
                <div className="size-16 rounded-full bg-[#FAFAF8] flex items-center justify-center mb-6 group-hover:bg-[#E5F5F3] group-hover:text-[#2A9D8F] transition-colors">
                  <Smartphone className="size-8 text-[#1A1916] group-hover:text-[#2A9D8F] transition-colors" />
                </div>
                <h3 className="font-bold text-[#1A1916] mb-2">Android</h3>
                <p className="text-sm text-[#6B6B6B] mb-6">Version 8.0 ou ultérieure</p>
                <span className="mt-auto inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#FAFAF8] border border-[#E8E8E5] text-sm font-semibold text-[#1A1916] group-hover:bg-[#2A9D8F] group-hover:text-white group-hover:border-[#2A9D8F] transition-colors">
                  Télécharger (APK)
                </span>
              </a>
            </div>
            
            <div className="mt-8 text-center text-xs text-[#A3A3A3]">
              En téléchargeant Behar Tech Pro, vous acceptez nos conditions générales d'utilisation.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
