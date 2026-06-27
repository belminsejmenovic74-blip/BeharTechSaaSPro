"use client";

import { useState } from "react";
import { PhoneOff, Box, Shield, Activity, Clock, TrendingUp, CheckCircle2 } from "lucide-react";

const BENEFITS = [
  {
    id: "appels",
    title: "Moins d'appels",
    icon: PhoneOff,
    desc: "Vos clients trouvent leurs réponses, vous gardez votre concentration.",
    bullets: ["Suivi en ligne 24/7", "Notifications automatiques", "Moins d'interruptions, plus d'efficacité"],
    mockup: <img src="/mockups/mockup-moins-appels.png" alt="Moins d'appels" className="w-full h-full object-contain rounded-xl drop-shadow-lg" />
  },
  {
    id: "stock",
    title: "Stock intelligent",
    icon: Box,
    desc: "Le bon produit, au bon moment, au bon prix.",
    subtitle: "via partenaires IA",
    bullets: ["Import fournisseurs via PDF ou photo", "Mise à jour automatique des stocks", "Achats suggérés par IA"],
    mockup: <img src="/mockups/mockup-stock-intelligent.png" alt="Stock intelligent" className="w-full h-full object-contain rounded-xl drop-shadow-lg" />
  },
  {
    id: "litiges",
    title: "Moins de litiges",
    icon: Shield,
    desc: "Chaque étape est tracée, chaque action est protégée.",
    bullets: ["Historique complet", "Preuves et documents centralisés", "Transparence totale"],
    mockup: <img src="/mockups/mockup-anti-litige-tablette.png" alt="Anti-litige" className="w-full h-full object-contain rounded-xl drop-shadow-lg" />
  },
  {
    id: "controle",
    title: "Plus de contrôle",
    icon: Activity,
    desc: "Vos données se transforment en indicateurs visuels et clairs.",
    bullets: ["Tableaux de bord", "Pilotage en temps réel", "Décisions éclairées"],
    mockup: <img src="/mockups/mockup-dashboard-controle.png" alt="Contrôle" className="w-full h-full object-contain rounded-xl drop-shadow-lg" />
  },
  {
    id: "temps",
    title: "Plus de temps",
    icon: Clock,
    desc: "Automatisez vos tâches répétitives et concentrez-vous sur l'essentiel.",
    bullets: ["Relances SMS", "Génération auto de factures", "Gain estimé : 2h/jour"],
    mockup: <img src="/mockups/mockup-administratif-dossier.png" alt="Administratif" className="w-full h-full object-contain rounded-xl drop-shadow-lg" />
  },
  {
    id: "rentabilite",
    title: "Plus de rentabilité",
    icon: TrendingUp,
    desc: "Optimisez vos marges et évitez les pertes.",
    bullets: ["Analyse des marges", "Calcul IA des prix", "Réduction des erreurs"],
    mockup: <img src="/mockups/mockup-prix-ia.png" alt="Rentabilité" className="w-full h-full object-contain rounded-xl drop-shadow-lg" />
  }
];

export function BenefitsCarousel() {
  const [activeId, setActiveId] = useState(BENEFITS[1].id);

  const activeBenefit = BENEFITS.find(b => b.id === activeId)!;

  return (
    <section className="py-24 bg-[#FAFAF8] border-t border-[#E8E8E5]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-[40px] font-bold text-[#1A1916] leading-tight">
            Ce que le logiciel <span className="text-[#2A9D8F]">vous apporte.</span>
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="lg:w-1/3 flex flex-col gap-2">
            {BENEFITS.map((b) => {
              const isActive = b.id === activeId;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveId(b.id)}
                  className={`text-left p-4 rounded-xl transition-all border ${
                    isActive 
                      ? "bg-white border-[#2A9D8F] shadow-md" 
                      : "bg-transparent border-transparent hover:bg-white hover:border-[#E8E8E5]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? "bg-[#E5F5F3] text-[#2A9D8F]" : "bg-[#FAFAF8] text-[#6B6B6B] border border-[#E8E8E5]"}`}>
                      <b.icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${isActive ? "text-[#1A1916]" : "text-[#6B6B6B]"}`}>{b.title}</h3>
                      {b.subtitle && <span className="text-[10px] font-medium text-[#2A9D8F] bg-[#E5F5F3] px-2 py-0.5 rounded-full mt-1 inline-block">{b.subtitle}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:w-2/3 w-full bg-white rounded-[32px] border border-[#E8E8E5] p-8 md:p-12 shadow-[0_32px_64px_rgba(26,25,22,0.04)] relative min-h-[500px] flex flex-col md:flex-row gap-8 items-center overflow-hidden transition-all duration-500">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#2A9D8F]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="w-full md:w-1/2 space-y-6 relative z-10">
              <div className="inline-flex p-3 rounded-2xl bg-[#E5F5F3] text-[#2A9D8F]">
                <activeBenefit.icon className="size-8" />
              </div>
              <h3 className="text-3xl font-bold text-[#1A1916] leading-tight">{activeBenefit.title}</h3>
              <p className="text-[#6B6B6B] text-lg leading-relaxed">{activeBenefit.desc}</p>
              
              <div className="space-y-4 pt-4">
                {activeBenefit.bullets.map((bullet, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle2 className="size-5 text-[#2A9D8F] shrink-0" />
                    <span className="text-[#1A1916] font-medium">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-1/2 h-[400px] relative z-10 flex items-center justify-center">
              {activeBenefit.mockup}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
