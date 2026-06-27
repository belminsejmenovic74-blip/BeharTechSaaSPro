"use client";

import { useState } from "react";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CheckCircle2, Edit2, FileText, Plus, Search, Video } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { useHelpContents } from "@/lib/hooks/use-help-center";
import { cn } from "@/lib/utils";

export default function CmsListPage() {
  const router = useRouter();
  const { data: contents, loading } = useHelpContents();
  const [search, setSearch] = useState("");

  const filteredContents = contents.filter((c) => {
    if (search.length > 2) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    }
    return true;
  });

  const publishedGuides = contents.filter((c) => c.status === "published" && c.type === "guide").length;
  const publishedVideos = contents.filter((c) => c.status === "published" && c.type === "video").length;
  const drafts = contents.filter((c) => c.status === "draft").length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <Head>
        <title>CMS Formation | Behar Tech Pro</title>
      </Head>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1916]">Centre de Formation (CMS)</h1>
          <p className="text-sm text-[#6B6B6B]">Gérez les tutoriels, guides et vidéos de l'académie.</p>
        </div>
        <Link href="/admin/cms/new">
          <PrimaryButton className="gap-2">
            <Plus className="size-4" />
            Nouveau contenu
          </PrimaryButton>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E8E8E5] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#6B6B6B] mb-2">
            <FileText className="size-4" />
            <h3 className="text-sm font-medium">Guides publiés</h3>
          </div>
          <p className="text-3xl font-bold text-[#1A1916]">{publishedGuides}</p>
        </div>
        <div className="rounded-xl border border-[#E8E8E5] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#6B6B6B] mb-2">
            <Video className="size-4" />
            <h3 className="text-sm font-medium">Vidéos publiées</h3>
          </div>
          <p className="text-3xl font-bold text-[#1A1916]">{publishedVideos}</p>
        </div>
        <div className="rounded-xl border border-[#E8E8E5] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#6B6B6B] mb-2">
            <Edit2 className="size-4" />
            <h3 className="text-sm font-medium">Brouillons</h3>
          </div>
          <p className="text-3xl font-bold text-[#1A1916]">{drafts}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#E8E8E5] bg-white shadow-[0_1px_2px_rgba(26,25,22,0.02)]">
        <div className="border-b border-[#E8E8E5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A3A3A3]" />
            <input
              type="search"
              placeholder="Rechercher un contenu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E8E8E5] bg-[#FAFAF8] pl-9 pr-4 text-sm text-[#1A1916] focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8E8E5] bg-[#FAFAF8] text-[#6B6B6B]">
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Dernière modif.</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E5]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B6B6B]">Chargement...</td>
                </tr>
              ) : filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B6B6B]">Aucun contenu trouvé.</td>
                </tr>
              ) : (
                filteredContents.map((content) => (
                  <tr key={content.id} className="transition-colors hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3 font-medium text-[#1A1916]">
                      {content.title}
                      <div className="text-xs text-[#A3A3A3] font-normal">{content.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[#6B6B6B]">
                        {content.type === "video" ? <Video className="size-4" /> : <FileText className="size-4" />}
                        <span className="capitalize">{content.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B6B] capitalize">{content.category}</td>
                    <td className="px-4 py-3">
                      {content.status === "published" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F5F3] px-2 py-0.5 text-xs font-medium text-[#167B70]">
                          <CheckCircle2 className="size-3" />
                          Publié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#4B5563]">
                          Brouillon
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6B6B6B]">
                      {format(new Date(content.updated_at), "dd MMM yyyy", { locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SecondaryButton
                        onClick={() => router.push(`/admin/cms/edit/${content.id}`)}
                        className="h-8 px-3 text-xs"
                      >
                        Éditer
                      </SecondaryButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
