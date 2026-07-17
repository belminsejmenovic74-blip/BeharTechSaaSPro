import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/app-session", () => ({ getCurrentAppSession: vi.fn(async () => null) }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/verify-license", () => ({ isLicenseActive: vi.fn() }));

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";
import { isLicenseActive } from "@/lib/server/verify-license";

const workshopId = "10000000-0000-4000-8000-000000000001";

function adminWithBinding(boundWorkshopId: string | null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({
    data: boundWorkshopId ? { workshop_id: boundWorkshopId } : null,
    error: null,
  }));
  return { from: vi.fn(() => chain) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isLicenseActive).mockResolvedValue(true);
});

describe("dashboard widget leads — workshop licence binding", () => {
  it("authorizes the workshop bound to the active license", async () => {
    const admin = adminWithBinding(workshopId);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    const result = await authorizeWorkshopLicense(workshopId, "BHT-VALID-LICENSE");
    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) expect(result.workshopId).toBe(workshopId);
  });

  it("rejects a license bound to another tenant", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(adminWithBinding("10000000-0000-4000-8000-000000000099") as never);
    const result = await authorizeWorkshopLicense(workshopId, "BHT-OTHER-TENANT");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("rejects an inactive license before reading lead data", async () => {
    const admin = adminWithBinding(workshopId);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(isLicenseActive).mockResolvedValue(false);
    const result = await authorizeWorkshopLicense(workshopId, "BHT-INACTIVE");
    expect((result as Response).status).toBe(401);
    expect(admin.from).not.toHaveBeenCalled();
  });
});
