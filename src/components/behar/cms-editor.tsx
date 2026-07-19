"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import {
  ArrowLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Eye,
  Save,
  Send,
  Upload,
  Video as VideoIcon,
  Image as ImageIcon,
  Minus,
  Link as LinkIcon,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import type { HelpContent } from "@/lib/supabase/help-content-types";

// Composant éditeur Tiptap Toolbar
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#E4E7EC] p-2 bg-[#F9FAFB] rounded-t-xl">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded ${editor.isActive("bold") ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        <Bold className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded ${editor.isActive("italic") ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        <Italic className="size-4" />
      </button>
      <div className="w-px h-4 bg-[#E4E7EC] mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 text-sm font-semibold rounded ${editor.isActive("heading", { level: 2 }) ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 py-1 text-sm font-semibold rounded ${editor.isActive("heading", { level: 3 }) ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        H3
      </button>
      <div className="w-px h-4 bg-[#E4E7EC] mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded ${editor.isActive("bulletList") ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        <List className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded ${editor.isActive("orderedList") ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        <ListOrdered className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded ${editor.isActive("blockquote") ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        <Quote className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-1.5 rounded text-[#667085] hover:bg-[#E4E7EC]"
      >
        <Minus className="size-4" />
      </button>
      <div className="w-px h-4 bg-[#E4E7EC] mx-1" />
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("URL du lien");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={`p-1.5 rounded ${editor.isActive("link") ? "bg-[#E4E7EC] text-[#101828]" : "text-[#667085] hover:bg-[#E4E7EC]"}`}
      >
        <LinkIcon className="size-4" />
      </button>
    </div>
  );
};

