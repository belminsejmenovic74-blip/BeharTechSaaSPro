import type { Customer } from "@/lib/behar-store";

/** Libellé affiché : jamais « Anonyme » — client passage / comptoir. */
export function displayCustomerName(customer: Pick<Customer, "name" | "type"> | undefined | null): string {
  const n = customer?.name?.trim();
  if (!n || n === "Anonyme") return "Client comptoir";
  return n;
}

export function isCounterCustomer(customer: Pick<Customer, "name" | "type"> | undefined | null): boolean {
  if (!customer) return true;
  if (customer.type === "counter") return true;
  const n = customer.name?.trim();
  return !n || n === "Anonyme" || n === "Client comptoir";
}
