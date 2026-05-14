"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  createPriceBookItem,
  normalizePriceBookItem,
  type PriceBookInput,
  type PriceBookItem,
  seedPriceBookExamples,
  updatePriceBookItem,
} from "@/lib/price-book";
import { appointments as appointmentMocks } from "@/mock/appointments";
import { customers as customerMocks } from "@/mock/customers";
import { invoices as invoiceMocks } from "@/mock/invoices";
import { transactions as paymentMocks } from "@/mock/payments";
import { quote as quoteMock } from "@/mock/quotes";
import { repairKanbanColumns } from "@/mock/repairs";
import { stockItems as stockMocks } from "@/mock/stock";
import { deviceCatalog, type DeviceCategory } from "@/data/deviceCatalog";

export type RepairStatus =
  | "Reçu"
  | "Diagnostic"
  | "Préparation / Réparation"
  | "Test final"
  | "Prêt"
  | "Restitué"
  | "Annulé";
export type InvoiceStatus = "Brouillon" | "Envoyée" | "Payée" | "Annulée";
export type QuoteStatus = "Brouillon" | "Envoyé" | "Accepté" | "Refusé" | "Facturé";
export type PaymentStatus = "Payé" | "Annulé" | "Remboursé";
export type PaymentMethod = "Espèces" | "Carte" | "Virement" | "Paiement en ligne simulé";
export type DocumentType = "intake" | "quote" | "invoice" | "payment" | "internal" | "summary" | "sale-receipt" | "sale-invoice";
export type DeviceType = "Smartphone" | "Tablette" | "Ordinateur" | "Console" | "Autre";
export type UserRole = "admin" | "technician" | "frontdesk";
export type PermissionKey =
  | "canViewDashboard"
  | "canViewFullDashboard"
  | "canViewSettings"
  | "canEditSettings"
  | "canManageUsers"
  | "canManageRoles"
  | "canViewAuditLog"
  | "canViewNotifications"
  | "canViewClients"
  | "canCreateClient"
  | "canEditClient"
  | "canDeleteClient"
  | "canViewRepairs"
  | "canCreateRepair"
  | "canEditRepair"
  | "canDeleteRepair"
  | "canChangeRepairStatus"
  | "canAddDiagnosis"
  | "canAddTechnicalNotes"
  | "canViewTechnicalNotes"
  | "canViewStock"
  | "canManageStock"
  | "canUseStockItem"
  | "canViewPurchasePrice"
  | "canViewMargin"
  | "canViewSupplier"
  | "canViewQuotes"
  | "canCreateQuote"
  | "canEditQuote"
  | "canAcceptQuote"
  | "canViewInvoices"
  | "canCreateInvoice"
  | "canEditInvoice"
  | "canMarkPaymentPaid"
  | "canViewPayments"
  | "canCancelPayment"
  | "canViewDocuments"
  | "canDownloadDocuments"
  | "canViewInternalDocuments"
  | "canExportData"
  | "canImportData"
  | "canBackupData"
  | "canViewSales"
  | "canCreateSale"
  | "canEditSale"
  | "canCancelSale"
  | "canRefundSale"
  | "canTakePayment"
  | "canApplyDiscount"
  | "canChangeSalePrice"
  | "canViewSalesStats"
  | "canExportSales";

