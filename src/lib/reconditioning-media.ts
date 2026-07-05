"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { ReconditioningMedia, ReconditioningMediaVisibility } from "@/lib/reconditioning-store";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const BUCKET = "reconditioning-media";

function safeFileName(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return clean || "photo.webp";
}

export async function uploadReconditioningMedia(input: {
  file: File;
  organizationId: string;
  shopId: string;
  deviceId: string;
  visibility: ReconditioningMediaVisibility;
  isPrimary?: boolean;
  sortOrder?: number;
  uploadedBy?: string;
}): Promise<
  Pick<
    ReconditioningMedia,
    "id" | "deviceId" | "storagePath" | "publicUrl" | "visibility" | "isPublic" | "isPrimary" | "sortOrder"
  >
> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase non configuré.");
  if (!input.file || input.file.size <= 0) throw new Error("Image vide.");
  if (input.file.size > MAX_SIZE_BYTES) throw new Error("Image trop volumineuse.");
  if (!ALLOWED_MIME.has(input.file.type)) throw new Error("Format image non supporté.");

  const fileName = safeFileName(input.file.name);
  const storagePath = [
    input.organizationId,
    input.shopId,
    "reconditioning",
    input.deviceId,
    input.visibility,
    `${Date.now()}_${fileName}`,
  ].join("/");

  const upload = await supabase.storage.from(BUCKET).upload(storagePath, input.file, {
    cacheControl: "3600",
    contentType: input.file.type,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = input.visibility === "public_sale" ? publicData.publicUrl : undefined;
  const insert = await supabase
    .from("reconditioning_device_media")
    .insert({
      organization_id: input.organizationId,
      shop_id: input.shopId,
      device_id: input.deviceId,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      public_url: publicUrl || null,
      visibility: input.visibility,
      is_public: input.visibility === "public_sale",
      is_primary: Boolean(input.isPrimary),
      sort_order: input.sortOrder ?? 0,
      file_name: input.file.name,
      mime_type: input.file.type,
      file_size: input.file.size,
      uploaded_by: input.uploadedBy || null,
    })
    .select("id")
    .single();
  if (insert.error) throw insert.error;

  return {
    id: String(insert.data.id),
    deviceId: input.deviceId,
    storagePath,
    publicUrl,
    visibility: input.visibility,
    isPublic: input.visibility === "public_sale",
    isPrimary: Boolean(input.isPrimary),
    sortOrder: input.sortOrder ?? 0,
  };
}
