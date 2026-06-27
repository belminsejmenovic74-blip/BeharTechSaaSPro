"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";

const PLANS = [
  {
    name: "Gratuit",
    price: "0",
    desc: "Pour découvrir la plateforme et faire quelques réparations.",
    features: ["1 utilisateur", "Jusqu'à 10 dossiers/mois", "Factures basiques", "Support par email"],
    cta: "Créer un compte",
    href: "/dashboard",
    isPopular: false,
  },
  {
    name: "Starter",
    price: "29",
    desc: "L'essentiel pour un réparateur indépendant au quotidien.",
    features: ["1 utilisateur", "Dossiers illimités", "Mode comptoir", "Signature en ligne", "Support prioritaire"],
    cta: "Commencer l'essai",
    href: "#contact",
    isPopular: false,
  },
  {
    name: "Pro",
    price: "49",
    desc: "La suite complète pour piloter et développer votre atelier.",
    features: ["3 utilisateurs", "Gestion de stock", "Suggestions d'achats IA", "Suivi client par SMS", "Statistiques avancées"],
    cta: "Commencer l'essai",
    href: "#contact",
    isPopular: true,
  },
  {
    name: "Business",
    price: "99",
    desc: "Pour les structures multi-boutiques et gros volumes.",
    features: ["Utilisateurs illimités", "Multi-boutique", "API et Webhooks", "Manager dédié", "Formation sur site possible"],
    cta: "Contacter les ventes",
    href: "#contact",
    isPopular: false,
  }
];

export function PricingSection() {
  return (
    <section id="tarifs" className="py-24 bg-[#FAFAF8] border-t border-[#E8E8E5]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-[40px] font-bold text-[#1A1916] leading-tight">
            Des tarifs simples, sans surprise.
          </h2>
          <p className="text-lg text-[#6B6B6B]">
            Passez à la vitesse supérieure quand vous êtes prêt. Aucun engagement de durée.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          {PLANS.map((plan, i) => (
            <div 
              key={i} 
              className={`relative bg-white rounded-2xl flex flex-col ${
                plan.isPopular 
                  ? 'border-2 border-[#2A9D8F] shadow-[0_16px_48px_rgba(42,157,143,0.12)] p-8' 
                  : 'border border-[#E8E8E5] p-6 shadow-sm hover:shadow-md transition-shadow'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#2A9D8F] text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  Recommandé
                </div>
              )}
              
              <h3 className="text-lg font-bold text-[#1A1916] mb-2">{plan.name}</h3>
              <p className="text-sm text-[#6B6B6B] h-10 mb-6 leading-tight">{plan.desc}</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold text-[#1A1916]">{plan.price}</span>
                <span className="text-xl font-bold text-[#1A1916]">€</span>
                <span className="text-[#6B6B6B] text-sm">/mois</span>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feat, j) => (
                  <div key={j} className="flex gap-3 text-sm">
                    <Check className={`size-4 shrink-0 ${plan.isPopular ? 'text-[#2A9D8F]' : 'text-[#A3A3A3]'}`} />
                    <span className="text-[#1A1916] font-medium">{feat}</span>
                  </div>
                ))}
              </div>

              {plan.isPopular ? (
                <PrimaryButton asChild className="w-full justify-center">
                  <Link href={plan.href}>{plan.cta}</Link>
                </PrimaryButton>
              ) : (
                <SecondaryButton asChild className="w-full justify-center bg-[#FAFAF8]">
                  <Link href={plan.href}>{plan.cta}</Link>
                </SecondaryButton>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
