"use client";

import Link from "next/link";
import { BeharLogo } from "@/components/behar/behar-logo";

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-[#E8E8E5] py-12">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BeharLogo size="sm" />
            <span className="font-bold text-[#1A1916] tracking-tight">BEHAR • TECH PRO</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-[#6B6B6B]">
            <Link href="#produit" className="hover:text-[#1A1916] transition-colors">Produit</Link>
            <Link href="#tarifs" className="hover:text-[#1A1916] transition-colors">Tarifs</Link>
            <Link href="#contact" className="hover:text-[#1A1916] transition-colors">Contact</Link>
            <Link href="/dashboard" className="text-[#2A9D8F] hover:text-[#1d7066] transition-colors">Connexion</Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-[#E8E8E5] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#A3A3A3]">
          <p>© {new Date().getFullYear()} Behar Tech. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-[#6B6B6B]">Mentions légales</Link>
            <Link href="#" className="hover:text-[#6B6B6B]">Confidentialité</Link>
            <Link href="#" className="hover:text-[#6B6B6B]">CGV / CGU</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
