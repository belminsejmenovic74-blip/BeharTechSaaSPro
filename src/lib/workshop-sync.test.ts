import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/client", () => supabaseMocks);

import { useBeharStore } from "@/lib/behar-store";
import {
  getWorkshopSyncState,
  hydrateStoreFromCloud,
  loadSnapshotByLicenseKey,
  markSyncStatus,
  type WorkshopSnapshot,
} from "@/lib/workshop-sync";

const WORKSHOP_ID = "10000000-0000-4000-8000-000000000001";
const LICENSE_KEY = "BHT-2026-TEST-0001";
const UPDATED_AT = "2026-07-11T10:00:00.000Z";

describe("hydrateStoreFromCloud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.isSupabaseConfigured.mockReturnValue(true);
    window.localStorage.clear();
    useBeharStore.setState({
      _hasHydrated: true,
      licenseActivated: true,
      licenseKey: LICENSE_KEY,
      cloudSync: {
        stateVersion: 7,
        lastSyncedStateVersion: 7,
        lastSyncedAt: UPDATED_AT,
      },
    });
  });

  it("repairs a missing workshopId even when the local snapshot is already current", () => {
    const snapshot: WorkshopSnapshot = {
      id: "snapshot-1",
      workshopId: WORKSHOP_ID,
      licenseKey: LICENSE_KEY,
      state: {
        licenseActivated: true,
        licenseKey: LICENSE_KEY,
        cloudSync: {
          workshopId: WORKSHOP_ID,
          stateVersion: 7,
          lastSyncedStateVersion: 7,
          lastSyncedAt: UPDATED_AT,
        },
      },
      stateSizeBytes: 1,
      updatedAt: UPDATED_AT,
    };

    hydrateStoreFromCloud(snapshot);

    expect(useBeharStore.getState().cloudSync?.workshopId).toBe(WORKSHOP_ID);
    expect(useBeharStore.getState().licenseKey).toBe(LICENSE_KEY);
  });

  it("leaves the loading state after a successful cloud read", async () => {
    const row = {
      id: "snapshot-1",
      workshop_id: WORKSHOP_ID,
      license_key: LICENSE_KEY,
      state: { cloudSync: { stateVersion: 7 } },
      state_size_bytes: 1,
      updated_at: UPDATED_AT,
    };
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "ilike", "order", "limit", "abortSignal"]) {
      chain[method] = vi.fn(() => chain);
    }
    chain.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
    supabaseMocks.getSupabase.mockReturnValue({ from: vi.fn(() => chain) });
    markSyncStatus("loading");

    const snapshot = await loadSnapshotByLicenseKey(LICENSE_KEY);

    expect(snapshot?.workshopId).toBe(WORKSHOP_ID);
    expect(getWorkshopSyncState()).toMatchObject({ status: "synced", lastSyncedAt: UPDATED_AT });
  });
});
