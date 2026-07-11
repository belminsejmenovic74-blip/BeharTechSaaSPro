"use client";

import { useEffect } from "react";

import { useBeharStore } from "@/lib/behar-store";
import { mapRemoteWidgetAppointment, type RemoteWidgetAppointment } from "@/lib/widget/appointment-sync";
import { widgetLeadDashboardRequest } from "@/lib/widget/dashboard-leads";

function normalizedContact(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9+@.]/g, "");
}

/**
 * Importe les rendez-vous du widget dans le snapshot métier (comptoir + atelier).
 * L'identifiant Supabase est conservé : un polling concurrent ou rejoué reste
 * idempotent. Le rendez-vous arrive « à confirmer » et aucune réparation n'est
 * créée avant l'arrivée du client. Toutes les données consultées (prix, stock,
 * qualité, photos…) sont reprises telles quelles.
 */
export function WidgetAppointmentsProvider() {
  useEffect(() => {
    let disposed = false;
    const poll = async () => {
      const initial = useBeharStore.getState();
      const workshopId = initial.cloudSync?.workshopId;
      const licenseKey = initial.licenseKey;
      if (!(workshopId && licenseKey)) return;
      try {
        const result = await widgetLeadDashboardRequest<{ appointments: RemoteWidgetAppointment[] }>({
          operation: "appointments",
          workshopId,
          licenseKey,
        });
        if (disposed || result.appointments.length === 0) return;
        const imported: string[] = [];
        for (const remote of result.appointments) {
          const state = useBeharStore.getState();
          const phone = normalizedContact(remote.client_phone);
          const email = normalizedContact(remote.client_email);
          let customer = state.customers.find(
            (entry) =>
              (phone && normalizedContact(entry.phone) === phone) ||
              (email && normalizedContact(entry.email) === email),
          );
          if (!customer) {
            const customerId = state.addCustomer({
              name: remote.client_name || "Client widget",
              phone: remote.client_phone || "",
              email: remote.client_email || "",
              source: "Site internet",
            });
            customer = useBeharStore.getState().customers.find((entry) => entry.id === customerId);
          }
          if (!customer) continue;
          state.importExternalAppointment(
            mapRemoteWidgetAppointment(remote, {
              id: customer.id,
              shopId: customer.shopId,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
            }),
          );
          imported.push(remote.id);
        }
        if (imported.length) {
          await widgetLeadDashboardRequest({
            operation: "mark_appointments_imported",
            workshopId,
            licenseKey,
            appointmentIds: imported,
          });
        }
      } catch {
        // Relève best-effort : les lignes restent non importées et seront reprises.
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 10_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
