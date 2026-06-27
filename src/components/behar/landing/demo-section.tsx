"use client";

import Link from "next/link";
import { Play, UserPlus, FileText, CheckCircle, Send } from "lucide-react";
import { PrimaryButton } from "@/components/behar/primitives";

export function InteractiveDemoSection() {
  return (
    <section id="demo" className="py-24 bg-[#FAFAF8] border-t border-[#E8E8E5]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-[40px] font-bold text-[#1A1916] leading-tight">
            Essayez l'expérience comme si vous étiez à l'atelier.
          </h2>
          <p className="text-lg text-[#6B6B6B]">
            Découvrez le mode comptoir, la création d'un client, la génération d'une facture et le suivi client en quelques clics.
          </p>
        </div>

        <div className="bg-white rounded-[32px] border border-[#E8E8E5] p-8 md:p-12 shadow-[0_24px_64px_rgba(26,25,22,0.06)] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2A9D8F]/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-6 md:w-5/12">
              {[
                { title: "Nouveau client", icon: UserPlus },
                { title: "Créer dossier", icon: FileText },
                { title: "Générer facture", icon: FileText },
                { title: "Indiquer règlement", icon: CheckCircle },
                { title: "Envoyer suivi client", icon: Send }
              ].map((step, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${i === 0 ? 'bg-[#FAFAF8] border border-[#E8E8E5] shadow-sm' : 'opacity-50 grayscale'}`}>
                  <div className={`size-10 rounded-full flex items-center justify-center ${i === 0 ? 'bg-[#E5F5F3] text-[#2A9D8F]' : 'bg-[#E8E8E5] text-[#6B6B6B]'}`}>
                    <step.icon className="size-5" />
                  </div>
                  <span className={`font-semibold ${i === 0 ? 'text-[#1A1916]' : 'text-[#6B6B6B]'}`}>{step.title}</span>
                </div>
              ))}
              <div className="pt-4">
                <PrimaryButton asChild className="w-full gap-2 shadow-sm">
                  <Link href="#contact">
                    Lancer la démo
                    <Play className="size-4" fill="currentColor" />
                  </Link>
                </PrimaryButton>
              </div>
            </div>

            <div className="md:w-7/12 w-full">
              <div className="bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] p-2 aspect-[4/3] flex flex-col shadow-inner">
                <div className="h-8 border-b border-[#E8E8E5] flex items-center gap-2 px-3">
                  <div className="size-2.5 rounded-full bg-[#E8E8E5]" />
                  <div className="size-2.5 rounded-full bg-[#E8E8E5]" />
                  <div className="size-2.5 rounded-full bg-[#E8E8E5]" />
                </div>
                <div className="flex-1 bg-white flex items-center justify-center p-8 text-center border-t border-white rounded-b-xl">
                  <div className="space-y-4">
                    <div className="size-16 rounded-full bg-[#E5F5F3] flex items-center justify-center mx-auto">
                      <Play className="size-6 text-[#2A9D8F]" fill="currentColor" />
                    </div>
                    <div className="font-bold text-[#1A1916]">Aperçu interactif</div>
                    <div className="text-sm text-[#6B6B6B] max-w-xs">Cliquez sur "Lancer la démo" pour commencer la simulation interactive.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
