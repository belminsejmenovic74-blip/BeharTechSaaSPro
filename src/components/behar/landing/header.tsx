"use client";

import Link from "next/link";
import { BeharLogo } from "@/components/behar/behar-logo";
import { PrimaryButton } from "@/components/behar/primitives";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-[#E8E8E5]">
      <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BeharLogo size="md" />
          <span className="font-bold text-[#1A1916] tracking-tight">BEHAR • TECH PRO</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#produit" className="text-sm font-medium text-[#6B6B6B] hover:text-[#1A1916] transition-colors">Produit</Link>
          <Link href="#tarifs" className="text-sm font-medium text-[#6B6B6B] hover:text-[#1A1916] transition-colors">Tarifs</Link>
          <Link href="#demo" className="text-sm font-medium text-[#6B6B6B] hover:text-[#1A1916] transition-colors">Démo</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden sm:block text-sm font-medium text-[#6B6B6B] hover:text-[#1A1916] transition-colors">
            Se connecter
          </Link>
          <PrimaryButton asChild className="shadow-sm">
            <Link href="#contact">Demander une démo</Link>
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}
