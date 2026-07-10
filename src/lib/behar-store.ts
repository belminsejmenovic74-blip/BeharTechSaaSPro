"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type DeviceCategory, deviceCatalog } from "@/data/deviceCatalog";
import { repairReadyStatusLabel } from "@/lib/repair-status";
import {
  createPriceBookItem,
  normalizePriceBookItem,
  type PriceBookDeviceType,
  type PriceBookInput,
  type PriceBookItem,
  priceBookDuplicateKey,
  seedPriceBookExamples,
  updatePriceBookItem,
} from "@/lib/price-book";
import { appointments as appointmentMocks } from "@/mock/appointments";
import { customers as customerMocks } from "@/mock/customers";
import { invoices as invoiceMocks } from "@/mock/invoices";
import { transactions as paymentMocks } from "@/mock/payments";
import { quote as quoteMock } from "@/mock/quotes";
import { repairKanbanColumns } from "@/mock/repairs";
import {
  formatMoney,
  createBillingProfile,
  getWorkshopCountryConfig,
  isBillingProfileComplete,
  normalizeWorkshopCountry,
  parseMoney,
  type BillingProfiles,
  type WorkshopCountry,
  type WorkshopCurrency,
  type WorkshopLocale,
} from "@/lib/workshop-country";
import { ensureTrackingCode, getCustomerTrackingPath, getTrackingCode } from "@/lib/customer-tracking";
import { publishDomainEvent } from "@/lib/domain-events";
import { checkRepairQuota, checkSmsQuota, countSmsThisMonth, countThisMonth } from "@/lib/plan-limits";
import { normalizePartReference, stockReferenceKeys, stockReferenceMatches } from "@/lib/stock-reference";
import { pickStockLotForQuantity } from "@/lib/stock-lots";

export type RepairStatus =
  | "Reçu"
  | "Diagnostic"
  | "En attente"
  | "Devis envoyé"
  | "Devis accepté"
  | "En réparation"
  | "Test final"
  | "Prêt"
  | "Rendu"
  | "Irréparable"
  | "SAV"
  | "Clôturé"
  | "Annulé";
export type InvoiceStatus = "Brouillon" | "Envoyée" | "Payée" | "Annulée";
export type QuoteStatus = "Brouillon" | "Envoyé" | "Accepté" | "Refusé" | "Facturé";
export type PaymentStatus = "Payé" | "Annulé" | "Remboursé";
export type PaymentMethod =
  | "Espèces"
  | "Carte bancaire"
  | "SumUp"
  | "Stripe"
  | "Virement"
  | "Carte bancaire via SumUp"
  | "Carte bancaire via Stripe Terminal"
  | "Lien de paiement Stripe"
  | "Virement bancaire"
  | "Chèque"
  | "Revolut"
  | "PayPal"
  | "TPE externe"
  | "Espèces hors Behar Tech"
  | "TWINT"
  | "Carte externe"
  | "Virement"
  | "Lien externe"
  | "Autre"
  | "Mixte"
  | "Carte"
  | "En ligne";
export type SettlementStatus = "Non réglé" | "Partiellement réglé" | "Réglé" | "Offert / Garantie / SAV";
export type AppointmentStatus =
  | "Planifié"
  | "En attente"
  | "Confirmé"
  | "Arrivé"
  | "Réparation créée"
  | "Annulé"
  | "Non venu";
export type DocumentType =
  | "intake"
  | "quote"
  | "invoice"
  | "payment"
  | "internal"
  | "summary"
  | "sale-receipt"
  | "sale-invoice"
  | "diagnostic_report";
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
  internalCode?: string;
  categoryName?: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  confirmed?: boolean;
  /** true dès que le stock a été décrémenté pour cette pièce (à l'ajout). Évite le double décrément. */
  stockDecremented?: boolean;
  margin?: number;
  currency?: WorkshopCurrency;
  supplier?: string;
  supplierId?: string;
  purchaseId?: string;
  supplierInvoiceId?: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceLineId?: string;
  modelName?: string;
  modelId?: string;
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

export type RepairPriority = "Urgent" | "Haute" | "Normale" | "Basse";
export type RepairSubStatus =
  | "En attente pièce"
  | "Pièce commandée"
  | "Pièce reçue"
  | "En attente validation client"
  | "En attente devis"
  | "Devis envoyé"
  | "Devis accepté"
  | "Devis refusé"
  | "Client injoignable"
  | "Appareil verrouillé"
  | "Diagnostic impossible"
  | "Pièce en attente"
  | "Irréparable"
  | "Annulé"
  | "SAV / retour";
export type RepairTestResult =
  | "OK"
  | "Défaut constaté"
  | "Non applicable"
  | "Non testé"
  | "KO"
  | "Non testable"
  | "Test repoussé";
export type RepairChecklistItem = {
  id: string;
  label: string;
  result: RepairTestResult;
  comment?: string;
};
export type RepairFinalTestStatus =
  | "Téléphone prêt"
  | "Test final validé"
  | "Test non applicable"
  | "Test impossible"
  | "Test refusé par le client"
  | "Pièce en attente"
  | "Irréparable";
