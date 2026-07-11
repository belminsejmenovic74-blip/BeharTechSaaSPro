import { expect, test } from "@playwright/test";

import { openPoste } from "./helpers/behar-actions";

const WORKSHOP_ID = "10000000-0000-4000-8000-000000000001";
const LEAD_ID = "20000000-0000-4000-8000-000000000001";

test("Demandes du site — les huit actions obligatoires sont cliquables", async ({ browser }) => {
  const { context, page } = await openPoste(browser, { name: "WIDGET-LEADS" });
  const activities: string[] = [];
  const statuses: string[] = [];

  await page.route("**/api/behar/widget-leads", async (route) => {
    const body = route.request().postDataJSON() as { operation?: string; action?: string; status?: string };
    if (body.operation === "list") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          leads: [
            {
              id: LEAD_ID,
              shop_id: "30000000-0000-4000-8000-000000000001",
              widget_id: "40000000-0000-4000-8000-000000000001",
              customer_id: null,
              appointment_id: null,
              quote_id: null,
              repair_case_id: null,
              lead_type: "quote",
              first_name: "Sarah",
              last_name: "Martin",
              phone: "06 12 34 56 78",
              phone_normalized: "+33612345678",
              email: "sarah@example.com",
              email_normalized: "sarah@example.com",
              device_category: "Smartphone",
              brand: "Apple",
              model: "iPhone 13",
              issue: "Écran cassé",
              issue_description: "Écran noir après une chute",
              service_label: "Remplacement écran",
              quality_label: "OLED",
              displayed_price: 129,
              displayed_price_snapshot: { amount: 129, type: "exact", currency: "EUR" },
              displayed_stock: "Disponible",
              displayed_stock_snapshot: { mode: "simple", status: "available" },
              displayed_duration_minutes: 45,
              displayed_warranty: "12 mois",
              comment: "Disponible après 17 h",
              photos: [],
              contact_preference: "sms",
              requested_callback_at: null,
              source_url: "https://atelier.example/widget",
              status: "new",
              assigned_to: null,
              conversion_reference: null,
              submission_payload: {},
              created_at: "2026-07-11T08:00:00.000Z",
              updated_at: "2026-07-11T08:00:00.000Z",
              last_activity_at: "2026-07-11T08:00:00.000Z",
              closed_at: null,
              spam_at: null,
            },
          ],
          history: [],
          assignees: [{ id: "50000000-0000-4000-8000-000000000001", name: "QA Admin", role: "admin", is_active: true }],
          notifications: [],
        }),
      });
      return;
    }
    if (body.operation === "activity" && body.action) activities.push(body.action);
    if (body.operation === "update" && body.status) statuses.push(body.status);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/send-sms", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true }) }),
  );

  await page.evaluate(
    ({ workshopId }) => {
      const key = "behar-tech-local-demo-v3";
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{"state":{},"version":1}');
      parsed.state.cloudSync = { ...(parsed.state.cloudSync || {}), workshopId };
      window.localStorage.setItem(key, JSON.stringify(parsed));
    },
    { workshopId: WORKSHOP_ID },
  );
  await page.goto("/dashboard/demandes-site", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Demandes du site" })).toBeVisible();
  await expect(page.getByText("Sarah Martin").first()).toBeVisible();

  const call = page.locator('[data-lead-action="call"]');
  await call.evaluate((element) =>
    element.addEventListener("click", (event) => event.preventDefault(), { once: true }),
  );
  await call.click();
  await expect.poll(() => activities.includes("called")).toBe(true);

  await page.locator('[data-lead-action="sms"]').click();
  await expect.poll(() => activities.includes("sms_sent")).toBe(true);

  await page.locator('[data-lead-action="email"]').click();
  await expect.poll(() => activities.includes("email_opened")).toBe(true);

  await page.locator('[data-lead-action="appointment"]').click();
  await page.getByRole("button", { name: "Créer le rendez-vous" }).click();
  await expect.poll(() => activities.includes("appointment_proposed")).toBe(true);

  await page.locator('[data-lead-action="close"]').click();
  await expect.poll(() => statuses.includes("closed")).toBe(true);
  await page.locator('[data-lead-action="spam"]').click();
  await expect.poll(() => statuses.includes("spam")).toBe(true);

  await page.locator('[data-lead-action="quote"]').click();
  await expect.poll(() => activities.includes("quote_created")).toBe(true);
  await expect(page).toHaveURL(/\/dashboard\/devis/);

  await page.goto("/dashboard/demandes-site", { waitUntil: "domcontentloaded" });
  await page.locator('[data-lead-action="repair"]').click();
  await expect.poll(() => activities.includes("repair_created")).toBe(true);
  await expect(page).toHaveURL(/\/dashboard\/reparations/);

  await context.close();
});
