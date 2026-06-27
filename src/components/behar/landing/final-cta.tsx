"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";

export function FinalCtaSection() {
  return (
    <section id="contact" className="py-24 bg-[#FAFAF8] relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-[1000px] h-[400px] bg-[#2A9D8F]/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-[#E8E8E5] rounded-[32px] p-10 md:p-20 text-center shadow-[0_32px_64px_rgba(26,25,22,0.06)]">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1916] leading-tight mb-6 max-w-3xl mx-auto">
            Votre atelier mérite mieux qu'un tableau Excel.
          </h2>
          <p className="text-xl text-[#6B6B6B] mb-10 max-w-2xl mx-auto leading-relaxed">
            Centralisez vos réparations, documents, paiements et suivis clients dans une seule interface premium.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryButton asChild className="w-full sm:w-auto h-14 px-8 text-lg shadow-lg shadow-[#2A9D8F]/20">
              <Link href="mailto:contact@behar.tech">Demander une démo</Link>
            </PrimaryButton>
            <SecondaryButton asChild className="w-full sm:w-auto h-14 px-8 text-lg bg-white group border-[#E8E8E5]">
              <Link href="#fonctionnalites">
                Voir les fonctionnalités
                <ChevronRight className="size-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </SecondaryButton>
          </div>
        </div>
      </div>
    </section>
  );
}
