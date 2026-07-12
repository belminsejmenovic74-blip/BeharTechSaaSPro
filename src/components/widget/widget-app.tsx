"use client";

// Application iframe du widget public — parcours en cinq étapes.
//
// Responsabilités : charger la configuration publiée, appliquer le thème du
// réparateur, piloter la progression et les validations, soumettre la demande
// (lead ou rendez-vous idempotent) et dialoguer avec le chargeur hôte par
// postMessage. Aucune clé serveur, aucune création de compte.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ContactPreference, PublicService, SubmissionResult, WidgetConfig } from "@/lib/widget/public-types";
import {
  WidgetApiError,
  WidgetPublicClient,
  detectHostOrigin,
  type AppointmentPayload,
  type LeadPayload,
  type WidgetEventData,
  type WidgetEventName,
} from "@/lib/widget/public-client";
import { computeLeadTags } from "@/lib/widget/catalog-merge";
import { DemoWidgetClient } from "@/lib/widget/demo-data";
import { fold, modelsForBrand } from "@/lib/widget/global-catalog";
import {
  CONSENT_PRIVACY_VERSION,
  buildTheme,
  defaultConsentText,
  randomId,
  resolveFeatures,
  resolveLayout,
  resolveTexts,
} from "@/components/widget/widget-theme";
import {
  EMPTY_DRAFT,
  STEP_LABELS,
  primaryService,
  type RequestType,
  type StepContext,
  type WidgetDraft,
} from "@/components/widget/widget-state";
import { Spinner, WidgetButton, WidgetProgress } from "@/components/widget/widget-primitives";
import { IssueStep } from "@/components/widget/steps/issue-step";
import { ConfirmationStep } from "@/components/widget/steps/confirmation-step";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { DeviceTypeStep } from "@/components/widget/steps/device-type-step";
import { BrandModelStep } from "@/components/widget/steps/brand-model-step";
import { AppointmentOffersStep } from "@/components/widget/steps/appointment-offers-step";
import { CustomerSummaryStep } from "@/components/widget/steps/customer-summary-step";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function hasRequiredPhone(draft: WidgetDraft): boolean {
  return draft.phone.replace(/\D/g, "").length >= 7;
}

function postToParent(publicId: string, message: Record<string, unknown>) {
  if (typeof window === "undefined" || window.parent === window) return;
  try {
    window.parent.postMessage({ source: "behar-widget", widgetPublicId: publicId, ...message }, "*");
  } catch {
    // le chargeur filtre déjà par origine ; on n'échoue jamais le parcours.
  }
}

