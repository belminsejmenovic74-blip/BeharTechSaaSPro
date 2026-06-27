"use client";

import { use } from "react";
import { useHelpContent } from "@/lib/hooks/use-help-center";
import { CmsEditor } from "@/components/behar/cms-editor";
import { BeharLogo } from "@/components/behar/behar-logo";

export default function EditCmsContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useHelpContent(id);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <BeharLogo size="lg" className="animate-pulse mb-8" />
        <div className="text-[#6B6B6B]">Chargement de l'éditeur...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-[#B42318]">
        Contenu introuvable ou erreur de chargement.
      </div>
    );
  }

  return <CmsEditor initialData={data} />;
}
