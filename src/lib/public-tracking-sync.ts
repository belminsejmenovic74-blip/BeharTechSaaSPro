import type { Repair, StoreState } from "@/lib/behar-store";
import { getTrackingCode, createShopSlug } from "@/lib/customer-tracking";
import { buildPublicRepairDtoFromLocalState } from "@/lib/public-repair-dto";
import { getSupabase } from "@/lib/supabase/client";

export async function syncPublicTrackingRepairsToCloud(
  repairs: Repair[],
  state: Pick<
    StoreState,
    "cloudSync" | "customers" | "documents" | "invoices" | "quotes" | "repairs" | "workshopInfo" | "workshopSettings"
  >,
): Promise<boolean> {
  if (!repairs.length) return true;

  const supabase = getSupabase();
  if (!supabase) return false;

  const workshopId = state.cloudSync?.workshopId || "unknown";
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
        workshop_id: workshopId,
        shop_slug: shopSlug,
        repair_number: repair.number || publicData.repair.number,
        status: publicData.repair.status,
        device: [publicData.repair.deviceBrand, publicData.repair.deviceModel].filter(Boolean).join(" "),
        public_data: publicData,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!payload.length) return true;

  const { error } = await supabase.from("public_tracking_repairs").upsert(payload, { onConflict: "tracking_id" });

  if (error) {
    console.error("[public-tracking-sync] Failed to sync repairs:", error.message);
    return false;
  }
  return true;
}