export function WidgetApp({ publicId, previewConfig }: { publicId: string; previewConfig?: WidgetConfig }) {
  const clientRef = useRef<WidgetPublicClient | null>(null);
  if (!clientRef.current) {
    clientRef.current =
      publicId === "demo" ? new DemoWidgetClient() : new WidgetPublicClient(publicId, detectHostOrigin());
  }
  const client = clientRef.current;

  const sessionIdRef = useRef<string>(randomId("wses"));
  const startedAtRef = useRef<string>(new Date().toISOString());
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<WidgetDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmissionResult | null>(null);

  const patch = useCallback((updates: Partial<WidgetDraft>) => setDraft((current) => ({ ...current, ...updates })), []);

  const emit = useCallback(
    (name: WidgetEventName, data: WidgetEventData = {}) => {
      const token = config?.sessionToken;
      if (token) void client.sendEvent(token, name, sessionIdRef.current, data);
    },
    [client, config?.sessionToken],
  );

  // Chargement de la configuration publiée + amorçage du jeton de session.
  useEffect(() => {
    if (previewConfig) {
      const feats = resolveFeatures(previewConfig.features);
      const firstAction: RequestType = feats.booking ? "appointment" : feats.callbackRequest ? "callback" : "quote";
      setConfig(previewConfig);
      setLoadError(null);
      setDraft((current) => ({
        ...current,
        shopId: previewConfig.shops.length === 1 ? previewConfig.shops[0].id : current.shopId,
        requestType: firstAction,
      }));
      return;
    }
    const controller = new AbortController();
    client
      .getConfig(controller.signal)
      .then((cfg) => {
        const feats = resolveFeatures(cfg.features);
        const firstAction: RequestType = feats.booking ? "appointment" : feats.callbackRequest ? "callback" : "quote";
        setConfig(cfg);
        setDraft((current) => ({
          ...current,
          shopId: cfg.shops.length === 1 ? cfg.shops[0].id : current.shopId,
          requestType: firstAction,
        }));
        postToParent(publicId, { type: "behar.widget.ready" });
        void client.sendEvent(cfg.sessionToken, "widget_loaded", sessionIdRef.current);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof WidgetApiError ? error.message : "Widget momentanément indisponible.");
      });
    return () => controller.abort();
  }, [client, previewConfig, publicId]);

  // Report de hauteur au chargeur hôte pour dimensionner l'iframe.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const report = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        postToParent(publicId, { type: "behar.widget.resize", height: node.offsetHeight }),
      );
    };
    const observer = new ResizeObserver(report);
    observer.observe(node);
    report();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [publicId]);

  useEffect(() => {
    void step;
    void submitResult;
    rootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, submitResult]);

  const theme = useMemo(() => buildTheme(config?.visual), [config?.visual]);
  const features = useMemo(() => resolveFeatures(config?.features), [config?.features]);
  const texts = useMemo(() => resolveTexts(config?.texts), [config?.texts]);
  const layout = useMemo(() => resolveLayout(config?.layout), [config?.layout]);

  const ctx: StepContext | null = config
    ? {
        client,
        token: config.sessionToken,
        config,
        features,
        texts,
        theme,
        currency: config.general.currency || "EUR",
        locale: config.general.locale || "fr-FR",
        sessionId: sessionIdRef.current,
        draft,
        patch,
        emit,
      }
    : null;

  const needShop = features.shopChoice && (config?.shops.length ?? 0) > 1;
  const appointmentStepEnabled =
    features.booking || Boolean(config?.offers.enabled && config.offers.offers.some((offer) => offer.isPublished));

  const hasProgress = Boolean(
    draft.category ||
      draft.brand ||
      draft.model ||
      draft.issues.length ||
      draft.firstName ||
      draft.lastName ||
      draft.phone ||
      draft.email,
  );
  const requestClose = useCallback(() => {
    if (
      hasProgress &&
      !submitResult &&
      !window.confirm("Votre demande n’est pas terminée. Voulez-vous vraiment fermer ?")
    )
      return;
    postToParent(publicId, { type: "behar.widget.close" });
  }, [hasProgress, publicId, submitResult]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.type !== "behar.widget.request-close") return;
      if (event.data?.widgetPublicId && event.data.widgetPublicId !== publicId) return;
      requestClose();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [publicId, requestClose]);

  const canAdvance = (index: number): boolean => {
    if (index === 0) return Boolean(draft.category);
    if (index === 1) return Boolean(draft.model.trim());
    if (index === 2) return draft.issues.length > 0;
    if (index === 3 && draft.requestType === "appointment")
      return Boolean(draft.appointmentDate && draft.appointmentTime) && (!needShop || Boolean(draft.shopId));
    return true;
  };

  const canSubmit = (): boolean => {
    if (!hasRequiredPhone(draft) || !draft.consent) return false;
    if (draft.requestType === "appointment") return Boolean(draft.appointmentDate && draft.appointmentTime);
    return true;
  };

  const goNext = () => {
    if (!canAdvance(step)) return;
    if (step === 1) {
      emit("widget_started");
      emit("device_selected", { category: draft.category, brand: draft.brand, model: draft.model });
    }
    if (step === 2) emit("issue_selected", { issue: draft.issues[0] });
    if (step === 2) {
      emit("form_opened");
      if (draft.requestType === "appointment") emit("booking_opened");
    }
    setStep((current) =>
      current === 2 && !appointmentStepEnabled ? 4 : Math.min(current + 1, STEP_LABELS.length - 1),
    );
  };

  const goBack = () => setStep((current) => (current === 4 && !appointmentStepEnabled ? 2 : Math.max(current - 1, 0)));

  const submit = async () => {
    if (!config || submitting || !canSubmit()) return;
    setSubmitting(true);
    setSubmitError(null);
    const service = primaryService(draft);
    const key = randomId("idem");
    try {
      let result: SubmissionResult;
      if (draft.requestType === "appointment") {
        const appointment: AppointmentPayload = {
          ...buildLead(draft, service, config, startedAtRef.current),
          type: "appointment",
          date: draft.appointmentDate,
          time: draft.appointmentTime,
        };
        result = await client.submitAppointment(config.sessionToken, appointment, key);
      } else {
        result = await client.submitLead(
          config.sessionToken,
          { ...buildLead(draft, service, config, startedAtRef.current), type: draft.requestType },
          key,
        );
      }
      setSubmitResult(result);
      setStep(STEP_LABELS.length - 1);
    } catch (error) {
      setSubmitError(error instanceof WidgetApiError ? error.message : "Envoi impossible. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setSubmitResult(null);
    setSubmitError(null);
    startedAtRef.current = new Date().toISOString();
    const firstAction: RequestType = features.booking ? "appointment" : features.callbackRequest ? "callback" : "quote";
    setDraft({
      ...EMPTY_DRAFT,
      shopId: config && config.shops.length === 1 ? config.shops[0].id : "",
      requestType: firstAction,
    });
    setStep(0);
  };

  const submitLabel =
    draft.requestType === "appointment"
      ? texts.bookingLabel
      : draft.requestType === "quote"
        ? texts.quoteLabel
        : draft.requestType === "price_request"
          ? "Demander le prix"
          : draft.requestType === "request"
            ? "Envoyer la demande"
            : texts.callbackLabel;

  const alignment =
    layout.alignment === "center" ? "text-center" : layout.alignment === "right" ? "text-right" : "text-left";
  const blocks = ctx
    ? {
        header: <BrandHeader config={ctx.config} texts={texts} />,
        progress: !submitResult ? <WidgetProgress steps={[...STEP_LABELS]} current={step} /> : null,
        content: (
          <main className="flex-1">
            {submitResult ? <ConfirmationStep ctx={ctx} result={submitResult} /> : null}
            {!submitResult && step === 0 ? <DeviceTypeStep ctx={ctx} /> : null}
            {!submitResult && step === 1 ? <BrandModelStep ctx={ctx} onContinue={goNext} /> : null}
            {!submitResult && step === 2 ? <IssueStep ctx={ctx} /> : null}
            {!submitResult && step === 3 ? <AppointmentOffersStep ctx={ctx} /> : null}
            {!submitResult && step === 4 ? <CustomerSummaryStep ctx={ctx} submitError={submitError} /> : null}
          </main>
        ),
        actions: (
          <footer className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t border-[var(--w-border)] bg-[var(--w-surface)]/95 px-1 pt-4 backdrop-blur">
            {submitResult ? (
              <>
                <WidgetButton variant="ghost" onClick={requestClose}>
                  Fermer
                </WidgetButton>
                <WidgetButton variant="secondary" onClick={restart}>
                  Nouvelle demande
                </WidgetButton>
              </>
            ) : (
              <>
                <WidgetButton
                  variant="ghost"
                  onClick={goBack}
                  disabled={step === 0}
                  className={step === 0 ? "invisible" : ""}
                >
                  Précédent
                </WidgetButton>
                {step === 4 ? (
                  <WidgetButton onClick={submit} disabled={!canSubmit()} loading={submitting}>
                    {submitLabel}
                  </WidgetButton>
                ) : (
                  <WidgetButton onClick={goNext} disabled={!canAdvance(step)}>
                    Continuer
                  </WidgetButton>
                )}
              </>
            )}
          </footer>
        ),
      }
    : null;

  return (
    <div
      style={theme.style}
      className="grid min-h-screen w-full place-items-center bg-transparent text-[var(--w-text)] sm:p-4"
    >
      <div
        ref={rootRef}
        className={cn(
          "relative mx-auto flex max-h-[100svh] min-h-[100svh] w-full flex-col gap-5 overflow-y-auto bg-[var(--w-surface)] px-4 py-5 shadow-[0_28px_90px_rgba(15,23,42,.22)] sm:max-h-[90svh] sm:min-h-0 sm:max-w-[1180px] sm:rounded-[calc(var(--w-radius)+8px)] sm:border sm:border-[var(--w-border)] sm:px-7 sm:py-6",
          alignment,
          layout.template === "compact" ? "gap-4" : layout.template === "showcase" ? "gap-8" : "gap-6",
        )}
      >
        {ctx ? (
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fermer le widget"
            className="absolute right-4 top-4 z-20 grid size-9 place-items-center rounded-full text-[var(--w-muted)] transition hover:bg-[var(--w-primary-soft)] hover:text-[var(--w-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring)]"
          >
            <X className="size-4" />
          </button>
        ) : null}
        {loadError ? (
          <LoadErrorView message={loadError} />
        ) : !ctx ? (
          <LoadingView />
        ) : (
          layout.blockOrder.map((block) =>
            layout.hiddenBlocks.includes(block) ? null : (
              <div
                key={block}
                className={
                  block === "actions"
                    ? "sticky bottom-0 z-30 bg-[var(--w-surface)] pb-[max(.25rem,env(safe-area-inset-bottom))]"
                    : undefined
                }
              >
                {blocks?.[block]}
              </div>
            ),
          )
        )}
        {ctx?.config.icons.poweredBy ? (
          <p className="text-center text-[10px] text-[var(--w-muted)]/70">Propulsé par Behar Tech Pro</p>
        ) : null}
      </div>
    </div>
  );
}

function buildLead(
  draft: WidgetDraft,
  service: PublicService | undefined,
  config: WidgetConfig,
  startedAt: string,
): LeadPayload {
  const extraIssues = draft.issues.slice(1);
  const descriptionParts: string[] = [];
  if (draft.issueDescription.trim()) descriptionParts.push(draft.issueDescription.trim());
  if (extraIssues.length) descriptionParts.push(`Autres problèmes : ${extraIssues.join(", ")}`);
  const sourceUrl = typeof document !== "undefined" ? document.referrer || window.location.href : undefined;
  const preference: ContactPreference | undefined = draft.contactPreference || undefined;

  // Tags hors catalogue : le parcours n'est jamais bloqué, mais l'admin est prévenu.
  const selectedIssuesConfigured = draft.issues.map((issue) => Boolean(draft.services[issue]));
  const modelInGlobalCatalog = modelsForBrand(draft.category, draft.brand).some(
    (entry) => fold(entry) === fold(draft.model),
  );
  const tags = computeLeadTags({
    modelInGlobalCatalog,
    modelConfigured: selectedIssuesConfigured.some(Boolean),
    selectedIssuesConfigured,
  });
  return {
    type: "callback",
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    phone: draft.phone.trim().slice(0, 30),
    email: validEmail(draft.email) ? draft.email.trim() : "",
    deviceCategory: draft.category,
    brand: draft.brand,
    model: draft.model.trim(),
    issue: (draft.issues[0] ?? "").slice(0, 180),
    issueDescription: descriptionParts.join(" — ").slice(0, 1200),
    servicePublicId: service?.publicId,
    quality: service?.quality ?? "",
    comment: draft.comment.trim(),
    contactPreference: preference,
    shopPublicId: draft.shopId || undefined,
    photos: draft.photos,
    tags,
    selectedOffers: (config.offers?.offers ?? [])
      .filter(
        (offer) =>
          offer.behavior === "automatic" ||
          ((offer.behavior === "selectable" || offer.behavior === "validation") &&
            draft.selectedOfferIds.includes(offer.id)),
      )
      .map((offer) => ({
        offerId: offer.id,
        offerName: offer.title,
        originalPrice: offer.originalPrice,
        promotionalPrice: offer.promotionalPrice,
        fixedDiscount: offer.fixedDiscount,
        percentageDiscount: offer.percentageDiscount,
        conditionsSnapshot: offer.conditionText,
        validationRequired: offer.validationRequired === true || offer.behavior === "validation",
        behavior: offer.behavior,
        selectedAt: new Date().toISOString(),
      })),
    sourceUrl,
    consent: {
      service: true,
      marketing: false,
      text: defaultConsentText(config.general.commercialName ?? ""),
      privacyVersion: CONSENT_PRIVACY_VERSION,
      acceptedAt: new Date().toISOString(),
    },
    startedAt,
    website: "",
  };
}

function BrandHeader({ config, texts }: { config: WidgetConfig; texts: ReturnType<typeof resolveTexts> }) {
  const name = config.general.commercialName;
  return (
    <header className="flex items-center gap-3 pr-12">
      {config.visual.logoUrl ? (
        // biome-ignore lint/performance/noImgElement: logo distant configuré par le réparateur dans le mini-CMS.
        <img src={config.visual.logoUrl} alt={name || "Atelier"} className="h-9 w-auto max-w-[160px] object-contain" />
      ) : (
        <span className="grid size-10 place-items-center rounded-xl bg-[var(--w-primary-soft)] text-base font-bold text-[var(--w-primary)]">
          {(name || texts.title).slice(0, 1)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight text-[var(--w-text)]">
          {name || texts.title || "Demande de devis ou rendez-vous"}
        </p>
        <p className="truncate text-xs text-[var(--w-muted)]">{texts.introduction}</p>
      </div>
    </header>
  );
}

function LoadingView() {
  return (
    <div className="flex min-h-[320px] items-center justify-center text-[var(--w-muted)]">
      <Spinner />
    </div>
  );
}

function LoadErrorView({ message }: { message: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
      <p className="text-base font-semibold text-[var(--w-text)]">Widget indisponible</p>
      <p className="max-w-xs text-sm text-[var(--w-muted)]">{message}</p>
    </div>
  );
}
