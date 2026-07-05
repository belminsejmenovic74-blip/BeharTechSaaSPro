"use client";

import { publishDomainEvent } from "@/lib/domain-events";
import { buildCertificateData, publicTokenForReconditioningFile } from "@/lib/reconditioning-certificate";
import type { ReconditioningFile, ReconditioningMedia } from "@/lib/reconditioning-store";
import { getSupabase } from "@/lib/supabase/client";

const jsonSafe = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function publicMedia(media: ReconditioningMedia[] | undefined) {
  return (media ?? [])
    .filter((item) => item.visibility === "public_sale" && item.isPublic)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      url: item.publicUrl || item.dataUrl,
      storage_path: item.storagePath,
      alt: "Photo appareil reconditionné",
      sort_order: item.sortOrder,
    }))
    .filter((item) => item.url && !item.url.startsWith("blob:") && !item.url.startsWith("data:"));
}

export function buildPublicReconditioningDisplayPayload(
  file: ReconditioningFile,
  workshopName = "Boutique",
  shopLogoUrl?: string,
) {
  const certificate = buildCertificateData(file, { workshopName, shopLogoUrl });
  const gallery = publicMedia(file.media);
  const safeCertificate = {
    ...certificate,
    imageUrl: gallery[0]?.url || "",
    publicPhotos: gallery.map((item) => item.url),
  };
  return jsonSafe({
    shop: {
      name: safeCertificate.workshopName,
      logo_url: shopLogoUrl || safeCertificate.shopLogoUrl || null,
    },
    device: {
      reference: safeCertificate.ref,
      brand: safeCertificate.brand,
      model: safeCertificate.model,
      storage: safeCertificate.storage,
      color: safeCertificate.color,
      sale_price: safeCertificate.price,
      final_grade: safeCertificate.grade,
      battery_health: safeCertificate.batteryHealth,
      warranty_months: safeCertificate.warrantyMonths,
      reconditioned_at: file.reconditionedAt || certificate.date,
    },
    diagnostic: {
      public_items: safeCertificate.controls,
    },
    media: {
      primary_image_url: gallery[0]?.url || null,
      gallery,
    },
    settings: {
      show_price: safeCertificate.publicSettings.showPrice,
      show_grade: safeCertificate.publicSettings.showGrade,
      show_battery: safeCertificate.publicSettings.showBattery,
      show_warranty: safeCertificate.publicSettings.showWarranty,
      show_public_photos: safeCertificate.publicSettings.showPublicPhotos,
      show_final_diagnostic: safeCertificate.publicSettings.showFinalDiagnostic,
    },
    certificate: safeCertificate,
  });
}

export async function syncPublicReconditioningCertificate(
  file: ReconditioningFile,
  options: { workshopId?: string; workshopName?: string; shopLogoUrl?: string } = {},
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const publicToken = publicTokenForReconditioningFile(file);
  const displayPayload = buildPublicReconditioningDisplayPayload(file, options.workshopName, options.shopLogoUrl);
  const { error } = await supabase.from("reconditioning_public_certificates").upsert(
    {
      device_id: file.id,
      public_token: publicToken,
      workshop_id: options.workshopId || "local",
      display_payload: displayPayload,
      status: file.status,
      sold_at: file.soldAt || null,
      sale_id: file.saleId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "public_token" },
  );
  if (error) {
    console.error("[reconditioning-public-sync] Failed to sync certificate:", error.message);
    return false;
  }
  publishDomainEvent({
    type: "public_certificate.updated",
    deviceId: file.id,
    publicToken,
    occurredAt: new Date().toISOString(),
  });
  return true;
}
