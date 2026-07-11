import { describe, expect, it } from "vitest";

import { validateWidgetAssetUpload } from "@/lib/server/widget-assets";
import { WIDGET_ASSET_OUTPUT_MAX_BYTES } from "@/lib/widget/asset-contract";
import { validateWidgetImageSelection } from "@/lib/widget/image-optimizer";

describe("médias du widget", () => {
  it("refuse les formats déclarés ou binaires invalides", () => {
    expect(validateWidgetImageSelection({ type: "image/svg+xml", size: 1200 })).toEqual({
      ok: false,
      code: "invalid_format",
    });
    expect(
      validateWidgetAssetUpload({
        declaredType: "image/webp",
        size: 12,
        bytes: new Uint8Array(12),
        width: 24,
        height: 24,
      }),
    ).toEqual({ ok: false, code: "invalid_format" });
  });

  it("refuse une image source trop lourde et une sortie dépassant la limite", () => {
    expect(validateWidgetImageSelection({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toEqual({
      ok: false,
      code: "too_large",
    });
    expect(
      validateWidgetAssetUpload({
        declaredType: "image/webp",
        size: WIDGET_ASSET_OUTPUT_MAX_BYTES + 1,
        bytes: new Uint8Array(WIDGET_ASSET_OUTPUT_MAX_BYTES + 1),
        width: 24,
        height: 24,
      }),
    ).toEqual({ ok: false, code: "too_large" });
  });

  it("vérifie la signature réelle, le type déclaré et les dimensions", () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(
      validateWidgetAssetUpload({ declaredType: "image/png", size: webp.length, bytes: webp, width: 24, height: 24 }),
    ).toEqual({ ok: false, code: "invalid_format" });
    expect(
      validateWidgetAssetUpload({ declaredType: "image/webp", size: webp.length, bytes: webp, width: 900, height: 24 }),
    ).toEqual({ ok: false, code: "invalid_dimensions" });
    expect(
      validateWidgetAssetUpload({ declaredType: "image/webp", size: webp.length, bytes: webp, width: 24, height: 24 }),
    ).toEqual({ ok: true, mimeType: "image/webp" });
  });
});
