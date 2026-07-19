"use client";

import { useMemo, useState } from "react";

import Head from "next/head";
import Link from "next/link";

import { Play, Search, Video, FileText, ChevronRight, Monitor, Smartphone, Tablet } from "lucide-react";

import { BeharLogo } from "@/components/behar/behar-logo";
import { useHelpContents } from "@/lib/hooks/use-help-center";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "Tout" },
  { id: "comptoir", label: "Comptoir" },
  { id: "clients", label: "Clients" },
  { id: "factures", label: "Factures" },
  { id: "stock", label: "Stock" },
  { id: "atelier", label: "Atelier" },
  { id: "suivi_client", label: "Suivi client" },
  { id: "admin", label: "Admin" },
];

const SUPPORTS = [
  { id: "all", label: "Tous les supports" },
  { id: "desktop", label: "PC / Mac", icon: Monitor },
  { id: "tablet", label: "Tablette", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

export default function FormationPage() {
  const { data: contents, loading } = useHelpContents({
    audience: "behar_customers",
    status: "published",
    visibility: "public",
  });

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSupport, setActiveSupport] = useState("all");

  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      // Filtre Contexte (Catégorie principale ou contexte d'une des variantes)
      if (activeCategory !== "all") {
        const matchesCat = c.category === activeCategory;
        const matchesVariantContext = c.type === "video" && c.video_variants?.some((v) => v.context === activeCategory);
        if (!matchesCat && !matchesVariantContext) return false;
      }

      // Filtre Support (Support global ou support d'une des variantes)
      if (activeSupport !== "all") {
        if (c.type === "video") {
          const hasSupport = c.video_variants?.some((v) => v.device === activeSupport);
          if (!hasSupport) return false;
        } else {
          if (c.support !== activeSupport && c.support !== "all") return false;
        }
      }

      if (search.length > 2) {
        const q = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [contents, search, activeCategory, activeSupport]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#101828] font-sans selection:bg-[#2A9D8F]/20">
      <Head>
        <title>Centre de formation | Behar Tech Pro</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Header Minimal */}
      <header className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BeharLogo />
          <div className="h-5 w-px bg-[#E4E7EC]" />
          <span className="font-medium text-[#667085]">Académie Behar Tech Pro</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm">
          <span className="text-[#667085]">Besoin d'aide ?</span>
          <a href="mailto:support@behar.tech" className="font-medium text-[#2A9D8F] hover:underline">
            Contacter le support
          </a>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left Column - Intro & Quick Start */}
          <div className="lg:w-[320px] shrink-0 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E5F5F3] text-[#167B70] text-xs font-semibold mb-6">
                <Video className="size-4" />
                FORMATION COMPLÈTE
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                Tutoriels &<br />
                vidéos
              </h1>
              <p className="text-[#667085] leading-relaxed">
                Découvrez des guides clairs et des vidéos courtes pour tout comprendre, étape par étape. Exclusif aux
                ateliers utilisant Behar Tech Pro.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)] space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Play className="size-5 text-[#2A9D8F]" fill="currentColor" />
                Bien démarrer
              </h3>
              <p className="text-sm text-[#667085]">
                Suivez ce parcours étape par étape pour configurer votre atelier.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  { title: "Découvrir le dashboard", time: "2 min" },
                  { title: "Créer un client", time: "1 min" },
                  { title: "Utiliser le mode comptoir", time: "3 min" },
                  { title: "Créer une facture", time: "2 min" },
                  { title: "Créer une demande de paiement", time: "1 min" },
                  { title: "Gérer le stock", time: "4 min" },
                  { title: "Envoyer le suivi client", time: "1 min" },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm group cursor-pointer hover:text-[#2A9D8F] transition-colors"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-[#F9FAFB] text-[#667085] text-xs font-medium group-hover:bg-[#E5F5F3] group-hover:text-[#2A9D8F] transition-colors">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-medium">{step.title}</span>
                    <span className="text-[#98A2B3] text-xs">{step.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Filters & Grid */}
          <div className="flex-1 min-w-0 space-y-8 w-full">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#98A2B3]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un sujet, une fonctionnalité..."
                className="w-full h-[52px] pl-12 pr-4 bg-white border border-[#E4E7EC] rounded-xl text-[15px] focus:outline-none focus:border-[#2A9D8F]/50 focus:ring-4 focus:ring-[#2A9D8F]/10 shadow-[0_2px_8px_rgba(16,24,40,0.02)] transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                      activeCategory === cat.id
                        ? "bg-[#101828] text-white border-[#101828] shadow-sm"
                        : "bg-white text-[#667085] border-[#E4E7EC] hover:bg-[#F9FAFB] hover:text-[#101828]",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative shrink-0 w-full sm:w-auto">
                <select
                  value={activeSupport}
                  onChange={(e) => setActiveSupport(e.target.value)}
                  className="w-full sm:w-[180px] h-10 pl-3 pr-8 bg-white border border-[#E4E7EC] rounded-lg text-sm text-[#101828] appearance-none focus:outline-none focus:border-[#2A9D8F]/50 focus:ring-2 focus:ring-[#2A9D8F]/20 cursor-pointer shadow-sm"
                >
                  {SUPPORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M2.5 4.5L6 8L9.5 4.5"
                      stroke="#667085"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-[#E4E7EC] overflow-hidden shadow-sm animate-pulse"
                  >
                    <div className="aspect-video bg-[#F9FAFB]" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-[#F9FAFB] rounded w-3/4" />
                      <div className="h-4 bg-[#F9FAFB] rounded w-full" />
                      <div className="h-4 bg-[#F9FAFB] rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#E4E7EC] border-dashed">
                <Search className="size-10 text-[#E4E7EC] mx-auto mb-4" />
                <p className="text-[#667085]">Aucun résultat trouvé pour votre recherche.</p>
                <button
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("all");
                    setActiveSupport("all");
                  }}
                  className="mt-4 text-[#2A9D8F] font-medium hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContents.map((content) => {
                  const uniqueDevices =
                    content.type === "video" && content.video_variants
                      ? Array.from(new Set(content.video_variants.map((v) => v.device)))
                      : [];

                  return (
                    <Link
                      href={`/formation/${content.slug}`}
                      key={content.id}
                      className="group bg-white rounded-2xl border border-[#E4E7EC] overflow-hidden shadow-[0_2px_8px_rgba(16,24,40,0.03)] hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
                    >
                      <div className="relative aspect-video bg-[#F9FAFB] border-b border-[#E4E7EC]/50 overflow-hidden">
                        {content.thumbnail_url ? (
                          <img
                            src={content.thumbnail_url}
                            alt={content.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BeharLogo size="sm" className="opacity-20 grayscale" />
                          </div>
                        )}

                        {content.type === "video" && (
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                            <div className="size-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                              <Play className="size-5 text-[#2A9D8F] ml-1" fill="currentColor" />
                            </div>
                          </div>
                        )}

                        {(content.duration_minutes || content.reading_time_minutes) && (
                          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
                            {content.type === "video"
                              ? `${content.duration_minutes}:00`
                              : `${content.reading_time_minutes} min`}
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-[11px] font-bold tracking-wide uppercase text-[#2A9D8F] bg-[#E5F5F3] px-2 py-0.5 rounded-sm">
                            {CATEGORIES.find((c) => c.id === content.category)?.label || content.category}
                          </span>

                          {uniqueDevices.length > 0 && (
                            <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E4E7EC] px-1.5 py-0.5 rounded-sm">
                              {uniqueDevices.includes("desktop") && (
                                <span title="PC / Mac">
                                  <Monitor className="size-3 text-[#667085]" />
                                </span>
                              )}
                              {uniqueDevices.includes("tablet") && (
                                <span title="Tablette">
                                  <Tablet className="size-3 text-[#667085]" />
                                </span>
                              )}
                              {uniqueDevices.includes("mobile") && (
                                <span title="Mobile">
                                  <Smartphone className="size-3 text-[#667085]" />
                                </span>
                              )}
                            </div>
                          )}

                          {content.level === "beginner" && (
                            <span className="text-[11px] font-medium text-[#667085] flex items-center gap-1">
                              <div className="flex gap-0.5">
                                <div className="w-1 h-2 bg-[#2A9D8F] rounded-sm" />
                                <div className="w-1 h-2 bg-[#E4E7EC] rounded-sm" />
                                <div className="w-1 h-2 bg-[#E4E7EC] rounded-sm" />
                              </div>
                              Débutant
                            </span>
                          )}
                          {content.level === "intermediate" && (
                            <span className="text-[11px] font-medium text-[#667085] flex items-center gap-1">
                              <div className="flex gap-0.5">
                                <div className="w-1 h-2 bg-[#2A9D8F] rounded-sm" />
                                <div className="w-1 h-2 bg-[#2A9D8F] rounded-sm" />
                                <div className="w-1 h-2 bg-[#E4E7EC] rounded-sm" />
                              </div>
                              Intermédiaire
                            </span>
                          )}
                        </div>

                        <h2 className="text-[17px] font-bold text-[#101828] leading-snug mb-2 group-hover:text-[#2A9D8F] transition-colors">
                          {content.title}
                        </h2>
                        <p className="text-[#667085] text-sm line-clamp-2 leading-relaxed flex-1">{content.summary}</p>

                        <div className="mt-4 pt-4 border-t border-[#E4E7EC] flex items-center justify-between text-[#98A2B3]">
                          <div className="flex items-center gap-1.5">
                            {content.type === "video" ? <Video className="size-4" /> : <FileText className="size-4" />}
                            <span className="text-xs font-medium uppercase tracking-wider">
                              {content.type === "video" ? "Vidéo" : "Guide"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[#2A9D8F] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                            <span className="text-xs font-semibold">Voir</span>
                            <ChevronRight className="size-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