export type RepairEvidencePhoto = {
  id: string;
  category: "Avant / réception" | "Diagnostic" | "Réparation" | "Après / contrôle final" | "SAV";
  stage: string;
  type: "État d'entrée" | "Diagnostic" | "Intervention" | "Contrôle final" | "Retour SAV";
  label: string;
  comment?: string;
  createdAt: string;
  createdBy: string;
  /** Source affichée : data URL base64 (offline) OU URL publique Supabase Storage une fois uploadée. */
  dataUrl?: string;
  /** Chemin dans le bucket Supabase Storage `repair-photos`, si l'upload cloud a réussi. */
  storagePath?: string;
};
export type RepairIntervention = {
  estimatedMinutes?: number;
  manualMinutes?: number;
  timerStartedAt?: string;
  timerPausedAt?: string;
  timerFinishedAt?: string;
  timerSeconds?: number;
  timerRunning?: boolean;
  currentStep?: string;
  progress?: number;
  tools?: string[];
  notes?: string;
  suspendedReason?: string;
};
export type RepairFinalTest = {
  items: RepairChecklistItem[];
  status?: RepairFinalTestStatus;
  comment?: string;
  validatedAt?: string;
  validatedBy?: string;
  testImpossibleReason?: string;
  testImpossibleAt?: string;
  testImpossibleBy?: string;
  outcomeAt?: string;
  outcomeBy?: string;
};
export type RepairSav = {
  savNumber: string;
  originalRepairId: string;
  originalRepairNumber: string;
  reason: string;
  decision?: "Pris en garantie" | "Hors garantie";
  status: "En cours" | "En attente pièce" | "En attente client" | "Devis envoyé" | "Validé" | "Hors garantie" | "Clos";
  warrantyRemaining?: string;
  nextAction?: string;
  createdAt: string;
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
  accessMethod?:
    | "Aucun"
    | "Code PIN"
    | "Mot de passe"
    | "Schéma"
    | "Empreinte / biométrie"
    | "Non communiqué"
    | "Non renseigné";
  accessCode?: string;
  accessNote?: string;
  patternData?: {
    points: number[];
    label?: string;
  };
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
  signedBy?: string;
  signatureDataUrl?: string;
  signatureSignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Repair = {
  id: string;
  billingCountry: WorkshopCountry;
  market?: WorkshopCountry;
  currency?: WorkshopCurrency;
  currencySymbol?: string;
  locale: WorkshopLocale;
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
  deviceColor?: string;
  deviceCapacity?: string;
  plannedPaymentMethod?: PaymentMethod;
  model: string;
  issue: string;
  status: RepairStatus;
  subStatus?: RepairSubStatus;
  priority?: RepairPriority;
  blockReason?: string;
  amount: number;
  laborPrice?: number;
  total?: number;
  notes: string;
  droppedAt: string;
  estimatedDoneAt: string;
  technician: string;
  imei: string;
  parts: RepairPart[];
  counterPrestations?: Array<{ label: string; prixClient: number }>;
  counterTasks?: Array<{ id: string; label: string; fait: boolean }>;
  counterPieces?: Array<{ id: string; nom: string; prix: number }>;
  counterNotifiedAt?: string;
  repairSaleLines?: RepairSaleLine[];
  intakeCondition?: RepairIntakeCondition;
  publicAccess?: PublicAccess;
  messages?: RepairMessage[];
  history: string[];
  paymentStatus?: "À régler" | "Réglée" | "Partiellement réglée" | "Annulée";
  paymentMethodNote?: string;
  paymentCustomMethod?: string;
  paymentAmount?: number;
  paymentPaidAt?: string;
  paymentReference?: string;
  paymentRecordedBy?: string;
  paymentRecordedOutsideBeharTechPro?: boolean;
  paymentNote?: string;
  settlementReason?: string;
  closedAt?: string;
  diagnosticNotes?: string;
  diagnosticCause?: string;
  repairability?: "Oui" | "Non" | "Partiellement";
  diagnosticDelay?: string;
  diagnosticWarranty?: string;
  diagnosticRisks?: string;
  diagnosisChecklist?: RepairChecklistItem[];
  recommendedIntervention?: string;
  repairNotes?: string;
  workshopPhotos?: RepairEvidencePhoto[];
  intervention?: RepairIntervention;
  finalTest?: RepairFinalTest;
  originalRepairId?: string;
  sav?: RepairSav;
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

export const appointmentStatuses: AppointmentStatus[] = [
  "Planifié",
  "En attente",
  "Confirmé",
  "Arrivé",
  "Réparation créée",
  "Annulé",
  "Non venu",
];

export type QuoteLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type QuoteService = {
  id: string;
  label: string;
  priceTtc: number;
  quantity: number;
};

export type QuoteAccessory = {
  id: string;
  label: string;
  priceTtc?: number;
  included?: boolean;
};

export type QuoteDevice = {
  id: string;
  type: DeviceType | "Autre";
  brand: string;
  model: string;
  services: QuoteService[];
  accessories: QuoteAccessory[];
  subtotalTtc: number;
};

export type LegalDocumentSnapshot = {
  version: number;
  generatedAt: string;
  generatedBy?: string;
  documentType: "quote" | "invoice" | "intake" | "final_report" | "sale_receipt";
  documentNumber: string;
  status: string;
  currency: WorkshopCurrency;
  country: WorkshopCountry;
  locale: WorkshopLocale;
  vat: {
    applicable?: boolean;
    rate?: number;
    regime?: WorkshopTaxRegime;
    mention?: string;
  };
  workshop: {
    brand?: string;
    name: string;
    commercialName?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country: WorkshopCountry;
    email?: string;
    phone?: string;
    website?: string;
    siret?: string;
    tvaNumber?: string;
    swissUid?: string;
    swissVatNumber?: string;
  };
  client: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  device?: {
    type?: DeviceType;
    brand?: string;
    model?: string;
    imei?: string;
  };
  repair?: {
    id: string;
    number: string;
    status: RepairStatus;
    issue?: string;
    droppedAt?: string;
  };
  lines: QuoteLine[];
  totals: {
    ht: number;
    tva: number;
    ttc: number;
  };
  legalMentions?: string;
  terms?: string;
  footer?: string;
  signature?: {
    name?: string;
    signedAt?: string;
    dataUrl?: string;
  };
};

export type Quote = {
  id: string;
  billingCountry: WorkshopCountry;
  currency?: WorkshopCurrency;
  locale: WorkshopLocale;
  shopId: string;
  number: string;
  customerId: string;
  clientSnapshot?: {
    name: string;
    phone?: string;
    email?: string;
  };
  repairId?: string;
  invoiceId?: string;
  deviceType?: DeviceType;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  deviceModel?: string;
  device?: string;
  imei?: string;
  issueType?: string;
  issue?: string;
  selectedPriceSnapshot?: PriceSnapshot;
  status: QuoteStatus;
  date: string;
  expiryDate: string;
  devices?: QuoteDevice[];
  lines: QuoteLine[];
  notes?: string;
  totalAmount: number;
  totalTtc?: number;
  sourceType?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  lockedAt?: string;
  lockedReason?: string;
  snapshot?: LegalDocumentSnapshot;
  previousVersionId?: string;
};

export type Invoice = {
  id: string;
  billingCountry: WorkshopCountry;
  currency?: WorkshopCurrency;
  locale: WorkshopLocale;
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
  version?: number;
  lockedAt?: string;
  lockedReason?: string;
  snapshot?: LegalDocumentSnapshot;
  previousVersionId?: string;
};

export type Payment = {
  id: string;
  billingCountry: WorkshopCountry;
  currency?: WorkshopCurrency;
  locale: WorkshopLocale;
  shopId: string;
  invoiceId?: string;
  saleId?: string;
  customerId: string;
  repairId?: string;
  quoteId?: string;
  paymentNumber: string;
  reference: string;
  externalReference?: string;
  method: PaymentMethod;
  customMethod?: string;
  mode: string;
  status: PaymentStatus;
  amount: number;
  date: string;
  note?: string;
  twintReference?: string;
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
  repairNumber?: string;
  appointmentNumber?: string;
  clientMode?: "counter" | "new" | "existing";
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  deviceType?: DeviceType;
  deviceBrand?: string;
  deviceModel?: string;
  imei?: string;
  serialNumber?: string;
  issueDescription?: string;
  interventionLabel?: string;
  customerPrice?: number;
  estimatedTotal?: number;
  priceStatus?: "confirmed" | "to_confirm" | "diagnostic";
  priceSnapshot?: PriceSnapshot;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentReason?: "dropoff" | "diagnosis" | "repair" | "pickup" | "customer_return" | "other";
  convertedToRepairAt?: string;
  createdAt?: string;
  updatedAt?: string;
  device: string;
  issue: string;
  date: string;
  time: string;
  duration: string;
  channel: string;
  source: string;
  technician: string;
  notes: string;
  status: AppointmentStatus;
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
  internalCode?: string;
  rawName?: string;
  displayName?: string;
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
  quality?: string;
  supplierBrand?: string;
  ean?: string;
  supplierWarranty?: string;
  purchasePrice: number;
  averagePurchasePrice?: number;
  lastPurchasePrice?: number;
  salePrice: number;
  quantity: number;
  stock: number;
  threshold: number;
  supplier: string;
  primarySupplierId?: string;
  primarySupplier?: string;
  originPurchaseId?: string;
  originSupplierInvoiceId?: string;
  originSupplierInvoiceNumber?: string;
  originSupplierInvoiceLineId?: string;
  leadTime: string;
  itemType: StockItemType;
  repairEnabled: boolean;
  counterSaleEnabled: boolean;
  active: boolean;
  /** §4 — classification produit du stock élargi (pièces, accessoires, consommables…). */
  productCategory: StockProductCategory;
  /** §4 — article proposé dans la vente comptoir directe. */
  counterVisible: boolean;
  createdAt: string;
  updatedAt: string;
  priceBookItemId?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  /** Dossier de reconditionnement source quand l'article est un appareil remis en vente. */
  reconditioningFileId?: string;
};

export type StockMovementType =
  | "supplier_purchase_received"
  | "manual_adjustment"
  | "repair_part_used"
  | "reconditioning_part_used"
  | "counter_sale_sold"
  | "reconditioned_device_sold"
  | "reservation_created"
  | "reservation_released"
  | "return_to_supplier"
  | "stock_transfer_out"
  | "stock_transfer_in"
  | "correction";

export type StockMovementSourceModule =
  | "stock"
  | "achats"
  | "atelier_reparation"
  | "reconditionnement"
  | "vente_comptoir";

export type StockMovement = {
  id: string;
  organizationId?: string;
  shopId: string;
  stockItemId: string;
  partReference?: string;
  internalCode?: string;
  movementType: StockMovementType;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost?: number;
  totalCost?: number;
  reason?: string;
  sourceModule: StockMovementSourceModule;
  sourceId?: string;
  linkedRepairId?: string;
  linkedReconditioningDeviceId?: string;
  linkedSaleId?: string;
  linkedPurchaseId?: string;
  linkedSupplierInvoiceId?: string;
  linkedSupplierInvoiceLineId?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

export type StockItemType = "part" | "accessory" | "product";

/** §4 — catégories produit du stock (au-delà des seules pièces de réparation). */
export type StockProductCategory =
  | "Pièces détachées"
  | "Accessoires"
  | "Consommables"
  | "Services / main d'œuvre"
  | "Autre";

export const STOCK_PRODUCT_CATEGORIES: StockProductCategory[] = [
  "Pièces détachées",
  "Accessoires",
  "Consommables",
  "Services / main d'œuvre",
  "Autre",
];

export type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: "Gérant" | "Technicien" | "Comptoir" | "Vente" | "Administratif" | "Autre";
  email?: string;
  phone?: string;
};

export type { WorkshopCountry, WorkshopCurrency } from "@/lib/workshop-country";
export type WorkshopTaxRegime = "not_subject_to_vat" | "vat_subject";

export type WorkshopInfo = {
  brand: string;
  name: string;
  address: string;
  postalCode?: string;
  city?: string;
  postalCity: string;
  country: WorkshopCountry;
  defaultMarket?: WorkshopCountry;
  allowedMarkets?: WorkshopCountry[];
  currency: WorkshopCurrency;
  taxRegime: WorkshopTaxRegime;
  defaultPhonePrefix: "+33" | "+41";
  siret: string;
  email: string;
  phone: string;
  website?: string;
  tvaNumber?: string;
  swissUid?: string;
  swissVatNumber?: string;
  swissCanton?: string;
  twintEnabled?: boolean;
  twintPaymentLink?: string;
  twintQrCode?: string;
  vatApplicable?: boolean;
  vatRate?: number;
  isMicroEnterprise?: boolean;
  tvaMention?: string;
  quoteTerms?: string;
  invoiceTerms?: string;
  intakeTerms?: string;
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
  billingProfiles?: BillingProfiles;
  counterPrintFormat?: "A4" | "A6" | "80mm" | "58mm";
  counterQrFormat?: "A6" | "80mm" | "58mm";
  counterDefaultAction?: "none" | "download" | "print_doc" | "print_qr";
  counterShowCopyLink?: boolean;
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
  /** Dossier reconditionnement vendu via cette ligne, si connu. */
  reconditioningFileId?: string;
};

export type Sale = {
  id: string;
  billingCountry: WorkshopCountry;
  currency?: WorkshopCurrency;
  locale: WorkshopLocale;
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

/**
 * §Achats — registre unifié des achats (entrées).
 * Source de vérité centrale consultée par l'onglet Achats. Alimenté par :
 * - réapprovisionnement / création de pièces (stock),
 * - rachat client direct (module Conditionné),
 * - acquisition d'un téléphone reconditionné publié en stock.
 * Reste local-first : ce n'est pas un flux de trésorerie, juste la traçabilité des entrées.
 */
export type PurchaseKind = "piece" | "telephone" | "accessoire" | "autre";
export type PurchaseSource =
  | "Réapprovisionnement"
  | "Création pièce"
  | "Rachat client"
  | "Reconditionnement"
  | "Reprise"
  | "Facture fournisseur"
  | "Analyse IA"
  | "Manuel";
export type Purchase = {
  id: string;
  shopId: string;
  number: string;
  kind: PurchaseKind;
  source: PurchaseSource;
  label: string;
  reference?: string;
  internalCode?: string;
  category?: string;
  compatibleModel?: string;
  quality?: string;
  supplierId?: string;
  supplier?: string;
  invoiceNumber?: string;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  taxAmount?: number;
  totalExcludingTax?: number;
  totalIncludingTax?: number;
  total: number;
  currency?: WorkshopCurrency;
  date: string;
  /** Article de stock créé / réapprovisionné par cet achat. */
  stockItemId?: string;
  /** Facture fournisseur source, si l'achat provient d'un import ou d'une saisie facture. */
  supplierInvoiceId?: string;
  /** Ligne exacte de facture fournisseur source. */
  supplierInvoiceLineId?: string;
  /** Document/fichier original associé à la facture fournisseur. */
  documentId?: string;
  originalFileName?: string;
  originalFileUrl?: string;
  /** Dossier réparation lié (le cas échéant). */
  repairId?: string;
  /** Dossier de reconditionnement lié. */
  reconditioningFileId?: string;
  /** Fiche de reprise (module Conditionné) liée. */
  conditionneRecordId?: string;
  note?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
};

export type Supplier = {
  id: string;
  shopId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vatNumber?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
};

export type SupplierPurchaseStatus = "brouillon" | "reçu" | "partiel" | "annulé";
export type SupplierPurchaseSource = "manuel" | "textract";

export type SupplierInvoice = {
  id: string;
  shopId: string;
  supplierId?: string;
  supplierName: string;
  purchaseDate: string;
  invoiceNumber: string;
  originalFileName?: string;
  originalFileUrl?: string;
  originalDocumentId?: string;
  totalExcludingTax: number;
  taxAmount: number;
  totalIncludingTax: number;
  status: SupplierPurchaseStatus;
  source: SupplierPurchaseSource;
  textractJson?: Record<string, unknown>;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
};

export type SupplierInvoiceLine = {
  id: string;
  shopId: string;
  supplierInvoiceId: string;
  purchaseId?: string;
  stockItemId?: string;
  rawName?: string;
  displayName?: string;
  itemName: string;
  reference?: string;
  sku?: string;
  internalCode?: string;
  category?: string;
  compatibleModel?: string;
  quality?: string;
  supplierBrand?: string;
  ean?: string;
  supplierWarranty?: string;
  quantityPurchased: number;
  unitPurchasePriceExclTax: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotalExclTax: number;
  lineTotalInclTax?: number;
  supplierId?: string;
  supplierName: string;
  invoiceId: string;
  createStockItem?: boolean;
  createdAt: string;
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
  /** URL publique Supabase Storage du PDF, si généré + uploadé (téléchargeable depuis n'importe quel appareil). */
  fileUrl?: string;
  /** Chemin dans le bucket Supabase Storage `repair-documents`. */
  storagePath?: string;
  version?: number;
  lockedAt?: string;
  lockedReason?: string;
  snapshot?: LegalDocumentSnapshot;
  previousVersionId?: string;
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

// Lien public sécurisé + QR, partagé par réparation / devis / facture / vente.
export type PublicAccess = {
  token: string;
  url: string;
  createdAt: string;
  active: boolean;
};

// Message lié à un dossier réparation : interne (atelier) ou public (client).
export type RepairMessage = {
  id: string;
  repairId: string;
  authorType: "staff" | "client" | "system";
  authorName: string;
  visibility: "internal" | "client";
  body: string;
  createdAt: string;
  readByClient: boolean;
  readByStaff: boolean;
};

export type LicenseInfo = {
  licenseActivated: boolean;
  licenseKey?: string;
  licensePlan?: string;
  licenseActivatedAt?: string;
  lastLicenseKey?: string;
};

export type StoreState = {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  cloudSync?: {
    workshopId?: string;
    lastSyncedAt?: string;
    localUpdatedAt?: string;
    stateVersion?: number;
    lastSyncedStateVersion?: number;
    lastDeviceId?: string;
    /** Appareils connus de l'atelier (limite selon l'offre). */
    devices?: { id: string; label?: string; lastSeenAt: string }[];
  };
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
  stockMovements: StockMovement[];
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
  purchases: Purchase[];
  suppliers: Supplier[];
  supplierInvoices: SupplierInvoice[];
  supplierInvoiceLines: SupplierInvoiceLine[];
  documents: BeharDocument[];
  messageLogs: MessageLog[];
  priceBookItems: PriceBookItem[];
  isCatalogPreloaded: boolean;
  teamMembers: TeamMember[];
  currentUser: CurrentUser;
  users: CurrentUser[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  /** Messages d'accueil affichés sur l'écran de connexion PIN, indexés par rôle. */
  roleGreetings: Record<UserRole, string[]>;
  updateRoleGreetings: (role: UserRole, messages: string[]) => void;
  resetRoleGreetings: (role?: UserRole) => void;

  // Local roles / audit
  sessionUserId?: string;
  setCurrentUser: (id: string) => void;
  loginWithPin: (pin: string) => { ok: boolean; reason?: "invalid" | "disabled"; user?: CurrentUser };
  loginWithUserPin: (
    userId: string,
    pin: string,
  ) => { ok: boolean; reason?: "invalid" | "disabled"; user?: CurrentUser };
  logout: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
  requirePermission: (permission: PermissionKey, actionName?: string) => boolean;
  addUser: (input: {
    name: string;
    role: UserRole;
    pin: string;
    permissionOverrides?: Partial<Record<PermissionKey, boolean>>;
  }) => string;
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
  lastLicenseKey?: string;
  activateLicense: (key: string) => boolean;
  deactivateLicense: () => void;

  // Team
  addTeamMember: (member: Omit<TeamMember, "id">) => void;
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  addDeviceBrand: (input: { name: string; deviceType: DeviceType }) => string;
  updateDeviceBrand: (id: string, patch: Partial<Pick<DeviceBrand, "name" | "deviceTypes">>) => void;
  addDeviceModel: (input: { brandId: string; name: string; deviceType: DeviceType; aliases?: string[] }) => string;
  updateDeviceModel: (
    id: string,
    patch: Partial<Pick<DeviceModel, "name" | "aliases" | "deviceType" | "brandId">>,
  ) => void;
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
  // Messagerie dossier (interne / public) + accès public par token.
  addRepairMessage: (
    repairId: string,
    input: {
      body: string;
      visibility: RepairMessage["visibility"];
      authorType?: RepairMessage["authorType"];
      authorName?: string;
    },
  ) => string;
  markRepairMessagesRead: (repairId: string, side: "client" | "staff") => void;
  findRepairByPublicToken: (token: string) => Repair | undefined;
  ensureRepairPublicAccess: (repairId: string) => PublicAccess | undefined;
  // Réponse client publique à un devis (sans login, sans permission staff).
  clientRespondToQuote: (quoteId: string, decision: "Accepté" | "Refusé") => void;
  changeRepairStatus: (id: string, status: RepairStatus) => void;
  appendRepairHistory: (id: string, event: string, metadata?: Record<string, unknown>) => void;
  validateRepairFinalTest: (id: string, items: RepairChecklistItem[], comment?: string) => void;
  markRepairTestImpossible: (id: string, reason: string) => void;
  setRepairWorkshopOutcome: (id: string, outcome: RepairFinalTestStatus, note?: string) => void;
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
    customMethod?: string;
    status: PaymentStatus;
    date: string;
    reference: string;
    note?: string;
    twintReference?: string;
  }) => string;
  markRepairAsPaid: (repairId: string, method?: PaymentMethod, note?: string) => string;
  recordRepairSettlement: (
    repairId: string,
    input: {
      status: SettlementStatus;
      amount: number;
      date: string;
      method: PaymentMethod;
      customMethod?: string;
      externalReference?: string;
      note?: string;
      confirmExternal: boolean;
    },
  ) => string;
  closeDossierWithSettlement: (
    repairId: string,
    input: {
      status: SettlementStatus;
      amount: number;
      date: string;
      method: PaymentMethod;
      customMethod?: string;
      externalReference?: string;
      note?: string;
      confirmExternal: boolean;
    },
  ) => boolean;
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;
  addAppointment: (input: AppointmentInput) => string;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  deleteAppointment: (id: string, deleteLinkedRepair?: boolean) => void;
  createRepairFromAppointment: (appointmentId: string) => string;
  addStockItem: (input: StockInput) => string;
  updateStockItem: (id: string, patch: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;
  resolveStockItemByReference: (reference: string) => StockItem | undefined;
  confirmPartUsage: (repairId: string, stockItemId: string) => boolean;
  restockItem: (id: string, quantity: number) => void;
  /** Ajuste la quantité d'un article (delta négatif = consommation). Utilisé par le reconditionnement. */
  adjustStock: (id: string, delta: number, reason?: string) => void;
  createStockMovement: (input: {
    stockItemId: string;
    partReference?: string;
    internalCode?: string;
    movementType: StockMovementType;
    quantityDelta: number;
    quantityBefore?: number;
    quantityAfter?: number;
    unitCost?: number;
    totalCost?: number;
    reason?: string;
    sourceModule: StockMovementSourceModule;
    sourceId?: string;
    linkedRepairId?: string;
    linkedReconditioningDeviceId?: string;
    linkedSaleId?: string;
    linkedPurchaseId?: string;
    linkedSupplierInvoiceId?: string;
    linkedSupplierInvoiceLineId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
  }) => string;
  importStockItems: (items: StockInput[]) => void;
  // Achats — registre unifié des entrées (pièces + téléphones).
  upsertSupplier: (input: SupplierInput) => string;
  commitSupplierInvoice: (input: SupplierInvoiceCommitInput) => string;
  addPurchase: (input: PurchaseInput) => string;
  deletePurchase: (id: string) => void;
  sendMessage: (input: MessageInput) => void;
  updateWorkshopInfo: (patch: Partial<WorkshopInfo>) => void;
  saveWorkshopSettings: (settings: Partial<WorkshopSettings>) => void;
  setOnboardingCompleted: (done: boolean) => void;
  addDocument: (input: Omit<BeharDocument, "id" | "shopId" | "createdAt">) => string;
  updateDocument: (id: string, patch: Partial<BeharDocument>) => void;
  deleteDocument: (id: string) => void;
  addSale: (input: {
    customerId: string;
    customerName: string;
    lines: Omit<SaleLine, "id">[];
    repairId?: string;
    billingCountry?: WorkshopCountry;
    status?: SaleStatus;
  }) => string;
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
      | "billingCountry"
      | "currency"
      | "locale"
      | "model"
      | "imei"
      | "quoteId"
      | "quoteIds"
      | "estimatedDoneAt"
      | "appointmentId"
      | "deviceType"
      | "brandId"
      | "brandName"
      | "modelId"
      | "deviceModel"
      | "deviceColor"
      | "deviceCapacity"
      | "plannedPaymentMethod"
      | "issueType"
      | "laborPrice"
      | "total"
      | "selectedPriceSnapshot"
      | "history"
      | "parts"
      | "counterPrestations"
      | "counterTasks"
      | "counterPieces"
      | "counterNotifiedAt"
      | "repairSaleLines"
      | "intakeCondition"
      | "subStatus"
      | "priority"
      | "blockReason"
      | "diagnosticNotes"
      | "diagnosticCause"
      | "repairability"
      | "diagnosticDelay"
      | "diagnosticWarranty"
      | "diagnosticRisks"
      | "diagnosisChecklist"
      | "recommendedIntervention"
      | "repairNotes"
      | "workshopPhotos"
      | "intervention"
      | "finalTest"
      | "originalRepairId"
      | "sav"
    >
  >;
type QuoteInput = Pick<Quote, "customerId"> &
  Partial<
    Pick<
      Quote,
      | "billingCountry"
      | "currency"
      | "locale"
      | "repairId"
      | "notes"
      | "status"
      | "deviceType"
      | "brandId"
      | "brandName"
      | "modelId"
      | "deviceModel"
      | "device"
      | "imei"
      | "issueType"
      | "issue"
      | "selectedPriceSnapshot"
      | "clientSnapshot"
      | "devices"
    >
  > & { lines?: any[] };
type InvoiceInput = Pick<Invoice, "customerId"> &
  Partial<
    Pick<
      Invoice,
      | "billingCountry"
      | "currency"
      | "locale"
      | "repairId"
      | "quoteId"
      | "status"
      | "sourceType"
      | "sourceNumber"
      | "paymentMethod"
    >
  > & {
    lines?: any[];
  };
type AppointmentInput = Pick<Appointment, "customerId" | "device" | "issue" | "date" | "time"> &
  Partial<
    Pick<
      Appointment,
      | "repairId"
      | "repairNumber"
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
      | "appointmentNumber"
      | "clientMode"
      | "clientName"
      | "clientPhone"
      | "clientEmail"
      | "deviceType"
      | "deviceBrand"
      | "deviceModel"
      | "imei"
      | "serialNumber"
      | "issueDescription"
      | "interventionLabel"
      | "customerPrice"
      | "estimatedTotal"
      | "priceStatus"
      | "priceSnapshot"
      | "appointmentDate"
      | "appointmentTime"
      | "appointmentReason"
      | "convertedToRepairAt"
      | "createdAt"
      | "updatedAt"
    >
  >;
type StockInput = Pick<StockItem, "purchasePrice" | "threshold" | "supplier"> &
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
      | "salePrice"
      | "priceBookItemId"
      | "internalCode"
      | "quality"
      | "averagePurchasePrice"
      | "lastPurchasePrice"
      | "primarySupplierId"
      | "primarySupplier"
      | "originPurchaseId"
      | "originSupplierInvoiceId"
      | "originSupplierInvoiceNumber"
      | "originSupplierInvoiceLineId"
      | "itemType"
      | "repairEnabled"
      | "counterSaleEnabled"
      | "active"
      | "productCategory"
      | "counterVisible"
      | "reconditioningFileId"
    >
  > & {
    skipModelInference?: boolean;
    /** N'enregistre pas d'entrée dans le registre Achats (l'appelant s'en charge). */
    skipPurchaseLog?: boolean;
  };
type MessageInput = Pick<MessageLog, "customerId" | "channel" | "subject" | "body"> &
  Partial<Pick<MessageLog, "repairId">>;

type PurchaseInput = Pick<Purchase, "kind" | "source" | "label" | "unitCost"> &
  Partial<
    Pick<
      Purchase,
      | "quantity"
      | "reference"
      | "internalCode"
      | "category"
      | "compatibleModel"
      | "quality"
      | "supplierId"
      | "supplier"
      | "invoiceNumber"
      | "taxRate"
      | "taxAmount"
      | "totalExcludingTax"
      | "totalIncludingTax"
      | "currency"
      | "date"
      | "total"
      | "stockItemId"
      | "supplierInvoiceId"
      | "supplierInvoiceLineId"
      | "documentId"
      | "originalFileName"
      | "originalFileUrl"
      | "repairId"
      | "reconditioningFileId"
      | "conditionneRecordId"
      | "note"
    >
  >;

type SupplierInput = Pick<Supplier, "name"> &
  Partial<Pick<Supplier, "id" | "email" | "phone" | "address" | "vatNumber" | "notes">>;

type SupplierInvoiceLineInput = {
  itemName: string;
  rawName?: string;
  displayName?: string;
  reference?: string;
  sku?: string;
  internalCode?: string;
  category?: string;
  compatibleModel?: string;
  quality?: string;
  supplierBrand?: string;
  ean?: string;
  supplierWarranty?: string;
  quantityPurchased: number;
  unitPurchasePriceExclTax: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotalExclTax?: number;
  lineTotalInclTax?: number;
  stockItemId?: string;
  createStockItem?: boolean;
  stockMinimum?: number;
  salePrice?: number;
};

type SupplierInvoiceCommitInput = {
  supplier: string | SupplierInput;
  purchaseDate?: string;
  invoiceNumber: string;
  originalFileName?: string;
  originalFileUrl?: string;
  originalDocumentId?: string;
  totalExcludingTax?: number;
  taxAmount?: number;
  totalIncludingTax?: number;
  status?: SupplierPurchaseStatus;
  source?: SupplierPurchaseSource;
  textractJson?: Record<string, unknown>;
  lines: SupplierInvoiceLineInput[];
  note?: string;
};

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

export const DEFAULT_ROLE_GREETINGS: Record<UserRole, string[]> = {
  admin: [
    "Le boss est là. Le café est prêt ?",
    "On regarde le CA du jour ou on attend l'apéro ?",
    "Les factures ne se signent pas toutes seules.",
    "Prêt à valider les marges du jour ?",
    "Direction commerciale : ON.",
    "Aujourd'hui on bat le record du mois.",
    "Un client heureux = une étoile Google. À toi de jouer.",
    "Café, KPI, décisions. Dans cet ordre.",
    "Le patron est dans la place 👔",
    "Stratégie, finance, équipe. Triple combo.",
  ],
  technician: [
    "Fer à souder chaud, c'est parti pour la soudure 🔥",
    "Sors le tournevis pentalobe, on a du boulot.",
    "Écran HS, batterie morte ? Tu vas leur redonner vie.",
    "Prêt pour la microsoudure du jour ?",
    "Attention aux flex, ils sont fragiles aujourd'hui.",
    "Diagnostic en cours… café aussi.",
    "Le chiffon microfibre est à droite. Toujours.",
    "Aujourd'hui, zéro vis perdue. Promis ?",
    "Le multimètre t'attend, partenaire.",
    "Mode ninja réparation : activé 🥷",
  ],
  frontdesk: [
    "Sourire en place, client suivant !",
    "Le téléphone va sonner dans 3, 2, 1…",
    "Prêt à expliquer pour la 50ᵉ fois que l'écran cassé n'est pas garanti ?",
    "Dossier, devis, sourire. Le triptyque magique.",
    "Aujourd'hui on dit OUI aux clients, NON au stress.",
    "Patience niveau Bouddha 🧘 activée.",
    "Premier client de la journée : champion !",
    "Café à portée de main, c'est l'essentiel.",
    "Tu es la première impression de l'atelier. No pressure.",
    "Documents à préparer, RDV à caler, légende à devenir.",
  ],
};

// Seuls les comptes réellement actifs apparaissent à l'écran de choix.
// Le gérant est actif par défaut (compte principal de l'atelier).
// Les autres rôles restent seedés pour le démarrage mais ne sont
// visibles qu'une fois explicitement activés via Paramètres > Équipe.
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
    active: false,
    createdAt: userSeedDate,
    updatedAt: userSeedDate,
  }),
  withRolePermissions({
    id: "user_lina_frontdesk",
    name: "Accueil",
    role: "frontdesk",
    pin: "5678",
    active: false,
    createdAt: userSeedDate,
    updatedAt: userSeedDate,
  }),
  withRolePermissions({
    id: "user_intern_stagiaire",
    name: "Stagiaire",
    role: "technician",
    pin: "9999",
    active: false,
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
    case "smartphone":
      return "Smartphone";
    case "tablet":
      return "Tablette";
    case "computer":
      return "Ordinateur";
    case "console":
      return "Console";
    default:
      return "Autre";
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
  address: "",
  postalCode: "",
  city: "",
  postalCity: "",
  country: "FR",
  currency: "EUR",
  taxRegime: "not_subject_to_vat",
  defaultPhonePrefix: "+33",
  siret: "000 000 000 00000",
  email: "contact@behartechpro.fr",
  phone: "06 12 34 56 78",
  website: "",
  tvaNumber: "",
  swissUid: "",
  swissVatNumber: "",
  swissCanton: "",
  twintEnabled: false,
  twintPaymentLink: "",
  twintQrCode: "",
  vatApplicable: false,
  vatRate: 20,
  isMicroEnterprise: true,
  tvaMention: "TVA non applicable — art. 293 B du CGI",
  quoteTerms: "Devis valable 30 jours.",
  invoiceTerms: "Paiement comptant à réception.",
  intakeTerms: "",
  documentFooter: "Merci pour votre confiance.",
  acceptedPaymentMethods: ["Espèces", "Carte bancaire", "SumUp", "Stripe", "Virement", "Chèque", "Autre"],
  businessHours: "Lun-Ven 09:00-18:00 · Sam 09:00-13:00",
  allowCounterClient: true,
  counterPrintFormat: "A4",
  counterQrFormat: "80mm",
  counterDefaultAction: "none",
  counterShowCopyLink: true,
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
  defaultMarket: "FR",
  allowedMarkets: ["FR"],
  billingProfiles: {
    FR: createBillingProfile(
      {
        country: "FR",
        name: "Behar Tech",
        phone: "06 12 34 56 78",
        email: "contact@behartechpro.fr",
        siret: "00000000000000",
      },
      "FR",
    ),
    CH: createBillingProfile({ country: "CH" }, "CH"),
  },
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

let activeWorkshopCountry: WorkshopCountry = "FR";
const countryLabel = (country: WorkshopCountry) => (country === "CH" ? "Suisse" : "France");
export const getWorkshopCountryLabel = (country: WorkshopCountry) => countryLabel(country);
const withWorkshopLocaleDefaults = (settings: WorkshopSettings): WorkshopSettings => {
  const defaultMarket = settings.defaultMarket || (settings.country === "CH" ? "CH" : "FR");
  const allowedMarkets =
    settings.allowedMarkets && settings.allowedMarkets.length > 0 ? settings.allowedMarkets : [defaultMarket];
  const country = normalizeWorkshopCountry(defaultMarket);
  const isSwiss = country === "CH";
  const countryConfig = getWorkshopCountryConfig(country);
  const taxRegime: WorkshopTaxRegime =
    settings.taxRegime === "vat_subject" || settings.vatApplicable ? "vat_subject" : "not_subject_to_vat";
  const currency = countryConfig.currency;
  activeWorkshopCountry = country;
  const currentProfile = createBillingProfile(
    {
      country,
      name: settings.name,
      commercialName: settings.commercialName,
      address: settings.address,
      postalCode: settings.postalCode,
      city: settings.city,
      canton: settings.swissCanton,
      phone: settings.phone,
      email: settings.email,
      siret: settings.siret,
      tvaNumber: settings.tvaNumber,
      swissUid: settings.swissUid,
      swissVatNumber: settings.swissVatNumber,
      vatApplicable: settings.vatApplicable,
      vatRate: settings.vatRate,
      tvaMention: settings.tvaMention,
    },
    country,
  );
  return {
    ...settings,
    defaultMarket,
    allowedMarkets,
    country,
    currency,
    taxRegime,
    defaultPhonePrefix: countryConfig.phonePrefix,
    vatApplicable: taxRegime === "vat_subject",
    vatRate: taxRegime === "vat_subject" ? Number(settings.vatRate || (isSwiss ? 8.1 : 20)) : 0,
    isMicroEnterprise: taxRegime === "not_subject_to_vat",
    tvaMention:
      taxRegime === "not_subject_to_vat"
        ? isSwiss
          ? "TVA non facturée — entreprise non assujettie à la TVA suisse."
          : settings.tvaMention || "TVA non applicable — art. 293 B du CGI"
        : "",
    acceptedPaymentMethods: isSwiss
      ? ["Espèces", ...(settings.twintEnabled === false ? [] : ["TWINT"]), "Carte externe", "Virement", "Autre"]
      : settings.acceptedPaymentMethods?.length
        ? settings.acceptedPaymentMethods.filter((method) => method !== "TWINT" && method !== "Carte externe")
        : defaultWorkshopInfo.acceptedPaymentMethods,
    billingProfiles: {
      ...(settings.billingProfiles ?? {}),
      [country]: currentProfile,
    },
  };
};
export const formatCurrency = (value: number, currency?: WorkshopCurrency) =>
  formatMoney(value, currency ?? activeWorkshopCountry);
const euro = (value: string | number) => parseMoney(value);
export const formatEuro = (value: number) => formatMoney(value, activeWorkshopCountry);
export const getBillingWorkshopInfo = (workshop: WorkshopInfo, countryValue: WorkshopCountry): WorkshopInfo => {
  const config = getWorkshopCountryConfig(countryValue);
  const profile = createBillingProfile(
    workshop.billingProfiles?.[config.country] ?? {
      country: config.country,
      name: workshop.name,
      commercialName: workshop.commercialName,
      address: workshop.address,
      postalCode: workshop.postalCode,
      city: workshop.city,
      canton: workshop.swissCanton,
      phone: workshop.phone,
      email: workshop.email,
      siret: workshop.siret,
      tvaNumber: workshop.tvaNumber,
      swissUid: workshop.swissUid,
      swissVatNumber: workshop.swissVatNumber,
      vatApplicable: workshop.vatApplicable,
      vatRate: workshop.vatRate,
      tvaMention: workshop.tvaMention,
    },
    config.country,
  );
  return {
    ...workshop,
    country: config.country,
    currency: config.currency,
    defaultPhonePrefix: config.phonePrefix,
    taxRegime: profile.vatApplicable ? "vat_subject" : "not_subject_to_vat",
    name: profile.name || workshop.name,
    commercialName: profile.commercialName || "",
    address: profile.address || "",
    postalCode: profile.postalCode || "",
    city: profile.city || "",
    postalCity: [profile.postalCode, profile.city].filter(Boolean).join(" "),
    phone: profile.phone || config.phonePrefix,
    email: profile.email || "",
    siret: config.country === "FR" ? profile.siret || "" : "",
    tvaNumber: config.country === "FR" ? profile.tvaNumber || "" : "",
    swissUid: config.country === "CH" ? profile.swissUid || "" : "",
    swissVatNumber: config.country === "CH" ? profile.swissVatNumber || "" : "",
    swissCanton: config.country === "CH" ? profile.canton || "" : "",
    vatApplicable: Boolean(profile.vatApplicable),
    vatRate: profile.vatApplicable ? profile.vatRate || config.defaultVatRate : 0,
    isMicroEnterprise: !profile.vatApplicable,
    tvaMention: profile.tvaMention || "",
  };
};
export const isWorkshopBillingProfileComplete = (workshop: WorkshopInfo, country: WorkshopCountry): boolean => {
  if (country === "FR" && workshop.country !== "FR") {
    return true;
  }
  if (country === "CH" && workshop.country !== "CH") {
    return true;
  }
  const resolved = getBillingWorkshopInfo(workshop, country);
  return isBillingProfileComplete(
    createBillingProfile(
      {
        country,
        name: resolved.name,
        commercialName: resolved.commercialName,
        address: resolved.address,
        postalCode: resolved.postalCode,
        city: resolved.city,
        canton: resolved.swissCanton,
        phone: resolved.phone,
        email: resolved.email,
        siret: resolved.siret,
        tvaNumber: resolved.tvaNumber,
        swissUid: resolved.swissUid,
        swissVatNumber: resolved.swissVatNumber,
        vatApplicable: resolved.vatApplicable,
        vatRate: resolved.vatRate,
        tvaMention: resolved.tvaMention,
      },
      country,
    ),
  );
};
const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

// Token public non devinable (ex : "rp_8F3K92XQ9M2AZ7H") pour les anciens liens publics.
const PUBLIC_TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const publicToken = (prefix: string, length = 16) => {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += PUBLIC_TOKEN_ALPHABET[Math.floor(Math.random() * PUBLIC_TOKEN_ALPHABET.length)];
  }
  return `${prefix}_${out}`;
};
// Construit l'accès public historique. Les réparations utilisent désormais
// makeRepairPublicAccess afin d'obtenir un code lisible BT-YYYY-00000.
const makePublicAccess = (prefix: string, basePath: string): PublicAccess => {
  const token = publicToken(prefix);
  return { token, url: `${basePath}/${token}`, createdAt: getNowIso(), active: true };
};
const makePublicAccessUrl = (basePath: string, token: string) => `${basePath.replace(/\/$/, "")}/${token}`;
const makeRepairPublicAccess = (repair: Partial<Repair>, workshop: Partial<WorkshopInfo> = defaultWorkshopSettings) =>
  ensureTrackingCode(repair, workshop).publicAccess;
// Message public automatique associé à un changement de statut réparation.
const publicStatusMessage = (status: string): string | null => {
  switch (status) {
    case "Reçu":
      return "Votre appareil est bien reçu à l'atelier.";
    case "Diagnostic":
      return "Votre appareil est en cours de diagnostic.";
    case "En attente":
      return "Votre dossier est en attente d'une validation ou d'une pièce.";
    case "Devis envoyé":
      return "Votre devis est disponible pour validation.";
    case "Devis accepté":
      return "Votre devis a été accepté, le dossier continue en atelier.";
    case "En réparation":
      return "La réparation de votre appareil est en cours.";
    case "Test final":
      return "Réparation terminée, nous procédons aux tests finaux.";
    case "Prêt":
      return "Votre appareil est prêt à être récupéré.";
    case "Rendu":
      return "Votre appareil a été rendu. Merci de votre confiance.";
    case "Irréparable":
      return "Après diagnostic, votre appareil est considéré comme irréparable.";
    case "SAV":
      return "Votre dossier SAV est ouvert et suivi par l'atelier.";
    case "Clôturé":
      return "Votre dossier est clôturé. Merci de votre confiance.";
    default:
      return null;
  }
};
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
const quoteTotal = (quote: Pick<Quote, "lines" | "devices" | "totalTtc">) => {
  const lineTotal = quote.lines.reduce((total, line) => total + safeLineAmount(line), 0);
  if (lineTotal > 0) return lineTotal;
  if (Array.isArray(quote.devices) && quote.devices.length) {
    return quote.devices.reduce((total, device) => total + quoteDeviceSubtotal(device), 0);
  }
  if (typeof quote.totalTtc === "number" && Number.isFinite(quote.totalTtc) && quote.totalTtc > 0)
    return quote.totalTtc;
  return 0;
};
const invoiceTotal = (invoice: Pick<Invoice, "lines">) =>
  invoice.lines.reduce((total, line) => total + safeLineAmount(line), 0);
const legalDocumentVersion = (entity: { version?: number }) => Math.max(1, normalizeCounter(entity.version ?? 1));
const legalTermsForSnapshot = (type: LegalDocumentSnapshot["documentType"], workshop: WorkshopInfo) => {
  if (type === "quote") return workshop.quoteTerms || workshop.documentFooter;
  if (type === "invoice") return workshop.invoiceTerms || workshop.documentFooter;
  if (type === "intake") return workshop.intakeTerms || workshop.documentFooter;
  return workshop.documentFooter;
};
const createLegalDocumentSnapshot = (input: {
  type: LegalDocumentSnapshot["documentType"];
  number: string;
  status: string;
  version?: number;
  currency?: WorkshopCurrency;
  country?: WorkshopCountry;
  locale?: WorkshopLocale;
  workshop: WorkshopInfo;
  customer?: Customer;
  repair?: Repair;
  lines: QuoteLine[];
  generatedBy?: string;
  signature?: LegalDocumentSnapshot["signature"];
}): LegalDocumentSnapshot => {
  const country = input.country ?? input.workshop.country;
  const currency = input.currency ?? input.workshop.currency;
  const locale = input.locale ?? (currency === "CHF" ? "fr-CH" : "fr-FR");
  const vat = getVatSummary(input.lines, input.workshop);
  return {
    version: legalDocumentVersion({ version: input.version }),
    generatedAt: getNowIso(),
    generatedBy: input.generatedBy,
    documentType: input.type,
    documentNumber: input.number,
    status: input.status,
    currency,
    country,
    locale,
    vat: {
      applicable: input.workshop.vatApplicable,
      rate: input.workshop.vatRate,
      regime: input.workshop.taxRegime,
      mention: input.workshop.tvaMention,
    },
    workshop: {
      brand: input.workshop.brand,
      name: input.workshop.name,
      commercialName: input.workshop.commercialName,
      address: input.workshop.address,
      postalCode: input.workshop.postalCode,
      city: input.workshop.postalCity || input.workshop.city,
      country,
      email: input.workshop.email,
      phone: input.workshop.phone,
      website: input.workshop.website,
      siret: input.workshop.siret,
      tvaNumber: input.workshop.tvaNumber,
      swissUid: input.workshop.swissUid,
      swissVatNumber: input.workshop.swissVatNumber,
    },
    client: {
      id: input.customer?.id ?? "",
      name: input.customer?.name || "Client",
      phone: input.customer?.phone || undefined,
      email: input.customer?.email || undefined,
      address: input.customer?.address || undefined,
    },
    device: input.repair
      ? {
          type: input.repair.deviceType,
          brand: input.repair.brandName,
          model: input.repair.deviceModel || input.repair.model || input.repair.device,
          imei: input.repair.imei || undefined,
        }
      : undefined,
    repair: input.repair
      ? {
          id: input.repair.id,
          number: input.repair.number,
          status: input.repair.status,
          issue: input.repair.issue,
          droppedAt: input.repair.droppedAt,
        }
      : undefined,
    lines: input.lines.map((line) => ({ ...line })),
    totals: {
      ht: vat.ht,
      tva: vat.tva,
      ttc: vat.ttc,
    },
    legalMentions: input.workshop.tvaMention,
    terms: legalTermsForSnapshot(input.type, input.workshop),
    footer: input.workshop.documentFooter,
    signature: input.signature,
  };
};
const isLegalDocumentLocked = (entity?: { lockedAt?: string; status?: string }) =>
  Boolean(
    entity?.lockedAt ||
      entity?.status === "Accepté" ||
      entity?.status === "Facturé" ||
      entity?.status === "Envoyée" ||
      entity?.status === "Payée",
  );
const mutableQuoteKeysAfterLock = new Set(["status", "invoiceId", "updatedAt", "updatedBy", "updatedByName"]);
const mutableInvoiceKeysAfterLock = new Set([
  "status",
  "paymentIds",
  "paidAmount",
  "paidAt",
  "paymentMethod",
  "updatedAt",
  "updatedBy",
  "updatedByName",
]);
const changesImmutableFields = (patch: Record<string, unknown>, allowedKeys: Set<string>) =>
  Object.keys(patch).some((key) => !allowedKeys.has(key));
const normalizeCounter = (value: unknown, fallback = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
};
const padDocNumber = (n: number) => String(normalizeCounter(n)).padStart(4, "0");
const docNumber = (prefix: string | undefined, n: number, fallbackPrefix: string) =>
  `${normalizeText(prefix, fallbackPrefix).toUpperCase()}-${padDocNumber(n)}`;
const clampMoney = (value: number | string | undefined) =>
  Math.max(0, typeof value === "string" ? euro(value) : Number.isFinite(value ?? 0) ? (value ?? 0) : 0);
const clampQuantity = (value: number | undefined) =>
  Math.max(0, Math.floor(Number.isFinite(value ?? 0) ? (value ?? 0) : 0));
const repairStatuses: RepairStatus[] = [
  "Reçu",
  "Diagnostic",
  "En attente",
  "Devis envoyé",
  "Devis accepté",
  "En réparation",
  "Test final",
  "Prêt",
  "Rendu",
  "Irréparable",
  "SAV",
  "Clôturé",
  "Annulé",
];
export const terminalRepairStatuses: RepairStatus[] = ["Rendu", "Clôturé", "Annulé", "Irréparable"];
export const isTerminalRepairStatus = (status: RepairStatus | string | undefined) =>
  terminalRepairStatuses.includes(status as RepairStatus);
const mutableTerminalRepairKeys = new Set(["messages", "publicAccess", "updatedAt", "updatedBy", "updatedByName"]);
const changesTerminalRepair = (patch: Record<string, unknown>) =>
  Object.keys(patch).some((key) => !mutableTerminalRepairKeys.has(key));
const quoteStatuses: QuoteStatus[] = ["Brouillon", "Envoyé", "Accepté", "Refusé", "Facturé"];
const invoiceStatuses: InvoiceStatus[] = ["Brouillon", "Envoyée", "Payée", "Annulée"];
const paymentStatuses: PaymentStatus[] = ["Payé", "Annulé", "Remboursé"];
export const paymentMethods: PaymentMethod[] = [
  "Espèces",
  "Carte bancaire",
  "SumUp",
  "Stripe",
  "Virement",
  "Chèque",
  "Autre",
];
const deviceTypes: DeviceType[] = ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"];
const normalizeText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text || fallback;
};
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0033") && digits.length >= 13) return `0${digits.slice(4)}`;
  if (digits.startsWith("33") && digits.length === 11) return `0${digits.slice(2)}`;
  return digits;
};
const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const counterCustomerId = "customer_counter";
const createCounterCustomer = (createdAt = nowLabel(), id = counterCustomerId, name = "Client comptoir"): Customer => ({
  id,
  shopId,
  name,
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
  status === "Préparation / Réparation"
    ? "En réparation"
    : status === "En attente pièce" || status === "Pièce commandée" || status === "En attente validation client"
      ? "En attente"
      : status === "Restitué" || status === "Livré"
        ? "Rendu"
        : repairStatuses.includes(status as RepairStatus)
          ? (status as RepairStatus)
          : "Reçu";
const repairPriorities: RepairPriority[] = ["Urgent", "Haute", "Normale", "Basse"];
const repairSubStatuses: RepairSubStatus[] = [
  "En attente pièce",
  "Pièce commandée",
  "Pièce reçue",
  "Pièce en attente",
  "En attente validation client",
  "En attente devis",
  "Devis envoyé",
  "Devis accepté",
  "Devis refusé",
  "Client injoignable",
  "Appareil verrouillé",
  "Diagnostic impossible",
  "Irréparable",
  "Annulé",
  "SAV / retour",
];
const repairTestResults: RepairTestResult[] = [
  "OK",
  "Défaut constaté",
  "Non applicable",
  "Non testé",
  "KO",
  "Non testable",
  "Test repoussé",
];
const repairFinalTestStatuses: RepairFinalTestStatus[] = [
  "Téléphone prêt",
  "Test final validé",
  "Test non applicable",
  "Test impossible",
  "Test refusé par le client",
  "Pièce en attente",
  "Irréparable",
];
const normalizeRepairPriority = (priority: unknown): RepairPriority =>
  repairPriorities.includes(priority as RepairPriority) ? (priority as RepairPriority) : "Normale";
const normalizeRepairSubStatus = (subStatus: unknown): RepairSubStatus | undefined =>
  repairSubStatuses.includes(subStatus as RepairSubStatus) ? (subStatus as RepairSubStatus) : undefined;
const normalizeRepairTestResult = (result: unknown): RepairTestResult => {
  if (result === "KO") return "Défaut constaté";
  if (result === "Non testable" || result === "Test repoussé") return "Non testé";
  return repairTestResults.includes(result as RepairTestResult) ? (result as RepairTestResult) : "Non testé";
};
const normalizeRepairFinalTestStatus = (status: unknown): RepairFinalTestStatus | undefined =>
  repairFinalTestStatuses.includes(status as RepairFinalTestStatus) ? (status as RepairFinalTestStatus) : undefined;
const normalizeChecklistItems = (items: unknown): RepairChecklistItem[] =>
  Array.isArray(items)
    ? items
        .map((item: Partial<RepairChecklistItem>) => ({
          id: normalizeText(item.id, uid("check")),
          label: normalizeText(item.label, "Point de contrôle"),
          result: normalizeRepairTestResult(item.result),
          comment: normalizeText(item.comment) || undefined,
        }))
        .filter((item) => item.label)
    : [];
const normalizeEvidencePhotos = (photos: unknown): RepairEvidencePhoto[] =>
  Array.isArray(photos)
    ? photos
        .map((photo: Partial<RepairEvidencePhoto>) => ({
          id: normalizeText(photo.id, uid("photo")),
          category: normalizeText(photo.category, "Réparation") as RepairEvidencePhoto["category"],
          stage: normalizeText(photo.stage, "Atelier"),
          type: normalizeText(photo.type, "Intervention") as RepairEvidencePhoto["type"],
          label: normalizeText(photo.label, "Photo atelier"),
          comment: normalizeText(photo.comment) || undefined,
          createdAt: normalizeText(photo.createdAt, getNowIso()),
          createdBy: normalizeText(photo.createdBy, "Atelier"),
          dataUrl: normalizeText(photo.dataUrl) || undefined,
          storagePath: normalizeText(photo.storagePath) || undefined,
        }))
        .filter((photo) => photo.label)
    : [];
const hasFinalTestClearance = (repair: Pick<Repair, "finalTest">) =>
  Boolean(
    repair.finalTest?.validatedAt ||
      repair.finalTest?.testImpossibleReason ||
      [
        "Téléphone prêt",
        "Test final validé",
        "Test non applicable",
        "Test impossible",
        "Test refusé par le client",
      ].includes(repair.finalTest?.status ?? ""),
  );
export const repairHasConfirmedPayment = (
  repair: Pick<Repair, "id" | "paymentStatus" | "paymentId" | "paymentIds">,
  payments: Array<Pick<Payment, "id" | "repairId" | "status">> = [],
) => {
  if (repair.paymentStatus === "Réglée") return true;
  if (repair.paymentStatus === "Partiellement réglée" || repair.paymentStatus === "À régler") return false;
  const repairPaymentIds = new Set([...(repair.paymentIds ?? []), repair.paymentId].filter(Boolean));
  return payments.some(
    (payment) => payment.status === "Payé" && (repairPaymentIds.has(payment.id) || payment.repairId === repair.id),
  );
};
export const getRepairReadyDisplayLabel = (
  repair: Pick<Repair, "id" | "status" | "paymentStatus" | "paymentId" | "paymentIds">,
  payments: Array<Pick<Payment, "id" | "repairId" | "status">> = [],
) => repairReadyStatusLabel(repair.status, repair.paymentStatus, repairHasConfirmedPayment(repair, payments));
export const normalizeAppointmentStatus = (
  status: unknown,
  confirmed = false,
  hasLinkedRepair = false,
): AppointmentStatus => {
  const normalized = normalizeText(status)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized === "annule" || normalized === "annulee") return "Annulé";
  if (["absent", "no-show", "no show", "non venu", "non-venu"].includes(normalized)) return "Non venu";
  if (hasLinkedRepair || ["termine", "terminee", "converti en reparation", "reparation creee"].includes(normalized)) {
    return "Réparation créée";
  }
  if (["venu", "arrive", "arrivee"].includes(normalized)) return "Arrivé";
  if (["confirme", "confirmee"].includes(normalized)) return "Confirmé";
  if (["planifie", "planifiee", "prevu", "programmee", "programme"].includes(normalized)) return "Planifié";
  if (["prevu", "en attente", "attente", "pending"].includes(normalized)) {
    return confirmed ? "Confirmé" : "En attente";
  }
  return confirmed ? "Confirmé" : "En attente";
};
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
  const cleaned = customers
    .filter((customer) => customer.name !== "Anonyme")
    .map((customer) =>
      customer.type === "counter" || customer.id === counterCustomerId || customer.name.startsWith("Client comptoir")
        ? { ...customer, type: "counter" as const, initials: customer.initials || "CC" }
        : customer,
    );
  if (cleaned.some((customer) => customer.id === counterCustomerId)) return cleaned;
  return [createCounterCustomer(), ...cleaned];
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

const sanitizeQuoteServices = (services: any[] | undefined): QuoteService[] =>
  (Array.isArray(services) ? services : [])
    .map((service) => {
      const quantity = clampQuantity(service.quantity ?? 1);
      const priceTtc = clampMoney(service.priceTtc ?? service.unitPrice ?? service.total ?? 0);
      return {
        id: normalizeText(service.id, uid("service")),
        label: normalizeText(service.label ?? service.description, "Prestation"),
        priceTtc,
        quantity,
      };
    })
    .filter((service) => service.label && service.quantity > 0);

const sanitizeQuoteAccessories = (accessories: any[] | undefined): QuoteAccessory[] =>
  (Array.isArray(accessories) ? accessories : [])
    .map((accessory) => ({
      id: normalizeText(accessory.id, uid("accessory")),
      label: normalizeText(accessory.label ?? accessory.description ?? accessory.name, "Accessoire"),
      priceTtc: accessory.included ? 0 : clampMoney(accessory.priceTtc ?? accessory.unitPrice ?? 0),
      included: accessory.included !== false,
    }))
    .filter((accessory) => accessory.label);

const quoteDeviceSubtotal = (device: Pick<QuoteDevice, "services" | "accessories">) =>
  device.services.reduce((sum, service) => sum + service.priceTtc * service.quantity, 0) +
  device.accessories.reduce((sum, accessory) => sum + (accessory.included ? 0 : (accessory.priceTtc ?? 0)), 0);

const sanitizeQuoteDevices = (devices: any[] | undefined): QuoteDevice[] =>
  (Array.isArray(devices) ? devices : [])
    .map((device, index) => {
      const services = sanitizeQuoteServices(device.services);
      const accessories = sanitizeQuoteAccessories(device.accessories);
      const sanitized: QuoteDevice = {
        id: normalizeText(device.id, uid("quote_device")),
        type: normalizeDeviceType(device.type ?? device.deviceType),
        brand: normalizeText(device.brand ?? device.brandName),
        model: normalizeText(device.model ?? device.deviceModel ?? device.device),
        services,
        accessories,
        subtotalTtc: 0,
      };
      sanitized.subtotalTtc =
        typeof device.subtotalTtc === "number" && Number.isFinite(device.subtotalTtc)
          ? clampMoney(device.subtotalTtc)
          : quoteDeviceSubtotal(sanitized);
      if (!sanitized.model && !sanitized.brand && !services.length && !accessories.length) {
        sanitized.model = `Appareil ${index + 1}`;
      }
      return sanitized;
    })
    .filter((device) => device.model || device.brand || device.services.length || device.accessories.length);

const legacyQuoteDevice = (quote: Partial<Quote>, lines: QuoteLine[]): QuoteDevice[] => {
  const brand = normalizeText(quote.brandName);
  const model = normalizeText(quote.deviceModel, normalizeText(quote.device));
  if (!brand && !model && !lines.length) return [];
  const services = lines.map((line) => ({
    id: line.id,
    label: line.description,
    priceTtc: line.unitPrice,
    quantity: line.quantity,
  }));
  const device: QuoteDevice = {
    id: uid("quote_device"),
    type: normalizeDeviceType(quote.deviceType),
    brand,
    model,
    services,
    accessories: [],
    subtotalTtc: lines.reduce((sum, line) => sum + safeLineAmount(line), 0),
  };
  return [device];
};

const linesFromQuoteDevices = (devices: QuoteDevice[]): QuoteLine[] =>
  devices.flatMap((device, deviceIndex) => {
    const deviceName = [device.brand, device.model].filter(Boolean).join(" ") || `Appareil ${deviceIndex + 1}`;
    return [
      ...device.services.map((service) => ({
        id: `${device.id}_${service.id}`,
        description: `${deviceName} · ${service.label}`,
        quantity: service.quantity,
        unitPrice: service.priceTtc,
        total: service.priceTtc * service.quantity,
      })),
      ...device.accessories.map((accessory) => ({
        id: `${device.id}_${accessory.id}`,
        description: `${deviceName} · ${accessory.label}`,
        quantity: 1,
        unitPrice: accessory.included ? 0 : (accessory.priceTtc ?? 0),
        total: accessory.included ? 0 : (accessory.priceTtc ?? 0),
      })),
    ];
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
    normalizeText(snap?.reparation) || normalizeText(repair.issue) || normalizeText(snap?.piece) || "Réparation";

  const accessoryLines = (repair.repairSaleLines ?? []).map((line) => ({
    id: uid("line"),
    description: line.sku ? `${line.name} (${line.sku})` : line.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    total: line.total,
  }));
  const accessoriesTotal = accessoryLines.reduce((sum, line) => sum + line.total, 0);
  // Total client réel : pièce(s) + main-d'œuvre. Priorité au total enregistré sur la réparation,
  // puis snapshot, puis somme laborPrice + parts. laborPrice seul n'est PAS le total client.
  const partsSaleTotal = (repair.parts ?? []).reduce(
    (sum, part) => sum + clampMoney(part.salePrice) * (part.quantity || 0),
    0,
  );
  const fallbackSum = clampMoney((repair.laborPrice ?? 0) + partsSaleTotal);
  const customerTotalRaw =
    repair.total && repair.total > 0
      ? repair.total
      : repair.amount && repair.amount > 0
        ? repair.amount
        : snap?.prixClientTotal && snap.prixClientTotal > 0
          ? snap.prixClientTotal
          : fallbackSum;
  // Le total réparation peut déjà inclure les accessoires (cf. normalizeRepair) : on les retire
  // pour éviter le double comptage, puisque les accessoryLines sont ajoutées séparément.
  const laborLineTotal = clampMoney(Math.max(0, customerTotalRaw - accessoriesTotal));
  const finalPrice = clampMoney(laborLineTotal + accessoriesTotal);
  if (finalPrice <= 0) {
    return { ok: false, message: "Ajoutez un tarif client avant de créer une facture." };
  }

  const deviceTail = [brandLabel, modelLabel].filter(Boolean).join(" ").trim();
  const description = (deviceTail ? `${interventionLabel} — ${deviceTail}` : interventionLabel)
    .replace(/\s+/g, " ")
    .trim();

  return {
    ok: true,
    lines: [
      ...(laborLineTotal > 0
        ? [{ id: uid("line"), description, quantity: 1, unitPrice: laborLineTotal, total: laborLineTotal }]
        : []),
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
  if (lower.includes("sumup")) return "SumUp";
  if (lower.includes("stripe") || lower.includes("lien de paiement") || lower.includes("lien externe")) return "Stripe";
  if (lower.includes("paypal") || lower.includes("revolut")) return "Autre";
  if (lower.includes("chèque") || lower.includes("cheque")) return "Chèque";
  if (lower.includes("virement")) return "Virement";
  if (lower.includes("twint")) return "Autre";
  if (lower.includes("terminal") || lower.includes("tpe") || lower.includes("carte")) return "Carte bancaire";
  if (lower.includes("esp")) return "Espèces";
  return "Autre";
};
const normalizeSelectedPaymentMethod = (method: unknown): PaymentMethod | null => {
  const text = normalizeText(method);
  return text ? normalizePaymentMethod(text) : null;
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
  accessMethod: [
    "Aucun",
    "Code PIN",
    "Mot de passe",
    "Schéma",
    "Empreinte / biométrie",
    "Non communiqué",
    "Non renseigné",
  ],
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

const normalizePatternData = (value: unknown): RepairIntakeCondition["patternData"] | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const input = value as { points?: unknown; label?: unknown };
  const points = Array.isArray(input.points)
    ? input.points
        .map((point) => Number(point))
        .filter((point) => Number.isInteger(point) && point >= 1 && point <= 9)
        .slice(0, 9)
    : [];
  if (!points.length) return undefined;
  return {
    points: Array.from(new Set(points)),
    label: normalizeIntakeText(input.label) ?? points.join("-"),
  };
};

const normalizeIntakeCondition = (condition: unknown): RepairIntakeCondition | undefined => {
  if (!condition || typeof condition !== "object") return undefined;
  const input = condition as Partial<RepairIntakeCondition>;
  const signatureSignedAt = normalizeIntakeText(input.signatureSignedAt ?? input.signedAt);
  const signedBy = normalizeIntakeText(input.signedBy ?? input.signerName);
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
    accessMethod: input.accessMethod ? normalizeIntakeSelect("accessMethod", input.accessMethod) : "Non communiqué",
    accessCode: normalizeIntakeText(input.accessCode),
    accessNote: normalizeIntakeText(input.accessNote),
    patternData: normalizePatternData(input.patternData),
    accessories: Array.isArray(input.accessories)
      ? (input.accessories.map((entry) => normalizeIntakeText(entry)).filter(Boolean) as string[])
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
    signerName: normalizeIntakeText(input.signerName ?? input.signedBy),
    signedAt: signatureSignedAt,
    signedBy,
    signatureDataUrl: normalizeIntakeText(input.signatureDataUrl),
    signatureSignedAt,
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
  const billingConfig = getWorkshopCountryConfig(input.billingCountry ?? activeWorkshopCountry);
  const currencySymbol = billingConfig.currency === "CHF" ? "CHF" : "€";
  return {
    id: uid("repair"),
    billingCountry: billingConfig.country,
    market: billingConfig.country,
    currency: billingConfig.currency,
    currencySymbol,
    locale: billingConfig.locale,
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
    subStatus: normalizeRepairSubStatus(input.subStatus),
    priority: normalizeRepairPriority(input.priority),
    blockReason: normalizeText(input.blockReason) || undefined,
    amount: laborPrice,
    laborPrice,
    total: laborPrice,
    notes: normalizeText(input.notes),
    droppedAt: normalizeText(input.droppedAt, getNowIso()),
    estimatedDoneAt: normalizeText(input.estimatedDoneAt, getTomorrowIso()),
    technician: normalizeText(input.technician, "Atelier principal"),
    imei: normalizeText(input.imei, "IMEI non renseigné"),
    parts: [],
    history: ["Dossier créé au comptoir"],
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
  // Source de vérité = repair.customerId. On ne retombe sur le client du RDV
  // qu'en dernier recours (cas anciens dossiers sans customerId direct).
  const customerId = customers.length
    ? getValidCustomerId(repair.customerId || linkedCustomerId, customers)
    : normalizeText(repair.customerId || linkedCustomerId);
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
        margin: part.margin !== undefined ? clampMoney(part.margin) : clampMoney(part.salePrice - part.purchasePrice),
        currency: part.currency,
        supplier: part.supplier ? normalizeText(part.supplier) : undefined,
        modelName: part.modelName ? normalizeText(part.modelName) : undefined,
        modelId: part.modelId ? normalizeText(part.modelId) : undefined,
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
            status: (["draft", "confirmed", "invoiced", "paid"].includes(String(line.status))
              ? line.status
              : "draft") as RepairSaleLineStatus,
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
  const billingConfig = getWorkshopCountryConfig(
    repair.billingCountry ?? repair.market ?? (repair.currency === "CHF" ? "CH" : activeWorkshopCountry),
  );
  const currencySymbol = repair.currencySymbol ?? (billingConfig.currency === "CHF" ? "CHF" : "€");
  return {
    id,
    billingCountry: billingConfig.country,
    market: repair.market ?? billingConfig.country,
    currency: billingConfig.currency,
    currencySymbol,
    locale: billingConfig.locale,
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
    deviceColor: normalizeText(repair.deviceColor) || undefined,
    deviceCapacity: normalizeText(repair.deviceCapacity) || undefined,
    plannedPaymentMethod: repair.plannedPaymentMethod ? normalizePaymentMethod(repair.plannedPaymentMethod) : undefined,
    model: deviceModel,
    issue: normalizeText(repair.issue, "Problème à renseigner"),
    status: normalizeRepairStatus(repair.status),
    subStatus: normalizeRepairSubStatus(repair.subStatus),
    priority: normalizeRepairPriority(repair.priority),
    blockReason: normalizeText(repair.blockReason) || undefined,
    amount: total,
    laborPrice,
    total,
    notes: normalizeText(repair.notes),
    droppedAt: normalizeText(repair.droppedAt, getNowIso()),
    estimatedDoneAt: normalizeText(repair.estimatedDoneAt, getTomorrowIso()),
    technician: normalizeText(repair.technician, "Atelier principal"),
    imei: normalizeText(repair.imei, "IMEI non renseigné"),
    parts,
    counterPrestations: Array.isArray(repair.counterPrestations)
      ? repair.counterPrestations
          .map((entry) => ({
            label: normalizeText(entry.label, "Prestation"),
            prixClient: clampMoney(entry.prixClient),
          }))
          .filter((entry) => entry.label && entry.prixClient >= 0)
      : undefined,
    counterTasks: Array.isArray(repair.counterTasks)
      ? repair.counterTasks
          .map((entry) => ({
            id: normalizeText(entry.id, uid("task")),
            label: normalizeText(entry.label, "Tâche atelier"),
            fait: Boolean(entry.fait),
          }))
          .filter((entry) => entry.label)
      : undefined,
    counterPieces: Array.isArray(repair.counterPieces)
      ? repair.counterPieces
          .map((entry) => ({
            id: normalizeText(entry.id, uid("piece")),
            nom: normalizeText(entry.nom, "Pièce"),
            prix: clampMoney(entry.prix),
          }))
          .filter((entry) => entry.nom)
      : undefined,
    counterNotifiedAt: normalizeText(repair.counterNotifiedAt) || undefined,
    repairSaleLines,
    intakeCondition: normalizeIntakeCondition(repair.intakeCondition),
    // Backfill : tout dossier existant reçoit un lien public sécurisé s'il n'en a pas.
    publicAccess:
      repair.publicAccess && repair.publicAccess.token
        ? {
            token: getTrackingCode(repair),
            url: getCustomerTrackingPath(
              {
                ...repair,
                publicAccess: { ...repair.publicAccess, token: getTrackingCode(repair) },
              },
              defaultWorkshopSettings,
            ),
            createdAt: normalizeText(repair.publicAccess.createdAt, getNowIso()),
            active: repair.publicAccess.active !== false,
          }
        : makeRepairPublicAccess(repair, defaultWorkshopSettings),
    messages: Array.isArray(repair.messages)
      ? repair.messages
          .map((entry) => ({
            id: normalizeText(entry.id, uid("msg")),
            repairId: normalizeText(entry.repairId, id),
            authorType: (["staff", "client", "system"].includes(String(entry.authorType))
              ? entry.authorType
              : "staff") as RepairMessage["authorType"],
            authorName: normalizeText(entry.authorName, "Atelier"),
            visibility: (entry.visibility === "client" ? "client" : "internal") as RepairMessage["visibility"],
            body: normalizeText(entry.body),
            createdAt: normalizeText(entry.createdAt, getNowIso()),
            readByClient: Boolean(entry.readByClient),
            readByStaff: Boolean(entry.readByStaff),
          }))
          .filter((entry) => entry.body)
      : [],
    history: Array.isArray(repair.history) ? repair.history.map((entry) => normalizeText(entry)).filter(Boolean) : [],
    paymentStatus: repair.paymentStatus,
    paymentMethodNote: normalizeText(repair.paymentMethodNote) || undefined,
    closedAt: normalizeText(repair.closedAt) || undefined,
    diagnosticNotes: normalizeText(repair.diagnosticNotes) || undefined,
    diagnosticCause: normalizeText(repair.diagnosticCause) || undefined,
    repairability: ["Oui", "Non", "Partiellement"].includes(String(repair.repairability))
      ? (repair.repairability as Repair["repairability"])
      : undefined,
    diagnosticDelay: normalizeText(repair.diagnosticDelay) || undefined,
    diagnosticWarranty: normalizeText(repair.diagnosticWarranty) || undefined,
    diagnosticRisks: normalizeText(repair.diagnosticRisks) || undefined,
    diagnosisChecklist: normalizeChecklistItems(repair.diagnosisChecklist),
    recommendedIntervention: normalizeText(repair.recommendedIntervention) || undefined,
    repairNotes: normalizeText(repair.repairNotes) || undefined,
    workshopPhotos: normalizeEvidencePhotos(repair.workshopPhotos),
    intervention: repair.intervention
      ? {
          estimatedMinutes: clampQuantity(repair.intervention.estimatedMinutes),
          manualMinutes: repair.intervention.manualMinutes
            ? clampQuantity(repair.intervention.manualMinutes)
            : undefined,
          timerStartedAt: normalizeText(repair.intervention.timerStartedAt) || undefined,
          timerPausedAt: normalizeText(repair.intervention.timerPausedAt) || undefined,
          timerFinishedAt: normalizeText(repair.intervention.timerFinishedAt) || undefined,
          timerSeconds: clampQuantity(repair.intervention.timerSeconds),
          timerRunning: Boolean(repair.intervention.timerRunning),
          currentStep: normalizeText(repair.intervention.currentStep) || undefined,
          progress: Math.min(100, clampQuantity(repair.intervention.progress)),
          tools: Array.isArray(repair.intervention.tools)
            ? repair.intervention.tools.map((tool) => normalizeText(tool)).filter(Boolean)
            : undefined,
          notes: normalizeText(repair.intervention.notes) || undefined,
          suspendedReason: normalizeText(repair.intervention.suspendedReason) || undefined,
        }
      : undefined,
    finalTest: repair.finalTest
      ? {
          items: normalizeChecklistItems(repair.finalTest.items),
          status: normalizeRepairFinalTestStatus(repair.finalTest.status),
          comment: normalizeText(repair.finalTest.comment) || undefined,
          validatedAt: normalizeText(repair.finalTest.validatedAt) || undefined,
          validatedBy: normalizeText(repair.finalTest.validatedBy) || undefined,
          testImpossibleReason: normalizeText(repair.finalTest.testImpossibleReason) || undefined,
          testImpossibleAt: normalizeText(repair.finalTest.testImpossibleAt) || undefined,
          testImpossibleBy: normalizeText(repair.finalTest.testImpossibleBy) || undefined,
          outcomeAt: normalizeText(repair.finalTest.outcomeAt) || undefined,
          outcomeBy: normalizeText(repair.finalTest.outcomeBy) || undefined,
        }
      : undefined,
    originalRepairId: normalizeText(repair.originalRepairId) || undefined,
    sav: repair.sav
      ? {
          savNumber: normalizeText(repair.sav.savNumber, `SAV-${normalizeText(repair.number, id)}`),
          originalRepairId: normalizeText(repair.sav.originalRepairId, normalizeText(repair.originalRepairId)),
          originalRepairNumber: normalizeText(repair.sav.originalRepairNumber),
          reason: normalizeText(repair.sav.reason, "Retour SAV"),
          decision:
            repair.sav.decision === "Pris en garantie" || repair.sav.decision === "Hors garantie"
              ? repair.sav.decision
              : undefined,
          status: ([
            "En cours",
            "En attente pièce",
            "En attente client",
            "Devis envoyé",
            "Validé",
            "Hors garantie",
            "Clos",
          ].includes(String(repair.sav.status))
            ? repair.sav.status
            : "En cours") as RepairSav["status"],
          warrantyRemaining: normalizeText(repair.sav.warrantyRemaining) || undefined,
          nextAction: normalizeText(repair.sav.nextAction) || undefined,
          createdAt: normalizeText(repair.sav.createdAt, nowLabel()),
        }
      : undefined,
    selectedPriceSnapshot: repair.selectedPriceSnapshot,
  };
};
const normalizeQuote = (quote: Partial<Quote>, customers: Customer[], repairs: Repair[]): Quote => {
  const id = normalizeText(quote.id, uid("quote"));
  const repairId = repairs.some((repair) => repair.id === quote.repairId) ? quote.repairId : undefined;
  const repair = repairs.find((entry) => entry.id === repairId);
  const rawDevice = normalizeText(quote.device, repair?.device ?? normalizeText(quote.deviceModel, ""));
  const rawModel = normalizeText(quote.deviceModel, repair?.deviceModel ?? repair?.model ?? rawDevice);
  const inferred = inferDeviceCatalog(rawDevice, rawModel);
  const selectedBrand = quote.brandId ? deviceBrands.find((entry) => entry.id === quote.brandId) : undefined;
  const selectedModel = quote.modelId ? deviceModels.find((entry) => entry.id === quote.modelId) : undefined;
  const deviceType = normalizeDeviceType(
    quote.deviceType ?? repair?.deviceType ?? selectedModel?.deviceType ?? inferred.deviceType,
  );
  const brandId = normalizeText(quote.brandId, repair?.brandId ?? selectedBrand?.id ?? inferred.brandId);
  const brandName = normalizeText(quote.brandName, repair?.brandName ?? selectedBrand?.name ?? inferred.brandName);
  const modelId = normalizeText(quote.modelId, repair?.modelId ?? selectedModel?.id ?? inferred.modelId);
  const deviceModel = normalizeText(quote.deviceModel, repair?.deviceModel ?? selectedModel?.name ?? rawModel);
  const customer = customers.find((entry) => entry.id === quote.customerId || entry.id === repair?.customerId);
  const initialLines = sanitizeQuoteLines(
    Array.isArray(quote.lines) && quote.lines.length
      ? quote.lines
      : [{ id: uid("line"), description: "Ligne à compléter", quantity: 1, unitPrice: 0 }],
  );
  const devices = sanitizeQuoteDevices(quote.devices);
  const normalizedDevices = devices.length
    ? devices
    : legacyQuoteDevice({ ...quote, brandName, deviceModel, device: rawDevice, deviceType }, initialLines);
  const deviceLines = normalizedDevices.length ? linesFromQuoteDevices(normalizedDevices) : [];
  const normalizedLines = normalizedDevices.length
    ? [
        ...deviceLines,
        ...initialLines.filter(
          (line) =>
            line.id.startsWith("quote_extra") || line.id.startsWith("extra") || line.id.startsWith("line_extra"),
        ),
      ]
    : initialLines;
  const totalTtc = normalizedLines.reduce((sum, line) => sum + safeLineAmount(line), 0);
  const billingConfig = getWorkshopCountryConfig(
    quote.billingCountry ?? repair?.billingCountry ?? (quote.currency === "CHF" ? "CH" : activeWorkshopCountry),
  );
  const currency = quote.currency === "CHF" || quote.currency === "EUR" ? quote.currency : billingConfig.currency;
  return {
    id,
    billingCountry: billingConfig.country,
    currency,
    locale: (currency === "CHF" ? "fr-CH" : "fr-FR") as WorkshopLocale,
    shopId: normalizeText(quote.shopId, shopId),
    number: normalizeText(quote.number, `DV-${id.slice(-4).padStart(4, "0")}`),
    customerId: getValidCustomerId(quote.customerId, customers, repair?.customerId),
    clientSnapshot: quote.clientSnapshot ?? {
      name: normalizeText(customer?.name, "Client"),
      phone: normalizeText(customer?.phone, ""),
      email: normalizeText(customer?.email, ""),
    },
    repairId,
    invoiceId: quote.invoiceId,
    deviceType,
    brandId,
    brandName,
    modelId,
    deviceModel,
    device: normalizeText(rawDevice, [brandName, deviceModel].filter(Boolean).join(" ")),
    imei: normalizeText(quote.imei, repair?.imei ?? ""),
    issueType: normalizeText(
      quote.issueType,
      repair?.issueType ?? normalizeText(quote.issue, repair?.issue ?? "Diagnostic"),
    ),
    issue: normalizeText(quote.issue, repair?.issue ?? ""),
    selectedPriceSnapshot: quote.selectedPriceSnapshot ?? repair?.selectedPriceSnapshot,
    status: normalizeQuoteStatus(quote.status),
    date: normalizeText(quote.date, todayLabel()),
    expiryDate: normalizeText(quote.expiryDate, thirtyDaysLaterLabel()),
    devices: normalizedDevices,
    lines: normalizedLines,
    notes: quote.notes || "",
    totalAmount: typeof quote.totalAmount === "number" && quote.totalAmount > 0 ? quote.totalAmount : totalTtc,
    totalTtc,
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
  const billingConfig = getWorkshopCountryConfig(
    invoice.billingCountry ??
      quote?.billingCountry ??
      repair?.billingCountry ??
      (invoice.currency === "CHF" ? "CH" : activeWorkshopCountry),
  );
  const currency = invoice.currency === "CHF" || invoice.currency === "EUR" ? invoice.currency : billingConfig.currency;
  return {
    id,
    billingCountry: billingConfig.country,
    currency,
    locale: (currency === "CHF" ? "fr-CH" : "fr-FR") as WorkshopLocale,
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
  const billingConfig = getWorkshopCountryConfig(
    payment.billingCountry ??
      invoice?.billingCountry ??
      sale?.billingCountry ??
      (payment.currency === "CHF" ? "CH" : activeWorkshopCountry),
  );
  const currency =
    payment.currency === "CHF" || payment.currency === "EUR"
      ? payment.currency
      : (invoice?.currency ?? sale?.currency ?? billingConfig.currency);
  return {
    id,
    billingCountry: billingConfig.country,
    currency,
    locale: (currency === "CHF" ? "fr-CH" : "fr-FR") as WorkshopLocale,
    shopId: normalizeText(payment.shopId, shopId),
    invoiceId: invoice?.id,
    saleId: sale?.id ?? payment.saleId,
    customerId,
    repairId: payment.repairId ?? invoice?.repairId ?? sale?.repairId,
    quoteId: payment.quoteId ?? invoice?.quoteId,
    paymentNumber,
    reference: normalizeText(payment.reference, paymentNumber),
    externalReference: normalizeText(payment.externalReference),
    method,
    mode: method,
    status: normalizePaymentStatus(payment.status),
    amount: clampMoney(payment.amount),
    date,
    note: normalizeText(payment.note),
    twintReference: normalizeText(payment.twintReference) || undefined,
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
      reconditioningFileId: normalizeText(line.reconditioningFileId) || undefined,
    };
  });
  const customerId =
    sale.customerId === "counter" || sale.customerName === "Client comptoir"
      ? counterCustomerId
      : getValidCustomerId(sale.customerId, customers, counterCustomerId);
  const repairId = repairs.some((repair) => repair.id === sale.repairId) ? sale.repairId : undefined;
  const subtotal = clampMoney(sale.subtotal ?? lines.reduce((sum, line) => sum + line.total, 0));
  const repair = repairs.find((entry) => entry.id === repairId);
  const billingConfig = getWorkshopCountryConfig(
    sale.billingCountry ?? repair?.billingCountry ?? (sale.currency === "CHF" ? "CH" : activeWorkshopCountry),
  );
  const currency = sale.currency === "CHF" || sale.currency === "EUR" ? sale.currency : billingConfig.currency;
  return {
    id,
    billingCountry: billingConfig.country,
    currency,
    locale: (currency === "CHF" ? "fr-CH" : "fr-FR") as WorkshopLocale,
    shopId: normalizeText(sale.shopId, shopId),
    number: normalizeText(sale.number, `VTE-${id.slice(-4).padStart(4, "0")}`),
    customerId,
    customerName: customerId === counterCustomerId ? "Client comptoir" : normalizeText(sale.customerName, "Client"),
    repairId,
    status: (["Brouillon", "Payée", "Rattachée", "Annulée"].includes(String(sale.status))
      ? sale.status
      : "Brouillon") as SaleStatus,
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

function buildRepairTasksFromIssue(issue: string) {
  const source = normalizeText(issue).toLowerCase();
  const labels =
    source.includes("écran") || source.includes("ecran") || source.includes("vitre")
      ? ["Démontage", "Remplacement écran", "Test tactile + affichage", "Nettoyage + remontage"]
      : source.includes("batterie")
        ? ["Ouverture appareil", "Remplacement batterie", "Test charge", "Nettoyage + remontage"]
        : ["Diagnostic", "Intervention", "Test fonctionnel", "Nettoyage + remontage"];
  return labels.map((label, index) => ({ id: `task_${Date.now()}_${index}`, label, fait: false }));
}

const normalizeAppointment = (
  appointment: Partial<Appointment>,
  customers: Customer[],
  repairs: Partial<Repair>[] = [],
): Appointment => {
  const id = normalizeText(appointment.id, uid("appointment"));
  const linkedRepair = repairs.find((repair) => repair.id === appointment.repairId || repair.appointmentId === id);
  const customerId = getValidCustomerId(appointment.customerId, customers, linkedRepair?.customerId);
  const status = normalizeAppointmentStatus(appointment.status, appointment.confirmed, Boolean(linkedRepair));
  const confirmed = status === "Confirmé" || status === "Arrivé" || status === "Réparation créée";
  const date = normalizeText(appointment.appointmentDate ?? appointment.date, todayLabel());
  const time = normalizeText(appointment.appointmentTime ?? appointment.time, "14:30");
  const deviceModel = normalizeText(appointment.deviceModel, linkedRepair?.deviceModel ?? "");
  const deviceBrand = normalizeText(appointment.deviceBrand, linkedRepair?.brandName ?? "");
  const deviceLabel = normalizeText(
    appointment.device,
    [deviceBrand, deviceModel].filter(Boolean).join(" ") || linkedRepair?.device || "Appareil à renseigner",
  );
  const issueDescription = normalizeText(
    appointment.issueDescription,
    appointment.interventionLabel ?? linkedRepair?.issue ?? "Diagnostic",
  );
  const customer = customers.find((entry) => entry.id === customerId);
  return {
    id,
    shopId: normalizeText(appointment.shopId, shopId),
    customerId,
    repairId: linkedRepair?.id ?? appointment.repairId,
    repairNumber: normalizeText(appointment.repairNumber, linkedRepair?.number) || undefined,
    appointmentNumber: normalizeText(appointment.appointmentNumber) || undefined,
    clientMode:
      appointment.clientMode === "new" || appointment.clientMode === "existing" ? appointment.clientMode : "counter",
    clientName: normalizeText(appointment.clientName, customer?.name || "Client comptoir"),
    clientPhone: normalizeText(appointment.clientPhone, customer?.phone) || undefined,
    clientEmail: normalizeText(appointment.clientEmail, customer?.email) || undefined,
    deviceType: (["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"].includes(String(appointment.deviceType))
      ? appointment.deviceType
      : linkedRepair?.deviceType) as DeviceType | undefined,
    deviceBrand: deviceBrand || undefined,
    deviceModel: deviceModel || undefined,
    imei: normalizeText(appointment.imei, linkedRepair?.imei) || undefined,
    serialNumber: normalizeText(appointment.serialNumber) || undefined,
    issueDescription,
    interventionLabel: normalizeText(appointment.interventionLabel, issueDescription) || undefined,
    customerPrice:
      typeof appointment.customerPrice === "number" && Number.isFinite(appointment.customerPrice)
        ? clampMoney(appointment.customerPrice)
        : undefined,
    estimatedTotal:
      typeof appointment.estimatedTotal === "number" && Number.isFinite(appointment.estimatedTotal)
        ? clampMoney(appointment.estimatedTotal)
        : typeof appointment.customerPrice === "number" && Number.isFinite(appointment.customerPrice)
          ? clampMoney(appointment.customerPrice)
          : undefined,
    priceStatus:
      appointment.priceStatus === "confirmed" || appointment.priceStatus === "diagnostic"
        ? appointment.priceStatus
        : "to_confirm",
    priceSnapshot: appointment.priceSnapshot,
    appointmentDate: date,
    appointmentTime: time,
    appointmentReason:
      appointment.appointmentReason === "dropoff" ||
      appointment.appointmentReason === "diagnosis" ||
      appointment.appointmentReason === "repair" ||
      appointment.appointmentReason === "pickup" ||
      appointment.appointmentReason === "customer_return" ||
      appointment.appointmentReason === "other"
        ? appointment.appointmentReason
        : undefined,
    convertedToRepairAt: normalizeText(appointment.convertedToRepairAt) || undefined,
    createdAt: normalizeText(appointment.createdAt, nowLabel()),
    updatedAt: normalizeText(appointment.updatedAt, nowLabel()),
    device: deviceLabel,
    issue: normalizeText(appointment.issue, issueDescription),
    date,
    time,
    duration: normalizeText(appointment.duration, "30 min"),
    channel: normalizeText(appointment.channel, "Atelier"),
    source: normalizeText(appointment.source, "Atelier"),
    technician: normalizeText(appointment.technician, "Atelier principal"),
    notes: normalizeText(appointment.notes),
    status,
    confirmed,
    dayIndex: clampQuantity(appointment.dayIndex),
    row: clampQuantity(appointment.row),
    color: normalizeText(appointment.color, "mint"),
  };
};
/** §4 — résout la catégorie produit en tolérant les anciennes données (libellés libres). */
const normalizeStockProductCategory = (value: unknown): StockProductCategory => {
  const raw = normalizeText(value, "");
  const exact = STOCK_PRODUCT_CATEGORIES.find((category) => category.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const lower = raw.toLowerCase();
  if (lower.includes("accessoir")) return "Accessoires";
  if (lower.includes("consommable")) return "Consommables";
  if (lower.includes("service") || lower.includes("main")) return "Services / main d'œuvre";
  // Le stock historique correspond à des pièces de réparation.
  return "Pièces détachées";
};

const itemTypeFromProductCategory = (category: StockProductCategory): StockItemType => {
  if (category === "Accessoires") return "accessory";
  if (category === "Consommables" || category === "Services / main d'œuvre" || category === "Autre") return "product";
  return "part";
};

const normalizeStockItemType = (value: unknown, category: StockProductCategory): StockItemType => {
  const raw = normalizeText(value).toLowerCase();
  if (raw === "accessory" || raw === "accessoire") return "accessory";
  if (raw === "product" || raw === "produit") return "product";
  if (raw === "part" || raw === "piece" || raw === "pièce") return "part";
  return itemTypeFromProductCategory(category);
};

const normalizeInternalCode = (value: unknown) =>
  normalizeText(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const makeUniqueInternalCode = (base: unknown, existingCodes: Set<string>, fallback: string) => {
  const normalized = normalizeInternalCode(base) || fallback;
  let candidate = normalized;
  let index = 2;
  while (existingCodes.has(candidate)) {
    candidate = `${normalized}-${index}`;
    index += 1;
  }
  existingCodes.add(candidate);
  return candidate;
};

const compactSupplierPartName = (itemName: string, category?: string, quality?: string) => {
  const normalized = normalizeText(itemName)
    .replace(/EAN\s*\d+/gi, "")
    .replace(/\/\s*Garantie\s*:?.*$/gi, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\biPhone\s+[0-9A-Za-z\s/]+?(?=\s|$)/gi, "")
    .replace(/\bUTOPYA\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const value = normalized.toLowerCase();
  let base = normalized;
  if (category === "Écran" || /(écran|ecran|display|screen)/i.test(value)) base = "Écran complet";
  if (category === "Caméra" && /lentille/i.test(value)) base = "Lentille caméra";
  else if (category === "Caméra") base = "Caméra";
  if (category === "Batterie") base = "Batterie";
  if (category === "Connecteur") base = "Connecteur de charge";
  if (!base) base = category || "Pièce";
  return base.trim();
};

const extractSupplierEan = (itemName: string) => /\bEAN\s*([0-9]{8,14})\b/i.exec(itemName)?.[1] ?? "";

const extractSupplierWarranty = (itemName: string) =>
  /Garantie\s*:?\s*([^/()]+(?:\([^)]*\))?)/i.exec(itemName)?.[1]?.replace(/\s+/g, " ").trim() ?? "";

const extractSupplierBrand = (itemName: string) => {
  const values = Array.from(itemName.matchAll(/\(([^)]+)\)/g)).map((match) => normalizeText(match[1]));
  return values.find((value) => value && !inferSupplierPartQuality(value) && !/utopya/i.test(value)) ?? "";
};

const inferSupplierPartQuality = (itemName: string) => {
  if (/\bltps\b/i.test(itemName)) return "LTPS";
  if (/\bpiec\b/i.test(itemName)) return "PIEC";
  if (/\bsoft\s*oled\b/i.test(itemName)) return "Soft OLED";
  if (/\bhard\s*oled\b/i.test(itemName)) return "Hard OLED";
  if (/\bincell\b/i.test(itemName)) return "Incell";
  if (/\boled\b/i.test(itemName)) return "OLED";
  if (/\blcd\b/i.test(itemName)) return "LCD";
  return "";
};

const inferSupplierIphoneModels = (itemName: string) => {
  const match = /\biPhone\s+([0-9A-Za-z\s/]+?)(?=\s*\(|\s+EAN\b|\s+Garantie\b|$)/i.exec(itemName);
  if (!match?.[1]) return [];
  const rawParts = match[1]
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const models: string[] = [];
  let previousNumber = "";
  for (const part of rawParts) {
    const number = /\b(SE|XR|XS|X|\d{1,2})\b/i.exec(part)?.[1] ?? previousNumber;
    if (number) previousNumber = number;
    const suffix = part.replace(/\b(SE|XR|XS|X|\d{1,2})\b/i, "").trim();
    if (number) models.push(`iPhone ${number}${suffix ? ` ${suffix}` : ""}`.replace(/\s+/g, " ").trim());
  }
  return uniqueIds(models);
};

const splitCompatibleModelNames = (value?: string) =>
  uniqueIds(
    normalizeText(value)
      .split(/\s*[,;]\s*/)
      .map((entry) => normalizeText(entry))
      .filter(Boolean),
  );

const findDuplicateStockItem = (items: StockItem[], input: Partial<StockItem>) => {
  const keys = stockReferenceKeys(input);
  if (!keys.length) return undefined;
  return items.find((item) => keys.some((key) => stockReferenceMatches(item, key)));
};

const normalizeStockItem = (item: Partial<StockItem> & { skipModelInference?: boolean }): StockItem => {
  const id = normalizeText(item.id, uid("stock"));
  const rawName = normalizeText(item.rawName, normalizeText(item.name, normalizeText(item.part, "Pièce")));
  const name = normalizeText(item.name, normalizeText(item.part, "Pièce"));
  const sku = normalizeText(item.sku, normalizeText(item.reference, `REF-${Date.now()}`));
  const internalCode = normalizeText(item.internalCode, sku);
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
  const rawModelIds = Array.isArray(item.modelIds) ? item.modelIds : [];
  const modelFromName = inferModelFromPartName(name, item.brandName);
  const supplierModels = /EAN\s*\d+|Garantie|UTOPYA|\biPhone\s+[0-9A-Za-z\s/]+/i.test(rawName || name)
    ? inferSupplierIphoneModels(rawName || name)
    : [];
  const compatibleModelInputs = uniqueIds([
    modelFromName,
    ...supplierModels,
    ...(Array.isArray(item.compatibleModels) ? item.compatibleModels : []),
  ]);
  const modelIds = uniqueIds([
    ...compatibleModelInputs.map((modelName) => findModelIdByName(modelName, brand?.id)),
    ...rawModelIds.map((modelIdOrName) =>
      deviceModels.some((model) => model.id === modelIdOrName)
        ? modelIdOrName
        : findModelIdByName(modelIdOrName, brand?.id),
    ),
  ]);
  // Inférence du modèle désactivée si skipModelInference=true OU si compatibleModels
  // est fourni explicitement (même vide) par l'appelant — on respecte le choix
  // utilisateur pour éviter de coller un modèle par défaut comme "iPhone SE 1re génération".
  const inferenceAllowed = !item.skipModelInference && !modelIds.length && !Array.isArray(item.compatibleModels);
  const inferredModelName = inferenceAllowed ? modelFromName : undefined;
  const inferredModel = inferredModelName ? findModelByName(inferredModelName, brand?.id) : undefined;
  const finalModelIds = uniqueIds([...modelIds, inferredModel?.id]);
  const firstModel = finalModelIds.length ? deviceModels.find((entry) => entry.id === finalModelIds[0]) : undefined;
  const effectiveBrand = brand ?? deviceBrands.find((entry) => entry.id === firstModel?.brandId);
  const compatibleModels = uniqueIds([
    ...compatibleModelInputs,
    ...finalModelIds.map((modelId) => deviceModels.find((entry) => entry.id === modelId)?.name),
  ]);
  const deviceType = normalizeDeviceType(firstModel?.deviceType ?? item.deviceType ?? category?.deviceTypes[0]);
  const quantity = clampQuantity(item.quantity ?? item.stock);
  const productCategory = normalizeStockProductCategory(item.productCategory);
  const itemType = normalizeStockItemType(item.itemType, productCategory);
  const repairEnabled = typeof item.repairEnabled === "boolean" ? item.repairEnabled : itemType === "part";
  const counterSaleEnabled =
    typeof item.counterSaleEnabled === "boolean"
      ? item.counterSaleEnabled
      : typeof item.counterVisible === "boolean"
        ? item.counterVisible && itemType !== "part"
        : itemType !== "part";
  const quality = normalizeText(item.quality, inferSupplierPartQuality(rawName || name));
  const categoryName = category?.name ?? normalizeText(item.categoryName, normalizeText(item.category, "Autre"));
  const displayName = normalizeText(
    item.displayName,
    /EAN\s*\d+|Garantie|UTOPYA/i.test(rawName || name)
      ? compactSupplierPartName(rawName || name, categoryName, quality)
      : name,
  );
  const now = todayLabel();
  return {
    id,
    shopId: normalizeText(item.shopId, shopId),
    sku,
    internalCode,
    rawName,
    displayName,
    name: displayName,
    deviceType,
    brandId: effectiveBrand?.id ?? item.brandId,
    brandName: normalizeText(item.brandName, effectiveBrand?.name),
    modelIds: finalModelIds,
    compatibleModels,
    categoryId: category?.id ?? "cat_other",
    categoryName,
    part: displayName,
    reference: sku,
    category: categoryName,
    quality,
    supplierBrand: normalizeText(item.supplierBrand, extractSupplierBrand(rawName)),
    ean: normalizeText(item.ean, extractSupplierEan(rawName)),
    supplierWarranty: normalizeText(item.supplierWarranty, extractSupplierWarranty(rawName)),
    purchasePrice: clampMoney(item.purchasePrice),
    averagePurchasePrice:
      typeof item.averagePurchasePrice === "number"
        ? clampMoney(item.averagePurchasePrice)
        : clampMoney(item.purchasePrice),
    lastPurchasePrice:
      typeof item.lastPurchasePrice === "number" ? clampMoney(item.lastPurchasePrice) : clampMoney(item.purchasePrice),
    salePrice: clampMoney(item.salePrice),
    quantity,
    stock: quantity,
    threshold: clampQuantity(item.threshold),
    supplier: normalizeText(item.supplier, "Non renseigné"),
    primarySupplierId: normalizeText(item.primarySupplierId),
    primarySupplier: normalizeText(item.primarySupplier, normalizeText(item.supplier)),
    originPurchaseId: normalizeText(item.originPurchaseId),
    originSupplierInvoiceId: normalizeText(item.originSupplierInvoiceId),
    originSupplierInvoiceNumber: normalizeText(item.originSupplierInvoiceNumber),
    originSupplierInvoiceLineId: normalizeText(item.originSupplierInvoiceLineId),
    leadTime: normalizeText(item.leadTime, "2 à 3 jours"),
    itemType,
    repairEnabled,
    counterSaleEnabled,
    active: item.active !== false,
    productCategory,
    // Compat legacy : l'ancien champ suit la nouvelle vérité comptoir.
    counterVisible: counterSaleEnabled,
    createdAt: normalizeText(item.createdAt, now),
    updatedAt: normalizeText(item.updatedAt, now),
    priceBookItemId: item.priceBookItemId,
    reconditioningFileId: normalizeText(item.reconditioningFileId) || undefined,
  };
};

const CATEGORY_TO_INTERVENTION: Record<string, string> = {
  Écran: "Écran",
  Batterie: "Batterie",
  "Connecteur de charge": "Connecteur de charge",
  Connecteur: "Connecteur de charge",
  "Caméra arrière": "Caméra arrière",
  Caméra: "Caméra arrière",
  "Dos arrière": "Dos arrière",
  Dos: "Dos arrière",
  "Vitre arrière": "Vitre arrière",
  Micro: "Micro",
  "Haut-parleur": "Haut-parleur",
  "Nappe / capteur": "Nappe / capteur",
  Nappe: "Nappe / capteur",
};

const INTERVENTION_TO_CATEGORY: Record<string, string> = {
  "Écran cassé": "Écran",
  Écran: "Écran",
  Batterie: "Batterie",
  "Connecteur de charge": "Connecteur",
  "Caméra arrière": "Caméra",
  "Dos arrière": "Dos",
  "Vitre arrière": "Vitre arrière",
  Micro: "Micro",
  "Haut-parleur": "Haut-parleur",
  "Nappe / capteur": "Nappe",
};

const INTERVENTION_ALIASES: Record<string, string[]> = {
  "Écran cassé": ["Écran", "écran"],
  Écran: ["Écran cassé", "écran cassé"],
  "Caméra arrière": ["Caméra", "caméra"],
  "Dos arrière": ["Dos", "Vitre arrière", "dos"],
  "Vitre arrière": ["Dos arrière", "Dos"],
  "Connecteur de charge": ["Connecteur", "connecteur"],
};

const getInterventionFromCategory = (category?: string) =>
  category ? CATEGORY_TO_INTERVENTION[category] || "Autre intervention" : "Autre intervention";

const getCategoryFromIntervention = (intervention?: string) =>
  intervention ? INTERVENTION_TO_CATEGORY[intervention] || "Autre" : "Autre";

const syncPriceBookToStockItems = (pbItems: PriceBookItem[], stockItems: StockItem[]): StockItem[] => {
  const nextStock = [...stockItems];
  pbItems.forEach((pb) => {
    // Only sync items that are for pieces (not just labor)
    if (!pb.piece || pb.piece.toLowerCase() === "main d'oeuvre" || pb.piece.toLowerCase() === "main d'œuvre") return;

    // 1. Find by ID link
    let sIndex = nextStock.findIndex((s) => s.id === pb.stockItemId || s.priceBookItemId === pb.id);

    // 2. Find by SKU
    if (sIndex === -1 && pb.sku) {
      sIndex = nextStock.findIndex((s) => s.sku === pb.sku || s.reference === pb.sku);
    }

    // 3. Find by Name + Brand + Model + Category
    if (sIndex === -1) {
      const category = getCategoryFromIntervention(pb.reparation);
      const pbReparationLower = pb.reparation.toLowerCase();
      const reparationAliases = (INTERVENTION_ALIASES[pb.reparation] ?? []).map((a) => a.toLowerCase());
      sIndex = nextStock.findIndex((s) => {
        const sCatLower = (s.categoryName || s.category || "").toLowerCase();
        const catMatch =
          s.categoryName === category ||
          s.category === category ||
          sCatLower === pbReparationLower ||
          reparationAliases.includes(sCatLower);
        const modelMatch =
          s.compatibleModels.some((m) => m.toLowerCase() === pb.modele.toLowerCase()) ||
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
        purchasePrice: Number.isFinite(pb.prixAchat) ? pb.prixAchat : nextStock[sIndex].purchasePrice,
        salePrice: Number.isFinite(pb.prixVentePiece) ? pb.prixVentePiece : nextStock[sIndex].salePrice,
        // Only update quantity if it was explicitly provided in PriceBook
        quantity: pb.stockDisponible ?? nextStock[sIndex].quantity,
        stock: pb.stockDisponible ?? nextStock[sIndex].stock,
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

// Déduit le modèle d'appareil à partir du nom de la pièce quand l'utilisateur
// n'a sélectionné aucun modèle compatible. Ex. "Écran iPhone 13" → "iPhone 13".
const inferModelFromPartName = (partName: string, brandName?: string): string | undefined => {
  const cleanName = String(partName || "").trim();
  if (!cleanName) return undefined;
  const brand = brandName ? findBrandByName(brandName) : undefined;
  const normalizedName = cleanName.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ");
  return deviceModels
    .filter((model) => !brand?.id || model.brandId === brand.id)
    .filter((model) => {
      const normalizedModel = model.name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ");
      return normalizedName.includes(normalizedModel);
    })
    .sort((a, b) => b.name.length - a.name.length)[0]?.name;
};

const findModelIdByName = (modelName: string | undefined, brandId?: string): string | undefined => {
  if (!modelName) return undefined;
  return findModelByName(modelName, brandId)?.id;
};

const stockDeviceTypeToPriceBook = (deviceType: DeviceType | undefined): PriceBookDeviceType => {
  switch (deviceType) {
    case "Smartphone":
      return "smartphone";
    case "Tablette":
      return "tablet";
    case "Ordinateur":
      return "computer";
    case "Console":
      return "console";
    default:
      return "other";
  }
};

const syncStockToPriceBookItems = (stockItems: StockItem[], pbItems: PriceBookItem[]): PriceBookItem[] => {
  const nextPB = [...pbItems];
  stockItems.forEach((s) => {
    if (s.salePrice <= 0 && s.purchasePrice <= 0) return;
    // Détermine le modèle effectif : sélection utilisateur → sinon déduction
    // depuis le nom (ex. "Ecran iPhone 13") → sinon "Générique" en dernier recours.
    const inferredModel = s.compatibleModels[0] || inferModelFromPartName(s.name, s.brandName);
    const effectiveModel = inferredModel || "Générique";

    // 1. Find by ID link
    let pbIndex = nextPB.findIndex((pb) => pb.id === s.priceBookItemId || pb.stockItemId === s.id);

    // 2. Find by SKU
    if (pbIndex === -1 && s.sku) {
      pbIndex = nextPB.findIndex((pb) => pb.sku === s.sku || pb.sku === s.reference);
    }

    // 3. Find by Type + Brand + Model + Intervention
    if (pbIndex === -1) {
      const intervention = getInterventionFromCategory(s.categoryName || s.category);
      const categoryRaw = (s.categoryName || s.category || "").toLowerCase();
      const interventionAliases = (INTERVENTION_ALIASES[intervention] ?? []).map((a) => a.toLowerCase());
      pbIndex = nextPB.findIndex((pb) => {
        const pbReparationLower = pb.reparation.toLowerCase();
        const reparationMatches =
          pbReparationLower === intervention.toLowerCase() ||
          pbReparationLower === categoryRaw ||
          interventionAliases.includes(pbReparationLower);
        return (
          pb.marque.toLowerCase() === s.brandName?.toLowerCase() &&
          pb.modele.toLowerCase() === effectiveModel.toLowerCase() &&
          reparationMatches
        );
      });
    }

    if (pbIndex !== -1) {
      // Update existing Price Book entry
      const existing = nextPB[pbIndex];
      const stockDrivenLabor = 0;
      const nextItem = {
        ...existing,
        stockItemId: s.id,
        prixAchat: s.purchasePrice,
        prixVentePiece: s.salePrice,
        mainOeuvre: stockDrivenLabor,
        stockDisponible: s.quantity,
        fournisseur: s.supplier !== "Non renseigné" ? s.supplier : existing.fournisseur,
        updatedAt: new Date().toISOString(),
      };

      // Recalculate totals using the store helper if possible, or manual logic
      const total = nextItem.prixVentePiece + stockDrivenLabor;
      const marge = total - nextItem.prixAchat;
      const margePourcentage = total > 0 ? (marge / total) * 100 : 0;

      nextPB[pbIndex] = {
        ...nextItem,
        prixClientTotal: total,
        marge,
        margePourcentage,
      };
    } else {
      // Create new price book item — utilise le modèle déduit pour que
      // l'entrée apparaisse dans le bon nœud de l'arborescence (ex. iPhone 13).
      const intervention = getInterventionFromCategory(s.categoryName || s.category);
      const newItem = createPriceBookItem({
        typeAppareil: stockDeviceTypeToPriceBook(s.deviceType),
        marque: s.brandName || "Autre",
        modele: effectiveModel,
        piece: s.name,
        reparation: intervention,
        qualite: "Standard",
        prixAchat: s.purchasePrice,
        prixVentePiece: s.salePrice,
        mainOeuvre: 0,
        prixClientTotal: s.salePrice,
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

const findPriceBookForStockItem = (item: StockItem, pbItems: PriceBookItem[]): PriceBookItem | undefined =>
  pbItems.find((entry) => entry.id === item.priceBookItemId || entry.stockItemId === item.id) ??
  pbItems.find((entry) => Boolean(item.sku) && entry.sku === item.sku);

const getStockClientPrice = (item: StockItem, pbItems: PriceBookItem[]): number =>
  clampMoney(findPriceBookForStockItem(item, pbItems)?.prixVentePiece ?? 0);
const normalizePersistedState = (state: unknown) => {
  try {
    const persisted = state && typeof state === "object" ? (state as Partial<StoreState>) : {};
    activeWorkshopCountry = normalizeWorkshopCountry(
      persisted.workshopSettings?.country ?? persisted.workshopInfo?.country ?? "FR",
    );
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
                (sb: DeviceBrand) =>
                  sb.id === id || sb.name.toLowerCase() === String((b as any).name || "").toLowerCase(),
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

    const baseCustomers = ensureCounterCustomer(
      Array.isArray(persisted.customers) ? persisted.customers : seed.customers,
    );
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
    const workshopSettings = withWorkshopLocaleDefaults({
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
    } as WorkshopSettings);
    workshopSettings.nextRepairNumber = normalizeCounter(
      workshopSettings.nextRepairNumber,
      Math.max(1, repairsWithLinks.length + 1),
    );
    workshopSettings.nextQuoteNumber = normalizeCounter(
      workshopSettings.nextQuoteNumber,
      Math.max(1, quotes.length + 1),
    );
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
    const persistedSessionId =
      typeof (persisted as any).sessionUserId === "string" ? (persisted as any).sessionUserId : undefined;
    const persistedCurrentId =
      typeof (persisted as any).currentUser?.id === "string"
        ? (persisted as any).currentUser.id
        : defaultCurrentUser.id;
    // Priorité au sessionUserId si présent et actif ; sinon currentUser persisté ; sinon admin par défaut.
    const currentUser =
      (persistedSessionId && users.find((u) => u.id === persistedSessionId && u.active)) ||
      users.find((user) => user.id === persistedCurrentId) ||
      defaultCurrentUser;

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
      purchases: Array.isArray((persisted as any).purchases)
        ? ((persisted as any).purchases as Purchase[])
        : seed.purchases,
      suppliers: Array.isArray((persisted as any).suppliers) ? ((persisted as any).suppliers as Supplier[]) : [],
      supplierInvoices: Array.isArray((persisted as any).supplierInvoices)
        ? ((persisted as any).supplierInvoices as SupplierInvoice[])
        : [],
      supplierInvoiceLines: Array.isArray((persisted as any).supplierInvoiceLines)
        ? ((persisted as any).supplierInvoiceLines as SupplierInvoiceLine[])
        : [],
      documents: Array.isArray(persisted.documents) ? persisted.documents : seed.documents,
      sales,
      stockMovements: Array.isArray((persisted as any).stockMovements)
        ? ((persisted as any).stockMovements as StockMovement[])
        : [],
      selectedSaleId: typeof (persisted as any).selectedSaleId === "string" ? (persisted as any).selectedSaleId : "",
      messageLogs: Array.isArray(persisted.messageLogs) ? persisted.messageLogs : seed.messageLogs,
      priceBookItems: (() => {
        if (!Array.isArray(persisted.priceBookItems)) return syncStockToPriceBookItems(stockItems, seed.priceBookItems);
        const normalized = persisted.priceBookItems
          .map((item) => normalizePriceBookItem(item))
          .filter((item): item is PriceBookItem => Boolean(item));
        const hasExamples = normalized.some((item) => item.source === "behar_example");
        if (hasExamples) return syncStockToPriceBookItems(stockItems, normalized);
        const existingIds = new Set(normalized.map((item) => item.id));
        const examples = seed.priceBookItems.filter((item) => !existingIds.has(item.id));
        return syncStockToPriceBookItems(stockItems, [...normalized, ...examples]);
      })(),
      // Licence — must be restored from persisted state, never reset by merge
      licenseActivated: Boolean((persisted as any).licenseActivated),
      licenseKey: typeof (persisted as any).licenseKey === "string" ? (persisted as any).licenseKey : undefined,
      licensePlan: typeof (persisted as any).licensePlan === "string" ? (persisted as any).licensePlan : "Pilote",
      licenseActivatedAt:
        typeof (persisted as any).licenseActivatedAt === "string" ? (persisted as any).licenseActivatedAt : undefined,
      lastLicenseKey:
        typeof (persisted as any).lastLicenseKey === "string" ? (persisted as any).lastLicenseKey : undefined,
      teamMembers: Array.isArray((persisted as any).teamMembers) ? (persisted as any).teamMembers : [],
      currentUser,
      users,
      sessionUserId:
        typeof (persisted as any).sessionUserId === "string" &&
        users.some((u) => u.id === (persisted as any).sessionUserId && u.active)
          ? (persisted as any).sessionUserId
          : undefined,
      auditLogs: Array.isArray((persisted as any).auditLogs) ? ((persisted as any).auditLogs as AuditLogEntry[]) : [],
      notifications: Array.isArray((persisted as any).notifications)
        ? ((persisted as any).notifications as AppNotification[])
        : [],
      roleGreetings: {
        admin:
          Array.isArray((persisted as any).roleGreetings?.admin) && (persisted as any).roleGreetings.admin.length > 0
            ? (persisted as any).roleGreetings.admin
            : [...DEFAULT_ROLE_GREETINGS.admin],
        technician:
          Array.isArray((persisted as any).roleGreetings?.technician) &&
          (persisted as any).roleGreetings.technician.length > 0
            ? (persisted as any).roleGreetings.technician
            : [...DEFAULT_ROLE_GREETINGS.technician],
        frontdesk:
          Array.isArray((persisted as any).roleGreetings?.frontdesk) &&
          (persisted as any).roleGreetings.frontdesk.length > 0
            ? (persisted as any).roleGreetings.frontdesk
            : [...DEFAULT_ROLE_GREETINGS.frontdesk],
      },
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
  })),
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
    stockMovements: [] as StockMovement[],
    deviceBrands: deviceBrandsList,
    deviceModels: deviceModelsList,
    partCategories: partCategoriesList,
    customers: [createCounterCustomer()] as Customer[],
    repairs: [] as Repair[],
    quotes: [] as Quote[],
    invoices: [] as Invoice[],
    payments: [] as Payment[],
    appointments: [] as Appointment[],
    // État zéro à la 1re ouverture : pas de stock de démo.
    // Les mocks restent dispo dans @/mock/stock pour les tests internes.
    stockItems: [] as StockItem[],
    purchases: [] as Purchase[],
    suppliers: [] as Supplier[],
    supplierInvoices: [] as SupplierInvoice[],
    supplierInvoiceLines: [] as SupplierInvoiceLine[],
    documents: [] as BeharDocument[],
    messageLogs: [] as MessageLog[],
    priceBookItems: [] as PriceBookItem[],
    isCatalogPreloaded: false,
    licenseActivated: false,
    licenseKey: undefined,
    licensePlan: undefined,
    licenseActivatedAt: undefined,
    lastLicenseKey: undefined,
    teamMembers: [] as TeamMember[],
    currentUser: defaultCurrentUser,
    users: defaultUsers,
    auditLogs: [] as AuditLogEntry[],
    notifications: [] as AppNotification[],
    roleGreetings: {
      admin: [...DEFAULT_ROLE_GREETINGS.admin],
      technician: [...DEFAULT_ROLE_GREETINGS.technician],
      frontdesk: [...DEFAULT_ROLE_GREETINGS.frontdesk],
    },
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
      loginWithUserPin: (userId, pin) => {
        const trimmed = (pin || "").trim();
        if (!trimmed) return { ok: false, reason: "invalid" };
        const user = get().users.find((entry) => entry.id === userId);
        if (!user) return { ok: false, reason: "invalid" };
        if (!user.active) return { ok: false, reason: "disabled" };
        if (user.pin !== trimmed) return { ok: false, reason: "invalid" };
        const hydrated = withRolePermissions({ ...user, updatedAt: new Date().toISOString() });
        set((state) => ({
          currentUser: hydrated,
          sessionUserId: hydrated.id,
          users: state.users.map((u) => (u.id === user.id ? { ...u, updatedAt: hydrated.updatedAt } : u)),
        }));
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
      updateRoleGreetings: (role, messages) => {
        if (!get().hasPermission("canManageUsers")) {
          return;
        }
        const cleaned = messages.map((m) => m.trim()).filter(Boolean);
        if (cleaned.length === 0) {
          // Pas de liste vide — on remet les défauts
          set((state) => ({
            roleGreetings: { ...state.roleGreetings, [role]: [...DEFAULT_ROLE_GREETINGS[role]] },
          }));
          return;
        }
        set((state) => ({
          roleGreetings: { ...state.roleGreetings, [role]: cleaned },
        }));
        try {
          get().addAuditLog({
            action: "settings.greetings.update",
            targetType: "role",
            targetId: role,
            message: `Messages d'accueil ${role} modifiés (${cleaned.length} entrées)`,
          });
        } catch {
          /* ignore */
        }
      },
      resetRoleGreetings: (role) => {
        if (!get().hasPermission("canManageUsers")) return;
        if (role) {
          set((state) => ({
            roleGreetings: { ...state.roleGreetings, [role]: [...DEFAULT_ROLE_GREETINGS[role]] },
          }));
        } else {
          set({
            roleGreetings: {
              admin: [...DEFAULT_ROLE_GREETINGS.admin],
              technician: [...DEFAULT_ROLE_GREETINGS.technician],
              frontdesk: [...DEFAULT_ROLE_GREETINGS.frontdesk],
            },
          });
        }
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
          users: state.users.map((u) =>
            u.id === id ? { ...u, active: false, updatedAt: new Date().toISOString() } : u,
          ),
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
          users: state.users.map((u) =>
            u.id === id ? { ...u, active: true, updatedAt: new Date().toISOString() } : u,
          ),
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
          users: state.users.map((u) =>
            u.id === id ? { ...u, pin: trimmed, updatedAt: new Date().toISOString() } : u,
          ),
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
      requirePermission: (permission, actionName) => {
        const allowed = get().hasPermission(permission);
        if (allowed) return true;
        const actor = get().currentUser ?? defaultCurrentUser;
        get().addAuditLog({
          action: "permission.denied",
          targetType: "permission",
          targetId: permission,
          message: `${actor.name} a tenté une action non autorisée : ${actionName || permission}`,
          metadata: { permission, actionName },
        });
        get().addNotification({
          type: "warning",
          title: "Accès refusé",
          message: "Votre rôle ne permet pas cette action.",
          targetType: "permission",
          targetId: permission,
        });
        return false;
      },
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
        // Clés actives — à régénérer ici quand tu vends une licence.
        // Format : BHT-2026-XXXX-YYYY (4 chars + 4 chars) pour qu'elles
        // soient faciles à dicter au téléphone mais imprévisibles.
        const validKeys = [
          // Licences de test / QA
          "BHT-2026-PRO-001",
          "BHT-2026-PRO-002",
          "BHT-PILOT-ANNEMASSE",
          "BHT-BEHAR-TECH-PRO",
          "BHT-PILOT-EXCLUSIF",
          // Toi (gérant Behar Tech, accès personnel)
          "BHT-2026-BEHAR-TECH",
          // 5 clés client prêtes à distribuer
          "BHT-2026-9F7K-3M2X",
          "BHT-2026-4D8N-2P5Y",
          "BHT-2026-Q6R8-T1V3",
          "BHT-2026-J5L7-W9Z2",
          "BHT-2026-A3B6-C8E1",
          // 20 nouvelles clés pilote générées
          "BHT-2026-X8Y2-K9W4",
          "BHT-2026-P3M7-Z5N1",
          "BHT-2026-R6T2-H9S4",
          "BHT-2026-F5G8-D2J1",
          "BHT-2026-L4K7-B9V3",
          "BHT-2026-Q1W8-E3R9",
          "BHT-2026-T5Y2-U6I8",
          "BHT-2026-O9P3-A4S5",
          "BHT-2026-D6F7-G8H1",
          "BHT-2026-J2K3-L4Z5",
          "BHT-2026-X9C8-V7B6",
          "BHT-2026-N5M4-Q3W2",
          "BHT-2026-E8R7-T6Y5",
          "BHT-2026-U4I3-O2P1",
          "BHT-2026-A9S8-D7F6",
          "BHT-2026-G5H4-J3K2",
          "BHT-2026-L9Z8-X7C6",
          "BHT-2026-V5B4-N3M2",
          "BHT-2026-Q9W8-E7R6",
          "BHT-2026-T5Y4-U3I2",
        ];
        const normalizedKey = key.toUpperCase().trim();
        if (validKeys.includes(normalizedKey)) {
          const current = get();
          const prevKey = current.lastLicenseKey || current.licenseKey;

          if (prevKey && prevKey !== normalizedKey) {
            // Changement de clé détecté -> reset complet local pour éviter de polluer le nouvel atelier
            const cleanSeed = createSeed();
            set({
              ...cleanSeed,
              licenseActivated: true,
              licenseKey: normalizedKey,
              lastLicenseKey: normalizedKey,
              licensePlan: "Pilote",
              licenseActivatedAt: new Date().toISOString(),
              _hasHydrated: true,
            });
          } else {
            set({
              licenseActivated: true,
              licenseKey: normalizedKey,
              lastLicenseKey: normalizedKey,
              licensePlan: "Pilote",
              licenseActivatedAt: new Date().toISOString(),
            });
          }
          return true;
        }
        return false;
      },
      deactivateLicense: () => {
        // On conserve lastLicenseKey pour pouvoir détecter un changement de licence à la prochaine activation
        set((state) => ({
          licenseActivated: false,
          licenseKey: undefined,
          licensePlan: undefined,
          licenseActivatedAt: undefined,
          cloudSync: undefined,
          lastLicenseKey: state.licenseKey || state.lastLicenseKey,
        }));
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
              deviceBrands: state.deviceBrands.map((b) =>
                b.id === existing.id ? { ...b, deviceTypes: nextTypes } : b,
              ),
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
        const cleanName = String(name || "")
          .replace(/\s+/g, " ")
          .trim();
        if (!cleanName) return "";
        const id = `model_${brandId}_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
        const now = nowLabel();
        set((state) => {
          const exists = state.deviceModels.some(
            (m) =>
              m.brandId === brandId && m.deviceType === deviceType && m.name.toLowerCase() === cleanName.toLowerCase(),
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
        const cleanEmail = normalizeEmail(input.email);
        if (cleanName !== "Client comptoir" && (cleanPhone || cleanEmail)) {
          const existing = get().customers.find(
            (customer) =>
              customer.type !== "counter" &&
              ((cleanPhone && normalizePhone(customer.phone) === cleanPhone) ||
                (cleanEmail && normalizeEmail(customer.email) === cleanEmail)),
          );
          if (existing) {
            set({ selectedCustomerId: existing.id });
            get().addAuditLog({
              action: "client.duplicate_reused",
              targetType: "client",
              targetId: existing.id,
              message: `${actor.name} a repris le client existant ${existing.name}`,
            });
            return existing.id;
          }
        }
        if (cleanName === "Anonyme" || cleanName === "Client comptoir" || input.type === "counter") {
          const id = uid("customer_counter");
          const now = nowLabel();
          const existingCounterCount = get().customers.filter(
            (customer) => customer.type === "counter" || customer.name.startsWith("Client comptoir"),
          ).length;
          const label = `Client comptoir ${String(existingCounterCount + 1).padStart(3, "0")}`;
          const customer: Customer = {
            ...createCounterCustomer(now, id, label),
            device: input.device || "Non renseigné",
            lastRepair: input.lastRepair || "Aucune",
            source: input.source || "Comptoir",
            notes: input.notes,
            tags: input.tags,
            status: input.status || "Client comptoir",
            ...actorFields(actor),
          };
          set((state) => ({
            customers: [customer, ...ensureCounterCustomer(state.customers)],
            selectedCustomerId: id,
          }));
          get().addAuditLog({
            action: "client.counter_created",
            targetType: "client",
            targetId: id,
            message: `${actor.name} a créé ${customer.name}`,
          });
          return id;
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
      updateCustomer: (id, patch) => {
        if (!get().requirePermission("canEditClient", "Modifier un client")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((state) => ({
          customers: deriveCustomers(
            state.customers.map((customer) =>
              customer.id === id
                ? {
                    ...customer,
                    ...patch,
                    initials: patch.name ? initials(patch.name) : customer.initials,
                    ...updateActorFields(actor),
                  }
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
          const hasPaidSales = state.sales.some((sale) => sale.customerId === id && sale.status === "Payée");
          if (hasLinkedAppointments || hasLinkedRepairs || hasPaidSales) return state;
          const customers = state.customers.filter((customer) => customer.id !== id);
          const sales = state.sales.filter((sale) => sale.customerId !== id);
          return {
            appointments: state.appointments.filter((appointment) => appointment.customerId !== id),
            customers,
            invoices: state.invoices.filter((invoice) => invoice.customerId !== id),
            messageLogs: state.messageLogs.filter((message) => message.customerId !== id),
            payments: state.payments.filter((payment) => payment.customerId !== id),
            quotes: state.quotes.filter((quote) => quote.customerId !== id),
            sales,
            selectedSaleId: sales.some((sale) => sale.id === state.selectedSaleId)
              ? state.selectedSaleId
              : (sales[0]?.id ?? ""),
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
        // Quota d'abonnement : réparations créées ce mois-ci (plans limités uniquement).
        const repairQuota = checkRepairQuota(state.licensePlan, countThisMonth(state.repairs));
        if (!repairQuota.allowed) {
          get().addNotification({
            type: "warning",
            title: "Limite de l'offre atteinte",
            message: repairQuota.reason ?? "Limite de réparations mensuelles atteinte.",
            targetType: "settings",
            targetId: shopId,
          });
          return "";
        }
        const actor = state.currentUser ?? defaultCurrentUser;
        const ws = state.workshopSettings ?? defaultWorkshopSettings;
        const appointment = input.appointmentId
          ? state.appointments.find((entry) => entry.id === input.appointmentId)
          : undefined;
        // Le client explicitement validé dans la prise en charge gagne sur le
        // client de passage éventuellement attaché au rendez-vous.
        const customerId = getValidCustomerId(input.customerId, state.customers, appointment?.customerId ?? "");
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
          deviceColor: input.deviceColor,
          deviceCapacity: input.deviceCapacity,
          plannedPaymentMethod: input.plannedPaymentMethod,
          selectedPriceSnapshot: input.selectedPriceSnapshot,
          counterPrestations: input.counterPrestations,
          counterTasks: input.counterTasks,
          counterPieces: input.counterPieces,
          counterNotifiedAt: input.counterNotifiedAt,
          parts: input.parts ?? created.parts,
          repairSaleLines: input.repairSaleLines,
          intakeCondition: normalizeIntakeCondition(input.intakeCondition),
          diagnosticNotes: input.diagnosticNotes,
          diagnosticCause: input.diagnosticCause,
          repairability: input.repairability,
          diagnosticDelay: input.diagnosticDelay,
          diagnosticWarranty: input.diagnosticWarranty,
          diagnosticRisks: input.diagnosticRisks,
          diagnosisChecklist: input.diagnosisChecklist,
          recommendedIntervention: input.recommendedIntervention,
          repairNotes: input.repairNotes,
          workshopPhotos: input.workshopPhotos,
          intervention: input.intervention,
          finalTest: input.finalTest,
          originalRepairId: input.originalRepairId,
          sav: input.sav,
          // Lien public sécurisé + QR généré automatiquement à la création.
          publicAccess: makeRepairPublicAccess(
            { ...created, id, number: docNumber(ws.repairPrefix, ws.nextRepairNumber ?? 1, "REP") },
            ws,
          ),
          // Message public d'accueil visible côté client dès la création.
          messages: [
            {
              id: uid("msg"),
              repairId: id,
              authorType: "system" as const,
              authorName: "Atelier",
              visibility: "client" as const,
              body: "Votre appareil est bien reçu à l'atelier.",
              createdAt: getNowIso(),
              readByClient: false,
              readByStaff: true,
            },
          ],
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
                    customerId: repair.customerId,
                    repairId: id,
                    repairNumber: repair.number,
                    status: "Réparation créée" as AppointmentStatus,
                    confirmed: true,
                    convertedToRepairAt: entry.convertedToRepairAt ?? nowLabel(),
                    updatedAt: nowLabel(),
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
          message: `${actor.name} a créé le dossier ${repair.number}`,
        });
        get().addNotification({
          type: "info",
          title: "Nouveau dossier",
          message: `${repair.number} a été créé par ${actor.name}`,
          targetType: "repair",
          targetId: id,
        });
        return id;
      },
      updateRepair: (id, patch) => {
        if (!get().requirePermission("canEditRepair", "Modifier une réparation")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const existingRepair = get().repairs.find((entry) => entry.id === id);
        if (existingRepair && isTerminalRepairStatus(existingRepair.status) && changesTerminalRepair(patch)) {
          if (!get().requirePermission("canDeleteRepair", "Modifier une réparation terminée")) return;
        }
        set((state) => {
          // Détecter explicitement si le patch fournit un customerId valide
          const patchProvidesCustomer =
            patch.customerId !== undefined && patch.customerId !== null && normalizeText(patch.customerId) !== "";
          const repairs = state.repairs.map((repair) => {
            if (repair.id !== id) return repair;
            const appointmentId = patch.appointmentId ?? repair.appointmentId;
            const linkedAppointment = appointmentId
              ? state.appointments.find((appointment) => appointment.id === appointmentId)
              : undefined;
            // Si l'utilisateur change explicitement de client → patch gagne.
            // Sinon, on tente l'appointment puis on retombe sur l'existant.
            const nextCustomerId = patchProvidesCustomer
              ? getValidCustomerId(patch.customerId, state.customers, repair.customerId)
              : getValidCustomerId(
                  linkedAppointment?.customerId ?? repair.customerId,
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
            const statusChanged = patch.status !== undefined && patch.status !== repair.status;
            if (statusChanged) changes.push(`statut : ${patch.status}`);
            if (patch.intakeCondition !== undefined) changes.push("état d'entrée");
            const nextClosedAt =
              statusChanged && (patch.status === "Rendu" || patch.status === "Clôturé")
                ? nowLabel()
                : patch.status && patch.status !== "Rendu" && patch.status !== "Clôturé"
                  ? undefined
                  : (patch.closedAt ?? repair.closedAt);
            const nextLaborPrice =
              patch.laborPrice === undefined
                ? patch.amount === undefined
                  ? repair.laborPrice
                  : clampMoney(patch.amount)
                : clampMoney(patch.laborPrice);
            // Sur changement de statut : message public automatique côté client.
            const autoMessageBody = statusChanged ? publicStatusMessage(String(patch.status)) : null;
            const nextMessages =
              autoMessageBody && !patch.messages
                ? [
                    ...(repair.messages ?? []),
                    {
                      id: uid("msg"),
                      repairId: repair.id,
                      authorType: "system" as const,
                      authorName: "Atelier",
                      visibility: "client" as const,
                      body: autoMessageBody,
                      createdAt: getNowIso(),
                      readByClient: false,
                      readByStaff: true,
                    },
                  ]
                : (patch.messages ?? repair.messages);
            const nextRepair = normalizeRepair(
              {
                ...repair,
                ...patch,
                customerId: nextCustomerId,
                appointmentId,
                closedAt: nextClosedAt,
                laborPrice: nextLaborPrice,
                amount: clampMoney((nextLaborPrice ?? 0) + repairPartsTotal(patch.parts ?? repair.parts)),
                messages: nextMessages,
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
            if (!linkedRepair) return appointment;
            // Propage le client de la réparation vers le rendez-vous lié pour
            // éviter qu'un ancien "Client comptoir" reste affiché côté RDV.
            const nextCustomerId =
              linkedRepair.customerId && linkedRepair.customerId !== appointment.customerId
                ? linkedRepair.customerId
                : appointment.customerId;
            return {
              ...appointment,
              customerId: nextCustomerId,
              repairId: linkedRepair.id,
              status: "Réparation créée" as AppointmentStatus,
              confirmed: true,
            };
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
          message: `${actor.name} a modifié le dossier ${repair?.number ?? id}`,
        });
      },
      addRepairMessage: (repairId, input) => {
        const body = normalizeText(input.body).trim();
        if (!body) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const authorType = input.authorType ?? "staff";
        const id = uid("msg");
        const message: RepairMessage = {
          id,
          repairId,
          authorType,
          authorName: normalizeText(
            input.authorName,
            authorType === "client" ? "Client" : authorType === "system" ? "Atelier" : actor.name,
          ),
          visibility: input.visibility,
          body,
          createdAt: getNowIso(),
          readByClient: authorType === "client",
          readByStaff: authorType === "staff" || authorType === "system",
        };
        const historyLabel =
          authorType === "client"
            ? null
            : input.visibility === "internal"
              ? `Note interne ajoutée par ${message.authorName}`
              : `Note client publiée par ${message.authorName}`;
        set((state) => ({
          repairs: state.repairs.map((repair) =>
            repair.id === repairId
              ? {
                  ...repair,
                  messages: [...(repair.messages ?? []), message],
                  history: historyLabel ? [...repair.history, historyLabel] : repair.history,
                }
              : repair,
          ),
        }));
        return id;
      },
      markRepairMessagesRead: (repairId, side) => {
        set((state) => ({
          repairs: state.repairs.map((repair) => {
            if (repair.id !== repairId) return repair;
            const messages = repair.messages ?? [];
            const hasUnread = messages.some((message) =>
              side === "client" ? !message.readByClient : !message.readByStaff,
            );
            if (!hasUnread) return repair;
            return {
              ...repair,
              messages: messages.map((message) =>
                side === "client" ? { ...message, readByClient: true } : { ...message, readByStaff: true },
              ),
            };
          }),
        }));
      },
      findRepairByPublicToken: (token) => {
        const clean = normalizeText(token).trim();
        if (!clean) return undefined;
        return get().repairs.find(
          (repair) => repair.publicAccess?.token === clean && repair.publicAccess?.active !== false,
        );
      },
      ensureRepairPublicAccess: (repairId) => {
        const target = get().repairs.find((repair) => repair.id === repairId);
        if (!target) return undefined;
        const access = makeRepairPublicAccess(target, get().workshopSettings ?? defaultWorkshopSettings);
        if (target.publicAccess?.token === access.token && target.publicAccess?.url === access.url) {
          return target.publicAccess;
        }
        set((state) => ({
          repairs: state.repairs.map((repair) =>
            repair.id === repairId &&
            (repair.publicAccess?.token !== access.token || repair.publicAccess?.url !== access.url)
              ? { ...repair, publicAccess: access }
              : repair,
          ),
        }));
        return access;
      },
      clientRespondToQuote: (quoteId, decision) => {
        const quote = get().quotes.find((q) => q.id === quoteId);
        if (!quote) return;
        set((state) => ({
          quotes: state.quotes.map((q) => (q.id === quoteId ? { ...q, status: decision } : q)),
          repairs: quote.repairId
            ? state.repairs.map((repair) => {
                if (repair.id !== quote.repairId) return repair;
                const note =
                  decision === "Accepté"
                    ? `Devis accepté par le client : ${quote.number}`
                    : `Devis refusé par le client : ${quote.number}`;
                const sysMessage: RepairMessage = {
                  id: uid("msg"),
                  repairId: repair.id,
                  authorType: "client",
                  authorName: "Client",
                  visibility: "client",
                  body: decision === "Accepté" ? "J'accepte le devis." : "Je refuse le devis.",
                  createdAt: getNowIso(),
                  readByClient: true,
                  readByStaff: false,
                };
                return {
                  ...repair,
                  status: decision === "Accepté" ? ("Devis accepté" as RepairStatus) : repair.status,
                  history: [...repair.history, note],
                  messages: [...(repair.messages ?? []), sysMessage],
                };
              })
            : state.repairs,
        }));
        get().addAuditLog({
          action: decision === "Accepté" ? "quote.accepted" : "quote.refused",
          targetType: "quote",
          targetId: quoteId,
          message: `Le client a ${decision === "Accepté" ? "accepté" : "refusé"} le devis ${quote.number}`,
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
          const sales = state.sales
            .filter((sale) => sale.repairId !== id || sale.status !== "Rattachée")
            .map((sale) => (sale.repairId === id ? { ...sale, repairId: undefined } : sale));
          const documents = state.documents.filter(
            (document) => document.repairId !== id || !["intake", "internal", "summary"].includes(document.type),
          );
          const selectedSaleId = sales.some((sale) => sale.id === state.selectedSaleId)
            ? state.selectedSaleId
            : (sales[0]?.id ?? "");
          const selectedDocumentId = documents.some((document) => document.id === state.selectedDocumentId)
            ? state.selectedDocumentId
            : (documents[0]?.id ?? "");
          return {
            appointments: state.appointments
              .filter((a) => a.repairId !== id || a.type !== "repair_pickup")
              .map((appointment) =>
                deletedRepair?.appointmentId === appointment.id || appointment.repairId === id
                  ? { ...appointment, repairId: undefined, status: "Arrivé" as AppointmentStatus }
                  : appointment,
              ),
            customers: deriveCustomers(state.customers, repairs, state.payments),
            documents,
            repairs,
            selectedDocumentId,
            sales,
            selectedRepairId: repairs[0]?.id ?? "",
            selectedSaleId,
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
      appendRepairHistory: (id, event, metadata) => {
        const label = normalizeText(event);
        if (!label) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((state) => ({
          repairs: state.repairs.map((repair) =>
            repair.id === id ? { ...repair, history: [...repair.history, label], ...updateActorFields(actor) } : repair,
          ),
        }));
        const repair = get().repairs.find((entry) => entry.id === id);
        get().addAuditLog({
          action: "repair.workflow_event",
          targetType: "repair",
          targetId: id,
          message: `${actor.name} - ${repair?.number ?? id} : ${label}`,
          metadata,
        });
      },
      validateRepairFinalTest: (id, items, comment) => {
        if (!get().requirePermission("canChangeRepairStatus", "Valider le test final")) return;
        const repair = get().repairs.find((entry) => entry.id === id);
        if (!repair) return;
        const cleaned = normalizeChecklistItems(items);
        const cleanComment = normalizeText(comment);
        const blocking = cleaned.some((item) => item.result === "Défaut constaté" || item.result === "KO");
        const missingUntestedNote = cleaned.some(
          (item) => item.result === "Non testé" && !normalizeText(item.comment) && !cleanComment,
        );
        if (blocking || missingUntestedNote) {
          get().addNotification({
            type: "warning",
            title: blocking ? "Défaut constaté" : "Note requise",
            message: blocking
              ? `${repair.number} contient un défaut constaté : corrigez ou indiquez une exception atelier.`
              : `${repair.number} contient un test non testé : ajoutez une note globale ou une note sur la ligne.`,
            targetType: "repair",
            targetId: id,
          });
          return;
        }
        const actor = get().currentUser ?? defaultCurrentUser;
        set((state) => ({
          repairs: state.repairs.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  finalTest: {
                    items: cleaned,
                    status: "Test final validé",
                    comment: cleanComment || undefined,
                    validatedAt: getNowIso(),
                    validatedBy: actor.name,
                    outcomeAt: getNowIso(),
                    outcomeBy: actor.name,
                  },
                  history: [...entry.history, "Test final validé"],
                  ...updateActorFields(actor),
                }
              : entry,
          ),
        }));
        get().addAuditLog({
          action: "repair.final_test_validated",
          targetType: "repair",
          targetId: id,
          message: `${actor.name} a validé le test final de ${repair.number}`,
        });
        get().addRepairMessage(id, {
          visibility: "client",
          authorType: "system",
          authorName: "Atelier",
          body: "Votre appareil est prêt à être récupéré.",
        });
        get().changeRepairStatus(id, "Prêt");
      },
      markRepairTestImpossible: (id, reason) => {
        if (!get().requirePermission("canChangeRepairStatus", "Déclarer le test impossible")) return;
        const cleanReason = normalizeText(reason);
        const repair = get().repairs.find((entry) => entry.id === id);
        if (!repair || !cleanReason) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((state) => ({
          repairs: state.repairs.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  finalTest: {
                    items: normalizeChecklistItems(entry.finalTest?.items),
                    status: "Test impossible",
                    comment: cleanReason,
                    testImpossibleReason: cleanReason,
                    testImpossibleAt: getNowIso(),
                    testImpossibleBy: actor.name,
                    outcomeAt: getNowIso(),
                    outcomeBy: actor.name,
                  },
                  history: [...entry.history, `Test final impossible : ${cleanReason}`],
                  ...updateActorFields(actor),
                }
              : entry,
          ),
        }));
        get().addAuditLog({
          action: "repair.final_test_impossible",
          targetType: "repair",
          targetId: id,
          message: `${actor.name} a déclaré le test final impossible pour ${repair.number}`,
          metadata: { reason: cleanReason },
        });
        get().changeRepairStatus(id, "Prêt");
      },
      setRepairWorkshopOutcome: (id, outcome, note = "") => {
        if (!get().requirePermission("canChangeRepairStatus", "Changer l'état atelier")) return;
        const repair = get().repairs.find((entry) => entry.id === id);
        if (!repair) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const cleanNote = normalizeText(note);
        if ((outcome === "Test impossible" || outcome === "Test refusé par le client") && !cleanNote) {
          get().addNotification({
            type: "warning",
            title: "Note requise",
            message: `${outcome} : ajoutez la raison au dossier.`,
            targetType: "repair",
            targetId: id,
          });
          return;
        }
        const nextStatus: RepairStatus =
          outcome === "Pièce en attente" ? "En attente" : outcome === "Irréparable" ? "Irréparable" : "Prêt";
        const now = getNowIso();
        const readyOutcomes: RepairFinalTestStatus[] = [
          "Téléphone prêt",
          "Test final validé",
          "Test non applicable",
          "Test impossible",
          "Test refusé par le client",
        ];
        const clientMessage =
          outcome === "Pièce en attente"
            ? "Nous attendons une pièce pour poursuivre votre réparation."
            : outcome === "Irréparable"
              ? "Après diagnostic, votre appareil est considéré comme irréparable."
              : "Votre appareil est prêt à être récupéré.";
        set((state) => ({
          repairs: state.repairs.map((entry) => {
            if (entry.id !== id) return entry;
            const finalTest: RepairFinalTest = {
              ...entry.finalTest,
              items: normalizeChecklistItems(entry.finalTest?.items),
              status: outcome,
              comment: cleanNote || entry.finalTest?.comment,
              validatedAt: outcome === "Test final validé" ? now : entry.finalTest?.validatedAt,
              validatedBy: outcome === "Test final validé" ? actor.name : entry.finalTest?.validatedBy,
              testImpossibleReason: outcome === "Test impossible" ? cleanNote : entry.finalTest?.testImpossibleReason,
              testImpossibleAt: outcome === "Test impossible" ? now : entry.finalTest?.testImpossibleAt,
              testImpossibleBy: outcome === "Test impossible" ? actor.name : entry.finalTest?.testImpossibleBy,
              outcomeAt: now,
              outcomeBy: actor.name,
            };
            const messages =
              readyOutcomes.includes(outcome) || outcome === "Pièce en attente" || outcome === "Irréparable"
                ? [
                    ...(entry.messages ?? []),
                    {
                      id: uid("msg"),
                      repairId: entry.id,
                      authorType: "system" as const,
                      authorName: "Atelier",
                      visibility: "client" as const,
                      body: clientMessage,
                      createdAt: now,
                      readByClient: false,
                      readByStaff: true,
                    },
                  ]
                : entry.messages;
            return {
              ...entry,
              status: nextStatus,
              subStatus:
                outcome === "Pièce en attente"
                  ? "Pièce en attente"
                  : outcome === "Irréparable"
                    ? "Irréparable"
                    : entry.subStatus,
              blockReason:
                outcome === "Pièce en attente"
                  ? "Pièce en attente"
                  : outcome === "Irréparable"
                    ? "Irréparable"
                    : entry.blockReason,
              repairability: outcome === "Irréparable" ? "Non" : entry.repairability,
              finalTest,
              messages,
              history: [
                ...entry.history,
                cleanNote ? `${outcome} : ${cleanNote}` : outcome,
                nextStatus === "Prêt" && entry.status !== "Prêt" ? "Dossier prêt" : "",
              ].filter(Boolean),
              ...updateActorFields(actor),
            };
          }),
          customers: state.customers,
        }));
        get().addAuditLog({
          action: "repair.workshop_outcome",
          targetType: "repair",
          targetId: id,
          message: `${actor.name} a indiqué "${outcome}" sur ${repair.number}`,
          metadata: { outcome, note: cleanNote },
        });
        get().addNotification({
          type: nextStatus === "Irréparable" ? "warning" : nextStatus === "Prêt" ? "success" : "info",
          title: "Atelier",
          message: `${repair.number} — ${outcome}`,
          targetType: "repair",
          targetId: id,
        });
      },
      changeRepairStatus: (id, status) => {
        if (!get().requirePermission("canChangeRepairStatus", "Changer le statut")) return;
        const state = get();
        const actor = state.currentUser ?? defaultCurrentUser;
        const previous = state.repairs.find((r) => r.id === id);
        if (!previous) return;
        if (previous.status === status) return;
        if (
          isTerminalRepairStatus(previous.status) &&
          !get().requirePermission("canDeleteRepair", "Changer un dossier terminé")
        ) {
          return;
        }
        const statusEvent = (() => {
          switch (status) {
            case "Diagnostic":
              return "Diagnostic démarré";
            case "En attente":
              return "Dossier mis en attente";
            case "Devis accepté":
              return "Devis accepté";
            case "En réparation":
              return "Dossier passé en réparation";
            case "Test final":
              return "Test final en cours";
            case "Prêt":
              return "Dossier prêt";
            case "Rendu":
              return "Dossier rendu au client";
            case "Irréparable":
              return "Dossier marqué irréparable";
            case "SAV":
              return "Dossier SAV ouvert";
            case "Clôturé":
              return "Dossier clôturé";
            case "Annulé":
              return "Dossier annulé";
            default:
              return `Statut changé : ${status}`;
          }
        })();

        set((current) => ({
          repairs: current.repairs.map((repair) =>
            repair.id === id
              ? {
                  ...repair,
                  status,
                  closedAt:
                    status === "Rendu" || status === "Clôturé"
                      ? nowLabel()
                      : status === "Annulé" || status === "Irréparable"
                        ? repair.closedAt
                        : undefined,
                  history: [...repair.history, statusEvent],
                  ...updateActorFields(actor),
                }
              : repair,
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
          title: "Statut dossier",
          message: `${previous.number} est passé en ${status}`,
          targetType: "repair",
          targetId: id,
        });
      },
      addPartToRepair: (repairId, stockItemId, quantity = 1) => {
        if (!get().requirePermission("canUseStockItem", "Utiliser une pièce")) return false;
        const wanted = clampQuantity(quantity);
        if (wanted <= 0) return false;
        const state = get();
        const actor = state.currentUser ?? defaultCurrentUser;
        const item = state.stockItems.find((stockItem) => stockItem.id === stockItemId);
        const repair = state.repairs.find((entry) => entry.id === repairId);
        // Ajouter une pièce au dossier atelier la sort immédiatement du stock disponible.
        if (!repair || !item || item.active === false || item.repairEnabled === false || item.stock < wanted)
          return false;
        const selectedLot = pickStockLotForQuantity(state, item, wanted);
        set((current) => {
          const currentItem = current.stockItems.find((stockItem) => stockItem.id === stockItemId);
          const currentRepair = current.repairs.find((entry) => entry.id === repairId);
          if (!currentRepair || !currentItem) return current;
          const clientSalePrice = getStockClientPrice(currentItem, current.priceBookItems);
          const lotInvoice = selectedLot?.supplierInvoiceId
            ? current.supplierInvoices.find((invoice) => invoice.id === selectedLot.supplierInvoiceId)
            : undefined;

          const repairs = current.repairs.map((repair) => {
            if (repair.id !== repairId) return repair;
            const existing = repair.parts.find(
              (part) =>
                part.stockItemId === stockItemId &&
                (part.supplierInvoiceLineId || "") ===
                  (selectedLot?.supplierInvoiceLineId || currentItem.originSupplierInvoiceLineId || ""),
            );
            const parts = existing
              ? repair.parts.map((part) =>
                  part.stockItemId === stockItemId &&
                  (part.supplierInvoiceLineId || "") ===
                    (selectedLot?.supplierInvoiceLineId || currentItem.originSupplierInvoiceLineId || "")
                    ? { ...part, quantity: part.quantity + wanted, stockDecremented: true }
                    : part,
                )
              : [
                  ...repair.parts,
                  {
                    stockItemId: currentItem.id,
                    name: currentItem.displayName || currentItem.name,
                    reference: currentItem.sku || currentItem.reference,
                    sku: currentItem.sku,
                    internalCode: currentItem.internalCode,
                    categoryName: currentItem.categoryName,
                    purchasePrice: currentItem.averagePurchasePrice ?? currentItem.purchasePrice,
                    salePrice: clientSalePrice,
                    quantity: wanted,
                    confirmed: false, // Réservée pour le dossier (pas encore "utilisée")
                    stockDecremented: true, // …mais le stock disponible est décrémenté dès l'ajout.
                    margin: clientSalePrice - currentItem.purchasePrice,
                    currency: repair.currency,
                    supplier:
                      selectedLot?.supplierName ||
                      currentItem.primarySupplier ||
                      currentItem.supplier ||
                      "Non renseigné",
                    supplierId: currentItem.primarySupplierId,
                    purchaseId: selectedLot?.purchaseId || currentItem.originPurchaseId,
                    supplierInvoiceId: selectedLot?.supplierInvoiceId || currentItem.originSupplierInvoiceId,
                    supplierInvoiceNumber:
                      selectedLot?.invoiceNumber ||
                      lotInvoice?.invoiceNumber ||
                      currentItem.originSupplierInvoiceNumber,
                    supplierInvoiceLineId:
                      selectedLot?.supplierInvoiceLineId || currentItem.originSupplierInvoiceLineId,
                    modelName: currentItem.compatibleModels?.[0],
                    modelId: currentItem.modelIds?.[0],
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
                `Pièce utilisée depuis le stock : ${currentItem.displayName || currentItem.name} x${wanted} (stock -${wanted})`,
              ],
            };
          });

          // Décrément immédiat du stock disponible : ajouter une pièce = la sortir du stock.
          const stockItems = current.stockItems.map((stockItem) =>
            stockItem.id === stockItemId
              ? {
                  ...stockItem,
                  quantity: Math.max(0, stockItem.quantity - wanted),
                  stock: Math.max(0, stockItem.stock - wanted),
                }
              : stockItem,
          );
          return { repairs, stockItems };
        });
        get().addAuditLog({
          action: "stock.item_used",
          targetType: "stock",
          targetId: stockItemId,
          message: `${actor.name} a sorti ${item.name} du stock pour un dossier`,
          metadata: { repairId, quantity: wanted },
        });
        const afterItem = get().stockItems.find((stockItem) => stockItem.id === stockItemId);
        if (afterItem) {
          get().createStockMovement({
            stockItemId,
            movementType: "repair_part_used",
            quantityDelta: -wanted,
            quantityBefore: item.stock,
            quantityAfter: afterItem.stock,
            reason: `Sortie réparation dossier ${repair.number}`,
            sourceModule: "atelier_reparation",
            sourceId: repairId,
            linkedRepairId: repairId,
            linkedPurchaseId: selectedLot?.purchaseId || item.originPurchaseId,
            linkedSupplierInvoiceId: selectedLot?.supplierInvoiceId || item.originSupplierInvoiceId,
            linkedSupplierInvoiceLineId: selectedLot?.supplierInvoiceLineId || item.originSupplierInvoiceLineId,
          });
        }
        if (afterItem && afterItem.stock <= afterItem.threshold) {
          get().addNotification({
            type: "warning",
            title: "Stock bas",
            message: `${afterItem.name} est sous le seuil d'alerte`,
            targetType: "stock",
            targetId: stockItemId,
          });
        }
        return true;
      },
      confirmPartUsage: (repairId: string, stockItemId: string) => {
        if (!get().requirePermission("canUseStockItem", "Confirmer une pièce")) return false;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((current) => {
          const repair = current.repairs.find((r) => r.id === repairId);
          const part = repair?.parts.find((p) => p.stockItemId === stockItemId);
          if (!repair || !part || part.confirmed) return current;
          // Le stock est décrémenté dès l'ajout : on ne re-décrémente pas ici (sinon double comptage).
          const alreadyDecremented = part.stockDecremented === true;

          const stockItem = current.stockItems.find((s) => s.id === stockItemId);
          if (!stockItem || (!alreadyDecremented && stockItem.stock < part.quantity)) return current;

          const nextRepairs = current.repairs.map((r) =>
            r.id === repairId
              ? {
                  ...r,
                  parts: r.parts.map((p) => (p.stockItemId === stockItemId ? { ...p, confirmed: true } : p)),
                  history: [...r.history, `Utilisation confirmée : ${part.name} x${part.quantity}`],
                }
              : r,
          );

          const nextStock = alreadyDecremented
            ? current.stockItems
            : current.stockItems.map((s) =>
                s.id === stockItemId
                  ? {
                      ...s,
                      quantity: Math.max(0, s.quantity - part.quantity),
                      stock: Math.max(0, s.stock - part.quantity),
                    }
                  : s,
              );

          const audit = {
            action: "stock.item_used",
            targetType: "stock",
            targetId: stockItemId,
            message: `${actor.name} a utilisé ${part.name} dans ${repair.number}`,
            metadata: { repairId, quantity: part.quantity },
          };
          const lowStockNotification =
            !alreadyDecremented && nextStock.find((entry) => entry.id === stockItemId && entry.stock <= entry.threshold)
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
        const alreadyPaid = state.payments.some(
          (payment) => payment.repairId === repairId && payment.status === "Payé",
        );
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
        const alreadyPaid = state.payments.some(
          (payment) => payment.repairId === repairId && payment.status === "Payé",
        );
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
              ? {
                  ...item,
                  quantity: Math.max(0, item.quantity - line.quantity),
                  stock: Math.max(0, item.stock - line.quantity),
                }
              : item,
          ),
        }));
        const afterItem = get().stockItems.find((item) => item.id === line.stockItemId);
        if (afterItem) {
          get().createStockMovement({
            stockItemId: line.stockItemId,
            movementType: "repair_part_used",
            quantityDelta: -line.quantity,
            quantityBefore: stockItem.stock,
            quantityAfter: afterItem.stock,
            reason: `Accessoire remis dossier ${repair.number}`,
            sourceModule: "atelier_reparation",
            sourceId: repairId,
            linkedRepairId: repairId,
          });
        }
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

          // On restaure le stock dès lors qu'il avait été décrémenté (réservé à l'ajout OU confirmé).
          const wasDecremented = currentPart.stockDecremented === true || currentPart.confirmed === true;
          const nextStock = wasDecremented
            ? current.stockItems.map((item) =>
                item.id === stockItemId
                  ? {
                      ...item,
                      quantity: item.quantity + currentPart.quantity,
                      stock: item.stock + currentPart.quantity,
                    }
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
        if (part.stockDecremented === true || part.confirmed === true) {
          const afterItem = get().stockItems.find((item) => item.id === stockItemId);
          const beforeStock = afterItem ? Math.max(0, afterItem.stock - part.quantity) : 0;
          get().createStockMovement({
            stockItemId,
            movementType: "reservation_released",
            quantityDelta: part.quantity,
            quantityBefore: beforeStock,
            quantityAfter: afterItem?.stock ?? beforeStock + part.quantity,
            reason: `Pièce retirée du dossier ${repair.number}`,
            sourceModule: "atelier_reparation",
            sourceId: repairId,
            linkedRepairId: repairId,
          });
        }
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
        // Devis non-brouillon : interdiction de créer vide ou à montant nul.
        if (status !== "Brouillon") {
          if (!usableLines.length || lineTotal <= 0) return "";
        }

        const id = uid("quote");
        const quoteBillingConfig = getWorkshopCountryConfig(
          input.billingCountry ?? repairForQuote?.billingCountry ?? ws.country,
        );
        const currency = input.currency ?? repairForQuote?.currency ?? quoteBillingConfig.currency;
        const quote = normalizeQuote(
          {
            ...input,
            id,
            billingCountry: quoteBillingConfig.country,
            currency,
            locale: (currency === "CHF" ? "fr-CH" : "fr-FR") as WorkshopLocale,
            number: docNumber(ws.quotePrefix, ws.nextQuoteNumber ?? 1, "DEV"),
            customerId: candidateCustomerId,
            ...actorFields(actor),
          },
          state.customers,
          state.repairs,
        );
        const shouldLockQuote = quote.status === "Accepté" || quote.status === "Facturé";
        const quoteSnapshot = shouldLockQuote
          ? createLegalDocumentSnapshot({
              type: "quote",
              number: quote.number,
              status: quote.status,
              version: 1,
              currency: quote.currency,
              country: quote.billingCountry,
              locale: quote.locale,
              workshop: getBillingWorkshopInfo(ws, quote.billingCountry),
              customer,
              repair: repairForQuote,
              lines: quote.lines,
              generatedBy: actor.name,
            })
          : undefined;
        const storedQuote = shouldLockQuote
          ? { ...quote, version: 1, lockedAt: getNowIso(), lockedReason: "Devis validé", snapshot: quoteSnapshot }
          : { ...quote, version: 1 };
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
          quotes: [storedQuote, ...state.quotes],
          repairs: state.repairs.map((repair) =>
            repair.id === quote.repairId
              ? {
                  ...repair,
                  status:
                    quote.status === "Envoyé" &&
                    !["Prêt", "Rendu", "Clôturé", "Annulé", "Irréparable"].includes(repair.status)
                      ? ("Devis envoyé" as RepairStatus)
                      : repair.status,
                  subStatus: quote.status === "Envoyé" ? ("Devis envoyé" as RepairSubStatus) : repair.subStatus,
                  quoteId: repair.quoteId ?? id,
                  quoteIds: uniqueIds([...(repair.quoteIds ?? []), repair.quoteId, id]),
                  history: [
                    ...repair.history,
                    quote.status === "Envoyé" ? `Devis envoyé : ${quote.number}` : `Devis créé : ${quote.number}`,
                  ],
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
              version: storedQuote.version,
              lockedAt: storedQuote.lockedAt,
              lockedReason: storedQuote.lockedReason,
              snapshot: storedQuote.snapshot,
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
      updateQuote: (id, patch) => {
        const nextStatus = patch.status ? normalizeQuoteStatus(patch.status) : undefined;
        const required = nextStatus === "Accepté" ? "canAcceptQuote" : "canEditQuote";
        if (!get().requirePermission(required, "Modifier un devis")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const previousStatus = get().quotes.find((q) => q.id === id)?.status;
        const currentQuote = get().quotes.find((q) => q.id === id);
        if (isLegalDocumentLocked(currentQuote) && changesImmutableFields(patch, mutableQuoteKeysAfterLock)) {
          get().addNotification({
            type: "warning",
            title: "Devis verrouillé",
            message: `${currentQuote?.number ?? id} est figé : créez une nouvelle version pour modifier le contenu.`,
            targetType: "quote",
            targetId: id,
          });
          get().addAuditLog({
            action: "quote.update_blocked",
            targetType: "quote",
            targetId: id,
            message: `${actor.name} a tenté de modifier le devis verrouillé ${currentQuote?.number ?? id}`,
          });
          return;
        }
        set((state) => {
          const previous = state.quotes.find((quote) => quote.id === id);
          const quotes = state.quotes.map((quote) => {
            if (quote.id !== id) return quote;
            const repair = patch.repairId ? state.repairs.find((entry) => entry.id === patch.repairId) : undefined;
            const nextQuote = {
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
            if (!quote.snapshot && quote.status !== "Accepté" && nextQuote.status === "Accepté") {
              const customer = state.customers.find((entry) => entry.id === nextQuote.customerId);
              const repairForSnapshot = nextQuote.repairId
                ? state.repairs.find((entry) => entry.id === nextQuote.repairId)
                : undefined;
              const workshop = getBillingWorkshopInfo(
                state.workshopSettings ?? defaultWorkshopSettings,
                nextQuote.billingCountry,
              );
              const snapshot = createLegalDocumentSnapshot({
                type: "quote",
                number: nextQuote.number,
                status: nextQuote.status,
                version: nextQuote.version ?? 1,
                currency: nextQuote.currency,
                country: nextQuote.billingCountry,
                locale: nextQuote.locale,
                workshop,
                customer,
                repair: repairForSnapshot,
                lines: nextQuote.lines,
                generatedBy: actor.name,
                signature: repairForSnapshot?.intakeCondition?.signatureDataUrl
                  ? {
                      name: repairForSnapshot.intakeCondition.signerName,
                      signedAt:
                        repairForSnapshot.intakeCondition.signatureSignedAt ||
                        repairForSnapshot.intakeCondition.signedAt,
                      dataUrl: repairForSnapshot.intakeCondition.signatureDataUrl,
                    }
                  : undefined,
              });
              return {
                ...nextQuote,
                version: nextQuote.version ?? 1,
                lockedAt: getNowIso(),
                lockedReason: "Devis accepté",
                snapshot,
              };
            }
            return nextQuote;
          });
          const updated = quotes.find((quote) => quote.id === id);
          const repairs =
            updated && previous?.status !== "Accepté" && updated.status === "Accepté" && updated.repairId
              ? state.repairs.map((repair) =>
                  repair.id === updated.repairId
                    ? {
                        ...repair,
                        status: "Devis accepté" as RepairStatus,
                        quoteIds: uniqueIds([...(repair.quoteIds ?? []), repair.quoteId, updated.id]),
                        history: [...repair.history, `Devis accepté : ${updated.number}`],
                      }
                    : repair,
                )
              : state.repairs;
          const documents = updated?.snapshot
            ? state.documents.map((document) =>
                document.quoteId === id
                  ? {
                      ...document,
                      version: updated.version,
                      lockedAt: updated.lockedAt,
                      lockedReason: updated.lockedReason,
                      snapshot: updated.snapshot,
                    }
                  : document,
              )
            : state.documents;
          return { documents, quotes, repairs: syncRepairQuoteIds(repairs, quotes) };
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
      deleteQuote: (id) => {
        if (!get().requirePermission("canEditQuote", "Supprimer un devis")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const deleted = get().quotes.find((quote) => quote.id === id);
        if (isLegalDocumentLocked(deleted)) {
          get().addNotification({
            type: "warning",
            title: "Suppression bloquée",
            message: `${deleted?.number ?? id} est verrouillé : créez une nouvelle version ou une annulation.`,
            targetType: "quote",
            targetId: id,
          });
          get().addAuditLog({
            action: "quote.delete_blocked",
            targetType: "quote",
            targetId: id,
            message: `${actor.name} a tenté de supprimer le devis verrouillé ${deleted?.number ?? id}`,
          });
          return;
        }
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
        });
      },
      addQuoteLine: (quoteId) => {
        if (isLegalDocumentLocked(get().quotes.find((quote) => quote.id === quoteId))) return;
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
        }));
      },
      updateQuoteLine: (quoteId, lineId, patch) => {
        if (isLegalDocumentLocked(get().quotes.find((quote) => quote.id === quoteId))) return;
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
        }));
      },
      deleteQuoteLine: (quoteId, lineId) => {
        if (isLegalDocumentLocked(get().quotes.find((quote) => quote.id === quoteId))) return;
        set((state) => ({
          quotes: state.quotes.map((quote) =>
            quote.id === quoteId && quote.lines.length > 1
              ? { ...quote, lines: quote.lines.filter((line) => line.id !== lineId) }
              : quote,
          ),
        }));
      },
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
        const invoiceBillingConfig = getWorkshopCountryConfig(
          input.billingCountry ?? quote?.billingCountry ?? repair?.billingCountry ?? ws.country,
        );
        const currency = input.currency ?? quote?.currency ?? repair?.currency ?? invoiceBillingConfig.currency;
        const invoice: Invoice = {
          id,
          billingCountry: invoiceBillingConfig.country,
          currency,
          locale: (currency === "CHF" ? "fr-CH" : "fr-FR") as WorkshopLocale,
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
        const workshopForSnapshot = getBillingWorkshopInfo(ws, invoice.billingCountry);
        const invoiceSnapshot = createLegalDocumentSnapshot({
          type: "invoice",
          number: invoice.number,
          status: invoice.status,
          version: 1,
          currency: invoice.currency,
          country: invoice.billingCountry,
          locale: invoice.locale,
          workshop: workshopForSnapshot,
          customer,
          repair,
          lines: invoice.lines,
          generatedBy: actor.name,
        });
        const storedInvoice: Invoice = {
          ...invoice,
          version: 1,
          lockedAt: getNowIso(),
          lockedReason: "Facture générée",
          snapshot: invoiceSnapshot,
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
          invoices: [storedInvoice, ...state.invoices],
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
                  history: [...repair.history, `Facture créée : ${invoice.number}`],
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
              version: storedInvoice.version,
              lockedAt: storedInvoice.lockedAt,
              lockedReason: storedInvoice.lockedReason,
              snapshot: storedInvoice.snapshot,
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
      updateInvoice: (id, patch) => {
        if (!get().requirePermission("canEditInvoice", "Modifier une facture")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const existingInvoice = get().invoices.find((invoice) => invoice.id === id);
        if (isLegalDocumentLocked(existingInvoice) && changesImmutableFields(patch, mutableInvoiceKeysAfterLock)) {
          get().addNotification({
            type: "warning",
            title: "Facture verrouillée",
            message: `${existingInvoice?.number ?? id} est figée : créez une nouvelle version, un avoir ou une annulation.`,
            targetType: "invoice",
            targetId: id,
          });
          get().addAuditLog({
            action: "invoice.update_blocked",
            targetType: "invoice",
            targetId: id,
            message: `${actor.name} a tenté de modifier la facture verrouillée ${existingInvoice?.number ?? id}`,
          });
          return;
        }
        set((state) => ({
          invoices: state.invoices.map((invoice) => {
            if (invoice.id !== id) return invoice;
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
        if (isLegalDocumentLocked(deleted)) {
          get().addNotification({
            type: "warning",
            title: "Suppression bloquée",
            message: `${deleted?.number ?? id} est verrouillée : suppression directe interdite.`,
            targetType: "invoice",
            targetId: id,
          });
          get().addAuditLog({
            action: "invoice.delete_blocked",
            targetType: "invoice",
            targetId: id,
            message: `${actor.name} a tenté de supprimer la facture verrouillée ${deleted?.number ?? id}`,
          });
          return;
        }
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
      markInvoicePaid: (invoiceId, method, note = "") => {
        if (!get().requirePermission("canMarkPaymentPaid", "Indiquer un règlement")) return "";
        const normalizedMethod = normalizeSelectedPaymentMethod(method);
        if (!normalizedMethod) return "";
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
        const repairForStock = invoice.repairId
          ? get().repairs.find((repair) => repair.id === invoice.repairId)
          : undefined;
        const canAutoReady = repairForStock ? hasFinalTestClearance(repairForStock) : false;
        const linesToDecrement = (repairForStock?.repairSaleLines ?? []).filter((line) => !line.stockDecremented);
        for (const line of linesToDecrement) {
          const stockItem = get().stockItems.find((item) => item.id === line.stockItemId);
          if (!stockItem || stockItem.stock < line.quantity) return "";
        }
        const amount = Math.max(0, total - activePaidAmount);
        const paymentId = uid("payment");
        const timestamp = nowLabel();
        const paymentBillingConfig = getWorkshopCountryConfig(invoice.billingCountry);
        const payment: Payment = {
          id: paymentId,
          billingCountry: paymentBillingConfig.country,
          currency: paymentBillingConfig.currency,
          locale: paymentBillingConfig.locale,
          shopId,
          invoiceId,
          customerId: invoice.customerId,
          repairId: invoice.repairId,
          quoteId: invoice.quoteId,
          paymentNumber: docNumber("CONF", ws.nextReceiptNumber ?? 1, "CONF"),
          reference: docNumber("CONF", ws.nextReceiptNumber ?? 1, "CONF"),
          method: normalizedMethod,
          mode: normalizedMethod,
          status: "Payé",
          amount,
          date: timestamp,
          note,
          twintReference: normalizedMethod === "TWINT" ? normalizeText(note) || undefined : undefined,
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
                  paymentMethod: normalizedMethod,
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
              status: canAutoReady ? ("Prêt" as RepairStatus) : repair.status,
              paymentStatus: "Réglée" as Repair["paymentStatus"],
              paymentMethodNote: normalizedMethod,
              repairSaleLines: (repair.repairSaleLines ?? []).map((line) => ({
                ...line,
                status: "paid" as RepairSaleLineStatus,
                stockDecremented: true,
              })),
              history: [
                ...repair.history,
                `Règlement indiqué : ${formatEuro(payment.amount)} (${normalizedMethod})`,
                ...(canAutoReady ? ["Dossier prêt"] : ["Passage en prêt bloqué : test final requis"]),
              ],
            };
          });
          const stockItems = state.stockItems.map((item) => {
            const quantityToRemove = linesToDecrement
              .filter((line) => line.stockItemId === item.id)
              .reduce((sum, line) => sum + line.quantity, 0);
            return quantityToRemove > 0
              ? {
                  ...item,
                  quantity: Math.max(0, item.quantity - quantityToRemove),
                  stock: Math.max(0, item.stock - quantityToRemove),
                }
              : item;
          });
          const sales = invoice.repairId
            ? state.sales.map((sale) =>
                sale.repairId === invoice.repairId && sale.status === "Rattachée"
                  ? {
                      ...sale,
                      status: "Payée" as SaleStatus,
                      paymentMethod: normalizedMethod,
                      paymentId,
                      documentId: `doc_${paymentId}`,
                      paidAt: timestamp,
                    }
                  : sale,
              )
            : state.sales;
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
            sales,
            stockItems,
            customers: deriveCustomers(state.customers, repairs, payments),
            selectedPaymentId: paymentId,
            documents: [
              {
                id: `doc_${paymentId}`,
                shopId,
                type: "payment",
                title: `Confirmation de règlement - ${payment.reference}`,
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
          message: `${actor.name} a indiqué le règlement de la facture ${invoice.number}`,
          metadata: { invoiceId, amount },
        });
        get().addNotification({
          type: "success",
          title: "Règlement indiqué",
          message: `${formatEuro(amount)} indiqué sur ${invoice.number}`,
          targetType: "payment",
          targetId: paymentId,
        });
        return paymentId;
      },
      addPayment: (input) => {
        if (!get().requirePermission("canMarkPaymentPaid", "Créer un paiement")) return "";
        const normalizedMethod = normalizeSelectedPaymentMethod(input.method);
        if (!normalizedMethod) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const id = uid("payment");
        const timestamp = nowLabel();
        const ws = get().workshopSettings;
        const linkedInvoice = input.invoiceId
          ? get().invoices.find((invoice) => invoice.id === input.invoiceId)
          : undefined;
        const linkedRepair = input.repairId ? get().repairs.find((repair) => repair.id === input.repairId) : undefined;
        const paymentBillingConfig = getWorkshopCountryConfig(
          linkedInvoice?.billingCountry ?? linkedRepair?.billingCountry ?? ws.country,
        );
        const payment: Payment = {
          id,
          billingCountry: paymentBillingConfig.country,
          currency: paymentBillingConfig.currency,
          locale: paymentBillingConfig.locale,
          shopId,
          ...input,
          method: normalizedMethod,
          paymentNumber: docNumber("CONF", ws.nextReceiptNumber ?? 1, "CONF"),
          mode: normalizedMethod,
          twintReference:
            normalizedMethod === "TWINT" ? normalizeText(input.twintReference ?? input.note) || undefined : undefined,
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
              title: `Confirmation de règlement - ${payment.paymentNumber}`,
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
          billingCountry: repair.billingCountry,
          currency: repair.currency,
          locale: repair.locale,
          lines: built.lines,
          status: "Envoyée",
          sourceType: "repair",
          sourceNumber: repair.number,
        });
      },
      markRepairAsPaid: (repairId: string, method, note = "") => {
        const state = get();
        const normalizedMethod = normalizeSelectedPaymentMethod(method);
        if (!normalizedMethod) return "";
        const repair = state.repairs.find((r) => r.id === repairId);
        if (!repair) return "";

        // Cas A : Facture existante
        const existingInvoice = state.invoices.find((inv) => inv.repairId === repairId);
        if (existingInvoice) {
          if (existingInvoice.status === "Payée") return "";
          return state.markInvoicePaid(existingInvoice.id, normalizedMethod, note);
        }

        // Cas B : Pas de facture, créer automatiquement
        const invoiceId = state.createInvoiceFromRepair(repairId);
        if (!invoiceId) return "";

        return state.markInvoicePaid(invoiceId, normalizedMethod, note);
      },
      recordRepairSettlement: (repairId, input) => {
        if (!get().requirePermission("canMarkPaymentPaid", "Indiquer un règlement")) return "";
        const isOffert = input.status === "Offert / Garantie / SAV";
        if (!isOffert && !input.confirmExternal) return "";

        const state = get();
        const repair = state.repairs.find((entry) => entry.id === repairId);
        if (!repair?.customerId) return "";

        const actor = state.currentUser ?? defaultCurrentUser;
        const invoice = state.invoices.find((entry) => entry.repairId === repairId);
        const previousStatus =
          repair.paymentStatus ??
          (state.payments.some((payment) => payment.repairId === repairId && payment.status === "Payé")
            ? "Réglée"
            : "À régler");
        const nextRepairStatus: Repair["paymentStatus"] =
          input.status === "Réglé" || isOffert
            ? "Réglée"
            : input.status === "Partiellement réglé"
              ? "Partiellement réglée"
              : "À régler";
        const isNoPayment = input.status === "Non réglé" || isOffert;
        const amount = clampMoney(isNoPayment ? 0 : input.amount);
        const date = normalizeText(input.date, nowLabel());
        const method = isNoPayment ? null : normalizeSelectedPaymentMethod(input.method);
        if (!isNoPayment && !method) return "";
        const paidMethod = amount > 0 ? method : null;
        const externalReference = normalizeText(input.externalReference);
        const note = normalizeText(input.note);
        const ws = state.workshopSettings ?? defaultWorkshopSettings;
        const timestamp = nowLabel();
        const paymentId = amount > 0 ? uid("payment") : "";
        const paymentNumber = amount > 0 ? docNumber("CONF", ws.nextReceiptNumber ?? 1, "CONF") : "";
        const paymentBillingConfig = getWorkshopCountryConfig(repair.billingCountry);
        const payment: Payment | null = paidMethod
          ? {
              id: paymentId,
              billingCountry: paymentBillingConfig.country,
              currency: paymentBillingConfig.currency,
              locale: paymentBillingConfig.locale,
              shopId,
              invoiceId: invoice?.id,
              customerId: repair.customerId,
              repairId,
              quoteId: repair.quoteId,
              paymentNumber,
              reference: externalReference || paymentNumber,
              externalReference: externalReference || undefined,
              method: paidMethod,
              mode: paidMethod,
              status: "Payé",
              amount,
              date,
              note: [
                note,
                "Paiement enregistré manuellement.",
                "Ce document ne remplace pas une facture. La facture reste le document comptable officiel.",
              ]
                .filter(Boolean)
                .join("\n"),
              twintReference: paidMethod === "TWINT" ? externalReference || note || undefined : undefined,
              createdAt: timestamp,
              updatedAt: timestamp,
              createdBy: actor.id,
              createdByName: actor.name,
              updatedBy: actor.id,
              updatedByName: actor.name,
            }
          : null;

        set((current) => {
          const payments = payment ? [payment, ...current.payments] : current.payments;
          const relatedPayments = payments.filter((entry) => entry.repairId === repairId && entry.status === "Payé");
          const paidAmount = relatedPayments.reduce((sum, entry) => sum + entry.amount, 0);
          const invoiceTotalValue = invoice ? invoiceTotal(invoice) : (repair.total ?? repair.amount ?? paidAmount);
          const isPaid = nextRepairStatus === "Réglée" || (invoiceTotalValue > 0 && paidAmount >= invoiceTotalValue);
          const paymentIds = uniqueIds([...(repair.paymentIds ?? []), repair.paymentId, payment?.id]);
          const invoices = current.invoices.map((entry) => {
            if (entry.id !== invoice?.id) return entry;
            return {
              ...entry,
              paymentIds: uniqueIds([...(entry.paymentIds ?? []), payment?.id]),
              paidAmount,
              paidAt: isPaid ? date : entry.paidAt,
              status: isPaid ? ("Payée" as InvoiceStatus) : entry.status === "Payée" ? "Envoyée" : entry.status,
              paymentMethod: nextRepairStatus === "À régler" ? "Non réglée" : (method ?? entry.paymentMethod),
            };
          });
          const repairs = current.repairs.map((entry) => {
            if (entry.id !== repairId) return entry;
            return {
              ...entry,
              paymentId: payment?.id ?? entry.paymentId,
              paymentIds,
              paymentStatus: nextRepairStatus,
              paymentMethodNote: isOffert
                ? `Dossier clôturé sans encaissement — Offert / Garantie / SAV — ${date}`
                : nextRepairStatus === "À régler" || !method
                  ? undefined
                  : `Réglé manuellement — ${method} — ${date}`,
              paymentCustomMethod: input.customMethod || entry.paymentCustomMethod,
              paymentAmount: amount || entry.paymentAmount,
              paymentPaidAt: nextRepairStatus !== "À régler" ? date : entry.paymentPaidAt,
              paymentReference: externalReference || entry.paymentReference,
              paymentRecordedBy: actor.name,
              paymentRecordedOutsideBeharTechPro: nextRepairStatus !== "À régler",
              paymentNote: note || entry.paymentNote,
              settlementReason: isOffert ? "Offert / Garantie / SAV" : entry.settlementReason,
              history: [
                ...entry.history,
                isOffert
                  ? `Dossier clôturé sans encaissement — Offert / Garantie / SAV (${date})`
                  : nextRepairStatus === "À régler"
                    ? `Règlement indiqué : non réglé (${date})`
                    : `Réglé manuellement : ${formatEuro(amount)} (${method ?? "moyen non précisé"})`,
              ],
            };
          });
          return {
            invoices,
            payments,
            repairs,
            customers: deriveCustomers(current.customers, repairs, payments),
            selectedPaymentId: payment?.id ?? current.selectedPaymentId,
            workshopSettings: payment
              ? {
                  ...current.workshopSettings,
                  nextReceiptNumber: normalizeCounter((current.workshopSettings?.nextReceiptNumber ?? 1) + 1),
                  updatedAt: timestamp,
                }
              : current.workshopSettings,
            workshopInfo: payment
              ? asWorkshopInfo({
                  ...current.workshopSettings,
                  nextReceiptNumber: normalizeCounter((current.workshopSettings?.nextReceiptNumber ?? 1) + 1),
                  updatedAt: timestamp,
                } as WorkshopSettings)
              : current.workshopInfo,
            documents: payment
              ? [
                  {
                    id: `doc_${payment.id}`,
                    shopId,
                    type: "payment" as DocumentType,
                    title: `Confirmation de règlement - ${payment.paymentNumber}`,
                    customerId: payment.customerId,
                    repairId,
                    invoiceId: invoice?.id,
                    paymentId: payment.id,
                    createdAt: payment.date,
                  },
                  ...current.documents,
                ]
              : current.documents,
          };
        });

        get().addAuditLog({
          action:
            input.status === "Non réglé"
              ? "payment.settlement.updated"
              : previousStatus === "À régler"
                ? "payment.settlement.created"
                : "payment.settlement.modified",
          targetType: "repair",
          targetId: repairId,
          message: `${actor.name} a indiqué le règlement du dossier ${repair.number}`,
          metadata: {
            auditAction: previousStatus === "À régler" ? "création" : "modification",
            oldStatus: previousStatus,
            newStatus: nextRepairStatus,
            amount,
            method,
            externalReference,
            note,
            paymentId: payment?.id,
            invoiceId: invoice?.id,
          },
        });
        get().addNotification({
          type: nextRepairStatus === "À régler" ? "info" : "success",
          title: "Règlement indiqué",
          message:
            nextRepairStatus === "À régler"
              ? `${repair.number} marqué non réglé`
              : `${repair.number} - réglé manuellement via ${method ?? "moyen non précisé"}`,
          targetType: "repair",
          targetId: repairId,
        });

        return payment?.id || repairId;
      },
      closeDossierWithSettlement: (repairId, input) => {
        const state = get();
        const repair = state.repairs.find((entry) => entry.id === repairId);
        if (!repair) return false;

        // Record settlement if paid or partially paid
        if (input.status !== "Non réglé") {
          const settlementId = state.recordRepairSettlement(repairId, input);
          if (!settlementId) return false;
        } else {
          // For "Non réglé", still record the settlement status
          state.recordRepairSettlement(repairId, {
            ...input,
            amount: 0,
            confirmExternal: true, // Auto-confirm for non-paid
          });
        }

        // Restitution finalise le dossier côté atelier/comptoir.
        state.changeRepairStatus(repairId, "Clôturé");

        // Add specific audit log for closure with settlement
        const actor = state.currentUser ?? defaultCurrentUser;
        get().addAuditLog({
          action: "repair.closed_with_settlement",
          targetType: "repair",
          targetId: repairId,
          message: `${actor.name} a clôturé le dossier ${repair.number} avec règlement ${input.status}`,
          metadata: {
            settlementStatus: input.status,
            amount: input.amount,
            method: input.method,
            customMethod: input.customMethod,
            externalReference: input.externalReference,
          },
        });

        return true;
      },
      updatePaymentStatus: (id, status) => {
        if (status === "Annulé" && !get().requirePermission("canCancelPayment", "Annuler un paiement")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const previousPayment = get().payments.find((entry) => entry.id === id);
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
          metadata: {
            auditAction: status === "Annulé" ? "annulation" : "modification",
            oldStatus: previousPayment?.status,
            newStatus: status,
            amount: payment?.amount ?? previousPayment?.amount,
            method: payment?.method ?? previousPayment?.method,
            externalReference: payment?.externalReference ?? previousPayment?.externalReference,
            note: payment?.note ?? previousPayment?.note,
          },
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
          repairNumber: input.repairNumber,
          appointmentNumber: input.appointmentNumber || `RDV-${String(get().appointments.length + 1).padStart(4, "0")}`,
          clientMode: input.clientMode ?? "existing",
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail,
          deviceType: input.deviceType,
          deviceBrand: input.deviceBrand,
          deviceModel: input.deviceModel,
          imei: input.imei,
          serialNumber: input.serialNumber,
          issueDescription: input.issueDescription || input.issue,
          interventionLabel: input.interventionLabel || input.issueDescription || input.issue,
          customerPrice: input.customerPrice,
          estimatedTotal: input.estimatedTotal ?? input.customerPrice,
          priceStatus: input.priceStatus ?? (input.customerPrice ? "confirmed" : "to_confirm"),
          priceSnapshot: input.priceSnapshot,
          appointmentDate: input.appointmentDate || input.date,
          appointmentTime: input.appointmentTime || input.time,
          appointmentReason: input.appointmentReason,
          convertedToRepairAt: input.convertedToRepairAt,
          createdAt: input.createdAt || nowLabel(),
          updatedAt: input.updatedAt || nowLabel(),
          device: input.device,
          issue: input.issue,
          date: input.appointmentDate || input.date,
          time: input.appointmentTime || input.time,
          duration: input.duration || "30 min",
          channel: input.channel || "Atelier",
          source: input.source || "Atelier",
          technician: input.technician || "Atelier principal",
          notes: input.notes || "",
          status: normalizeAppointmentStatus(input.status, input.confirmed),
          confirmed: ["Confirmé", "Arrivé", "Réparation créée"].includes(
            normalizeAppointmentStatus(input.status, input.confirmed),
          ),
          dayIndex: input.dayIndex ?? 2,
          row: input.row ?? 6,
          color: input.color || "mint",
        };
        set((state) => ({
          appointments: [normalizeAppointment(appointment, state.customers, state.repairs), ...state.appointments],
          selectedAppointmentId: id,
        }));
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
          const patchProvidesCustomer =
            patch.customerId !== undefined && patch.customerId !== null && normalizeText(patch.customerId) !== "";
          const appointments = state.appointments.map((appointment) => {
            if (appointment.id !== id) return appointment;
            const linkedRepair = state.repairs.find((repair) => repair.id === (patch.repairId ?? appointment.repairId));
            // Patch explicite gagne ; sinon réparation liée ; sinon existant.
            const customerId = patchProvidesCustomer
              ? getValidCustomerId(patch.customerId, state.customers, appointment.customerId)
              : getValidCustomerId(
                  linkedRepair?.customerId ?? appointment.customerId,
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
          get().updateRepair(existing.id, {
            appointmentId: appointment.id,
            customerId,
            history: existing.history.includes("Créée depuis rendez-vous")
              ? existing.history
              : [...existing.history, "Créée depuis rendez-vous"],
          });
          get().updateAppointment(appointment.id, {
            repairId: existing.id,
            status: "Réparation créée" as AppointmentStatus,
            confirmed: true,
            convertedToRepairAt: appointment.convertedToRepairAt ?? nowLabel(),
          });
          return existing.id;
        }
        const amount = clampMoney(appointment.estimatedTotal ?? appointment.customerPrice ?? 0);
        const issue =
          appointment.issueDescription || appointment.interventionLabel || appointment.issue || "Diagnostic";
        const repairId = get().addRepair({
          appointmentId: appointment.id,
          customerId,
          device: appointment.device,
          model: appointment.deviceModel || appointment.device,
          deviceType: appointment.deviceType,
          brandName: appointment.deviceBrand,
          deviceModel: appointment.deviceModel,
          imei: appointment.imei || appointment.serialNumber || "",
          issue,
          issueType: appointment.interventionLabel,
          status: "Reçu",
          amount,
          total: amount,
          laborPrice: amount,
          notes: appointment.notes,
          droppedAt: getNowIso(),
          technician: "Atelier principal",
          selectedPriceSnapshot: appointment.priceSnapshot,
          counterPrestations: appointment.interventionLabel
            ? [{ label: appointment.interventionLabel, prixClient: amount }]
            : undefined,
          counterTasks: buildRepairTasksFromIssue(issue),
          history: ["Réparation créée", "Prise en charge créée depuis le rendez-vous"],
        });
        if (repairId) {
          get().updateAppointment(appointment.id, {
            repairId,
            status: "Réparation créée" as AppointmentStatus,
            confirmed: true,
            convertedToRepairAt: nowLabel(),
          });
        }
        return repairId;
      },
      createStockMovement: (input) => {
        const state = get();
        const item = state.stockItems.find((entry) => entry.id === input.stockItemId);
        if (!item) return "";
        const actor = state.currentUser ?? defaultCurrentUser;
        const id = uid("mov");
        const quantityBefore = input.quantityBefore ?? item.stock;
        const quantityAfter = input.quantityAfter ?? Math.max(0, quantityBefore + input.quantityDelta);
        const unitCost = input.unitCost ?? item.purchasePrice;
        const movement: StockMovement = {
          id,
          shopId,
          stockItemId: input.stockItemId,
          partReference: input.partReference ?? item.sku ?? item.reference,
          internalCode: input.internalCode ?? item.internalCode,
          movementType: input.movementType,
          quantityDelta: input.quantityDelta,
          quantityBefore,
          quantityAfter,
          unitCost,
          totalCost: input.totalCost ?? Math.round(unitCost * Math.abs(input.quantityDelta) * 100) / 100,
          reason: input.reason,
          sourceModule: input.sourceModule,
          sourceId: input.sourceId,
          linkedRepairId: input.linkedRepairId,
          linkedReconditioningDeviceId: input.linkedReconditioningDeviceId ?? item.reconditioningFileId,
          linkedSaleId: input.linkedSaleId,
          linkedPurchaseId: input.linkedPurchaseId ?? item.originPurchaseId,
          linkedSupplierInvoiceId: input.linkedSupplierInvoiceId ?? item.originSupplierInvoiceId,
          linkedSupplierInvoiceLineId: input.linkedSupplierInvoiceLineId ?? item.originSupplierInvoiceLineId,
          actorId: actor.id,
          actorName: actor.name,
          createdAt: nowLabel(),
          note: input.note,
          metadata: input.metadata,
        };
        set((current) => ({ stockMovements: [movement, ...current.stockMovements].slice(0, 2000) }));
        publishDomainEvent({ type: "stock.movement_created", movementId: id, occurredAt: movement.createdAt });
        return id;
      },
      addStockItem: (input) => {
        if (!get().requirePermission("canManageStock", "Créer une pièce")) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const id = uid("stock");
        // Si aucun modèle compatible n'est sélectionné, on tente d'en déduire
        // un depuis le nom de la pièce ("Écran iPhone 13" → iPhone 13).
        // Ça évite qu'une pièce reste « Modèles : Non défini » et que sa
        // synchro catalogue retombe sur l'entrée Générique invisible.
        const hasModels = Array.isArray(input.compatibleModels) && input.compatibleModels.length > 0;
        const inferredModel = hasModels ? undefined : inferModelFromPartName(input.name ?? "", input.brandName);
        const enrichedInput = inferredModel
          ? {
              ...input,
              compatibleModels: [inferredModel],
            }
          : input;
        const duplicate = findDuplicateStockItem(get().stockItems, enrichedInput);
        if (duplicate) {
          const stockToAdd = clampQuantity(enrichedInput.quantity ?? enrichedInput.stock);
          get().updateStockItem(duplicate.id, {
            name: enrichedInput.name || enrichedInput.part || duplicate.name,
            part: enrichedInput.name || enrichedInput.part || duplicate.part,
            sku: duplicate.sku || enrichedInput.sku || enrichedInput.reference,
            reference: duplicate.reference || enrichedInput.reference || enrichedInput.sku,
            internalCode: enrichedInput.internalCode || duplicate.internalCode,
            categoryName: enrichedInput.categoryName || enrichedInput.category || duplicate.categoryName,
            category: enrichedInput.categoryName || enrichedInput.category || duplicate.category,
            quality: enrichedInput.quality || duplicate.quality,
            supplier: enrichedInput.supplier || duplicate.supplier,
            primarySupplierId: enrichedInput.primarySupplierId || duplicate.primarySupplierId,
            primarySupplier: enrichedInput.primarySupplier || enrichedInput.supplier || duplicate.primarySupplier,
            purchasePrice:
              enrichedInput.purchasePrice === undefined
                ? duplicate.purchasePrice
                : clampMoney(enrichedInput.purchasePrice),
            lastPurchasePrice:
              enrichedInput.lastPurchasePrice ??
              (enrichedInput.purchasePrice === undefined
                ? duplicate.lastPurchasePrice
                : clampMoney(enrichedInput.purchasePrice)),
            salePrice:
              enrichedInput.salePrice === undefined ? duplicate.salePrice : clampMoney(enrichedInput.salePrice),
            threshold:
              enrichedInput.threshold === undefined ? duplicate.threshold : clampQuantity(enrichedInput.threshold),
            originPurchaseId: enrichedInput.originPurchaseId || duplicate.originPurchaseId,
            originSupplierInvoiceId: enrichedInput.originSupplierInvoiceId || duplicate.originSupplierInvoiceId,
            originSupplierInvoiceNumber:
              enrichedInput.originSupplierInvoiceNumber || duplicate.originSupplierInvoiceNumber,
            originSupplierInvoiceLineId:
              enrichedInput.originSupplierInvoiceLineId || duplicate.originSupplierInvoiceLineId,
          });
          if (stockToAdd > 0) {
            if (input.skipPurchaseLog) {
              const before = get().stockItems.find((entry) => entry.id === duplicate.id) ?? duplicate;
              set((state) => ({
                stockItems: state.stockItems.map((entry) =>
                  entry.id === duplicate.id
                    ? { ...entry, quantity: entry.quantity + stockToAdd, stock: entry.stock + stockToAdd }
                    : entry,
                ),
              }));
              const after = get().stockItems.find((entry) => entry.id === duplicate.id);
              if (after) {
                get().createStockMovement({
                  stockItemId: duplicate.id,
                  movementType: "supplier_purchase_received",
                  quantityDelta: stockToAdd,
                  quantityBefore: before.stock,
                  quantityAfter: after.stock,
                  reason: "Fusion doublon référence",
                  sourceModule: "stock",
                  sourceId: duplicate.id,
                  linkedPurchaseId: after.originPurchaseId,
                  linkedSupplierInvoiceId: after.originSupplierInvoiceId,
                  linkedSupplierInvoiceLineId: after.originSupplierInvoiceLineId,
                });
              }
            } else {
              get().restockItem(duplicate.id, stockToAdd);
            }
          }
          set((state) => ({ selectedStockItemId: duplicate.id }));
          get().addAuditLog({
            action: "stock.duplicate_reference_merged",
            targetType: "stock",
            targetId: duplicate.id,
            message: `${actor.name} a fusionné une référence déjà existante (${duplicate.sku || duplicate.reference})`,
            metadata: {
              reference: enrichedInput.sku || enrichedInput.reference,
              internalCode: enrichedInput.internalCode,
              quantity: stockToAdd,
            },
          });
          return duplicate.id;
        }
        const item = normalizeStockItem({
          id,
          shopId,
          leadTime: enrichedInput.leadTime || "2 à 3 jours",
          ...enrichedInput,
          ...actorFields(actor),
        });
        set((state) => {
          const stockItems = [item, ...state.stockItems];
          return {
            stockItems,
            selectedStockItemId: id,
          };
        });
        get().addAuditLog({
          action: "stock.item_created",
          targetType: "stock",
          targetId: id,
          message: `${actor.name} a créé la pièce ${item.name}`,
        });
        // Traçabilité achat : création d'une pièce avec stock initial = une entrée.
        // (sauf si l'appelant enregistre lui-même l'achat, ex. reconditionnement.)
        let purchaseId = item.originPurchaseId;
        if (!input.skipPurchaseLog && (item.stock ?? 0) > 0 && item.purchasePrice > 0) {
          purchaseId = get().addPurchase({
            kind: item.itemType === "accessory" ? "accessoire" : item.itemType === "product" ? "autre" : "piece",
            source: "Création pièce",
            label: item.name,
            reference: item.sku || item.reference,
            internalCode: item.internalCode,
            category: item.categoryName || item.category,
            compatibleModel: item.compatibleModels?.[0],
            quality: item.quality,
            supplierId: item.primarySupplierId,
            supplier: item.supplier,
            invoiceNumber: item.originSupplierInvoiceNumber,
            quantity: item.stock,
            unitCost: item.purchasePrice,
            stockItemId: id,
            supplierInvoiceId: item.originSupplierInvoiceId,
            supplierInvoiceLineId: item.originSupplierInvoiceLineId,
          });
        }
        if ((item.stock ?? 0) > 0) {
          get().createStockMovement({
            stockItemId: id,
            movementType: "supplier_purchase_received",
            quantityDelta: item.stock,
            quantityBefore: 0,
            quantityAfter: item.stock,
            reason: "Création stock initial",
            sourceModule: "stock",
            sourceId: id,
            linkedPurchaseId: purchaseId,
            linkedSupplierInvoiceId: item.originSupplierInvoiceId,
            linkedSupplierInvoiceLineId: item.originSupplierInvoiceLineId,
            linkedReconditioningDeviceId: item.reconditioningFileId,
          });
        }
        return id;
      },
      resolveStockItemByReference: (reference) => {
        const key = normalizePartReference(reference);
        if (!key) return undefined;
        return get().stockItems.find((item) => stockReferenceMatches(item, key));
      },
      updateStockItem: (id, patch) => {
        if (!get().requirePermission("canManageStock", "Modifier le stock")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        const currentItem = get().stockItems.find((entry) => entry.id === id);
        if (
          currentItem &&
          (patch.sku !== undefined || patch.reference !== undefined || patch.internalCode !== undefined)
        ) {
          const candidate = {
            ...currentItem,
            ...patch,
            sku: patch.sku ?? patch.reference ?? currentItem.sku,
            reference: patch.reference ?? patch.sku ?? currentItem.reference,
            internalCode: patch.internalCode ?? currentItem.internalCode,
          };
          const duplicate = get().stockItems.find(
            (entry) =>
              entry.id !== id && stockReferenceKeys(candidate).some((key) => stockReferenceMatches(entry, key)),
          );
          if (duplicate) {
            get().addNotification({
              type: "warning",
              title: "Référence déjà utilisée",
              message: `${candidate.sku || candidate.reference || candidate.internalCode} existe déjà sur ${duplicate.name}.`,
              targetType: "stock",
              targetId: duplicate.id,
            });
            return;
          }
        }
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
        const state = get();
        const item = state.stockItems.find((entry) => entry.id === id);
        const referencedByDraftSale = state.sales.some(
          (sale) => sale.status === "Brouillon" && sale.lines.some((l) => l.stockItemId === id),
        );
        const referencedByOpenRepair = state.repairs.some((repair) => {
          if (isTerminalRepairStatus(repair.status)) return false;
          const invoiced = state.invoices.some((inv) => inv.repairId === repair.id && inv.status === "Payée");
          if (invoiced) return false;
          return (
            repair.parts.some((p) => p.stockItemId === id) ||
            (repair.repairSaleLines ?? []).some((l) => l.stockItemId === id && l.status !== "paid")
          );
        });
        if (referencedByDraftSale || referencedByOpenRepair) {
          get().addNotification({
            type: "warning",
            title: "Suppression bloquée",
            message: `${item?.name ?? "Cette pièce"} est utilisée dans une vente brouillon ou une réparation en cours. Retirez-la d'abord.`,
            targetType: "stock",
            targetId: id,
          });
          return;
        }
        set((current) => {
          const stockItems = current.stockItems.filter((entry) => entry.id !== id);
          return { stockItems, selectedStockItemId: stockItems[0]?.id ?? "" };
        });
      },
      restockItem: (id, quantity = 5) => {
        if (!get().requirePermission("canManageStock", "Réapprovisionner")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((state) => {
          const stockItems = state.stockItems.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: item.quantity + clampQuantity(quantity),
                  stock: item.stock + clampQuantity(quantity),
                  ...updateActorFields(actor),
                }
              : item,
          );
          return { stockItems };
        });
        const item = get().stockItems.find((entry) => entry.id === id);
        get().addAuditLog({
          action: "stock.quantity_changed",
          targetType: "stock",
          targetId: id,
          message: `${actor.name} a réapprovisionné ${item?.name ?? id}`,
          metadata: { quantity },
        });
        // Traçabilité achat : un réapprovisionnement est une entrée pièce.
        if (item) {
          const purchaseId = get().addPurchase({
            kind: item.itemType === "accessory" ? "accessoire" : item.itemType === "product" ? "autre" : "piece",
            source: "Réapprovisionnement",
            label: item.name,
            reference: item.sku || item.reference,
            internalCode: item.internalCode,
            category: item.categoryName || item.category,
            compatibleModel: item.compatibleModels?.[0],
            quality: item.quality,
            supplierId: item.primarySupplierId,
            supplier: item.supplier,
            invoiceNumber: item.originSupplierInvoiceNumber,
            quantity: clampQuantity(quantity),
            unitCost: item.purchasePrice,
            stockItemId: id,
            supplierInvoiceId: item.originSupplierInvoiceId,
            supplierInvoiceLineId: item.originSupplierInvoiceLineId,
          });
          get().createStockMovement({
            stockItemId: id,
            movementType: "supplier_purchase_received",
            quantityDelta: clampQuantity(quantity),
            quantityBefore: Math.max(0, item.stock - clampQuantity(quantity)),
            quantityAfter: item.stock,
            reason: "Réapprovisionnement",
            sourceModule: "achats",
            sourceId: id,
            linkedPurchaseId: purchaseId,
            linkedSupplierInvoiceId: item.originSupplierInvoiceId,
            linkedSupplierInvoiceLineId: item.originSupplierInvoiceLineId,
          });
        }
      },
      adjustStock: (id, delta, reason) => {
        if (!delta) return;
        const beforeItem = get().stockItems.find((entry) => entry.id === id);
        set((state) => ({
          stockItems: state.stockItems.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: Math.max(0, item.quantity + delta),
                  stock: Math.max(0, item.stock + delta),
                }
              : item,
          ),
        }));
        const item = get().stockItems.find((entry) => entry.id === id);
        if (!item) return;
        const sourceModule: StockMovementSourceModule = reason?.toLowerCase().includes("reconditionnement")
          ? "reconditionnement"
          : reason?.toLowerCase().includes("réparation") || reason?.toLowerCase().includes("reparation")
            ? "atelier_reparation"
            : "stock";
        const movementType: StockMovementType =
          sourceModule === "reconditionnement" && delta < 0
            ? "reconditioning_part_used"
            : sourceModule === "atelier_reparation" && delta < 0
              ? "repair_part_used"
              : delta > 0
                ? "correction"
                : "manual_adjustment";
        get().createStockMovement({
          stockItemId: id,
          movementType,
          quantityDelta: delta,
          quantityBefore: beforeItem?.stock ?? Math.max(0, item.stock - delta),
          quantityAfter: item.stock,
          reason,
          sourceModule,
          linkedReconditioningDeviceId: item.reconditioningFileId,
        });
        get().addAuditLog({
          action: delta < 0 ? "stock.item_used" : "stock.quantity_changed",
          targetType: "stock",
          targetId: id,
          message: `${reason ?? "Ajustement stock"} : ${item.name} (${delta > 0 ? "+" : ""}${delta})`,
          metadata: { delta },
        });
        if (delta < 0 && item.stock <= item.threshold) {
          get().addNotification({
            type: "warning",
            title: "Stock bas",
            message: `${item.name} est sous le seuil d'alerte`,
            targetType: "stock",
            targetId: id,
          });
        }
      },
      importStockItems: (items) => {
        const actor = get().currentUser ?? defaultCurrentUser;
        const createdAt = nowLabel();
        set((state) => {
          const byReference = new Map(state.stockItems.map((item) => [item.reference, item]));
          const stockItems = [...state.stockItems];
          const stockMovements = [...state.stockMovements];
          for (const input of items) {
            const existing = byReference.get(input.reference ?? input.sku ?? "");
            if (existing) {
              const index = stockItems.findIndex((item) => item.id === existing.id);
              const nextItem = normalizeStockItem({
                ...existing,
                ...input,
                leadTime: input.leadTime || existing.leadTime,
              });
              stockItems[index] = nextItem;
              const delta = nextItem.stock - existing.stock;
              if (delta !== 0) {
                stockMovements.unshift({
                  id: uid("mov"),
                  shopId,
                  stockItemId: nextItem.id,
                  partReference: nextItem.sku || nextItem.reference,
                  internalCode: nextItem.internalCode,
                  movementType: delta > 0 ? "supplier_purchase_received" : "correction",
                  quantityDelta: delta,
                  quantityBefore: existing.stock,
                  quantityAfter: nextItem.stock,
                  unitCost: nextItem.purchasePrice,
                  totalCost: clampMoney(nextItem.purchasePrice * Math.abs(delta)),
                  reason: "Import stock",
                  sourceModule: "stock",
                  sourceId: nextItem.id,
                  linkedPurchaseId: nextItem.originPurchaseId,
                  linkedSupplierInvoiceId: nextItem.originSupplierInvoiceId,
                  linkedSupplierInvoiceLineId: nextItem.originSupplierInvoiceLineId,
                  actorId: actor.id,
                  actorName: actor.name,
                  createdAt,
                  metadata: { importSource: "stock_file" },
                });
              }
            } else {
              const item = normalizeStockItem({
                id: uid("stock"),
                shopId,
                leadTime: input.leadTime || "2 à 3 jours",
                ...input,
              });
              stockItems.unshift(item);
              if (item.stock > 0) {
                stockMovements.unshift({
                  id: uid("mov"),
                  shopId,
                  stockItemId: item.id,
                  partReference: item.sku || item.reference,
                  internalCode: item.internalCode,
                  movementType: "supplier_purchase_received",
                  quantityDelta: item.stock,
                  quantityBefore: 0,
                  quantityAfter: item.stock,
                  unitCost: item.purchasePrice,
                  totalCost: clampMoney(item.purchasePrice * item.stock),
                  reason: "Import stock",
                  sourceModule: "stock",
                  sourceId: item.id,
                  linkedPurchaseId: item.originPurchaseId,
                  linkedSupplierInvoiceId: item.originSupplierInvoiceId,
                  linkedSupplierInvoiceLineId: item.originSupplierInvoiceLineId,
                  actorId: actor.id,
                  actorName: actor.name,
                  createdAt,
                  metadata: { importSource: "stock_file" },
                });
              }
            }
          }
          return { stockItems, stockMovements: stockMovements.slice(0, 2000) };
        });
      },
      upsertSupplier: (input) => {
        const name = normalizeText(input.name);
        if (!name) return "";
        const actor = get().currentUser ?? defaultCurrentUser;
        const existing = get().suppliers.find((supplier) => supplier.name.trim().toLowerCase() === name.toLowerCase());
        if (existing) {
          set((state) => ({
            suppliers: state.suppliers.map((supplier) =>
              supplier.id === existing.id
                ? {
                    ...supplier,
                    email: normalizeText(input.email, supplier.email),
                    phone: normalizeText(input.phone, supplier.phone),
                    address: normalizeText(input.address, supplier.address),
                    vatNumber: normalizeText(input.vatNumber, supplier.vatNumber),
                    notes: normalizeText(input.notes, supplier.notes),
                    updatedAt: getNowIso(),
                  }
                : supplier,
            ),
          }));
          return existing.id;
        }
        const id = normalizeText(input.id, uid("supplier"));
        const supplier: Supplier = {
          id,
          shopId,
          name,
          email: normalizeText(input.email),
          phone: normalizeText(input.phone),
          address: normalizeText(input.address),
          vatNumber: normalizeText(input.vatNumber),
          notes: normalizeText(input.notes),
          createdBy: actor.id,
          createdByName: actor.name,
          createdAt: getNowIso(),
          updatedAt: getNowIso(),
        };
        set((state) => ({ suppliers: [supplier, ...state.suppliers] }));
        return id;
      },
      commitSupplierInvoice: (input) => {
        if (!get().requirePermission("canManageStock", "Importer une facture fournisseur")) return "";
        const invoiceNumber = normalizeText(input.invoiceNumber);
        const rawSupplier = typeof input.supplier === "string" ? { name: input.supplier } : input.supplier;
        const supplierName = normalizeText(rawSupplier.name);
        const cleanLines = (input.lines ?? [])
          .map((line) => {
            const quantityPurchased = Math.max(0, clampQuantity(line.quantityPurchased));
            const unitPurchasePriceExclTax = clampMoney(line.unitPurchasePriceExclTax);
            const lineTotalExclTax = clampMoney(line.lineTotalExclTax ?? quantityPurchased * unitPurchasePriceExclTax);
            const taxRate = typeof line.taxRate === "number" ? Math.max(0, line.taxRate) : undefined;
            const taxAmount = clampMoney(line.taxAmount ?? (taxRate ? lineTotalExclTax * (taxRate / 100) : 0));
            const rawName = normalizeText(line.rawName, normalizeText(line.itemName));
            const category = normalizeText(line.category);
            const quality = normalizeText(line.quality, inferSupplierPartQuality(rawName));
            const displayName = normalizeText(line.displayName, compactSupplierPartName(rawName, category, quality));
            return {
              ...line,
              rawName,
              itemName: displayName || normalizeText(line.itemName),
              displayName,
              reference: normalizeText(line.reference, normalizeText(line.sku)),
              sku: normalizeText(line.sku, normalizeText(line.reference)),
              internalCode: normalizeText(line.internalCode),
              category,
              compatibleModel: normalizeText(line.compatibleModel),
              quality,
              supplierBrand: normalizeText(line.supplierBrand, extractSupplierBrand(rawName)),
              ean: normalizeText(line.ean, extractSupplierEan(rawName)),
              supplierWarranty: normalizeText(line.supplierWarranty, extractSupplierWarranty(rawName)),
              quantityPurchased,
              unitPurchasePriceExclTax,
              taxRate,
              taxAmount,
              lineTotalExclTax,
              lineTotalInclTax: clampMoney(line.lineTotalInclTax ?? lineTotalExclTax + taxAmount),
            };
          })
          .filter((line) => line.itemName && line.quantityPurchased > 0);
        if (!invoiceNumber || !supplierName || !cleanLines.length) return "";

        const supplierId = get().upsertSupplier(rawSupplier);
        if (!supplierId) return "";

        const actor = get().currentUser ?? defaultCurrentUser;
        const now = getNowIso();
        const invoiceId = uid("supplier_invoice");
        const computedTotalExcludingTax = cleanLines.reduce((sum, line) => sum + line.lineTotalExclTax, 0);
        const computedTaxAmount = cleanLines.reduce((sum, line) => sum + (line.taxAmount ?? 0), 0);
        const totalExcludingTax = clampMoney(input.totalExcludingTax ?? computedTotalExcludingTax);
        const taxAmount = clampMoney(input.taxAmount ?? computedTaxAmount);
        const totalIncludingTax = clampMoney(input.totalIncludingTax ?? totalExcludingTax + taxAmount);
        const invoice: SupplierInvoice = {
          id: invoiceId,
          shopId,
          supplierId,
          supplierName,
          purchaseDate: input.purchaseDate ?? now,
          invoiceNumber,
          originalFileName: normalizeText(input.originalFileName),
          originalFileUrl: normalizeText(input.originalFileUrl),
          originalDocumentId: normalizeText(input.originalDocumentId),
          totalExcludingTax,
          taxAmount,
          totalIncludingTax,
          status: input.status ?? "reçu",
          source: input.source ?? "manuel",
          textractJson: input.textractJson,
          createdBy: actor.id,
          createdByName: actor.name,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const stockItems = [...state.stockItems];
          const purchases = [...state.purchases];
          const stockMovements = [...state.stockMovements];
          const supplierInvoiceLines: SupplierInvoiceLine[] = [];
          const existingCodes = new Set(
            stockItems.map((item) => normalizePartReference(item.internalCode)).filter(Boolean),
          );
          let purchaseSeq = purchases.filter((entry) =>
            (entry.number || "").includes(`ACH-${new Date().getFullYear()}`),
          ).length;

          cleanLines.forEach((line, index) => {
            const lineId = uid(`supplier_invoice_line_${index}`);
            const createsStock = line.createStockItem !== false;
            const lookup = [line.stockItemId, line.internalCode, line.sku, line.reference]
              .map((value) => normalizePartReference(value))
              .filter(Boolean);
            const stockIndex = createsStock
              ? stockItems.findIndex(
                  (item) =>
                    lookup.includes(normalizePartReference(item.id)) ||
                    lookup.some((key) => stockReferenceMatches(item, key)),
                )
              : -1;
            const existingItem = stockIndex >= 0 ? stockItems[stockIndex] : undefined;
            const beforeStock = existingItem?.stock ?? 0;
            const afterStock = beforeStock + line.quantityPurchased;
            const fallbackCode = `PIECE-${String(stockItems.length + index + 1).padStart(4, "0")}`;
            const internalCode = createsStock
              ? existingItem?.internalCode
                ? existingItem.internalCode
                : makeUniqueInternalCode(
                    line.internalCode || line.sku || line.reference || line.itemName,
                    existingCodes,
                    fallbackCode,
                  )
              : line.internalCode;
            const stockItemId = createsStock ? (existingItem?.id ?? uid("stock")) : undefined;
            purchaseSeq += 1;
            const purchaseId = uid("pur");
            const purchaseNumber = `ACH-${new Date().getFullYear()}-${String(purchaseSeq).padStart(6, "0")}`;
            const weightedAverage =
              afterStock > 0
                ? clampMoney(
                    ((existingItem?.averagePurchasePrice ?? existingItem?.purchasePrice ?? 0) * beforeStock +
                      line.unitPurchasePriceExclTax * line.quantityPurchased) /
                      afterStock,
                  )
                : line.unitPurchasePriceExclTax;

            const stockPatch: Partial<StockItem> = {
              rawName: line.rawName || existingItem?.rawName || line.itemName,
              displayName:
                line.displayName || compactSupplierPartName(line.rawName || line.itemName, line.category, line.quality),
              quantity: afterStock,
              stock: afterStock,
              purchasePrice: line.unitPurchasePriceExclTax,
              averagePurchasePrice: weightedAverage,
              lastPurchasePrice: line.unitPurchasePriceExclTax,
              supplier: supplierName,
              primarySupplierId: supplierId,
              primarySupplier: supplierName,
              originPurchaseId: purchaseId,
              originSupplierInvoiceId: invoiceId,
              originSupplierInvoiceNumber: invoiceNumber,
              originSupplierInvoiceLineId: lineId,
              internalCode,
              quality: line.quality || existingItem?.quality,
              supplierBrand: line.supplierBrand || existingItem?.supplierBrand,
              ean: line.ean || existingItem?.ean,
              supplierWarranty: line.supplierWarranty || existingItem?.supplierWarranty,
              ...updateActorFields(actor),
            };

            if (createsStock && existingItem) {
              const lineModels = splitCompatibleModelNames(line.compatibleModel);
              stockItems[stockIndex] = normalizeStockItem({
                ...existingItem,
                ...stockPatch,
                name: stockPatch.displayName,
                part: stockPatch.displayName,
                categoryName: line.category || existingItem.categoryName,
                category: line.category || existingItem.category,
                compatibleModels: lineModels.length
                  ? uniqueIds([...(existingItem.compatibleModels ?? []), ...lineModels])
                  : existingItem.compatibleModels,
              });
            } else if (createsStock && stockItemId) {
              stockItems.unshift(
                normalizeStockItem({
                  id: stockItemId,
                  shopId,
                  sku: line.sku || line.reference || internalCode,
                  reference: line.reference || line.sku || internalCode,
                  internalCode,
                  rawName: line.rawName || line.itemName,
                  displayName:
                    line.displayName ||
                    compactSupplierPartName(line.rawName || line.itemName, line.category, line.quality),
                  name:
                    line.displayName ||
                    compactSupplierPartName(line.rawName || line.itemName, line.category, line.quality),
                  part:
                    line.displayName ||
                    compactSupplierPartName(line.rawName || line.itemName, line.category, line.quality),
                  categoryName: line.category || "Autre",
                  category: line.category || "Autre",
                  compatibleModels: splitCompatibleModelNames(line.compatibleModel),
                  quality: line.quality,
                  supplierBrand: line.supplierBrand,
                  ean: line.ean,
                  supplierWarranty: line.supplierWarranty,
                  purchasePrice: line.unitPurchasePriceExclTax,
                  averagePurchasePrice: line.unitPurchasePriceExclTax,
                  lastPurchasePrice: line.unitPurchasePriceExclTax,
                  salePrice: line.salePrice ?? clampMoney(line.unitPurchasePriceExclTax * 1.8),
                  quantity: line.quantityPurchased,
                  stock: line.quantityPurchased,
                  threshold: line.stockMinimum ?? 1,
                  supplier: supplierName,
                  primarySupplierId: supplierId,
                  primarySupplier: supplierName,
                  originPurchaseId: purchaseId,
                  originSupplierInvoiceId: invoiceId,
                  originSupplierInvoiceNumber: invoiceNumber,
                  originSupplierInvoiceLineId: lineId,
                  itemType: "part",
                  repairEnabled: true,
                  counterSaleEnabled: false,
                  active: true,
                  productCategory: "Pièces détachées",
                  counterVisible: false,
                  leadTime: "2 à 3 jours",
                  ...actorFields(actor),
                }),
              );
            }

            const purchase: Purchase = {
              id: purchaseId,
              shopId,
              number: purchaseNumber,
              kind: createsStock ? "piece" : "autre",
              source: input.source === "textract" ? "Analyse IA" : "Facture fournisseur",
              label: line.itemName,
              reference: line.reference || line.sku,
              internalCode,
              category: line.category,
              compatibleModel: line.compatibleModel,
              quality: line.quality,
              supplierId,
              supplier: supplierName,
              invoiceNumber,
              quantity: line.quantityPurchased,
              unitCost: line.unitPurchasePriceExclTax,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              totalExcludingTax: line.lineTotalExclTax,
              totalIncludingTax: line.lineTotalInclTax,
              total: line.lineTotalInclTax ?? line.lineTotalExclTax,
              date: invoice.purchaseDate,
              stockItemId,
              supplierInvoiceId: invoiceId,
              supplierInvoiceLineId: lineId,
              documentId: invoice.originalDocumentId,
              originalFileName: invoice.originalFileName,
              originalFileUrl: invoice.originalFileUrl,
              note: input.note,
              createdBy: actor.id,
              createdByName: actor.name,
              createdAt: now,
            };
            purchases.unshift(purchase);

            supplierInvoiceLines.push({
              id: lineId,
              shopId,
              supplierInvoiceId: invoiceId,
              purchaseId,
              stockItemId,
              rawName: line.rawName,
              displayName:
                line.displayName || compactSupplierPartName(line.rawName || line.itemName, line.category, line.quality),
              itemName: line.itemName,
              reference: line.reference || line.sku,
              sku: line.sku || line.reference,
              internalCode,
              category: line.category,
              compatibleModel: line.compatibleModel,
              quality: line.quality,
              supplierBrand: line.supplierBrand,
              ean: line.ean,
              supplierWarranty: line.supplierWarranty,
              quantityPurchased: line.quantityPurchased,
              unitPurchasePriceExclTax: line.unitPurchasePriceExclTax,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              lineTotalExclTax: line.lineTotalExclTax,
              lineTotalInclTax: line.lineTotalInclTax,
              supplierId,
              supplierName,
              invoiceId,
              createStockItem: createsStock,
              createdAt: now,
            });

            if (!createsStock || !stockItemId) return;

            const movement: StockMovement = {
              id: uid("mov"),
              shopId,
              stockItemId,
              partReference: line.sku || line.reference,
              internalCode,
              movementType: "supplier_purchase_received",
              quantityDelta: line.quantityPurchased,
              quantityBefore: beforeStock,
              quantityAfter: afterStock,
              unitCost: line.unitPurchasePriceExclTax,
              totalCost: line.lineTotalExclTax,
              reason: `Facture fournisseur ${invoiceNumber}`,
              sourceModule: "achats",
              sourceId: invoiceId,
              linkedPurchaseId: purchaseId,
              linkedSupplierInvoiceId: invoiceId,
              linkedSupplierInvoiceLineId: lineId,
              actorId: actor.id,
              actorName: actor.name,
              createdAt: now,
              note: input.note,
              metadata: {
                invoiceNumber,
                supplierId,
                supplierName,
                lineId,
                purchaseNumber,
              },
            };
            const movementKey = [
              movement.movementType,
              movement.linkedPurchaseId,
              movement.linkedSupplierInvoiceId,
              movement.linkedSupplierInvoiceLineId,
              normalizePartReference(movement.partReference),
            ].join("|");
            const alreadyExists = stockMovements.some(
              (entry) =>
                [
                  entry.movementType,
                  entry.linkedPurchaseId,
                  entry.linkedSupplierInvoiceId,
                  entry.linkedSupplierInvoiceLineId,
                  normalizePartReference(entry.partReference),
                ].join("|") === movementKey,
            );
            if (!alreadyExists) stockMovements.unshift(movement);
          });

          return {
            stockItems,
            purchases,
            stockMovements: stockMovements.slice(0, 2000),
            supplierInvoices: [invoice, ...state.supplierInvoices],
            supplierInvoiceLines: [...supplierInvoiceLines, ...state.supplierInvoiceLines],
          };
        });

        get().addAuditLog({
          action: "supplier_invoice.committed",
          targetType: "supplier_invoice",
          targetId: invoiceId,
          message: `${actor.name} a validé la facture fournisseur ${invoiceNumber} (${supplierName})`,
          metadata: {
            supplierId,
            invoiceNumber,
            totalIncludingTax,
            lineCount: cleanLines.length,
            source: invoice.source,
          },
        });
        get().addNotification({
          type: "success",
          title: "Facture fournisseur intégrée",
          message: `${invoiceNumber} — ${cleanLines.length} ligne(s) ajoutée(s) au stock`,
          targetType: "supplier_invoice",
          targetId: invoiceId,
        });
        return invoiceId;
      },
      addPurchase: (input) => {
        const actor = get().currentUser ?? defaultCurrentUser;
        const id = uid("pur");
        const year = new Date().getFullYear();
        const seq = get().purchases.filter((entry) => (entry.number || "").includes(`ACH-${year}`)).length + 1;
        const quantity = Math.max(1, clampQuantity(input.quantity ?? 1));
        const unitCost = Number.isFinite(input.unitCost) ? Number(input.unitCost) : 0;
        const total = typeof input.total === "number" ? input.total : Math.round(unitCost * quantity * 100) / 100;
        const purchase: Purchase = {
          id,
          shopId,
          number: `ACH-${year}-${String(seq).padStart(6, "0")}`,
          kind: input.kind,
          source: input.source,
          label: input.label,
          reference: input.reference,
          internalCode: input.internalCode,
          category: input.category,
          compatibleModel: input.compatibleModel,
          quality: input.quality,
          supplierId: input.supplierId,
          supplier: input.supplier,
          invoiceNumber: input.invoiceNumber,
          quantity,
          unitCost,
          taxRate: input.taxRate,
          taxAmount: input.taxAmount,
          totalExcludingTax: input.totalExcludingTax,
          totalIncludingTax: input.totalIncludingTax,
          total,
          currency: input.currency,
          date: input.date ?? getNowIso(),
          stockItemId: input.stockItemId,
          supplierInvoiceId: input.supplierInvoiceId,
          supplierInvoiceLineId: input.supplierInvoiceLineId,
          documentId: input.documentId,
          originalFileName: input.originalFileName,
          originalFileUrl: input.originalFileUrl,
          repairId: input.repairId,
          reconditioningFileId: input.reconditioningFileId,
          conditionneRecordId: input.conditionneRecordId,
          note: input.note,
          createdBy: actor.id,
          createdByName: actor.name,
          createdAt: getNowIso(),
        };
        set((state) => ({ purchases: [purchase, ...state.purchases] }));
        get().addAuditLog({
          action: "purchase.created",
          targetType: "purchase",
          targetId: id,
          message: `${actor.name} a enregistré un achat (${input.source}) : ${input.label}`,
          metadata: { total, kind: input.kind },
        });
        return id;
      },
      deletePurchase: (id) => {
        set((state) => ({ purchases: state.purchases.filter((entry) => entry.id !== id) }));
      },
      sendMessage: (input) => {
        // Quota d'abonnement : SMS envoyés ce mois-ci (plans limités uniquement).
        if (input.channel === "SMS") {
          const smsQuota = checkSmsQuota(get().licensePlan, countSmsThisMonth(get().messageLogs));
          if (!smsQuota.allowed) {
            get().addNotification({
              type: "warning",
              title: "Limite SMS atteinte",
              message: smsQuota.reason ?? "Quota SMS mensuel atteint.",
              targetType: "settings",
              targetId: shopId,
            });
            return;
          }
        }
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
      updateWorkshopInfo: (patch) => {
        if (!get().requirePermission("canEditSettings", "Modifier les paramètres")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((state) => {
          const nextSettings = withWorkshopLocaleDefaults({
            ...(state.workshopSettings ?? defaultWorkshopSettings),
            ...patch,
            updatedAt: nowLabel(),
          } as WorkshopSettings);
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
      saveWorkshopSettings: (settings) => {
        if (!get().requirePermission("canEditSettings", "Enregistrer les paramètres")) return;
        const actor = get().currentUser ?? defaultCurrentUser;
        set((state) => {
          const now = nowLabel();
          const nextSettings = withWorkshopLocaleDefaults({
            ...(state.workshopSettings ?? defaultWorkshopSettings),
            ...settings,
            configuredAt: state.configuredAt ?? now,
            updatedAt: now,
          } as WorkshopSettings);
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
          message: onlyLogoChanged
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
      updateDocument: (id, patch) => {
        const document = get().documents.find((entry) => entry.id === id);
        if (!document) return;
        if (!get().requirePermission("canDownloadDocuments", "Modifier un document")) return;
        if (
          document.type === "internal" &&
          !get().requirePermission("canViewInternalDocuments", "Modifier un document privé")
        )
          return;
        const technicalPdfKeys = new Set(["fileUrl", "storagePath"]);
        if (document.lockedAt && Object.keys(patch).some((key) => !technicalPdfKeys.has(key))) {
          const actor = get().currentUser ?? defaultCurrentUser;
          get().addNotification({
            type: "warning",
            title: "Document verrouillé",
            message: `${document.title} est figé : créez une nouvelle version pour modifier son contenu.`,
            targetType: "document",
            targetId: id,
          });
          get().addAuditLog({
            action: "document.update_blocked",
            targetType: "document",
            targetId: id,
            message: `${actor.name} a tenté de modifier le document verrouillé ${document.title}`,
          });
          return;
        }
        set((state) => ({
          documents: state.documents.map((entry) => (entry.id === id ? { ...entry, ...patch, id: entry.id } : entry)),
        }));
      },
      deleteDocument: (id) => {
        const document = get().documents.find((entry) => entry.id === id);
        if (!document) return;
        if (!get().requirePermission("canViewDocuments", "Supprimer un document")) return;
        if (
          document.type === "internal" &&
          !get().requirePermission("canViewInternalDocuments", "Supprimer un document privé")
        )
          return;
        if (document.lockedAt || document.type === "invoice" || document.type === "quote") {
          const actor = get().currentUser ?? defaultCurrentUser;
          get().addNotification({
            type: "warning",
            title: "Suppression bloquée",
            message: `${document.title} est un document légal : créez une nouvelle version ou une annulation.`,
            targetType: "document",
            targetId: id,
          });
          get().addAuditLog({
            action: "document.delete_blocked",
            targetType: "document",
            targetId: id,
            message: `${actor.name} a tenté de supprimer le document légal ${document.title}`,
          });
          return;
        }
        set((state) => {
          const documents = state.documents.filter((document) => document.id !== id);
          return { documents, selectedDocumentId: documents[0]?.id ?? "" };
        });
      },
      loadPreloadedCatalog: async () => {
        // [DESACTIVER] Le catalogue global.json est pollué par des faux modèles (ex: "iPhone 11 Blanc").
        // On ne l'utilise plus comme base automatique pour garantir la propreté du catalogue.
        set({ isCatalogPreloaded: true });
        return;
      },
      addPriceBookItem: (input) => {
        const item = createPriceBookItem({ ...input, source: input.source ?? "manual" });
        // Anti-doublon : si une entrée existe déjà avec la même clé
        // (type+marque+modèle+intervention+sku), on met à jour ses prix
        // au lieu de créer une copie. Évite la prolifération des entrées
        // catalogue à chaque nouvelle réparation au tarif manuel.
        const key = priceBookDuplicateKey(item);
        const existing = get().priceBookItems.find((pb) => priceBookDuplicateKey(pb) === key);
        if (existing) {
          set((state) => {
            const priceBookItems = state.priceBookItems.map((pb) =>
              pb.id === existing.id
                ? updatePriceBookItem(pb, {
                    prixAchat: item.prixAchat || pb.prixAchat,
                    prixVentePiece: item.prixVentePiece || pb.prixVentePiece,
                    mainOeuvre: item.mainOeuvre || pb.mainOeuvre,
                    fournisseur: item.fournisseur ?? pb.fournisseur,
                    notes: item.notes ?? pb.notes,
                    isActive: true,
                  })
                : pb,
            );
            const stockItems = syncPriceBookToStockItems(priceBookItems, state.stockItems);
            return { priceBookItems, stockItems };
          });
          return existing.id;
        }
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
        const lines: SaleLine[] = input.lines
          .map((line, i) => {
            const quantity = Math.max(1, clampQuantity(line.quantity));
            const unitPrice = clampMoney(line.unitPrice);
            const total = clampMoney(line.total ?? quantity * unitPrice);
            return {
              ...line,
              id: `${id}_line_${i}`,
              quantity,
              unitPrice,
              total,
            };
          })
          .filter((line) => line.quantity > 0 && line.unitPrice > 0 && line.total > 0);
        const subtotal = lines.reduce((s, l) => s + l.total, 0);
        if (!lines.length || subtotal <= 0) return "";
        const customerId = input.customerId === "counter" ? counterCustomerId : input.customerId;
        const customerName =
          input.customerId === "counter" || input.customerName === "Client comptoir"
            ? "Client comptoir"
            : input.customerName;
        const taxAmount = 0;
        const linkedRepair = input.repairId ? get().repairs.find((repair) => repair.id === input.repairId) : undefined;
        const saleBillingConfig = getWorkshopCountryConfig(
          input.billingCountry ?? linkedRepair?.billingCountry ?? ws.country,
        );
        const sale: Sale = {
          id,
          billingCountry: saleBillingConfig.country,
          currency: saleBillingConfig.currency,
          locale: saleBillingConfig.locale,
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
        if (!get().requirePermission("canTakePayment", "Valider une vente")) return "";
        const state = get();
        const sale = state.sales.find((s) => s.id === saleId);
        if (!sale) return "";
        if (sale.status === "Rattachée") {
          get().addNotification({
            type: "info",
            title: "Vente rattachée à un dossier",
            message: `La vente ${sale.number} sera validée automatiquement quand la facture du dossier lié sera réglée.`,
            targetType: "sale",
            targetId: sale.id,
          });
          return "";
        }
        if (sale.status !== "Brouillon" && sale.status !== "Payée") return sale.paymentId ?? "";
        if (!sale.lines.length || sale.total <= 0) return "";
        const normalizedMethod = normalizeSelectedPaymentMethod(method);
        if (!normalizedMethod) return "";
        if (sale.lines.some((line) => line.quantity <= 0 || line.unitPrice <= 0 || line.total <= 0)) return "";
        if (sale.status === "Payée" && sale.paymentId) return sale.paymentId;

        // Les lignes libres de vente comptoir n'ont pas d'article stock.
        // Seules les lignes rattachées à un vrai stockItem décrémentent le stock.
        for (const line of sale.lines) {
          const item = state.stockItems.find((si) => si.id === line.stockItemId);
          if (!item) continue;
          if (item.stock < line.quantity) return "";
        }

        const actor = state.currentUser ?? defaultCurrentUser;
        const timestamp = nowLabel();
        const ws = state.workshopSettings;

        // Decrement stock
        const updatedStock = state.stockItems.map((si) => {
          const line = sale.lines.find((l) => l.stockItemId === si.id);
          if (!line) return si;
          return {
            ...si,
            quantity: Math.max(0, si.quantity - line.quantity),
            stock: Math.max(0, si.stock - line.quantity),
          };
        });

        // Create payment
        const paymentId = uid("payment");
        const paymentNumber = docNumber(ws.receiptPrefix, ws.nextReceiptNumber ?? 1, "REC");
        const payment: Payment = {
          id: paymentId,
          shopId,
          saleId,
          repairId: sale.repairId,
          customerId: sale.customerId,
          billingCountry: sale.billingCountry,
          currency: sale.currency,
          locale: sale.locale,
          amount: sale.total,
          method: normalizedMethod,
          mode: normalizedMethod,
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

        const docId = `doc_sale_${saleId}`;
        const doc: BeharDocument = {
          id: docId,
          shopId,
          type: "sale-receipt" as DocumentType,
          title: `Justificatif de vente comptoir - ${sale.number}`,
          customerId: sale.customerId,
          repairId: sale.repairId,
          saleId,
          paymentId,
          createdAt: timestamp,
        };

        // Update sale
        const updatedSale: Sale = {
          ...sale,
          status: "Payée",
          paymentMethod: normalizedMethod,
          paymentId,
          documentId: docId,
          paidAt: timestamp,
        };

        set((s) => ({
          sales: s.sales.map((x) => (x.id === saleId ? updatedSale : x)),
          stockItems: updatedStock,
          payments: [payment, ...s.payments],
          documents: [doc, ...s.documents],
          // Vente rattachée à un dossier : on trace la vente dans l'historique du dossier.
          repairs: sale.repairId
            ? s.repairs.map((entry) =>
                entry.id === sale.repairId
                  ? {
                      ...entry,
                      history: [
                        ...entry.history,
                        `Vente ${sale.number} rattachée — ${formatEuro(sale.total)} (reçu ${paymentNumber})`,
                      ],
                    }
                  : entry,
              )
            : s.repairs,
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

        for (const line of sale.lines) {
          const beforeItem = state.stockItems.find((item) => item.id === line.stockItemId);
          const afterItem = updatedStock.find((item) => item.id === line.stockItemId);
          if (!beforeItem || !afterItem) continue;
          const linkedReconditioningDeviceId = line.reconditioningFileId || beforeItem.reconditioningFileId;
          get().createStockMovement({
            stockItemId: line.stockItemId,
            movementType: linkedReconditioningDeviceId ? "reconditioned_device_sold" : "counter_sale_sold",
            quantityDelta: -line.quantity,
            quantityBefore: beforeItem.stock,
            quantityAfter: afterItem.stock,
            reason: `Vente comptoir ${sale.number}`,
            sourceModule: "vente_comptoir",
            sourceId: sale.id,
            linkedSaleId: sale.id,
            linkedReconditioningDeviceId,
            metadata: { saleNumber: sale.number, lineId: line.id, itemKind: line.itemKind },
          });
        }

        get().addAuditLog({
          action: "sale.paid",
          targetType: "sale",
          targetId: saleId,
          message: `${actor.name} a validé la vente ${sale.number} (${formatEuro(sale.total)})`,
          metadata: { amount: sale.total, method: normalizedMethod, paymentId },
        });
        get().addNotification({
          type: "success",
          title: "Vente validée",
          message: `Vente ${sale.number} validée — ${formatEuro(sale.total)}`,
          targetType: "sale",
          targetId: saleId,
        });
        publishDomainEvent({ type: "counter_sale.completed", sale: updatedSale, paymentId, occurredAt: timestamp });

        return paymentId;
      },
      cancelSale: (saleId) => {
        if (!get().requirePermission("canCancelSale", "Annuler une vente")) return;
        const state = get();
        const sale = state.sales.find((s) => s.id === saleId);
        if (!sale || sale.status === "Annulée") return;

        // If already paid, restore stock-backed lines only
        let updatedStock = state.stockItems;
        if (sale.status === "Payée") {
          updatedStock = state.stockItems.map((si) => {
            const line = sale.lines.find((l) => l.stockItemId === si.id);
            if (!line) return si;
            return { ...si, quantity: si.quantity + line.quantity, stock: si.stock + line.quantity };
          });
        }

        set((s) => ({
          sales: s.sales.map((x) => (x.id === saleId ? { ...x, status: "Annulée" as SaleStatus } : x)),
          stockItems: updatedStock,
        }));

        if (sale.status === "Payée") {
          for (const line of sale.lines) {
            const beforeItem = state.stockItems.find((item) => item.id === line.stockItemId);
            const afterItem = updatedStock.find((item) => item.id === line.stockItemId);
            if (!beforeItem || !afterItem) continue;
            const linkedReconditioningDeviceId = line.reconditioningFileId || beforeItem.reconditioningFileId;
            get().createStockMovement({
              stockItemId: line.stockItemId,
              movementType: "reservation_released",
              quantityDelta: line.quantity,
              quantityBefore: beforeItem.stock,
              quantityAfter: afterItem.stock,
              reason: `Annulation vente comptoir ${sale.number}`,
              sourceModule: "vente_comptoir",
              sourceId: sale.id,
              linkedSaleId: sale.id,
              linkedReconditioningDeviceId,
              metadata: { saleNumber: sale.number, lineId: line.id, cancelledSale: true },
            });
          }
          publishDomainEvent({ type: "counter_sale.cancelled", sale, occurredAt: nowLabel() });
        }

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

export const getQuoteDevices = (quote: Quote): QuoteDevice[] =>
  Array.isArray(quote.devices) && quote.devices.length
    ? quote.devices
    : legacyQuoteDevice(quote, sanitizeQuoteLines(quote.lines));

export const getQuotePrimaryDeviceLabel = (quote: Quote) => {
  const devices = getQuoteDevices(quote);
  const first = devices[0];
  if (!first) return quote.deviceModel || quote.device || "Appareil";
  return (
    first.model ||
    [first.brand, first.model].filter(Boolean).join(" ") ||
    quote.deviceModel ||
    quote.device ||
    "Appareil"
  );
};

export const getQuoteDeviceListLabel = (quote: Quote) => {
  const devices = getQuoteDevices(quote);
  const first = devices[0];
  const main =
    first?.model ||
    [first?.brand, first?.model].filter(Boolean).join(" ") ||
    quote.deviceModel ||
    quote.device ||
    "Appareil";
  return devices.length > 1 ? `${main} +${devices.length - 1}` : main;
};

/**
 * Calcule le résumé TVA d'un document (Devis ou Facture)
 */
export function getVatSummary(lines: QuoteLine[], settings: WorkshopInfo): VatSummary {
  const ttc = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  if (!settings.vatApplicable) {
    return { ht: ttc, tva: 0, ttc, rate: 0 };
  }
  const configuredRate = Number(settings.vatRate ?? 20);
  const rate = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate / 100 : 0.2;
  const ht = ttc / (1 + rate);
  const tva = ttc - ht;
  return { ht, tva, ttc, rate };
}
