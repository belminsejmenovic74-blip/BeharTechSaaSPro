"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Store, Navigation, Layers, RefreshCcw } from "lucide-react";
import { PrimaryButton } from "@/components/behar/primitives";

const SLIDES = [
  {
    id: "comptoir",
    title: "Atelier comptoir",
    icon: Store,
    content: (
      <img src="/mockups/mockup-atelier-comptoir.png" alt="Atelier comptoir" className="w-full h-auto drop-shadow-xl rounded-xl" />
    )
  },
  {
    id: "reconditionnement",
    title: "Reconditionnement & revente",
    icon: RefreshCcw,
    content: (
      <img src="/mockups/mockup-reconditionnement.png" alt="Reconditionnement & revente" className="w-full h-auto drop-shadow-xl rounded-xl" />
    )
  },
  {
    id: "deplacement",
    title: "Réparateur en déplacement",
    icon: Navigation,
    content: (
      <img src="/mockups/mockup-deplacement.png" alt="Réparateur en déplacement" className="h-[480px] w-auto mx-auto drop-shadow-xl rounded-[24px]" />
    )
  },
  {
    id: "multi",
    title: "Multi-boutique",
    icon: Layers,
    content: (
      <img src="/mockups/mockup-multiboutique.png" alt="Multi-boutique" className="h-[480px] w-auto mx-auto drop-shadow-xl rounded-[24px]" />
    )
  }
];

export function TargetCarousel() {
  const [activeIdx, setActiveIdx] = useState(1);

  const handleNext = () => setActiveIdx((v) => (v + 1) % SLIDES.length);
  const handlePrev = () => setActiveIdx((v) => (v - 1 + SLIDES.length) % SLIDES.length);

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-[40px] font-bold text-[#1A1916] leading-tight">
            Un logiciel pensé pour <span className="text-[#2A9D8F]">votre</span> réalité.
          </h2>
          <p className="text-lg text-[#6B6B6B]">
            Que vous soyez seul dans un camion ou gérant de 5 boutiques, l'interface s'adapte à vos besoins spécifiques.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeIdx === i 
                  ? "bg-[#2A9D8F] text-white shadow-md" 
                  : "bg-[#FAFAF8] text-[#6B6B6B] border border-[#E8E8E5] hover:border-[#2A9D8F]/30 hover:text-[#1A1916]"
              }`}
            >
              <slide.icon className="size-4" />
              {slide.title}
            </button>
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto h-[500px] flex items-center justify-center perspective-[2000px]">
          {SLIDES.map((slide, i) => {
            const offset = (i - activeIdx + SLIDES.length) % SLIDES.length;
            const isCenter = offset === 0;
            const isLeft = offset === SLIDES.length - 1;
            const isRight = offset === 1;
            
            if (!isCenter && !isLeft && !isRight) return null;

            return (
              <div 
                key={slide.id}
                className={`absolute w-full max-w-[800px] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  isCenter ? "z-30 transform-none opacity-100" : 
                  isLeft ? "z-10 -translate-x-1/4 scale-90 opacity-40 rotate-y-[10deg] blur-[2px]" : 
                  "z-10 translate-x-1/4 scale-90 opacity-40 rotate-y-[-10deg] blur-[2px]"
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="pointer-events-none">
                  {slide.content}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <button onClick={handlePrev} className="size-12 rounded-full bg-white border border-[#E8E8E5] flex items-center justify-center text-[#1A1916] hover:bg-[#FAFAF8] hover:border-[#2A9D8F]/50 transition-colors shadow-sm">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={handleNext} className="size-12 rounded-full bg-white border border-[#E8E8E5] flex items-center justify-center text-[#1A1916] hover:bg-[#FAFAF8] hover:border-[#2A9D8F]/50 transition-colors shadow-sm">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
