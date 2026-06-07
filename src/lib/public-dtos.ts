export type PublicWorkshopDto = {
  name: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
};

export type PublicRepairDto = {
  workshop: PublicWorkshopDto;
  repair: {
    number: string;
    status: string;
    statusLabel: string;
    deviceBrand?: string;
    deviceModel?: string;
    deviceType?: string;
    issueDescription?: string;
    createdAt: string;
    updatedAt: string;
  };
  client: { displayName: string };
  timeline: Array<{ title: string; description?: string; date: string; visibility: "client" }>;
  documents: Array<{ type: string; title: string; number?: string; status: string; url?: string }>;
  messages: Array<{
    authorType: "staff" | "client" | "system";
    authorName: string;
    body: string;
    createdAt: string;
  }>;
  quoteLinks: Array<{ number: string; status: string; totalTtc: number; url: string }>;
  invoiceLinks: Array<{ number: string; status: string; totalTtc: number; url: string }>;
  receiptLinks: Array<{ number: string; status: string; amount: number; url: string }>;
};

export type PublicCommercialDocumentDto = {
  kind: "quote" | "invoice" | "receipt" | "sale";
  workshop: PublicWorkshopDto;
  client: { displayName: string };
  document: {
    number: string;
    status: string;
    totalTtc: number;
    createdAt: string;
    publicUrl?: string;
  };
  lines: Array<{ label: string; quantity: number; unitPriceTtc: number; totalTtc: number }>;
  relatedRepair?: { number: string; url?: string };
  documents: Array<{ type: string; title: string; status: string; url?: string }>;
};

export type PublicPrintableDocumentDto = {
  documentType: "repair_intake" | "quote" | "invoice" | "payment_receipt" | "sale_receipt";
  workshop: PublicWorkshopDto;
  client: { displayName: string; phone?: string; email?: string; address?: string };
  document: {
    title: string;
    number?: string;
    status: string;
    createdAt: string;
    publicUrl?: string;
  };
  repair?: {
    number: string;
    status: string;
    statusLabel: string;
    deviceBrand?: string;
    deviceModel?: string;
    deviceType?: string;
    imei?: string;
    issueDescription?: string;
    interventionLabel?: string;
    customerPrice?: number;
    publicUrl?: string;
    createdAt?: string;
  };
  lines: Array<{ label: string; quantity: number; unitPriceTtc: number; totalTtc: number }>;
  totalTtc: number;
};
