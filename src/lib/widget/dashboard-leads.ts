export type WidgetLeadStatus =
  | "new"
  | "to_contact"
  | "contacted"
  | "in_progress"
  | "waiting_customer"
  | "converted_appointment"
  | "converted_quote"
  | "converted_repair"
  | "closed"
  | "spam";

export type DashboardWidgetLead = {
  id: string;
  shop_id: string;
  widget_id: string;
  customer_id: string | null;
  appointment_id: string | null;
  quote_id: string | null;
  repair_case_id: string | null;
  lead_type: "callback" | "quote" | "price_request" | "request" | "appointment";
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_normalized: string | null;
  email: string | null;
  email_normalized: string | null;
  device_category: string;
  brand: string | null;
  model: string;
  issue: string;
  issue_description: string | null;
  service_label: string | null;
  quality_label: string | null;
  displayed_price: number | null;
  displayed_price_snapshot: Record<string, unknown> | null;
  displayed_stock: string | null;
  displayed_stock_snapshot: Record<string, unknown> | null;
  displayed_duration_minutes: number | null;
  displayed_warranty: string | null;
  comment: string | null;
  photos: string[];
  contact_preference: string | null;
  requested_callback_at: string | null;
  source_url: string | null;
  status: WidgetLeadStatus;
  assigned_to: string | null;
  conversion_reference: string | null;
  submission_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  closed_at: string | null;
  spam_at: string | null;
};

export type WidgetLeadHistory = {
  id: string;
  lead_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_id: string | null;
  actor_name: string;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WidgetLeadAssignee = { id: string; name: string; role: string; is_active: boolean };

export type WidgetLeadDashboardData = {
  leads: DashboardWidgetLead[];
  history: WidgetLeadHistory[];
  assignees: WidgetLeadAssignee[];
  notifications: Array<{ id: string; lead_id: string; title: string; message: string; created_at: string }>;
};

export const LEAD_STATUS_LABELS: Record<WidgetLeadStatus, string> = {
  new: "Nouvelle",
  to_contact: "À contacter",
  contacted: "Contactée",
  in_progress: "En cours",
  waiting_customer: "Attente client",
  converted_appointment: "Rendez-vous créé",
  converted_quote: "Devis créé",
  converted_repair: "Dossier créé",
  closed: "Clôturée",
  spam: "Indésirable",
};

export const LEAD_TYPE_LABELS: Record<DashboardWidgetLead["lead_type"], string> = {
  callback: "Rappel",
  quote: "Devis",
  price_request: "Demande de prix",
  request: "Demande",
  appointment: "Rendez-vous",
};

export const REQUIRED_LEAD_ACTIONS = [
  "call",
  "sms",
  "email",
  "quote",
  "appointment",
  "repair",
  "close",
  "spam",
] as const;

export type RequiredLeadAction = (typeof REQUIRED_LEAD_ACTIONS)[number];

export function leadCustomerName(lead: DashboardWidgetLead) {
  return `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Client widget";
}

export function leadDeviceLabel(lead: DashboardWidgetLead) {
  return [lead.brand, lead.model].filter(Boolean).join(" ").trim() || lead.model;
}

export function leadPhoneHref(lead: Pick<DashboardWidgetLead, "phone_normalized" | "phone">) {
  const phone = lead.phone_normalized || lead.phone || "";
  return phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : "";
}

export function leadEmailHref(lead: Pick<DashboardWidgetLead, "email" | "model" | "issue">) {
  if (!lead.email) return "";
  const subject = encodeURIComponent(`Votre demande ${lead.model}`);
  const body = encodeURIComponent(`Bonjour, nous revenons vers vous concernant votre demande : ${lead.issue}.`);
  return `mailto:${lead.email}?subject=${subject}&body=${body}`;
}

export function defaultLeadSms(lead: Pick<DashboardWidgetLead, "model" | "issue">, workshopName: string) {
  return `Bonjour, ${workshopName} revient vers vous concernant votre ${lead.model} (${lead.issue}).`;
}

export async function widgetLeadDashboardRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/behar/widget-leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Action impossible.");
  return payload;
}
