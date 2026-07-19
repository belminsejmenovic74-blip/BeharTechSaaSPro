"use client";

import { useCallback, useMemo, useState } from "react";

import { Check, ChevronDown, ExternalLink, Link2, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Modal, Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { useBeharStore } from "@/lib/behar-store";

import { ExternalPaymentBrand } from "./external-payment-brand";
import { ComingSoonIntegration } from "./coming-soon-integration";
import { SumUpReaderManager } from "./sumup-reader-manager";
import { RevolutTerminalManager } from "./revolut-terminal-manager";
import { SquareTerminalManager } from "./square-terminal-manager";

type ProviderName = "stripe" | "sumup" | "paypal" | "square" | "revolut" | "mollie";
type Connection = {
  provider: ProviderName;
  external_account_id: string;
  external_location_id: string | null;
  merchant_display_name: string | null;
  connected_at: string;
  connectionMode: "oauth" | "manual" | "commerce" | "api_key";
  manualUrl: string | null;
  dashboardUrl: string;
  connectionState: "connected" | "reconnect_required" | "incomplete";
  isDefault: boolean;
};
type Shop = { id: string; name: string };

export function ExternalPaymentIntegrations() {
  const workshopId = useBeharStore((state) => state.cloudSync?.workshopId);
  const licenseKey = useBeharStore((state) => state.licenseKey);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<ProviderName | null>(null);
  const [readerManagerOpen, setReaderManagerOpen] = useState(false);
  const [squareTerminalManagerOpen, setSquareTerminalManagerOpen] = useState(false);
  const [revolutTerminalManagerOpen, setRevolutTerminalManagerOpen] = useState(false);
  const [revolutModalOpen, setRevolutModalOpen] = useState(false);
  const [revolutApiKey, setRevolutApiKey] = useState("");
  const [revolutMerchantLabel, setRevolutMerchantLabel] = useState("");
  const [revolutEnvironment, setRevolutEnvironment] = useState<"sandbox" | "production">("production");
  const [paypalModalOpen, setPaypalModalOpen] = useState(false);
  const [paypalUrl, setPaypalUrl] = useState("");
  const [paypalPartnerEnabled, setPaypalPartnerEnabled] = useState(false);

  const credentials = useMemo(
    () =>
      workshopId && licenseKey
        ? { workshopId, licenseKey, ...(selectedShopId ? { shopId: selectedShopId } : {}) }
        : null,
    [workshopId, licenseKey, selectedShopId],
  );

  const load = useCallback(async () => {
    if (!credentials) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/external-payments/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "list", ...credentials }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chargement impossible.");
      setConnections(result.connections || []);
      setShops(result.shops || []);
      if (result.selectedShopId && result.selectedShopId !== selectedShopId) setSelectedShopId(result.selectedShopId);
      setPaypalPartnerEnabled(Boolean(result.paypalPartnerEnabled));
      setRevolutEnvironment(result.revolutEnvironment === "sandbox" ? "sandbox" : "production");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [credentials, selectedShopId]);

  // Les connecteurs restent volontairement dormants jusqu'à leur ouverture
  // publique. Le code serveur est conservé, mais aucun appel de configuration
  // ni aucun OAuth n'est déclenché par cette page avant cette date.

  const connect = async (provider: ProviderName) => {
    if (!credentials) return toast.error("Activez et synchronisez d'abord la licence atelier.");
    setBusy(provider);
    try {
      const response = await fetch("/api/external-payments/oauth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...credentials, provider }),
      });
      const result = await response.json();
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "Connexion impossible.");
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setBusy(null);
      toast.error(error instanceof Error ? error.message : "Connexion impossible.");
    }
  };

  const disconnect = async (provider: ProviderName) => {
    const label =
      provider === "stripe"
        ? "Stripe"
        : provider === "sumup"
          ? "SumUp"
          : provider === "square"
            ? "Square"
            : provider === "revolut"
              ? "Revolut Business"
              : provider === "mollie"
                ? "Mollie"
                : "PayPal";
    if (!credentials || !window.confirm(`Déconnecter ${label} ?`)) return;
    setBusy(provider);
    try {
      const response = await fetch("/api/external-payments/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "disconnect", ...credentials, provider }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Déconnexion impossible.");
      toast.success("Intégration déconnectée.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Déconnexion impossible.");
    } finally {
      setBusy(null);
    }
  };

  const setDefault = async (provider: ProviderName) => {
    if (!credentials || !selectedShopId) return;
    setBusy(provider);
    try {
      const response = await fetch("/api/external-payments/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "set_default", ...credentials, shopId: selectedShopId, provider }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fournisseur par défaut impossible.");
      toast.success("Fournisseur par défaut mis à jour pour cette boutique.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fournisseur par défaut impossible.");
    } finally {
      setBusy(null);
    }
  };

  const configurePayPalManual = async () => {
    if (!credentials) return toast.error("Activez et synchronisez d'abord la licence atelier.");
    setBusy("paypal");
    try {
      const response = await fetch("/api/external-payments/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "configure_paypal_manual", ...credentials, paypalUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Configuration PayPal impossible.");
      toast.success("Lien PayPal configuré.");
      setPaypalModalOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Configuration PayPal impossible.");
    } finally {
      setBusy(null);
    }
  };

  const openPayPalConfiguration = () => {
    setPaypalUrl(connections.find((entry) => entry.provider === "paypal")?.manualUrl || "");
    setPaypalModalOpen(true);
  };

  const configureRevolut = async () => {
    if (!credentials) return toast.error("Activez et synchronisez d'abord la licence atelier.");
    setBusy("revolut");
    try {
      const response = await fetch("/api/external-payments/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "configure_revolut",
          ...credentials,
          apiKey: revolutApiKey,
          ...(revolutMerchantLabel.trim() ? { merchantLabel: revolutMerchantLabel.trim() } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Connexion Revolut impossible.");
      setRevolutApiKey("");
      setRevolutMerchantLabel("");
      setRevolutModalOpen(false);
      toast.success("Merchant Account Revolut connecté.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion Revolut impossible.");
    } finally {
      setBusy(null);
    }
  };

  const testRevolut = async () => {
    if (!credentials) return toast.error("Licence atelier indisponible.");
    setBusy("revolut");
    try {
      const response = await fetch("/api/external-payments/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "test_revolut", ...credentials }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Test Revolut impossible.");
      toast.success("Connexion Merchant API Revolut valide.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test Revolut impossible.");
    } finally {
      setBusy(null);
    }
  };

  const finishMollieOnboarding = async () => {
    if (!credentials) return toast.error("Licence atelier indisponible.");
    setBusy("mollie");
    try {
      const response = await fetch("/api/external-payments/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "open_mollie_onboarding", ...credentials }),
      });
      const result = await response.json();
      if (!response.ok || !result.onboardingUrl) throw new Error(result.error || "Onboarding Mollie indisponible.");
      window.location.assign(result.onboardingUrl);
    } catch (error) {
      setBusy(null);
      toast.error(error instanceof Error ? error.message : "Onboarding Mollie indisponible.");
    }
  };

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-semibold text-[#101828] text-[32px] tracking-[-0.035em] sm:text-[42px]">
            Paiements externes
          </h1>
          <p className="mt-3 max-w-3xl text-[#667085] text-[15px] leading-relaxed sm:text-[16px]">
            Connectez vos propres services de paiement. Les règlements sont traités et conservés directement par votre
            prestataire.
          </p>
        </div>
        <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[240px]">
          <select
            aria-label="Boutique configurée"
            className="h-12 w-full appearance-none rounded-[12px] border border-[#2A9D8F] bg-white px-4 pr-10 font-semibold text-[#167B70] text-sm outline-none focus:ring-2 focus:ring-[#2A9D8F]/15"
            disabled={loading || shops.length < 2}
            onChange={(event) => setSelectedShopId(event.target.value)}
            value={selectedShopId}
          >
            {!shops.length ? <option value="">Boutique principale</option> : null}
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
          {loading ? (
            <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-[#2A9D8F]" />
          ) : (
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#2A9D8F]" />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ComingSoonIntegration name="Stripe">
          <ProviderCard
            busy={busy === "stripe"}
            connection={connections.find((entry) => entry.provider === "stripe")}
            description="Connectez votre propre compte Stripe pour envoyer des demandes de paiement."
            name="Stripe"
            provider="stripe"
            onConnect={() => connect("stripe")}
            onDisconnect={() => disconnect("stripe")}
            onSetDefault={() => setDefault("stripe")}
          />
        </ComingSoonIntegration>
        <ComingSoonIntegration name="SumUp">
          <ProviderCard
            busy={busy === "sumup"}
            connection={connections.find((entry) => entry.provider === "sumup")}
            description="Envoyez un lien de paiement ou transmettez le montant à votre terminal SumUp."
            name="SumUp"
            provider="sumup"
            onConnect={() => connect("sumup")}
            onDisconnect={() => disconnect("sumup")}
            onManage={() => setReaderManagerOpen(true)}
            onSetDefault={() => setDefault("sumup")}
          />
        </ComingSoonIntegration>
        <ComingSoonIntegration name="PayPal">
          <PayPalCard
            busy={busy === "paypal"}
            connection={connections.find((entry) => entry.provider === "paypal")}
            onConfigure={openPayPalConfiguration}
            onConnect={() => connect("paypal")}
            onDisconnect={() => disconnect("paypal")}
            onSetDefault={() => setDefault("paypal")}
            partnerEnabled={paypalPartnerEnabled}
          />
        </ComingSoonIntegration>
        <ComingSoonIntegration name="Square">
          <ProviderCard
            busy={busy === "square"}
            connection={connections.find((entry) => entry.provider === "square")}
            description="Créez un lien Square ou transmettez le total TTC à votre Square Terminal."
            manageLabel="Gérer mes terminaux"
            name="Square"
            provider="square"
            onConnect={() => connect("square")}
            onDisconnect={() => disconnect("square")}
            onManage={() => setSquareTerminalManagerOpen(true)}
            onSetDefault={() => setDefault("square")}
          />
        </ComingSoonIntegration>
        <ComingSoonIntegration name="Revolut Business">
          <ProviderCard
            busy={busy === "revolut"}
            configureLabel="Remplacer la clé API"
            connectLabel="Connecter Revolut"
            connection={connections.find((entry) => entry.provider === "revolut")}
            description="Utilisez votre Merchant Account pour créer un lien hébergé ou envoyer une facture au Terminal."
            manageLabel="Gérer les terminaux"
            name="Revolut Business"
            provider="revolut"
            onConfigure={() => setRevolutModalOpen(true)}
            onConnect={() => setRevolutModalOpen(true)}
            onDisconnect={() => disconnect("revolut")}
            onManage={() => setRevolutTerminalManagerOpen(true)}
            onTest={testRevolut}
            onSetDefault={() => setDefault("revolut")}
          />
        </ComingSoonIntegration>
        <ComingSoonIntegration name="Mollie">
          <ProviderCard
            busy={busy === "mollie"}
            connection={connections.find((entry) => entry.provider === "mollie")}
            description="Connectez votre organisation Mollie et créez une demande hébergée sur le profil de votre boutique."
            manageLabel="Terminer la vérification"
            name="Mollie"
            provider="mollie"
            onConnect={() => connect("mollie")}
            onDisconnect={() => disconnect("mollie")}
            onManage={finishMollieOnboarding}
            onSetDefault={() => setDefault("mollie")}
          />
        </ComingSoonIntegration>
      </div>

      <Panel className="border border-[#E4E7EC] bg-white p-5 shadow-[0_8px_24px_rgba(16,24,40,0.035)]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#F9FAFB] text-[#667085]">
            <Unplug className="size-[18px]" />
          </span>
          <div>
            <h3 className="font-semibold text-[#101828] text-[15px]">Autre système de paiement</h3>
            <p className="mt-1 text-[#667085] text-[13px] leading-relaxed">
              Vous pouvez continuer à utiliser votre banque, votre caisse ou votre terminal habituel. Behar Tech Pro
              n’enregistre pas le règlement.
            </p>
          </div>
        </div>
      </Panel>
      <SumUpReaderManager
        credentials={credentials}
        isOpen={readerManagerOpen}
        onClose={() => setReaderManagerOpen(false)}
      />
      <SquareTerminalManager
        credentials={credentials}
        isOpen={squareTerminalManagerOpen}
        onClose={() => setSquareTerminalManagerOpen(false)}
      />
      <RevolutTerminalManager
        credentials={credentials}
        isOpen={revolutTerminalManagerOpen}
        onClose={() => setRevolutTerminalManagerOpen(false)}
      />
      <Modal
        isOpen={revolutModalOpen}
        onClose={() => {
          setRevolutApiKey("");
          setRevolutModalOpen(false);
        }}
        title="Connecter Revolut Business"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-[#667085] text-sm leading-relaxed">
            Saisissez la Secret API Key générée dans votre Merchant Account Revolut Business. Aucun OAuth partenaire
            public n’est actuellement proposé par Revolut pour cette intégration.
          </p>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#101828]">Nom du Merchant Account</span>
            <input
              autoComplete="organization"
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              maxLength={100}
              onChange={(event) => setRevolutMerchantLabel(event.target.value)}
              placeholder="Atelier principal"
              value={revolutMerchantLabel}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#101828]">Secret API Key · {revolutEnvironment}</span>
            <input
              autoComplete="off"
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 font-mono outline-none focus:border-[#2A9D8F]"
              onChange={(event) => setRevolutApiKey(event.target.value)}
              placeholder="sk_…"
              type="password"
              value={revolutApiKey}
            />
          </label>
          <p className="rounded-[12px] bg-[#F9FAFB] p-3 text-[#667085] text-xs leading-relaxed">
            La clé est testée côté serveur puis chiffrée. Elle ne sera jamais renvoyée dans le navigateur. Désactivez
            Pay by Bank et tout moyen non autorisé dans Revolut Business avant d’envoyer un lien.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <SecondaryButton
              onClick={() => {
                setRevolutApiKey("");
                setRevolutModalOpen(false);
              }}
            >
              Annuler
            </SecondaryButton>
            <PrimaryButton
              disabled={busy === "revolut" || !/^sk_[A-Za-z0-9_-]{24,480}$/.test(revolutApiKey.trim())}
              onClick={configureRevolut}
            >
              {busy === "revolut" ? <Loader2 className="size-4 animate-spin" /> : null} Enregistrer et tester
            </PrimaryButton>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={paypalModalOpen}
        onClose={() => setPaypalModalOpen(false)}
        title="Configurer mon lien PayPal"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-[#667085] text-sm leading-relaxed">
            Enregistrez votre lien PayPal.Me ou votre lien PayPal Business. Pour PayPal.Me, le total TTC et la devise
            seront ajoutés au lien de chaque facture.
          </p>
          <div className="rounded-[12px] border border-[#E4E7EC] bg-[#F9FAFB] p-3">
            <p className="font-semibold text-[#101828] text-sm">PayPal Commerce Platform</p>
            <p className="mt-1 text-[#667085] text-xs leading-relaxed">
              La connexion automatique d’un compte Business existant nécessite l’activation partenaire PayPal.
            </p>
            <SecondaryButton
              className="mt-3 h-10"
              disabled={!paypalPartnerEnabled || busy === "paypal"}
              onClick={() => connect("paypal")}
            >
              Connecter PayPal Business
            </SecondaryButton>
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#101828]">Lien PayPal officiel</span>
            <input
              autoComplete="off"
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              onChange={(event) => setPaypalUrl(event.target.value)}
              placeholder="https://paypal.me/votre-atelier"
              type="url"
              value={paypalUrl}
            />
          </label>
          <p className="rounded-[12px] bg-[#F9FAFB] p-3 text-[#667085] text-xs leading-relaxed">
            Le lien est chiffré côté serveur. Behar Tech Pro ne consulte jamais le résultat du paiement.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <SecondaryButton onClick={() => setPaypalModalOpen(false)}>Annuler</SecondaryButton>
            <PrimaryButton disabled={busy === "paypal" || !paypalUrl.trim()} onClick={configurePayPalManual}>
              {busy === "paypal" ? <Loader2 className="size-4 animate-spin" /> : null} Enregistrer le lien
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function PayPalCard({
  connection,
  busy,
  partnerEnabled,
  onConfigure,
  onConnect,
  onDisconnect,
  onSetDefault,
}: Readonly<{
  connection?: Connection;
  busy: boolean;
  partnerEnabled: boolean;
  onConfigure: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSetDefault: () => void;
}>) {
  return (
    <Panel className="flex min-h-[270px] flex-col border border-[#E4E7EC] bg-white p-5 shadow-[0_12px_36px_rgba(16,24,40,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <ExternalPaymentBrand provider="paypal" />
        <ConnectionBadge connection={connection} />
      </div>
      <h3 className="mt-5 font-semibold text-[#101828] text-lg">PayPal</h3>
      <p className="mt-1.5 text-[#667085] text-[13px] leading-relaxed">
        Utilisez votre lien PayPal Business ou connectez votre compte marchand lorsque l’accès partenaire est activé.
      </p>
      {connection ? (
        <p className="mt-3 text-[#667085] text-xs">
          {connection.connectionMode === "commerce" ? "PayPal Commerce Platform" : "Lien PayPal manuel"} · configuré le{" "}
          {new Date(connection.connected_at).toLocaleDateString("fr-FR")}
        </p>
      ) : null}
      {!partnerEnabled && connection ? (
        <p className="mt-3 rounded-[12px] bg-[#FFF8E8] p-3 text-[#6B5125] text-xs leading-relaxed">
          La connexion automatique nécessite l’activation partenaire PayPal. Le lien manuel reste entièrement
          disponible.
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {connection ? (
          <>
            <SecondaryButton className="h-10" disabled={busy} onClick={onConfigure}>
              <Link2 className="size-4" /> Configurer mon lien
            </SecondaryButton>
            {partnerEnabled ? (
              <PrimaryButton className="h-10" disabled={busy} onClick={onConnect}>
                Connecter Business
              </PrimaryButton>
            ) : null}
            <a
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white px-4 font-semibold text-[#101828] text-[13px]"
              href={connection.dashboardUrl}
              rel="noreferrer"
              target="_blank"
            >
              Ouvrir PayPal <ExternalLink className="size-3.5" />
            </a>
            {!connection.isDefault ? (
              <SecondaryButton className="h-10" disabled={busy} onClick={onSetDefault}>
                Définir par défaut
              </SecondaryButton>
            ) : null}
            <SecondaryButton className="h-10" disabled={busy} onClick={onDisconnect}>
              Déconnecter
            </SecondaryButton>
          </>
        ) : (
          <PrimaryButton className="h-10" disabled={busy} onClick={onConfigure}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Configurer PayPal
          </PrimaryButton>
        )}
      </div>
    </Panel>
  );
}

function ProviderCard({
  name,
  provider,
  description,
  connection,
  busy,
  onConnect,
  onDisconnect,
  onManage,
  onTest,
  onConfigure,
  onSetDefault,
  connectLabel,
  configureLabel = "Modifier la configuration",
  manageLabel = "Gérer les terminaux",
}: Readonly<{
  name: string;
  provider: ProviderName;
  description: string;
  connection?: Connection;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onManage?: () => void;
  onTest?: () => void;
  onConfigure?: () => void;
  onSetDefault: () => void;
  connectLabel?: string;
  configureLabel?: string;
  manageLabel?: string;
}>) {
  return (
    <Panel className="flex min-h-[245px] flex-col border border-[#E4E7EC] bg-white p-5 shadow-[0_12px_36px_rgba(16,24,40,0.035)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <ExternalPaymentBrand provider={provider} />
        <ConnectionBadge connection={connection} />
      </div>
      <p className="mt-5 text-[#667085] text-[13px] leading-relaxed">{description}</p>
      {connection ? (
        <p className="mt-3 text-[#667085] text-xs">
          {connection.merchant_display_name ?? connection.external_account_id} · connecté le{" "}
          {new Date(connection.connected_at).toLocaleDateString("fr-FR")}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {connection ? (
          <>
            <a
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#101828] px-4 font-semibold text-white text-[13px]"
              href={connection.dashboardUrl}
              rel="noreferrer"
              target="_blank"
            >
              Ouvrir {name} <ExternalLink className="size-3.5" />
            </a>
            <SecondaryButton className="h-10" disabled={busy} onClick={onDisconnect}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Déconnecter
            </SecondaryButton>
            {onManage ? (
              <SecondaryButton className="h-10" disabled={busy} onClick={onManage}>
                {manageLabel}
              </SecondaryButton>
            ) : null}
            {onTest ? (
              <SecondaryButton className="h-10" disabled={busy} onClick={onTest}>
                Tester la connexion
              </SecondaryButton>
            ) : null}
            {onConfigure ? (
              <SecondaryButton className="h-10" disabled={busy} onClick={onConfigure}>
                {configureLabel}
              </SecondaryButton>
            ) : null}
            {!connection.isDefault ? (
              <SecondaryButton className="h-10" disabled={busy} onClick={onSetDefault}>
                Définir par défaut
              </SecondaryButton>
            ) : (
              <span className="inline-flex h-10 items-center gap-1.5 px-2 font-semibold text-[#167B70] text-xs">
                <Check className="size-3.5" /> Par défaut
              </span>
            )}
          </>
        ) : (
          <PrimaryButton className="h-10" disabled={busy} onClick={onConnect}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} {connectLabel ?? `Connecter ${name}`}
          </PrimaryButton>
        )}
      </div>
    </Panel>
  );
}

function ConnectionBadge({ connection }: Readonly<{ connection?: Connection }>) {
  if (!connection) {
    return (
      <span className="rounded-full bg-[#F2F4F7] px-3 py-1.5 font-medium text-[#667085] text-[11px]">
        Non configuré
      </span>
    );
  }
  const label =
    connection.connectionState === "reconnect_required"
      ? "Reconnexion nécessaire"
      : connection.connectionState === "incomplete"
        ? "Configuration incomplète"
        : "Connecté";
  const className =
    connection.connectionState === "connected" ? "bg-[#E1F3EF] text-[#167B70]" : "bg-[#FFF4DD] text-[#8A5A14]";
  return <span className={`rounded-full px-3 py-1.5 font-semibold text-[11px] ${className}`}>{label}</span>;
}
