"use client";

// Étape 3 — Panne.
// Jamais 150 cartes d'un coup : d'abord « les plus demandées » (bloc riche),
// puis « toutes les autres réparations » en catégories repliables, avec une
// recherche transverse. La sélection résout la prestation publiée (prix, durée,
// garantie) qui alimente le récapitulatif ; une panne non configurée reste
// « Sur devis » et ne bloque jamais le parcours.

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Battery,
  Cable,
  Camera,
  ChevronDown,
  Cpu,
  Droplets,
  Fingerprint,
  Gamepad2,
  HardDrive,
  Keyboard,
  Mic,
  Plus,
  Power,
  Smartphone,
  Thermometer,
  Volume2,
  Wifi,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAsyncList } from "@/components/widget/use-catalog";
import type { StepContext } from "@/components/widget/widget-state";
import { WidgetInput, WidgetSearch, WidgetTextarea } from "@/components/widget/widget-primitives";
import {
  categorizeIssues,
  fold,
  issueMatchKey,
  issuesForType,
  popularIssuesForType,
  sameIssueLabel,
} from "@/lib/widget/global-catalog";
import { formatDuration, formatPrice } from "@/components/widget/widget-theme";
import type { PublicService } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";

const ISSUE_ICON_RULES: Array<{ keys: string[]; icon: LucideIcon }> = [
  { keys: ["ecran", "vitre", "oled", "lcd", "dalle", "tactile", "chassis"], icon: Smartphone },
  { keys: ["batterie"], icon: Battery },
  { keys: ["connecteur", "charge", "recharge", "alimentation", "hdmi"], icon: Cable },
  { keys: ["camera", "lentille", "flash"], icon: Camera },
  { keys: ["haut-parleur", "haut parleur", "son", "audio", "ecouteur"], icon: Volume2 },
  { keys: ["micro"], icon: Mic },
  { keys: ["face id", "touch id", "capteur"], icon: Fingerprint },
  { keys: ["bouton", "power", "volume", "home", "manette"], icon: Power },
  { keys: ["liquide", "desoxydation", "etancheite", "surchauffe", "ventil", "thermique"], icon: Droplets },
  { keys: ["reseau", "wi-fi", "wifi", "bluetooth"], icon: Wifi },
  { keys: ["logiciel", "mise a jour", "deblocage", "systeme", "donnees", "recuperation", "sauvegarde"], icon: Cpu },
  { keys: ["clavier"], icon: Keyboard },
  { keys: ["disque", "ssd", "ram", "memoire"], icon: HardDrive },
  { keys: ["diagnostic"], icon: Activity },
  { keys: ["console", "jeu"], icon: Gamepad2 },
  { keys: ["surchauff", "temperature"], icon: Thermometer },
];

function issueIcon(issue: string): LucideIcon {
  const f = fold(issue);
  for (const rule of ISSUE_ICON_RULES) if (rule.keys.some((key) => f.includes(key))) return rule.icon;
  return Wrench;
}

