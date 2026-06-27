export type HelpContentType = "video" | "guide" | "faq";
export type HelpContentCategory =
  | "comptoir"
  | "clients"
  | "factures"
  | "stock"
  | "atelier"
  | "suivi_client"
  | "admin"
  | "general";
export type HelpContentVisibility = "public" | "internal" | "admin";
export type HelpContentStatus = "draft" | "published";
export type HelpContentAudience = "behar_customers" | "internal_team";
export type HelpContentLevel = "beginner" | "intermediate";
export type HelpContentSupport = "desktop" | "tablet" | "mobile" | "all";
export type HelpContentContext =
  | "dashboard"
  | "comptoir"
  | "atelier"
  | "client_portal"
  | "admin"
  | "stock"
  | "billing";

export type HelpVideoVariant = {
  id: string;
  label: string;
  device: "desktop" | "tablet" | "mobile";
  context: "dashboard" | "comptoir" | "atelier" | "client_portal" | "admin" | "factures" | "stock" | "suivi_client";
  videoUrl: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
  isDefault?: boolean;
  order: number;
};

export type HelpContent = {
  id: string;
  title: string;
  slug: string;
  type: HelpContentType;
  category: HelpContentCategory;
  visibility: HelpContentVisibility;
  status: HelpContentStatus;
  audience: HelpContentAudience;
  summary: string;
  content: string | null;
  tags: string[] | null;
  level: HelpContentLevel | null;
  support: HelpContentSupport;
  context: HelpContentContext;
  duration_minutes: number | null;
  reading_time_minutes: number | null;
  video_url: string | null;
  video_storage_path: string | null;
  thumbnail_url: string | null;
  video_variants?: HelpVideoVariant[];
  attachments: { name: string; url: string; size?: string }[] | null;
  chapters: { title: string; time?: string; order: number }[] | null;
  cta_label: string | null;
  cta_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  author: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};
