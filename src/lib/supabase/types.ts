export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      workshops: {
        Row: {
          id: string;
          name: string;
          commercial_name: string | null;
          brand: string | null;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          siret: string | null;
          siren: string | null;
          vat_regime: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      clients: { Row: { id: string; workshop_id: string; full_name: string; phone: string | null; email: string | null; address: string | null; created_at: string; updated_at: string } };
      repairs: {
        Row: {
          id: string;
          workshop_id: string;
          client_id: string | null;
          repair_number: string;
          device_brand: string | null;
          device_model: string | null;
          device_type: string | null;
          imei: string | null;
          serial_number: string | null;
          issue_description: string;
          intervention_label: string | null;
          customer_price: number | null;
          status: "received" | "diagnosis" | "waiting" | "quote_sent" | "quote_accepted" | "repair" | "final_test" | "ready" | "delivered" | "cancelled" | "irreparable" | "sav";
          public_token: string;
          public_url: string;
          public_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      repair_events: { Row: { id: string; workshop_id: string; repair_id: string; event_type: string; title: string; description: string | null; visibility: "internal" | "client" | "system"; created_by: string | null; created_at: string } };
      repair_messages: { Row: { id: string; workshop_id: string; repair_id: string; author_type: "staff" | "client" | "system"; author_name: string; visibility: "internal" | "client"; body: string; read_by_client: boolean; read_by_staff: boolean; created_at: string } };
      quotes: { Row: { id: string; workshop_id: string; client_id: string | null; repair_id: string | null; quote_number: string; status: string; total_ht: number | null; total_ttc: number | null; public_token: string; public_url: string; public_active: boolean; accepted_at: string | null; refused_at: string | null; created_at: string; updated_at: string } };
      invoices: { Row: { id: string; workshop_id: string; client_id: string | null; repair_id: string | null; quote_id: string | null; invoice_number: string; status: string; total_ht: number | null; total_ttc: number | null; public_token: string; public_url: string; public_active: boolean; created_at: string; updated_at: string } };
      payments: { Row: { id: string; workshop_id: string; client_id: string | null; repair_id: string | null; invoice_id: string | null; payment_number: string; amount: number; method: string; status: string; paid_at: string | null; public_token: string; public_url: string; public_active: boolean; created_at: string; updated_at: string } };
      sales: { Row: { id: string; workshop_id: string; client_id: string | null; sale_number: string; total_ttc: number; payment_status: string; public_token: string; public_url: string; public_active: boolean; created_at: string; updated_at: string } };
      documents: { Row: { id: string; workshop_id: string; client_id: string | null; repair_id: string | null; quote_id: string | null; invoice_id: string | null; payment_id: string | null; sale_id: string | null; document_type: string; document_number: string | null; title: string; public_visible: boolean; public_token: string | null; public_url: string | null; file_url: string | null; status: string; created_at: string; updated_at: string } };
      stock_items: { Row: { id: string; workshop_id: string; sku: string | null; name: string; category: string | null; item_type: "part" | "accessory" | "product"; repair_enabled: boolean; counter_sale_enabled: boolean; active: boolean; purchase_price: number | null; sale_price: number | null; quantity: number; threshold: number | null; supplier: string | null; created_at: string; updated_at: string } };
      app_settings: { Row: { id: string; workshop_id: string; settings: Json; created_at: string; updated_at: string } };
    };
  };
};
