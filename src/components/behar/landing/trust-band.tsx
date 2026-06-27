"use client";

import { Shield, Server, Lock } from "lucide-react";

export function TrustBand() {
  return (
    <section className="border-y border-[#E8E8E5] bg-white relative z-20">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
          <div className="flex items-center gap-4 group">
            <div className="size-10 rounded-full bg-[#FAFAF8] flex items-center justify-center border border-[#E8E8E5] group-hover:scale-110 transition-transform">
              <Shield className="size-5 text-[#2A9D8F]" />
            </div>
            <div>
              <p className="font-bold text-[#1A1916] text-sm">Pensé pour les ateliers exigeants</p>
              <p className="text-[#6B6B6B] text-xs">Testé et approuvé par +200 réparateurs.</p>
            </div>
          </div>
          
          <div className="w-px h-10 bg-[#E8E8E5] hidden md:block" />
          
          <div className="flex items-center gap-4 group">
            <div className="size-10 rounded-full bg-[#FAFAF8] flex items-center justify-center border border-[#E8E8E5] group-hover:scale-110 transition-transform">
              <Server className="size-5 text-[#2A9D8F]" />
            </div>
            <div>
              <p className="font-bold text-[#1A1916] text-sm">Hébergé en Europe</p>
              <p className="text-[#6B6B6B] text-xs">Conformité RGPD stricte et sauvegardes quotidiennes.</p>
            </div>
          </div>
          
          <div className="w-px h-10 bg-[#E8E8E5] hidden md:block" />
          
          <div className="flex items-center gap-4 group">
            <div className="size-10 rounded-full bg-[#FAFAF8] flex items-center justify-center border border-[#E8E8E5] group-hover:scale-110 transition-transform">
              <Lock className="size-5 text-[#2A9D8F]" />
            </div>
            <div>
              <p className="font-bold text-[#1A1916] text-sm">Données sécurisées</p>
              <p className="text-[#6B6B6B] text-xs">Vos données vous appartiennent. Export possible à tout moment.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