export function IssueStep({ ctx, hideHeader = false }: { ctx: StepContext; hideHeader?: boolean }) {
  const { client, token, draft, patch, features, config } = ctx;
  const [query, setQuery] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [customIssue, setCustomIssue] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const services = useAsyncList<PublicService>(
    (signal) =>
      draft.category && draft.model
        ? client.getServices(
            token,
            { category: draft.category, brand: draft.brand, model: draft.model, shop: draft.shopId || undefined },
            signal,
          )
        : Promise.resolve([]),
    [token, draft.shopId, draft.category, draft.brand, draft.model],
  );

  // Catalogue global ∪ pannes configurées en boutique.
  const allIssues = (() => {
    const global = issuesForType(draft.category);
    const seen = new Set(global.map(issueMatchKey));
    const merged = [...global];
    for (const service of services.items) {
      if (service.issue && !seen.has(issueMatchKey(service.issue))) {
        seen.add(issueMatchKey(service.issue));
        merged.push(service.issue);
      }
    }
    return merged;
  })();

  const popular = popularIssuesForType(draft.category);
  const popularSet = new Set(popular.map(issueMatchKey));
  const otherIssues = allIssues.filter((issue) => !popularSet.has(issueMatchKey(issue)));
  const categories = categorizeIssues(otherIssues);
  const customIssues = draft.issues.filter((issue) => !allIssues.some((entry) => sameIssueLabel(entry, issue)));

  const q = fold(query.trim());
  const searchResults = q ? allIssues.filter((issue) => fold(issue).includes(q)) : [];

  // Résolution des prestations publiées pour chaque panne retenue (recap / lead).
  // biome-ignore lint/correctness/useExhaustiveDependencies: résolution volontairement pilotée par les projections listées.
  useEffect(() => {
    if (services.loading || services.error) return;
    const next = { ...draft.services };
    let changed = false;
    for (const issue of draft.issues) {
      const matches = services.items.filter((service) => sameIssueLabel(service.issue, issue));
      const current = draft.services[issue];
      const stillValid = current ? matches.some((match) => match.publicId === current.publicId) : false;
      if (matches.length === 0) {
        if (current !== null) {
          next[issue] = null;
          changed = true;
        }
      } else if (matches.length === 1 && !stillValid) {
        next[issue] = matches[0];
        changed = true;
      } else if (matches.length > 1 && current !== undefined && !stillValid) {
        // Plusieurs qualités : aucun prix n'est choisi à la place du client.
        delete next[issue];
        changed = true;
      }
    }
    for (const key of Object.keys(next)) {
      if (!draft.issues.includes(key)) {
        delete next[key];
        changed = true;
      }
    }
    if (changed) patch({ services: next });
  }, [services.items, services.loading, services.error, draft.issues]);

  // Analytique : une émission prix/stock par résolution.
  const emittedRef = useRef<string>("");
  // biome-ignore lint/correctness/useExhaustiveDependencies: déduplication par emittedRef après résolution.
  useEffect(() => {
    if (services.loading || services.error || !draft.issues.length) return;
    if (draft.issues.some((issue) => draft.services[issue] === undefined)) return;
    const signature = draft.issues.map((issue) => draft.services[issue]?.publicId ?? "").join("|");
    if (emittedRef.current === signature) return;
    emittedRef.current = signature;
    const anyPriced = draft.issues.some((issue) => {
      const service = draft.services[issue];
      return service ? !formatPrice(service.price, ctx.currency, ctx.locale).onRequest : false;
    });
    ctx.emit(anyPriced ? "price_displayed" : "price_unavailable");
  }, [services.loading, services.error, draft.services, draft.issues]);

  function toggle(issue: string) {
    const has = draft.issues.includes(issue);
    const next = features.multiIssue
      ? has
        ? draft.issues.filter((entry) => entry !== issue)
        : [...draft.issues, issue]
      : has
        ? []
        : [issue];
    patch({ issues: next });
  }

  function toggleCategory(category: string) {
    setOpenCategories((current) =>
      current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category],
    );
  }

  function addCustom() {
    const value = customIssue.trim();
    if (!value || draft.issues.includes(value)) {
      setCustomIssue("");
      return;
    }
    toggle(value);
    setCustomIssue("");
  }

  const deviceName = draft.model || draft.category || "votre appareil";
  const subtitle = features.multiIssue ? "Sélectionnez une ou plusieurs pannes." : "Sélectionnez la panne concernée.";

  const renderCard = (issue: string) => {
    const issueServices = services.items.filter((entry) => sameIssueLabel(entry.issue, issue));
    return (
      <IssueCard
        key={issue}
        issue={issue}
        services={issueServices}
        selected={draft.issues.includes(issue)}
        onToggle={() => toggle(issue)}
        ctx={ctx}
      />
    );
  };

  return (
    <div className="grid gap-5">
      {hideHeader ? null : (
        <header className="grid gap-1.5 text-center">
          <h2 className="text-[calc(1.35rem*var(--w-heading-scale,1))] font-semibold tracking-tight text-[var(--w-text)]">
            Que souhaitez-vous réparer sur votre {deviceName} ?
          </h2>
          <p className="text-sm text-[var(--w-muted)]">{subtitle}</p>
        </header>
      )}

      <div className="w-full max-w-md">
        <WidgetSearch value={query} onChange={setQuery} placeholder="Rechercher une panne (écran, batterie…)" />
      </div>

      {services.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-[var(--w-radius)] bg-[var(--w-tint)]" />
          ))}
        </div>
      ) : q ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold text-[var(--w-muted)]">
            {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
          </h3>
          {searchResults.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{searchResults.map(renderCard)}</div>
          ) : (
            <p className="rounded-[var(--w-radius)] border border-dashed border-[var(--w-border)] p-6 text-center text-sm text-[var(--w-muted)]">
              Aucune panne ne correspond. Décrivez votre problème plus bas.
            </p>
          )}
        </section>
      ) : (
        <>
          {popular.length ? (
            <section className="grid gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--w-text)]">
                Réparations les plus demandées
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{popular.map(renderCard)}</div>
            </section>
          ) : null}

          {categories.length ? (
            <section className="grid gap-2">
              <h3 className="text-sm font-semibold text-[var(--w-text)]">Toutes les autres réparations</h3>
              <div className="grid gap-2">
                {categories.map(({ category, issues }) => {
                  const open = openCategories.includes(category);
                  const selectedCount = issues.filter((issue) => draft.issues.includes(issue)).length;
                  return (
                    <div
                      key={category}
                      className="overflow-hidden rounded-[var(--w-radius)] border border-[var(--w-border)]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--w-primary-soft)]"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-[var(--w-text)]">
                          {category}
                          {selectedCount ? (
                            <span className="grid size-5 place-items-center rounded-full bg-[var(--w-primary)] text-[10px] font-bold text-[var(--w-on-primary)]">
                              {selectedCount}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--w-muted)]">({issues.length})</span>
                          )}
                        </span>
                        <ChevronDown
                          className={cn("size-4 text-[var(--w-muted)] transition", open ? "rotate-180" : "")}
                        />
                      </button>
                      {open ? (
                        <div className="grid gap-3 border-t border-[var(--w-border)] p-3 sm:grid-cols-2 lg:grid-cols-3">
                          {issues.map(renderCard)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}

      {customIssues.length ? (
        <div className="flex flex-wrap gap-2">
          {customIssues.map((issue) => (
            <span
              key={issue}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--w-primary)] bg-[var(--w-primary-soft)] px-3 py-1.5 text-sm text-[var(--w-text)]"
            >
              {issue}
              <button type="button" onClick={() => toggle(issue)} aria-label={`Retirer ${issue}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 border-t border-[var(--w-border)] pt-4">
        {!showOther ? (
          <button
            type="button"
            onClick={() => setShowOther(true)}
            className="mx-auto inline-flex items-center gap-1.5 text-sm font-medium text-[var(--w-primary)] hover:underline"
          >
            <Plus className="size-4" /> Vous ne trouvez pas votre panne ?
          </button>
        ) : (
          <div className="grid gap-3">
            {config.catalogPolicy.allowUnconfiguredIssues ? (
              <div className="flex gap-2">
                <WidgetInput
                  value={customIssue}
                  onChange={(event) => setCustomIssue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder="Décrivez la panne (ex : le bouton ne répond plus)"
                />
                <button
                  type="button"
                  onClick={addCustom}
                  disabled={!customIssue.trim()}
                  className="shrink-0 rounded-[var(--w-radius)] bg-[var(--w-primary)] px-4 text-sm font-semibold text-[var(--w-on-primary)] transition hover:brightness-95 disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            ) : null}
            <WidgetTextarea
              value={draft.issueDescription}
              onChange={(event) => patch({ issueDescription: event.target.value })}
              placeholder="Ajoutez une précision pour l’atelier (facultatif)…"
              maxLength={1200}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  services,
  selected,
  onToggle,
  ctx,
}: {
  issue: string;
  services: PublicService[];
  selected: boolean;
  onToggle: () => void;
  ctx: StepContext;
}) {
  const Icon = issueIcon(issue);
  const service = services.length === 1 ? services[0] : undefined;
  const price = service ? formatPrice(service.price, ctx.currency, ctx.locale) : null;
  const duration = formatDuration(service?.durationMinutes);
  const meta = [duration, ctx.features.warranty ? service?.warranty : null].filter(Boolean).join(" · ");
  const multipleQualities = services.length > 1;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col gap-2 rounded-[var(--w-radius)] border bg-[var(--w-surface)] p-3.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring)]",
        selected
          ? "border-[var(--w-primary)] bg-white shadow-[0_5px_18px_var(--w-primary-soft)]"
          : "border-[var(--w-border)] bg-white hover:border-[#B9B9B4] hover:shadow-sm",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg transition",
              selected
                ? "bg-[var(--w-primary)] text-[var(--w-on-primary)]"
                : "bg-[var(--w-primary-soft)] text-[var(--w-primary)]",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
          <strong className="truncate text-sm font-semibold text-[var(--w-text)]">{issue}</strong>
        </span>
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-md border transition",
            selected
              ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
              : "border-[var(--w-border)] text-transparent",
          )}
        >
          <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
            <path
              d="M2.5 6.2 5 8.5 9.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      <span className="pl-10">
        <span className="block text-sm font-semibold text-[var(--w-text)]">
          {multipleQualities ? "Plusieurs qualités disponibles" : price && !price.onRequest ? price.label : "Sur devis"}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--w-muted)]">
          {multipleQualities
            ? "Choisissez la pièce et son prix à l’étape suivante"
            : meta || (service ? "Durée à confirmer" : "Estimation personnalisée")}
        </span>
      </span>
    </button>
  );
}