export type CurrentUser = {
  id: string;
  name: string;
  role: UserRole;
  pin?: string;
  permissions: Record<PermissionKey, boolean>;
  permissionOverrides?: Partial<Record<PermissionKey, boolean>>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogEntry = {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  type: "info" | "success" | "warning" | "danger";
  title: string;
  message: string;
  targetType: string;
  targetId: string;
  actorId: string;
  actorName: string;
  read: boolean;
  createdAt: string;
};

export type DeviceBrand = {
  id: string;
  name: string;
  deviceTypes: DeviceType[];
};

export type DeviceModel = {
  id: string;
  brandId: string;
  name: string;
  deviceType: DeviceType;
  aliases?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PartCategory = {
  id: string;
  name: string;
  deviceTypes: DeviceType[];
};

export type Customer = {
  id: string;
  shopId: string;
  name: string;
  type?: "named" | "counter";
  initials: string;
  phone: string;
  email: string;
  address?: string;
  device: string;
  lastVisit: string;
  totalSpent: number;
  status: string;
  lastRepair: string;
  interventions: number;
  source: string;
  notes?: string;
  tags?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PriceSnapshot = {
  source: "catalogue" | "manual";
  priceBookItemId?: string;
  /** Libellé type appareil (ex. Smartphone, Console) */
  typeAppareil?: string;
  marque?: string;
  modele?: string;
  piece: string;
  reparation: string;
  qualite: string;
  sku?: string;
  fournisseur?: string;
  prixAchat?: number;
  prixVentePiece: number;
  mainOeuvre: number;
  prixClientTotal: number;
  marge?: number;
  garantie?: string;
  notes?: string;
  stockDisponible?: number;
  selectedAt: string;
};

export type RepairPart = {
  stockItemId: string;
  name: string;
  reference: string;
  sku?: string;
  categoryName?: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  confirmed?: boolean;
};

export type RepairSaleLineStatus = "draft" | "confirmed" | "invoiced" | "paid";

export type RepairSaleLine = {
  id: string;
  stockItemId: string;
  saleId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  purchasePriceInternal?: number;
  supplierInternal?: string;
  status: RepairSaleLineStatus;
  stockDecremented?: boolean;
  addedAt: string;
};

export type RepairIntakeCondition = {
  generalCondition?: "Excellent" | "Bon" | "Usé" | "Abîmé" | "Très abîmé" | "Non renseigné";
  powerState?: "Allumé" | "Éteint" | "Non testable" | "Non renseigné";
  chargingState?: "Charge OK" | "Ne charge pas" | "Batterie vide" | "Non testable" | "Non renseigné";
  screenState?: "Intact" | "Rayé" | "Fissuré" | "Cassé" | "Tactile non testable" | "Non renseigné";
  frameState?: "Bon état" | "Rayures" | "Chocs" | "Tordu" | "Dos cassé" | "Non renseigné";
  camerasState?: "OK" | "Défaut visible" | "Non testable" | "Non renseigné";
  audioState?: "OK" | "Défaut signalé" | "Non testable" | "Non renseigné";
  buttonsState?: "OK" | "Défaut bouton" | "Non testable" | "Non renseigné";
  chargingPortState?: "OK" | "Défaut signalé" | "Non testable" | "Non renseigné";
  biometricState?: "OK" | "Ne fonctionne pas" | "Non testable" | "Non concerné" | "Non renseigné";
  networkState?: "OK" | "Non testé" | "SIM absente" | "Défaut signalé" | "Non renseigné";
  passcodeState?: "Code fourni" | "Code non fourni" | "Sans code" | "Déverrouillage impossible" | "Non renseigné";
  accessories?: string[];
  accessoriesOther?: string;
  visibleDefects?: string;
  customerStatement?: string;
  internalIntakeNotes?: string;
  photos?: Array<{
    id: string;
    name: string;
    dataUrl?: string;
    createdAt: string;
  }>;
  customerConfirmed?: boolean;
  diagnosticAuthorized?: boolean;
  nonTestableAccepted?: boolean;
  signerName?: string;
  signedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Repair = {
  id: string;
  shopId: string;
  number: string;
  customerId: string;
  appointmentId?: string;
  quoteId?: string;
  quoteIds?: string[];
  invoiceId?: string;
  invoiceIds?: string[];
  paymentId?: string;
  paymentIds?: string[];
  deviceType?: DeviceType;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  deviceModel?: string;
  issueType?: string;
  device: string;
  model: string;
  issue: string;
  status: RepairStatus;
  amount: number;
  laborPrice?: number;
  total?: number;
  notes: string;
  droppedAt: string;
  estimatedDoneAt: string;
  technician: string;
  imei: string;
  parts: RepairPart[];
  repairSaleLines?: RepairSaleLine[];
  intakeCondition?: RepairIntakeCondition;
  history: string[];
  selectedPriceSnapshot?: PriceSnapshot;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type VatSummary = {
  ht: number;
  tva: number;
  ttc: number;
  rate: number;
};

export type QuoteLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Quote = {
  id: string;
  shopId: string;
  number: string;
  customerId: string;
  repairId?: string;
  invoiceId?: string;
  status: QuoteStatus;
  date: string;
  expiryDate: string;
  lines: QuoteLine[];
  notes?: string;
  totalAmount: number;
  sourceType?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Invoice = {
  id: string;
  shopId: string;
  number: string;
  customerId: string;
  repairId?: string;
  quoteId?: string;
  status: InvoiceStatus;
  date: string;
  lines: QuoteLine[];
  sourceType: "quote" | "repair" | "client" | "manual";
  sourceNumber?: string;
  paymentMethod: string;
  paymentIds?: string[];
  paidAmount?: number;
  paidAt?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Payment = {
  id: string;
  shopId: string;
  invoiceId?: string;
  saleId?: string;
  customerId: string;
  repairId?: string;
  quoteId?: string;
  paymentNumber: string;
  reference: string;
  method: PaymentMethod;
  mode: string;
  status: PaymentStatus;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
};

export type Appointment = {
  id: string;
  shopId: string;
  customerId: string;
  repairId?: string;
  device: string;
  issue: string;
  date: string;
  time: string;
  duration: string;
  channel: string;
  source: string;
  technician: string;
  notes: string;
  status: string;
  confirmed: boolean;
  dayIndex: number;
  row: number;
  color: string;
  type?: "repair_pickup" | "standard";
};

export type StockItem = {
  id: string;
  shopId: string;
  sku: string;
  name: string;
  deviceType: DeviceType;
  brandId?: string;
  brandName?: string;
  modelIds: string[];
  compatibleModels: string[];
  categoryId: string;
  categoryName: string;
  part: string;
  reference: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  stock: number;
  threshold: number;
  supplier: string;
  leadTime: string;
  createdAt: string;
  updatedAt: string;
  priceBookItemId?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
};

export type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: "Gérant" | "Technicien" | "Comptoir" | "Vente" | "Administratif" | "Autre";
  email?: string;
  phone?: string;
};

export type WorkshopInfo = {
  brand: string;
  name: string;
  address: string;
  postalCode?: string;
  city?: string;
  postalCity: string;
  country: string;
  siret: string;
  email: string;
  phone: string;
  website?: string;
  tvaNumber?: string;
  vatApplicable?: boolean;
  isMicroEnterprise?: boolean;
  tvaMention?: string;
  quoteTerms?: string;
  invoiceTerms?: string;
  documentFooter?: string;
  acceptedPaymentMethods?: string[];
  businessHours?: string;
  allowCounterClient?: boolean;
  repairPrefix?: string;
  quotePrefix?: string;
  invoicePrefix?: string;
  receiptPrefix?: string;
  nextRepairNumber?: number;
  nextQuoteNumber?: number;
  nextInvoiceNumber?: number;
  nextReceiptNumber?: number;
  nextSaleNumber?: number;
  salePrefix?: string;
  defaultWarranty?: string;
  managerSignature?: string;
  logoUrl?: string;
  showLogo?: boolean;
  commercialName?: string;
};

export type WorkshopSettings = WorkshopInfo & {
  configuredAt?: string;
  updatedAt?: string;
};

export type SaleStatus = "Brouillon" | "Payée" | "Rattachée" | "Annulée";

export type SaleLine = {
  id: string;
  stockItemId: string;
  name: string;
  sku?: string;
  itemKind?: "accessory" | "refurbished-phone";
  warrantyMonths?: number;
  serialNumber?: string;
  conditionLabel?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  purchasePriceInternal?: number;
  supplierInternal?: string;
};

export type Sale = {
  id: string;
  shopId: string;
  number: string;
  customerId: string;
  customerName: string;
  repairId?: string;
  status: SaleStatus;
  lines: SaleLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  documentId?: string;
  paidAt?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
};

export type BeharDocument = {
  id: string;
  shopId: string;
  type: DocumentType;
  title: string;
  customerId: string;
  repairId?: string;
  quoteId?: string;
  invoiceId?: string;
  paymentId?: string;
  saleId?: string;
  createdAt: string;
};

export type MessageLog = {
  id: string;
  shopId: string;
  customerId: string;
  repairId?: string;
  channel: "SMS" | "Email";
  subject: string;
  body: string;
  createdAt: string;
};

export type LicenseInfo = {
  licenseActivated: boolean;
  licenseKey?: string;
  licensePlan?: string;
  licenseActivatedAt?: string;
};

export type StoreState = {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  workshopInfo: WorkshopInfo;
  workshopSettings: WorkshopSettings;
  onboardingCompleted: boolean;
  configuredAt?: string;
  updatedAt?: string;
  selectedCustomerId: string;
  selectedRepairId: string;
  selectedQuoteId: string;
  selectedInvoiceId: string;
  selectedPaymentId: string;
  selectedAppointmentId: string;
  selectedStockItemId: string;
  selectedDocumentId: string;
  selectedSaleId: string;
  sales: Sale[];
  deviceBrands: DeviceBrand[];
  deviceModels: DeviceModel[];
  partCategories: PartCategory[];
  customers: Customer[];
  repairs: Repair[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  appointments: Appointment[];
  stockItems: StockItem[];
  documents: BeharDocument[];
  messageLogs: MessageLog[];
  priceBookItems: PriceBookItem[];
  isCatalogPreloaded: boolean;
  teamMembers: TeamMember[];
  currentUser: CurrentUser;
  users: CurrentUser[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];

  // Local roles / audit
  sessionUserId?: string;
  setCurrentUser: (id: string) => void;
  loginWithPin: (pin: string) => { ok: boolean; reason?: "invalid" | "disabled"; user?: CurrentUser };
  logout: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
  requirePermission: (permission: PermissionKey, actionName?: string) => boolean;
  addUser: (input: { name: string; role: UserRole; pin: string; permissionOverrides?: Partial<Record<PermissionKey, boolean>> }) => string;
  updateUser: (id: string, patch: Partial<Omit<CurrentUser, "id" | "permissions">>) => void;
  deactivateUser: (id: string) => void;
  reactivateUser: (id: string) => void;
  deleteUser: (id: string) => void;
  resetUserPin: (id: string, newPin: string) => void;
  setUserPermission: (id: string, key: PermissionKey, value: boolean) => void;
  resetUserPermissions: (id: string) => void;
  addAuditLog: (input: {
    action: string;
    targetType: string;
    targetId: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) => string;
  addNotification: (input: {
    type?: AppNotification["type"];
    title: string;
    message: string;
    targetType: string;
    targetId: string;
  }) => string;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Licence
  licenseActivated: boolean;
  licenseKey?: string;
  licensePlan?: string;
  licenseActivatedAt?: string;
  activateLicense: (key: string) => boolean;
  deactivateLicense: () => void;

  // Team
  addTeamMember: (member: Omit<TeamMember, "id">) => void;
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  addDeviceBrand: (input: { name: string; deviceType: DeviceType }) => string;
  updateDeviceBrand: (id: string, patch: Partial<Pick<DeviceBrand, "name" | "deviceTypes">>) => void;
  addDeviceModel: (input: { brandId: string; name: string; deviceType: DeviceType; aliases?: string[] }) => string;
  updateDeviceModel: (id: string, patch: Partial<Pick<DeviceModel, "name" | "aliases" | "deviceType" | "brandId">>) => void;
  toggleDeviceModel: (id: string, isActive: boolean) => void;
  setSelected: (entity: SelectableEntity, id: string) => void;
  loadPreloadedCatalog: () => Promise<void>;
  addPriceBookItem: (input: PriceBookInput) => string;
  updatePriceBookItem: (id: string, patch: Partial<PriceBookItem>) => void;
  deletePriceBookItem: (id: string) => void;
  togglePriceBookItem: (id: string, isActive: boolean) => void;
  addCustomer: (input: Partial<Customer> & Pick<Customer, "name">) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addRepair: (input: RepairInput) => string;
  updateRepair: (id: string, patch: Partial<Repair>) => void;
  deleteRepair: (id: string) => void;
  changeRepairStatus: (id: string, status: RepairStatus) => void;
  addPartToRepair: (repairId: string, stockItemId: string, quantity?: number) => boolean;
  addSaleLinesToRepair: (repairId: string, lines: Omit<SaleLine, "id">[], saleId?: string) => boolean;
  markRepairSaleLineDelivered: (repairId: string, lineId: string) => boolean;
  removePartFromRepair: (repairId: string, stockItemId: string) => boolean;
  addQuote: (input: QuoteInput) => string;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  addQuoteLine: (quoteId: string) => void;
  updateQuoteLine: (quoteId: string, lineId: string, patch: Partial<QuoteLine>) => void;
  deleteQuoteLine: (quoteId: string, lineId: string) => void;
  convertQuoteToInvoice: (quoteId: string) => string;
  addInvoice: (input: InvoiceInput) => string;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markInvoicePaid: (invoiceId: string, method?: PaymentMethod, note?: string) => string;
  createInvoiceFromRepair: (repairId: string) => string;
  addPayment: (input: {
    invoiceId?: string;
    repairId?: string;
    customerId: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    date: string;
    reference: string;
    note?: string;
  }) => string;
  markRepairAsPaid: (repairId: string, method?: PaymentMethod, note?: string) => string;
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;
  addAppointment: (input: AppointmentInput) => string;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  deleteAppointment: (id: string, deleteLinkedRepair?: boolean) => void;
  createRepairFromAppointment: (appointmentId: string) => string;
  addStockItem: (input: StockInput) => string;
  updateStockItem: (id: string, patch: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;
  confirmPartUsage: (repairId: string, stockItemId: string) => boolean;
  restockItem: (id: string, quantity: number) => void;
  importStockItems: (items: StockInput[]) => void;
  sendMessage: (input: MessageInput) => void;
  updateWorkshopInfo: (patch: Partial<WorkshopInfo>) => void;
  saveWorkshopSettings: (settings: Partial<WorkshopSettings>) => void;
  setOnboardingCompleted: (done: boolean) => void;
  addDocument: (input: Omit<BeharDocument, "id" | "shopId" | "createdAt">) => string;
  deleteDocument: (id: string) => void;
  addSale: (input: { customerId: string; customerName: string; lines: Omit<SaleLine, "id">[]; repairId?: string; status?: SaleStatus }) => string;
  paySale: (saleId: string, method: PaymentMethod) => string;
  cancelSale: (saleId: string) => void;
  deleteSale: (saleId: string) => void;
  resetDemo: () => void;
};

type SelectableEntity =
  | "customer"
  | "repair"
  | "quote"
  | "invoice"
  | "payment"
  | "appointment"
  | "stockItem"
  | "document"
  | "sale";
type RepairInput = Pick<
  Repair,
  "customerId" | "device" | "issue" | "status" | "amount" | "notes" | "droppedAt" | "technician"
> &
  Partial<
    Pick<
      Repair,
      | "model"
      | "imei"
      | "estimatedDoneAt"
      | "appointmentId"
      | "deviceType"
      | "brandId"
      | "brandName"
      | "modelId"
      | "deviceModel"
      | "issueType"
      | "laborPrice"
      | "total"
      | "selectedPriceSnapshot"
      | "history"
      | "parts"
      | "intakeCondition"
    >
  >;
type QuoteInput = Pick<Quote, "customerId"> & Partial<Pick<Quote, "repairId" | "notes" | "status">> & { lines?: any[] };
type InvoiceInput = Pick<Invoice, "customerId"> &
  Partial<Pick<Invoice, "repairId" | "quoteId" | "status" | "sourceType" | "sourceNumber" | "paymentMethod">> & {
    lines?: any[];
  };
type AppointmentInput = Pick<Appointment, "customerId" | "device" | "issue" | "date" | "time"> &
  Partial<
    Pick<
      Appointment,
      | "repairId"
      | "duration"
      | "channel"
      | "source"
      | "technician"
      | "notes"
      | "status"
      | "confirmed"
      | "dayIndex"
      | "row"
      | "color"
    >
  >;
type StockInput = Pick<StockItem, "purchasePrice" | "salePrice" | "threshold" | "supplier"> &
  Partial<
    Pick<
      StockItem,
      | "part"
      | "reference"
      | "category"
      | "stock"
      | "sku"
      | "name"
      | "deviceType"
      | "brandId"
      | "brandName"
      | "modelIds"
      | "compatibleModels"
      | "categoryId"
      | "categoryName"
      | "quantity"
      | "leadTime"
    >
  > & {
    skipModelInference?: boolean;
  };
type MessageInput = Pick<MessageLog, "customerId" | "channel" | "subject" | "body"> &
  Partial<Pick<MessageLog, "repairId">>;

const shopId = "shop_atelier_belmin";

export const permissionKeys: PermissionKey[] = [
  "canViewDashboard",
  "canViewFullDashboard",
  "canViewSettings",
  "canEditSettings",
  "canManageUsers",
  "canManageRoles",
  "canViewAuditLog",
  "canViewNotifications",
  "canViewClients",
  "canCreateClient",
  "canEditClient",
  "canDeleteClient",
  "canViewRepairs",
  "canCreateRepair",
  "canEditRepair",
  "canDeleteRepair",
  "canChangeRepairStatus",
  "canAddDiagnosis",
  "canAddTechnicalNotes",
  "canViewTechnicalNotes",
  "canViewStock",
  "canManageStock",
  "canUseStockItem",
  "canViewPurchasePrice",
  "canViewMargin",
  "canViewSupplier",
  "canViewQuotes",
  "canCreateQuote",
  "canEditQuote",
  "canAcceptQuote",
  "canViewInvoices",
  "canCreateInvoice",
  "canEditInvoice",
  "canMarkPaymentPaid",
  "canViewPayments",
  "canCancelPayment",
  "canViewDocuments",
  "canDownloadDocuments",
  "canViewInternalDocuments",
  "canExportData",
  "canImportData",
  "canBackupData",
  "canViewSales",
  "canCreateSale",
  "canEditSale",
  "canCancelSale",
  "canRefundSale",
  "canTakePayment",
  "canApplyDiscount",
  "canChangeSalePrice",
  "canViewSalesStats",
  "canExportSales",
];

const allPermissions = (value: boolean): Record<PermissionKey, boolean> =>
  Object.fromEntries(permissionKeys.map((key) => [key, value])) as Record<PermissionKey, boolean>;

export const permissionsByRole: Record<UserRole, Record<PermissionKey, boolean>> = {
  admin: allPermissions(true),
  technician: {
    ...allPermissions(false),
    canViewDashboard: true,
    canViewClients: true,
    canViewRepairs: true,
    canCreateRepair: true,
    canEditRepair: true,
    canChangeRepairStatus: true,
    canAddDiagnosis: true,
    canAddTechnicalNotes: true,
    canViewTechnicalNotes: true,
    canViewStock: true,
    canUseStockItem: true,
    canViewQuotes: true,
    canCreateQuote: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
    canViewInternalDocuments: true,
    canViewNotifications: true,
  },
  frontdesk: {
    ...allPermissions(false),
    canViewDashboard: true,
    canViewClients: true,
    canCreateClient: true,
    canEditClient: true,
    canViewRepairs: true,
    canCreateRepair: true,
    canChangeRepairStatus: true,
    canViewQuotes: true,
    canCreateQuote: true,
    canViewInvoices: true,
    canMarkPaymentPaid: true,
    canViewPayments: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
    canViewNotifications: true,
    canViewSales: true,
    canCreateSale: true,
    canTakePayment: true,
    canViewStock: true,
  },
};

const userSeedDate = "2026-01-01T08:00:00.000Z";
const resolveUserPermissions = (user: Pick<CurrentUser, "role" | "permissionOverrides">) => ({
  ...permissionsByRole[user.role],
  ...(user.permissionOverrides ?? {}),
});

const withRolePermissions = (
  user: Omit<CurrentUser, "permissions"> & { permissions?: Partial<Record<PermissionKey, boolean>> },
): CurrentUser => {
  const permissionOverrides = user.permissionOverrides ?? user.permissions;
  return {
    ...user,
    permissionOverrides,
    permissions: resolveUserPermissions({ role: user.role, permissionOverrides }),
  };
};

const defaultUsers: CurrentUser[] = [
  withRolePermissions({
    id: "user_belmin_admin",
    name: "Gérant",
    role: "admin",
    pin: "0000",
    active: true,
    createdAt: userSeedDate,
    updatedAt: userSeedDate,
  }),
  withRolePermissions({
    id: "user_nadir_technician",
    name: "Technicien",
    role: "technician",
    pin: "1234",
    active: true,
    createdAt: userSeedDate,
    updatedAt: userSeedDate,
  }),
  withRolePermissions({
    id: "user_lina_frontdesk",
    name: "Accueil",
    role: "frontdesk",
    pin: "5678",
    active: true,
    createdAt: userSeedDate,
    updatedAt: userSeedDate,
  }),
  withRolePermissions({
    id: "user_intern_stagiaire",
    name: "Stagiaire",
    role: "technician",
    pin: "9999",
    active: true,
    createdAt: userSeedDate,
    updatedAt: userSeedDate,
    permissionOverrides: {
      canDeleteRepair: false,
      canDeleteClient: false,
      canDeleteQuote: false,
      canDeleteInvoice: false,
      canViewPurchasePrice: false,
      canViewMargin: false,
      canViewSupplier: false,
      canManageStock: false,
      canCancelPayment: false,
      canEditSettings: false,
      canViewSettings: false,
      canManageUsers: false,
      canManageRoles: false,
      canViewAuditLog: false,
      canExportData: false,
      canBackupData: false,
    } as Partial<Record<PermissionKey, boolean>>,
  }),
];

const defaultCurrentUser = defaultUsers[0];

const catalogTimestamp = "2026-04-29";

const categoryToType = (cat: DeviceCategory): DeviceType => {
  switch (cat) {
    case "smartphone": return "Smartphone";
    case "tablet": return "Tablette";
    case "computer": return "Ordinateur";
    case "console": return "Console";
    default: return "Autre";
  }
};

// On construit deviceBrands et deviceModels dynamiquement depuis deviceCatalog.ts (Source Propre)
const { generatedBrands, generatedModels } = (() => {
  const brandsMap = new Map<string, DeviceBrand>();
  const modelsList: DeviceModel[] = [];

  for (const entry of deviceCatalog) {
    const cleanBrandName = entry.brand.replace(/\s*\(.*\)/, "").trim();
    const brandId = `brand_${cleanBrandName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const deviceType = categoryToType(entry.category);

    if (!brandsMap.has(brandId)) {
      brandsMap.set(brandId, {
        id: brandId,
        name: cleanBrandName,
        deviceTypes: [],
      });
    }
    const brand = brandsMap.get(brandId)!;
    if (!brand.deviceTypes.includes(deviceType)) {
      brand.deviceTypes.push(deviceType);
    }

    for (const modelName of entry.models) {
      const modelId = `model_${modelName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      modelsList.push({
        id: modelId,
        brandId,
        name: modelName,
        deviceType,
        aliases: entry.aliases,
        isActive: true,
        createdAt: catalogTimestamp,
        updatedAt: catalogTimestamp,
      });
    }
  }

  // Ajout de la marque "Autre" par défaut
  if (!brandsMap.has("brand_other")) {
    brandsMap.set("brand_other", {
      id: "brand_other",
      name: "Autre",
      deviceTypes: ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"],
    });
  }

  return {
    generatedBrands: Array.from(brandsMap.values()),
    generatedModels: modelsList,
  };
})();

export const deviceBrands: DeviceBrand[] = generatedBrands;
export const deviceModels: DeviceModel[] = generatedModels;

export const partCategories: PartCategory[] = [
  { id: "cat_screen", name: "Écran", deviceTypes: ["Smartphone", "Tablette"] },
  { id: "cat_battery", name: "Batterie", deviceTypes: ["Smartphone", "Tablette", "Ordinateur", "Console"] },
  { id: "cat_charge_port", name: "Connecteur de charge", deviceTypes: ["Smartphone", "Tablette", "Console"] },
  { id: "cat_camera", name: "Caméra", deviceTypes: ["Smartphone", "Tablette"] },
  { id: "cat_back_glass", name: "Vitre arrière", deviceTypes: ["Smartphone"] },
  { id: "cat_speaker", name: "Haut-parleur", deviceTypes: ["Smartphone", "Tablette", "Ordinateur", "Console"] },
  { id: "cat_joystick", name: "Joystick", deviceTypes: ["Console"] },
  { id: "cat_fan", name: "Ventilateur", deviceTypes: ["Ordinateur", "Console"] },
  { id: "cat_thermal_paste", name: "Pâte thermique", deviceTypes: ["Ordinateur", "Console"] },
  { id: "cat_diagnostic", name: "Diagnostic", deviceTypes: ["Smartphone", "Tablette", "Ordinateur", "Console"] },
  { id: "cat_other", name: "Autre", deviceTypes: ["Smartphone", "Tablette", "Ordinateur", "Console"] },
];

const defaultWorkshopInfo: WorkshopInfo = {
  brand: "BEHAR • TECH",
  name: "Behar Tech",
  address: "2 rue de la Zone",
  postalCode: "74100",
  city: "Annemasse",
  postalCity: "74100 Annemasse",
  country: "France",
  siret: "000 000 000 00000",
  email: "contact@behartechpro.fr",
  phone: "06 12 34 56 78",
  website: "",
  tvaNumber: "",
  vatApplicable: false,
  isMicroEnterprise: true,
  tvaMention: "TVA non applicable — art. 293 B du CGI",
  quoteTerms: "Devis valable 30 jours.",
  invoiceTerms: "Paiement comptant à réception.",
  documentFooter: "Merci pour votre confiance.",
  acceptedPaymentMethods: ["Espèces", "Carte bancaire", "Virement"],
  businessHours: "Lun-Ven 09:00-18:00 · Sam 09:00-13:00",
  allowCounterClient: true,
  repairPrefix: "REP",
  quotePrefix: "DEV",
  invoicePrefix: "FAC",
  receiptPrefix: "REC",
  nextRepairNumber: 1,
  nextQuoteNumber: 1,
  nextInvoiceNumber: 1,
  nextReceiptNumber: 1,
  nextSaleNumber: 1,
  salePrefix: "VTE",
  defaultWarranty: "Garantie 3 mois sur pièce remplacée.",
  managerSignature: "Responsable atelier",
  logoUrl: "",
};
export const workshopInfo = defaultWorkshopInfo;
const defaultWorkshopSettings: WorkshopSettings = {
  ...defaultWorkshopInfo,
  configuredAt: undefined,
  updatedAt: undefined,
};

const asWorkshopInfo = (settings: WorkshopSettings): WorkshopInfo => ({
  ...settings,
});

const euro = (value: string | number) =>
  typeof value === "number" ? value : Number(value.replace(/\s/g, "").replace("€", "").replace(",", ".").trim()) || 0;
export const formatEuro = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    typeof value === "number" && Number.isFinite(value) ? value : 0,
  );
const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
const todayLabel = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const thirtyDaysLaterLabel = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const nowLabel = () =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
const actorFields = (user: CurrentUser) => {
  const now = nowLabel();
  return {
    createdBy: user.id,
    createdByName: user.name,
    updatedBy: user.id,
    updatedByName: user.name,
    createdAt: now,
    updatedAt: now,
  };
};
const updateActorFields = (user: CurrentUser) => ({
  updatedBy: user.id,
  updatedByName: user.name,
  updatedAt: nowLabel(),
});
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "AN";
const safeLineAmount = (line: QuoteLine) => {
  const fromTotal = typeof line.total === "number" && Number.isFinite(line.total) ? line.total : undefined;
  const q = Number.isFinite(line.quantity) ? line.quantity : 0;
  const u = Number.isFinite(line.unitPrice) ? line.unitPrice : 0;
  const computed = q * u;
  const value = fromTotal ?? computed;
  return Number.isFinite(value) ? value : 0;
};
const quoteTotal = (quote: Pick<Quote, "lines">) =>
  quote.lines.reduce((total, line) => total + safeLineAmount(line), 0);
const invoiceTotal = (invoice: Pick<Invoice, "lines">) =>
  invoice.lines.reduce((total, line) => total + safeLineAmount(line), 0);
const normalizeCounter = (value: unknown, fallback = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
};
const padDocNumber = (n: number) => String(normalizeCounter(n)).padStart(4, "0");
const docNumber = (prefix: string | undefined, n: number, fallbackPrefix: string) =>
  `${normalizeText(prefix, fallbackPrefix).toUpperCase()}-${padDocNumber(n)}`;
const clampMoney = (value: number | string | undefined) => Math.max(0, typeof value === "string" ? euro(value) : Number.isFinite(value ?? 0) ? (value ?? 0) : 0);
const clampQuantity = (value: number | undefined) =>
  Math.max(0, Math.floor(Number.isFinite(value ?? 0) ? (value ?? 0) : 0));
const repairStatuses: RepairStatus[] = [
  "Reçu",
  "Diagnostic",
  "Préparation / Réparation",
  "Test final",
  "Prêt",
  "Restitué",
  "Annulé",
];
const quoteStatuses: QuoteStatus[] = ["Brouillon", "Envoyé", "Accepté", "Refusé", "Facturé"];
const invoiceStatuses: InvoiceStatus[] = ["Brouillon", "Envoyée", "Payée", "Annulée"];
const paymentStatuses: PaymentStatus[] = ["Payé", "Annulé", "Remboursé"];
export const paymentMethods: PaymentMethod[] = ["Espèces", "Carte", "Virement", "Paiement en ligne simulé"];
const deviceTypes: DeviceType[] = ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"];
const normalizeText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text || fallback;
};
const normalizePhone = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const counterCustomerId = "customer_counter";
const createCounterCustomer = (createdAt = nowLabel()): Customer => ({
  id: counterCustomerId,
  shopId,
  name: "Client comptoir",
  type: "counter",
  initials: "CC",
  phone: "",
  email: "",
  device: "Vente comptoir",
  lastVisit: createdAt,
  totalSpent: 0,
  status: "Client comptoir",
  lastRepair: "Vente comptoir",
  interventions: 0,
  source: "Comptoir",
  createdAt,
  updatedAt: createdAt,
});
const normalizeRepairStatus = (status: unknown): RepairStatus =>
  repairStatuses.includes(status as RepairStatus) ? (status as RepairStatus) : "Reçu";
const normalizeDeviceType = (type: unknown, fallback: DeviceType = "Smartphone"): DeviceType =>
  deviceTypes.includes(type as DeviceType) ? (type as DeviceType) : fallback;
const findBrandByName = (name: unknown) => {
  const text = normalizeText(name).toLowerCase();
  return deviceBrands.find((brand) => brand.name.toLowerCase() === text);
};
const findModelByName = (name: unknown, brandId?: string) => {
  const text = normalizeText(name).toLowerCase();
  const exactMatch = deviceModels.find(
    (entry) =>
      (!brandId || entry.brandId === brandId) &&
      (entry.name.toLowerCase() === text || entry.aliases?.some((alias) => alias.toLowerCase() === text)),
  );
  if (exactMatch) return exactMatch;
  return deviceModels
    .filter(
      (entry) =>
        (!brandId || entry.brandId === brandId) &&
        (text.includes(entry.name.toLowerCase()) || entry.aliases?.some((alias) => text.includes(alias.toLowerCase()))),
    )
    .sort((a, b) => b.name.length - a.name.length)[0];
};
const getCategoryByName = (name: unknown) => {
  const text = normalizeText(name).toLowerCase();
  if (text.includes("écran") || text.includes("ecran"))
    return partCategories.find((entry) => entry.id === "cat_screen");
  if (text.includes("batterie")) return partCategories.find((entry) => entry.id === "cat_battery");
  if (text.includes("connecteur") || text.includes("charge"))
    return partCategories.find((entry) => entry.id === "cat_charge_port");
  if (text.includes("joystick")) return partCategories.find((entry) => entry.id === "cat_joystick");
  if (text.includes("ventilateur")) return partCategories.find((entry) => entry.id === "cat_fan");
  return partCategories.find((entry) => entry.name.toLowerCase() === text) ?? partCategories.at(-1);
};
const inferDeviceCatalog = (device: unknown, modelName?: unknown) => {
  const source = `${normalizeText(device)} ${normalizeText(modelName)}`.toLowerCase();
  if (source.includes("iphone") || source.includes("macbook")) {
    const foundModel = findModelByName(modelName ?? device, "brand_apple");
    return {
      deviceType: foundModel?.deviceType ?? (source.includes("macbook") ? "Ordinateur" : "Smartphone"),
      brandId: "brand_apple",
      brandName: "Apple",
      modelId: foundModel?.id,
      deviceModel: foundModel?.name ?? normalizeText(modelName, normalizeText(device)),
    };
  }
  if (source.includes("galaxy") || source.includes("samsung")) {
    const foundModel = findModelByName(modelName ?? device, "brand_samsung");
    return {
      deviceType: "Smartphone" as DeviceType,
      brandId: "brand_samsung",
      brandName: "Samsung",
      modelId: foundModel?.id,
      deviceModel: foundModel?.name ?? normalizeText(modelName, normalizeText(device)),
    };
  }
  if (source.includes("switch")) {
    const foundModel = findModelByName(modelName ?? device, "brand_nintendo");
    return {
      deviceType: "Console" as DeviceType,
      brandId: "brand_nintendo",
      brandName: "Nintendo",
      modelId: foundModel?.id,
      deviceModel: foundModel?.name ?? normalizeText(modelName, normalizeText(device)),
    };
  }
  if (source.includes("ps4") || source.includes("ps5") || source.includes("playstation")) {
    const foundModel = findModelByName(modelName ?? device, "brand_sony");
    return {
      deviceType: "Console" as DeviceType,
      brandId: "brand_sony",
      brandName: "Sony",
      modelId: foundModel?.id,
      deviceModel: foundModel?.name ?? normalizeText(modelName, normalizeText(device)),
    };
  }
  return {
    deviceType: "Smartphone" as DeviceType,
    brandId: "brand_other",
    brandName: "Autre",
    modelId: undefined,
    deviceModel: normalizeText(modelName, normalizeText(device, "Modèle à renseigner")),
  };
};

export const toLocalIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const getNowIso = () => toLocalIso(new Date());

export const getTomorrowIso = (hour = 15, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return toLocalIso(d);
};

export const formatIsoToDisplay = (iso: string) => {
  if (!iso || iso.includes(",") || iso.includes("Aujourd'hui")) return iso; // Fallback
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso; // Not an ISO string

  try {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const hasTime = iso.includes("T") || iso.length > 10;
    const time = hasTime ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";

    if (isToday) return hasTime ? `Aujourd'hui, ${time}` : "Aujourd'hui";
    if (isTomorrow) return hasTime ? `Demain, ${time}` : "Demain";

    const datePart = date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return hasTime ? `${datePart} à ${time}` : datePart;
  } catch (e) {
    return iso;
  }
};
const getValidCustomerId = (customerId: unknown, customers: Customer[], fallback = "") => {
  const id = normalizeText(customerId);
  if (id && customers.some((customer) => customer.id === id)) return id;
  if (fallback && customers.some((customer) => customer.id === fallback)) return fallback;
  return customers[0]?.id ?? "";
};
const ensureCounterCustomer = (customers: Customer[]) => {
  const cleaned = customers.filter((customer) => customer.name !== "Anonyme");
  const existing = cleaned.find((customer) => customer.type === "counter" || customer.id === counterCustomerId || customer.name === "Client comptoir");
  if (!existing) return [createCounterCustomer(), ...cleaned];
  return cleaned.map((customer) =>
    customer.id === existing.id
      ? { ...customer, id: counterCustomerId, type: "counter" as const, name: "Client comptoir", initials: "CC" }
      : customer,
  );
};

/** Ligne éditable devis (placeholders autorisés). */
const PLACEHOLDER_LINE_DESCRIPTION = "Ligne à compléter";

const sanitizeQuoteLines = (lines: any[] | undefined): QuoteLine[] =>
  (Array.isArray(lines) ? lines : []).map((line) => {
    const qty = clampQuantity(line.quantity);
    const price = clampMoney(line.unitPrice);
    return {
      ...line,
      id: normalizeText(line.id, uid("line")),
      description: normalizeText(line.description, PLACEHOLDER_LINE_DESCRIPTION),
      quantity: qty,
      unitPrice: price,
      total: qty * price,
    };
  });

const isUsableInvoiceLineDescription = (description: string) => {
  const t = normalizeText(description);
  return t.length > 0 && t !== PLACEHOLDER_LINE_DESCRIPTION;
};

/**
 * Lignes utilisables pour une facture (devis accepté → facture).
 * Exclut placeholders, quantités nulles et montants nuls.
 */
export const linesForInvoiceFromQuote = (lines: QuoteLine[] | any[]): QuoteLine[] =>
  sanitizeQuoteLines(lines).filter(
    (line) => isUsableInvoiceLineDescription(line.description) && line.quantity > 0 && line.unitPrice > 0,
  );

/**
 * Facture/devis directs depuis réparation : UNE SEULE ligne commerciale au prix final client.
 * Le client ne voit jamais le détail pièce + main-d'œuvre.
 * Source du prix final (par ordre de priorité) : repair.total → repair.amount → snapshot.prixClientTotal.
 */
export function buildInvoiceLinesFromRepair(
  repair: Repair,
): { ok: true; lines: QuoteLine[] } | { ok: false; message: string } {
  const snap = repair.selectedPriceSnapshot;
  const modelLabel = normalizeText(repair.deviceModel ?? repair.model);
  const brandLabel = normalizeText(repair.brandName);
  const interventionLabel =
    normalizeText(snap?.reparation) ||
    normalizeText(repair.issue) ||
    normalizeText(snap?.piece) ||
    "Réparation";

  const laborLineTotal = clampMoney(repair.laborPrice ?? repair.amount ?? repair.total ?? snap?.prixClientTotal ?? 0);
  const accessoryLines = (repair.repairSaleLines ?? []).map((line) => ({
    id: uid("line"),
    description: line.sku ? `${line.name} (${line.sku})` : line.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    total: line.total,
  }));
  const finalPrice = clampMoney(laborLineTotal + accessoryLines.reduce((sum, line) => sum + line.total, 0));
  if (finalPrice <= 0) {
    return { ok: false, message: "Ajoutez un tarif à la réparation avant de facturer." };
  }

  const deviceTail = [brandLabel, modelLabel].filter(Boolean).join(" ").trim();
  const description = (deviceTail ? `${interventionLabel} — ${deviceTail}` : interventionLabel)
    .replace(/\s+/g, " ")
    .trim();

  return {
    ok: true,
    lines: [
      ...(laborLineTotal > 0 ? [{ id: uid("line"), description, quantity: 1, unitPrice: laborLineTotal, total: laborLineTotal }] : []),
      ...accessoryLines,
    ],
  };
}

const resolveInvoiceCustomerId = (
  input: { customerId?: string },
  customers: Customer[],
  quote?: Quote,
  repair?: Repair,
) => {
  const tryId = (id: unknown) => {
    const t = normalizeText(String(id));
    return t && customers.some((c) => c.id === t) ? t : "";
  };
  return tryId(input.customerId) || tryId(quote?.customerId) || tryId(repair?.customerId) || "";
};
const normalizeQuoteStatus = (status: unknown): QuoteStatus =>
  status === "Converti"
    ? "Accepté"
    : quoteStatuses.includes(status as QuoteStatus)
      ? (status as QuoteStatus)
      : "Brouillon";
const normalizeInvoiceStatus = (status: unknown): InvoiceStatus =>
  invoiceStatuses.includes(status as InvoiceStatus) ? (status as InvoiceStatus) : "Brouillon";
const normalizePaymentStatus = (status: unknown): PaymentStatus => {
  if (status === "Réussi") return "Payé";
  if (status === "Échoué" || status === "En attente") return "Annulé";
  return paymentStatuses.includes(status as PaymentStatus) ? (status as PaymentStatus) : "Payé";
};
const normalizePaymentMethod = (method: unknown): PaymentMethod => {
  const text = normalizeText(method);
  if (paymentMethods.includes(text as PaymentMethod)) return text as PaymentMethod;
  const lower = text.toLowerCase();
  if (lower.includes("carte")) return "Carte";
  if (lower.includes("virement")) return "Virement";
  if (lower.includes("esp")) return "Espèces";
  return "Paiement en ligne simulé";
};
const uniqueIds = (ids: Array<string | undefined>) => [...new Set(ids.filter(Boolean) as string[])];
const repairPartsTotal = (parts: RepairPart[]) =>
  parts.reduce((total, part) => total + part.salePrice * part.quantity, 0);

const intakeSelectFallbacks = {
  generalCondition: ["Excellent", "Bon", "Usé", "Abîmé", "Très abîmé", "Non renseigné"],
  powerState: ["Allumé", "Éteint", "Non testable", "Non renseigné"],
  chargingState: ["Charge OK", "Ne charge pas", "Batterie vide", "Non testable", "Non renseigné"],
  screenState: ["Intact", "Rayé", "Fissuré", "Cassé", "Tactile non testable", "Non renseigné"],
  frameState: ["Bon état", "Rayures", "Chocs", "Tordu", "Dos cassé", "Non renseigné"],
  camerasState: ["OK", "Défaut visible", "Non testable", "Non renseigné"],
  audioState: ["OK", "Défaut signalé", "Non testable", "Non renseigné"],
  buttonsState: ["OK", "Défaut bouton", "Non testable", "Non renseigné"],
  chargingPortState: ["OK", "Défaut signalé", "Non testable", "Non renseigné"],
  biometricState: ["OK", "Ne fonctionne pas", "Non testable", "Non concerné", "Non renseigné"],
  networkState: ["OK", "Non testé", "SIM absente", "Défaut signalé", "Non renseigné"],
  passcodeState: ["Code fourni", "Code non fourni", "Sans code", "Déverrouillage impossible", "Non renseigné"],
} as const;

const normalizeIntakeSelect = <K extends keyof typeof intakeSelectFallbacks>(
  key: K,
  value: unknown,
): (typeof intakeSelectFallbacks)[K][number] =>
  intakeSelectFallbacks[key].includes(value as never)
    ? (value as (typeof intakeSelectFallbacks)[K][number])
    : "Non renseigné";

const normalizeIntakeText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const str = String(value);
  return /^(undefined|null|nan)$/i.test(str.trim()) ? undefined : str;
};

const normalizeIntakeCondition = (condition: unknown): RepairIntakeCondition | undefined => {
  if (!condition || typeof condition !== "object") return undefined;
  const input = condition as Partial<RepairIntakeCondition>;
  return {
    generalCondition: normalizeIntakeSelect("generalCondition", input.generalCondition),
    powerState: normalizeIntakeSelect("powerState", input.powerState),
    chargingState: normalizeIntakeSelect("chargingState", input.chargingState),
    screenState: normalizeIntakeSelect("screenState", input.screenState),
    frameState: normalizeIntakeSelect("frameState", input.frameState),
    camerasState: normalizeIntakeSelect("camerasState", input.camerasState),
    audioState: normalizeIntakeSelect("audioState", input.audioState),
    buttonsState: normalizeIntakeSelect("buttonsState", input.buttonsState),
    chargingPortState: normalizeIntakeSelect("chargingPortState", input.chargingPortState),
    biometricState: normalizeIntakeSelect("biometricState", input.biometricState),
    networkState: normalizeIntakeSelect("networkState", input.networkState),
    passcodeState: normalizeIntakeSelect("passcodeState", input.passcodeState),
    accessories: Array.isArray(input.accessories)
      ? input.accessories.map((entry) => normalizeIntakeText(entry)).filter(Boolean) as string[]
      : [],
    accessoriesOther: normalizeIntakeText(input.accessoriesOther),
    visibleDefects: normalizeIntakeText(input.visibleDefects),
    customerStatement: normalizeIntakeText(input.customerStatement),
    internalIntakeNotes: normalizeIntakeText(input.internalIntakeNotes),
    photos: Array.isArray(input.photos)
      ? input.photos
          .map((photo) => ({
            id: normalizeText(photo?.id, uid("intake_photo")),
            name: normalizeText(photo?.name, "Photo appareil"),
            dataUrl: normalizeIntakeText(photo?.dataUrl),
            createdAt: normalizeText(photo?.createdAt, nowLabel()),
          }))
          .filter((photo) => photo.dataUrl)
      : [],
    customerConfirmed: Boolean(input.customerConfirmed),
    diagnosticAuthorized: Boolean(input.diagnosticAuthorized),
    nonTestableAccepted: Boolean(input.nonTestableAccepted),
    signerName: normalizeIntakeText(input.signerName),
    signedAt: normalizeIntakeText(input.signedAt),
    createdAt: normalizeIntakeText(input.createdAt),
    updatedAt: normalizeIntakeText(input.updatedAt),
  };
};

const createRepairRecord = (input: RepairInput, sequence: number): Repair => {
  const device = normalizeText(input.device, "Appareil à renseigner");
  const model = normalizeText(input.model, device);
  const inferred = inferDeviceCatalog(device, input.deviceModel ?? model);
  const brand = input.brandId ? deviceBrands.find((entry) => entry.id === input.brandId) : undefined;
  const selectedModel = input.modelId ? deviceModels.find((entry) => entry.id === input.modelId) : undefined;
  const deviceType = normalizeDeviceType(input.deviceType ?? selectedModel?.deviceType ?? inferred.deviceType);
  const brandId = normalizeText(input.brandId, inferred.brandId);
  const brandName = normalizeText(input.brandName, brand?.name ?? inferred.brandName);
  const deviceModel = normalizeText(input.deviceModel, selectedModel?.name ?? model);
  const laborPrice = clampMoney(input.laborPrice ?? input.amount);
  return {
    id: uid("repair"),
    shopId,
    number: `R-2026-${String(sequence + 520).padStart(4, "0")}`,
    customerId: normalizeText(input.customerId),
    appointmentId: input.appointmentId,
    quoteIds: [],
    invoiceIds: [],
    deviceType,
    brandId,
    brandName,
    modelId: normalizeText(input.modelId, selectedModel?.id ?? inferred.modelId),
    deviceModel,
    issueType: normalizeText(input.issueType, normalizeText(input.issue, "Diagnostic")),
    device,
    model: deviceModel,
    issue: normalizeText(input.issue, "Problème à renseigner"),
    status: normalizeRepairStatus(input.status),
    amount: laborPrice,
    laborPrice,
    total: laborPrice,
    notes: normalizeText(input.notes),
    droppedAt: normalizeText(input.droppedAt, getNowIso()),
    estimatedDoneAt: normalizeText(input.estimatedDoneAt, getTomorrowIso()),
    technician: normalizeText(input.technician, "Atelier principal"),
    imei: normalizeText(input.imei, "IMEI non renseigné"),
    parts: [],
    history: ["Réparation créée"],
  };
};
const normalizeRepair = (
  repair: Partial<Repair>,
  customers: Customer[] = [],
  appointments: Partial<Appointment>[] = [],
): Repair => {
  const id = normalizeText(repair.id, uid("repair"));
  const device = normalizeText(repair.device, normalizeText(repair.model, "Appareil à renseigner"));
  const inferred = inferDeviceCatalog(device, repair.deviceModel ?? repair.model);
  const selectedBrand = repair.brandId ? deviceBrands.find((entry) => entry.id === repair.brandId) : undefined;
  const selectedModel = repair.modelId ? deviceModels.find((entry) => entry.id === repair.modelId) : undefined;
  const deviceType = normalizeDeviceType(repair.deviceType ?? selectedModel?.deviceType ?? inferred.deviceType);
  const brandId = normalizeText(repair.brandId, inferred.brandId);
  const brandName = normalizeText(repair.brandName, selectedBrand?.name ?? inferred.brandName);
  const deviceModel = normalizeText(repair.deviceModel, selectedModel?.name ?? normalizeText(repair.model, device));
  const linkedAppointment = repair.appointmentId
    ? appointments.find((appointment) => appointment.id === repair.appointmentId)
    : undefined;
  const linkedCustomerId = normalizeText(linkedAppointment?.customerId);
  const customerId = customers.length
    ? getValidCustomerId(linkedCustomerId || repair.customerId, customers)
    : normalizeText(linkedCustomerId || repair.customerId);
  const parts = Array.isArray(repair.parts)
    ? repair.parts.map((part) => ({
      stockItemId: normalizeText(part.stockItemId),
      name: normalizeText(part.name, "Pièce"),
      reference: normalizeText(part.reference),
      sku: normalizeText(part.sku, normalizeText(part.reference)),
      categoryName: normalizeText(part.categoryName),
      purchasePrice: clampMoney(part.purchasePrice),
      salePrice: clampMoney(part.salePrice),
      quantity: clampQuantity(part.quantity),
      confirmed: Boolean(part.confirmed),
    }))
    : [];
  const repairSaleLines: RepairSaleLine[] = Array.isArray(repair.repairSaleLines)
    ? repair.repairSaleLines
        .map((line: Partial<RepairSaleLine>) => {
          const quantity = Math.max(1, clampQuantity(line.quantity));
          const unitPrice = clampMoney(line.unitPrice);
          return {
            id: normalizeText(line.id, uid("repair_sale_line")),
            stockItemId: normalizeText(line.stockItemId),
            saleId: normalizeText(line.saleId) || undefined,
            name: normalizeText(line.name, "Produit / accessoire"),
            sku: normalizeText(line.sku) || undefined,
            quantity,
            unitPrice,
            total: clampMoney(line.total ?? quantity * unitPrice),
            purchasePriceInternal: clampMoney(line.purchasePriceInternal),
            supplierInternal: normalizeText(line.supplierInternal) || undefined,
            status: (["draft", "confirmed", "invoiced", "paid"].includes(String(line.status)) ? line.status : "draft") as RepairSaleLineStatus,
            stockDecremented: Boolean(line.stockDecremented),
            addedAt: normalizeText(line.addedAt, nowLabel()),
          };
        })
        .filter((line) => line.stockItemId && line.quantity > 0 && line.unitPrice > 0)
    : [];
  const partsTotal = repairPartsTotal(parts);
  const accessoriesTotal = repairSaleLines.reduce((total, line) => total + line.total, 0);
  const laborPrice = clampMoney(
    repair.laborPrice ?? (repair.amount !== undefined ? Math.max(0, repair.amount - partsTotal - accessoriesTotal) : 0),
  );
  const total = clampMoney(repair.total ?? laborPrice + partsTotal + accessoriesTotal);
  return {
    id,
    shopId: normalizeText(repair.shopId, shopId),
    number: normalizeText(repair.number, `R-2026-${id.slice(-4).padStart(4, "0")}`),
    customerId,
    appointmentId: repair.appointmentId,
    quoteId: repair.quoteId,
    quoteIds: uniqueIds([...(Array.isArray(repair.quoteIds) ? repair.quoteIds : []), repair.quoteId]),
    invoiceId: repair.invoiceId,
    invoiceIds: uniqueIds([...(Array.isArray(repair.invoiceIds) ? repair.invoiceIds : []), repair.invoiceId]),
    paymentId: repair.paymentId,
    paymentIds: uniqueIds([...(Array.isArray(repair.paymentIds) ? repair.paymentIds : []), repair.paymentId]),
    deviceType,
    brandId,
    brandName,
    modelId: normalizeText(repair.modelId, selectedModel?.id ?? inferred.modelId),
    deviceModel,
    issueType: normalizeText(repair.issueType, normalizeText(repair.issue, "Diagnostic")),
    device,
    model: deviceModel,
    issue: normalizeText(repair.issue, "Problème à renseigner"),
    status: normalizeRepairStatus(repair.status),
    amount: total,
    laborPrice,
    total,
    notes: normalizeText(repair.notes),
    droppedAt: normalizeText(repair.droppedAt, getNowIso()),
    estimatedDoneAt: normalizeText(repair.estimatedDoneAt, getTomorrowIso()),
    technician: normalizeText(repair.technician, "Atelier principal"),
    imei: normalizeText(repair.imei, "IMEI non renseigné"),
    parts,
    repairSaleLines,
    intakeCondition: normalizeIntakeCondition(repair.intakeCondition),
    history: Array.isArray(repair.history) ? repair.history.map((entry) => normalizeText(entry)).filter(Boolean) : [],
    selectedPriceSnapshot: repair.selectedPriceSnapshot,
  };
};
const normalizeQuote = (quote: Partial<Quote>, customers: Customer[], repairs: Repair[]): Quote => {
  const id = normalizeText(quote.id, uid("quote"));
  const repairId = repairs.some((repair) => repair.id === quote.repairId) ? quote.repairId : undefined;
  const repair = repairs.find((entry) => entry.id === repairId);
  return {
    id,
    shopId: normalizeText(quote.shopId, shopId),
    number: normalizeText(quote.number, `DV-${id.slice(-4).padStart(4, "0")}`),
    customerId: getValidCustomerId(quote.customerId, customers, repair?.customerId),
    repairId,
    invoiceId: quote.invoiceId,
    status: normalizeQuoteStatus(quote.status),
    date: normalizeText(quote.date, todayLabel()),
    expiryDate: normalizeText(quote.expiryDate, thirtyDaysLaterLabel()),
    lines: sanitizeQuoteLines(
      Array.isArray(quote.lines) && quote.lines.length
        ? quote.lines
        : [{ id: uid("line"), description: "Ligne à compléter", quantity: 1, unitPrice: 0 }],
    ),
    notes: quote.notes || "",
    totalAmount: typeof quote.totalAmount === "number" ? quote.totalAmount : 0,
    sourceType: quote.sourceType || "direct",
  };
};
const syncRepairQuoteIds = (repairs: Repair[], quotes: Quote[]) =>
  repairs.map((repair) => {
    const linkedQuoteIds = quotes.filter((quote) => quote.repairId === repair.id).map((quote) => quote.id);
    const quoteIds = uniqueIds([...(repair.quoteIds ?? []), repair.quoteId, ...linkedQuoteIds]);
    return {
      ...repair,
      quoteId: quoteIds[0],
      quoteIds,
    };
  });
const syncRepairInvoiceIds = (repairs: Repair[], invoices: Invoice[]) =>
  repairs.map((repair) => {
    const linkedInvoiceIds = invoices.filter((invoice) => invoice.repairId === repair.id).map((invoice) => invoice.id);
    const invoiceIds = uniqueIds([...(repair.invoiceIds ?? []), repair.invoiceId, ...linkedInvoiceIds]);
    return {
      ...repair,
      invoiceId: invoiceIds[0],
      invoiceIds,
    };
  });
const syncRepairPaymentIds = (repairs: Repair[], payments: Payment[]) =>
  repairs.map((repair) => {
    const linkedPaymentIds = payments.filter((payment) => payment.repairId === repair.id).map((payment) => payment.id);
    const paymentIds = uniqueIds([...(repair.paymentIds ?? []), repair.paymentId, ...linkedPaymentIds]);
    return {
      ...repair,
      paymentId: paymentIds[0],
      paymentIds,
    };
  });
const syncQuoteInvoiceIds = (quotes: Quote[], invoices: Invoice[]) =>
  quotes.map((quote) => {
    const linkedInvoice = invoices.find((invoice) => invoice.quoteId === quote.id);
    return {
      ...quote,
      invoiceId: quote.invoiceId ?? linkedInvoice?.id,
    };
  });
const normalizeInvoice = (invoice: Partial<Invoice>, customers: Customer[], repairs: Repair[], quotes: Quote[]) => {
  const id = normalizeText(invoice.id, uid("invoice"));
  const quote = quotes.find((entry) => entry.id === invoice.quoteId);
  const repairId = repairs.some((repair) => repair.id === (invoice.repairId ?? quote?.repairId))
    ? (invoice.repairId ?? quote?.repairId)
    : undefined;
  const repair = repairs.find((entry) => entry.id === repairId);
  const inv = invoice as Partial<Invoice> & { items?: any[] };
  const fromItems =
    Array.isArray(inv.items) && inv.items.length
      ? inv.items.map((item: any, idx: number) => ({
        id: item.id ?? `line_${id}_${idx}`,
        description: item.description ?? item.label ?? "",
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? item.price ?? item.unit_price ?? 0,
        total: (item.quantity ?? 1) * (item.unitPrice ?? item.price ?? item.unit_price ?? 0),
      }))
      : undefined;
  const lineSource = Array.isArray(invoice.lines) && invoice.lines.length ? invoice.lines : fromItems;
  return {
    id,
    shopId: normalizeText(invoice.shopId, shopId),
    number: normalizeText(invoice.number, `FA-2026-${id.slice(-4).padStart(4, "0")}`),
    customerId: getValidCustomerId(invoice.customerId, customers, quote?.customerId ?? repair?.customerId),
    repairId,
    quoteId: quote?.id ?? invoice.quoteId,
    status: normalizeInvoiceStatus(invoice.status),
    date: normalizeText(invoice.date, todayLabel()),
    lines: sanitizeQuoteLines(
      lineSource && lineSource.length
        ? lineSource
        : [{ id: uid("line"), description: "Intervention atelier", quantity: 1, unitPrice: 90 }],
    ),
    paymentMethod: normalizeText(invoice.paymentMethod, "Non réglée"),
    paymentIds: uniqueIds([...(Array.isArray(invoice.paymentIds) ? invoice.paymentIds : [])]),
    paidAmount: clampMoney(invoice.paidAmount),
    paidAt: invoice.paidAt,
    sourceType: invoice.sourceType || (quote ? "quote" : repair ? "repair" : "manual"),
  };
};
const normalizePayment = (
  payment: Partial<Payment>,
  customers: Customer[],
  invoices: Invoice[],
  sales: Sale[] = [],
): Payment | undefined => {
  const invoice = invoices.find((entry) => entry.id === payment.invoiceId);
  const sale = sales.find((entry) => entry.id === payment.saleId);
  if (!invoice && !sale) return undefined;
  const customerId = getValidCustomerId(payment.customerId, customers, invoice?.customerId ?? sale?.customerId);
  if (!customerId) return undefined;
  const id = normalizeText(payment.id, uid("payment"));
  const method = normalizePaymentMethod(payment.method ?? payment.mode);
  const paymentNumber = normalizeText(
    payment.paymentNumber,
    normalizeText(payment.reference, `PAY-2026-${id.slice(-4)}`),
  );
  const date = normalizeText(payment.date, nowLabel());
  return {
    id,
    shopId: normalizeText(payment.shopId, shopId),
    invoiceId: invoice?.id,
    saleId: sale?.id ?? payment.saleId,
    customerId,
    repairId: payment.repairId ?? invoice?.repairId ?? sale?.repairId,
    quoteId: payment.quoteId ?? invoice?.quoteId,
    paymentNumber,
    reference: paymentNumber,
    method,
    mode: method,
    status: normalizePaymentStatus(payment.status),
    amount: clampMoney(payment.amount),
    date,
    note: normalizeText(payment.note),
    createdAt: normalizeText(payment.createdAt, date),
    updatedAt: normalizeText(payment.updatedAt, date),
  };
};
const syncInvoicePayments = (invoices: Invoice[], payments: Payment[]) =>
  invoices.map((invoice) => {
    const relatedPayments = payments.filter((payment) => payment.invoiceId === invoice.id);
    const activePayments = relatedPayments.filter((payment) => payment.status === "Payé");
    const paidAmount = activePayments.reduce((total, payment) => total + payment.amount, 0);
    const total = invoiceTotal(invoice);
    const isPaid = total > 0 && paidAmount >= total;
    const paidAt = isPaid ? (invoice.paidAt ?? activePayments[0]?.date ?? nowLabel()) : undefined;
    const method = activePayments[0]?.method ?? invoice.paymentMethod;
    return {
      ...invoice,
      paymentIds: uniqueIds([...(invoice.paymentIds ?? []), ...relatedPayments.map((payment) => payment.id)]),
      paidAmount,
      paidAt,
      status: isPaid ? ("Payée" as InvoiceStatus) : invoice.status === "Payée" ? "Envoyée" : invoice.status,
      paymentMethod: isPaid ? method : invoice.paymentMethod === "Non réglée" ? "Non réglée" : invoice.paymentMethod,
    };
  });
const normalizeSale = (sale: Partial<Sale>, customers: Customer[], repairs: Repair[]): Sale => {
  const id = normalizeText(sale.id, uid("sale"));
  const lines = (Array.isArray(sale.lines) ? sale.lines : []).map((line, index) => {
    const quantity = Math.max(1, clampQuantity(line.quantity));
    const unitPrice = clampMoney(line.unitPrice);
    return {
      id: normalizeText(line.id, `${id}_line_${index}`),
      stockItemId: normalizeText(line.stockItemId),
      name: normalizeText(line.name, "Produit / accessoire"),
      sku: normalizeText(line.sku) || undefined,
      itemKind: (line.itemKind === "refurbished-phone" ? "refurbished-phone" : "accessory") as SaleLine["itemKind"],
      warrantyMonths: Math.max(0, Math.floor(Number(line.warrantyMonths ?? 3) || 0)),
      serialNumber: normalizeText(line.serialNumber) || undefined,
      conditionLabel: normalizeText(line.conditionLabel) || undefined,
      quantity,
      unitPrice,
      total: clampMoney(line.total ?? quantity * unitPrice),
      purchasePriceInternal: clampMoney(line.purchasePriceInternal),
      supplierInternal: normalizeText(line.supplierInternal) || undefined,
    };
  });
  const customerId =
    sale.customerId === "counter" || sale.customerName === "Client comptoir"
      ? counterCustomerId
      : getValidCustomerId(sale.customerId, customers, counterCustomerId);
  const repairId = repairs.some((repair) => repair.id === sale.repairId) ? sale.repairId : undefined;
  const subtotal = clampMoney(sale.subtotal ?? lines.reduce((sum, line) => sum + line.total, 0));
  return {
    id,
    shopId: normalizeText(sale.shopId, shopId),
    number: normalizeText(sale.number, `VTE-${id.slice(-4).padStart(4, "0")}`),
    customerId,
    customerName: customerId === counterCustomerId ? "Client comptoir" : normalizeText(sale.customerName, "Client"),
    repairId,
    status: (["Brouillon", "Payée", "Rattachée", "Annulée"].includes(String(sale.status)) ? sale.status : "Brouillon") as SaleStatus,
    lines,
    subtotal,
    taxAmount: clampMoney(sale.taxAmount),
    total: clampMoney(sale.total ?? subtotal),
    paymentMethod: sale.paymentMethod,
    paymentId: normalizeText(sale.paymentId) || undefined,
    documentId: normalizeText(sale.documentId) || undefined,
    paidAt: normalizeText(sale.paidAt) || undefined,
    createdAt: normalizeText(sale.createdAt, nowLabel()),
    createdByUserId: normalizeText(sale.createdByUserId) || undefined,
    createdByName: normalizeText(sale.createdByName) || undefined,
  };
};
const normalizeAppointment = (
  appointment: Partial<Appointment>,
  customers: Customer[],
  repairs: Partial<Repair>[] = [],
): Appointment => {
  const id = normalizeText(appointment.id, uid("appointment"));
  const linkedRepair = repairs.find((repair) => repair.id === appointment.repairId || repair.appointmentId === id);
  const customerId = getValidCustomerId(appointment.customerId, customers, linkedRepair?.customerId);
  const status = normalizeText(appointment.status, "prévu");
  return {
    id,
    shopId: normalizeText(appointment.shopId, shopId),
    customerId,
    repairId: linkedRepair?.id ?? appointment.repairId,
    device: normalizeText(appointment.device, linkedRepair?.device ?? "Appareil à renseigner"),
    issue: normalizeText(appointment.issue, linkedRepair?.issue ?? "Diagnostic"),
    date: normalizeText(appointment.date, todayLabel()),
    time: normalizeText(appointment.time, "14:30"),
    duration: normalizeText(appointment.duration, "30 min"),
    channel: normalizeText(appointment.channel, "Atelier"),
    source: normalizeText(appointment.source, "Atelier"),
    technician: normalizeText(appointment.technician, "Atelier principal"),
    notes: normalizeText(appointment.notes),
    status: linkedRepair && status !== "annulé" ? "terminé" : status,
    confirmed: appointment.confirmed ?? false,
    dayIndex: clampQuantity(appointment.dayIndex),
    row: clampQuantity(appointment.row),
    color: normalizeText(appointment.color, "mint"),
  };
};
const normalizeStockItem = (item: Partial<StockItem> & { skipModelInference?: boolean }): StockItem => {
  const id = normalizeText(item.id, uid("stock"));
  const fallbackMock = stockMocks.find((mock: any) => mock.id === id || mock.reference === item.reference || mock.reference === item.sku);
  const name = normalizeText(item.name, normalizeText(item.part, "Pièce"));
  const sku = normalizeText(item.sku, normalizeText(item.reference, `REF-${Date.now()}`));
  const category = item.categoryId
    ? partCategories.find((entry) => entry.id === item.categoryId)
    : getCategoryByName(item.categoryName ?? item.category ?? name);
  const brand = item.brandId
    ? deviceBrands.find((entry) => entry.id === item.brandId)
    : item.brandName
      ? findBrandByName(item.brandName)
      : item.skipModelInference
        ? undefined
        : findBrandByName(name);
  const modelIds = uniqueIds(Array.isArray(item.modelIds) ? item.modelIds : []);
  // Inférence du modèle désactivée si skipModelInference=true OU si compatibleModels
  // est fourni explicitement (même vide) par l'appelant — on respecte le choix
  // utilisateur pour éviter de coller un modèle par défaut comme "iPhone SE 1re génération".
  const inferenceAllowed =
    !item.skipModelInference &&
    !modelIds.length &&
    !Array.isArray(item.compatibleModels);
  const inferredModel = inferenceAllowed ? findModelByName(name, brand?.id) : undefined;
  const finalModelIds = uniqueIds([...modelIds, inferredModel?.id]);
  const firstModel = finalModelIds.length ? deviceModels.find((entry) => entry.id === finalModelIds[0]) : undefined;
  const effectiveBrand = brand ?? deviceBrands.find((entry) => entry.id === firstModel?.brandId);
  const compatibleModels = uniqueIds([
    ...(Array.isArray(item.compatibleModels) ? item.compatibleModels : []),
    ...finalModelIds.map((modelId) => deviceModels.find((entry) => entry.id === modelId)?.name),
  ]);
  const deviceType = normalizeDeviceType(firstModel?.deviceType ?? item.deviceType ?? category?.deviceTypes[0]);
  const quantity = clampQuantity(item.quantity ?? item.stock ?? (fallbackMock as any)?.stock);
  const now = todayLabel();
  return {
    id,
    shopId: normalizeText(item.shopId, shopId),
    sku,
    name,
    deviceType,
    brandId: effectiveBrand?.id ?? item.brandId,
    brandName: normalizeText(item.brandName, effectiveBrand?.name),
    modelIds: finalModelIds,
    compatibleModels,
    categoryId: category?.id ?? "cat_other",
    categoryName: category?.name ?? normalizeText(item.categoryName, normalizeText(item.category, "Autre")),
    part: name,
    reference: sku,
    category: category?.name ?? normalizeText(item.category, "Autre"),
    purchasePrice: clampMoney(item.purchasePrice || (fallbackMock as any)?.purchasePrice),
    salePrice: clampMoney(item.salePrice || (fallbackMock as any)?.salePrice),
    quantity,
    stock: quantity,
    threshold: clampQuantity(item.threshold),
    supplier: normalizeText(item.supplier, "Non renseigné"),
    leadTime: normalizeText(item.leadTime, "2 à 3 jours"),
    createdAt: normalizeText(item.createdAt, now),
    updatedAt: normalizeText(item.updatedAt, now),
    priceBookItemId: item.priceBookItemId,
  };
};

const CATEGORY_TO_INTERVENTION: Record<string, string> = {
  "Écran": "Écran cassé",
  "Batterie": "Batterie",
  "Connecteur de charge": "Connecteur de charge",
  "Connecteur": "Connecteur de charge",
  "Caméra arrière": "Caméra arrière",
  "Caméra": "Caméra arrière",
  "Dos arrière": "Dos arrière",
  "Dos": "Dos arrière",
  "Vitre arrière": "Vitre arrière",
  "Micro": "Micro",
  "Haut-parleur": "Haut-parleur",
  "Nappe / capteur": "Nappe / capteur",
  "Nappe": "Nappe / capteur",
};

const INTERVENTION_TO_CATEGORY: Record<string, string> = {
  "Écran cassé": "Écran",
  "Écran": "Écran",
  "Batterie": "Batterie",
  "Connecteur de charge": "Connecteur",
  "Caméra arrière": "Caméra",
  "Dos arrière": "Dos",
  "Vitre arrière": "Vitre arrière",
  "Micro": "Micro",
  "Haut-parleur": "Haut-parleur",
  "Nappe / capteur": "Nappe",
};

const INTERVENTION_ALIASES: Record<string, string[]> = {
  "Écran cassé": ["Écran", "écran"],
  "Écran": ["Écran cassé", "écran cassé"],
  "Caméra arrière": ["Caméra", "caméra"],
  "Dos arrière": ["Dos", "Vitre arrière", "dos"],
  "Vitre arrière": ["Dos arrière", "Dos"],
  "Connecteur de charge": ["Connecteur", "connecteur"],
};

const getInterventionFromCategory = (category?: string) => 
  category ? (CATEGORY_TO_INTERVENTION[category] || "Autre intervention") : "Autre intervention";

const getCategoryFromIntervention = (intervention?: string) => 
  intervention ? (INTERVENTION_TO_CATEGORY[intervention] || "Autre") : "Autre";

const syncPriceBookToStockItems = (pbItems: PriceBookItem[], stockItems: StockItem[]): StockItem[] => {
  let nextStock = [...stockItems];
  pbItems.forEach((pb) => {
    // Only sync items that are for pieces (not just labor)
    if (!pb.piece || pb.piece.toLowerCase() === "main d'oeuvre" || pb.piece.toLowerCase() === "main d'œuvre") return;
    
    // 1. Find by ID link
    let sIndex = nextStock.findIndex(s => s.id === pb.stockItemId || s.priceBookItemId === pb.id);
    
    // 2. Find by SKU
    if (sIndex === -1 && pb.sku) {
      sIndex = nextStock.findIndex(s => s.sku === pb.sku || s.reference === pb.sku);
    }
    
    // 3. Find by Name + Brand + Model + Category
    if (sIndex === -1) {
      const category = getCategoryFromIntervention(pb.reparation);
      const pbReparationLower = pb.reparation.toLowerCase();
      const reparationAliases = (INTERVENTION_ALIASES[pb.reparation] ?? []).map(a => a.toLowerCase());
      sIndex = nextStock.findIndex(s => {
        const sCatLower = (s.categoryName || s.category || "").toLowerCase();
        const catMatch =
          s.categoryName === category ||
          s.category === category ||
          sCatLower === pbReparationLower ||
          reparationAliases.includes(sCatLower);
        const modelMatch =
          s.compatibleModels.some(m => m.toLowerCase() === pb.modele.toLowerCase()) ||
          s.name.toLowerCase().includes(pb.modele.toLowerCase());
        return (
          s.brandName?.toLowerCase() === pb.marque.toLowerCase() &&
          s.name.toLowerCase() === pb.piece.toLowerCase() &&
          modelMatch &&
          catMatch
        );
      });
    }

    if (sIndex !== -1) {
      // Update existing Stock item
      nextStock[sIndex] = {
        ...nextStock[sIndex],
        priceBookItemId: pb.id,
        purchasePrice: pb.prixAchat || nextStock[sIndex].purchasePrice,
        salePrice: pb.prixVentePiece || nextStock[sIndex].salePrice,
        // Only update quantity if it was explicitly provided in PriceBook
        quantity: pb.stockDisponible !== undefined ? pb.stockDisponible : nextStock[sIndex].quantity,
        stock: pb.stockDisponible !== undefined ? pb.stockDisponible : nextStock[sIndex].stock,
        supplier: pb.fournisseur || nextStock[sIndex].supplier,
        updatedAt: pb.updatedAt || nextStock[sIndex].updatedAt,
      };
    } else if (pb.stockDisponible !== undefined && pb.stockDisponible > 0) {
      // Create new stock item if it has stock and no match found
      const newItem = normalizeStockItem({
        id: uid("stock"),
        name: pb.piece || `${pb.reparation} ${pb.modele}`,
        brandName: pb.marque,
        compatibleModels: [pb.modele],
        categoryName: getCategoryFromIntervention(pb.reparation),
        purchasePrice: pb.prixAchat,
        salePrice: pb.prixVentePiece,
        quantity: pb.stockDisponible,
        stock: pb.stockDisponible,
        supplier: pb.fournisseur || "Import Catalogue",
        priceBookItemId: pb.id,
        sku: pb.sku,
      });
      nextStock.push(newItem);
    }
  });
  return nextStock;
};

const syncStockToPriceBookItems = (stockItems: StockItem[], pbItems: PriceBookItem[]): PriceBookItem[] => {
  let nextPB = [...pbItems];
  stockItems.forEach((s) => {
    // 1. Find by ID link
    let pbIndex = nextPB.findIndex(pb => pb.id === s.priceBookItemId || pb.stockItemId === s.id);
    
    // 2. Find by SKU
    if (pbIndex === -1 && s.sku) {
      pbIndex = nextPB.findIndex(pb => pb.sku === s.sku || pb.sku === s.reference);
    }
    
    // 3. Find by Type + Brand + Model + Intervention
    if (pbIndex === -1) {
      const intervention = getInterventionFromCategory(s.categoryName || s.category);
      const categoryRaw = (s.categoryName || s.category || "").toLowerCase();
      const interventionAliases = (INTERVENTION_ALIASES[intervention] ?? []).map(a => a.toLowerCase());
      pbIndex = nextPB.findIndex(pb => {
        const pbReparationLower = pb.reparation.toLowerCase();
        const reparationMatches =
          pbReparationLower === intervention.toLowerCase() ||
          pbReparationLower === categoryRaw ||
          interventionAliases.includes(pbReparationLower);
        return (
          pb.marque.toLowerCase() === s.brandName?.toLowerCase() &&
          pb.modele.toLowerCase() === (s.compatibleModels[0]?.toLowerCase() || "générique") &&
          reparationMatches
        );
      });
    }

    if (pbIndex !== -1) {
      // Update existing Price Book entry
      const existing = nextPB[pbIndex];
      const nextItem = {
        ...existing,
        stockItemId: s.id,
        prixAchat: s.purchasePrice,
        prixVentePiece: s.salePrice,
        stockDisponible: s.quantity,
        fournisseur: s.supplier !== "Non renseigné" ? s.supplier : existing.fournisseur,
        updatedAt: new Date().toISOString(),
      };
      
      // Recalculate totals using the store helper if possible, or manual logic
      const total = nextItem.prixVentePiece + nextItem.mainOeuvre;
      const marge = total - nextItem.prixAchat;
      const margePourcentage = total > 0 ? (marge / total) * 100 : 0;
      
      nextPB[pbIndex] = {
        ...nextItem,
        prixClientTotal: total,
        marge,
        margePourcentage,
      };
    } else {
      // Create new price book item
      const intervention = getInterventionFromCategory(s.categoryName || s.category);
      const newItem = createPriceBookItem({
        marque: s.brandName || "Autre",
        modele: s.compatibleModels[0] || "Générique",
        piece: s.name,
        reparation: intervention,
        qualite: "Standard",
        prixAchat: s.purchasePrice,
        prixVentePiece: s.salePrice,
        mainOeuvre: 30, // Default labor
        prixClientTotal: s.salePrice + 30,
        stockDisponible: s.quantity,
        stockItemId: s.id,
        fournisseur: s.supplier !== "Non renseigné" ? s.supplier : undefined,
        source: "manual",
        sku: s.sku || s.reference,
      });
      nextPB.push(newItem);
    }
  });
  return nextPB;
};
const normalizePersistedState = (state: unknown) => {
  try {
    const persisted = state && typeof state === "object" ? (state as Partial<StoreState>) : {};
  const now = nowLabel();
  const DEVICE_TYPES: DeviceType[] = ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"];
  const asDeviceType = (v: unknown): DeviceType | null =>
    typeof v === "string" && DEVICE_TYPES.includes(v as DeviceType) ? (v as DeviceType) : null;
  const persistedBrands: DeviceBrand[] = Array.isArray(persisted.deviceBrands)
    ? [
      ...persisted.deviceBrands
        .map((b) => {
          const id = String((b as any).id || uid("brand"));
          const seedBrand = seed.deviceBrands?.find(
            (sb: DeviceBrand) => sb.id === id || sb.name.toLowerCase() === String((b as any).name || "").toLowerCase(),
          );
          const types = new Set([
            ...(Array.isArray((b as any).deviceTypes) ? (b as any).deviceTypes : []),
            ...(seedBrand?.deviceTypes || []),
          ]);
          return {
            id,
            name: String((b as any).name || seedBrand?.name || "Autre"),
            deviceTypes: (Array.from(types).filter(Boolean) as DeviceType[]).length
              ? (Array.from(types).filter(Boolean) as DeviceType[])
              : (["Autre"] as DeviceType[]),
          };
        })
        .filter((b) => b.name.trim().length > 0),
      ...seed.deviceBrands.filter(
        (seedBrand: DeviceBrand) =>
          !persisted.deviceBrands?.some(
            (b: any) => b.id === seedBrand.id || b.name.toLowerCase() === seedBrand.name.toLowerCase(),
          ),
      ),
    ]
    : seed.deviceBrands;

  const persistedModels: DeviceModel[] = Array.isArray(persisted.deviceModels)
    ? [
      ...persisted.deviceModels
        .map((m) => ({
          id: String((m as any).id || uid("model")),
          brandId: String((m as any).brandId || "brand_other"),
          name: String((m as any).name || "").trim(),
          deviceType: asDeviceType((m as any).deviceType) ?? "Autre",
          aliases: Array.isArray((m as any).aliases) ? ((m as any).aliases as string[]) : undefined,
          isActive: (m as any).isActive !== false,
          createdAt: typeof (m as any).createdAt === "string" ? (m as any).createdAt : now,
          updatedAt: typeof (m as any).updatedAt === "string" ? (m as any).updatedAt : now,
        }))
        .filter((m) => m.name.length > 0),
      ...seed.deviceModels.filter(
        (seedModel: DeviceModel) =>
          !persisted.deviceModels?.some(
            (m: any) => m.id === seedModel.id || m.name.toLowerCase() === seedModel.name.toLowerCase(),
          ),
      ),
    ]
    : seed.deviceModels;

  const baseCustomers = ensureCounterCustomer(Array.isArray(persisted.customers) ? persisted.customers : seed.customers);
  const rawAppointments = Array.isArray(persisted.appointments) ? persisted.appointments : seed.appointments;
  const initialRepairs = Array.isArray(persisted.repairs)
    ? persisted.repairs.map((repair) => normalizeRepair(repair, baseCustomers, rawAppointments))
    : seed.repairs;
  const initialAppointments = rawAppointments.map((appointment) =>
    normalizeAppointment(appointment, baseCustomers, initialRepairs),
  );
  const repairs = initialRepairs.map((repair) => normalizeRepair(repair, baseCustomers, initialAppointments));
  const appointments = initialAppointments.map((appointment) =>
    normalizeAppointment(appointment, baseCustomers, repairs),
  );
  const rawQuotes = (Array.isArray(persisted.quotes) ? persisted.quotes : seed.quotes)
    .map((quote) => normalizeQuote(quote, baseCustomers, repairs))
    .filter((quote) => quote.customerId);
  const rawInvoices = (Array.isArray(persisted.invoices) ? persisted.invoices : seed.invoices)
    .map((invoice) => normalizeInvoice(invoice, baseCustomers, repairs, rawQuotes))
    .filter((invoice) => invoice.customerId);
  const sales = (Array.isArray((persisted as any).sales) ? ((persisted as any).sales as Sale[]) : [])
    .map((sale) => normalizeSale(sale, baseCustomers, repairs))
    .filter((sale) => sale.lines.length > 0);
  const rawPayments = (Array.isArray(persisted.payments) ? persisted.payments : seed.payments)
    .map((payment) => normalizePayment(payment, baseCustomers, rawInvoices, sales))
    .filter(Boolean) as Payment[];
  const invoices = syncInvoicePayments(rawInvoices, rawPayments);
  const quotes = syncQuoteInvoiceIds(rawQuotes, invoices);
  const repairsWithLinks = syncRepairPaymentIds(
    syncRepairInvoiceIds(syncRepairQuoteIds(repairs, quotes), invoices),
    rawPayments,
  );
  const payments = rawPayments;
  const customers = deriveCustomers(baseCustomers, repairsWithLinks, payments);
  const stockItems = (
    Array.isArray(persisted.stockItems)
      ? [
        ...persisted.stockItems.map(normalizeStockItem),
        ...seed.stockItems
          .filter((seedItem) => !persisted.stockItems?.some((item) => item.id === seedItem.id))
          .map(normalizeStockItem),
      ]
      : seed.stockItems
  ).filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
  const workshopSettings: WorkshopSettings = {
    ...defaultWorkshopSettings,
    ...(persisted.workshopSettings ?? persisted.workshopInfo ?? seed.workshopInfo),
    configuredAt:
      typeof (persisted.workshopSettings ?? persisted)?.configuredAt === "string"
        ? (persisted.workshopSettings ?? persisted).configuredAt
        : undefined,
    updatedAt:
      typeof (persisted.workshopSettings ?? persisted)?.updatedAt === "string"
        ? (persisted.workshopSettings ?? persisted).updatedAt
        : undefined,
  };
  workshopSettings.nextRepairNumber = normalizeCounter(
    workshopSettings.nextRepairNumber,
    Math.max(1, repairsWithLinks.length + 1),
  );
  workshopSettings.nextQuoteNumber = normalizeCounter(workshopSettings.nextQuoteNumber, Math.max(1, quotes.length + 1));
  workshopSettings.nextInvoiceNumber = normalizeCounter(
    workshopSettings.nextInvoiceNumber,
    Math.max(1, invoices.length + 1),
  );
  workshopSettings.nextReceiptNumber = normalizeCounter(
    workshopSettings.nextReceiptNumber,
    Math.max(1, payments.length + 1),
  );
  const users = Array.isArray((persisted as any).users)
    ? [
      ...((persisted as any).users as CurrentUser[])
        .map((user) => {
          const id = String((user as any).id || uid("user"));
          const seed = defaultUsers.find((d) => d.id === id);
          // Fallback : si le persisté n'a pas de PIN, on prend celui du seed
          // (utile pour les anciennes installs avant introduction du PIN).
          const persistedPin = typeof (user as any).pin === "string" ? (user as any).pin : undefined;
          const pin = persistedPin && persistedPin.length > 0 ? persistedPin : seed?.pin;
          return withRolePermissions({
            id,
            name: String((user as any).name || seed?.name || "Utilisateur"),
            role: ["admin", "technician", "frontdesk"].includes((user as any).role)
              ? ((user as any).role as UserRole)
              : "frontdesk",
            pin,
            permissionOverrides:
              typeof (user as any).permissionOverrides === "object" && (user as any).permissionOverrides
                ? ((user as any).permissionOverrides as Partial<Record<PermissionKey, boolean>>)
                : typeof (user as any).permissions === "object"
                  ? ((user as any).permissions as Partial<Record<PermissionKey, boolean>>)
                  : undefined,
            active: (user as any).active !== false,
            createdAt: typeof (user as any).createdAt === "string" ? (user as any).createdAt : now,
            updatedAt: typeof (user as any).updatedAt === "string" ? (user as any).updatedAt : now,
          });
        })
        .filter((user) => user.active),
      ...defaultUsers.filter(
        (seedUser) => !((persisted as any).users as CurrentUser[]).some((user) => user.id === seedUser.id),
      ),
    ]
    : defaultUsers;
  const persistedCurrentId =
    typeof (persisted as any).currentUser?.id === "string" ? (persisted as any).currentUser.id : defaultCurrentUser.id;
  const currentUser = users.find((user) => user.id === persistedCurrentId) ?? defaultCurrentUser;

  return {
    workshopInfo: asWorkshopInfo(workshopSettings),
    workshopSettings,
    onboardingCompleted: Boolean((persisted as any).onboardingCompleted ?? workshopSettings.configuredAt),
    configuredAt: workshopSettings.configuredAt,
    updatedAt: workshopSettings.updatedAt,
    selectedCustomerId: persisted.selectedCustomerId ?? seed.selectedCustomerId,
    selectedRepairId: repairs.some((repair) => repair.id === persisted.selectedRepairId)
      ? (persisted.selectedRepairId ?? "")
      : (repairs[0]?.id ?? ""),
    selectedQuoteId: quotes.some((quote) => quote.id === persisted.selectedQuoteId)
      ? (persisted.selectedQuoteId ?? "")
      : (quotes[0]?.id ?? ""),
    selectedInvoiceId: persisted.selectedInvoiceId ?? seed.selectedInvoiceId,
    selectedPaymentId: persisted.selectedPaymentId ?? seed.selectedPaymentId,
    selectedAppointmentId: persisted.selectedAppointmentId ?? seed.selectedAppointmentId,
    selectedStockItemId: persisted.selectedStockItemId ?? seed.selectedStockItemId,
    selectedDocumentId: persisted.selectedDocumentId ?? seed.selectedDocumentId,
    deviceBrands: persistedBrands,
    deviceModels: persistedModels,
    partCategories,
    customers,
    repairs: repairsWithLinks,
    quotes,
    invoices,
    payments,
    appointments,
    stockItems,
    documents: Array.isArray(persisted.documents) ? persisted.documents : seed.documents,
    sales,
    selectedSaleId: typeof (persisted as any).selectedSaleId === "string" ? (persisted as any).selectedSaleId : "",
    messageLogs: Array.isArray(persisted.messageLogs) ? persisted.messageLogs : seed.messageLogs,
    priceBookItems: (() => {
      if (!Array.isArray(persisted.priceBookItems)) return seed.priceBookItems;
      const normalized = persisted.priceBookItems
        .map((item) => normalizePriceBookItem(item))
        .filter((item): item is PriceBookItem => Boolean(item));
      const hasExamples = normalized.some((item) => item.source === "behar_example");
      if (hasExamples) return normalized;
      const existingIds = new Set(normalized.map((item) => item.id));
      const examples = seed.priceBookItems.filter((item) => !existingIds.has(item.id));
      return [...normalized, ...examples];
    })(),
    // Licence — must be restored from persisted state, never reset by merge
    licenseActivated: Boolean((persisted as any).licenseActivated),
    licenseKey: typeof (persisted as any).licenseKey === "string" ? (persisted as any).licenseKey : undefined,
    licensePlan: typeof (persisted as any).licensePlan === "string" ? (persisted as any).licensePlan : "Pilote",
    licenseActivatedAt:
      typeof (persisted as any).licenseActivatedAt === "string"
        ? (persisted as any).licenseActivatedAt
        : undefined,
    teamMembers: Array.isArray((persisted as any).teamMembers) ? (persisted as any).teamMembers : [],
    currentUser,
    users,
    auditLogs: Array.isArray((persisted as any).auditLogs) ? ((persisted as any).auditLogs as AuditLogEntry[]) : [],
    notifications: Array.isArray((persisted as any).notifications)
      ? ((persisted as any).notifications as AppNotification[])
      : [],
  };
  } catch (error) {
    console.error("[behar-store] Error normalizing state, returning safe default:", error);
    return {
      ...seed,
      currentUser: defaultCurrentUser,
      users: defaultUsers,
      workshopSettings: defaultWorkshopSettings,
      workshopInfo: asWorkshopInfo(defaultWorkshopSettings),
    };
  }
};
const deriveCustomers = (customers: Customer[], repairs: Repair[], payments: Payment[]) =>
  customers.map((customer) => {
    const customerRepairs = repairs.filter((repair) => repair.customerId === customer.id);
    const paidTotal = payments
      .filter((payment) => payment.customerId === customer.id && payment.status === "Payé")
      .reduce((total, payment) => total + payment.amount, 0);
    const latestRepair = customerRepairs[0];
    return {
      ...customer,
      totalSpent: paidTotal,
      interventions: customerRepairs.length,
      device: latestRepair?.device ?? customer.device,
      lastRepair: latestRepair ? `${latestRepair.device} - ${latestRepair.issue}` : customer.lastRepair,
      lastVisit: latestRepair?.droppedAt ?? customer.lastVisit,
    };
  });

const categoryMap: Record<string, DeviceType> = {
  smartphone: "Smartphone",
  tablet: "Tablette",
  computer: "Ordinateur",
  console: "Console",
};

const brandMocks = deviceCatalog.map((item, index) => ({
  id: `brand_${index}`,
  name: item.brand,
  deviceTypes: [categoryMap[item.category] || "Autre"],
}));

const modelMocks = deviceCatalog.flatMap((item, bIndex) => 
  item.models.map((model, mIndex) => ({
    id: `model_${bIndex}_${mIndex}`,
    brandId: `brand_${bIndex}`,
    name: model,
    deviceType: categoryMap[item.category] || "Autre",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
);

const partCategoryMocks: PartCategory[] = [
  { id: "cat_screen", name: "Écran", deviceTypes: ["Smartphone", "Tablette", "Ordinateur"] },
  { id: "cat_battery", name: "Batterie", deviceTypes: ["Smartphone", "Tablette", "Ordinateur"] },
  { id: "cat_charging", name: "Connecteur de charge", deviceTypes: ["Smartphone", "Tablette"] },
  { id: "cat_keyboard", name: "Clavier", deviceTypes: ["Ordinateur"] },
  { id: "cat_joystick", name: "Joystick", deviceTypes: ["Console"] },
  { id: "cat_other", name: "Autre", deviceTypes: ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"] },
];

function createSeed() {
  const shopId = "main_shop";

  // Base catalog (keep for convenience)
  const deviceBrandsList = brandMocks.map((brand) => ({ ...brand, shopId }));
  const deviceModelsList = modelMocks.map((model) => ({ ...model, shopId }));
  const partCategoriesList = partCategoryMocks.map((cat) => ({ ...cat, shopId }));

  return {
    workshopInfo: defaultWorkshopInfo,
    workshopSettings: { ...defaultWorkshopInfo, configuredAt: undefined, updatedAt: undefined },
    onboardingCompleted: false,
    configuredAt: undefined,
    updatedAt: undefined,
    selectedCustomerId: "",
    selectedRepairId: "",
    selectedQuoteId: "",
    selectedInvoiceId: "",
    selectedPaymentId: "",
    selectedAppointmentId: "",
    selectedStockItemId: "",
    selectedDocumentId: "",
    selectedSaleId: "",
    sales: [] as Sale[],
    deviceBrands: deviceBrandsList,
    deviceModels: deviceModelsList,
    partCategories: partCategoriesList,
    customers: [createCounterCustomer()] as Customer[],
    repairs: [] as Repair[],
    quotes: [] as Quote[],
    invoices: [] as Invoice[],
    payments: [] as Payment[],
    appointments: [] as Appointment[],
    stockItems: stockMocks.map((item) => normalizeStockItem(item as any)) as StockItem[],
    documents: [] as BeharDocument[],
    messageLogs: [] as MessageLog[],
    priceBookItems: [] as PriceBookItem[],
    isCatalogPreloaded: false,
    licenseActivated: false,
    licenseKey: undefined,
    licensePlan: undefined,
    licenseActivatedAt: undefined,
    teamMembers: [] as TeamMember[],
    currentUser: defaultCurrentUser,
    users: defaultUsers,
    auditLogs: [] as AuditLogEntry[],
    notifications: [] as AppNotification[],
  };
}

const seed = createSeed();

const syncPickup = (repair: Repair, appointments: Appointment[], customers: Customer[]): Appointment[] => {
  void repair;
  void customers;
  // V1 atelier: aucun rendez-vous automatique créé/modifié.
  return appointments;
};

/*
const _legacySyncPickup = (repair: Repair, appointments: Appointment[], customers: Customer[]): Appointment[] => {
  const existingId = appointments.find((a) => a.repairId === repair.id && a.type === "repair_pickup")?.id;
  
  if (!repair.estimatedDoneAt) {
    if (existingId) return appointments.filter((a) => a.id !== existingId);
    return appointments;
  }

  const end = new Date(repair.estimatedDoneAt);
  const start = new Date(repair.droppedAt);
  
  if (isNaN(end.getTime()) || end < start) {
    if (existingId) return appointments.filter((a) => a.id !== existingId);
    return appointments;
  }

  const dateStr = end.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "/");
  const timeStr = end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const pickupData: Partial<Appointment> = {
    customerId: repair.customerId,
    repairId: repair.id,
    device: repair.device,
    issue: `Retrait : ${repair.issueType || repair.issue}`,
    date: dateStr,
    time: timeStr,
    duration: "15 min",
    channel: "Automatique",
    source: "Behar Tech Sync",
    technician: repair.technician || "Atelier principal",
    notes: `Rendez-vous généré automatiquement pour le retrait de la réparation ${repair.number}.`,
    status: repair.status === "Prêt" ? "terminé" : "prévu",
    confirmed: repair.status === "Prêt",
    type: "repair_pickup",
    color: "mint",
  };

  if (existingId) {
    return appointments.map((a) => (a.id === existingId ? { ...a, ...pickupData } : a));
  }

  const newPickup: Appointment = {
    id: `apt_pickup_${repair.id}`,
    shopId: repair.shopId,
    ...pickupData,
    dayIndex: 0,
    row: 0,
  } as Appointment;
  return [...appointments, newPickup];
};
*/

export const useBeharStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seed,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      onboardingCompleted: false,
      licenseActivated: false,
      licenseKey: undefined,
      licensePlan: undefined,
      licenseActivatedAt: undefined,
      teamMembers: [],
      currentUser: defaultCurrentUser,
      users: defaultUsers,
      auditLogs: [],
      notifications: [],

      setCurrentUser: (id) => {
        const user = get().users.find((entry) => entry.id === id && entry.active);
        if (!user) return;
        set({ currentUser: withRolePermissions(user), sessionUserId: user.id });
      },
      loginWithPin: (pin) => {
        const trimmed = (pin || "").trim();
        if (!trimmed) return { ok: false, reason: "invalid" };
        const user = get().users.find((entry) => entry.pin === trimmed);
        if (!user) return { ok: false, reason: "invalid" };
        if (!user.active) return { ok: false, reason: "disabled" };
        const hydrated = withRolePermissions({ ...user, updatedAt: new Date().toISOString() });
        set((state) => ({
          currentUser: hydrated,
          sessionUserId: hydrated.id,
          users: state.users.map((u) => (u.id === user.id ? { ...u, updatedAt: hydrated.updatedAt } : u)),
        }));
        // Audit
        try {
          get().addAuditLog({
            action: "auth.login",
            targetType: "user",
            targetId: user.id,
            message: `${user.name} s'est connecté`,
          });
        } catch {
          /* ignore */
        }
        return { ok: true, user: hydrated };
      },
      logout: () => {
        const actor = get().currentUser;
        if (actor) {
          try {
            get().addAuditLog({
              action: "auth.logout",
              targetType: "user",
              targetId: actor.id,
              message: `${actor.name} s'est déconnecté`,
            });
          } catch {
            /* ignore */
          }
        }
        set({ sessionUserId: undefined });
      },
      addUser: (input) => {
        if (!get().hasPermission("canManageUsers")) {
          return "";
        }
        const id = uid("user");
        const now = new Date().toISOString();
        const newUser = withRolePermissions({
          id,
          name: input.name.trim() || "Membre",
          role: input.role,
          pin: input.pin.trim(),
          permissionOverrides: input.permissionOverrides,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
        set((state) => ({ users: [...state.users, newUser] }));
        get().addAuditLog({
          action: "user.create",
          targetType: "user",
          targetId: id,
          message: `Membre créé : ${newUser.name} (${input.role})`,
        });
        get().addNotification({
          type: "info",
          title: "Nouveau membre",
          message: `${newUser.name} ajouté à l'équipe`,
          targetType: "user",
          targetId: id,
        });
        return id;
      },
      updateUser: (id, patch) => {
        if (!get().hasPermission("canManageUsers")) return;
        set((state) => ({
          users: state.users.map((user) => {
            if (user.id !== id) return user;
            const next = withRolePermissions({ ...user, ...patch, updatedAt: new Date().toISOString() });
            return next;
          }),
          currentUser:
            state.currentUser.id === id
              ? withRolePermissions({ ...state.currentUser, ...patch, updatedAt: new Date().toISOString() })
              : state.currentUser,
        }));
        get().addAuditLog({
          action: "user.update",
          targetType: "user",
          targetId: id,
          message: "Membre modifié",
        });
      },
      deactivateUser: (id) => {
        if (!get().hasPermission("canManageUsers")) return;
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, active: false, updatedAt: new Date().toISOString() } : u)),
        }));
        get().addAuditLog({
          action: "user.deactivate",
          targetType: "user",
          targetId: id,
          message: "Membre désactivé",
        });
      },
      reactivateUser: (id) => {
        if (!get().hasPermission("canManageUsers")) return;
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, active: true, updatedAt: new Date().toISOString() } : u)),
        }));
        get().addAuditLog({
          action: "user.reactivate",
          targetType: "user",
          targetId: id,
          message: "Membre réactivé",
        });
      },
      deleteUser: (id) => {
        if (!get().hasPermission("canManageUsers")) return;
        // Empêche de supprimer le dernier admin actif
        const state = get();
        const adminsLeft = state.users.filter((u) => u.role === "admin" && u.active && u.id !== id).length;
        const targetIsAdmin = state.users.find((u) => u.id === id)?.role === "admin";
        if (targetIsAdmin && adminsLeft === 0) return;
        set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
        get().addAuditLog({
          action: "user.delete",
          targetType: "user",
          targetId: id,
          message: "Membre supprimé",
        });
      },
      resetUserPin: (id, newPin) => {
        if (!get().hasPermission("canManageUsers")) return;
        const trimmed = (newPin || "").trim();
        if (!trimmed) return;
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, pin: trimmed, updatedAt: new Date().toISOString() } : u)),
        }));
        get().addAuditLog({
          action: "user.resetPin",
          targetType: "user",
          targetId: id,
          message: "PIN réinitialisé",
        });
      },
      setUserPermission: (id, key, value) => {
        if (!get().hasPermission("canManageRoles")) return;
        set((state) => ({
          users: state.users.map((u) => {
            if (u.id !== id) return u;
            const overrides = { ...(u.permissionOverrides ?? {}), [key]: value };
            return withRolePermissions({ ...u, permissionOverrides: overrides, updatedAt: new Date().toISOString() });
          }),
          currentUser:
            state.currentUser.id === id
              ? withRolePermissions({
                  ...state.currentUser,
                  permissionOverrides: { ...(state.currentUser.permissionOverrides ?? {}), [key]: value },
                  updatedAt: new Date().toISOString(),
                })
              : state.currentUser,
        }));
        get().addAuditLog({
          action: "user.permissionChange",
          targetType: "user",
          targetId: id,
          message: `Permission ${key} → ${value ? "accordée" : "retirée"}`,
        });
      },
      resetUserPermissions: (id) => {
        if (!get().hasPermission("canManageRoles")) return;
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id
              ? withRolePermissions({ ...u, permissionOverrides: {}, updatedAt: new Date().toISOString() })
              : u,
          ),
        }));
        get().addAuditLog({
          action: "user.permissionReset",
          targetType: "user",
          targetId: id,
          message: "Permissions réinitialisées au rôle",
        });
      },
      hasPermission: (permission) => {
        const user = get().currentUser ?? defaultCurrentUser;
        const effective = resolveUserPermissions(user);
        return Boolean(user.active && effective[permission]);
      },
      requirePermission: (permission) => get().hasPermission(permission),
      addAuditLog: (input) => {
        const id = uid("audit");
        set((state) => {
          const actor = state.currentUser ?? defaultCurrentUser;
          const entry: AuditLogEntry = {
            id,
            actorId: actor.id,
            actorName: actor.name,
            actorRole: actor.role,
            action: input.action,
            targetType: input.targetType,
            targetId: input.targetId,
            message: input.message,
            metadata: input.metadata,
            createdAt: nowLabel(),
          };
          return { auditLogs: [entry, ...state.auditLogs].slice(0, 250) };
        });
        return id;
      },
      addNotification: (input) => {
        const id = uid("notification");
        set((state) => {
          const actor = state.currentUser ?? defaultCurrentUser;
          const notification: AppNotification = {
            id,
            type: input.type ?? "info",
            title: input.title,
            message: input.message,
            targetType: input.targetType,
            targetId: input.targetId,
            actorId: actor.id,
            actorName: actor.name,
            read: false,
            createdAt: nowLabel(),
          };
          return { notifications: [notification, ...state.notifications].slice(0, 100) };
        });
        return id;
      },
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification,
          ),
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
        })),

      activateLicense: (key: string) => {
        const validKeys = [
          "BHT-2026-PRO-001",
          "BHT-2026-PRO-002",
          "BHT-PILOT-ANNEMASSE",
          "BHT-BEHAR-TECH-PRO",
          "BHT-PILOT-EXCLUSIF"
        ];
        if (validKeys.includes(key.toUpperCase().trim())) {
          set({
            licenseActivated: true,
            licenseKey: key.toUpperCase().trim(),
            licensePlan: "Pilote",
            licenseActivatedAt: new Date().toISOString(),
            onboardingCompleted: false, // Force re-onboarding on new activation
          });
          return true;
        }
        return false;
      },
      deactivateLicense: () => {
        set({
          licenseActivated: false,
          licenseKey: undefined,
          licensePlan: undefined,
          licenseActivatedAt: undefined,
        });
      },

      addTeamMember: (member) => {
        set((state) => ({
          teamMembers: [...state.teamMembers, { ...member, id: uid("team") }],
        }));
      },
      updateTeamMember: (id, patch) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },
      deleteTeamMember: (id) => {
        set((state) => ({
          teamMembers: state.teamMembers.filter((m) => m.id !== id),
        }));
      },
      addDeviceBrand: ({ name, deviceType }) => {
        const clean = String(name || "").trim();
        if (!clean) return "";
        const id = `brand_${clean.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
        set((state) => {
          const existing = state.deviceBrands.find((b) => b.id === id || b.name.toLowerCase() === clean.toLowerCase());
          if (existing) {
            const nextTypes = Array.from(new Set([...(existing.deviceTypes ?? []), deviceType]));
            return {
              deviceBrands: state.deviceBrands.map((b) => (b.id === existing.id ? { ...b, deviceTypes: nextTypes } : b)),
            };
          }
          const brand: DeviceBrand = { id, name: clean, deviceTypes: [deviceType] };
          return { deviceBrands: [brand, ...state.deviceBrands] };
        });
        return id;
      },
      updateDeviceBrand: (id, patch) =>
        set((state) => ({
          deviceBrands: state.deviceBrands.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      addDeviceModel: ({ brandId, name, deviceType, aliases }) => {
        const cleanName = String(name || "").replace(/\s+/g, " ").trim();
        if (!cleanName) return "";
        const id = `model_${brandId}_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
        const now = nowLabel();
        set((state) => {
          const exists = state.deviceModels.some(
            (m) => m.brandId === brandId && m.deviceType === deviceType && m.name.toLowerCase() === cleanName.toLowerCase(),
          );
          if (exists) return state;
          const model: DeviceModel = {
            id,
            brandId,
            name: cleanName,
            deviceType,
            aliases,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };
          return { deviceModels: [model, ...state.deviceModels] };
        });
        return id;
      },
      updateDeviceModel: (id, patch) =>
        set((state) => ({
          deviceModels: state.deviceModels.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: nowLabel() } : m)),
        })),
      toggleDeviceModel: (id, isActive) =>
        set((state) => ({
          deviceModels: state.deviceModels.map((m) => (m.id === id ? { ...m, isActive, updatedAt: nowLabel() } : m)),
        })),
      setSelected: (entity, id) => set({ [`selected${entity[0].toUpperCase()}${entity.slice(1)}Id`]: id }),
      addCustomer: (input) => {
        if (!get().requirePermission("canCreateClient", "Créer un client")) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const cleanName = normalizeText(input.name, "Client comptoir");
        const cleanPhone = normalizePhone(input.phone);
        if (cleanName !== "Client comptoir" && cleanPhone) {
          const existing = get().customers.find(
            (customer) => customer.type !== "counter" && customer.name.toLowerCase() === cleanName.toLowerCase() && normalizePhone(customer.phone) === cleanPhone,
          );
          if (existing) return existing.id;
        }
        if (cleanName === "Anonyme" || cleanName === "Client comptoir") {
          set((state) => ({ customers: ensureCounterCustomer(state.customers), selectedCustomerId: counterCustomerId }));
          return counterCustomerId;
        }
        const id = uid("customer");
        const customer: Customer = {
          id,
          shopId,
          name: cleanName,
          type: "named",
          initials: initials(cleanName),
          phone: input.phone || "",
          email: input.email || "",
          address: input.address,
          device: input.device || "Non renseigné",
          lastVisit: input.lastVisit || todayLabel(),
          totalSpent: input.totalSpent ?? 0,
          status: input.status || "Actif",
          lastRepair: input.lastRepair || "Aucune",
          interventions: input.interventions ?? 0,
          source: input.source || "Atelier",
          notes: input.notes,
          tags: input.tags,
          ...actorFields(actor),
        };
        set((state) => ({ customers: [customer, ...ensureCounterCustomer(state.customers)], selectedCustomerId: id }));
        get().addAuditLog({
          action: "client.created",
          targetType: "client",
          targetId: id,
          message: `${actor.name} a créé le client ${customer.name}`,
        });
        return id;
      },
      updateCustomer: (id, patch) =>
        {
          if (!get().requirePermission("canEditClient", "Modifier un client")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => ({
            customers: deriveCustomers(
              state.customers.map((customer) =>
                customer.id === id
                  ? { ...customer, ...patch, initials: patch.name ? initials(patch.name) : customer.initials, ...updateActorFields(actor) }
                  : customer,
              ),
              state.repairs,
              state.payments,
            ),
          }));
          const customer = get().customers.find((entry) => entry.id === id);
          get().addAuditLog({
            action: "client.updated",
            targetType: "client",
            targetId: id,
            message: `${actor.name} a modifié le client ${customer?.name ?? id}`,
          });
        },
      deleteCustomer: (id) => {
        if (!get().requirePermission("canDeleteClient", "Supprimer un client")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const deleted = get().customers.find((customer) => customer.id === id);
        set((state) => {
          const hasLinkedAppointments = state.appointments.some((appointment) => appointment.customerId === id);
          const hasLinkedRepairs = state.repairs.some((repair) => repair.customerId === id);
          if (hasLinkedAppointments || hasLinkedRepairs) return state;
          const customers = state.customers.filter((customer) => customer.id !== id);
          return {
            appointments: state.appointments.filter((appointment) => appointment.customerId !== id),
            customers,
            invoices: state.invoices.filter((invoice) => invoice.customerId !== id),
            messageLogs: state.messageLogs.filter((message) => message.customerId !== id),
            payments: state.payments.filter((payment) => payment.customerId !== id),
            quotes: state.quotes.filter((quote) => quote.customerId !== id),
            repairs: state.repairs,
            selectedCustomerId: customers[0]?.id ?? "",
          };
        });
        if (!get().customers.some((customer) => customer.id === id)) {
          get().addAuditLog({
            action: "client.deleted",
            targetType: "client",
            targetId: id,
            message: `${actor.name} a supprimé le client ${deleted?.name ?? id}`,
          });
        }
      },
      addRepair: (input) => {
        if (!get().requirePermission("canCreateRepair", "Créer une réparation")) return "";
        const state = get();
        const actor = state.currentUser ?? defaultCurrentUser;
        const ws = state.workshopSettings ?? defaultWorkshopSettings;
        const appointment = input.appointmentId
          ? state.appointments.find((entry) => entry.id === input.appointmentId)
          : undefined;
        const customerId = getValidCustomerId(appointment?.customerId ?? input.customerId, state.customers);
        if (!customerId) return "";
        const id = uid("repair");
        const created = createRepairRecord(
          { ...input, customerId, appointmentId: appointment?.id ?? input.appointmentId },
          state.repairs.length,
        );
        const totalClient = clampMoney(input.amount ?? input.total ?? created.amount);
        const labor = clampMoney(input.laborPrice ?? created.laborPrice);
        const repair = {
          ...created,
          id,
          number: docNumber(ws.repairPrefix, ws.nextRepairNumber ?? 1, "REP"),
          amount: totalClient,
          laborPrice: labor,
          total: totalClient,
          selectedPriceSnapshot: input.selectedPriceSnapshot,
          intakeCondition: normalizeIntakeCondition(input.intakeCondition),
          history: Array.isArray(input.history) && input.history.length ? input.history : created.history,
          ...actorFields(actor),
        };
        set((state) => {
          const repairs = [repair, ...state.repairs];
          const nextAppointments = syncPickup(repair, state.appointments, state.customers);
          return {
            workshopSettings: {
              ...state.workshopSettings,
              nextRepairNumber: normalizeCounter((state.workshopSettings?.nextRepairNumber ?? 1) + 1),
              updatedAt: nowLabel(),
            },
            workshopInfo: asWorkshopInfo({
              ...state.workshopSettings,
              nextRepairNumber: normalizeCounter((state.workshopSettings?.nextRepairNumber ?? 1) + 1),
              updatedAt: nowLabel(),
            } as WorkshopSettings),
            appointments: nextAppointments.map((entry) =>
              entry.id === repair.appointmentId
                ? {
                  ...entry,
                  repairId: id,
                  status: "Converti en réparation",
                  confirmed: true,
                }
                : entry,
            ),
            customers: deriveCustomers(state.customers, repairs, state.payments),
            repairs,
            selectedRepairId: id,
            documents: [
              {
                id: `doc_intake_${id}`,
                shopId,
                type: "intake" as DocumentType,
                title: `Bon de prise en charge - ${repair.number}`,
                customerId: repair.customerId,
                repairId: id,
                createdAt: nowLabel(),
              },
              {
                id: `doc_internal_${id}`,
                shopId,
                type: "internal" as DocumentType,
                title: `Fiche intervention interne - ${repair.number}`,
                customerId: repair.customerId,
                repairId: id,
                createdAt: nowLabel(),
              },
              ...state.documents,
            ],
          };
        });
        get().addAuditLog({
          action: "repair.created",
          targetType: "repair",
          targetId: id,
          message: `${actor.name} a créé la réparation ${repair.number}`,
        });
        get().addNotification({
          type: "info",
          title: "Nouvelle réparation",
          message: `${repair.number} a été créée par ${actor.name}`,
          targetType: "repair",
          targetId: id,
        });
        return id;
      },
      updateRepair: (id, patch) =>
        {
          if (!get().requirePermission("canEditRepair", "Modifier une réparation")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => {
          const repairs = state.repairs.map((repair) => {
            if (repair.id !== id) return repair;
            const appointmentId = patch.appointmentId ?? repair.appointmentId;
            const linkedAppointment = appointmentId
              ? state.appointments.find((appointment) => appointment.id === appointmentId)
              : undefined;
            const nextCustomerId = getValidCustomerId(
              linkedAppointment?.customerId ?? patch.customerId ?? repair.customerId,
              state.customers,
              repair.customerId,
            );
            const changes: string[] = [];
            if (nextCustomerId !== repair.customerId) changes.push("client");
            if (patch.issue !== undefined && patch.issue !== repair.issue) changes.push("problème");
            if (patch.device !== undefined && patch.device !== repair.device) changes.push("appareil");
            if (patch.model !== undefined && patch.model !== repair.model) changes.push("modèle");
            if (patch.brandName !== undefined && patch.brandName !== repair.brandName) changes.push("marque");
            if (patch.deviceModel !== undefined && patch.deviceModel !== repair.deviceModel)
              changes.push("modèle métier");
            if (patch.issueType !== undefined && patch.issueType !== repair.issueType) changes.push("panne type");
            if (patch.imei !== undefined && patch.imei !== repair.imei) changes.push("IMEI");
            if (patch.notes !== undefined && patch.notes !== repair.notes) changes.push("notes internes");
            if (patch.laborPrice !== undefined && patch.laborPrice !== repair.laborPrice) changes.push("main-d'œuvre");
            if (patch.status !== undefined && patch.status !== repair.status) changes.push(`statut : ${patch.status}`);
            if (patch.intakeCondition !== undefined) changes.push("état d'entrée");
            const nextLaborPrice =
              patch.laborPrice === undefined
                ? patch.amount === undefined
                  ? repair.laborPrice
                  : clampMoney(patch.amount)
                : clampMoney(patch.laborPrice);
            const nextRepair = normalizeRepair(
              {
                ...repair,
                ...patch,
                customerId: nextCustomerId,
                appointmentId,
                laborPrice: nextLaborPrice,
                amount: clampMoney((nextLaborPrice ?? 0) + repairPartsTotal(patch.parts ?? repair.parts)),
                history: changes.length ? [...repair.history, `Modification : ${changes.join(", ")}`] : repair.history,
                ...updateActorFields(actor),
              },
              state.customers,
              state.appointments,
            );
            return nextRepair;
          });
          const targetRepair = repairs.find((r) => r.id === id);
          let appointments = state.appointments.map((appointment) => {
            const linkedRepair = repairs.find((repair) => repair.appointmentId === appointment.id);
            return linkedRepair
              ? { ...appointment, repairId: linkedRepair.id, status: "Converti en réparation", confirmed: true }
              : appointment;
          });
          if (targetRepair) {
            appointments = syncPickup(targetRepair, appointments, state.customers);
          }
          return { appointments, customers: deriveCustomers(state.customers, repairs, state.payments), repairs };
        });
          const repair = get().repairs.find((entry) => entry.id === id);
          get().addAuditLog({
            action: "repair.updated",
            targetType: "repair",
            targetId: id,
            message: `${actor.name} a modifié la réparation ${repair?.number ?? id}`,
          });
        },
      deleteRepair: (id) => {
        if (!get().requirePermission("canDeleteRepair", "Supprimer une réparation")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const deleted = get().repairs.find((repair) => repair.id === id);
        set((state) => {
          const repairs = state.repairs.filter((repair) => repair.id !== id);
          const deletedRepair = state.repairs.find((repair) => repair.id === id);
          const stockItems = state.stockItems.map((stockItem) => {
            const usedPart = deletedRepair?.parts.find((part) => part.stockItemId === stockItem.id);
            return usedPart
              ? {
                ...stockItem,
                quantity: stockItem.quantity + usedPart.quantity,
                stock: stockItem.stock + usedPart.quantity,
              }
              : stockItem;
          });
          return {
            appointments: state.appointments
              .filter((a) => a.repairId !== id || a.type !== "repair_pickup")
              .map((appointment) =>
                deletedRepair?.appointmentId === appointment.id || appointment.repairId === id
                  ? { ...appointment, repairId: undefined, status: "Réparation supprimée" }
                  : appointment,
              ),
            customers: deriveCustomers(state.customers, repairs, state.payments),
            repairs,
            selectedRepairId: repairs[0]?.id ?? "",
            stockItems,
          };
        });
        if (!get().repairs.some((repair) => repair.id === id)) {
          get().addAuditLog({
            action: "repair.deleted",
            targetType: "repair",
            targetId: id,
            message: `${actor.name} a supprimé la réparation ${deleted?.number ?? id}`,
          });
        }
      },
      changeRepairStatus: (id, status) => {
        if (!get().requirePermission("canChangeRepairStatus", "Changer le statut")) return;
        const state = get();
        const actor = state.currentUser ?? defaultCurrentUser;
        const previous = state.repairs.find((r) => r.id === id);
        if (!previous) return;
        if (previous.status === status) return;

        const statusEvent = (() => {
          switch (status) {
            case "Diagnostic":
              return "Diagnostic démarré";
            case "Préparation / Réparation":
              return "Réparation en préparation";
            case "Test final":
              return "Test final en cours";
            case "Prêt":
              return "Réparation prête";
            case "Restitué":
              return "Réparation restituée";
            case "Annulé":
              return "Réparation annulée";
            default:
              return `Statut changé : ${status}`;
          }
        })();

        set((current) => ({
          repairs: current.repairs.map((repair) =>
            repair.id === id ? { ...repair, status, history: [...repair.history, statusEvent], ...updateActorFields(actor) } : repair,
          ),
        }));
        get().addAuditLog({
          action: "repair.status_changed",
          targetType: "repair",
          targetId: id,
          message: `${actor.name} a passé ${previous.number} en ${status}`,
          metadata: { from: previous.status, to: status },
        });
        get().addNotification({
          type: status === "Prêt" ? "success" : status === "Annulé" ? "warning" : "info",
          title: "Statut réparation",
          message: `${previous.number} est passé en ${status}`,
          targetType: "repair",
          targetId: id,
        });

        if (status !== "Prêt") return;

        // Workflow auto au passage en "Prêt" : facture propre si possible
        const after = get();
        const repair = after.repairs.find((r) => r.id === id);
        if (!repair) return;

        const acceptedQuote = after.quotes.find((q) => q.repairId === id && q.status === "Accepté");
        const existingInvoice =
          (acceptedQuote && after.invoices.find((inv) => inv.quoteId === acceptedQuote.id)) ||
          after.invoices.find((inv) => inv.repairId === id);

        const appendHistory = (msg: string) => {
          set((current) => ({
            repairs: current.repairs.map((r) => (r.id === id ? { ...r, history: [...r.history, msg] } : r)),
          }));
        };

        if (existingInvoice) {
          appendHistory(`Facture déjà existante : ${existingInvoice.number}`);
          return;
        }

        if (acceptedQuote) {
          const invoiceId = get().convertQuoteToInvoice(acceptedQuote.id);
          if (invoiceId) {
            const inv = get().invoices.find((i) => i.id === invoiceId);
            appendHistory(`Facture créée depuis le devis : ${inv?.number ?? invoiceId}`);
          } else {
            appendHistory("Facturation bloquée : conversion devis impossible.");
          }
          return;
        }

        const customer = after.customers.find((c) => c.id === repair.customerId);
        if (!customer) {
          appendHistory("Réparation prête, facturation bloquée : client invalide.");
          return;
        }

        const built = buildInvoiceLinesFromRepair(repair);
        if (!built.ok) {
          appendHistory(`Réparation prête, facturation bloquée : ${built.message}`);
          return;
        }

        const invoiceId = get().addInvoice({
          customerId: repair.customerId,
          repairId: repair.id,
          lines: built.lines,
          sourceType: "repair",
          sourceNumber: repair.number,
          status: "Envoyée",
        });
        if (invoiceId) {
          const inv = get().invoices.find((i) => i.id === invoiceId);
          appendHistory(`Facture créée depuis la réparation : ${inv?.number ?? invoiceId}`);
        } else {
          appendHistory("Réparation prête, facturation bloquée : données invalides.");
        }
      },
      addPartToRepair: (repairId, stockItemId, quantity = 1) => {
        if (!get().requirePermission("canUseStockItem", "Utiliser une pièce")) return false;
        const wanted = clampQuantity(quantity);
        if (wanted <= 0) return false;
        const state = get();
        const item = state.stockItems.find((stockItem) => stockItem.id === stockItemId);
        const repair = state.repairs.find((entry) => entry.id === repairId);
        // We still check if stock is available, but we don't decrement yet
        if (!repair || !item || item.stock < wanted) return false;
        set((current) => {
          const currentItem = current.stockItems.find((stockItem) => stockItem.id === stockItemId);
          const currentRepair = current.repairs.find((entry) => entry.id === repairId);
          if (!currentRepair || !currentItem) return current;
          
          const repairs = current.repairs.map((repair) => {
            if (repair.id !== repairId) return repair;
            const existing = repair.parts.find((part) => part.stockItemId === stockItemId);
            const parts = existing
              ? repair.parts.map((part) =>
                part.stockItemId === stockItemId ? { ...part, quantity: part.quantity + wanted } : part,
              )
              : [
                ...repair.parts,
                {
                  stockItemId: currentItem.id,
                  name: currentItem.name,
                  reference: currentItem.sku,
                  sku: currentItem.sku,
                  categoryName: currentItem.categoryName,
                  purchasePrice: currentItem.purchasePrice,
                  salePrice: currentItem.salePrice,
                  quantity: wanted,
                  confirmed: false, // Explicitly not confirmed yet
                },
              ];
            const amount = clampMoney((repair.laborPrice ?? 0) + repairPartsTotal(parts));
            return {
              ...repair,
              amount,
              total: amount,
              parts,
              history: [
                ...repair.history,
                `Pièce ajoutée (en attente) : ${currentItem.name} x${wanted}`,
              ],
            };
          });
          
          // DO NOT decrement stockItems here anymore as per USER_REQUEST
          return { repairs };
        });
        return true;
      },
      confirmPartUsage: (repairId: string, stockItemId: string) => {
        if (!get().requirePermission("canUseStockItem", "Confirmer une pièce")) return false;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((current) => {
          const repair = current.repairs.find(r => r.id === repairId);
          const part = repair?.parts.find(p => p.stockItemId === stockItemId);
          if (!repair || !part || part.confirmed) return current;

          const stockItem = current.stockItems.find(s => s.id === stockItemId);
          if (!stockItem || stockItem.stock < part.quantity) return current;

          const nextRepairs = current.repairs.map(r => 
            r.id === repairId 
              ? { 
                  ...r, 
                  parts: r.parts.map(p => p.stockItemId === stockItemId ? { ...p, confirmed: true } : p),
                  history: [...r.history, `Utilisation confirmée : ${part.name} x${part.quantity}`]
                } 
              : r
          );

          const nextStock = current.stockItems.map(s => 
            s.id === stockItemId 
              ? { ...s, quantity: Math.max(0, s.quantity - part.quantity), stock: Math.max(0, s.stock - part.quantity) } 
              : s
          );

          const audit = {
            action: "stock.item_used",
            targetType: "stock",
            targetId: stockItemId,
            message: `${actor.name} a utilisé ${part.name} dans ${repair.number}`,
            metadata: { repairId, quantity: part.quantity },
          };
          const lowStockNotification =
            nextStock.find((entry) => entry.id === stockItemId && entry.stock <= entry.threshold)
              ? {
                type: "warning" as const,
                title: "Stock bas",
                message: `${stockItem.name} est sous le seuil d'alerte`,
                targetType: "stock",
                targetId: stockItemId,
              }
              : undefined;
          return {
            repairs: nextRepairs,
            stockItems: nextStock,
            auditLogs: [
              {
                id: uid("audit"),
                actorId: actor.id,
                actorName: actor.name,
                actorRole: actor.role,
                createdAt: nowLabel(),
                ...audit,
              },
              ...current.auditLogs,
            ].slice(0, 250),
            notifications: lowStockNotification
              ? [
                {
                  id: uid("notification"),
                  actorId: actor.id,
                  actorName: actor.name,
                  read: false,
                  createdAt: nowLabel(),
                  ...lowStockNotification,
                },
                ...current.notifications,
              ].slice(0, 100)
              : current.notifications,
          };
        });
        return true;
      },
      addSaleLinesToRepair: (repairId, lines, saleId) => {
        if (!get().requirePermission("canCreateSale", "Ajouter un accessoire à une réparation")) return false;
        const cleanedLines = lines
          .map((line) => {
            const quantity = Math.max(1, clampQuantity(line.quantity));
            const unitPrice = clampMoney(line.unitPrice);
            return {
              ...line,
              quantity,
              unitPrice,
              total: clampMoney(line.total ?? quantity * unitPrice),
            };
          })
          .filter((line) => line.stockItemId && line.quantity > 0 && line.unitPrice > 0);
        if (!cleanedLines.length) return false;
        const state = get();
        const repair = state.repairs.find((entry) => entry.id === repairId);
        if (!repair) return false;
        const alreadyInvoiced = state.invoices.some((invoice) => invoice.repairId === repairId);
        const alreadyPaid = state.payments.some((payment) => payment.repairId === repairId && payment.status === "Payé");
        if (alreadyInvoiced || alreadyPaid) return false;
        for (const line of cleanedLines) {
          const stockItem = state.stockItems.find((item) => item.id === line.stockItemId);
          if (!stockItem || stockItem.stock < line.quantity) return false;
        }
        const timestamp = nowLabel();
        set((current) => {
          const repairs = current.repairs.map((entry) => {
            if (entry.id !== repairId) return entry;
            const repairSaleLines: RepairSaleLine[] = [
              ...(entry.repairSaleLines ?? []),
              ...cleanedLines.map((line, index) => ({
                id: uid(`repair_sale_${index}`),
                stockItemId: line.stockItemId,
                saleId,
                name: line.name,
                sku: line.sku,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                total: line.total,
                purchasePriceInternal: line.purchasePriceInternal,
                supplierInternal: line.supplierInternal,
                status: "draft" as RepairSaleLineStatus,
                stockDecremented: false,
                addedAt: timestamp,
              })),
            ];
            const accessoriesTotal = repairSaleLines.reduce((sum, line) => sum + line.total, 0);
            const base = clampMoney(entry.laborPrice ?? entry.amount ?? 0);
            return {
              ...entry,
              repairSaleLines,
              amount: clampMoney(base + repairPartsTotal(entry.parts) + accessoriesTotal),
              total: clampMoney(base + repairPartsTotal(entry.parts) + accessoriesTotal),
              history: [...entry.history, `Accessoires ajoutés : ${cleanedLines.length} ligne(s)`],
            };
          });
          return { repairs, customers: deriveCustomers(current.customers, repairs, current.payments) };
        });
        return true;
      },
      markRepairSaleLineDelivered: (repairId, lineId) => {
        if (!get().requirePermission("canUseStockItem", "Marquer un accessoire remis")) return false;
        const state = get();
        const repair = state.repairs.find((entry) => entry.id === repairId);
        const line = repair?.repairSaleLines?.find((entry) => entry.id === lineId);
        if (!repair || !line || line.stockDecremented) return false;
        const alreadyPaid = state.payments.some((payment) => payment.repairId === repairId && payment.status === "Payé");
        if (alreadyPaid) return false;
        const stockItem = state.stockItems.find((item) => item.id === line.stockItemId);
        if (!stockItem || stockItem.stock < line.quantity) return false;
        set((current) => ({
          repairs: current.repairs.map((entry) =>
            entry.id === repairId
              ? {
                  ...entry,
                  repairSaleLines: (entry.repairSaleLines ?? []).map((candidate) =>
                    candidate.id === lineId
                      ? { ...candidate, status: "confirmed" as RepairSaleLineStatus, stockDecremented: true }
                      : candidate,
                  ),
                  history: [...entry.history, `Accessoire remis : ${line.name} x${line.quantity}`],
                }
              : entry,
          ),
          stockItems: current.stockItems.map((item) =>
            item.id === line.stockItemId
              ? { ...item, quantity: Math.max(0, item.quantity - line.quantity), stock: Math.max(0, item.stock - line.quantity) }
              : item,
          ),
        }));
        return true;
      },
      removePartFromRepair: (repairId, stockItemId) => {
        const state = get();
        const repair = state.repairs.find((entry) => entry.id === repairId);
        const part = repair?.parts.find((entry) => entry.stockItemId === stockItemId);
        if (!(repair && part)) return false;
        set((current) => {
          const currentRepair = current.repairs.find((entry) => entry.id === repairId);
          const currentPart = currentRepair?.parts.find((entry) => entry.stockItemId === stockItemId);
          if (!(currentRepair && currentPart)) return current;
          
          // Increment stock ONLY if it was confirmed
          const nextStock = currentPart.confirmed 
            ? current.stockItems.map((item) =>
                item.id === stockItemId
                  ? { ...item, quantity: item.quantity + currentPart.quantity, stock: item.stock + currentPart.quantity }
                  : item,
              )
            : current.stockItems;

          return {
            stockItems: nextStock,
            repairs: current.repairs.map((entry) =>
              entry.id === repairId
                ? {
                  ...entry,
                  amount: clampMoney(
                    (entry.laborPrice ?? 0) +
                    repairPartsTotal(entry.parts.filter((repairPart) => repairPart.stockItemId !== stockItemId)),
                  ),
                  total: clampMoney(
                    (entry.laborPrice ?? 0) +
                    repairPartsTotal(entry.parts.filter((repairPart) => repairPart.stockItemId !== stockItemId)),
                  ),
                  parts: entry.parts.filter((repairPart) => repairPart.stockItemId !== stockItemId),
                  history: [...entry.history, `Pièce retirée : ${currentPart.name} x${currentPart.quantity}`],
                }
                : entry,
            ),
          };
        });
        return true;
      },
      addQuote: (input) => {
        if (!get().requirePermission("canCreateQuote", "Créer un devis")) return "";
        const state = get();
        const actor = state.currentUser ?? defaultCurrentUser;
        const ws = state.workshopSettings ?? defaultWorkshopSettings;
        // Anti-doublon : bloquer si un devis accepté existe déjà sur cette réparation
        if (input.repairId) {
          const existingAccepted = state.quotes.find((q) => q.repairId === input.repairId && q.status === "Accepté");
          if (existingAccepted) return "";
        }
        // Résolution stricte du client : pas de fallback silencieux vers un autre client
        const rawCustomerId = normalizeText((input as any).customerId || (input as any).clientId);
        const repairForQuote = input.repairId ? state.repairs.find((r) => r.id === input.repairId) : undefined;
        const candidateCustomerId = rawCustomerId || normalizeText(repairForQuote?.customerId);
        const customerExists = candidateCustomerId && state.customers.some((c) => c.id === candidateCustomerId);
        if (!customerExists) return "";
        const customer = state.customers.find((c) => c.id === candidateCustomerId);

        const status: QuoteStatus = normalizeQuoteStatus(input.status ?? "Brouillon");
        const sanitizedLines = sanitizeQuoteLines(input.lines);
        const usableLines = sanitizedLines.filter(
          (l) => isUsableInvoiceLineDescription(l.description) && l.quantity > 0 && l.unitPrice > 0,
        );
        const lineTotal = sanitizedLines.reduce((sum, l) => sum + safeLineAmount(l), 0);
        // Devis non-brouillon : interdiction de créer vide / à 0 €
        if (status !== "Brouillon") {
          if (!usableLines.length || lineTotal <= 0) return "";
        }

        const id = uid("quote");
        const quote = normalizeQuote(
          {
            ...input,
            id,
            number: docNumber(ws.quotePrefix, ws.nextQuoteNumber ?? 1, "DEV"),
            customerId: candidateCustomerId,
            ...actorFields(actor),
          },
          state.customers,
          state.repairs,
        );
        set((state) => ({
          workshopSettings: {
            ...state.workshopSettings,
            nextQuoteNumber: normalizeCounter((state.workshopSettings?.nextQuoteNumber ?? 1) + 1),
            updatedAt: nowLabel(),
          },
          workshopInfo: asWorkshopInfo({
            ...state.workshopSettings,
            nextQuoteNumber: normalizeCounter((state.workshopSettings?.nextQuoteNumber ?? 1) + 1),
            updatedAt: nowLabel(),
          } as WorkshopSettings),
          quotes: [quote, ...state.quotes],
          repairs: state.repairs.map((repair) =>
            repair.id === quote.repairId
              ? {
                ...repair,
                quoteId: repair.quoteId ?? id,
                quoteIds: uniqueIds([...(repair.quoteIds ?? []), repair.quoteId, id]),
                history: [...repair.history, `Devis lié : ${quote.number}`],
              }
              : repair,
          ),
          selectedQuoteId: id,
          documents: [
            {
              id: `doc_${id}`,
              shopId,
              type: "quote",
              title: `Devis #${quote.number}`,
              customerId: quote.customerId,
              repairId: quote.repairId,
              quoteId: id,
              createdAt: quote.date,
            },
            ...state.documents,
          ],
        }));
        get().addAuditLog({
          action: "quote.created",
          targetType: "quote",
          targetId: id,
          message: `${actor.name} a créé le devis ${quote.number}`,
        });
        return id;
      },
      updateQuote: (id, patch) =>
        {
          const nextStatus = patch.status ? normalizeQuoteStatus(patch.status) : undefined;
          const required = nextStatus === "Accepté" ? "canAcceptQuote" : "canEditQuote";
          if (!get().requirePermission(required, "Modifier un devis")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => {
          const previous = state.quotes.find((quote) => quote.id === id);
          const quotes = state.quotes.map((quote) => {
            if (quote.id !== id) return quote;
            const repair = patch.repairId ? state.repairs.find((entry) => entry.id === patch.repairId) : undefined;
            return {
              ...quote,
              ...patch,
              customerId: patch.customerId
                ? getValidCustomerId(patch.customerId, state.customers, repair?.customerId ?? quote.customerId)
                : quote.customerId,
              status: patch.status ? normalizeQuoteStatus(patch.status) : quote.status,
              lines: sanitizeQuoteLines(patch.lines ? patch.lines : quote.lines),
              totalAmount: patch.totalAmount ?? quote.totalAmount,
              ...updateActorFields(actor),
            };
          });
          const updated = quotes.find((quote) => quote.id === id);
          const repairs =
            updated && previous?.status !== "Accepté" && updated.status === "Accepté" && updated.repairId
              ? state.repairs.map((repair) =>
                repair.id === updated.repairId
                  ? {
                    ...repair,
                    quoteIds: uniqueIds([...(repair.quoteIds ?? []), repair.quoteId, updated.id]),
                    history: [...repair.history, `Devis accepté : ${updated.number}`],
                  }
                  : repair,
              )
              : state.repairs;
          return { quotes, repairs: syncRepairQuoteIds(repairs, quotes) };
        });
          const quote = get().quotes.find((entry) => entry.id === id);
          get().addAuditLog({
            action: quote?.status === "Accepté" ? "quote.accepted" : "quote.updated",
            targetType: "quote",
            targetId: id,
            message:
              quote?.status === "Accepté"
                ? `${actor.name} a accepté le devis ${quote.number}`
                : `${actor.name} a modifié le devis ${quote?.number ?? id}`,
          });
          if (quote?.status === "Accepté") {
            get().addNotification({
              type: "success",
              title: "Devis accepté",
              message: `${quote.number} a été accepté`,
              targetType: "quote",
              targetId: id,
            });
          }
        },
      deleteQuote: (id) =>
        set((state) => {
          const quotes = state.quotes.filter((quote) => quote.id !== id);
          return {
            documents: state.documents.filter((document) => document.quoteId !== id),
            quotes,
            repairs: state.repairs.map((repair) => {
              const quoteIds = (repair.quoteIds ?? []).filter((quoteId) => quoteId !== id);
              return {
                ...repair,
                quoteId: repair.quoteId === id ? quoteIds[0] : repair.quoteId,
                quoteIds,
              };
            }),
            selectedQuoteId: quotes[0]?.id ?? "",
          };
        }),
      addQuoteLine: (quoteId) =>
        set((state) => ({
          quotes: state.quotes.map((quote) =>
            quote.id === quoteId
              ? {
                ...quote,
                lines: [
                  ...quote.lines,
                  { id: uid("line"), description: "Ligne à compléter", quantity: 1, unitPrice: 0, total: 0 },
                ],
              }
              : quote,
          ),
        })),
      updateQuoteLine: (quoteId, lineId, patch) =>
        set((state) => ({
          quotes: state.quotes.map((quote) =>
            quote.id === quoteId
              ? {
                ...quote,
                lines: quote.lines.map((line) =>
                  line.id === lineId
                    ? {
                      ...line,
                      ...patch,
                      quantity: patch.quantity === undefined ? line.quantity : clampQuantity(patch.quantity),
                      unitPrice: patch.unitPrice === undefined ? line.unitPrice : clampMoney(patch.unitPrice),
                      total: (patch.quantity ?? line.quantity) * (patch.unitPrice ?? line.unitPrice),
                    }
                    : line,
                ),
              }
              : quote,
          ),
        })),
      deleteQuoteLine: (quoteId, lineId) =>
        set((state) => ({
          quotes: state.quotes.map((quote) =>
            quote.id === quoteId && quote.lines.length > 1
              ? { ...quote, lines: quote.lines.filter((line) => line.id !== lineId) }
              : quote,
          ),
        })),
      convertQuoteToInvoice: (quoteId) => {
        if (!get().requirePermission("canCreateInvoice", "Convertir un devis")) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const quote = get().quotes.find((entry) => entry.id === quoteId);
        if (!quote?.customerId || !quote.lines.length) return "";
        if (quote.status !== "Accepté") return "";

        // Anti-doublon strict
        const existingInvoice =
          get().invoices.find((invoice) => invoice.id === quote.invoiceId) ??
          get().invoices.find((invoice) => invoice.quoteId === quote.id);

        if (existingInvoice) {
          if (quote.invoiceId !== existingInvoice.id) {
            get().updateQuote(quote.id, { invoiceId: existingInvoice.id, status: "Facturé" });
          }
          get().setSelected("invoice", existingInvoice.id);
          return existingInvoice.id;
        }

        const lines = linesForInvoiceFromQuote(quote.lines);
        if (!lines.length) return "";

        const invoiceId = get().addInvoice({
          customerId: quote.customerId,
          repairId: quote.repairId,
          quoteId: quote.id,
          lines,
          status: "Envoyée",
          sourceType: "quote",
          sourceNumber: quote.number,
          paymentMethod: "Lien envoyé",
        });

        if (invoiceId) {
          get().updateQuote(quote.id, { invoiceId, status: "Facturé" });
          get().addAuditLog({
            action: "quote.converted_to_invoice",
            targetType: "quote",
            targetId: quote.id,
            message: `${actor.name} a converti ${quote.number} en facture`,
            metadata: { invoiceId },
          });
        }

        return invoiceId;
      },
      addInvoice: (input) => {
        if (!get().requirePermission("canCreateInvoice", "Créer une facture")) return "";
        const state = get();
        const actor = state.currentUser ?? defaultCurrentUser;
        const ws = state.workshopSettings ?? defaultWorkshopSettings;
        const quote = input.quoteId ? state.quotes.find((entry) => entry.id === input.quoteId) : undefined;
        const existingInvoice =
          quote &&
          (state.invoices.find((invoice) => invoice.id === quote.invoiceId) ??
            state.invoices.find((invoice) => invoice.quoteId === quote.id));
        if (existingInvoice) {
          if (!quote.invoiceId) {
            set((current) => ({
              quotes: current.quotes.map((entry) =>
                entry.id === quote.id ? { ...entry, invoiceId: existingInvoice.id } : entry,
              ),
            }));
          }
          return existingInvoice.id;
        }
        const repair =
          (input.repairId ?? quote?.repairId)
            ? state.repairs.find((entry) => entry.id === (input.repairId ?? quote?.repairId))
            : undefined;
        const customerId = resolveInvoiceCustomerId({ customerId: input.customerId }, state.customers, quote, repair);
        const lines = sanitizeQuoteLines(input.lines).filter(
          (l) => isUsableInvoiceLineDescription(l.description) && l.quantity > 0,
        );
        if (!customerId || !lines.length) return "";

        const customer = state.customers.find((c) => c.id === customerId);
        const isDraft = input.status === "Brouillon";

        // Blocage Total 0 (Règle métier P0)
        const total = lines.reduce((acc, l) => acc + safeLineAmount(l), 0);
        if (total <= 0 && !isDraft) {
          return "";
        }
        const id = uid("invoice");
        const invoice: Invoice = {
          id,
          shopId,
          number: docNumber(ws.invoicePrefix, ws.nextInvoiceNumber ?? 1, "FAC"),
          customerId,
          repairId: repair?.id ?? input.repairId ?? quote?.repairId,
          quoteId: quote?.id ?? input.quoteId,
          sourceType: input.sourceType || (quote ? "quote" : repair ? "repair" : "client"),
          sourceNumber: input.sourceNumber || (quote ? quote.number : repair ? repair.number : undefined),
          status: input.status || "Brouillon",
          date: todayLabel(),
          lines,
          paymentMethod: input.paymentMethod || "Non réglée",
          paymentIds: [],
          paidAmount: 0,
          paidAt: undefined,
          ...actorFields(actor),
        };
        set((state) => ({
          workshopSettings: {
            ...state.workshopSettings,
            nextInvoiceNumber: normalizeCounter((state.workshopSettings?.nextInvoiceNumber ?? 1) + 1),
            updatedAt: nowLabel(),
          },
          workshopInfo: asWorkshopInfo({
            ...state.workshopSettings,
            nextInvoiceNumber: normalizeCounter((state.workshopSettings?.nextInvoiceNumber ?? 1) + 1),
            updatedAt: nowLabel(),
          } as WorkshopSettings),
          invoices: [invoice, ...state.invoices],
          repairs: state.repairs.map((repair) =>
            repair.id === invoice.repairId
              ? {
                ...repair,
                invoiceId: repair.invoiceId ?? id,
                invoiceIds: uniqueIds([...(repair.invoiceIds ?? []), repair.invoiceId, id]),
                repairSaleLines: (repair.repairSaleLines ?? []).map((line) => ({
                  ...line,
                  status: line.status === "paid" ? line.status : ("invoiced" as RepairSaleLineStatus),
                })),
                history: [...repair.history, `Facture liée : ${invoice.number}`],
              }
              : repair,
          ),
          quotes: state.quotes.map((quote) =>
            quote.id === invoice.quoteId ? { ...quote, invoiceId: id, status: "Facturé" as QuoteStatus } : quote,
          ),
          selectedInvoiceId: id,
          documents: [
            {
              id: `doc_${id}`,
              shopId,
              type: "invoice",
              title: `Facture #${invoice.number}`,
              customerId: invoice.customerId,
              repairId: invoice.repairId,
              quoteId: invoice.quoteId,
              invoiceId: id,
              createdAt: invoice.date,
            },
            ...state.documents,
          ],
        }));
        get().addAuditLog({
          action: "invoice.created",
          targetType: "invoice",
          targetId: id,
          message: `${actor.name} a créé la facture ${invoice.number}`,
        });
        get().addNotification({
          type: "info",
          title: "Facture créée",
          message: `${invoice.number} a été créée`,
          targetType: "invoice",
          targetId: id,
        });
        return id;
      },
      updateInvoice: (id, patch) =>
        {
          if (!get().requirePermission("canEditInvoice", "Modifier une facture")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => ({
          invoices: state.invoices.map((invoice) => {
            if (invoice.id !== id || invoice.status === "Payée") return invoice;
            const quote = patch.quoteId ? state.quotes.find((entry) => entry.id === patch.quoteId) : undefined;
            const repair =
              (patch.repairId ?? quote?.repairId)
                ? state.repairs.find((entry) => entry.id === (patch.repairId ?? quote?.repairId))
                : undefined;
            return {
              ...invoice,
              ...patch,
              customerId: patch.customerId
                ? getValidCustomerId(patch.customerId, state.customers, quote?.customerId ?? repair?.customerId)
                : invoice.customerId,
              repairId: patch.repairId ?? quote?.repairId ?? invoice.repairId,
              quoteId: patch.quoteId ?? invoice.quoteId,
              status: patch.status ? normalizeInvoiceStatus(patch.status) : invoice.status,
              lines: patch.lines ? sanitizeQuoteLines(patch.lines) : invoice.lines,
              ...updateActorFields(actor),
            };
          }),
        }));
          const invoice = get().invoices.find((entry) => entry.id === id);
          get().addAuditLog({
            action: "invoice.updated",
            targetType: "invoice",
            targetId: id,
            message: `${actor.name} a modifié la facture ${invoice?.number ?? id}`,
          });
        },
      deleteInvoice: (id) => {
        if (!get().requirePermission("canEditInvoice", "Supprimer une facture")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const deleted = get().invoices.find((invoice) => invoice.id === id);
        set((state) => {
          const invoices = state.invoices.filter((invoice) => invoice.id !== id);
          return {
            documents: state.documents.filter((document) => document.invoiceId !== id),
            invoices,
            quotes: state.quotes.map((quote) => (quote.invoiceId === id ? { ...quote, invoiceId: undefined } : quote)),
            repairs: state.repairs.map((repair) => {
              const invoiceIds = (repair.invoiceIds ?? []).filter((invoiceId) => invoiceId !== id);
              return {
                ...repair,
                invoiceId: repair.invoiceId === id ? invoiceIds[0] : repair.invoiceId,
                invoiceIds,
              };
            }),
            selectedInvoiceId: invoices[0]?.id ?? "",
          };
        });
        get().addAuditLog({
          action: "invoice.deleted",
          targetType: "invoice",
          targetId: id,
          message: `${actor.name} a supprimé la facture ${deleted?.number ?? id}`,
        });
      },
      markInvoicePaid: (invoiceId, method = "Carte", note = "") => {
        if (!get().requirePermission("canMarkPaymentPaid", "Encaisser une facture")) return "";
        const invoice = get().invoices.find((entry) => entry.id === invoiceId);
        const actor = get().currentUser ?? defaultCurrentUser;
        if (!invoice?.customerId) return "";
        const ws = get().workshopSettings ?? defaultWorkshopSettings;
        const total = invoiceTotal(invoice);
        const existingPayments = get().payments.filter((payment) => payment.invoiceId === invoiceId);
        const activePaidAmount = existingPayments
          .filter((payment) => payment.status === "Payé")
          .reduce((sum, payment) => sum + payment.amount, 0);
        const existing = existingPayments.find((payment) => payment.status === "Payé" && payment.amount >= total);
        if (invoice.status === "Payée" && existing) return existing.id;
        if (total <= 0 || activePaidAmount >= total) return existing?.id ?? "";
        const repairForStock = invoice.repairId ? get().repairs.find((repair) => repair.id === invoice.repairId) : undefined;
        const linesToDecrement = (repairForStock?.repairSaleLines ?? []).filter((line) => !line.stockDecremented);
        for (const line of linesToDecrement) {
          const stockItem = get().stockItems.find((item) => item.id === line.stockItemId);
          if (!stockItem || stockItem.stock < line.quantity) return "";
        }
        const amount = Math.max(0, total - activePaidAmount);
        const paymentId = uid("payment");
        const timestamp = nowLabel();
        const payment: Payment = {
          id: paymentId,
          shopId,
          invoiceId,
          customerId: invoice.customerId,
          repairId: invoice.repairId,
          quoteId: invoice.quoteId,
          paymentNumber: docNumber(ws.receiptPrefix, ws.nextReceiptNumber ?? 1, "REC"),
          reference: docNumber(ws.receiptPrefix, ws.nextReceiptNumber ?? 1, "REC"),
          method,
          mode: method,
          status: "Payé",
          amount,
          date: timestamp,
          note,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: actor.id,
          createdByName: actor.name,
          updatedBy: actor.id,
          updatedByName: actor.name,
        };
        set((state) => {
          const nextPaymentIds = uniqueIds([...(invoice.paymentIds ?? []), paymentId]);
          const invoices = state.invoices.map((entry) =>
            entry.id === invoiceId
              ? {
                ...entry,
                status: "Payée" as InvoiceStatus,
                paymentMethod: method,
                paymentIds: nextPaymentIds,
                paidAmount: total,
                paidAt: timestamp,
              }
              : entry,
          );
          const payments = [payment, ...state.payments];
          const repairs = state.repairs.map((repair) => {
            if (repair.id !== invoice.repairId) return repair;
            return {
              ...repair,
              paymentId,
              paymentIds: uniqueIds([...(repair.paymentIds ?? []), repair.paymentId, paymentId]),
              invoiceId: repair.invoiceId ?? invoiceId,
              invoiceIds: uniqueIds([...(repair.invoiceIds ?? []), repair.invoiceId, invoiceId]),
              status: "Prêt" as RepairStatus,
              repairSaleLines: (repair.repairSaleLines ?? []).map((line) => ({
                ...line,
                status: "paid" as RepairSaleLineStatus,
                stockDecremented: true,
              })),
              history: [...repair.history, `Paiement encaissé : ${formatEuro(payment.amount)}`],
            };
          });
          const stockItems = state.stockItems.map((item) => {
            const quantityToRemove = linesToDecrement
              .filter((line) => line.stockItemId === item.id)
              .reduce((sum, line) => sum + line.quantity, 0);
            return quantityToRemove > 0
              ? { ...item, quantity: Math.max(0, item.quantity - quantityToRemove), stock: Math.max(0, item.stock - quantityToRemove) }
              : item;
          });
          return {
            workshopSettings: {
              ...state.workshopSettings,
              nextReceiptNumber: normalizeCounter((state.workshopSettings?.nextReceiptNumber ?? 1) + 1),
              updatedAt: nowLabel(),
            },
            workshopInfo: asWorkshopInfo({
              ...state.workshopSettings,
              nextReceiptNumber: normalizeCounter((state.workshopSettings?.nextReceiptNumber ?? 1) + 1),
              updatedAt: nowLabel(),
            } as WorkshopSettings),
            invoices,
            payments,
            repairs,
            stockItems,
            customers: deriveCustomers(state.customers, repairs, payments),
            selectedPaymentId: paymentId,
            documents: [
              {
                id: `doc_${paymentId}`,
                shopId,
                type: "payment",
                title: `Reçu de paiement - ${payment.reference}`,
                customerId: payment.customerId,
                repairId: payment.repairId,
                invoiceId,
                paymentId,
                createdAt: payment.date,
              },
              ...state.documents,
            ],
          };
        });
        get().addAuditLog({
          action: "payment.marked_paid",
          targetType: "payment",
          targetId: paymentId,
          message: `${actor.name} a marqué la facture ${invoice.number} comme payée`,
          metadata: { invoiceId, amount },
        });
        get().addNotification({
          type: "success",
          title: "Paiement encaissé",
          message: `${formatEuro(amount)} encaissés sur ${invoice.number}`,
          targetType: "payment",
          targetId: paymentId,
        });
        return paymentId;
      },
      addPayment: (input) => {
        if (!get().requirePermission("canMarkPaymentPaid", "Créer un paiement")) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const id = uid("payment");
        const timestamp = nowLabel();
        const ws = get().workshopSettings;
        const payment: Payment = {
          id,
          shopId,
          ...input,
          paymentNumber: docNumber(ws.receiptPrefix, ws.nextReceiptNumber ?? 1, "REC"),
          mode: input.method,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: actor.id,
          createdByName: actor.name,
          updatedBy: actor.id,
          updatedByName: actor.name,
        };

        set((state) => ({
          payments: [payment, ...state.payments],
          workshopSettings: {
            ...state.workshopSettings,
            nextReceiptNumber: (state.workshopSettings.nextReceiptNumber ?? 1) + 1,
            updatedAt: timestamp,
          },
          workshopInfo: asWorkshopInfo({
            ...state.workshopSettings,
            nextReceiptNumber: (state.workshopSettings.nextReceiptNumber ?? 1) + 1,
            updatedAt: timestamp,
          } as WorkshopSettings),
          documents: [
            {
              id: `doc_${id}`,
              shopId,
              type: "payment" as DocumentType,
              title: `Reçu de paiement - ${payment.paymentNumber}`,
              customerId: payment.customerId,
              repairId: payment.repairId,
              invoiceId: payment.invoiceId,
              paymentId: id,
              createdAt: payment.date ?? timestamp,
            },
            ...state.documents,
          ],
        }));
        get().addAuditLog({
          action: "payment.created",
          targetType: "payment",
          targetId: id,
          message: `${actor.name} a créé le paiement ${payment.paymentNumber}`,
          metadata: { amount: payment.amount, invoiceId: payment.invoiceId },
        });

        return id;
      },
      createInvoiceFromRepair: (repairId: string) => {
        const state = get();
        const repair = state.repairs.find((r) => r.id === repairId);
        if (!repair) return "";

        // Anti-doublon
        const existingInvoice = state.invoices.find((inv) => inv.repairId === repairId);
        if (existingInvoice) return existingInvoice.id;

        const built = buildInvoiceLinesFromRepair(repair);
        if (!built.ok || !built.lines.length) return "";

        return state.addInvoice({
          customerId: repair.customerId,
          repairId: repair.id,
          lines: built.lines,
          status: "Envoyée",
          sourceType: "repair",
          sourceNumber: repair.number,
        });
      },
      markRepairAsPaid: (repairId: string, method = "Carte", note = "") => {
        const state = get();
        const repair = state.repairs.find((r) => r.id === repairId);
        if (!repair) return "";

        // Cas A : Facture existante
        const existingInvoice = state.invoices.find((inv) => inv.repairId === repairId);
        if (existingInvoice) {
          if (existingInvoice.status === "Payée") return "";
          return state.markInvoicePaid(existingInvoice.id, method, note);
        }

        // Cas B : Pas de facture, créer automatiquement
        const invoiceId = state.createInvoiceFromRepair(repairId);
        if (!invoiceId) return "";

        return state.markInvoicePaid(invoiceId, method, note);
      },
      updatePaymentStatus: (id, status) =>
        {
          if (status === "Annulé" && !get().requirePermission("canCancelPayment", "Annuler un paiement")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => {
          const timestamp = nowLabel();
          const payments = state.payments.map((payment) =>
            payment.id === id ? { ...payment, status, ...updateActorFields(actor) } : payment,
          );
          const changedPayment = payments.find((payment) => payment.id === id);
          if (!changedPayment) return { payments };
          const invoices = state.invoices.map((invoice) => {
            if (invoice.id !== changedPayment.invoiceId) return invoice;
            const relatedPayments = payments.filter((payment) => payment.invoiceId === invoice.id);
            const activePayments = relatedPayments.filter((payment) => payment.status === "Payé");
            const paidAmount = activePayments.reduce((sum, payment) => sum + payment.amount, 0);
            const total = invoiceTotal(invoice);
            const isPaid = total > 0 && paidAmount >= total;
            return {
              ...invoice,
              paymentIds: uniqueIds([...(invoice.paymentIds ?? []), ...relatedPayments.map((payment) => payment.id)]),
              paidAmount,
              paidAt: isPaid ? (invoice.paidAt ?? activePayments[0]?.date ?? timestamp) : undefined,
              status: isPaid ? ("Payée" as InvoiceStatus) : invoice.status === "Payée" ? "Envoyée" : invoice.status,
              paymentMethod: isPaid ? (activePayments[0]?.method ?? invoice.paymentMethod) : "Non réglée",
            };
          });
          const repairs = state.repairs.map((repair) => {
            if (repair.id !== changedPayment.repairId) return repair;
            return {
              ...repair,
              paymentIds: uniqueIds([
                ...(repair.paymentIds ?? []),
                ...payments.filter((payment) => payment.repairId === repair.id).map((payment) => payment.id),
              ]),
              history:
                status === "Annulé"
                  ? [...repair.history, `Paiement annulé : ${changedPayment.paymentNumber}`]
                  : repair.history,
            };
          });
          return { customers: deriveCustomers(state.customers, repairs, payments), invoices, payments, repairs };
        });
          const payment = get().payments.find((entry) => entry.id === id);
          get().addAuditLog({
            action: status === "Annulé" ? "payment.cancelled" : "payment.updated",
            targetType: "payment",
            targetId: id,
            message: `${actor.name} a passé le paiement ${payment?.paymentNumber ?? id} en ${status}`,
          });
        },
      addAppointment: (input) => {
        const customerId = getValidCustomerId(input.customerId, get().customers);
        if (!customerId) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const id = uid("appointment");
        const appointment: Appointment = {
          id,
          shopId,
          customerId,
          repairId: input.repairId,
          device: input.device,
          issue: input.issue,
          date: input.date,
          time: input.time,
          duration: input.duration || "30 min",
          channel: input.channel || "Atelier",
          source: input.source || "Atelier",
          technician: input.technician || "Atelier principal",
          notes: input.notes || "",
          status: input.status || (input.confirmed ? "venu" : "prévu"),
          confirmed: input.confirmed ?? false,
          dayIndex: input.dayIndex ?? 2,
          row: input.row ?? 6,
          color: input.color || "mint",
        };
        set((state) => ({ appointments: [appointment, ...state.appointments], selectedAppointmentId: id }));
        get().addAuditLog({
          action: "appointment.created",
          targetType: "appointment",
          targetId: id,
          message: `${actor.name} a créé un rendez-vous le ${appointment.date}`,
        });
        get().addNotification({
          type: "info",
          title: "Nouveau rendez-vous",
          message: `${appointment.device} le ${appointment.date} à ${appointment.time}`,
          targetType: "appointment",
          targetId: id,
        });
        return id;
      },
      updateAppointment: (id, patch) =>
        set((state) => {
          const appointments = state.appointments.map((appointment) => {
            if (appointment.id !== id) return appointment;
            const linkedRepair = state.repairs.find((repair) => repair.id === (patch.repairId ?? appointment.repairId));
            const customerId = getValidCustomerId(
              linkedRepair?.customerId ?? patch.customerId ?? appointment.customerId,
              state.customers,
              appointment.customerId,
            );
            return normalizeAppointment({ ...appointment, ...patch, customerId }, state.customers, state.repairs);
          });
          const repairs = state.repairs.map((repair) => {
            const appointment = appointments.find((entry) => entry.id === repair.appointmentId);
            return appointment && repair.customerId !== appointment.customerId
              ? normalizeRepair(
                {
                  ...repair,
                  customerId: appointment.customerId,
                  history: [...repair.history, "Client synchronisé depuis le rendez-vous"],
                },
                state.customers,
                appointments,
              )
              : repair;
          });
          return { appointments, customers: deriveCustomers(state.customers, repairs, state.payments), repairs };
        }),
      deleteAppointment: (id, deleteLinkedRepair = false) =>
        set((state) => {
          const appointments = state.appointments.filter((appointment) => appointment.id !== id);
          const linkedRepair = state.repairs.find(
            (repair) =>
              repair.appointmentId === id ||
              repair.id === state.appointments.find((appointment) => appointment.id === id)?.repairId,
          );
          const repairs = deleteLinkedRepair
            ? state.repairs.filter((repair) => repair.appointmentId !== id && repair.id !== linkedRepair?.id)
            : state.repairs.map((repair) =>
              repair.appointmentId === id || repair.id === linkedRepair?.id
                ? {
                  ...repair,
                  appointmentId: undefined,
                  history: [...repair.history, "Rendez-vous lié supprimé"],
                }
                : repair,
            );
          return {
            appointments,
            customers: deriveCustomers(state.customers, repairs, state.payments),
            repairs,
            selectedAppointmentId: appointments[0]?.id ?? "",
            selectedRepairId:
              deleteLinkedRepair && linkedRepair?.id === state.selectedRepairId
                ? (repairs[0]?.id ?? "")
                : state.selectedRepairId,
          };
        }),
      createRepairFromAppointment: (appointmentId) => {
        const appointment = get().appointments.find((entry) => entry.id === appointmentId);
        if (!appointment) return "";
        const customerId = getValidCustomerId(appointment.customerId, get().customers);
        if (!customerId) return "";
        const existing =
          get().repairs.find((repair) => repair.id === appointment.repairId) ??
          get().repairs.find((repair) => repair.appointmentId === appointment.id);
        if (existing) {
          get().updateRepair(existing.id, { appointmentId: appointment.id, customerId });
          get().updateAppointment(appointment.id, {
            repairId: existing.id,
            status: "terminé",
            confirmed: true,
          });
          return existing.id;
        }
        const repairId = get().addRepair({
          appointmentId: appointment.id,
          customerId,
          device: appointment.device,
          model: appointment.device,
          issue: appointment.issue,
          status: "Reçu",
          amount: 0,
          notes: appointment.notes,
          droppedAt: `${appointment.date}, ${appointment.time}`,
          technician: "Atelier principal",
        });
        if (repairId) {
          get().updateAppointment(appointment.id, {
            repairId,
            status: "terminé",
            confirmed: true,
          });
        }
        return repairId;
      },
      addStockItem: (input) => {
        if (!get().requirePermission("canManageStock", "Créer une pièce")) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const id = uid("stock");
        const item = normalizeStockItem({
          id,
          shopId,
          leadTime: input.leadTime || "2 à 3 jours",
          ...input,
          ...actorFields(actor),
        });
        set((state) => {
          const stockItems = [item, ...state.stockItems];
          const priceBookItems = syncStockToPriceBookItems(stockItems, state.priceBookItems);
          return {
            stockItems,
            priceBookItems,
            selectedStockItemId: id
          };
        });
        get().addAuditLog({
          action: "stock.item_created",
          targetType: "stock",
          targetId: id,
          message: `${actor.name} a créé la pièce ${item.name}`,
        });
        return id;
      },
      updateStockItem: (id, patch) =>
        {
          if (!get().requirePermission("canManageStock", "Modifier le stock")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => {
          const stockItems = state.stockItems.map((item) =>
            item.id === id
              ? normalizeStockItem({
                ...item,
                ...patch,
                name: patch.name ?? patch.part ?? item.name,
                part: patch.name ?? patch.part ?? item.name,
                sku: patch.sku ?? patch.reference ?? item.sku,
                reference: patch.sku ?? patch.reference ?? item.sku,
                categoryName: patch.categoryName ?? patch.category ?? item.categoryName,
                category: patch.categoryName ?? patch.category ?? item.categoryName,
                quantity: patch.quantity ?? patch.stock ?? item.quantity,
                stock: patch.quantity ?? patch.stock ?? item.quantity,
                purchasePrice:
                  patch.purchasePrice === undefined ? item.purchasePrice : clampMoney(patch.purchasePrice),
                salePrice: patch.salePrice === undefined ? item.salePrice : clampMoney(patch.salePrice),
                threshold: patch.threshold === undefined ? item.threshold : clampQuantity(patch.threshold),
                ...updateActorFields(actor),
              })
              : item,
          );
          const priceBookItems = syncStockToPriceBookItems(stockItems, state.priceBookItems);
          const target = stockItems.find((item) => item.id === id);
          const lowStockNotification =
            target && target.stock <= target.threshold
              ? {
                id: uid("notification"),
                type: "warning" as const,
                title: "Stock bas",
                message: `${target.name} est sous le seuil d'alerte`,
                targetType: "stock",
                targetId: id,
                actorId: actor.id,
                actorName: actor.name,
                read: false,
                createdAt: nowLabel(),
              }
              : undefined;
          return {
            stockItems,
            priceBookItems,
            notifications: lowStockNotification
              ? [lowStockNotification, ...state.notifications].slice(0, 100)
              : state.notifications,
          };
        });
          const item = get().stockItems.find((entry) => entry.id === id);
          get().addAuditLog({
            action:
              patch.stock !== undefined || patch.quantity !== undefined ? "stock.quantity_changed" : "stock.item_updated",
            targetType: "stock",
            targetId: id,
            message: `${actor.name} a modifié la pièce ${item?.name ?? id}`,
          });
        },
      deleteStockItem: (id) => {
        if (!get().requirePermission("canManageStock", "Supprimer une pièce")) return;
        set((state) => {
          const stockItems = state.stockItems.filter((item) => item.id !== id);
          return { stockItems, selectedStockItemId: stockItems[0]?.id ?? "" };
        });
      },
      restockItem: (id, quantity = 5) =>
        {
          if (!get().requirePermission("canManageStock", "Réapprovisionner")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => ({
          stockItems: state.stockItems.map((item) =>
            item.id === id
              ? {
                ...item,
                quantity: item.quantity + clampQuantity(quantity),
                stock: item.stock + clampQuantity(quantity),
                ...updateActorFields(actor),
              }
              : item,
          ),
        }));
          const item = get().stockItems.find((entry) => entry.id === id);
          get().addAuditLog({
            action: "stock.quantity_changed",
            targetType: "stock",
            targetId: id,
            message: `${actor.name} a réapprovisionné ${item?.name ?? id}`,
            metadata: { quantity },
          });
        },
      importStockItems: (items) =>
        set((state) => {
          const byReference = new Map(state.stockItems.map((item) => [item.reference, item]));
          const stockItems = [...state.stockItems];
          for (const input of items) {
            const existing = byReference.get(input.reference ?? input.sku ?? "");
            if (existing) {
              const index = stockItems.findIndex((item) => item.id === existing.id);
              stockItems[index] = normalizeStockItem({
                ...existing,
                ...input,
                leadTime: input.leadTime || existing.leadTime,
              });
            } else {
              stockItems.unshift(
                normalizeStockItem({ id: uid("stock"), shopId, leadTime: input.leadTime || "2 à 3 jours", ...input }),
              );
            }
          }
          return { stockItems };
        }),
      sendMessage: (input) => {
        const log: MessageLog = {
          id: uid("message"),
          shopId,
          customerId: input.customerId,
          repairId: input.repairId,
          channel: input.channel,
          subject: input.subject,
          body: input.body,
          createdAt: nowLabel(),
        };
        set((state) => ({ messageLogs: [log, ...state.messageLogs] }));
      },
      updateWorkshopInfo: (patch) =>
        {
          if (!get().requirePermission("canEditSettings", "Modifier les paramètres")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => {
          const nextSettings: WorkshopSettings = {
            ...(state.workshopSettings ?? defaultWorkshopSettings),
            ...patch,
            updatedAt: nowLabel(),
          };
          return {
            workshopSettings: nextSettings,
            workshopInfo: asWorkshopInfo(nextSettings),
            updatedAt: nextSettings.updatedAt,
          };
        });
          get().addAuditLog({
            action: "settings.updated",
            targetType: "settings",
            targetId: shopId,
            message: `${actor.name} a modifié les paramètres de l'atelier`,
          });
        },
      saveWorkshopSettings: (settings) =>
        {
          if (!get().requirePermission("canEditSettings", "Enregistrer les paramètres")) return;
          const actor = get().currentUser ?? defaultCurrentUser;
          set((state) => {
          const now = nowLabel();
          const nextSettings: WorkshopSettings = {
            ...(state.workshopSettings ?? defaultWorkshopSettings),
            ...settings,
            configuredAt: state.configuredAt ?? now,
            updatedAt: now,
          };
          return {
            workshopSettings: nextSettings,
            workshopInfo: asWorkshopInfo(nextSettings),
            onboardingCompleted: true,
            configuredAt: nextSettings.configuredAt,
            updatedAt: nextSettings.updatedAt,
          };
        });
          const settingsKeys = Object.keys(settings);
          const onlyLogoChanged =
            settingsKeys.length > 0 && settingsKeys.every((key) => key === "logoUrl" || key === "showLogo");
          get().addAuditLog({
            action: onlyLogoChanged ? "logo.updated" : "settings.updated",
            targetType: "settings",
            targetId: shopId,
            message:
              onlyLogoChanged
                ? `${actor.name} a modifié le logo de l'atelier`
                : `${actor.name} a modifié les informations de l'atelier`,
          });
          get().addNotification({
            type: "info",
            title: "Paramètres modifiés",
            message: `${actor.name} a mis à jour les réglages atelier`,
            targetType: "settings",
            targetId: shopId,
          });
        },
      setOnboardingCompleted: (done) =>
        set((state) => ({
          onboardingCompleted: done,
          configuredAt: done ? (state.configuredAt ?? nowLabel()) : undefined,
          updatedAt: done ? nowLabel() : state.updatedAt,
        })),
      addDocument: (input) => {
        const id = uid("doc");
        const document = { id, shopId, createdAt: todayLabel(), ...input };
        set((state) => ({ documents: [document, ...state.documents], selectedDocumentId: id }));
        get().addAuditLog({
          action: "document.generated",
          targetType: "document",
          targetId: id,
          message: `${get().currentUser.name} a généré le document ${document.title}`,
        });
        return id;
      },
      deleteDocument: (id) =>
        set((state) => {
          const documents = state.documents.filter((document) => document.id !== id);
          return { documents, selectedDocumentId: documents[0]?.id ?? "" };
        }),
      loadPreloadedCatalog: async () => {
        // [DESACTIVER] Le catalogue global.json est pollué par des faux modèles (ex: "iPhone 11 Blanc").
        // On ne l'utilise plus comme base automatique pour garantir la propreté du catalogue.
        set({ isCatalogPreloaded: true });
        return;
      },
      addPriceBookItem: (input) => {
        const item = createPriceBookItem({ ...input, source: input.source ?? "manual" });
        set((state) => {
          const priceBookItems = [item, ...state.priceBookItems];
          const stockItems = syncPriceBookToStockItems(priceBookItems, state.stockItems);
          return { priceBookItems, stockItems };
        });
        return item.id;
      },
      updatePriceBookItem: (id, patch) =>
        set((state) => {
          const priceBookItems = state.priceBookItems.map((item) =>
            item.id === id ? updatePriceBookItem(item, patch) : item,
          );
          const stockItems = syncPriceBookToStockItems(priceBookItems, state.stockItems);
          return { priceBookItems, stockItems };
        }),
      deletePriceBookItem: (id) =>
        set((state) => ({
          priceBookItems: state.priceBookItems.filter((item) => item.id !== id),
        })),
      togglePriceBookItem: (id, isActive) =>
        set((state) => ({
          priceBookItems: state.priceBookItems.map((item) =>
            item.id === id ? { ...item, isActive, updatedAt: new Date().toISOString() } : item,
          ),
        })),
      // ── Sales ──────────────────────────────────────────────────────────
      addSale: (input) => {
        if (!get().requirePermission("canCreateSale", "Créer une vente")) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const ws = get().workshopSettings;
        const id = uid("sale");
        const number = docNumber(ws.salePrefix, ws.nextSaleNumber ?? 1, "VTE");
        const lines: SaleLine[] = input.lines.map((l, i) => ({
          ...l,
          id: `${id}_line_${i}`,
        }));
        const subtotal = lines.reduce((s, l) => s + l.total, 0);
        if (!lines.length || subtotal <= 0) return "";
        const customerId = input.customerId === "counter" ? counterCustomerId : input.customerId;
        const customerName = input.customerId === "counter" || input.customerName === "Client comptoir" ? "Client comptoir" : input.customerName;
        const taxAmount = 0;
        const sale: Sale = {
          id,
          shopId,
          number,
          customerId,
          customerName,
          repairId: input.repairId,
          status: input.status ?? "Brouillon",
          lines,
          subtotal,
          taxAmount,
          total: subtotal + taxAmount,
          createdAt: nowLabel(),
          createdByUserId: actor.id,
          createdByName: actor.name,
        };
        set((state) => ({
          customers: customerId === counterCustomerId ? ensureCounterCustomer(state.customers) : state.customers,
          sales: [sale, ...state.sales],
          selectedSaleId: id,
          workshopSettings: {
            ...state.workshopSettings,
            nextSaleNumber: (state.workshopSettings.nextSaleNumber ?? 1) + 1,
          },
          workshopInfo: asWorkshopInfo({
            ...state.workshopSettings,
            nextSaleNumber: (state.workshopSettings.nextSaleNumber ?? 1) + 1,
          } as WorkshopSettings),
        }));
        get().addAuditLog({
          action: "sale.created",
          targetType: "sale",
          targetId: id,
          message: `${actor.name} a créé la vente ${number}`,
        });
        return id;
      },
      paySale: (saleId, method) => {
        if (!get().requirePermission("canTakePayment", "Encaisser une vente")) return "";
        const state = get();
        const sale = state.sales.find((s) => s.id === saleId);
        if (!sale || (sale.status !== "Brouillon" && sale.status !== "Payée")) return sale?.paymentId ?? "";
        if (!sale.lines.length || sale.total <= 0) return "";
        if (sale.status === "Payée" && sale.paymentId) return sale.paymentId;

        // Check stock
        for (const line of sale.lines) {
          const item = state.stockItems.find((si) => si.id === line.stockItemId);
          if (!item || item.stock < line.quantity) return "";
        }

        const actor = state.currentUser ?? defaultCurrentUser;
        const timestamp = nowLabel();
        const ws = state.workshopSettings;

        // Decrement stock
        const updatedStock = state.stockItems.map((si) => {
          const line = sale.lines.find((l) => l.stockItemId === si.id);
          if (!line) return si;
          return { ...si, quantity: Math.max(0, si.quantity - line.quantity), stock: Math.max(0, si.stock - line.quantity) };
        });

        // Create payment
        const paymentId = uid("payment");
        const paymentNumber = docNumber(ws.receiptPrefix, ws.nextReceiptNumber ?? 1, "REC");
        const payment: Payment = {
          id: paymentId,
          shopId,
          saleId,
          customerId: sale.customerId,
          amount: sale.total,
          method,
          mode: method,
          status: "Payé",
          date: timestamp,
          reference: `Vente liée ${sale.number}`,
          paymentNumber,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: actor.id,
          createdByName: actor.name,
          updatedBy: actor.id,
          updatedByName: actor.name,
        };

        // Create document
        const docId = `doc_sale_${saleId}`;
        const doc: BeharDocument = {
          id: docId,
          shopId,
          type: "sale-invoice" as DocumentType,
          title: `Facture de vente - ${sale.number}`,
          customerId: sale.customerId,
          saleId,
          paymentId,
          createdAt: timestamp,
        };

        // Update sale
        const updatedSale: Sale = {
          ...sale,
          status: "Payée",
          paymentMethod: method,
          paymentId,
          documentId: docId,
          paidAt: timestamp,
        };

        set((s) => ({
          sales: s.sales.map((x) => (x.id === saleId ? updatedSale : x)),
          stockItems: updatedStock,
          payments: [payment, ...s.payments],
          documents: [doc, ...s.documents],
          customers: deriveCustomers(
            sale.customerId === counterCustomerId ? ensureCounterCustomer(s.customers) : s.customers,
            s.repairs,
            [payment, ...s.payments],
          ),
          selectedSaleId: saleId,
          workshopSettings: {
            ...s.workshopSettings,
            nextReceiptNumber: (s.workshopSettings.nextReceiptNumber ?? 1) + 1,
          },
          workshopInfo: asWorkshopInfo({
            ...s.workshopSettings,
            nextReceiptNumber: (s.workshopSettings.nextReceiptNumber ?? 1) + 1,
          } as WorkshopSettings),
        }));

        get().addAuditLog({
          action: "sale.paid",
          targetType: "sale",
          targetId: saleId,
          message: `${actor.name} a encaissé la vente ${sale.number} (${formatEuro(sale.total)})`,
          metadata: { amount: sale.total, method, paymentId },
        });
        get().addNotification({
          type: "success",
          title: "Vente encaissée",
          message: `Vente ${sale.number} encaissée — ${formatEuro(sale.total)}`,
          targetType: "sale",
          targetId: saleId,
        });

        return paymentId;
      },
      cancelSale: (saleId) => {
        if (!get().requirePermission("canCancelSale", "Annuler une vente")) return;
        const state = get();
        const sale = state.sales.find((s) => s.id === saleId);
        if (!sale || sale.status === "Annulée") return;

        // If already paid, restore stock
        let updatedStock = state.stockItems;
        if (sale.status === "Payée") {
          updatedStock = state.stockItems.map((si) => {
            const line = sale.lines.find((l) => l.stockItemId === si.id);
            if (!line) return si;
            return { ...si, quantity: si.quantity + line.quantity };
          });
        }

        set((s) => ({
          sales: s.sales.map((x) =>
            x.id === saleId ? { ...x, status: "Annulée" as SaleStatus } : x,
          ),
          stockItems: updatedStock,
        }));

        const actor = state.currentUser ?? defaultCurrentUser;
        get().addAuditLog({
          action: "sale.cancelled",
          targetType: "sale",
          targetId: saleId,
          message: `${actor.name} a annulé la vente ${sale.number}`,
        });
      },
      deleteSale: (saleId) => {
        const state = get();
        const sale = state.sales.find((s) => s.id === saleId);
        if (!sale) return;
        if (sale.status === "Payée") return; // Cannot delete paid sale
        set((s) => ({
          sales: s.sales.filter((x) => x.id !== saleId),
          selectedSaleId: s.sales.filter((x) => x.id !== saleId)[0]?.id ?? "",
        }));
      },
      resetDemo: () => set(createSeed()),
    }),
    {
      name: "behar-tech-local-demo-v3",
      version: 1,
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { priceBookItems, _hasHydrated, setHasHydrated, ...rest } = state;
        const manualItems = priceBookItems.filter((item) => item.source === "manual");
        return { ...rest, priceBookItems: manualItems };
      },
      migrate: (persistedState) => normalizePersistedState(persistedState) as any,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePersistedState(persistedState),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("[behar-store] local rehydration failed", error);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const getQuoteTotal = quoteTotal;
export const getInvoiceTotal = invoiceTotal;

/**
 * Calcule le résumé TVA d'un document (Devis ou Facture)
 */
export function getVatSummary(lines: QuoteLine[], settings: WorkshopInfo): VatSummary {
  const ttc = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  if (!settings.vatApplicable) {
    return { ht: ttc, tva: 0, ttc, rate: 0 };
  }
  const rate = 0.20; // Taux par défaut 20%
  const ht = ttc / (1 + rate);
  const tva = ttc - ht;
  return { ht, tva, ttc, rate };
}
