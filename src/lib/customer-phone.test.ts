import { describe, expect, it } from "vitest";

import { isValidCustomerPhone, normalizeCustomerPhone } from "@/lib/customer-phone";

describe("customer phone normalization", () => {
  it("normalise un mobile suisse local", () => {
    expect(normalizeCustomerPhone("079 123 45 67", "CH")).toBe("+41791234567");
    expect(isValidCustomerPhone("079 123 45 67", "CH")).toBe(true);
  });

  it("normalise un mobile français local", () => {
    expect(normalizeCustomerPhone("06 12 34 56 78", "FR")).toBe("+33612345678");
    expect(isValidCustomerPhone("06 12 34 56 78", "FR")).toBe(true);
  });

  it("conserve un numéro international", () => {
    expect(normalizeCustomerPhone("+41 (79) 123-45-67", "CH")).toBe("+41791234567");
  });

  it("refuse les numéros incomplets", () => {
    expect(isValidCustomerPhone("079 12", "CH")).toBe(false);
    expect(normalizeCustomerPhone("", "CH")).toBe("");
  });
});
