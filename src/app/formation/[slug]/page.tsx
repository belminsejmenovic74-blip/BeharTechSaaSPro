"use client";

import { useEffect, useState, use } from "react";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Clock, FileText, Info, Monitor, Smartphone, Tablet, Video } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

import { BeharLogo } from "@/components/behar/behar-logo";
import type { HelpContent } from "@/lib/supabase/help-content-types";

export default function FormationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);

  const [content, setContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // In a real app we might fetch by slug via an API route `GET /api/help-center/slug/:slug`
    // For MVP, we can fetch all and find, or just create a specific endpoint.
    // Let's assume we create a specific endpoint `/api/help-center/public?slug=...`
    fetch(`/api/help-center?visibility=public&status=published`)
      .then((res) => {
        if (!res.ok) throw new Error("Introuvable");
        return res.json();
      })
      .then((json: HelpContent[]) => {
        const found = json.find((c) => c.slug === slug);
        if (isMounted) {
          if (found) setContent(found);
          else setError(new Error("Contenu introuvable"));
        }
      })
      .catch((err) => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (content && content.type === "video" && content.video_variants?.length) {
      const isMobile = window.innerWidth <= 768;
      let targetVariant = null;

      if (isMobile) {
        targetVariant = content.video_variants.find((v) => v.device === "mobile");
      }

      if (!targetVariant) {
        targetVariant = content.video_variants.find((v) => v.isDefault) || content.video_variants[0];
      }

      if (targetVariant) {
        setActiveVariantId(targetVariant.id);
      }
    }
  }, [content]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6">
        <BeharLogo size="lg" className="animate-pulse mb-8" />
        <div className="h-6 bg-[#E4E7EC] rounded w-64 mb-4 animate-pulse" />
        <div className="h-4 bg-[#E4E7EC] rounded w-48 animate-pulse" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 text-center">
        <Info className="size-12 text-[#98A2B3] mb-4" />
        <h1 className="text-xl font-bold text-[#101828] mb-2">Contenu introuvable</h1>
        <p className="text-[#667085] mb-6">Ce tutoriel n'existe pas ou n'est plus disponible.</p>
        <Link href="/formation" className="text-[#2A9D8F] font-medium hover:underline">
          Retour à la formation
        </Link>
      </div>
    );
  }

  const sanitizedHTML = DOMPurify.sanitize(content.content || "");

  const activeVariant = content.video_variants?.find((v) => v.id === activeVariantId);
  const videoUrl = activeVariant?.videoUrl || content.video_url || content.video_storage_path;
  const thumbnailUrl = activeVariant?.thumbnailUrl || content.thumbnail_url;
  const duration = activeVariant?.durationMinutes || content.duration_minutes;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#101828] font-sans selection:bg-[#2A9D8F]/20 pb-20">
      <Head>
        <title>{content.seo_title || content.title} | Formation Behar Tech</title>
        {content.seo_description && <meta name="description" content={content.seo_description} />}
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Header Minimal */}
      <header className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/formation" className="p-2 -ml-2 rounded-lg text-[#667085] hover:bg-[#F9FAFB] transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="h-5 w-px bg-[#E4E7EC]" />
          <span className="font-medium text-[#101828] truncate max-w-[200px] sm:max-w-none">{content.title}</span>
        </div>
      </header>

      <main className="max-w-[840px] mx-auto px-6 py-12 space-y-8">
        {/* En-tête du contenu */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wide uppercase text-[#2A9D8F] bg-[#E5F5F3] px-2.5 py-1 rounded-md">
              {content.category}
            </span>
            {(duration || content.reading_time_minutes) && (
              <span className="text-[12px] font-medium text-[#667085] bg-white border border-[#E4E7EC] px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
                <Clock className="size-3.5" />
                {content.type === "video" ? `${duration} min` : `${content.reading_time_minutes} min`}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#101828] leading-tight">
            {content.title}
          </h1>
          <p className="text-lg text-[#667085] leading-relaxed max-w-3xl">{content.summary}</p>
        </div>

        {/* Sélecteur de version vidéo */}
        {content.type === "video" && content.video_variants && content.video_variants.length > 0 && (
          <div className="bg-white border border-[#E4E7EC] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm font-semibold text-[#101828]">Voir la version :</span>
            <div className="flex flex-wrap gap-2">
              {content.video_variants
                .sort((a, b) => a.order - b.order)
                .map((variant) => {
                  const Icon =
                    variant.device === "desktop" ? Monitor : variant.device === "tablet" ? Tablet : Smartphone;
                  const isActive = activeVariantId === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setActiveVariantId(variant.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#101828] text-white shadow-md scale-105"
                          : "bg-[#F9FAFB] text-[#667085] border border-[#E4E7EC] hover:bg-white hover:border-[#2A9D8F]/50"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="capitalize">
                        {variant.device === "desktop" ? "PC" : variant.device === "tablet" ? "Tablette" : "Mobile"}
                      </span>
                      <span className="opacity-50 mx-1">•</span>
                      <span className="capitalize">{variant.context}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Vidéo ou Media principal */}
        {content.type === "video" && videoUrl && (
          <div className="rounded-2xl border border-[#E4E7EC] overflow-hidden bg-black shadow-[0_4px_24px_rgba(16,24,40,0.04)]">
            <video
              key={videoUrl} // Force React to reload video element on URL change
              controls
              preload="metadata"
              poster={thumbnailUrl || undefined}
              className="w-full aspect-video outline-none"
            >
              <source src={videoUrl} />
              Votre navigateur ne supporte pas la lecture de vidéos.
            </video>
          </div>
        )}

        {/* Contenu Riche (Guide / FAQ) */}
        {content.content && (
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 md:p-10 shadow-[0_2px_12px_rgba(16,24,40,0.02)] prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:text-[#101828] prose-a:text-[#2A9D8F] prose-a:no-underline hover:prose-a:underline prose-p:text-[#101828] prose-p:leading-relaxed prose-li:text-[#101828]">
            <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
          </div>
        )}

        {/* Pièces jointes */}
        {content.attachments && content.attachments.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="size-5 text-[#667085]" />
              Ressources utiles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {content.attachments.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E4E7EC] hover:border-[#2A9D8F]/50 transition-colors group shadow-sm"
                >
                  <div className="grid size-10 place-items-center rounded-lg bg-[#F9FAFB] text-[#667085] group-hover:text-[#2A9D8F] group-hover:bg-[#E5F5F3] transition-colors">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#101828] truncate">{file.name}</p>
                    {file.size && <p className="text-xs text-[#98A2B3]">{file.size}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
