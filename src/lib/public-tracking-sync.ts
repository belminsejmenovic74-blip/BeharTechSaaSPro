import type { Repair, StoreState } from "@/lib/behar-store";
import { getTrackingCode, createShopSlug } from "@/lib/customer-tracking";
import { buildPublicRepairDtoFromLocalState } from "@/lib/public-repair-dto";

export async function syncPublicTrackingRepairsToCloud(
  repairs: Repair[],
  state: Pick<
    StoreState,
    | "cloudSync"
    | "customers"
    | "documents"
    | "invoices"
    | "licenseKey"
    | "quotes"
    | "repairs"
    | "workshopInfo"
    | "workshopSettings"
  >,
): Promise<boolean> {
  if (!repairs.length) return true;

  const workshopId = state.cloudSync?.workshopId;
  const licenseKey = state.licenseKey;
  if (!workshopId || !licenseKey) return false;
  const shopName = (
    state.workshopSettings?.commercialName ||
    state.workshopSettings?.name ||
    state.workshopInfo?.name ||
    "behar-tech"
  ).trim();
  const shopSlug = createShopSlug(shopName);

  const payload = repairs
    .map((repair) => {
      const token = getTrackingCode(repair);
      if (!token) return null;
      const publicData = buildPublicRepairDtoFromLocalState(state, token);
      if (!publicData) return null;
      return {
        tracking_id: token,
        shop_slug: shopSlug,
        repair_number: repair.number || publicData.repair.number,
        status: publicData.repair.status,
        device: [publicData.repair.deviceBrand, publicData.repair.deviceModel].filter(Boolean).join(" "),
        public_data: publicData,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!payload.length) return true;

  const response = await fetch("/api/behar/publications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ licenseKey, workshopId, repairs: payload, documents: [] }),
  });
  if (!response.ok) {
    console.error("[public-tracking-sync] Failed to sync repairs:", response.status);
    return false;
  }
  return true;
}
