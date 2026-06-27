"use client";

import { Store, MonitorPlay, PackageSearch, CreditCard, MessageSquare, TrendingUp, Calendar, Lock } from "lucide-react";

const FEATURES = [
  { icon: Store, title: "Mode comptoir", desc: "Créez un dossier en 3 clics avec votre client en face de vous." },
  { icon: MonitorPlay, title: "Atelier", desc: "Suivez l'avancement des réparations et pièces commandées." },
  { icon: PackageSearch, title: "Stock & Reconditionné", desc: "Gérez vos pièces neuves et le rachat d'appareils d'occasion." },
  { icon: CreditCard, title: "Paiements", desc: "Acceptez les paiements et générez des factures conformes." },
  { icon: MessageSquare, title: "Relation client", desc: "Notifications SMS auto et portail de suivi dédié par client." },
  { icon: TrendingUp, title: "Statistiques", desc: "Analysez votre CA, vos marges et vos performances." },
  { icon: Calendar, title: "Rendez-vous", desc: "Module de prise de RDV en ligne pour votre site web." },
  { icon: Lock, title: "Anti-litige", desc: "Photos avant/après et signature sur tablette pour vous protéger." },
];

export function SuiteGrid() {
  return (
    <section id="fonctionnalites" className="py-24 bg-[#FAFAF8]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-[40px] font-bold text-[#1A1916] leading-tight">
            Une suite complète pour chaque aspect de votre métier.
          </h2>
          <p className="text-lg text-[#6B6B6B]">
            Pas besoin d'utiliser 5 logiciels différents. Behar Tech Pro intègre tous les outils dont un réparateur moderne a besoin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feat, i) => (
            <div key={i} className="group bg-white border border-[#E8E8E5] rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="size-12 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-center mb-6 group-hover:bg-[#E5F5F3] group-hover:border-[#2A9D8F]/20 transition-colors">
                <feat.icon className="size-5 text-[#1A1916] group-hover:text-[#2A9D8F] transition-colors" />
              </div>
              <h3 className="font-bold text-[#1A1916] mb-2">{feat.title}</h3>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
