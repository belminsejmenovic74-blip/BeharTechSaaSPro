export type PublicWorkshopDto = {
  name: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country: "FR" | "CH" | "autre";
  currency: "EUR" | "CHF";
  locale: "fr-FR" | "fr-CH";
  canton?: string;
  businessId?: string;
  vatNumber?: string;
  vatApplicable?: boolean;
  vatMention?: string;
};

export type PublicRepairDto = {
  workshop: PublicWorkshopDto;
  repair: {
    number: string;
    status: string;
    statusLabel: string;
    readyLabel?: string;
    paymentStatus?: string;
    hasPaidPayment?: boolean;
    finalTestStatus?: string;
    deviceBrand?: string;
    deviceModel?: string;
    deviceType?: string;
    issueDescription?: string;
    createdAt: string;
    updatedAt: string;
  };
  client: { displayName: string };
  timeline: Array<{ title: string; description?: string; date: string; visibility: "client" }>;
  documents: Array<{
    type: string;
    title: string;
    number?: string;
    status: string;
    previewUrl?: string;
    downloadUrl?: string;
  }>;
  messages: Array<{
    authorType: "staff" | "client" | "system";
    authorName: string;
    body: string;
    createdAt: string;
  }>;
  quoteLinks: Array<{ number: string; status: string; totalTtc?: number; previewUrl: string; downloadUrl?: string }>;
  invoiceLinks: Array<{ number: string; status: string; totalTtc?: number; previewUrl: string; downloadUrl?: string }>;
  receiptLinks: Array<{ number: string; status: string; amount?: number; previewUrl: string; downloadUrl?: string }>;
};

export type PublicCommercialDocumentDto = {
  kind: "quote" | "invoice" | "receipt" | "sale" | "intake";
  workshop: PublicWorkshopDto;
  client: { displayName: string };
  document: {
    number: string;
    status: string;
    totalTtc?: number;
    createdAt: string;
    publicUrl?: string;
  };
  lines: Array<{ label: string; quantity: number; unitPriceTtc?: number; totalTtc?: number }>;
  relatedRepair?: { number: string; url?: string };
  documents: Array<{ type: string; title: string; status: string; previewUrl?: string; downloadUrl?: string }>;
};

export type PublicPrintableDocumentDto = {
  documentType: "repair_intake" | "quote" | "invoice" | "payment_confirmation" | "payment_receipt" | "sale_receipt";
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
  lines: Array<{ label: string; quantity: number; unitPriceTtc?: number; totalTtc?: number }>;
  totalTtc?: number;
};
