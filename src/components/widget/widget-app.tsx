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
  primaryService,
  type RequestType,
  type StepContext,
  type WidgetDraft,
} from "@/components/widget/widget-state";
import { Spinner, WidgetButton, WidgetProgress } from "@/components/widget/widget-primitives";
import { ConfirmationStep } from "@/components/widget/steps/confirmation-step";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { DeviceStep } from "@/components/widget/steps/device-step";
import { IssueStep } from "@/components/widget/steps/issue-step";
import { QualityStep } from "@/components/widget/steps/quality-step";
import { IntakeStep } from "@/components/widget/steps/intake-step";
import { RepairSummary } from "@/components/widget/steps/repair-summary";
import { ContactStep } from "@/components/widget/steps/contact-step";

const JOURNEY_STEPS = ["Appareil", "Réparation", "Prise en charge", "Coordonnées"] as const;

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
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  // Appareil verrouillé : la sélection vient du sélecteur du site (hero). Dans ce
  // cas le widget n'affiche PAS d'étape appareil et démarre sur les pannes.
  const [deviceLocked, setDeviceLocked] = useState(false);
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

  // Pré-sélection appareil transmise par le sélecteur du site (hero) via l'URL :
  // ?type=Smartphone&brand=Apple&model=iPhone%2015%20Pro → l'appareil est choisi
  // sur le site (hero). Le widget verrouille cette sélection, saute l'étape
  // appareil et démarre directement sur les pannes.
  const preselectRef = useRef(false);
  useEffect(() => {
    if (preselectRef.current || previewConfig || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const category = params.get("type")?.trim() || "";
    const brand = params.get("brand")?.trim() || "";
    const model = params.get("model")?.trim() || "";
    if (!category && !brand && !model) return;
    preselectRef.current = true;
    setDraft((current) => ({ ...current, category, brand, model }));
    if (category && model) {
      setDeviceLocked(true);
      setStep(1);
    }
  }, [previewConfig]);

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
    // Seul le contenu défile désormais : on le ramène en haut à chaque étape.
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
  // Parcours maquette en 4 étapes visibles (l'appareil vient du sélecteur du
  // site) : Panne (1) → Réparation/Qualité (2) → Prise en charge (3) →
  // Confirmation (4). L'étape 0 (choix de l'appareil) n'est montrée que si rien
  // n'a été pré-sélectionné, et reste accessible via « Modifier ».
  const CONFIRM_STEP = 5;
  const finalStep = 4; // dernière étape de saisie ; l'envoi (submit) s'y fait.
  // Première étape atteignable : pannes (1) quand l'appareil vient du hero,
  // sinon l'étape appareil (0) sert de repli (ouverture directe du widget).
  const minStep = deviceLocked ? 1 : 0;
  const appointmentActive = features.booking && draft.requestType === "appointment";

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
    // 0 : appareil + marque + modèle (+ boutique si multi-boutiques).
    if (index === 0) return Boolean(draft.category && draft.model.trim()) && (!needShop || Boolean(draft.shopId));
    // 1 : au moins une panne retenue.
    if (index === 1) return draft.issues.length > 0;
    // 2 : une qualité choisie (ou « sur devis ») pour chaque panne.
    if (index === 2)
      return draft.issues.length > 0 && draft.issues.every((issue) => draft.services[issue] !== undefined);
    // 3 : un créneau est obligatoire uniquement pour le rendez-vous.
    if (index === 3 && draft.requestType === "appointment")
      return Boolean(draft.appointmentDate && draft.appointmentTime) && (!needShop || Boolean(draft.shopId));
    return true;
  };

  const canSubmit = (): boolean => {
    if (!hasRequiredPhone(draft) || !draft.consent) return false;
    if (draft.requestType === "appointment")
      return Boolean(draft.appointmentDate && draft.appointmentTime) && (!needShop || Boolean(draft.shopId));
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
      if (appointmentActive) emit("booking_opened");
    }
    if (step === 3) emit("form_opened");
    setStep((current) => Math.min(current + 1, finalStep));
  };

  const goBack = () => setStep((current) => Math.max(current - 1, minStep));

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
      setStep(CONFIRM_STEP);
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
      ? "Confirmer mon rendez-vous"
      : draft.requestType === "quote"
        ? texts.quoteLabel
        : draft.requestType === "price_request"
          ? "Demander le prix"
          : draft.requestType === "request"
            ? "Envoyer ma demande"
            : texts.callbackLabel;

  const alignment =
    layout.alignment === "center" ? "text-center" : layout.alignment === "right" ? "text-right" : "text-left";

  const stepCopy =
    step === 1
      ? {
          title: draft.model ? `Que souhaitez-vous réparer sur votre ${draft.model} ?` : "Que souhaitez-vous réparer ?",
          subtitle: "Sélectionnez la panne concernée.",
        }
      : step === 2
        ? {
            title: "Choisissez la qualité de votre réparation",
            subtitle: "Comparez les pièces disponibles, leur garantie et leur délai.",
          }
        : step === 3
          ? {
              title: "Comment souhaitez-vous nous confier votre appareil ?",
              subtitle: "Réservez un créneau, venez directement ou envoyez une demande.",
            }
          : null;

  const rightColumn = ctx ? (
    <div className="grid content-start gap-5 text-left">
      {!submitResult && stepCopy ? (
        <div className="grid gap-1.5">
          <h2 className="text-[calc(1.35rem*var(--w-heading-scale,1))] font-semibold leading-tight tracking-tight text-[var(--w-text)]">
            {stepCopy.title}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--w-muted)]">{stepCopy.subtitle}</p>
        </div>
      ) : null}
      {submitResult ? <ConfirmationStep ctx={ctx} result={submitResult} /> : null}
      {!submitResult && step === 0 ? <DeviceStep ctx={ctx} /> : null}
      {!submitResult && step === 1 ? <IssueStep ctx={ctx} hideHeader /> : null}
      {!submitResult && step === 2 ? <QualityStep ctx={ctx} /> : null}
      {!submitResult && step === 3 ? <IntakeStep ctx={ctx} submitError={submitError} /> : null}
      {!submitResult && step === 4 ? <ContactStep ctx={ctx} submitError={submitError} /> : null}
    </div>
  ) : null;

  const blocks = ctx
    ? {
        header: (
          <WidgetProgress steps={[...JOURNEY_STEPS]} current={step <= 1 ? 0 : step === 2 ? 1 : step === 3 ? 2 : 3} />
        ),
        progress: null,
        content: (
          <main className="flex-1">
            {!submitResult && step >= 1 ? (
              <div className="grid min-h-full lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="bg-[#F5F6F3] px-4 py-4 lg:sticky lg:top-0 lg:self-start lg:px-6 lg:py-7">
                  <RepairSummary ctx={ctx} onModify={deviceLocked ? undefined : () => setStep(0)} />
                </aside>
                <div className="px-4 py-5 sm:px-7 lg:px-9 lg:py-7">{rightColumn}</div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-7">{rightColumn}</div>
            )}
          </main>
        ),
        actions: (
          <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {submitResult ? (
              <>
                <WidgetButton variant="ghost" onClick={requestClose}>
                  Fermer
                </WidgetButton>
                <span />
                <WidgetButton variant="secondary" onClick={restart} className="justify-self-end">
                  Nouvelle demande
                </WidgetButton>
              </>
            ) : (
              <>
                <WidgetButton
                  variant="ghost"
                  onClick={goBack}
                  disabled={step === minStep}
                  className={step === minStep ? "invisible" : ""}
                >
                  Précédent
                </WidgetButton>
                {ctx.config.icons.poweredBy ? (
                  <span className="hidden justify-self-center text-[10px] text-[var(--w-muted)]/60 sm:block">
                    Propulsé par Behar Tech Pro
                  </span>
                ) : (
                  <span />
                )}
                {step === finalStep ? (
                  <WidgetButton
                    onClick={submit}
                    disabled={!canSubmit()}
                    loading={submitting}
                    className="justify-self-end"
                  >
                    {submitLabel}
                  </WidgetButton>
                ) : (
                  <WidgetButton onClick={goNext} disabled={!canAdvance(step)} className="justify-self-end">
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
      className="grid min-h-screen w-full place-items-center bg-transparent text-[var(--w-text)] sm:p-6"
    >
      <div
        ref={rootRef}
        className={cn(
          // Cadre à hauteur fixe : en-tête + progression + boutons restent visibles,
          // seul le bloc « content » défile. Le client clique, il ne scrolle pas partout.
          "relative mx-auto flex h-[100svh] max-h-[100svh] w-full flex-col overflow-hidden bg-[#FAFAF8] shadow-[0_28px_90px_rgba(20,24,28,.22)] sm:h-[calc(100vh-48px)] sm:max-h-[calc(100vh-48px)] sm:min-h-[560px] sm:max-w-[1380px] sm:rounded-[28px] sm:border sm:border-black/[.06]",
          alignment,
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
          <div className="flex flex-1 items-center justify-center p-6">
            <LoadErrorView message={loadError} />
          </div>
        ) : !ctx ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <LoadingView />
          </div>
        ) : (
          (["header", "content", "actions"] as const).map((block) => (
            <div key={block} ref={block === "content" ? contentRef : undefined} className={blockWrapperClass(block)}>
              {blocks?.[block]}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Rôle de chaque bloc dans le cadre à hauteur fixe : l'en-tête, la progression et
// les boutons sont figés (flex-none) et toujours visibles ; seul le contenu défile.
function blockWrapperClass(block: string): string {
  switch (block) {
    case "content":
      return "flex-1 min-h-0 overflow-y-auto overscroll-contain";
    case "actions":
      return "flex-none border-t border-[var(--w-border)] bg-[#FAFAF8] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7";
    case "header":
      return "flex-none border-b border-[var(--w-border)] bg-[#FAFAF8] px-4 py-4 pr-16 sm:px-8 sm:py-5 sm:pr-20";
    case "progress":
      return "flex-none px-4 pb-1 sm:px-7";
    default:
      return "flex-none px-4 sm:px-7";
  }
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
