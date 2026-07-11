import {
  WIDGET_ASSET_INPUT_MAX_BYTES,
  WIDGET_ASSET_OUTPUT_MAX_BYTES,
  WIDGET_ASSET_MIME_TYPES,
} from "@/lib/widget/asset-contract";

export type OptimizedWidgetImage = { file: File; width: number; height: number };

export function validateWidgetImageSelection(file: Pick<File, "size" | "type">) {
  if (!WIDGET_ASSET_MIME_TYPES.includes(file.type as (typeof WIDGET_ASSET_MIME_TYPES)[number])) {
    return { ok: false as const, code: "invalid_format" as const };
  }
  if (file.size < 1 || file.size > WIDGET_ASSET_INPUT_MAX_BYTES) {
    return { ok: false as const, code: "too_large" as const };
  }
  return { ok: true as const };
}

export async function optimizeWidgetImage(file: File): Promise<OptimizedWidgetImage> {
  const validation = validateWidgetImageSelection(file);
  if (!validation.ok) throw new Error(validation.code);
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("optimization_failed");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob || blob.size > WIDGET_ASSET_OUTPUT_MAX_BYTES) throw new Error("optimization_failed");
  return { file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }), width, height };
}
