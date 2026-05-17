"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  formatEuro,
  type PaymentMethod,
  paymentMethods,
  type Repair,
  type Sale,
  type SaleLine,
  type StockItem,
  useBeharStore,
} from "@/lib/behar-store";

import {
  DetailRow,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TableShell,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
} from "./primitives";
import { useDocument } from "./print-provider";

type CartLine = Omit<SaleLine, "id">;

const formatPaymentMethodLabel = (method?: PaymentMethod) => (method === "Carte" ? "Carte bancaire" : method || "—");

function todayKey(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    const fr = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
      .format(now)
      .replace(".", "");
    return value.toLowerCase().includes(fr.toLowerCase()) ? now.toISOString().slice(0, 10) : value.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

export function SalesWorkspace() {
  const store = useBeharStore();
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [search, setSearch] = useState("");

  const filteredSales = store.sales.filter((sale) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${sale.number} ${sale.customerName} ${sale.status}`.toLowerCase().includes(q);
  });

  const selectedSale = store.sales.find((sale) => sale.id === store.selectedSaleId) || filteredSales[0];
  const today = new Date().toISOString().slice(0, 10);
  const paidSales = store.sales.filter((sale) => sale.status === "Payée");
  const todaySales = paidSales.filter((sale) => todayKey(sale.paidAt || sale.createdAt) === today);
  const dailyRevenue = todaySales.reduce((acc, sale) => acc + sale.total, 0);
  const averageCart = paidSales.length ? paidSales.reduce((acc, sale) => acc + sale.total, 0) / paidSales.length : 0;
  const linkedSales = store.sales.filter((sale) => sale.repairId || sale.status === "Rattachée").length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex justify-end">
        <PrimaryButton className="h-11" onClick={() => setShowNewSaleModal(true)}>
          <Plus className="size-4" />
          Nouvelle vente
        </PrimaryButton>
      </div>

      <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ventes du jour" value={String(todaySales.length)} helper="ventes encaissées" icon={ShoppingBag} />
        <KpiCard label="CA ventes" value={formatEuro(dailyRevenue)} helper="aujourd'hui" icon={CreditCard} />
        <KpiCard label="Panier moyen" value={formatEuro(averageCart)} helper="ventes payées" icon={Receipt} />
        <KpiCard label="Ventes rattachées" value={String(linkedSales)} helper="accessoires sur dossiers" icon={Wrench} />
      </section>

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TableShell className="min-h-[500px] md:h-full md:min-h-0">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-[#E7E4DC] border-b bg-white p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
              <input
                className="h-10 w-full rounded-[13px] border border-[#E7E4DC] bg-white pr-4 pl-10 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                placeholder="Rechercher une vente..."
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={tableClassName}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className="px-4 py-3">N° vente</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Paiement</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => store.setSelected("sale", sale.id)}
                    className={`cursor-pointer transition hover:bg-[#FAFAF8] ${sale.id === selectedSale?.id ? "bg-[#EAF6F2]" : ""}`}
                  >
                    <td className={`${tableCellClassName} font-medium`}>{sale.number}</td>
                    <td className={tableCellClassName}>{sale.customerName || "Client comptoir"}</td>
                    <td className={tableCellClassName}>{sale.paidAt || sale.createdAt}</td>
                    <td className={`${tableCellClassName} font-semibold`}>{formatEuro(sale.total)}</td>
                    <td className={tableCellClassName}>
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className={tableCellClassName}>{formatPaymentMethodLabel(sale.paymentMethod)}</td>
                    <td className={tableCellClassName}>
                      <button className="inline-flex h-8 items-center gap-1 rounded-full border border-[#E7E4DC] bg-white px-3 text-xs hover:border-[#2A9D8F]/60" type="button">
                        <Eye className="size-3.5" />
                        Détail
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-[#6B6B6B]">
                      Aucune vente trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TableShell>

        {selectedSale ? <SaleDetail sale={selectedSale} /> : null}
      </section>

      {showNewSaleModal ? <NewSaleModal onClose={() => setShowNewSaleModal(false)} /> : null}
    </div>
  );
}

function KpiCard({ label, value, helper, icon: Icon }: Readonly<{ label: string; value: string; helper: string; icon: typeof ShoppingBag }>) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[#8A8984] text-[13px]">{label}</p>
          <p className="mt-1 font-semibold text-[24px] text-[#1A1916] leading-none tracking-tight">{value}</p>
          <p className="mt-1.5 text-[#B0AEA8] text-[12px]">{helper}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-full bg-[#FAFAF8] text-[#2A9D8F]">
          <Icon className="size-5" />
        </div>
      </div>
    </Panel>
  );
}

function SaleDetail({ sale }: Readonly<{ sale: Sale }>) {
  const router = useRouter();
  const store = useBeharStore();
  const { download, print } = useDocument();
  const document = store.documents.find((entry) => entry.saleId === sale.id);
  const payment = sale.paymentId ? store.payments.find((entry) => entry.id === sale.paymentId) : store.payments.find((entry) => entry.saleId === sale.id);
  const repair = sale.repairId ? store.repairs.find((entry) => entry.id === sale.repairId) : undefined;
  const customer = store.customers.find((entry) => entry.id === sale.customerId);
  const isCounter = customer?.type === "counter" || sale.customerName === "Client comptoir";

  return (
    <Panel className="flex min-h-[420px] flex-col overflow-y-auto p-5">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-[#1A1916] text-[20px]">{sale.number}</h2>
          <p className="text-[#8A8984] text-[13px]">Créée le {sale.createdAt}</p>
        </div>
        <StatusBadge status={sale.status} />
      </div>

      <div className="space-y-1">
        <DetailRow label="Client" value={sale.customerName || "Client comptoir"} />
        <DetailRow label="Statut" value={sale.status} />
        <DetailRow label="Date" value={sale.paidAt || sale.createdAt} />
        <DetailRow label="Moyen de paiement" value={formatPaymentMethodLabel(sale.paymentMethod)} />
        {payment ? <DetailRow label="Paiement lié" value={payment.paymentNumber} /> : null}
        {document ? <DetailRow label="Document lié" value={document.title} /> : null}
        {repair ? <DetailRow label="Réparation liée" value={repair.number} /> : null}
        <DetailRow emphasize label="Total TTC" value={formatEuro(sale.total)} />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 font-medium text-[#1A1916] text-[14px]">Lignes produits</h3>
        <div className="space-y-2">
          {sale.lines.map((line) => (
            <div key={line.id} className="rounded-[12px] border border-[#E7E4DC] bg-[#FAFAF8] p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#1A1916]">{line.name}</p>
                  <p className="text-[#8A8984] text-xs">
                    {line.sku ? `${line.sku} · ` : ""}Qté {line.quantity} · {formatEuro(line.unitPrice)} / u
                  </p>
                  <p className="mt-1 text-[#8A8984] text-[11px]">
                    {line.itemKind === "refurbished-phone" ? "Téléphone reconditionné" : "Accessoire"}
                    {" · "}Garantie {line.warrantyMonths ? `${line.warrantyMonths} mois` : "non renseignée"}
                    {line.serialNumber ? ` · IMEI/série ${line.serialNumber}` : ""}
                    {line.conditionLabel ? ` · ${line.conditionLabel}` : ""}
                  </p>
                </div>
                <p className="font-semibold text-[#1A1916]">{formatEuro(line.total)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-2">
        {document ? (
          <>
            <SecondaryButton onClick={() => print("sale-receipt", sale.id)}>
              <Printer className="size-4" /> Voir facture de vente
            </SecondaryButton>
            <SecondaryButton onClick={() => download("sale-receipt", sale.id)}>
              <Download className="size-4" /> Télécharger PDF
            </SecondaryButton>
          </>
        ) : null}
        {payment ? (
          <SecondaryButton
            onClick={() => {
              store.setSelected("payment", payment.id);
              router.push("/dashboard/paiements");
            }}
          >
            <CreditCard className="size-4" /> Voir paiement lié
          </SecondaryButton>
        ) : null}
        {!isCounter ? (
          <Link
            href="/dashboard/clients"
            onClick={() => store.setSelected("customer", sale.customerId)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#E7E4DC] bg-white px-3 font-medium text-[#1A1916] text-xs transition-colors hover:bg-[#FAFAF8]"
          >
            <User className="size-4" /> Voir client
          </Link>
        ) : null}
        {repair ? (
          <SecondaryButton
            onClick={() => {
              store.setSelected("repair", repair.id);
              router.push("/dashboard/reparations");
            }}
          >
            <Wrench className="size-4" /> Voir réparation liée
          </SecondaryButton>
        ) : null}
      </div>
    </Panel>
  );
}

function NewSaleModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const store = useBeharStore();
  const [mode, setMode] = useState<"comptoir" | "repair">("comptoir");
  const [clientType, setClientType] = useState<"comptoir" | "existing" | "new">("comptoir");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedRepairId, setSelectedRepairId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showStockCreate, setShowStockCreate] = useState(false);
  const [itemKind, setItemKind] = useState<"accessory" | "refurbished-phone">("accessory");
  const [warrantyMonths, setWarrantyMonths] = useState(3);
  const [serialNumber, setSerialNumber] = useState("");
  const [conditionLabel, setConditionLabel] = useState("");
  const [stockDraft, setStockDraft] = useState({
    name: "",
    sku: "",
    purchasePrice: "",
    salePrice: "",
    stock: "1",
    supplier: "",
    categoryName: "",
    deviceType: "",
    brandName: "",
    modelName: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Carte");
  const [cart, setCart] = useState<CartLine[]>([]);

  const namedCustomers = store.customers.filter((customer) => customer.type !== "counter" && customer.name !== "Anonyme");
  const customerMatches = namedCustomers.filter((customer) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(q);
  });
  const eligibleRepairs = store.repairs.filter((repair) => !isRepairLocked(repair, store.invoices, store.payments));
  const selectedRepair = store.repairs.find((repair) => repair.id === selectedRepairId);
  const selectedRepairCustomer = store.customers.find((customer) => customer.id === selectedRepair?.customerId);
  const productMatches = store.stockItems
    .filter((item) => {
      const q = productSearch.trim().toLowerCase();
      const isSellable = item.stock > 0 && item.salePrice > 0;
      if (!isSellable) return false;
      if (!q) return true;
      return `${item.name} ${item.sku} ${item.brandName ?? ""} ${item.compatibleModels?.join(" ") ?? ""} ${item.reference ?? ""}`.toLowerCase().includes(q);
    })
    .slice(0, 8);
  const selectedProduct = store.stockItems.find((item) => item.id === selectedProductId);
  const total = cart.reduce((sum, line) => sum + line.total, 0);
  const validationMessage = getValidationMessage({ mode, clientType, selectedCustomerId, selectedRepair, newClientName, newClientPhone, cart, total, store });
  const canSubmit = !validationMessage;

  const addStockItemToCart = (product?: StockItem) => {
    if (!product) {
      toast.error("Sélectionnez un produit du stock.");
      return;
    }
    const q = Math.max(1, Math.floor(quantity || 1));
    const already = cart.find((line) => line.stockItemId === product.id)?.quantity ?? 0;
    if (product.salePrice <= 0) {
      toast.error("Le prix de vente doit être supérieur à 0 €.");
      return;
    }
    if (product.stock < already + q) {
      toast.error(`Stock insuffisant : ${product.stock} disponible.`);
      return;
    }
    const nextLine: CartLine = {
      stockItemId: product.id,
      name: product.name,
      sku: product.sku,
      itemKind,
      warrantyMonths,
      serialNumber: serialNumber.trim() || undefined,
      conditionLabel: conditionLabel.trim() || undefined,
      quantity: q,
      unitPrice: product.salePrice,
      total: q * product.salePrice,
      purchasePriceInternal: product.purchasePrice,
      supplierInternal: product.supplier,
    };
    setCart((current) => {
      const existing = current.find((line) => line.stockItemId === product.id);
      if (!existing) return [...current, nextLine];
      return current.map((line) =>
        line.stockItemId === product.id
          ? { ...line, quantity: line.quantity + q, total: (line.quantity + q) * line.unitPrice }
          : line,
      );
    });
    setProductSearch("");
    setSelectedProductId("");
    setQuantity(1);
    setSerialNumber("");
    setConditionLabel("");
    toast.success(`${product.name} ajouté au panier`);
  };

  const addProduct = () => {
    addStockItemToCart(selectedProduct);
  };

  const addCreatedStockToCart = () => {
    const name = stockDraft.name.trim() || productSearch.trim();
    const salePrice = Number(stockDraft.salePrice.replace(",", "."));
    const purchasePrice = Number(stockDraft.purchasePrice.replace(",", ".") || "0");
    const stock = Math.max(1, Math.floor(Number(stockDraft.stock) || 1));
    const categoryName = stockDraft.categoryName.trim();
    const deviceType = stockDraft.deviceType.trim();
    const brandName = stockDraft.brandName.trim();
    const modelName = stockDraft.modelName.trim();
    if (!name) {
      toast.error("Nom du produit obligatoire.");
      return;
    }
    if (!categoryName) {
      toast.error("Catégorie obligatoire.");
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      toast.error("Prix de vente obligatoire et supérieur à 0 €.");
      return;
    }
    if (!Number.isFinite(stock) || stock <= 0) {
      toast.error("Quantité obligatoire et supérieure à 0.");
      return;
    }
    const id = store.addStockItem({
      name,
      sku: stockDraft.sku.trim() || undefined,
      part: name,
      reference: stockDraft.sku.trim() || undefined,
      category: categoryName,
      categoryName,
      deviceType: (deviceType || undefined) as StockItem["deviceType"],
      brandName: brandName || undefined,
      // Pas de modèle par défaut : si vide → tableau vide, sinon le nom saisi
      compatibleModels: modelName ? [modelName] : [],
      modelIds: [],
      skipModelInference: true,
      purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
      salePrice,
      stock,
      quantity: stock,
      threshold: 1,
      supplier: stockDraft.supplier.trim() || "Comptoir",
      leadTime: "Disponible atelier",
    });
    if (!id) {
      toast.error("Impossible de créer la pièce : vérifiez vos droits stock.");
      return;
    }
    const created = useBeharStore.getState().stockItems.find((item) => item.id === id);
    if (!created) {
      toast.error("Impossible de créer la pièce en stock.");
      return;
    }
    const q = Math.max(1, Math.min(quantity || 1, created.stock));
    setCart((current) => [
      ...current,
      {
        stockItemId: created.id,
        name: created.name,
        sku: created.sku,
        itemKind,
        warrantyMonths,
        serialNumber: serialNumber.trim() || undefined,
        conditionLabel: conditionLabel.trim() || undefined,
        quantity: q,
        unitPrice: created.salePrice,
        total: created.salePrice * q,
        purchasePriceInternal: created.purchasePrice,
        supplierInternal: created.supplier,
      },
    ]);
    setProductSearch("");
    setSelectedProductId("");
    setQuantity(1);
    setItemKind("accessory");
    setWarrantyMonths(3);
    setSerialNumber("");
    setConditionLabel("");
    setShowStockCreate(false);
    setStockDraft({
      name: "",
      sku: "",
      purchasePrice: "",
      salePrice: "",
      stock: "1",
      supplier: "",
      categoryName: "",
      deviceType: "",
      brandName: "",
      modelName: "",
    });
    toast.success("Produit créé en stock et ajouté au panier.");
  };

  const submit = () => {
    if (!canSubmit) {
      toast.error(validationMessage || "Ajoutez au moins un produit pour créer la vente.");
      return;
    }

    if (mode === "repair") {
      if (!selectedRepair) {
        toast.error("Sélectionnez une réparation à rattacher.");
        return;
      }
      const repairCustomer = store.customers.find((entry) => entry.id === selectedRepair.customerId);
      const saleId = store.addSale({
        customerId: selectedRepair.customerId,
        customerName: repairCustomer?.name || "Client comptoir",
        lines: cart,
        repairId: selectedRepairId,
        status: "Rattachée",
      });
      if (!saleId) {
        toast.error("Impossible de créer la vente rattachée.");
        return;
      }
      const ok = store.addSaleLinesToRepair(selectedRepairId, cart, saleId);
      if (!ok) {
        store.deleteSale(saleId);
        toast.error("Cette réparation est déjà facturée. Créez une vente séparée.");
        return;
      }
      store.setSelected("sale", saleId);
      toast.success("Produits ajoutés au dossier réparation et vente rattachée enregistrée.");
      onClose();
      return;
    }

    let customerId = "counter";
    let customerName = "Client comptoir";
    if (clientType === "existing") {
      const customer = store.customers.find((entry) => entry.id === selectedCustomerId);
      if (!customer) {
        toast.error("Sélectionnez un client existant.");
        return;
      }
      customerId = customer.id;
      customerName = customer.name;
    }
    if (clientType === "new") {
      const existing = namedCustomers.find(
        (customer) =>
          customer.name.trim().toLowerCase() === newClientName.trim().toLowerCase() &&
          customer.phone.replace(/\D/g, "") === newClientPhone.replace(/\D/g, ""),
      );
      customerId =
        existing?.id ||
        store.addCustomer({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          email: newClientEmail.trim(),
          source: "Vente comptoir",
        });
      customerName = existing?.name || newClientName.trim();
    }

    const saleId = store.addSale({ customerId, customerName, lines: cart });
    const paymentId = saleId ? store.paySale(saleId, paymentMethod) : "";
    if (!saleId || !paymentId) {
      toast.error("Encaissement impossible : vérifiez le panier et le stock.");
      return;
    }
    store.setSelected("sale", saleId);
    toast.success("Vente encaissée.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1916]/20 p-3 backdrop-blur-sm">
      <Panel className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-[#E7E4DC] border-b p-5">
          <h2 className="font-semibold text-[#1A1916] text-xl">Nouvelle vente</h2>
          <button aria-label="Fermer" onClick={onClose} className="text-[#6B6B6B] hover:text-[#1A1916]" type="button">
            <XCircle className="size-6" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto p-5">
          <section className="space-y-3">
            <h3 className="font-medium text-[#1A1916]">Mode</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeButton active={mode === "comptoir"} icon={ShoppingBag} label="Vente comptoir" onClick={() => setMode("comptoir")} />
              <ModeButton active={mode === "repair"} icon={Wrench} label="Rattacher à une réparation" onClick={() => setMode("repair")} />
            </div>
          </section>

          {mode === "comptoir" ? (
            <section className="space-y-3">
              <h3 className="font-medium text-[#1A1916]">Client</h3>
              <div className="flex flex-wrap gap-2">
                {(["comptoir", "existing", "new"] as const).map((type) => (
                  <button
                    key={type}
                    className={`rounded-full px-4 py-2 font-medium text-sm transition-colors ${
                      clientType === type ? "bg-[#1A1916] text-white" : "bg-[#FAFAF8] text-[#6B6B6B] hover:text-[#1A1916]"
                    }`}
                    onClick={() => setClientType(type)}
                    type="button"
                  >
                    {type === "comptoir" ? "Client comptoir" : type === "existing" ? "Client existant" : "Nouveau client"}
                  </button>
                ))}
              </div>

              {clientType === "comptoir" ? (
                <p className="rounded-[12px] border border-[#E7E4DC] bg-[#FAFAF8] p-3 text-[#6B6B6B] text-sm">
                  Client comptoir sera utilisé pour cette vente. Aucun client "Anonyme" ne sera créé.
                </p>
              ) : null}

              {clientType === "existing" ? (
                <div className="space-y-3">
                  <input
                    className="h-11 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]"
                    placeholder="Rechercher par nom, téléphone ou email"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                  />
                  <select
                    className="h-11 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]"
                    value={selectedCustomerId}
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                  >
                    <option value="">Sélectionner un client...</option>
                    {customerMatches.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone ? `— ${customer.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {clientType === "new" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="h-11 rounded-[12px] border border-[#E7E4DC] px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="Nom *" value={newClientName} onChange={(event) => setNewClientName(event.target.value)} />
                  <input className="h-11 rounded-[12px] border border-[#E7E4DC] px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="Téléphone *" value={newClientPhone} onChange={(event) => setNewClientPhone(event.target.value)} />
                  <input className="h-11 rounded-[12px] border border-[#E7E4DC] px-3 text-sm outline-none focus:border-[#2A9D8F] sm:col-span-2" placeholder="Email optionnel" type="email" value={newClientEmail} onChange={(event) => setNewClientEmail(event.target.value)} />
                </div>
              ) : null}
            </section>
          ) : (
            <section className="space-y-3">
              <h3 className="font-medium text-[#1A1916]">Réparation liée</h3>
              {eligibleRepairs.length ? (
                <select className="h-11 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" value={selectedRepairId} onChange={(event) => setSelectedRepairId(event.target.value)}>
                  <option value="">Sélectionner une réparation non facturée...</option>
                  {eligibleRepairs.map((repair) => {
                    const customer = store.customers.find((entry) => entry.id === repair.customerId);
                    return (
                      <option key={repair.id} value={repair.id}>
                        {repair.number} — {customer?.name || "Client comptoir"} — {repair.deviceModel || repair.device} — {formatEuro(repair.total ?? repair.amount)}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="rounded-[12px] border border-[#E7E4DC] bg-[#FAFAF8] p-3 text-[#6B6B6B] text-sm">
                  Aucune réparation non facturée disponible.
                </p>
              )}
              {selectedRepair ? (
                <div className="grid gap-2 rounded-[14px] border border-[#E7E4DC] bg-[#FAFAF8] p-4 text-sm sm:grid-cols-2">
                  <DetailMini label="Numéro" value={selectedRepair.number} />
                  <DetailMini label="Client" value={selectedRepairCustomer?.name || "Client comptoir"} />
                  <DetailMini label="Appareil" value={selectedRepair.deviceModel || selectedRepair.device} />
                  <DetailMini label="Statut" value={selectedRepair.status} />
                  <DetailMini label="Total actuel" value={formatEuro(selectedRepair.total ?? selectedRepair.amount)} />
                </div>
              ) : null}
            </section>
          )}

          <section className="space-y-3">
            <h3 className="font-medium text-[#1A1916]">Produit / accessoire</h3>
            <div className="rounded-[14px] border border-[#E7E4DC] bg-[#FAFAF8] p-3">
              <div className="grid gap-3 md:grid-cols-[190px_110px_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="text-[#6B6B6B] text-xs">
                  Type de vente
                  <select
                    className="mt-1 h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
                    onChange={(event) => {
                      const nextKind = event.target.value as typeof itemKind;
                      setItemKind(nextKind);
                      setWarrantyMonths(nextKind === "refurbished-phone" ? 12 : 3);
                    }}
                    value={itemKind}
                  >
                    <option value="accessory">Accessoire / pièce</option>
                    <option value="refurbished-phone">Téléphone reconditionné</option>
                  </select>
                </label>
                <label className="text-[#6B6B6B] text-xs">
                  Garantie
                  <select
                    className="mt-1 h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
                    onChange={(event) => setWarrantyMonths(Math.max(0, Number(event.target.value) || 0))}
                    value={warrantyMonths}
                  >
                    <option value={0}>Sans</option>
                    <option value={3}>3 mois</option>
                    <option value={6}>6 mois</option>
                    <option value={12}>12 mois</option>
                    <option value={24}>24 mois</option>
                  </select>
                </label>
                <input
                  className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F] md:mt-5"
                  onChange={(event) => setSerialNumber(event.target.value)}
                  placeholder="IMEI / n° série si téléphone"
                  value={serialNumber}
                />
                <input
                  className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F] md:mt-5"
                  onChange={(event) => setConditionLabel(event.target.value)}
                  placeholder="État : reconditionné, grade A..."
                  value={conditionLabel}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6B6B6B]" />
                <input
                  className="h-11 w-full rounded-[12px] border border-[#E7E4DC] pl-10 pr-3 text-sm outline-none transition focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10"
                  placeholder="Nom, SKU, marque, modèle..."
                  value={productSearch}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setSelectedProductId("");
                  }}
                />
              </div>
              <input className="h-11 rounded-[12px] border border-[#E7E4DC] px-3 text-center text-sm outline-none focus:border-[#2A9D8F]" min={1} type="number" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
              <PrimaryButton className="h-11" disabled={!selectedProduct} onClick={addProduct}>
                <Plus className="size-4" /> Ajouter au panier
              </PrimaryButton>
            </div>
            {productSearch ? (
              <div className="overflow-hidden rounded-[14px] border border-[#E7E4DC] bg-white">
                {productMatches.length ? (
                  productMatches.map((item) => (
                    <div
                      key={item.id}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 border-[#E7E4DC] border-b p-3 text-left text-sm last:border-b-0 hover:bg-[#FAFAF8] ${selectedProductId === item.id ? "bg-[#EAF6F2]" : ""}`}
                      onClick={() => {
                        setSelectedProductId(item.id);
                        setProductSearch(`${item.name}${item.sku ? ` · ${item.sku}` : ""}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedProductId(item.id);
                          setProductSearch(`${item.name}${item.sku ? ` · ${item.sku}` : ""}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1916]">{item.name}</p>
                        <p className="text-[#6B6B6B] text-xs">
                          {item.sku || item.reference || "Sans SKU"} · Stock disponible : {item.stock}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold text-[#2A9D8F]">{formatEuro(item.salePrice)}</span>
                        <span
                          className="rounded-full border border-[#2A9D8F]/35 bg-[#EAF6F2] px-2.5 py-1 font-semibold text-[#147065] text-[11px]"
                          onClick={(event) => {
                            event.stopPropagation();
                            addStockItemToCart(item);
                          }}
                        >
                          Ajouter
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-[#6B6B6B] text-sm">Produit introuvable.</p>
                    <button
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-[#2A9D8F]/40 bg-[#EAF6F2] px-3 font-medium text-[#147065] text-xs"
                      onClick={() => {
                        setShowStockCreate(true);
                        setStockDraft((draft) => ({ ...draft, name: draft.name || productSearch.trim() }));
                      }}
                      type="button"
                    >
                      <Package className="size-3.5" />
                      Créer en stock
                    </button>
                  </div>
                )}
                {productMatches.length ? (
                  <div className="border-[#E7E4DC] border-t bg-[#FAFAF8] p-3 text-center">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-[#2A9D8F]/40 bg-[#EAF6F2] px-3 font-medium text-[#147065] text-xs"
                      onClick={() => {
                        setShowStockCreate(true);
                        setStockDraft((draft) => ({ ...draft, name: productSearch.trim() }));
                      }}
                      type="button"
                    >
                      <Package className="size-3.5" />
                      Créer un nouveau produit
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[14px] border border-[#E7E4DC] bg-white">
                {productMatches.length ? (
                  productMatches.map((item) => (
                    <div
                      key={item.id}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 border-[#E7E4DC] border-b p-3 text-left text-sm last:border-b-0 hover:bg-[#FAFAF8] ${selectedProductId === item.id ? "bg-[#EAF6F2]" : ""}`}
                      onClick={() => {
                        setSelectedProductId(item.id);
                        setProductSearch(`${item.name}${item.sku ? ` · ${item.sku}` : ""}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedProductId(item.id);
                          setProductSearch(`${item.name}${item.sku ? ` · ${item.sku}` : ""}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1916]">{item.name}</p>
                        <p className="text-[#6B6B6B] text-xs">
                          {item.sku || item.reference || "Sans SKU"} · Stock disponible : {item.stock}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold text-[#2A9D8F]">{formatEuro(item.salePrice)}</span>
                        <span
                          className="rounded-full border border-[#2A9D8F]/35 bg-[#EAF6F2] px-2.5 py-1 font-semibold text-[#147065] text-[11px]"
                          onClick={(event) => {
                            event.stopPropagation();
                            addStockItemToCart(item);
                          }}
                        >
                          Ajouter
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-[#6B6B6B] text-sm">Aucun produit vendable en stock.</p>
                    <button
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-[#2A9D8F]/40 bg-[#EAF6F2] px-3 font-medium text-[#147065] text-xs"
                      onClick={() => setShowStockCreate(true)}
                      type="button"
                    >
                      <Package className="size-3.5" />
                      Créer en stock
                    </button>
                  </div>
                )}
              </div>
            )}
            {showStockCreate ? (
              <div className="rounded-[14px] border border-[#DDEFEA] bg-[#F7FCFA] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-semibold text-[#1A1916] text-sm">Créer une pièce en stock</p>
                  <button className="text-[#6B6B6B] hover:text-[#1A1916]" onClick={() => setShowStockCreate(false)} type="button">
                    <XCircle className="size-4" />
                  </button>
                </div>

                <p className="mb-2 mt-3 text-[11px] font-medium uppercase tracking-wider text-[#8A8984]">Informations produit</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="Nom produit *" value={stockDraft.name} onChange={(event) => setStockDraft((draft) => ({ ...draft, name: event.target.value }))} />
                  <input className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="SKU / référence" value={stockDraft.sku} onChange={(event) => setStockDraft((draft) => ({ ...draft, sku: event.target.value }))} />
                  <select className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" value={stockDraft.categoryName} onChange={(event) => setStockDraft((draft) => ({ ...draft, categoryName: event.target.value }))}>
                    <option value="">Catégorie *</option>
                    <option value="Écran">Écran</option>
                    <option value="Batterie">Batterie</option>
                    <option value="Connecteur de charge">Connecteur de charge</option>
                    <option value="Caméra">Caméra</option>
                    <option value="Haut-parleur">Haut-parleur</option>
                    <option value="Micro">Micro</option>
                    <option value="Bouton">Bouton</option>
                    <option value="Accessoire">Accessoire</option>
                    <option value="Coque">Coque</option>
                    <option value="Protection écran">Protection écran</option>
                    <option value="Câble / chargeur">Câble / chargeur</option>
                    <option value="Console">Console</option>
                    <option value="PC">PC</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider text-[#8A8984]">Compatibilité (facultatif)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" value={stockDraft.deviceType} onChange={(event) => setStockDraft((draft) => ({ ...draft, deviceType: event.target.value }))}>
                    <option value="">Type appareil — non défini</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Tablette">Tablette</option>
                    <option value="Ordinateur">Ordinateur</option>
                    <option value="Console">Console</option>
                    <option value="Accessoire générique">Accessoire générique</option>
                    <option value="Autre">Autre</option>
                  </select>
                  <select className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" value={stockDraft.brandName} onChange={(event) => setStockDraft((draft) => ({ ...draft, brandName: event.target.value }))}>
                    <option value="">Marque — non définie</option>
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Sony">Sony</option>
                    <option value="Nintendo">Nintendo</option>
                    <option value="PC Portable">PC Portable</option>
                    <option value="Générique">Générique</option>
                    <option value="Autre">Autre</option>
                  </select>
                  <input className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F] sm:col-span-2" placeholder="Modèle compatible (laisser vide = Non défini)" value={stockDraft.modelName} onChange={(event) => setStockDraft((draft) => ({ ...draft, modelName: event.target.value }))} />
                </div>

                <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider text-[#8A8984]">Prix &amp; stock</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="Prix achat interne (facultatif)" inputMode="decimal" value={stockDraft.purchasePrice} onChange={(event) => setStockDraft((draft) => ({ ...draft, purchasePrice: event.target.value }))} />
                  <input className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="Prix vente *" inputMode="decimal" value={stockDraft.salePrice} onChange={(event) => setStockDraft((draft) => ({ ...draft, salePrice: event.target.value }))} />
                  <input className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="Quantité *" inputMode="numeric" value={stockDraft.stock} onChange={(event) => setStockDraft((draft) => ({ ...draft, stock: event.target.value }))} />
                  <input className="h-10 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" placeholder="Fournisseur interne (facultatif)" value={stockDraft.supplier} onChange={(event) => setStockDraft((draft) => ({ ...draft, supplier: event.target.value }))} />
                </div>

                <SecondaryButton className="mt-4 h-10" onClick={addCreatedStockToCart}>
                  <Plus className="size-4" />
                  Créer et ajouter au panier
                </SecondaryButton>
              </div>
            ) : null}
            {selectedProduct ? <p className="text-[#6B6B6B] text-xs">Stock disponible : {selectedProduct.stock} · Prix de vente : {formatEuro(selectedProduct.salePrice)}</p> : null}
          </section>

          <section className="space-y-3 border-[#E7E4DC] border-t pt-5">
            <h3 className="font-medium text-[#1A1916]">Panier</h3>
            {cart.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[#E7E4DC] py-8 text-center text-[#6B6B6B] text-sm">
                Le panier est vide.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.stockItemId} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E7E4DC] bg-[#FAFAF8] p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#1A1916] text-sm">{line.name}</p>
                      <p className="text-[#6B6B6B] text-xs">
                        {line.sku ? `${line.sku} · ` : ""}Qté {line.quantity} · {formatEuro(line.unitPrice)} / u
                      </p>
                      <p className="mt-1 text-[#8A8984] text-[11px]">
                        {line.itemKind === "refurbished-phone" ? "Téléphone reconditionné" : "Accessoire"}
                        {" · "}Garantie {line.warrantyMonths ? `${line.warrantyMonths} mois` : "non renseignée"}
                        {line.serialNumber ? ` · IMEI/série ${line.serialNumber}` : ""}
                        {line.conditionLabel ? ` · ${line.conditionLabel}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#1A1916]">{formatEuro(line.total)}</span>
                      <button className="grid size-8 place-items-center rounded-lg text-[#B42318] hover:bg-white" onClick={() => setCart((current) => current.filter((entry) => entry.stockItemId !== line.stockItemId))} type="button">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="shrink-0 border-[#E7E4DC] border-t bg-[#FAFAF8] p-5">
          {mode === "comptoir" ? (
            <div className="mb-3 max-w-xs">
              <label className="mb-1 block text-[#6B6B6B] text-xs">Paiement simulé</label>
              <select className="h-10 w-full rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {formatPaymentMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="mb-4 flex items-center justify-between">
            <span className="font-medium text-[#1A1916]">Total</span>
            <span className="font-bold text-2xl text-[#1A1916]">{formatEuro(total)}</span>
          </div>
          {validationMessage ? <p className="mb-3 text-[#B42318] text-sm">{validationMessage}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
            <PrimaryButton disabled={!canSubmit} onClick={submit}>
              {mode === "comptoir" ? (
                <>
                  <CheckCircle2 className="size-4" /> Encaisser la vente
                </>
              ) : (
                <>
                  <FileText className="size-4" /> Ajouter au dossier réparation
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }: Readonly<{ active: boolean; icon: typeof ShoppingBag; label: string; onClick: () => void }>) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-[14px] border p-4 font-medium text-sm transition ${
        active ? "border-[#2A9D8F] bg-[#EAF6F2] text-[#147065]" : "border-[#E7E4DC] bg-white text-[#1A1916] hover:border-[#2A9D8F]/50"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

function DetailMini({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[#6B6B6B] text-xs">{label}</p>
      <p className="font-medium text-[#1A1916]">{value}</p>
    </div>
  );
}

function isRepairLocked(repair: Repair, invoices: ReturnType<typeof useBeharStore.getState>["invoices"], payments: ReturnType<typeof useBeharStore.getState>["payments"]) {
  const invoiced = invoices.some((invoice) => invoice.repairId === repair.id && invoice.status !== "Annulée");
  const paid = payments.some((payment) => payment.repairId === repair.id && payment.status === "Payé");
  return invoiced || paid;
}

function getValidationMessage({
  mode,
  clientType,
  selectedCustomerId,
  selectedRepair,
  newClientName,
  newClientPhone,
  cart,
  total,
  store,
}: {
  mode: "comptoir" | "repair";
  clientType: "comptoir" | "existing" | "new";
  selectedCustomerId: string;
  selectedRepair?: Repair;
  newClientName: string;
  newClientPhone: string;
  cart: CartLine[];
  total: number;
  store: ReturnType<typeof useBeharStore.getState>;
}) {
  if (!cart.length || total <= 0) return "Ajoutez au moins un produit pour créer la vente.";
  for (const line of cart) {
    const item = store.stockItems.find((entry: StockItem) => entry.id === line.stockItemId);
    if (!item) return "Produit introuvable dans le stock.";
    if (line.quantity <= 0) return "La quantité doit être supérieure à 0.";
    if (line.unitPrice <= 0) return "Le prix de vente doit être supérieur à 0 €.";
    if (item.stock < line.quantity) return `Stock insuffisant pour ${line.name}.`;
  }
  if (mode === "repair") {
    if (!selectedRepair) return "Sélectionnez une réparation.";
    if (isRepairLocked(selectedRepair, store.invoices, store.payments)) return "Cette réparation est déjà facturée. Créez une vente séparée.";
  }
  if (mode === "comptoir" && clientType === "existing" && !selectedCustomerId) return "Sélectionnez un client existant.";
  if (mode === "comptoir" && clientType === "new") {
    if (!newClientName.trim()) return "Le nom du client est obligatoire.";
    if (!newClientPhone.trim()) return "Le téléphone du client est obligatoire.";
  }
  return "";
}
