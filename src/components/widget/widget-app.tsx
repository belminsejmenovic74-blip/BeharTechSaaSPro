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
import { DeviceStep } from "@/components/widget/steps/device-step";
import { IssueStep } from "@/components/widget/steps/issue-step";
import { ResultStep } from "@/components/widget/steps/result-step";
import { ContactStep } from "@/components/widget/steps/contact-step";
import { ConfirmationStep } from "@/components/widget/steps/confirmation-step";
import { cn } from "@/lib/utils";

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

export function WidgetApp({ publicId }: { publicId: string }) {
  const clientRef = useRef<WidgetPublicClient | null>(null);
  if (!clientRef.current) clientRef.current = new WidgetPublicClient(publicId, detectHostOrigin());
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
  }, [client, publicId]);

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

  const canAdvance = (index: number): boolean => {
    if (index === 0)
      return Boolean(draft.category) && Boolean(draft.model.trim()) && (!needShop || Boolean(draft.shopId));
    if (index === 1) return draft.issues.length > 0;
    return true;
  };

  const canSubmit = (): boolean => {
    if (!hasRequiredPhone(draft) || !draft.consent) return false;
    if (draft.requestType === "appointment") return Boolean(draft.appointmentDate && draft.appointmentTime);
    return true;
  };

  const goNext = () => {
    if (!canAdvance(step)) return;
    if (step === 0) {
      emit("widget_started");
      emit("device_selected", { category: draft.category, brand: draft.brand, model: draft.model });
    }
    if (step === 1) emit("issue_selected", { issue: draft.issues[0] });
    if (step === 2) {
      emit("form_opened");
      if (draft.requestType === "appointment") emit("booking_opened");
    }
    setStep((current) => Math.min(current + 1, STEP_LABELS.length - 1));
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 0));

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

  const contentWidth =
    config?.visual.contentWidth === "compact"
      ? "max-w-[480px]"
      : config?.visual.contentWidth === "wide"
        ? "max-w-[760px]"
        : "max-w-[560px]";
  const alignment =
    layout.alignment === "center" ? "text-center" : layout.alignment === "right" ? "text-right" : "text-left";
  const blocks = ctx
    ? {
        header: <BrandHeader config={ctx.config} texts={texts} />,
        progress: step < STEP_LABELS.length ? <WidgetProgress steps={[...STEP_LABELS]} current={step} /> : null,
        content: (
          <main className="flex-1">
            {step === 0 ? <DeviceStep ctx={ctx} /> : null}
            {step === 1 ? <IssueStep ctx={ctx} /> : null}
            {step === 2 ? <ResultStep ctx={ctx} /> : null}
            {step === 3 ? <ContactStep ctx={ctx} submitError={submitError} /> : null}
            {step === 4 ? <ConfirmationStep ctx={ctx} result={submitResult} /> : null}
          </main>
        ),
        actions: (
          <footer className="flex items-center justify-between gap-3 border-t border-[var(--w-border)] pt-5">
            {step === 4 ? (
              <>
                <WidgetButton variant="ghost" onClick={() => postToParent(publicId, { type: "behar.widget.close" })}>
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
                {step === 3 ? (
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
    <div style={theme.style} className="min-h-screen w-full bg-[var(--w-page-bg,var(--w-bg))] text-[var(--w-text)]">
      <div
        ref={rootRef}
        className={cn(
          "mx-auto flex w-full flex-col px-4 py-6 sm:px-6 sm:py-8",
          contentWidth,
          alignment,
          layout.template === "compact" ? "gap-4" : layout.template === "showcase" ? "gap-8" : "gap-6",
        )}
      >
        {loadError ? (
          <LoadErrorView message={loadError} />
        ) : !ctx ? (
          <LoadingView />
        ) : (
          layout.blockOrder.map((block) =>
            layout.hiddenBlocks.includes(block) ? null : <div key={block}>{blocks?.[block]}</div>,
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
    <header className="flex items-center gap-3">
      {config.visual.logoUrl ? (
        // biome-ignore lint/performance/noImgElement: logo distant configuré par le réparateur dans le mini-CMS.
        <img src={config.visual.logoUrl} alt={name || "Atelier"} className="h-9 w-auto max-w-[160px] object-contain" />
      ) : (
        <span className="text-base font-semibold tracking-tight text-[var(--w-text)]">{name || texts.title}</span>
      )}
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
