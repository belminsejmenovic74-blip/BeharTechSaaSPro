"use client";

import Link from "next/link";
import { GraduationCap, PlayCircle } from "lucide-react";
import { SecondaryButton } from "@/components/behar/primitives";

const ACADEMY_LESSONS = [
  "Créer un client",
  "Utiliser le mode comptoir",
  "Générer une facture",
  "Indiquer un règlement",
  "Gérer le stock",
  "Envoyer le suivi client"
];

export function AcademySection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="bg-[#FAFAF8] rounded-[32px] border border-[#E8E8E5] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-sm">
          <div className="md:w-1/2 space-y-6 text-center md:text-left">
            <div className="size-16 mx-auto md:mx-0 rounded-2xl bg-white border border-[#E8E8E5] flex items-center justify-center shadow-sm">
              <GraduationCap className="size-8 text-[#2A9D8F]" />
            </div>
            <h2 className="text-3xl md:text-[40px] font-bold text-[#1A1916] leading-tight">
              Une formation simple dès le premier jour.
            </h2>
            <p className="text-lg text-[#6B6B6B] leading-relaxed">
              Après activation, vos équipes reçoivent un lien vers l'Académie Behar Tech Pro : vidéos courtes, guides pratiques et parcours de démarrage.
            </p>
            <div className="pt-2">
              <SecondaryButton asChild className="w-full sm:w-auto px-8 bg-white shadow-sm">
                <Link href="/formation">Voir l'académie</Link>
              </SecondaryButton>
            </div>
          </div>

          <div className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ACADEMY_LESSONS.map((lesson, i) => (
              <div key={i} className="bg-white border border-[#E8E8E5] rounded-xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-1 transition-transform">
                <PlayCircle className="size-5 text-[#2A9D8F] shrink-0" />
                <span className="text-sm font-semibold text-[#1A1916]">{lesson}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