export function CmsEditor({ initialData }: { initialData?: HelpContent }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<HelpContent>>({
    title: "",
    slug: "",
    type: "guide",
    category: "comptoir",
    visibility: "public",
    status: "draft",
    audience: "behar_customers",
    support: "all",
    context: "dashboard",
    summary: "",
    content: "",
    video_url: "",
    video_storage_path: "",
    thumbnail_url: "",
    ...initialData,
  });

  const editor = useEditor({
    extensions: [StarterKit, LinkExtension.configure({ openOnClick: false })],
    content: formData.content || "",
    onUpdate: ({ editor }) => {
      setFormData((prev) => ({ ...prev, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4 text-[#101828]",
      },
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSlugify = () => {
    if (formData.title) {
      setFormData({
        ...formData,
        slug: formData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      });
    }
  };

  const handleUpload = async (file: File, type: "video" | "thumbnail") => {
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 100MB)");
      toast.loading("Obtention de l'URL sécurisée...", { id: "upload" });

      const res = await fetch("/api/help-center/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Erreur URL");
      const { signedUrl, path, publicUrl } = await res.json();

      toast.loading("Envoi en cours...", { id: "upload" });
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Échec de l'upload");

      toast.success("Fichier envoyé avec succès !", { id: "upload" });
      if (type === "video") {
        setFormData((prev) => ({ ...prev, video_storage_path: publicUrl }));
      } else {
        setFormData((prev) => ({ ...prev, thumbnail_url: publicUrl }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi", { id: "upload" });
    }
  };

  const handleSave = async (status: "draft" | "published") => {
    try {
      if (!formData.title || !formData.slug || !formData.category || !formData.support || !formData.summary) {
        toast.error("Veuillez remplir les champs obligatoires (Titre, Slug, Catégorie, Support, Résumé).");
        return;
      }
      if (formData.type === "video") {
        if (!formData.video_variants || formData.video_variants.length === 0) {
          toast.error("Au moins une version vidéo est obligatoire pour le type Vidéo.");
          return;
        }
        if (formData.video_variants.some((v) => !v.videoUrl)) {
          toast.error("Toutes les versions vidéo doivent avoir un fichier ou une URL.");
          return;
        }
      }
      setLoading(true);
      const payload = { ...formData, status };
      const method = initialData?.id ? "PUT" : "POST";
      const url = initialData?.id ? `/api/help-center/${initialData.id}` : "/api/help-center";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur de sauvegarde");
      }

      toast.success(status === "published" ? "Contenu publié !" : "Brouillon sauvegardé.");
      router.push("/admin/cms");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-[1400px] mx-auto w-full p-4 md:p-8 space-y-6">
      {/* Topbar Éditeur */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E4E7EC] pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg text-[#667085] hover:bg-[#F9FAFB] transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#101828]">Éditeur CMS</h1>
              <span className="text-[10px] font-bold tracking-wide uppercase text-[#2A9D8F] bg-[#E5F5F3] px-2 py-0.5 rounded-sm">
                {formData.type === "video" ? "Vidéo" : "Guide"}
              </span>
            </div>
            <p className="text-sm text-[#667085]">Création / Édition du centre de formation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SecondaryButton
            onClick={() => window.open(`/formation/${formData.slug}`, "_blank")}
            className="gap-2 bg-white"
          >
            <Eye className="size-4" />
            Aperçu public
          </SecondaryButton>
          <SecondaryButton onClick={() => handleSave("draft")} disabled={loading} className="gap-2 bg-white">
            <Save className="size-4" />
            Enregistrer (Brouillon)
          </SecondaryButton>
          <PrimaryButton onClick={() => handleSave("published")} disabled={loading} className="gap-2">
            <Send className="size-4" />
            Publier
          </PrimaryButton>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Colonne Principale (Gauche) */}
        <div className="flex-1 w-full space-y-8">
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 space-y-6 shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Titre du contenu *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onBlur={handleSlugify}
                  placeholder="Ex: Créer une facture depuis le comptoir"
                  className="w-full h-10 px-3 border border-[#E4E7EC] rounded-lg focus:outline-none focus:border-[#2A9D8F]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Slug (URL) *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="creer-une-facture"
                  className="w-full h-10 px-3 border border-[#E4E7EC] rounded-lg bg-[#F9FAFB] focus:outline-none focus:border-[#2A9D8F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Catégorie *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-[#E4E7EC] rounded-lg bg-white focus:outline-none focus:border-[#2A9D8F]"
                >
                  <option value="comptoir">Comptoir</option>
                  <option value="clients">Clients</option>
                  <option value="factures">Factures</option>
                  <option value="stock">Stock</option>
                  <option value="atelier">Atelier</option>
                  <option value="suivi_client">Suivi client</option>
                  <option value="admin">Admin</option>
                  <option value="general">Général</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Type de contenu *</label>
                <div className="flex p-1 bg-[#F9FAFB] border border-[#E4E7EC] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "video" })}
                    className={`flex-1 text-sm font-medium h-8 rounded-md transition-all ${formData.type === "video" ? "bg-white shadow-sm border border-[#E4E7EC] text-[#2A9D8F]" : "text-[#667085]"}`}
                  >
                    Vidéo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "guide" })}
                    className={`flex-1 text-sm font-medium h-8 rounded-md transition-all ${formData.type === "guide" ? "bg-white shadow-sm border border-[#E4E7EC] text-[#2A9D8F]" : "text-[#667085]"}`}
                  >
                    Guide
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Visibilité *</label>
                <div className="flex p-1 bg-[#F9FAFB] border border-[#E4E7EC] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, visibility: "public" })}
                    className={`flex-1 text-sm font-medium h-8 rounded-md transition-all ${formData.visibility === "public" ? "bg-white shadow-sm border border-[#E4E7EC] text-[#101828]" : "text-[#667085]"}`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, visibility: "internal" })}
                    className={`flex-1 text-sm font-medium h-8 rounded-md transition-all ${formData.visibility === "internal" ? "bg-white shadow-sm border border-[#E4E7EC] text-[#101828]" : "text-[#667085]"}`}
                  >
                    Interne
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#101828]">Résumé (Description courte) *</label>
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-[#E4E7EC] rounded-lg focus:outline-none focus:border-[#2A9D8F] text-sm resize-none"
                placeholder="Un résumé clair de ce que contient ce tutoriel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#101828]">Contenu riche (Tiptap) *</label>
              <div className="border border-[#E4E7EC] rounded-xl overflow-hidden bg-white">
                <MenuBar editor={editor} />
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {formData.type === "video" && (
            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 space-y-6 shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-4">
                <div>
                  <h3 className="font-semibold text-[#101828] flex items-center gap-2">
                    <VideoIcon className="size-5 text-[#2A9D8F]" />
                    Versions vidéo (Multi-supports)
                  </h3>
                  <p className="text-sm text-[#667085]">
                    Ajoutez une ou plusieurs versions adaptées au support ou contexte.
                  </p>
                </div>
                <SecondaryButton
                  onClick={() => {
                    const newVariants = [...(formData.video_variants || [])];
                    newVariants.push({
                      id: Math.random().toString(36).substr(2, 9),
                      label: "Nouvelle version",
                      device: "desktop",
                      context: (formData.context === "billing" ? "factures" : formData.context || "dashboard") as any,
                      videoUrl: "",
                      order: newVariants.length,
                      isDefault: newVariants.length === 0,
                    });
                    setFormData({ ...formData, video_variants: newVariants });
                  }}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  Ajouter une version
                </SecondaryButton>
              </div>

              <div className="space-y-6">
                {(formData.video_variants || []).map((variant, index) => (
                  <div
                    key={variant.id}
                    className="p-4 border border-[#E4E7EC] rounded-xl bg-[#F9FAFB] space-y-4 relative group"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newVariants = [...(formData.video_variants || [])];
                          if (index > 0) {
                            [newVariants[index - 1], newVariants[index]] = [newVariants[index], newVariants[index - 1]];
                            setFormData({ ...formData, video_variants: newVariants });
                          }
                        }}
                        className="p-1 text-[#98A2B3] hover:text-[#101828] transition-colors"
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newVariants = [...(formData.video_variants || [])];
                          if (index < newVariants.length - 1) {
                            [newVariants[index + 1], newVariants[index]] = [newVariants[index], newVariants[index + 1]];
                            setFormData({ ...formData, video_variants: newVariants });
                          }
                        }}
                        className="p-1 text-[#98A2B3] hover:text-[#101828] transition-colors"
                        disabled={index === (formData.video_variants?.length || 1) - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newVariants = formData.video_variants?.filter((_, i) => i !== index);
                          setFormData({ ...formData, video_variants: newVariants });
                        }}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors ml-2"
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-24">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#101828]">Titre / Label *</label>
                        <input
                          type="text"
                          value={variant.label}
                          onChange={(e) => {
                            const newVariants = [...(formData.video_variants || [])];
                            newVariants[index].label = e.target.value;
                            setFormData({ ...formData, video_variants: newVariants });
                          }}
                          className="w-full h-8 px-2 text-sm border border-[#E4E7EC] rounded bg-white focus:border-[#2A9D8F] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#101828]">Support *</label>
                        <select
                          value={variant.device}
                          onChange={(e) => {
                            const newVariants = [...(formData.video_variants || [])];
                            newVariants[index].device = e.target.value as any;
                            setFormData({ ...formData, video_variants: newVariants });
                          }}
                          className="w-full h-8 px-2 text-sm border border-[#E4E7EC] rounded bg-white focus:border-[#2A9D8F] focus:outline-none"
                        >
                          <option value="desktop">PC / Mac</option>
                          <option value="tablet">Tablette</option>
                          <option value="mobile">Mobile</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#101828]">Contexte *</label>
                        <select
                          value={variant.context}
                          onChange={(e) => {
                            const newVariants = [...(formData.video_variants || [])];
                            newVariants[index].context = e.target.value as any;
                            setFormData({ ...formData, video_variants: newVariants });
                          }}
                          className="w-full h-8 px-2 text-sm border border-[#E4E7EC] rounded bg-white focus:border-[#2A9D8F] focus:outline-none"
                        >
                          <option value="dashboard">Dashboard</option>
                          <option value="comptoir">Comptoir</option>
                          <option value="atelier">Atelier</option>
                          <option value="admin">Admin</option>
                          <option value="factures">Factures</option>
                          <option value="stock">Stock</option>
                          <option value="suivi_client">Suivi client</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#101828]">Durée (min)</label>
                        <input
                          type="number"
                          value={variant.durationMinutes || ""}
                          onChange={(e) => {
                            const newVariants = [...(formData.video_variants || [])];
                            newVariants[index].durationMinutes = e.target.value ? parseInt(e.target.value) : undefined;
                            setFormData({ ...formData, video_variants: newVariants });
                          }}
                          className="w-full h-8 px-2 text-sm border border-[#E4E7EC] rounded bg-white focus:border-[#2A9D8F] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* URL / Fichier Vidéo */}
                      <div className="space-y-2 bg-white p-3 rounded-lg border border-[#E4E7EC]">
                        <label className="text-xs font-semibold text-[#101828]">Fichier ou URL Vidéo *</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={variant.videoUrl}
                            onChange={(e) => {
                              const newVariants = [...(formData.video_variants || [])];
                              newVariants[index].videoUrl = e.target.value;
                              setFormData({ ...formData, video_variants: newVariants });
                            }}
                            placeholder="https://... ou upload"
                            className="flex-1 h-8 px-2 text-sm border border-[#E4E7EC] rounded focus:border-[#2A9D8F] focus:outline-none"
                          />
                          <input
                            type="file"
                            id={`upload-video-${index}`}
                            className="hidden"
                            accept="video/mp4,video/webm"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                toast.loading("Upload vidéo en cours...", { id: `upload-${index}` });
                                fetch("/api/help-center/upload-url", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ fileName: f.name, contentType: f.type }),
                                })
                                  .then((r) => r.json())
                                  .then(async (data) => {
                                    const uploadRes = await fetch(data.signedUrl, {
                                      method: "PUT",
                                      headers: { "Content-Type": f.type },
                                      body: f,
                                    });
                                    if (!uploadRes.ok) throw new Error();
                                    const newVariants = [...(formData.video_variants || [])];
                                    newVariants[index].videoUrl = data.publicUrl;
                                    setFormData({ ...formData, video_variants: newVariants });
                                    toast.success("Vidéo uploadée", { id: `upload-${index}` });
                                  })
                                  .catch(() => toast.error("Erreur d'upload", { id: `upload-${index}` }));
                              }
                            }}
                          />
                          <SecondaryButton
                            onClick={() => document.getElementById(`upload-video-${index}`)?.click()}
                            className="h-8 text-xs shrink-0"
                          >
                            Upload
                          </SecondaryButton>
                        </div>
                      </div>

                      {/* Miniature */}
                      <div className="space-y-2 bg-white p-3 rounded-lg border border-[#E4E7EC]">
                        <label className="text-xs font-semibold text-[#101828]">Miniature (Optionnelle)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={variant.thumbnailUrl || ""}
                            onChange={(e) => {
                              const newVariants = [...(formData.video_variants || [])];
                              newVariants[index].thumbnailUrl = e.target.value;
                              setFormData({ ...formData, video_variants: newVariants });
                            }}
                            placeholder="https://... ou upload"
                            className="flex-1 h-8 px-2 text-sm border border-[#E4E7EC] rounded focus:border-[#2A9D8F] focus:outline-none"
                          />
                          <input
                            type="file"
                            id={`upload-thumb-${index}`}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                toast.loading("Upload image en cours...", { id: `upload-thumb-${index}` });
                                fetch("/api/help-center/upload-url", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ fileName: f.name, contentType: f.type }),
                                })
                                  .then((r) => r.json())
                                  .then(async (data) => {
                                    const uploadRes = await fetch(data.signedUrl, {
                                      method: "PUT",
                                      headers: { "Content-Type": f.type },
                                      body: f,
                                    });
                                    if (!uploadRes.ok) throw new Error();
                                    const newVariants = [...(formData.video_variants || [])];
                                    newVariants[index].thumbnailUrl = data.publicUrl;
                                    setFormData({ ...formData, video_variants: newVariants });
                                    toast.success("Image uploadée", { id: `upload-thumb-${index}` });
                                  })
                                  .catch(() => toast.error("Erreur d'upload", { id: `upload-thumb-${index}` }));
                              }
                            }}
                          />
                          <SecondaryButton
                            onClick={() => document.getElementById(`upload-thumb-${index}`)?.click()}
                            className="h-8 text-xs shrink-0"
                          >
                            Upload
                          </SecondaryButton>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id={`default-${index}`}
                        checked={variant.isDefault}
                        onChange={(e) => {
                          const newVariants = (formData.video_variants || []).map((v, i) => ({
                            ...v,
                            isDefault: i === index ? e.target.checked : false, // un seul default
                          }));
                          setFormData({ ...formData, video_variants: newVariants });
                        }}
                        className="rounded border-[#E4E7EC] text-[#2A9D8F] focus:ring-[#2A9D8F]"
                      />
                      <label htmlFor={`default-${index}`} className="text-xs text-[#667085] font-medium cursor-pointer">
                        Définir comme version vidéo par défaut
                      </label>
                    </div>
                  </div>
                ))}

                {(!formData.video_variants || formData.video_variants.length === 0) && (
                  <div className="text-center py-8 text-[#98A2B3] text-sm">
                    Aucune version vidéo n'a été ajoutée. <br />
                    Cliquez sur "Ajouter une version" pour commencer.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Colonne Latérale (Droite) */}
        <div className="lg:w-[360px] shrink-0 space-y-6">
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-[0_1px_2px_rgba(16,24,40,0.02)] space-y-6">
            <h3 className="font-semibold text-[#101828] pb-2 border-b border-[#E4E7EC]">Paramètres de ciblage</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Support visé *</label>
                <select
                  name="support"
                  value={formData.support}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-[#E4E7EC] rounded-lg bg-white text-sm focus:outline-none focus:border-[#2A9D8F]"
                >
                  <option value="all">Tous les supports</option>
                  <option value="desktop">PC / Mac</option>
                  <option value="tablet">Tablette</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Audience *</label>
                <select
                  name="audience"
                  value={formData.audience}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-[#E4E7EC] rounded-lg bg-white text-sm focus:outline-none focus:border-[#2A9D8F]"
                >
                  <option value="behar_customers">Clients (Ateliers)</option>
                  <option value="internal_team">Équipe Behar (Interne)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Contexte d'affichage</label>
                <select
                  name="context"
                  value={formData.context}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-[#E4E7EC] rounded-lg bg-white text-sm focus:outline-none focus:border-[#2A9D8F]"
                >
                  <option value="dashboard">Dashboard principal</option>
                  <option value="comptoir">Mode Comptoir</option>
                  <option value="atelier">Mode Atelier</option>
                  <option value="admin">Administration</option>
                  <option value="stock">Gestion de Stock</option>
                  <option value="billing">Facturation</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Niveau de difficulté</label>
                <select
                  name="level"
                  value={formData.level || ""}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-[#E4E7EC] rounded-lg bg-white text-sm focus:outline-none focus:border-[#2A9D8F]"
                >
                  <option value="">Non défini</option>
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-[0_1px_2px_rgba(16,24,40,0.02)] space-y-4">
            <h3 className="font-semibold text-[#101828] pb-2 border-b border-[#E4E7EC]">SEO & Métadonnées</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Meta Title</label>
                <input
                  type="text"
                  name="seo_title"
                  value={formData.seo_title || ""}
                  onChange={handleChange}
                  placeholder={formData.title || "Titre SEO"}
                  className="w-full h-9 px-3 text-sm border border-[#E4E7EC] rounded-lg focus:outline-none focus:border-[#2A9D8F]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#101828]">Meta Description</label>
                <textarea
                  name="seo_description"
                  value={formData.seo_description || ""}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 text-sm border border-[#E4E7EC] rounded-lg focus:outline-none focus:border-[#2A9D8F] resize-none"
                  placeholder={formData.summary || "Description courte SEO"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
