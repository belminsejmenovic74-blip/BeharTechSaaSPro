"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck, Sliders, Users } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";

export function LandingHero() {
  return (
    <section id="produit" className="pt-20 pb-32 overflow-hidden bg-[#FAFAF8] relative">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#2A9D8F]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-8 items-center relative z-10">
        <div className="space-y-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E8E5] shadow-sm">
            <span className="flex size-2 rounded-full bg-[#2A9D8F] animate-pulse" />
            <span className="text-xs font-semibold text-[#1A1916] uppercase tracking-wide">La gestion d'atelier, réinventée</span>
          </div>

          <h1 className="text-5xl lg:text-[64px] leading-[1.1] font-bold text-[#1A1916] tracking-tight">
            Passez votre atelier en <span className="text-[#2A9D8F]">mode pro.</span>
          </h1>

          <p className="text-lg lg:text-xl text-[#6B6B6B] leading-relaxed">
            Behar Tech Pro centralise, automatise et sécurise la gestion de votre atelier. Moins d'administratif, plus de sérénité, un contrôle total.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-full bg-[#E5F5F3] text-[#2A9D8F]">
                <ShieldCheck className="size-4" />
              </div>
              <p className="text-[#1A1916] font-medium">Solution sécurisée et fiable.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-full bg-[#E5F5F3] text-[#2A9D8F]">
                <Sliders className="size-4" />
              </div>
              <p className="text-[#1A1916] font-medium">Pilotage centralisé de vos réparations.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-full bg-[#E5F5F3] text-[#2A9D8F]">
                <Users className="size-4" />
              </div>
              <p className="text-[#1A1916] font-medium">Créé par des réparateurs, pour des réparateurs.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <PrimaryButton asChild className="w-full sm:w-auto h-12 px-8 text-[15px] shadow-lg shadow-[#2A9D8F]/20">
              <Link href="#contact">Demander une démo</Link>
            </PrimaryButton>
            <SecondaryButton asChild className="w-full sm:w-auto h-12 px-6 text-[15px] border-none bg-transparent hover:bg-[#E8E8E5]/50 group">
              <Link href="#demo">
                Voir la démo interactive
                <ChevronRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </SecondaryButton>
          </div>
        </div>

        <div className="relative h-[600px] w-full flex items-center justify-center lg:justify-end mt-12 lg:mt-0 perspective-[2000px]">
          <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[800px] xl:w-[900px] transform rotate-y-[-12deg] rotate-x-[2deg] translate-z-[0]">
            <img 
              src="/mockups/hero-dashboard.png" 
              alt="Dashboard Behar Tech Pro" 
              className="w-full h-auto drop-shadow-2xl rounded-2xl"
            />
          </div>

          <div className="absolute left-[5%] bottom-[5%] w-[400px] xl:w-[450px] transform rotate-y-[-5deg] rotate-x-[5deg] translate-z-[100px]">
            <img 
              src="/mockups/hero-tablette-comptoir.png" 
              alt="Mode comptoir sur tablette" 
              className="w-full h-auto drop-shadow-2xl rounded-2xl"
            />
          </div>

          <div className="absolute right-[10%] bottom-[-5%] w-[220px] xl:w-[250px] transform rotate-y-[-15deg] rotate-z-[2deg] translate-z-[200px]">
            <img 
              src="/mockups/hero-mobile-suivi.png" 
              alt="Suivi client sur mobile" 
              className="w-full h-auto drop-shadow-xl rounded-[2rem]"
            />
          </div>
          
          {/* Floating KPI Cards */}
          <div className="absolute right-[10%] top-[10%] bg-white rounded-xl border border-[#E8E8E5] p-3 shadow-lg transform translate-z-[300px] rotate-y-[-10deg] animate-pulse">
            <div className="text-[10px] text-[#6B6B6B] font-bold mb-1">Marge brute</div>
            <div className="text-xl font-bold text-[#1A1916]">42,5 %</div>
            <div className="text-[10px] text-[#2A9D8F] font-medium mt-1">+3,2 pts vs mois préc.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
