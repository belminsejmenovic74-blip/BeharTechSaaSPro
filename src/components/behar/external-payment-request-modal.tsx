"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { ExternalPaymentBrand, externalPaymentBrandLabel } from "@/components/behar/external-payment-brand";
import { Modal, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import {
  formatCurrency,
  getInvoiceTotal,
  getVatSummary,
  type Customer,
  type Invoice,
  useBeharStore,
} from "@/lib/behar-store";
import { cn } from "@/lib/utils";
import type { WorkshopCurrency } from "@/lib/workshop-country";

type ProviderName = "stripe" | "sumup" | "paypal" | "square" | "revolut" | "mollie";
type Connection = {
  provider: ProviderName;
  dashboardUrl: string;
  connectionMode: "oauth" | "manual" | "commerce" | "api_key";
  connectionState: "connected" | "reconnect_required" | "incomplete";
  isDefault: boolean;
};
type Reader = { id: string; reader_id: string; reader_name: string };
type Shop = { id: string; name: string };
type DeliveryChannel = "link" | "terminal";
type CreatedRequest = {
  id: string;
  hosted_url: string | null;
  delivery_channel: DeliveryChannel;
  technical_state: "created" | "sent";
};
type Step = "provider" | "channel" | "success";

const TERMINAL_PROVIDERS: ProviderName[] = ["sumup", "square", "revolut"];

export function ExternalPaymentRequestModal({
  invoice,
  customer,
  isOpen,
  onClose,
  provider,
}: Readonly<{ invoice: Invoice; customer?: Customer; isOpen: boolean; onClose: () => void; provider?: ProviderName }>) {
  const store = useBeharStore();
  const workshopId = store.cloudSync?.workshopId;
  const licenseKey = store.licenseKey;
  const repair = invoice.repairId ? store.repairs.find((entry) => entry.id === invoice.repairId) : undefined;
  const [connections, setConnections] = useState<Connection[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>(provider ?? "stripe");
  const [step, setStep] = useState<Step>("provider");
  const [readers, setReaders] = useState<Reader[]>([]);
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>("link");
  const [readerId, setReaderId] = useState("");
  const [terminalEnabled, setTerminalEnabled] = useState(false);
  const [revolutMethodsConfirmed, setRevolutMethodsConfirmed] = useState(false);
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const currency = invoice.currency ?? "EUR";
  const total = getInvoiceTotal(invoice);
  const vat = getVatSummary(invoice.lines, store.workshopInfo);
  const finalized = invoice.status !== "Brouillon" && invoice.status !== "Annulée" && total > 0;
  const credentials = useMemo(
    () =>
      workshopId && licenseKey
        ? { workshopId, licenseKey, ...(invoice.shopId ? { shopId: invoice.shopId } : {}) }
        : null,
    [workshopId, licenseKey, invoice.shopId],
  );

  useEffect(() => {
    if (!isOpen || !credentials) return;
    setCreated(null);
    setQrDataUrl("");
    setStep("provider");
    setDeliveryChannel("link");
    setRevolutMethodsConfirmed(false);
    setReaderId("");
    setLoading(true);
    fetch("/api/external-payments/connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "list", ...credentials }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Chargement impossible.");
        const available = (result.connections || []) as Connection[];
        setConnections(available);
        setShops(result.shops || []);
        setTerminalEnabled(Boolean(result.terminalDispatchEnabled));
        const requested = provider && available.find((entry) => entry.provider === provider);
        const preferred = requested || available.find((entry) => entry.isDefault) || available[0];
        if (preferred) setSelectedProvider(preferred.provider);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, [isOpen, credentials, provider]);

  useEffect(() => {
    if (!isOpen || !credentials || !TERMINAL_PROVIDERS.includes(selectedProvider)) {
      setReaders([]);
      return;
    }
    const endpoint =
      selectedProvider === "square"
        ? "/api/external-payments/square-terminals"
        : selectedProvider === "revolut"
          ? "/api/external-payments/revolut-terminals"
          : "/api/external-payments/readers";
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "list", ...credentials }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok && response.status !== 409)
          throw new Error(result.error || "Chargement des terminaux impossible.");
        const availableReaders = (
          selectedProvider === "square"
            ? (result.terminals || []).map((terminal: { id: string; device_id: string; terminal_name: string }) => ({
                id: terminal.id,
                reader_id: terminal.device_id,
                reader_name: terminal.terminal_name,
              }))
            : selectedProvider === "revolut"
              ? (result.terminals || []).map(
                  (terminal: { id: string; terminal_id: string; terminal_name: string }) => ({
                    id: terminal.id,
                    reader_id: terminal.terminal_id,
                    reader_name: terminal.terminal_name,
                  }),
                )
              : result.readers || []
        ) as Reader[];
        setReaders(availableReaders);
        setReaderId(availableReaders[0]?.reader_id || "");
        if (selectedProvider !== "sumup") setTerminalEnabled(availableReaders.length > 0);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des terminaux impossible."));
  }, [isOpen, credentials, selectedProvider]);

  useEffect(() => {
    if (!created?.hosted_url) return;
    QRCode.toDataURL(created.hosted_url, { width: 360, margin: 1, color: { dark: "#111111", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [created?.hosted_url]);

  const orderedConnections = useMemo(
    () =>
      [...connections]
        .filter((connection) => connection.connectionState === "connected")
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [connections],
  );
  const selectedConnection = connections.find((connection) => connection.provider === selectedProvider);
  const selectedReader = readers.find((reader) => reader.reader_id === readerId);
  const shopName = shops.find((shop) => shop.id === invoice.shopId)?.name || shops[0]?.name || "Boutique active";
  const providerLabel = externalPaymentBrandLabel(selectedProvider);
  const hostedUrl = created?.hosted_url || "";
  const customerMessage = `Bonjour ${customer?.name?.split(" ")[0] || ""}, votre facture ${invoice.number} d’un montant de ${formatCurrency(total, currency)} est disponible. Vous pouvez utiliser ce lien pour accéder au service de paiement sécurisé de ${providerLabel} : ${hostedUrl}`;

  const createRequest = async () => {
    if (
      !credentials ||
      !finalized ||
      !selectedConnection ||
      selectedConnection.connectionState !== "connected" ||
      (deliveryChannel === "terminal" && !readerId) ||
      (selectedProvider === "revolut" && deliveryChannel === "link" && !revolutMethodsConfirmed)
    )
      return;
    setLoading(true);
    try {
      const response = await fetch("/api/external-payments/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          invoiceId: invoice.id,
          provider: selectedProvider,
          deliveryChannel,
          ...(deliveryChannel === "terminal" ? { readerId } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Création impossible.");
      setCreated(result.request);
      setStep("success");
      toast.success(
        deliveryChannel === "terminal"
          ? `Demande transmise au terminal ${selectedReader?.reader_name || providerLabel}.`
          : `Demande créée via ${providerLabel}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setCreated(null);
    setStep("provider");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={step === "success" ? "Demande créée" : "Demander le paiement"}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <InvoiceSummary
          customer={customer}
          currency={currency}
          device={repair?.deviceModel || repair?.device || invoice.sourceNumber || "Facture client"}
          invoice={invoice}
          shopName={shopName}
          total={total}
          totalHt={vat.ht}
          vatAmount={vat.tva}
        />

        {step === "provider" ? (
          <>
            <div>
              <h3 className="font-semibold text-[#1A1916] text-[16px]">Choisir un service</h3>
              {loading ? (
                <div className="grid h-32 place-items-center">
                  <Loader2 className="size-6 animate-spin text-[#2A9D8F]" />
                </div>
              ) : orderedConnections.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {orderedConnections.map((connection) => (
                    <button
                      className={cn(
                        "relative flex min-h-[98px] items-center gap-3 rounded-[15px] border bg-white p-4 text-left transition",
                        selectedProvider === connection.provider
                          ? "border-[#2A9D8F] bg-[#F4FBF9] shadow-[0_0_0_1px_rgba(42,157,143,.08)]"
                          : "border-[#E8E8E5] hover:border-[#2A9D8F]/45",
                      )}
                      key={connection.provider}
                      onClick={() => setSelectedProvider(connection.provider)}
                      type="button"
                    >
                      <ExternalPaymentBrand compact provider={connection.provider} />
                      {connection.isDefault ? (
                        <span className="absolute right-3 bottom-2 rounded-[6px] border border-[#2A9D8F] px-1.5 py-0.5 font-medium text-[#167B70] text-[10px]">
                          Par défaut
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-[15px] border border-[#E8E8E5] bg-[#FAFAF8] p-5">
                  <p className="font-semibold text-[#1A1916]">Aucun service de paiement n’est encore configuré.</p>
                  <Link
                    className="mt-3 inline-flex font-semibold text-[#167B70] text-sm"
                    href="/client?section=paiements"
                  >
                    Configurer mes services de paiement
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-[14px] border border-[#D7EFEA] bg-[#F1FAF8] px-4 py-3 text-[#47706B] text-sm">
              <ShieldCheck className="size-5 shrink-0 text-[#2A9D8F]" />
              Le montant vient de la facture et ne peut pas être modifié.
            </div>
            <ModalActions
              backLabel="Annuler"
              disabled={!finalized || !selectedConnection || selectedConnection.connectionState !== "connected"}
              loading={false}
              nextLabel="Continuer"
              onBack={close}
              onNext={() => {
                setDeliveryChannel("link");
                setStep("channel");
              }}
            />
          </>
        ) : null}

        {step === "channel" ? (
          <>
            <div>
              <h3 className="font-semibold text-[#1A1916] text-[16px]">Choisir le mode d’envoi</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ChannelCard
                  active={deliveryChannel === "link"}
                  description="À partager par SMS, e-mail ou QR code"
                  icon={Link2}
                  label="Créer un lien de paiement"
                  onClick={() => setDeliveryChannel("link")}
                />
                {TERMINAL_PROVIDERS.includes(selectedProvider) ? (
                  <ChannelCard
                    active={deliveryChannel === "terminal"}
                    description={
                      readers.length
                        ? "Le montant s’affiche sur votre terminal"
                        : "Aucun terminal associé à cette boutique"
                    }
                    disabled={!terminalEnabled || readers.length === 0}
                    icon={Smartphone}
                    label={`Envoyer au terminal ${selectedProvider === "sumup" ? "Solo" : providerLabel}`}
                    onClick={() => setDeliveryChannel("terminal")}
                  />
                ) : null}
              </div>
            </div>
            {deliveryChannel === "terminal" && selectedReader ? (
              <div className="flex items-center gap-3 rounded-[14px] border border-[#E8E8E5] bg-white p-4">
                <span className="grid size-11 place-items-center rounded-[11px] border border-[#E8E8E5] text-[#2A9D8F]">
                  <Smartphone className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A1916] text-sm">{selectedReader.reader_name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[#2A9D8F] text-xs">
                    <span className="size-1.5 rounded-full bg-current" />
                    Associé
                  </p>
                </div>
                {readers.length > 1 ? (
                  <select
                    className="h-10 rounded-[10px] border border-[#E8E8E5] px-3 text-sm"
                    onChange={(event) => setReaderId(event.target.value)}
                    value={readerId}
                  >
                    {readers.map((reader) => (
                      <option key={reader.id} value={reader.reader_id}>
                        {reader.reader_name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
            {selectedProvider === "revolut" && deliveryChannel === "link" ? (
              <label className="flex items-start gap-3 rounded-[14px] border border-[#F0D9A7] bg-[#FFF8E8] p-4 text-[#6B5125] text-xs leading-relaxed">
                <input
                  checked={revolutMethodsConfirmed}
                  className="mt-0.5 size-4 accent-[#167B70]"
                  onChange={(event) => setRevolutMethodsConfirmed(event.target.checked)}
                  type="checkbox"
                />
                J’ai vérifié que seuls carte, Apple Pay, Google Pay et Revolut Pay sont actifs dans Revolut Business.
              </label>
            ) : null}
            <div className="flex items-center gap-3 rounded-[14px] border border-[#D7EFEA] bg-[#F1FAF8] px-4 py-3 text-[#47706B] text-sm">
              <ShieldCheck className="size-5 shrink-0 text-[#2A9D8F]" />
              Le règlement est géré en dehors de Behar Tech Pro par {providerLabel}.
            </div>
            <ModalActions
              backLabel="Retour"
              disabled={
                (deliveryChannel === "terminal" && !readerId) ||
                (selectedProvider === "revolut" && deliveryChannel === "link" && !revolutMethodsConfirmed)
              }
              loading={loading}
              nextLabel={
                deliveryChannel === "terminal"
                  ? `Envoyer ${formatCurrency(total, currency)} au terminal`
                  : `Créer le lien ${providerLabel}`
              }
              onBack={() => setStep("provider")}
              onNext={createRequest}
            />
          </>
        ) : null}

        {step === "success" && created ? (
          <SuccessView
            connection={selectedConnection}
            created={created}
            customer={customer}
            customerMessage={customerMessage}
            hostedUrl={hostedUrl}
            onClose={close}
            provider={selectedProvider}
            qrDataUrl={qrDataUrl}
            readerName={selectedReader?.reader_name}
          />
        ) : null}
      </div>
    </Modal>
  );
}

function InvoiceSummary({
  invoice,
  customer,
  device,
  total,
  totalHt,
  vatAmount,
  currency,
  shopName,
}: Readonly<{
  invoice: Invoice;
  customer?: Customer;
  device: string;
  total: number;
  totalHt: number;
  vatAmount: number;
  currency: WorkshopCurrency;
  shopName: string;
}>) {
  return (
    <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center text-[#2A9D8F]">
          <FileText className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1A1916] text-[16px]">Facture {invoice.number}</p>
          <p className="mt-0.5 truncate text-[#1A1916] text-sm">
            {customer?.name || "Client"} · {device}
          </p>
          <p className="mt-1 text-[#8A8A8A] text-xs">{shopName}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-bold text-[#1A1916] text-[28px] tracking-tight tabular-nums">
            {formatCurrency(total, currency)} <span className="text-sm">TTC</span>
          </p>
          <p className="mt-1 text-[#8A8A8A] text-[11px]">
            HT {formatCurrency(totalHt, currency)} · TVA {formatCurrency(vatAmount, currency)}
          </p>
        </div>
      </div>
    </section>
  );
}

function ChannelCard({
  icon: Icon,
  label,
  description,
  active,
  disabled,
  onClick,
}: Readonly<{
  icon: typeof Link2;
  label: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      className={cn(
        "relative min-h-[150px] rounded-[16px] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-[#2A9D8F] bg-[#F4FBF9]" : "border-[#E8E8E5] bg-white hover:border-[#2A9D8F]/40",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-8 text-[#2A9D8F]" />
      <p className="mt-5 font-semibold text-[#1A1916] text-[16px]">{label}</p>
      <p className="mt-1 text-[#6B6B6B] text-sm">{description}</p>
      {active ? <CheckCircle2 className="absolute top-4 right-4 size-5 text-[#2A9D8F]" /> : null}
    </button>
  );
}

function ModalActions({
  backLabel,
  nextLabel,
  onBack,
  onNext,
  disabled,
  loading,
}: Readonly<{
  backLabel: string;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  disabled: boolean;
  loading: boolean;
}>) {
  return (
    <div className="grid gap-3 border-[#EFEFEC] border-t pt-4 sm:grid-cols-2">
      <SecondaryButton className="h-12 justify-center" onClick={onBack}>
        {backLabel}
      </SecondaryButton>
      <PrimaryButton className="h-12 justify-center" disabled={disabled || loading} onClick={onNext}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {nextLabel}
      </PrimaryButton>
    </div>
  );
}

function SuccessView({
  provider,
  connection,
  created,
  hostedUrl,
  qrDataUrl,
  customer,
  customerMessage,
  readerName,
  onClose,
}: Readonly<{
  provider: ProviderName;
  connection?: Connection;
  created: CreatedRequest;
  hostedUrl: string;
  qrDataUrl: string;
  customer?: Customer;
  customerMessage: string;
  readerName?: string;
  onClose: () => void;
}>) {
  const providerLabel = externalPaymentBrandLabel(provider);
  const terminal = created.delivery_channel === "terminal";
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#E8E8E5] text-[#2A9D8F]">
        <Check className="size-6" />
      </span>
      <div>
        <h3 className="font-semibold text-[#1A1916] text-[24px]">{terminal ? "Demande transmise" : "Demande créée"}</h3>
        <p className="mt-2 text-[#6B6B6B] text-sm">
          {terminal
            ? `Demande transmise au terminal ${readerName || providerLabel}.`
            : `Demande créée via ${providerLabel}.`}
        </p>
      </div>
      {hostedUrl ? (
        <div className="grid gap-4 border-[#EFEFEC] border-t pt-5 text-left sm:grid-cols-[1fr_180px]">
          <div>
            <p className="mb-2 font-medium text-[#1A1916] text-xs">Lien de paiement hébergé par {providerLabel}</p>
            <div className="flex h-12 items-center rounded-[12px] border border-[#E8E8E5] bg-white px-3">
              <span className="min-w-0 flex-1 truncate text-[#1A1916] text-xs">{hostedUrl}</span>
              <button
                aria-label="Copier le lien"
                className="grid size-9 place-items-center"
                onClick={() => navigator.clipboard.writeText(hostedUrl).then(() => toast.success("Lien copié."))}
                type="button"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <SuccessAction
                icon={Copy}
                label="Copier le lien"
                onClick={() => navigator.clipboard.writeText(hostedUrl).then(() => toast.success("Lien copié."))}
              />
              <SuccessAction
                href={`sms:${customer?.phone || ""}?body=${encodeURIComponent(customerMessage)}`}
                icon={MessageCircle}
                label="Envoyer par SMS"
              />
              <SuccessAction
                href={`mailto:${customer?.email || ""}?subject=${encodeURIComponent("Votre facture")}&body=${encodeURIComponent(customerMessage)}`}
                icon={Mail}
                label="Envoyer par e-mail"
              />
              <SuccessAction href={hostedUrl} icon={QrCode} label="Ouvrir le lien" external />
            </div>
          </div>
          {qrDataUrl ? (
            <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-3">
              {/* biome-ignore lint/performance/noImgElement: QR code généré localement. */}
              <img alt={`QR code ${providerLabel}`} className="w-full" src={qrDataUrl} />
            </div>
          ) : null}
        </div>
      ) : null}
      {connection?.dashboardUrl ? (
        <a
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#2A9D8F] font-semibold text-[#167B70] text-sm"
          href={connection.dashboardUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-4" />
          Ouvrir {providerLabel} pour vérifier le règlement
        </a>
      ) : null}
      <p className="text-[#6B6B6B] text-xs">Le règlement est géré directement par {providerLabel}.</p>
      <PrimaryButton className="h-12 w-full justify-center" onClick={onClose}>
        Terminer
      </PrimaryButton>
    </div>
  );
}

function SuccessAction({
  icon: Icon,
  label,
  href,
  external,
  onClick,
}: Readonly<{ icon: typeof Copy; label: string; href?: string; external?: boolean; onClick?: () => void }>) {
  const className =
    "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-3 font-semibold text-[#167B70] text-xs transition hover:border-[#2A9D8F]/50";
  if (href)
    return (
      <a
        className={className}
        href={href}
        rel={external ? "noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      >
        <Icon className="size-4" />
        {label}
      </a>
    );
  return (
    <button className={className} onClick={onClick} type="button">
      <Icon className="size-4" />
      {label}
    </button>
  );
}
