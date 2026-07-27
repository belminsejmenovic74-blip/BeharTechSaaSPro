import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
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
    vi.unstubAllGlobals();
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
    const snapshotResponse = {
      id: "snapshot-1",
      workshopId: WORKSHOP_ID,
      licenseKey: LICENSE_KEY,
      state: { cloudSync: { stateVersion: 7 } },
      stateSizeBytes: 1,
      updatedAt: UPDATED_AT,
    };
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ snapshot: snapshotResponse }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    markSyncStatus("loading");

    const snapshot = await loadSnapshotByLicenseKey(LICENSE_KEY);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/behar/snapshot",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
    expect(snapshot?.workshopId).toBe(WORKSHOP_ID);
    expect(getWorkshopSyncState()).toMatchObject({ status: "synced", lastSyncedAt: UPDATED_AT });
  });

  it("remplace intégralement les dossiers lorsqu'une autre licence est hydratée", () => {
    const store = useBeharStore.getState();
    store.resetDemo();
    const customerA = store.addCustomer({ name: "Client A isolation" });
    const repairAId = store.addRepair({
      customerId: customerA,
      device: "iPhone A",
      issue: "Dossier licence A",
      status: "Reçu",
      amount: 80,
      notes: "",
      droppedAt: UPDATED_AT,
      technician: "Technicien A",
    });
    const repairA = useBeharStore.getState().repairs.find((repair) => repair.id === repairAId);
    expect(repairA).toBeTruthy();

    hydrateStoreFromCloud(
      {
        id: "snapshot-a",
        workshopId: WORKSHOP_ID,
        licenseKey: "BHT-2026-CLIENT-A",
        state: { repairs: [repairA!], licenseKey: "BHT-2026-CLIENT-A" },
        stateSizeBytes: 1,
        updatedAt: "2026-07-11T11:00:00.000Z",
      },
      { force: true },
    );

    const repairB = { ...repairA!, id: "repair-client-b", number: "REP-B-0001", issue: "Dossier licence B" };
    hydrateStoreFromCloud(
      {
        id: "snapshot-b",
        workshopId: "10000000-0000-4000-8000-000000000002",
        licenseKey: "BHT-2026-CLIENT-B",
        state: { repairs: [repairB], licenseKey: "BHT-2026-CLIENT-B" },
        stateSizeBytes: 1,
        updatedAt: "2026-07-11T12:00:00.000Z",
      },
      { force: true },
    );

    expect(useBeharStore.getState().licenseKey).toBe("BHT-2026-CLIENT-B");
    expect(useBeharStore.getState().cloudSync?.workshopId).toBe("10000000-0000-4000-8000-000000000002");
    expect(useBeharStore.getState().repairs.map((repair) => repair.id)).toEqual(["repair-client-b"]);
    expect(useBeharStore.getState().repairs.some((repair) => repair.id === repairAId)).toBe(false);
  });
});
