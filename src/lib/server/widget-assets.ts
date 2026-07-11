import {
  WIDGET_ASSET_MAX_DIMENSION,
  WIDGET_ASSET_MIME_TYPES,
  WIDGET_ASSET_OUTPUT_MAX_BYTES,
} from "@/lib/widget/asset-contract";

export type WidgetAssetValidationInput = {
  declaredType: string;
  size: number;
  bytes: Uint8Array;
  width: number;
  height: number;
};

export type WidgetAssetValidationResult =
  | { ok: true; mimeType: (typeof WIDGET_ASSET_MIME_TYPES)[number] }
  | { ok: false; code: "invalid_format" | "too_large" | "invalid_dimensions" };

function detectedMime(bytes: Uint8Array): (typeof WIDGET_ASSET_MIME_TYPES)[number] | null {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export function validateWidgetAssetUpload(input: WidgetAssetValidationInput): WidgetAssetValidationResult {
  if (input.size < 1 || input.size > WIDGET_ASSET_OUTPUT_MAX_BYTES || input.bytes.length !== input.size) {
    return { ok: false, code: "too_large" };
  }
  const mimeType = detectedMime(input.bytes);
  if (!mimeType || mimeType !== input.declaredType || !WIDGET_ASSET_MIME_TYPES.includes(mimeType)) {
    return { ok: false, code: "invalid_format" };
  }
  if (
    !Number.isInteger(input.width) ||
    !Number.isInteger(input.height) ||
    input.width < 1 ||
    input.height < 1 ||
    input.width > WIDGET_ASSET_MAX_DIMENSION ||
    input.height > WIDGET_ASSET_MAX_DIMENSION
  ) {
    return { ok: false, code: "invalid_dimensions" };
  }
  return { ok: true, mimeType };
}
