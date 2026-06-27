"use client";

import { CreditCard, Calendar, BrainCircuit, ShieldCheck, CheckCircle2 } from "lucide-react";

const TOOLS = [
  {
    title: "Paiements sans friction",
    desc: "Proposez le paiement en 3x, la caution bancaire ou le paiement sur facture. Tout est intégré, sécurisé et réconcilié.",
    icon: CreditCard,
    bullets: ["Liens de paiement sécurisés envoyés à vos clients.", "Acompte ou paiement total en quelques clics.", "Suivi des transactions en temps réel."],
    mockup: <img src="/mockups/mockup-paiement.png" alt="Paiement" className="w-full h-auto object-cover rounded-t-xl" />
  },
  {
    title: "Rendez-vous en ligne",
    desc: "Vos clients réservent leur créneau depuis votre site ou Google. Moins de temps au téléphone, plus de réparations.",
    icon: Calendar,
    bullets: ["Calendrier en temps réel et créneaux disponibles.", "Choix de l'appareil et du problème.", "Notes et pièces jointes optionnelles."],
    mockup: <img src="/mockups/mockup-rendez-vous.png" alt="Rendez-vous" className="w-full h-auto object-cover rounded-t-xl" />
  },
  {
    title: "Estimations par IA",
    desc: "Un client veut revendre son téléphone ? Notre IA analyse le marché et vous donne le meilleur prix de reprise en 3 secondes.",
    icon: BrainCircuit,
    bullets: ["Mise à jour en temps réel des prix du marché.", "Analyse de la demande locale et de l'état.", "Marges garanties pour chaque rachat."],
    mockup: <img src="/mockups/mockup-prix-ia.png" alt="Prix IA" className="w-full h-auto object-cover rounded-t-xl" />
  },
  {
    title: "Protection anti-litige",
    desc: "Photos avant/après, diagnostic signé sur tablette, état des lieux complet. Vous êtes protégé contre les clients de mauvaise foi.",
    icon: ShieldCheck,
    bullets: ["Rapport PDF auto-généré et envoyé au client.", "Validation avant ouverture de l'appareil.", "Historique infalsifiable des manipulations."],
    mockup: <img src="/mockups/mockup-protection-anti-litige.png" alt="Protection" className="w-full h-auto object-cover rounded-t-xl" />
  }
];

export function FourToolsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#E5F5F3] text-[11px] font-bold tracking-widest uppercase text-[#2A9D8F]">
            TOUT-EN-UN
          </div>
          <h2 className="text-3xl md:text-[40px] font-bold text-[#1A1916] leading-tight">
            Quatre outils pour développer votre atelier.
          </h2>
          <p className="text-lg text-[#6B6B6B]">
            Paiement, prise de rendez-vous, prix de référence et protection anti-litige :<br className="hidden md:block"/> tout est connecté pour gagner du temps et renforcer la confiance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TOOLS.map((tool, index) => (
            <div key={index} className="bg-[#FAFAF8] rounded-[24px] pt-6 border border-[#E8E8E5] flex flex-col hover:shadow-lg transition-shadow overflow-hidden">
              <div className="px-6 mb-6">
                <div className="size-12 rounded-full bg-[#E5F5F3] flex items-center justify-center mb-6">
                  <tool.icon className="size-5 text-[#2A9D8F]" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1916] mb-1">{tool.title}</h3>
                <p className="text-sm text-[#6B6B6B] mb-6 font-medium">{tool.desc}</p>
                <div className="space-y-3 mb-8">
                  {tool.bullets.map((t,i)=>(
                    <div key={i} className="flex gap-3 text-sm text-[#6B6B6B]">
                      <CheckCircle2 className="size-4 text-[#2A9D8F] shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-auto px-6 pb-0 pt-6 bg-[#FAFAF8] flex-1 flex flex-col justify-end">
                {tool.mockup}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
